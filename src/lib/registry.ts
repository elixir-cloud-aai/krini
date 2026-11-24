/**
 * The Cloud Registry's list of services, and the service URLs that Krini
 * may send the user's token to
 *
 * `fetchRegistryServices` is the only reader of
 * `<CLOUD_REGISTRY_URL>/services`: one timeout, one `Accept` header, an
 * array check, a size limit and one error mapping (`RegistryError`). The
 * list is cached for a minute, and concurrent misses share one request.
 */
import { axiosBase, deadline } from "@/lib/axios";

const CACHE_TTL = 60_000;
const TIMEOUT = 10_000;
const MAX_BYTES = 5 * 1024 * 1024;

export type RegistryService = {
    id?: unknown;
    url?: unknown;
    type?: { artifact?: unknown } | null;
} & Record<string, unknown>;

export class RegistryError extends Error {}

let cache: { services: RegistryService[]; at: number } | null = null;
let pending: Promise<RegistryService[]> | null = null;

export async function fetchRegistryServices(): Promise<RegistryService[]> {
    if (cache && Date.now() - cache.at < CACHE_TTL) return cache.services;

    pending ??= load().finally(() => {
        pending = null;
    });
    return pending;
}

async function load(): Promise<RegistryService[]> {
    const registryUrl = process.env.CLOUD_REGISTRY_URL;

    if (!registryUrl) {
        throw new RegistryError("Cloud Registry URL is not configured.");
    }

    let data: unknown;
    try {
        ({ data } = await axiosBase.get<unknown>(
            `${registryUrl.replace(/\/+$/, "")}/services`,
            {
                headers: { Accept: "application/json" },
                timeout: TIMEOUT,
                signal: deadline(TIMEOUT),
                maxContentLength: MAX_BYTES,
                maxRedirects: 0,
            },
        ));
    } catch (error) {
        throw new RegistryError("Unable to reach the Cloud Registry.", {
            cause: error,
        });
    }

    if (!Array.isArray(data)) {
        throw new RegistryError("The registry answer isn't a list.");
    }

    cache = { services: data as RegistryService[], at: Date.now() };
    return cache.services;
}

export function allowedServiceUrl(value: unknown): string | null {
    if (typeof value !== "string") return null;

    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return null;
    }

    if (url.protocol !== "https:" || url.username || url.password) {
        return null;
    }

    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}
