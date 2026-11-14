import type { NextResponse } from "next/server";

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;
const DEFAULT_ACCESS_TOKEN_MAX_AGE = 3600;
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export type SessionTokens = {
    access_token: string;
    id_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
    refresh_expires_in?: unknown;
};

/**
 * Writes the Krini session cookies on a response. Token cookies are httpOnly;
 * `token_expires_at` is a non-sensitive timestamp the client uses to schedule
 * refreshes. Lifetimes follow the provider's `expires_in`/`refresh_expires_in`.
 */
export function applySessionCookies(
    response: NextResponse,
    tokens: SessionTokens,
    providerId: string,
): void {
    const cookieOptions = {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        httpOnly: true,
    };

    const accessTokenMaxAge =
        typeof tokens.expires_in === "number" && tokens.expires_in > 0
            ? Math.floor(tokens.expires_in)
            : DEFAULT_ACCESS_TOKEN_MAX_AGE;

    response.cookies.set("access_token", tokens.access_token, {
        ...cookieOptions,
        maxAge: accessTokenMaxAge,
    });

    if (typeof tokens.id_token === "string") {
        response.cookies.set("id_token", tokens.id_token, {
            ...cookieOptions,
            maxAge: accessTokenMaxAge,
        });
    }

    if (typeof tokens.refresh_token === "string") {
        response.cookies.set("refresh_token", tokens.refresh_token, {
            ...cookieOptions,
            maxAge:
                typeof tokens.refresh_expires_in === "number" &&
                tokens.refresh_expires_in > 0
                    ? Math.floor(tokens.refresh_expires_in)
                    : THIRTY_DAYS_SECONDS,
        });
    }

    response.cookies.set("oidc_provider", providerId, {
        ...cookieOptions,
        maxAge: THIRTY_DAYS_SECONDS,
    });

    const expiresAt = Date.now() + accessTokenMaxAge * 1000 - REFRESH_MARGIN_MS;
    response.cookies.set("token_expires_at", String(expiresAt), {
        ...cookieOptions,
        httpOnly: false,
        maxAge: THIRTY_DAYS_SECONDS,
    });
}
