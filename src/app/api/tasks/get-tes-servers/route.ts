import axios from "axios";
import { NextResponse } from "next/server";
import { axiosBase } from "@/lib/axios";

export async function GET() {
    try {
        const registryUrl = process.env.CLOUD_REGISTRY_URL;

        if (!registryUrl) {
            throw new Error("Cloud Registry URL is not configured.");
        }

        const res = await axiosBase.get(
            `${registryUrl.replace(/\/+$/, "")}/services`,
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
