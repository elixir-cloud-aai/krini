import { createHash } from "node:crypto";
import axios, { type AxiosError, type AxiosResponse } from "axios";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { axiosBase } from "@/lib/axios";
import {
    decodeJwtPayload,
    getEndpoints,
    getSessionProvider,
    validateIdToken,
} from "@/lib/oidc";
import { rejectForeignOrigin } from "@/lib/request-origin";
import {
    applySessionCookies,
    baseCookieOptions,
    clearSessionCookies,
    hasLoggedOut,
    REFRESH_REJECTED,
    type SessionTokens,
    setRefreshTokenCookie,
} from "@/lib/session-cookies";

/** Lifetime of `refresh_rejected`, in seconds: longer than the client's
 * longest wait before it tries again (`RETRY_MAX_MS` of
 * `src/lib/token-refresh.ts`) */
const REFRESH_REJECTED_MAX_AGE = 60 * 60;

/** How long after the first rejection of a refresh token a further one
 * may still come from a lost race, in ms: the longest that the winner's
 * answer may take to reach the browser (`REFRESH_TIMEOUT_MS` of
 * `src/lib/token-refresh.ts`) */
const REFRESH_RACE_MS = 60 * 1000;

/**
 * Why a refresh failed, as `code` of the response, for the client
 * (`src/lib/token-refresh.ts`):
 *
 * - `session_ended` (401): the session is over; its cookies are deleted;
 * - `no_refresh_token` (401): nothing to renew; `token_expires_at` is
 *   deleted, so the client stops trying, and the access token, if any,
 *   stays until it expires;
 * - `concurrent_refresh` (409): the provider rejected the refresh token
 *   for the first time; another refresh of the session (e.g. of another
 *   tab, on any pod) may have used it just before, so the client tries
 *   again with the cookies it has then;
 * - `unavailable` (503): the provider or Krini's settings failed; the
 *   session stays, and the client tries again later.
 */
type RefreshFailure =
    | "session_ended"
    | "no_refresh_token"
    | "concurrent_refresh"
    | "unavailable";

const FAILURE_STATUS: Record<RefreshFailure, number> = {
    session_ended: 401,
    no_refresh_token: 401,
    concurrent_refresh: 409,
    unavailable: 503,
};

/**
 * Builds the response of a failed refresh, with the cookie changes of its
 * code
 * @param code Why the refresh failed
 * @param error Message for humans
 * @returns The response
 */
function failure(code: RefreshFailure, error: string): NextResponse {
    const response = NextResponse.json(
        { error, code },
        { status: FAILURE_STATUS[code] },
    );
    if (code === "session_ended") clearSessionCookies(response);
    if (code === "no_refresh_token")
        response.cookies.delete("token_expires_at");
    return response;
}

