/**
 * @description mock services for the end-to-end tests, in one process:
 *
 * - an OpenID Connect provider (`/oidc/authorize`, `/oidc/token`,
 *   `/oidc/userinfo`) that logs in the test user without a form;
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
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import {
    createServer,
    type IncomingMessage,
    type ServerResponse,
} from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { join } from "node:path";

const httpPort = Number(process.env.MOCK_HTTP_PORT ?? 8291);
const httpsPort = Number(process.env.MOCK_HTTPS_PORT ?? 8444);
const appOrigin = process.env.MOCK_APP_ORIGIN ?? "http://localhost:3210";
const certDir = process.env.MOCK_CERT_DIR ?? "e2e/.certs";

const clientId = "krini-e2e";
const clientSecret = "e2e-secret";

/** The test user, whose claims the user info returns */
const user = {
    sub: "alice@lifescience-ri.eu",
    name: "Alice Example",
    email: "alice@example.org",
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

/** Codes of logins that the app hasn't exchanged yet */
const codes = new Set<string>();
/** Access tokens that the provider issued */
const accessTokens = new Set<string>();
/** Runs that the WES service accepted */
const runs: { run_id: string; state: string }[] = [];
/** Requests that the WES service received, for the tests */
const requests: {
    method: string;
    path: string;
    authorization: string | null;
}[] = [];

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

function issueTokens() {
    const access = `access-${randomUUID()}`;
    accessTokens.add(access);
    return {
        access_token: access,
        id_token: `id-${randomUUID()}`,
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

    if (req.method === "GET" && url.pathname === "/oidc/authorize") {
        const redirect = url.searchParams.get("redirect_uri");
        if (url.searchParams.get("client_id") !== clientId || !redirect)
            return send(res, 400, { error: "invalid_request" });
        const code = randomUUID();
        codes.add(code);
        const target = new URL(redirect);
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
            if (!codes.delete(code))
                return send(res, 400, { error: "invalid_grant" });
            return send(res, 200, issueTokens());
        }
        if (grant === "refresh_token") return send(res, 200, issueTokens());
        return send(res, 400, { error: "unsupported_grant_type" });
    }

    if (req.method === "GET" && url.pathname === "/oidc/userinfo") {
        const token = bearerOf(req);
        if (!token || !accessTokens.has(token))
            return send(res, 401, { error: "invalid_token" });
        return send(res, 200, user);
    }

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
        await bodyOf(req);
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
