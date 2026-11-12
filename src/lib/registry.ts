import axios from "axios";
import { axiosBase } from "@/lib/axios";

const REGISTRY_TIMEOUT_MS = 8000;

type ServiceType = {
    group?: string;
    artifact?: string;
    version?: string;
};

type RegistryEntry = {
    id?: unknown;
    url?: unknown;
    type?: ServiceType;
};

type ServiceVerification = {
    serviceId?: unknown;
    url?: unknown;
    type?: ServiceType;
};

export class RegistryConfigError extends Error {}

export const WES_ARTIFACTS = ["wes", "wes-gateway"] as const;
export const TES_ARTIFACTS = ["tes", "tes-gateway"] as const;

/**
 * Whether a service URL may be offered to users: an absolute `https` URL
 * without user info.
 */
export function isAllowedServiceUrl(value: unknown): value is string {
    if (typeof value !== "string") return false;

    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return false;
    }

    return url.protocol === "https:" && !url.username && !url.password;
}

function sameType(a: ServiceType | undefined, b: ServiceType | undefined) {
    return (
        a !== undefined &&
        b !== undefined &&
        a.group === b.group &&
        a.artifact === b.artifact &&
        a.version === b.version
    );
}

/**
 * Keeps the registry entries that an admin of the registry has verified
 * (`GET /verifications`, with the same identifier, URL and type), that have
 * one of the given `type.artifact` values and an allowed URL.
 *
 * Anyone who can log in to a registry can register a service, so only
 * verified entries receive the user's tasks, workflows and access token.
 */
export function filterVerifiedServices<T>(
    services: unknown,
    verifications: unknown,
    artifacts: readonly string[],
): T[] {
    if (!Array.isArray(services) || !Array.isArray(verifications)) return [];

    const verified = new Map<string, ServiceVerification>();
    for (const verification of verifications as ServiceVerification[]) {
        if (typeof verification?.serviceId === "string") {
            verified.set(verification.serviceId, verification);
        }
    }

    return (services as RegistryEntry[]).filter((service) => {
        if (typeof service?.id !== "string") return false;

        const verification = verified.get(service.id);

        return (
            verification !== undefined &&
            artifacts.includes(service.type?.artifact ?? "") &&
            isAllowedServiceUrl(service.url) &&
            verification.url === service.url &&
            sameType(verification.type, service.type)
        );
    }) as T[];
}

/**
 * Lists the verified services of the configured Cloud Registry
 * (`CLOUD_REGISTRY_URL`) with one of the given `type.artifact` values.
 *
 * Registry reads are public, so no token is sent. A registry without
 * `GET /verifications` yields no services.
 *
 * @throws {RegistryConfigError} If `CLOUD_REGISTRY_URL` isn't set.
 * @throws If `GET /services` fails or doesn't return a list, or if
 *     `GET /verifications` fails other than with `404` or `405`.
 */
export async function fetchVerifiedServices<T>(
    artifacts: readonly string[],
): Promise<T[]> {
    const registryUrl = process.env.CLOUD_REGISTRY_URL;

    if (!registryUrl) {
        throw new RegistryConfigError("Cloud Registry URL is not configured");
    }

    const baseUrl = registryUrl.replace(/\/+$/, "");
    const options = {
        timeout: REGISTRY_TIMEOUT_MS,
        signal: AbortSignal.timeout(REGISTRY_TIMEOUT_MS),
        headers: { Accept: "application/json" },
    };

    const [services, verifications] = await Promise.all([
        axiosBase.get(`${baseUrl}/services`, options),
        axiosBase.get(`${baseUrl}/verifications`, options).catch((err) => {
            const status = axios.isAxiosError(err)
                ? err.response?.status
                : undefined;

            // Other failures (e.g. timeouts, 5xx) may be transient
            if (status !== 404 && status !== 405) throw err;

            console.error(
                `Cloud Registry error: category=verifications_unsupported, status=${status}; no services are offered`,
            );
            return { data: [] };
        }),
    ]);

    if (!Array.isArray(services.data)) {
        throw new Error("Invalid registry response");
    }

    return filterVerifiedServices<T>(
        services.data,
        verifications.data,
        artifacts,
    );
}
