import axios from "axios";
import { type NextRequest, NextResponse } from "next/server";
import { axiosBase } from "@/lib/axios";
import {
    fetchVerifiedServices,
    RegistryConfigError,
    WES_ARTIFACTS,
} from "@/lib/registry";
import type { WESServer, WESServiceInfo } from "@/types/workflows";

export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
        return NextResponse.json(
            { error: "Server ID is required." },
            { status: 400 },
        );
    }

    try {
        const servers = await fetchVerifiedServices<WESServer>(WES_ARTIFACTS);

        const server = servers.find((item) => item.id === id);

        if (!server) {
            return NextResponse.json(
                { error: "WES server not found." },
                { status: 404 },
            );
        }

        let parsedUrl: URL;

        try {
            parsedUrl = new URL(server.url);
        } catch {
            return NextResponse.json(
                { error: "Invalid WES service endpoint." },
                { status: 400 },
            );
        }

        const isValidPath = /^\/(?:.*\/)?ga4gh\/wes\/v1\/?$/.test(
            parsedUrl.pathname,
        );

        if (
            parsedUrl.protocol !== "https:" ||
            parsedUrl.username ||
            parsedUrl.password ||
            parsedUrl.port ||
            !isValidPath
        ) {
            return NextResponse.json(
                { error: "Invalid WES service endpoint." },
                { status: 400 },
            );
        }
        parsedUrl.pathname = `${parsedUrl.pathname.replace(/\/$/, "")}/service-info`;

        const { data: serviceInfo } = await axiosBase.get<WESServiceInfo>(
            parsedUrl.toString(),
            {
                maxRedirects: 0,
                headers: {
                    Accept: "application/json",
                },
            },
        );

        return NextResponse.json(
            { ...serviceInfo, url: parsedUrl.toString() },
            {
                headers: {
                    "Cache-Control": "no-store",
                },
            },
        );
    } catch (error) {
        if (error instanceof RegistryConfigError) {
            return NextResponse.json(
                { error: "Cloud Registry URL is not configured." },
                { status: 500 },
            );
        }

        if (axios.isAxiosError(error)) {
            if (error.response) {
                return NextResponse.json(
                    {
                        error: `Failed to fetch service information (${error.response.status}).`,
                    },
                    { status: 502 },
                );
            }

            return NextResponse.json(
                { error: "Unable to reach the registry or WES service." },
                { status: 502 },
            );
        }

        return NextResponse.json(
            { error: "Unable to fetch service information." },
            { status: 502 },
        );
    }
}
