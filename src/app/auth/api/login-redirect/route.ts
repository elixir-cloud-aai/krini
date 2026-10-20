import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export async function GET() {
    const loginUrl = process.env.LS_LOGIN_URL;
    const clientId = process.env.OIDC_CLIENT_ID;
    const redirectUri = process.env.OIDC_REDIRECT_URI;

    if (!loginUrl || !clientId || !redirectUri) {
        return NextResponse.json(
            { error: "OIDC environment variables are not configured" },
            { status: 500 },
        );
    }

    const state = randomUUID();

    const authorizeUrl = new URL("/oidc/authorize", loginUrl);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", "openid profile email");
    authorizeUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authorizeUrl);

    response.cookies.set("authState", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10,
        path: "/",
    });

    return response;
}
