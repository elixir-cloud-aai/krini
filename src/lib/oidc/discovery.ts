import type { LoginProvider, OidcEndpoints } from "./types";

const DISCOVERY_TTL_MS = 60 * 60 * 1000;

let discoveryCache: {
    issuer: string;
    doc: DiscoveryCacheEntry;
    at: number;
} | null = null;

type DiscoveryCacheEntry = {
    authorization_endpoint?: string;
    token_endpoint?: string;
    userinfo_endpoint?: string;
    jwks_uri?: string;
    end_session_endpoint?: string;
    issuer?: string;
};

/** Fetches and caches a provider's OIDC discovery document. */
export async function getEndpoints(
    provider: LoginProvider,
): Promise<OidcEndpoints | null> {
    const now = Date.now();
    if (
        discoveryCache &&
        discoveryCache.issuer === provider.issuer &&
        now - discoveryCache.at < DISCOVERY_TTL_MS
    ) {
        return toEndpoints(discoveryCache.doc);
    }

    const url = `${provider.issuer}/.well-known/openid-configuration`;
    let res: Response;
    try {
        res = await fetch(url, {
            headers: { Accept: "application/json" },
            cache: "no-store",
        });
    } catch {
        return null;
    }
    if (!res.ok) return null;

    let doc: DiscoveryCacheEntry;
    try {
        doc = (await res.json()) as DiscoveryCacheEntry;
    } catch {
        return null;
    }
    if (!doc.token_endpoint || !doc.authorization_endpoint) return null;
    if (doc.issuer && doc.issuer.replace(/\/+$/, "") !== provider.issuer) {
        return null;
    }

    discoveryCache = { issuer: provider.issuer, doc, at: now };
    return toEndpoints(doc);
}

function toEndpoints(doc: DiscoveryCacheEntry): OidcEndpoints {
    return {
        // presence of both endpoints is checked in getEndpoints
        authorizationEndpoint: doc.authorization_endpoint as string,
        tokenEndpoint: doc.token_endpoint as string,
        userinfoEndpoint: doc.userinfo_endpoint,
        jwksUri: doc.jwks_uri,
        endSessionEndpoint: doc.end_session_endpoint,
    };
}
