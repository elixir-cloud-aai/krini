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

let pendingRenewal: Promise<boolean> | null = null;

/**
 * Renews the session through Krini's refresh route. All callers (the
 * refresh timer and the WES provider) share one request at a time, so that
 * a rotating refresh token is used only once.
 */
export function renewSession(): Promise<boolean> {
    pendingRenewal ??= fetch("/auth/api/refresh", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
    })
        .then((response) => response.ok)
        .catch(() => false)
        .finally(() => {
            pendingRenewal = null;
        });

    return pendingRenewal;
}
