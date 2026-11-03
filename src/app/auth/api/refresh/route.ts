import axios from "axios";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { axiosBase } from "@/lib/axios";

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

    try {
        const baseUrl = `${process.env.LS_LOGIN_URL}/oidc/token`;
        const response = await axiosBase.post(
            baseUrl,
            new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
                client_id: process.env.OIDC_CLIENT_ID ?? "",
                client_secret: process.env.OIDC_CLIENT_SECRET ?? "",
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                validateStatus: (status: number) => status === 200,
            },
        );

        const {
            access_token,
            id_token,
            refresh_token: new_refresh_token,
            expires_in,
        } = response.data;

        if (typeof access_token !== "string") {
            console.error(
                `OIDC refresh error: category=invalid_response, url=${process.env.LS_LOGIN_URL}/oidc/token, has_access_token=${typeof access_token === "string"}, has_id_token=${typeof id_token === "string"}`,
            );
            return NextResponse.json(
                { error: "Invalid token response" },
                { status: 500 },
            );
        }

        const cookieOptions = {
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            path: "/",
        };

        const cookieStoreAfter = await cookies();
        const logoutMarkerAfter = cookieStoreAfter.get("logout_marker")?.value;

        if (logoutMarkerAfter) {
            return NextResponse.json(
                { error: "Session terminated" },
                { status: 401 },
            );
        }

        const expiresAt =
            Date.now() +
            (typeof expires_in === "number" && expires_in > 0
                ? expires_in * 1000
                : 60 * 60 * 1000) -
            5 * 60 * 1000;

        const jsonResponse = NextResponse.json({ success: true });

        jsonResponse.cookies.set("access_token", access_token, {
            ...cookieOptions,
            maxAge:
                typeof expires_in === "number" && expires_in > 0
                    ? Math.floor(expires_in)
                    : 60 * 60,
        });

        if (typeof id_token === "string")
            jsonResponse.cookies.set("id_token", id_token, {
                ...cookieOptions,
                maxAge: 60 * 60,
            });

        if (typeof new_refresh_token === "string") {
            jsonResponse.cookies.set("refresh_token", new_refresh_token, {
                ...cookieOptions,
                httpOnly: true,
                maxAge: 30 * 24 * 60 * 60,
            });
        }

        jsonResponse.cookies.set("token_expires_at", String(expiresAt), {
            ...cookieOptions,
            maxAge: 30 * 24 * 60 * 60,
        });

        return jsonResponse;
    } catch (err) {
        if (axios.isAxiosError(err)) {
            const errorCategory = err.code
                ? `network_${err.code}`
                : err.response
                  ? `upstream_${err.response.status}`
                  : "unknown";
            console.error(
                `OIDC refresh error: category=${errorCategory}, url=${process.env.LS_LOGIN_URL}/oidc/token, has_response=${!!err.response}`,
            );
        } else {
            console.error(
                `OIDC refresh error: category=unexpected, url=${process.env.LS_LOGIN_URL}/oidc/token`,
            );
        }

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
        }

        return response;
    }
}
