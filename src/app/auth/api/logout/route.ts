import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import {
    decodeJwtPayload,
    getAppOrigin,
    getEndpoints,
    getSessionProvider,
} from "@/lib/oidc";

export async function POST(req: NextRequest) {
    const appOrigin = getAppOrigin();

    if (!appOrigin) {
        return NextResponse.json(
            { error: "APP_ORIGIN environment variable is not set" },
            { status: 500 },
        );
    }

    const expectedOrigin = appOrigin;
    const origin = req.headers.get("origin");

    if (!origin || origin !== expectedOrigin) {
        return NextResponse.json(
            { error: "Invalid request origin" },
            { status: 403 },
        );
    }

    const cookieStore = await cookies();
    const idToken = cookieStore.get("id_token")?.value;
    const provider = getSessionProvider(
        cookieStore.get("oidc_provider")?.value,
        idToken ? decodeJwtPayload(idToken) : null,
    );

    // End the provider session too when the OP advertises an
    // end_session_endpoint (OIDC RP-Initiated Logout 1.0).
    let endSessionUrl: string | null = null;
    if (provider) {
        const endpoints = await getEndpoints(provider);
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

    response.cookies.set("logout_marker", Date.now().toString(), {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        httpOnly: true,
        maxAge: 15 * 60,
    });

    response.cookies.delete("access_token");
    response.cookies.delete("id_token");
    response.cookies.delete("refresh_token");
    response.cookies.delete("token_expires_at");
    response.cookies.delete("oidc_provider");

    return response;
}
