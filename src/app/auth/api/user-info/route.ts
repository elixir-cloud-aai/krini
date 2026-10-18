import axios from "axios";
import { getCookie } from "cookies-next/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    const accessToken = await getCookie("access_token", { cookies });

    try {
        const res = await axios.get(`${process.env.LS_LOGIN_URL}/oidc/userinfo`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/json",
            },
        });

        if (!res.data || typeof res.data !== "object") {
            throw new Error("Invalid JSON response");
        }

        return NextResponse.json({ error: false, user: res.data });
    } catch {
        return NextResponse.json({ error: true, user: null }, { status: 401 });
    }
}
