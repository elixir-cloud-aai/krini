import axios from "axios";
import { getCookie } from "cookies-next/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { axiosBase } from "@/lib/axios";

export async function GET() {
    const accessToken = await getCookie("access_token", { cookies });

    if (accessToken === undefined)
        return NextResponse.json({ error: true, user: null }, { status: 401 });

    try {
        const res = await axiosBase.get(
            `${process.env.LS_LOGIN_URL}/oidc/userinfo`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/json",
                },
            },
        );

        if (!res.data || typeof res.data !== "object") {
            throw new Error("Invalid JSON response");
        }

        return NextResponse.json({ error: false, user: res.data });
    } catch (err) {
        if (axios.isAxiosError(err)) {
            return NextResponse.json(
                { error: true, user: null },
                { status: 502 },
            );
        }

        return NextResponse.json({ error: true, user: null }, { status: 500 });
    }
}
