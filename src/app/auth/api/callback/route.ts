import axios from "axios";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { axiosBase } from "@/lib/axios";
import {
    getAppOrigin,
    getEndpoints,
    getProviderById,
    getRedirectUri,
    validateIdToken,
} from "@/lib/oidc";
import { applySessionCookies, LOGOUT_MARKER } from "@/lib/session-cookies";

function appUrl(path: string, request: NextRequest) {
    const appOrigin = process.env.APP_ORIGIN;
    if (appOrigin) {
        try {
            const { origin, protocol } = new URL(appOrigin);
            if (protocol === "http:" || protocol === "https:") {
                return new URL(path, origin);
            }
        } catch {}
        console.error(
            "OIDC callback error: APP_ORIGIN isn't a valid http(s) origin; redirecting to the origin of the request",
        );
    } else {
        console.error(
            "OIDC callback error: APP_ORIGIN isn't set; redirecting to the origin of the request",
        );
    }
    return new URL(path, request.url);
}

function redirectError(request: NextRequest, type: string, state?: string) {
    const response = NextResponse.redirect(
        appUrl(`/auth/error?type=${type}`, request),
    );
    if (state) expireLoginArtifacts(response, state);
    return response;
}

function expireLoginArtifacts(response: NextResponse, state: string) {
    response.cookies.delete(`authState-${state}`);
    response.cookies.delete(LOGOUT_MARKER);
}

/** Logs only the HTTP status and the provider's `error` field — never codes, secrets or tokens. */
function logTokenError(context: string, err: unknown, tokenEndpoint: string) {
    if (axios.isAxiosError(err)) {
        const providerError =
            typeof err.response?.data?.error === "string"
                ? err.response.data.error
                : undefined;
        console.error(
            `${context}: category=${err.response ? `upstream_${err.response.status}` : err.code ? `network_${err.code}` : "unknown"}, endpoint=${tokenEndpoint}, provider_error=${providerError ?? "none"}`,
        );
    } else {
        console.error(
            `${context}: category=unexpected, endpoint=${tokenEndpoint}`,
        );
    }
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const providerError = searchParams.get("error");

    if (providerError) {
        // The provider reports the failure in `error`/`error_description`;
        // log the error code only, never the description (may echo params).
        // Control characters are stripped so the value cannot forge log
        // entries.
        // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point
        const safeError = providerError.replace(/[\x00-\x1f\x7f]/g, "");
        console.error(`OIDC callback: provider_error=${safeError}`);
        return redirectError(request, "params");
    }

    if (!code || !state) {
        return redirectError(request, "params");
    }

    const redirectUri = getRedirectUri();
    if (!redirectUri) {
        return redirectError(request, "internal");
    }

    const appOrigin = getAppOrigin();
    if (appOrigin) {
        try {
            if (new URL(redirectUri).origin !== new URL(appOrigin).origin) {
                console.error(
                    "OIDC callback error: category=origin_mismatch, callback and app origins differ",
                );
                return redirectError(request, "internal");
            }
        } catch {
            return redirectError(request, "internal");
        }
    }

    const cookieStore = await cookies();
    const txnRaw = cookieStore.get(`authState-${state}`)?.value;

    let txn: {
        state?: string;
        nonce?: string;
        codeVerifier?: string;
        providerId?: string;
    } | null = null;
    try {
        txn = txnRaw ? JSON.parse(txnRaw) : null;
    } catch {
        txn = null;
    }

    const provider =
        txn && typeof txn.providerId === "string"
            ? getProviderById(txn.providerId)
            : undefined;

    if (
        !txn ||
        txn.state !== state ||
        typeof txn.nonce !== "string" ||
        typeof txn.codeVerifier !== "string" ||
        !provider
    ) {
        return redirectError(request, "state");
    }

    const endpoints = await getEndpoints(provider);
    if (!endpoints) {
        return redirectError(request, "internal", state);
    }

    try {
        const response = await axiosBase.post(
            endpoints.tokenEndpoint,
            new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
                client_id: provider.clientId,
                client_secret: provider.clientSecret,
                code_verifier: txn.codeVerifier,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                validateStatus: (status: number) => status === 200,
            },
        );

        const { access_token, id_token } = response.data;

        if (typeof access_token !== "string" || typeof id_token !== "string") {
            console.error(
                `OIDC callback error: category=invalid_response, endpoint=${endpoints.tokenEndpoint}`,
            );
            return redirectError(request, "internal", state);
        }

        const idTokenPayload = await validateIdToken(
            id_token,
            endpoints,
            provider,
            txn.nonce,
        );
        if (!idTokenPayload) {
            console.error(
                `OIDC callback error: category=id_token_validation_failed, endpoint=${endpoints.tokenEndpoint}`,
            );
            return redirectError(request, "internal", state);
        }

        const responseRedirect = NextResponse.redirect(
            appUrl("/dashboard", request),
        );
        applySessionCookies(responseRedirect, response.data, provider.id);
        expireLoginArtifacts(responseRedirect, state);

        return responseRedirect;
    } catch (err) {
        logTokenError("OIDC callback error", err, endpoints.tokenEndpoint);
        return redirectError(request, "internal", state);
    }
}
