import axios from "axios";
import { NextResponse } from "next/server";
import { axiosBase, deadline } from "@/lib/axios";
import {
    allowedServiceUrl,
    fetchRegistryServices,
    type RegistryService,
} from "@/lib/registry";
import type { WESServiceInfo } from "@/types/workflows";

const TIMEOUT = 8000;
const CACHE_TTL = 60000;
const MAX_CONCURRENCY = 8;

const REGISTRY_ERROR = {
    error: "Unable to fetch the service registry.",
} as const;

type WESService = RegistryService & { url: string };

type CachedWESServer = WESService & {
    health: {
        status: "ok" | "unreachable";
        reason?: string;
    };
    serviceInfo: WESServiceInfo | null;
};

let cache: {
    data: CachedWESServer[];
    timestamp: number;
} | null = null;
let pending: Promise<CachedWESServer[]> | null = null;

type ProbeResult =
    | { status: "valid"; serviceInfo: WESServiceInfo }
    | { status: "invalid"; reason: string }
    | { status: "unreachable"; reason: string };

async function probeWesService(service: WESService): Promise<ProbeResult> {
    try {
        const response = await axiosBase.get<unknown>(
            `${service.url}/service-info`,
            {
                timeout: TIMEOUT,
                signal: deadline(TIMEOUT),
                maxRedirects: 0,
                validateStatus: (status) => status >= 200 && status < 300,
            },
        );

        const ok =
            response.data !== null &&
            typeof response.data === "object" &&
            !Array.isArray(response.data);

        return ok
            ? {
                  status: "valid",
                  serviceInfo: response.data as WESServiceInfo,
              }
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
): Promise<ProbeResult[]> {
    const results: ProbeResult[] = new Array(items.length);
    let running = 0;
    let index = 0;

    const processNext = async (): Promise<void> => {
        const i = index++;
        const item = items[i];
        running++;

        try {
            results[i] = await probeFn(item);
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

/** Read the registry and probe its WES services, in registry order */
async function loadServers(): Promise<CachedWESServer[]> {
    const services = await fetchRegistryServices();

    // the components send the user's token to the selected service:
    // only WES services and gateways over an allowed URL
    const wesServices = services
        .filter(
            (service) =>
                service?.type?.artifact === "wes" ||
                service?.type?.artifact === "wes-gateway",
        )
        .map((service) => ({
            ...service,
            url: allowedServiceUrl(service.url),
        }))
        .filter((service): service is WESService => service.url !== null);

    const probes = await probeWithConcurrencyLimit(
        wesServices,
        probeWesService,
        MAX_CONCURRENCY,
    );

    const servers: CachedWESServer[] = [];
    wesServices.forEach((service, i) => {
        const probe = probes[i];
        if (probe.status === "invalid") return;
        servers.push({
            ...service,
            health:
                probe.status === "valid"
                    ? { status: "ok" as const }
                    : {
                          status: "unreachable" as const,
                          reason: probe.reason,
                      },
            serviceInfo: probe.status === "valid" ? probe.serviceInfo : null,
        });
    });
    return servers;
}

export async function GET() {
    const now = Date.now();
    if (cache && now - cache.timestamp < CACHE_TTL) {
        const unreachableCount = cache.data.filter(
            (s) => s.health.status === "unreachable",
        ).length;

        return NextResponse.json(cache.data, {
            headers: {
                "X-Unreachable-Count": String(unreachableCount),
                "X-Cache": "HIT",
            },
        });
    }

    try {
        // concurrent cache misses share one load
        pending ??= loadServers().finally(() => {
            pending = null;
        });
        const servers = await pending;

        const unreachableCount = servers.filter(
            (s) => s.health.status === "unreachable",
        ).length;

        const completionTime = Date.now();
        if (!cache || completionTime > cache.timestamp) {
            cache = { data: servers, timestamp: completionTime };
        }

        return NextResponse.json(servers, {
            headers: {
                "X-Unreachable-Count": String(unreachableCount),
                "X-Cache": "MISS",
            },
        });
    } catch {
        return NextResponse.json(REGISTRY_ERROR, { status: 502 });
    }
}
