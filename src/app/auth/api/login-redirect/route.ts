import { setCookie } from "cookies-next/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    const baseUrl = `${process.env.LS_LOGIN_URL}/oidc/authorize`;
    const authState = crypto.randomUUID();
    const scope = "openid profile email";

    await setCookie("authState", authState, {
        cookies: cookies,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 30,
        path: "/",
    });

    const redirectUrl =
        baseUrl +
        `?response_type=code&client_id=${process.env.OIDC_CLIENT_ID}&redirect_uri=${process.env.OIDC_REDIRECT_URI}` +
        `&scope=${scope}&state=${authState}`;

    return NextResponse.redirect(redirectUrl);
}
