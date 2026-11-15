import { createHash } from "node:crypto";
import { deriveTier, extractGroups } from "./groups";
import type { LoginProvider, OidcEndpoints, UserSession } from "./types";

const USERINFO_CACHE_TTL_MS = 5 * 60 * 1000;
const USERINFO_CACHE_MAX_ENTRIES = 1000;

const sessionCache = new Map<
    string,
    { session: UserSession; expiresAt: number }
>();

function sessionCacheKey(accessToken: string): string {
    return createHash("sha256").update(accessToken).digest("hex");
}

/**
 * Fetches the userinfo document and derives groups/tier. Results are cached
 * for at most 5 minutes, keyed by a hash of the access token.
 */
export async function getUserSession(
    accessToken: string,
    idTokenPayload: Record<string, unknown> | null,
    endpoints: OidcEndpoints,
    provider: LoginProvider,
): Promise<UserSession | null> {
    const key = sessionCacheKey(accessToken);
    const cached = sessionCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.session;
    }

    let userinfo: Record<string, unknown> | null = null;
    if (endpoints.userinfoEndpoint) {
        let res: Response;
        try {
            res = await fetch(endpoints.userinfoEndpoint, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/json",
                },
                cache: "no-store",
            });
        } catch {
            return null;
        }
        if (!res.ok) return null;
        let body: unknown;
        try {
            body = await res.json();
        } catch {
            return null;
        }
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
            return null;
        }
        userinfo = body as Record<string, unknown>;

        // The userinfo subject must match the validated ID token's sub;
        // claims for any other subject are a different identity.
        const expectedSub = idTokenPayload?.sub;
        if (typeof expectedSub !== "string" || userinfo.sub !== expectedSub) {
            return null;
        }
    }

    const groupsSource = provider.groupsFromUserinfo
        ? userinfo
        : idTokenPayload;
    const groups = extractGroups(groupsSource, provider.groupsClaim);
    const session: UserSession = {
        user: userinfo ?? idTokenPayload ?? {},
        groups,
        tier: deriveTier(groups, provider),
    };

    // Entries for users who never return would otherwise accumulate forever.
    if (sessionCache.size >= USERINFO_CACHE_MAX_ENTRIES) {
        sessionCache.clear();
    }
    sessionCache.set(key, {
        session,
        expiresAt: Date.now() + USERINFO_CACHE_TTL_MS,
    });
    return session;
}
