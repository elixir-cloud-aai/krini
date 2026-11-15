import axios from "axios";
import { NextResponse } from "next/server";
import { axiosBase } from "@/lib/axios";

/**
 * Whether a service URL is a valid `https` URL
 * @param url URL of a registry entry
 */
function isHttps(url: unknown): boolean {
    return typeof url === "string" && URL.parse(url)?.protocol === "https:";
}

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

        // the components send the user's token to the selected service:
        // only TES services and gateways over https
        const tesServices = res.data.filter(
            (service) =>
                (service?.type?.artifact === "tes" ||
                    service?.type?.artifact === "tes-gateway") &&
                isHttps(service.url),
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
