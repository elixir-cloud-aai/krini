/**
 * @description mock services for the end-to-end tests, in one process:
 *
 * - an OpenID Connect provider (`/.well-known/openid-configuration`,
 *   `/oidc/authorize`, `/oidc/token`, `/oidc/userinfo`, `/oidc/jwks`,
 *   `/oidc/logout`) that logs in the test user without a form; the app
 *   uses PKCE and validates the signed ID token against the JWKS, so the
 *   provider signs real RS256 JWTs;
 * - a service registry (`/ga4gh/registry/v1/services`);
 * - a WES service over `https` with a self-signed certificate
 *   (`/ga4gh/wes/v1/...`), which the browser calls directly, as with real
 *   services, and which allows the app's origin (CORS);
 * - `/mock/requests` and `/mock/reset` to inspect and clear the requests
 *   that the WES service received.
 *
 * The registry and the login provider listen on `MOCK_HTTP_PORT`, the WES
 * service on `MOCK_HTTPS_PORT`. The certificate goes to `MOCK_CERT_DIR`;
 * the app trusts it through `NODE_EXTRA_CA_CERTS`. Run with `bun`.
 */
import { execFileSync } from "node:child_process";
import { createHash, generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import {
    createServer,
    type IncomingMessage,
    type ServerResponse,
} from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { join } from "node:path";
import {
    appURL,
    client,
    mockHttpPort,
    mockHttpsPort,
    type WesRequest,
} from "../settings";

const httpPort = Number(process.env.MOCK_HTTP_PORT ?? mockHttpPort);
const httpsPort = Number(process.env.MOCK_HTTPS_PORT ?? mockHttpsPort);
const appOrigin = process.env.MOCK_APP_ORIGIN ?? appURL;
const certDir = process.env.MOCK_CERT_DIR ?? "e2e/.certs";

const clientId = client.id;
const clientSecret = client.secret;

const issuer = `http://127.0.0.1:${httpPort}`;

/** Signing key of the mock provider's ID tokens */
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
});

function b64url(input: Buffer | string) {
    return Buffer.from(input).toString("base64url");
}

/** A signed ID token (RS256) with the claims the app validates */
function idToken(claims: Record<string, unknown>) {
    const header = b64url(
        JSON.stringify({ alg: "RS256", kid: "mock", typ: "JWT" }),
    );
    const payload = b64url(JSON.stringify(claims));
    const signature = sign(
        "RSA-SHA256",
        Buffer.from(`${header}.${payload}`),
        privateKey,
    );
    return `${header}.${payload}.${b64url(signature)}`;
}

/** The test user, whose claims the user info returns; the `groups` claim
 * puts the user in the compute tier of the app */
const user = {
    sub: "alice@lifescience-ri.eu",
    name: "Alice Example",
    email: "alice@example.org",
    groups: ["compute"],
};

const wesUrl = `https://127.0.0.1:${httpsPort}/ga4gh/wes/v1`;

/** Entries of the registry: the WES service, and entries the app drops */
const services = [
    {
        id: "mock-wes",
        name: "Mock WES",
        type: { group: "org.ga4gh", artifact: "wes", version: "1.1.0" },
        organization: { name: "Mock organization", url: "https://example.org" },
        url: wesUrl,
        version: "1.0.0",
        environment: "test",
        description: "WES service of the end-to-end tests",
        contactUrl: "mailto:test@example.org",
        documentationUrl: "https://example.org",
        createdAt: "2026-11-01T00:00:00Z",
        updatedAt: "2026-11-01T00:00:00Z",
    },
    {
        id: "plain-wes",
        name: "Plain WES",
        type: { group: "org.ga4gh", artifact: "wes", version: "1.1.0" },
        url: `http://127.0.0.1:${httpPort}/ga4gh/wes/v1`,
    },
    {
        id: "mock-tes",
        name: "Mock TES",
        type: { group: "org.ga4gh", artifact: "tes", version: "1.1.0" },
        url: `https://127.0.0.1:${httpsPort}/ga4gh/tes/v1`,
    },
];

const serviceInfo = {
    id: "mock-wes",
    name: "Mock WES",
    type: { group: "org.ga4gh", artifact: "wes", version: "1.1.0" },
    organization: { name: "Mock organization", url: "https://example.org" },
    version: "1.0.0",
    workflow_type_versions: { CWL: { workflow_type_version: ["v1.2"] } },
    supported_wes_versions: ["1.1.0"],
    supported_filesystem_protocols: ["https"],
    workflow_engine_versions: { cwltool: "3.1" },
    default_workflow_engine_parameters: [],
    system_state_counts: {},
    auth_instructions_url: "https://example.org/auth",
    tags: {},
};

