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

    cookieStore.delete("access_token");
    cookieStore.delete("id_token");

    return NextResponse.json({ success: true });
}
