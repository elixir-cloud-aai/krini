import { RestWesProvider } from "@elixir-cloud/wes/providers";

type TokenWesProviderOptions = {
    /** Returns the user's access token, or `""` without a session. */
    getToken: () => Promise<string>;
    /** Renews the session; resolves to whether that worked. */
    renew: () => Promise<boolean>;
    /**
     * Called when a `401` can't be resolved: `session-expired` if the
     * session couldn't be renewed, `token-rejected` if the service rejected
     * the renewed token too.
     */
    onUnauthorized?: (reason: UnauthorizedReason) => void;
};

export type UnauthorizedReason = "session-expired" | "token-rejected";

/**
 * WES provider that adds the user's access token to every request. On a
 * `401`, it renews the session once and retries the request once; if that
 * doesn't help, it calls `onUnauthorized` and returns the response.
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

        if (!(await this.options.renew())) {
            this.options.onUnauthorized?.("session-expired");
            return response;
        }

        const retried = await this.send(input, init);

        if (retried.status === 401) {
            this.options.onUnauthorized?.("token-rejected");
        }

        return retried;
    }
}
