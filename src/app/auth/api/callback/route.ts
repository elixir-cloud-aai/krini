import axios from "axios";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { axiosBase } from "@/lib/axios";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
        return NextResponse.redirect(
            new URL("/auth/error?type=params", request.url),
        );
    }

    const cookieStore = await cookies();
    const authState = cookieStore.get(`authState-${state}`)?.value;

    if (!authState || authState !== state) {
        return NextResponse.redirect(
            new URL("/auth/error?type=state", request.url),
        );
    }

    cookieStore.delete(`authState-${state}`);
    cookieStore.delete("logout_marker");

    try {
        const baseUrl = `${process.env.LS_LOGIN_URL}/oidc/token`;
        const response = await axiosBase.post(
            baseUrl,
            new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: process.env.OIDC_REDIRECT_URI ?? "",
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

        const { access_token, id_token, refresh_token, expires_in } =
            response.data;

        if (typeof access_token !== "string" || typeof id_token !== "string") {
            console.error(
                `OIDC callback error: category=invalid_response, url=${process.env.LS_LOGIN_URL}/oidc/token, has_access_token=${typeof access_token === "string"}, has_id_token=${typeof id_token === "string"}`,
            );
            return NextResponse.redirect(
                new URL("/auth/error?type=internal", request.url),
            );
        }

        const cookieOptions = {
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            path: "/",
            httpOnly: true,
        };

        const responseRedirect = NextResponse.redirect(
            new URL("/dashboard", request.url),
        );

        const expiresAt =
            Date.now() +
            (typeof expires_in === "number" && expires_in > 0
                ? expires_in * 1000
                : 60 * 60 * 1000) -
            5 * 60 * 1000;

        responseRedirect.cookies.set("access_token", access_token, {
            ...cookieOptions,
            maxAge:
                typeof expires_in === "number" && expires_in > 0
                    ? Math.floor(expires_in)
                    : 60 * 60,
        });

        responseRedirect.cookies.set("id_token", id_token, {
            ...cookieOptions,
            maxAge: 60 * 60,
        });

        if (typeof refresh_token === "string") {
            responseRedirect.cookies.set("refresh_token", refresh_token, {
                ...cookieOptions,
                maxAge: 30 * 24 * 60 * 60,
            });
        }

        responseRedirect.cookies.set("token_expires_at", String(expiresAt), {
            ...cookieOptions,
            httpOnly: false,
            maxAge: 30 * 24 * 60 * 60,
        });

        return responseRedirect;
    } catch (err) {
        if (axios.isAxiosError(err)) {
            const errorCategory = err.code
                ? `network_${err.code}`
                : err.response
                  ? `upstream_${err.response.status}`
                  : "unknown";
            console.error(
                `OIDC callback error: category=${errorCategory}, url=${process.env.LS_LOGIN_URL}/oidc/token, has_response=${!!err.response}`,
            );
        } else {
            console.error(
                `OIDC callback error: category=unexpected, url=${process.env.LS_LOGIN_URL}/oidc/token`,
            );
        }
        return NextResponse.redirect(
            new URL("/auth/error?type=internal", request.url),
        );
    }
}