/** Logins that the app hasn't exchanged yet: code → redirect URI, nonce
 * and PKCE challenge, which the token request must match */
const codes = new Map<
    string,
    { redirect: string; nonce: string | null; challenge: string | null }
>();
/** Access tokens that the provider issued */
const accessTokens = new Set<string>();
/** Runs that the WES service accepted */
const runs: { run_id: string; state: string }[] = [];
/** Requests that the WES service received, for the tests */
const requests: WesRequest[] = [];

function send(
    res: ServerResponse,
    status: number,
    body?: unknown,
    headers: Record<string, string> = {},
) {
    res.writeHead(status, {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...headers,
    });
    res.end(body === undefined ? undefined : JSON.stringify(body));
}

async function bodyOf(req: IncomingMessage) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString();
}

function issueTokens(nonce?: string | null) {
    const access = `access-${randomUUID()}`;
    accessTokens.add(access);
    return {
        access_token: access,
        id_token: idToken({
            iss: issuer,
            aud: clientId,
            exp: Math.floor(Date.now() / 1000) + 3600,
            sub: user.sub,
            ...(nonce ? { nonce } : {}),
        }),
        refresh_token: `refresh-${randomUUID()}`,
        token_type: "Bearer",
        expires_in: 3600,
    };
}

function bearerOf(req: IncomingMessage) {
    return /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1];
}

