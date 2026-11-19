import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { axiosBase } from "@/lib/axios";
import {
    decodeJwtPayload,
    getAppOrigin,
    getEndpoints,
    getSessionProvider,
    type LoginProvider,
} from "@/lib/oidc";
import { rejectForeignOrigin } from "@/lib/request-origin";
import {
    baseCookieOptions,
    clearSessionCookies,
    LOGOUT_MARKER,
    THIRTY_DAYS_SECONDS,
} from "@/lib/session-cookies";

const REVOCATION_TIMEOUT_MS = 5_000;

/**
 * Revokes the refresh token at the provider (RFC 7009), so that no copy of
 * it can renew the session; failures are logged, the logout goes on.
 */
async function revokeRefreshToken(
    endpoint: string,
    refreshToken: string,
    provider: LoginProvider,
): Promise<void> {
    try {
        await axiosBase.post(
            endpoint,
            new URLSearchParams({
                token: refreshToken,
                token_type_hint: "refresh_token",
                client_id: provider.clientId,
                client_secret: provider.clientSecret,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                timeout: REVOCATION_TIMEOUT_MS,
            },
        );
    } catch {
        console.error(
            `OIDC logout error: category=revocation_failed, endpoint=${endpoint}`,
        );
    }
}

export async function POST(req: NextRequest) {
    const rejected = rejectForeignOrigin(req);
    if (rejected) return rejected;
    // checked by rejectForeignOrigin
    const appOrigin = getAppOrigin() as string;

    const cookieStore = await cookies();
    const idToken = cookieStore.get("id_token")?.value;
    const refreshToken = cookieStore.get("refresh_token")?.value;
    const provider = getSessionProvider(
        cookieStore.get("oidc_provider")?.value,
        idToken ? decodeJwtPayload(idToken) : null,
    );

    // End the provider session too when the OP advertises an
    // end_session_endpoint (OIDC RP-Initiated Logout 1.0).
    let endSessionUrl: string | null = null;
    if (provider) {
        const endpoints = await getEndpoints(provider);
        if (endpoints?.revocationEndpoint && refreshToken) {
            await revokeRefreshToken(
                endpoints.revocationEndpoint,
                refreshToken,
                provider,
            );
        }
        if (endpoints?.endSessionEndpoint) {
            try {
                const logoutUrl = new URL(endpoints.endSessionEndpoint);
                if (["http:", "https:"].includes(logoutUrl.protocol)) {
                    logoutUrl.searchParams.set(
                        "post_logout_redirect_uri",
                        `${appOrigin}/`,
                    );
                    logoutUrl.searchParams.set("client_id", provider.clientId);
                    if (idToken) {
                        logoutUrl.searchParams.set("id_token_hint", idToken);
                    }
                    endSessionUrl = logoutUrl.toString();
                }
            } catch {
                endSessionUrl = null;
            }
        }
    }

    const response = NextResponse.json({
        success: true,
        ...(endSessionUrl ? { end_session_url: endSessionUrl } : {}),
    });

    // Until the next login, the refresh, token and user-info routes refuse
    // the session's cookies, in case a refresh that this logout overtook
    // sets them again; as long as the longest session, as such a refresh
    // may rotate the refresh token.
    response.cookies.set(LOGOUT_MARKER, Date.now().toString(), {
        ...baseCookieOptions(),
        maxAge: THIRTY_DAYS_SECONDS,
    });

    clearSessionCookies(response);

    return response;
}
