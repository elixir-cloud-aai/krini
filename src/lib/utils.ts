export { cn } from "cn";

const LINK_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

/**
 * The href of a value that may be rendered as a link: only `https:`,
 * `http:` and `mailto:` URLs; anything else returns undefined, and the
 * value is shown as text instead
 * @param value URL or address to check
 * @returns The value if it is an allowed link, else undefined
 */
export function linkHref(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    if (
        !trimmed.includes("mailto:") &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
    ) {
        return `mailto:${trimmed}`;
    }

    try {
        const parsed = new URL(trimmed);

        return LINK_PROTOCOLS.has(parsed.protocol) ? trimmed : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Contact link of a WES service: `contactUrl` of WES 1.1 and GA4GH
 * service-info, or `contact_info_url` of WES 1.0
 * @param service Service info of a WES service
 * @returns The contact link, or undefined if the service reports none
 */
export function contactHref(service: {
    contactUrl?: unknown;
    contact_info_url?: unknown;
}): string | undefined {
    for (const value of [service.contactUrl, service.contact_info_url])
        if (typeof value === "string" && value) return value;
    return undefined;
}

export function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeZone: "UTC",
    }).format(date);
}

export const STATE_LABELS: Record<string, string> = {
    INITIALIZING: "Initializing",
    QUEUED: "Queued",
    RUNNING: "Running",
    PAUSED: "Paused",
    CANCELING: "Canceling",
    CANCELED: "Canceled",
    COMPLETE: "Complete",
    EXECUTOR_ERROR: "Executor errors",
    SYSTEM_ERROR: "System errors",
    UNKNOWN: "Unknown",
};
