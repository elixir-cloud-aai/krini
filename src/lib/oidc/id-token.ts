import { createPublicKey, verify } from "node:crypto";
import type { LoginProvider, OidcEndpoints } from "./types";

const JWKS_TTL_MS = 60 * 60 * 1000;

let jwksCache: { uri: string; keys: ProviderJwk[]; at: number } | null = null;

type ProviderJwk = JsonWebKey & { kid?: string };

type JwtHeader = { alg?: string; kid?: string; typ?: string };
type JwtPayload = Record<string, unknown> & {
    iss?: string;
    aud?: string | string[];
    exp?: number;
    nonce?: string;
};

function decodeSegment<T>(segment: string): T | null {
    try {
        return JSON.parse(
            Buffer.from(segment, "base64url").toString("utf8"),
        ) as T;
    } catch {
        return null;
    }
}

/** Decodes a JWT payload without verifying the signature (display purposes only). */
export function decodeJwtPayload(
    token: string,
): Record<string, unknown> | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return decodeSegment<Record<string, unknown>>(parts[1]);
}

async function fetchJwks(jwksUri: string): Promise<ProviderJwk[] | null> {
    const now = Date.now();
    if (
        jwksCache &&
        jwksCache.uri === jwksUri &&
        now - jwksCache.at < JWKS_TTL_MS
    ) {
        return jwksCache.keys;
    }

    let res: Response;
    try {
        res = await fetch(jwksUri, {
            headers: { Accept: "application/json" },
            cache: "no-store",
        });
    } catch {
        return null;
    }
    if (!res.ok) return null;

    let body: { keys?: ProviderJwk[] };
    try {
        body = (await res.json()) as { keys?: ProviderJwk[] };
    } catch {
        return null;
    }
    if (!Array.isArray(body.keys)) return null;

    jwksCache = { uri: jwksUri, keys: body.keys, at: now };
    return body.keys;
}

const JWA_ALGORITHMS: Record<
    string,
    { algorithm: string; dsaEncoding?: "ieee-p1363" }
> = {
    RS256: { algorithm: "RSA-SHA256" },
    RS384: { algorithm: "RSA-SHA384" },
    RS512: { algorithm: "RSA-SHA512" },
    ES256: { algorithm: "sha256", dsaEncoding: "ieee-p1363" },
    ES384: { algorithm: "sha384", dsaEncoding: "ieee-p1363" },
    ES512: { algorithm: "sha512", dsaEncoding: "ieee-p1363" },
};

function verifySignature(
    alg: string,
    signingInput: string,
    signature: Buffer,
    jwk: ProviderJwk,
): boolean {
    const spec = JWA_ALGORITHMS[alg];
    if (!spec) return false;

    try {
        const key = createPublicKey({ key: jwk as never, format: "jwk" });
        return verify(
            spec.algorithm,
            Buffer.from(signingInput),
            { key, dsaEncoding: spec.dsaEncoding },
            signature,
        );
    } catch {
        return false;
    }
}

const CLOCK_SKEW_SECONDS = 60;

/**
 * Validates an OIDC ID token: signature against the provider JWKS, issuer,
 * audience, expiry and nonce. Returns the payload or null when invalid.
 */
export async function validateIdToken(
    idToken: string,
    endpoints: OidcEndpoints,
    provider: LoginProvider,
    expectedNonce: string | null,
): Promise<JwtPayload | null> {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;

    const header = decodeSegment<JwtHeader>(parts[0]);
    const payload = decodeSegment<JwtPayload>(parts[1]);
    if (!header?.alg || !payload) return null;

    if (!endpoints.jwksUri) return null;

    let keys = await fetchJwks(endpoints.jwksUri);
    if (!keys) return null;

    let jwk = header.kid ? keys.find((k) => k.kid === header.kid) : keys[0];

    // Unknown kid may mean the key set rotated; refetch once, bypassing cache.
    if (!jwk && header.kid) {
        jwksCache = null;
        keys = await fetchJwks(endpoints.jwksUri);
        jwk = keys?.find((k) => k.kid === header.kid);
    }
    if (!jwk) return null;

    const signature = Buffer.from(parts[2], "base64url");
    if (
        !verifySignature(header.alg, `${parts[0]}.${parts[1]}`, signature, jwk)
    ) {
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.iss?.replace(/\/+$/, "") !== provider.issuer) return null;

    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(provider.clientId)) return null;

    if (
        typeof payload.exp !== "number" ||
        payload.exp + CLOCK_SKEW_SECONDS < now
    ) {
        return null;
    }

    if (expectedNonce !== null && payload.nonce !== expectedNonce) {
        return null;
    }

    return payload;
}
