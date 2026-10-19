import axios from "axios";
import { getCookie } from "cookies-next/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    const accessToken = await getCookie("access_token", { cookies });

    try {
        const res = await axios.get(
            `${process.env.CLOUD_REGISTRY_URL}/services`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "*/*",
                },
            },
        );
        if (!res.data || typeof res.data !== "object") {
            throw new Error("Invalid JSON response");
        }

        return NextResponse.json(res.data);
    } catch (err) {
        if (axios.isAxiosError(err)) {
            return NextResponse.json(err.response?.data ?? null, {
                status: err.response?.status ?? 500,
            });
        }

        return NextResponse.json(
            { message: "Internal server error" },
            {
                status: 500,
            },
        );
    }
}
