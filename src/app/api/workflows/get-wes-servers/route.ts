import axios from "axios";
import { NextResponse } from "next/server";
import { axiosBase } from "@/lib/axios";
import type { WESServer } from "@/types/workflows";

const TIMEOUT = 5000;

type ProbeResult =
    | { status: "valid" }
    | { status: "invalid"; reason: string }
    | { status: "unreachable"; reason: string };

async function probeWesService(service: WESServer): Promise<ProbeResult> {
    const serviceUrl = service?.url;

    if (typeof serviceUrl !== "string") {
        return { status: "invalid", reason: "missing url" };
    }

    let url: URL;
    try {
        url = new URL(serviceUrl);
    } catch {
        return { status: "invalid", reason: "malformed url" };
    }

    if (url.protocol !== "https:") {
        return { status: "invalid", reason: "url is not https" };
    }

    try {
        const response = await axiosBase.get(
            `${url.origin}${url.pathname.replace(/\/$/, "")}/service-info`,
            {
                timeout: TIMEOUT,
                signal: AbortSignal.timeout(TIMEOUT),
                maxRedirects: 0,
                validateStatus: (status) => status >= 200 && status < 300,
            },
        );

        const ok =
            response.data !== null &&
            typeof response.data === "object" &&
            !Array.isArray(response.data);

        return ok
            ? { status: "valid" }
            : {
                  status: "invalid",
                  reason: "service-info is not a JSON object",
              };
    } catch (err) {
        if (axios.isAxiosError(err) && err.response) {
            const code = err.response.status;
            const transient = code >= 500 || code === 408 || code === 429;
            return transient
                ? { status: "unreachable", reason: `upstream returned ${code}` }
                : { status: "invalid", reason: `upstream returned ${code}` };
        }

        return { status: "unreachable", reason: "no response from server" };
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

        const res = await axiosBase.get(
            `${registryUrl.replace(/\/$/, "")}/services`,
            { timeout: TIMEOUT, signal: AbortSignal.timeout(TIMEOUT) },
        );

        if (!Array.isArray(res.data)) {
            throw new Error("Invalid registry response");
        }

        const wesServices: WESServer[] = res.data.filter(
            (service: WESServer) =>
                service?.type?.artifact === "wes" ||
                service?.type?.artifact === "wes-gateway",
        );

        const results = await Promise.all(
            wesServices.map(async (service) => ({
                service,
                probe: await probeWesService(service),
            })),
        );

        const servers = results
            .filter(({ probe }) => probe.status !== "invalid")
            .map(({ service, probe }) => ({
                ...service,
                health:
                    probe.status === "valid"
                        ? { status: "ok" as const }
                        : {
                              status: "unreachable" as const,
                              reason: probe.reason,
                          },
            }));

        const unreachableCount = servers.filter(
            (s) => s.health.status === "unreachable",
        ).length;

        return NextResponse.json(servers, {
            headers: { "X-Unreachable-Count": String(unreachableCount) },
        });
    } catch (err) {
        if (axios.isAxiosError(err) || axios.isCancel(err)) {
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
