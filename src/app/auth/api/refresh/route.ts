import axios from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { axiosBase } from "@/lib/axios";
import {
    decodeJwtPayload,
    getEndpoints,
    getSessionProvider,
    validateIdToken,
} from "@/lib/oidc";
import { applySessionCookies } from "@/lib/session-cookies";

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

export async function POST() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;
    const logoutMarker = cookieStore.get("logout_marker")?.value;

    if (!refreshToken) {
        return NextResponse.json(
            { error: "No refresh token available" },
            { status: 401 },
        );
    }

    if (logoutMarker) {
        return NextResponse.json(
            { error: "Session terminated" },
            { status: 401 },
        );
    }

    const idToken = cookieStore.get("id_token")?.value;
    const provider = getSessionProvider(
        cookieStore.get("oidc_provider")?.value,
        idToken ? decodeJwtPayload(idToken) : null,
    );
    if (!provider) {
        return NextResponse.json(
            { error: "Unknown login provider" },
            { status: 401 },
        );
    }

    const endpoints = await getEndpoints(provider);
    if (!endpoints) {
        return NextResponse.json(
            { error: "Could not discover the OIDC provider configuration" },
            { status: 500 },
        );
    }

    try {
        const response = await axiosBase.post(
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

        const { access_token, id_token } = response.data;

        if (typeof access_token !== "string") {
            console.error(
                `OIDC refresh error: category=invalid_response, endpoint=${endpoints.tokenEndpoint}`,
            );
            return NextResponse.json(
                { error: "Invalid token response" },
                { status: 500 },
            );
        }

        // A refreshed ID token carries no nonce; signature, issuer,
        // audience and expiry are still verified.
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
                return NextResponse.json(
                    { error: "Invalid token response" },
                    { status: 500 },
                );
            }
        }

        const cookieStoreAfter = await cookies();
        if (cookieStoreAfter.get("logout_marker")?.value) {
            return NextResponse.json(
                { error: "Session terminated" },
                { status: 401 },
            );
        }

        const jsonResponse = NextResponse.json({ success: true });
        applySessionCookies(jsonResponse, response.data, provider.id, {
            keepRefreshToken: true,
        });

        return jsonResponse;
    } catch (err) {
        logTokenError("OIDC refresh error", err, endpoints.tokenEndpoint);

        const shouldClearCookies =
            axios.isAxiosError(err) && err.response?.status === 401;

        const response = NextResponse.json(
            { error: "Failed to refresh token" },
            { status: 401 },
        );

        if (shouldClearCookies) {
            response.cookies.delete("logout_marker");
            response.cookies.delete("access_token");
            response.cookies.delete("id_token");
            response.cookies.delete("refresh_token");
            response.cookies.delete("token_expires_at");
            response.cookies.delete("oidc_provider");
        }

        return response;
    }
}
