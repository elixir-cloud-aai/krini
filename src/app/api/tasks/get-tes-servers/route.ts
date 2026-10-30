import axios from "axios";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const res = await axios.get(
            `${process.env.CLOUD_REGISTRY_URL}/services`,
        );
        if (
            !res.data ||
            typeof res.data !== "object" ||
            !Array.isArray(res.data)
        ) {
            throw new Error("Invalid JSON response");
        }

        const tesServices = res.data.filter(
            (service) =>
                service?.type?.artifact === "tes" ||
                service?.type?.artifact === "tes-gateway",
        );

        return NextResponse.json(tesServices);
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
