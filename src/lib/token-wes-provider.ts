import { RestWesProvider } from "@elixir-cloud/wes/providers";

type TokenWesProviderOptions = {
    /** Returns the user's access token, or `""` without a session. */
    getToken: () => Promise<string>;
    /** Renews the session; resolves to whether that worked. */
    renew: () => Promise<boolean>;
    /** Called when a request is still rejected with `401` after renewing. */
    onUnauthorized?: () => void;
};

/**
 * WES provider that adds the user's access token to every request. On a
 * `401`, it renews the session once and retries the request once; if that
 * fails too, it calls `onUnauthorized` and returns the response.
 */
export class TokenWesProvider extends RestWesProvider {
    private readonly options: TokenWesProviderOptions;

    constructor(baseUrl: string, options: TokenWesProviderOptions) {
        super(baseUrl);
        this.options = options;
    }

    private async send(input: RequestInfo | URL, init: RequestInit) {
        const headers = new Headers(init.headers);
        const token = await this.options.getToken();

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        return super.fetch(input, { ...init, headers });
    }

    protected async fetch(input: RequestInfo | URL, init: RequestInit = {}) {
        const response = await this.send(input, init);

        if (response.status !== 401) {
            return response;
        }

        const retried = (await this.options.renew())
            ? await this.send(input, init)
            : response;

        if (retried.status === 401) {
            this.options.onUnauthorized?.();
        }

        return retried;
    }
}

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
 * Renews the session through Krini's refresh route. Concurrent calls share
 * one request, so that a rotating refresh token is used only once.
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
