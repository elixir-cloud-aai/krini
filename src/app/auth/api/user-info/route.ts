import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
    decodeJwtPayload,
    getEndpoints,
    getSessionProvider,
    getUserSession,
} from "@/lib/oidc";

export async function GET() {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("access_token")?.value;
    const idToken = cookieStore.get("id_token")?.value;

    if (!accessToken) {
        return NextResponse.json({ error: true, user: null }, { status: 401 });
    }

    const idTokenPayload = idToken ? decodeJwtPayload(idToken) : null;
    const provider = getSessionProvider(
        cookieStore.get("oidc_provider")?.value,
        idTokenPayload,
    );
    if (!provider) {
        return NextResponse.json({ error: true, user: null }, { status: 401 });
    }

    const endpoints = await getEndpoints(provider);
    if (!endpoints) {
        return NextResponse.json({ error: true, user: null }, { status: 500 });
    }

    const session = await getUserSession(
        accessToken,
        idTokenPayload,
        endpoints,
        provider,
    );

    if (!session) {
        return NextResponse.json({ error: true, user: null }, { status: 502 });
    }

    return NextResponse.json({
        error: false,
        user: session.user,
        groups: session.groups,
        tier: session.tier,
        access_request_url: process.env.COMPUTE_ACCESS_REQUEST_URL ?? null,
    });
}
