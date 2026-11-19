import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { hasLoggedOut } from "@/lib/session-cookies";

export async function GET() {
    const cookieStore = await cookies();
    const accessToken = hasLoggedOut(cookieStore)
        ? undefined
        : cookieStore.get("access_token")?.value;

    if (!accessToken) {
        return NextResponse.json(
            { error: "Not authenticated" },
            { status: 401 },
        );
    }

    return NextResponse.json(
        { access_token: accessToken },
        {
            headers: {
                "Cache-Control": "no-store, private",
            },
        },
    );
}
