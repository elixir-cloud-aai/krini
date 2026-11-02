import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const appOrigin = process.env.APP_ORIGIN;

    if (!appOrigin) {
        return NextResponse.json(
            { error: "APP_ORIGIN environment variable is not set" },
            { status: 500 },
        );
    }

    let expectedOrigin: string;

    try {
        expectedOrigin = new URL(appOrigin).origin;
    } catch {
        return NextResponse.json(
            { error: "Invalid APP_ORIGIN format" },
            { status: 500 },
        );
    }

    const origin = req.headers.get("origin");

    if (!origin || origin !== expectedOrigin) {
        return NextResponse.json(
            { error: "Invalid request origin" },
            { status: 403 },
        );
    }

    const cookieStore = await cookies();

    const response = NextResponse.json({ success: true });

    response.cookies.set("logout_marker", Date.now().toString(), {
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60,
    });

    response.cookies.delete("access_token");
    response.cookies.delete("id_token");
    response.cookies.delete("refresh_token");
    response.cookies.delete("token_expires_at");

    return response;
}
