import type { NextResponse } from "next/server";

export const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;
const DEFAULT_ACCESS_TOKEN_MAX_AGE = 3600;

/** Hash of the session's refresh token that the provider rejected once
 * (see `src/app/auth/api/refresh/route.ts`) */
export const REFRESH_REJECTED = "refresh_rejected";

/** The cookies of a session, which end with it */
export const SESSION_COOKIES = [
    "access_token",
    "id_token",
    "refresh_token",
    "token_expires_at",
    "oidc_provider",
    REFRESH_REJECTED,
] as const;

export type SessionTokens = {
    access_token: string;
    id_token: string;
    refresh_token?: unknown;
    expires_in?: unknown;
    refresh_expires_in?: unknown;
};

/** Set by the logout, deleted by the next login */
export const LOGOUT_MARKER = "logout_marker";

/** Options of Krini's httpOnly cookies */
export function baseCookieOptions() {
    return {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        httpOnly: true,
    };
}

/**
 * Whether the request's browser logged out since its last login: then its
 * session cookies are void, even if a refresh that the logout overtook set
 * them again
 * @param cookieStore The request's cookies
 * @returns True after a logout
 */
export function hasLoggedOut(cookieStore: {
    get: (name: string) => { value: string } | undefined;
}): boolean {
    return Boolean(cookieStore.get(LOGOUT_MARKER)?.value);
}

/**
 * Deletes the session cookies on a response; `logout_marker` stays
 * @param response The response
 */
export function clearSessionCookies(response: NextResponse): void {
    for (const name of SESSION_COOKIES) response.cookies.delete(name);
}

/**
 * Writes the `refresh_token` cookie if the token response has a refresh
 * token, for `refresh_expires_in` (at most 30 days)
 * @param response The response
 * @param tokens The token response
 * @returns The cookie's max-age in seconds, or null without a refresh token
 */
export function setRefreshTokenCookie(
    response: NextResponse,
    tokens: Pick<SessionTokens, "refresh_token" | "refresh_expires_in">,
): number | null {
    if (typeof tokens.refresh_token !== "string") return null;
    const maxAge =
        typeof tokens.refresh_expires_in === "number" &&
        tokens.refresh_expires_in > 0
            ? Math.min(
                  Math.floor(tokens.refresh_expires_in),
                  THIRTY_DAYS_SECONDS,
              )
            : THIRTY_DAYS_SECONDS;
    response.cookies.set("refresh_token", tokens.refresh_token, {
        ...baseCookieOptions(),
        maxAge,
    });
    return maxAge;
}

/**
 * Writes the Krini session cookies on a response. Token cookies are httpOnly;
 * `token_expires_at` is a non-sensitive timestamp (the access token's real
 * expiry and its lifetime, in ms) the client uses to schedule refreshes.
 * `access_token` lives as long as the provider's `expires_in`,
 * `refresh_token` as long as `refresh_expires_in` (both at most 30 days).
 * `id_token` and `token_expires_at` live as long as the session: the
 * refresh token's lifetime (30 days when a refresh doesn't rotate it), or
 * the access token's without a refresh token.
 *
 * When the token response omits `refresh_token`, the cookie is deleted —
 * a new session must not inherit a credential from a previous login, which
 * may belong to another provider. Pass `keepRefreshToken` on token refresh,
 * where an omitted `refresh_token` means "not rotated" and the existing
 * cookie stays valid.
 */
export function applySessionCookies(
    response: NextResponse,
    tokens: SessionTokens,
    providerId: string,
    options: { keepRefreshToken?: boolean } = {},
): void {
    const cookieOptions = baseCookieOptions();

    // at most 30 days, like every session cookie, so that the logout
    // marker outlives any of them
    const accessTokenMaxAge =
        typeof tokens.expires_in === "number" && tokens.expires_in > 0
            ? Math.min(Math.floor(tokens.expires_in), THIRTY_DAYS_SECONDS)
            : DEFAULT_ACCESS_TOKEN_MAX_AGE;

    response.cookies.set("access_token", tokens.access_token, {
        ...cookieOptions,
        maxAge: accessTokenMaxAge,
    });

    let sessionMaxAge = accessTokenMaxAge;
    const refreshMaxAge = setRefreshTokenCookie(response, tokens);
    if (refreshMaxAge !== null) {
        sessionMaxAge = refreshMaxAge;
    } else if (options.keepRefreshToken) {
        // not rotated: the refresh token's remaining lifetime is unknown
        sessionMaxAge = THIRTY_DAYS_SECONDS;
    } else {
        response.cookies.delete("refresh_token");
    }

    // The ID token holds the session's `sub`, so it must live as long as
    // the session: providers needn't send a new one on refresh (OpenID
    // Connect Core 12.2).
    response.cookies.set("id_token", tokens.id_token, {
        ...cookieOptions,
        maxAge: sessionMaxAge,
    });

    response.cookies.set("oidc_provider", providerId, {
        ...cookieOptions,
        maxAge: THIRTY_DAYS_SECONDS,
    });

    // `<expiry>:<lifetime>`, in ms (see `parseExpiry()`)
    const lifetime = accessTokenMaxAge * 1000;
    response.cookies.set(
        "token_expires_at",
        `${Date.now() + lifetime}:${lifetime}`,
        {
            ...cookieOptions,
            httpOnly: false,
            maxAge: sessionMaxAge,
        },
    );
}
