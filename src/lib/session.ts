/** Gets the access token from Krini's same-origin token route. */
export async function getAccessToken(): Promise<string> {
    try {
        const response = await fetch("/auth/api/token", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
        });

        if (!response.ok) {
            return "";
        }

        const data: { access_token?: string } = await response.json();
        return data.access_token || "";
    } catch {
        return "";
    }
}

const RENEWAL_TIMEOUT_MS = 15_000;

let pendingRenewal: Promise<boolean> | null = null;

/**
 * Renews the session through Krini's refresh route. All callers (the
 * refresh timer and the WES provider) share one request at a time, so that
 * a rotating refresh token is used only once. A request that doesn't settle
 * within 15 s counts as failed, so that it can't block later renewals.
 */
export function renewSession(): Promise<boolean> {
    if (pendingRenewal) return pendingRenewal;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RENEWAL_TIMEOUT_MS);

    pendingRenewal = fetch("/auth/api/refresh", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
    })
        .then((response) => response.ok)
        .catch(() => false)
        .finally(() => {
            clearTimeout(timer);
            pendingRenewal = null;
        });

    return pendingRenewal;
}
