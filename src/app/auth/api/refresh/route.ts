import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { axiosBase } from "@/lib/axios";

export async function POST() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
        return NextResponse.json(
            { error: "No refresh token available" },
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

        const { access_token, id_token, refresh_token: new_refresh_token, expires_in } = response.data;

        if (typeof access_token !== "string" || typeof id_token !== "string") {
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

        const jsonResponse = NextResponse.json({ success: true });

        const expiresAt = Date.now() + (typeof expires_in === "number" && expires_in > 0 ? expires_in * 1000 : 60 * 60 * 1000) - 5 * 60 * 1000;

        jsonResponse.cookies.set("access_token", access_token, {
            ...cookieOptions,
            maxAge:
                typeof expires_in === "number" && expires_in > 0
                    ? Math.floor(expires_in)
                    : 60 * 60,
        });

        jsonResponse.cookies.set("id_token", id_token, {
            ...cookieOptions,
            maxAge: 60 * 60,
        });

        if (typeof new_refresh_token === "string") {
            jsonResponse.cookies.set("refresh_token", new_refresh_token, {
                ...cookieOptions,
                maxAge: 30 * 24 * 60 * 60,
            });
        }

        jsonResponse.cookies.set("token_expires_at", String(expiresAt), {
            ...cookieOptions,
            maxAge: 30 * 24 * 60 * 60,
        });

        return jsonResponse;
    } catch {
        const response = NextResponse.json(
            { error: "Failed to refresh token" },
            { status: 401 },
        );

        response.cookies.delete("access_token");
        response.cookies.delete("id_token");
        response.cookies.delete("refresh_token");
        response.cookies.delete("token_expires_at");

        return response;
    }
}
