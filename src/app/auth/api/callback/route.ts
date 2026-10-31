import axios from "axios";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

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
    const authState = cookieStore.get("authState")?.value;

    if (!authState || authState !== state) {
        return NextResponse.redirect(
            new URL("/auth/error?type=state", request.url),
        );
    }

    cookieStore.delete("authState");

    try {
        const baseUrl = `${process.env.LS_LOGIN_URL}/oidc/token`;
        const response = await axios.post(
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

        const { access_token, id_token, expires_in } = response.data;

        if (typeof access_token !== "string" || typeof id_token !== "string") {
            return NextResponse.redirect(
                new URL("/auth/error?type=internal", request.url),
            );
        }

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            path: "/",
        };

        const responseRedirect = NextResponse.redirect(
            new URL("/dashboard", request.url),
        );

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

        return responseRedirect;
    } catch {
        return NextResponse.redirect(
            new URL("/auth/error?type=internal", request.url),
        );
    }
}
