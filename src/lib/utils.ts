export { cn } from "cn";

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
