import { NextResponse } from "next/server";
import {
    fetchVerifiedServices,
    RegistryConfigError,
    TES_ARTIFACTS,
} from "@/lib/registry";
import type { TESServer } from "@/types/tasks";

export async function GET() {
    try {
        // Only verified services: the selected one gets the user's tasks
        const tesServices =
            await fetchVerifiedServices<TESServer>(TES_ARTIFACTS);

        return NextResponse.json(tesServices);
    } catch (err) {
        if (err instanceof RegistryConfigError) {
            return NextResponse.json(
                { message: "Cloud Registry URL is not configured" },
                { status: 500 },
            );
        }

        return NextResponse.json(
            { message: "Failed to fetch Cloud Registry services" },
            { status: 502 },
        );
    }
}
