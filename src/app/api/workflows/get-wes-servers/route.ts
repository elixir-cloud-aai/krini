import axios from "axios";
import { NextResponse } from "next/server";
import { axiosBase } from "@/lib/axios";
import type { WESServer } from "@/types/workflows";

const TIMEOUT = 8000;
const CACHE_TTL = 60000;
const MAX_CONCURRENCY = 8;

let cache: {
    data: any;
    timestamp: number;
} | null = null;

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


async function probeWithConcurrencyLimit<T>(
    items: T[],
    probeFn: (item: T) => Promise<ProbeResult>,
    limit: number,
): Promise<Array<{ item: T; probe: ProbeResult }>> {
    const results: Array<{ item: T; probe: ProbeResult }> = [];
    let running = 0;
    let index = 0;

    const processNext = async (): Promise<void> => {
        if (index >= items.length) return;

        const item = items[index++];
        running++;

        try {
            const probe = await probeFn(item);
            results.push({ item, probe });
        } finally {
            running--;
            if (running < limit && index < items.length) {
                await processNext();
            }
        }
    };

    const workers = [];
    const initialCount = Math.min(limit, items.length);
    for (let i = 0; i < initialCount; i++) {
        workers.push(processNext());
    }

    await Promise.all(workers);
    return results;
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

        const now = Date.now();
        if (cache && now - cache.timestamp < CACHE_TTL) {
            const unreachableCount = cache.data.filter(
                (s: any) => s.health.status === "unreachable",
            ).length;

            return NextResponse.json(cache.data, {
                headers: {
                    "X-Unreachable-Count": String(unreachableCount),
                    "X-Cache": "HIT",
                },
            });
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

        const results = await probeWithConcurrencyLimit(
            wesServices,
            probeWesService,
            MAX_CONCURRENCY,
        );

        const servers = results
            .filter(({ probe }) => probe.status !== "invalid")
            .map(({ item: service, probe }) => ({
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

        cache = { data: servers, timestamp: now };

        return NextResponse.json(servers, {
            headers: {
                "X-Unreachable-Count": String(unreachableCount),
                "X-Cache": "MISS",
            },
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
