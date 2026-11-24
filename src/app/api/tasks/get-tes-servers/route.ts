import { NextResponse } from "next/server";
import { allowedServiceUrl, fetchRegistryServices } from "@/lib/registry";

const REGISTRY_ERROR = {
    error: "Unable to fetch the service registry.",
} as const;

export async function GET() {
    try {
        const services = await fetchRegistryServices();

        const tesServices = services
            .filter(
                (service) =>
                    service?.type?.artifact === "tes" ||
                    service?.type?.artifact === "tes-gateway",
            )
            .map((service) => ({
                ...service,
                url: allowedServiceUrl(service.url),
            }))
            .filter((service) => service.url !== null);

        return NextResponse.json(tesServices);
    } catch {
        return NextResponse.json(REGISTRY_ERROR, { status: 502 });
    }
}
