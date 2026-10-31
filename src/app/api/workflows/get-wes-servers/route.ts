import type { WESServer } from "@/types/workflows";
import axios from "axios";
import { NextResponse } from "next/server";

const TIMEOUT = 5000;

async function isValidWesService(service: WESServer): Promise<boolean> {
    if (
        service?.type?.artifact !== "wes" &&
        service?.type?.artifact !== "wes-gateway"
    ) {
        return false;
    }

    const serviceUrl = service?.url;

    if (typeof serviceUrl !== "string") {
        return false;
    }

    let url: URL;

    try {
        url = new URL(serviceUrl);
    } catch {
        return false;
    }

    if (url.protocol !== "https:") {
        return false;
    }

    try {
        const response = await axios.get(
            `${url.origin}${url.pathname.replace(/\/$/, "")}/service-info`,
            {
                timeout: TIMEOUT,
                maxRedirects: 0,
                validateStatus: (status) =>
                    status >= 200 && status < 300,
            },
        );

        return (
            response.data !== null &&
            typeof response.data === "object" &&
            !Array.isArray(response.data)
        );
    } catch {
        return false;
    }
}

export async function GET() {
    try {
        const registryUrl = process.env.CLOUD_REGISTRY_URL;

        if (!registryUrl) {
            return NextResponse.json(
                { message: "Cloud Registry URL is not configured" },
                { status: 500 },
            );
        }

        const res = await axios.get(
            `${registryUrl.replace(/\/$/, "")}/services`,
            { timeout: TIMEOUT },
        );

        if (!Array.isArray(res.data)) {
            throw new Error("Invalid registry response");
        }

        const wesServices = res.data.filter(
            (service: WESServer) =>
                service?.type?.artifact === "wes" ||
                service?.type?.artifact === "wes-gateway",
        );

        const validationResults = await Promise.all(
            wesServices.map(async (service: WESServer) => ({
                service,
                valid: await isValidWesService(service),
            })),
        );

        const verifiedServices = validationResults
            .filter(({ valid }) => valid)
            .map(({ service }) => service);

        return NextResponse.json(verifiedServices);
    } catch (err) {
        if (axios.isAxiosError(err)) {
            return NextResponse.json(
                { message: "Failed to fetch Cloud Registry services" },
                { status: 502 },
            );
        }

        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 },
        );
    }
}