/** Key of a refresh token in `refresh_rejected`: its SHA-256 hash */
function refreshTokenKey(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

/**
 * When the provider first rejected a refresh token, from `refresh_rejected`
 * (`<key>:<time in ms>`)
 * @param record The cookie's value, if any
 * @param key The refresh token's key
 * @returns The time, or null if the record is of another token, or invalid
 */
function firstRejectionOf(
    record: string | undefined,
    key: string,
): number | null {
    const [recordKey, at] = (record ?? "").split(":");
    const time = Number(at);
    return recordKey === key && Number.isFinite(time) && time > 0 ? time : null;
}

/** The provider's `error` field of a failed token request, if any */
function providerErrorOf(err: AxiosError<{ error?: unknown }>) {
    const error = err.response?.data?.error;
    return typeof error === "string" ? error : undefined;
}

/**
 * Whether the provider rejected the refresh token itself (RFC 6749 5.2):
 * 400 `invalid_grant` for an expired, revoked or reused refresh token, or
 * 401, which some providers answer instead. `invalid_client` and
 * `unauthorized_client` mean that Krini's client credentials or settings
 * are wrong, which no session can fix.
 */
function refreshTokenRejected(err: unknown): boolean {
    if (!axios.isAxiosError(err) || !err.response) return false;
    const providerError = providerErrorOf(err);
    if (
        providerError === "invalid_client" ||
        providerError === "unauthorized_client"
    )
        return false;
    if (err.response.status === 400) return providerError === "invalid_grant";
    return err.response.status === 401;
}

/** Logs only the HTTP status and the provider's `error` field — never codes, secrets or tokens. */
function logTokenError(context: string, err: unknown, tokenEndpoint: string) {
    if (axios.isAxiosError(err)) {
        console.error(
            `${context}: category=${err.response ? `upstream_${err.response.status}` : err.code ? `network_${err.code}` : "unknown"}, endpoint=${tokenEndpoint}, provider_error=${providerErrorOf(err) ?? "none"}`,
        );
    } else {
        console.error(
            `${context}: category=unexpected, endpoint=${tokenEndpoint}`,
        );
    }
}

export async function POST(req: NextRequest) {
    const rejected = rejectForeignOrigin(req);
    if (rejected) return rejected;

    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    // After a logout, session cookies can only come from a refresh that
    // the logout overtook: delete them again.
    if (hasLoggedOut(cookieStore)) {
        return failure("session_ended", "Session terminated");
    }

    if (!refreshToken) {
        const response = failure(
            "no_refresh_token",
            "No refresh token available",
        );
        // without an access token either, the session is over: none of its
        // cookies may outlive it
        if (!cookieStore.get("access_token")?.value)
            clearSessionCookies(response);
        return response;
    }

    const idToken = cookieStore.get("id_token")?.value;
    const idTokenPayload = idToken ? decodeJwtPayload(idToken) : null;
    const provider = getSessionProvider(
        cookieStore.get("oidc_provider")?.value,
        idTokenPayload,
    );
    if (!provider) {
        // e.g. the provider was removed from the settings: no refresh can
        // renew this session
        return failure("session_ended", "Unknown login provider");
    }

    const endpoints = await getEndpoints(provider);
    if (!endpoints) {
        console.error(
            `OIDC refresh error: category=discovery_failed, provider=${provider.id}`,
        );
        return failure(
            "unavailable",
            "Could not discover the OIDC provider configuration",
        );
    }

    let response: AxiosResponse;
    try {
        response = await axiosBase.post(
            endpoints.tokenEndpoint,
            new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: provider.clientId,
                client_secret: provider.clientSecret,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                validateStatus: (status: number) => status === 200,
            },
        );
    } catch (err) {
        logTokenError("OIDC refresh error", err, endpoints.tokenEndpoint);
        if (!refreshTokenRejected(err)) {
            return failure("unavailable", "Failed to refresh token");
        }
        // When the provider rotates refresh tokens, concurrent refreshes
        // of the same session race: one wins and sets new cookies, the
        // loser gets a replay rejection, which must not clear the cookies
        // the winner set. The record is in the browser, so that it holds
        // whichever pod answers: the first rejection of a refresh token
        // stores its hash and the time in `refresh_rejected` and keeps the
        // session, so that the client tries again; the retry carries the
        // winner's refresh token, or the same one again if no refresh
        // won. Only a rejection of the same token once the winner's answer
        // can no longer be on its way ends the session. The client's lock
        // (one refresh per browser at a time) keeps refreshes from racing
        // at all where browsers have Web Locks.
        const key = refreshTokenKey(refreshToken);
        const firstRejection = firstRejectionOf(
            cookieStore.get(REFRESH_REJECTED)?.value,
            key,
        );
        if (firstRejection !== null) {
            if (Date.now() - firstRejection >= REFRESH_RACE_MS) {
                return failure("session_ended", "Failed to refresh token");
            }
            return failure("concurrent_refresh", "Failed to refresh token");
        }
        const retry = failure("concurrent_refresh", "Failed to refresh token");
        retry.cookies.set(REFRESH_REJECTED, `${key}:${Date.now()}`, {
            ...baseCookieOptions(),
            maxAge: REFRESH_REJECTED_MAX_AGE,
        });
        return retry;
    }

    const data: unknown = response.data;
    if (typeof data !== "object" || data === null) {
        console.error(
            `OIDC refresh error: category=invalid_response, endpoint=${endpoints.tokenEndpoint}`,
        );
        return failure("unavailable", "Invalid token response");
    }
    const { access_token, id_token } = data as Record<string, unknown>;

    /** A failure that keeps a rotated refresh token: the provider may have
     * invalidated the old one already, so a retry needs the new one */
    const unavailable = () => {
        const failed = failure("unavailable", "Invalid token response");
        setRefreshTokenCookie(failed, data as SessionTokens);
        return failed;
    };

    if (typeof access_token !== "string") {
        console.error(
            `OIDC refresh error: category=invalid_response, endpoint=${endpoints.tokenEndpoint}`,
        );
        return unavailable();
    }

    // A refreshed ID token carries no nonce; signature, issuer, audience
    // and expiry are still verified, and it must name the session's user
    // (OpenID Connect Core 12.2).
    if (typeof id_token === "string") {
        const payload = await validateIdToken(
            id_token,
            endpoints,
            provider,
            null,
        );
        if (!payload) {
            console.error(
                `OIDC refresh error: category=id_token_validation_failed, endpoint=${endpoints.tokenEndpoint}`,
            );
            return unavailable();
        }
        if (
            idTokenPayload &&
            (payload.sub !== idTokenPayload.sub ||
                payload.iss !== idTokenPayload.iss)
        ) {
            console.error(
                `OIDC refresh error: category=id_token_subject_mismatch, endpoint=${endpoints.tokenEndpoint}`,
            );
            return failure("session_ended", "Invalid token response");
        }
    }

    // without a new ID token, the session's stays, with the session's new
    // lifetime; without either (e.g. a session of an older image whose ID
    // token cookie expired), nothing names the user any more
    const sessionIdToken = typeof id_token === "string" ? id_token : idToken;
    if (!sessionIdToken) {
        return failure("session_ended", "Session has no ID token");
    }

    const jsonResponse = NextResponse.json({ success: true });
    applySessionCookies(
        jsonResponse,
        {
            ...(data as SessionTokens),
            id_token: sessionIdToken,
        },
        provider.id,
        { keepRefreshToken: true },
    );
    // always, as the record of a loser of a race may reach the browser
    // after the request of this refresh left it
    jsonResponse.cookies.delete(REFRESH_REJECTED);

    return jsonResponse;
}
