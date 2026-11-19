/**
 * Service info of a WES service of the registry
 *
 * Called by the page `/dashboard/workflows/service-info`, so that Krini's
 * server doesn't have to reach its own public origin.
 */
import axios from "axios";
import { axiosBase } from "@/lib/axios";
import type { WESServer, WESServiceInfo } from "@/types/workflows";

export type WesServiceInfoResult =
    | { ok: true; serviceInfo: WESServiceInfo }
    | { ok: false; status: number; error: string };

const failure = (status: number, error: string): WesServiceInfoResult => ({
    ok: false,
    status,
    error,
});

/**
 * Get the service info of a WES service of the registry
 * @param id Registry ID of the service
 * @returns The service info with the URL of its `service-info` endpoint,
 * or the error to report
 */
export async function getWesServiceInfo(
    id: string,
): Promise<WesServiceInfoResult> {
    try {
        const registryUrl = process.env.CLOUD_REGISTRY_URL;

        if (!registryUrl) {
            throw new Error("Cloud Registry URL is not configured.");
        }

        const { data: servers } = await axiosBase.get<WESServer[]>(
            `${registryUrl.replace(/\/+$/, "")}/services`,
            {
                headers: {
                    Accept: "application/json",
                },
            },
        );

        const server = servers.find((item) => item.id === id);

        if (!server) {
            return failure(404, "WES server not found.");
        }

        let parsedUrl: URL;

        try {
            parsedUrl = new URL(server.url);
        } catch {
            return failure(400, "Invalid WES service endpoint.");
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
            return failure(400, "Invalid WES service endpoint.");
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

        return {
            ok: true,
            serviceInfo: { ...serviceInfo, url: parsedUrl.toString() },
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                return failure(
                    502,
                    `Failed to fetch service information (${error.response.status}).`,
                );
            }

            return failure(502, "Unable to reach the registry or WES service.");
        }

        return failure(502, "Unable to fetch service information.");
    }
}
