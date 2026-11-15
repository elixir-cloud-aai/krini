/**
 * @description helpers for tests of the OIDC code: a mock provider's
 * discovery document, JWKS and userinfo endpoint, plus utilities to sign
 * ID tokens the way a real provider would (RS256).
 */
import { generateKeyPairSync, type KeyObject, sign } from "node:crypto";
import { vi } from "vitest";

const issuer = "https://idp.example.org";
const jwksUri = `${issuer}/jwks`;
const tokenEndpoint = `${issuer}/token`;
const authorizationEndpoint = `${issuer}/authorize`;
const userinfoEndpoint = `${issuer}/userinfo`;
const endSessionEndpoint = `${issuer}/logout`;

let keyPair: { privateKey: KeyObject; publicKey: KeyObject } | null = null;

function keys() {
    if (!keyPair) {
        keyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
    }
    return keyPair;
}

/** Public JWK of the mock provider's signing key. */
export function providerJwk(kid = "k1") {
    const jwk = keys().publicKey.export({ format: "jwk" }) as Record<
        string,
        unknown
    >;
    return { ...jwk, kid, alg: "RS256", use: "sig" };
}

function b64url(input: Buffer | string): string {
    return Buffer.from(input).toString("base64url");
}

/** Sign an ID-token-shaped JWT with the mock provider's private key. */
export function signIdToken(
    payload: Record<string, unknown>,
    options: { kid?: string | null; alg?: string; key?: KeyObject } = {},
): string {
    const header: Record<string, unknown> = {
        alg: options.alg ?? "RS256",
        typ: "JWT",
    };
    if (options.kid !== null) header.kid = options.kid ?? "k1";
    const signingInput = `${b64url(JSON.stringify(header))}.${b64url(
        JSON.stringify(payload),
    )}`;
    const signature = sign(
        "RSA-SHA256",
        Buffer.from(signingInput),
        options.key ?? keys().privateKey,
    );
    return `${signingInput}.${b64url(signature)}`;
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

type ProviderOptions = {
    /** Claims returned by the userinfo endpoint. */
    userinfo?: Record<string, unknown>;
    /** Extra or overriding fields of the discovery document. */
    discovery?: Record<string, unknown>;
    /** JWKS document; defaults to the mock signing key. */
    jwks?: unknown;
    /** Status of the userinfo response (default 200). */
    userinfoStatus?: number;
};

/**
 * Stub global fetch with the mock provider's endpoints. Returns the mock so
 * tests can inspect calls or change behavior per URL.
 */
export function mockOidcProvider(options: ProviderOptions = {}) {
    const discovery = {
        issuer,
        authorization_endpoint: authorizationEndpoint,
        token_endpoint: tokenEndpoint,
        userinfo_endpoint: userinfoEndpoint,
        jwks_uri: jwksUri,
        end_session_endpoint: endSessionEndpoint,
        ...options.discovery,
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === `${issuer}/.well-known/openid-configuration`) {
            return jsonResponse(discovery);
        }
        if (url === jwksUri) {
            return jsonResponse(options.jwks ?? { keys: [providerJwk()] });
        }
        if (url === userinfoEndpoint) {
            return jsonResponse(
                options.userinfo ?? { sub: "u1", name: "User One" },
                options.userinfoStatus ?? 200,
            );
        }
        return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

export {
    authorizationEndpoint,
    endSessionEndpoint,
    issuer,
    jwksUri,
    tokenEndpoint,
    userinfoEndpoint,
};

/**
 * The `LOGIN_PROVIDERS` JSON of the mock deployment: one provider pointing
 * at the mock issuer, with the test client's credentials.
 * @param overrides Fields that replace or add provider settings
 */
export function providersJson(overrides: Record<string, unknown> = {}) {
    return JSON.stringify([
        {
            id: "test",
            name: "Test IdP",
            issuer,
            clientId: "client",
            clientSecret: "client-secret",
            scopes: ["openid", "profile", "email"],
            ...overrides,
        },
    ]);
}