/** Login provider, registry and test endpoints */
async function handleHttp(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${httpPort}`);

    if (
        req.method === "GET" &&
        url.pathname === "/.well-known/openid-configuration"
    )
        return send(res, 200, {
            issuer,
            authorization_endpoint: `${issuer}/oidc/authorize`,
            token_endpoint: `${issuer}/oidc/token`,
            userinfo_endpoint: `${issuer}/oidc/userinfo`,
            jwks_uri: `${issuer}/oidc/jwks`,
            end_session_endpoint: `${issuer}/oidc/logout`,
        });

    if (req.method === "GET" && url.pathname === "/oidc/jwks")
        return send(res, 200, {
            keys: [
                {
                    ...publicKey.export({ format: "jwk" }),
                    kid: "mock",
                    alg: "RS256",
                    use: "sig",
                },
            ],
        });

    if (req.method === "GET" && url.pathname === "/oidc/authorize") {
        const redirect = url.searchParams.get("redirect_uri");
        // only the app's callback, as registered at a real provider
        if (
            url.searchParams.get("client_id") !== clientId ||
            url.searchParams.get("response_type") !== "code" ||
            !url.searchParams.get("state") ||
            redirect !== `${appOrigin}/auth/api/callback`
        )
            return send(res, 400, { error: "invalid_request" });
        const code = randomUUID();
        codes.set(code, {
            redirect: redirect as string,
            nonce: url.searchParams.get("nonce"),
            challenge: url.searchParams.get("code_challenge"),
        });
        const target = new URL(redirect as string);
        target.searchParams.set("code", code);
        target.searchParams.set("state", url.searchParams.get("state") ?? "");
        return send(res, 302, undefined, { Location: target.toString() });
    }

    if (req.method === "POST" && url.pathname === "/oidc/token") {
        const form = new URLSearchParams(await bodyOf(req));
        if (
            form.get("client_id") !== clientId ||
            form.get("client_secret") !== clientSecret
        )
            return send(res, 401, { error: "invalid_client" });
        const grant = form.get("grant_type");
        if (grant === "authorization_code") {
            const code = form.get("code") ?? "";
            const login = codes.get(code);
            codes.delete(code);
            if (!login || form.get("redirect_uri") !== login.redirect)
                return send(res, 400, { error: "invalid_grant" });
            // PKCE: the verifier's S256 challenge must match the authorize
            // request's code_challenge
            if (login.challenge) {
                const verifier = form.get("code_verifier") ?? "";
                const challenge = createHash("sha256")
                    .update(verifier)
                    .digest("base64url");
                if (challenge !== login.challenge)
                    return send(res, 400, { error: "invalid_grant" });
            }
            return send(res, 200, issueTokens(login.nonce));
        }
        if (grant === "refresh_token") return send(res, 200, issueTokens());
        return send(res, 400, { error: "unsupported_grant_type" });
    }

    if (req.method === "GET" && url.pathname === "/oidc/logout") {
        const target = url.searchParams.get("post_logout_redirect_uri");
        if (target?.startsWith(appOrigin))
            return send(res, 302, undefined, { Location: target });
        return send(res, 400, { error: "invalid_request" });
    }

    if (req.method === "GET" && url.pathname === "/oidc/userinfo") {
        const token = bearerOf(req);
        if (!token || !accessTokens.has(token))
            return send(res, 401, { error: "invalid_token" });
        return send(res, 200, user);
    }

    // a WES service over http, which only the app's https rule drops
    if (req.method === "GET" && url.pathname === "/ga4gh/wes/v1/service-info")
        return send(res, 200, serviceInfo);

    if (req.method === "GET" && url.pathname === "/ga4gh/registry/v1/services")
        return send(res, 200, services);

    if (req.method === "GET" && url.pathname === "/mock/requests")
        return send(res, 200, requests);

    if (req.method === "POST" && url.pathname === "/mock/reset") {
        requests.length = 0;
        runs.length = 0;
        return send(res, 204);
    }

    if (req.method === "GET" && url.pathname === "/mock/health")
        return send(res, 200, { status: "ok" });

    return send(res, 404, { error: "not found" });
}

/** WES service */
async function handleHttps(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", wesUrl);
    const cors = {
        "Access-Control-Allow-Origin": appOrigin,
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        Vary: "Origin",
    };
    if (req.method === "OPTIONS") return send(res, 204, undefined, cors);

    const prefix = "/ga4gh/wes/v1";
    const path = url.pathname.startsWith(prefix)
        ? url.pathname.slice(prefix.length)
        : null;
    if (path === null) return send(res, 404, { msg: "not found" }, cors);

    // the app reads the service info on the server, without a token
    if (req.method === "GET" && path === "/service-info")
        return send(res, 200, serviceInfo, cors);

    requests.push({
        method: req.method ?? "",
        path,
        authorization: req.headers.authorization ?? null,
    });
    const token = bearerOf(req);
    if (!token || !accessTokens.has(token))
        return send(res, 401, { msg: "unauthorized", status_code: 401 }, cors);

    if (req.method === "GET" && path === "/runs")
        return send(res, 200, { runs, next_page_token: "" }, cors);

    if (req.method === "POST" && path === "/runs") {
        // a run request of WES 1.x: multipart form data
        const form = await new Response(await bodyOf(req), {
            headers: { "Content-Type": req.headers["content-type"] ?? "" },
        })
            .formData()
            .catch(() => null);
        const fields = Object.fromEntries(
            [
                "workflow_url",
                "workflow_type",
                "workflow_type_version",
                "workflow_params",
            ].map((name) => [name, String(form?.get(name) ?? "")]),
        );
        requests[requests.length - 1].fields = fields;
        const versions =
            serviceInfo.workflow_type_versions[
                fields.workflow_type as keyof typeof serviceInfo.workflow_type_versions
            ]?.workflow_type_version ?? [];
        if (
            !URL.canParse(fields.workflow_url) ||
            !versions.includes(fields.workflow_type_version)
        )
            return send(
                res,
                400,
                { msg: "invalid run request", status_code: 400 },
                cors,
            );
        const run = { run_id: `run-${runs.length + 1}`, state: "QUEUED" };
        runs.push(run);
        return send(res, 200, { run_id: run.run_id }, cors);
    }

    const run = runs.find((val) => path === `/runs/${val.run_id}`);
    if (req.method === "GET" && run)
        return send(
            res,
            200,
            { run_id: run.run_id, state: run.state, request: {} },
            cors,
        );

    return send(res, 404, { msg: "not found", status_code: 404 }, cors);
}

/** Create the certificate of `localhost` for the WES service */
function certificate() {
    mkdirSync(certDir, { recursive: true });
    const key = join(certDir, "key.pem");
    const cert = join(certDir, "cert.pem");
    execFileSync(
        "openssl",
        [
            "req",
            "-x509",
            "-newkey",
            "rsa:2048",
            "-nodes",
            "-days",
            "1",
            "-subj",
            "/CN=localhost",
            "-addext",
            "subjectAltName=DNS:localhost,IP:127.0.0.1",
            "-keyout",
            key,
            "-out",
            cert,
        ],
        { stdio: "ignore" },
    );
    return { key: readFileSync(key), cert: readFileSync(cert) };
}

const tls = certificate();
createHttpsServer(tls, (req, res) => {
    void handleHttps(req, res);
}).listen(httpsPort, "127.0.0.1");
createServer((req, res) => {
    void handleHttp(req, res);
}).listen(httpPort, "127.0.0.1");
console.log(
    `mock services: http://127.0.0.1:${httpPort}, https://127.0.0.1:${httpsPort}`,
);
