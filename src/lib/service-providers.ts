/**
 * Providers of the Cloud Components that send the user's access token
 *
 * The components call the TES and WES services from the browser. Each
 * request gets the token from the same-origin route `/auth/api/token`
 * (krini#44), so that it is always the current one; without a session, the
 * request goes out without a token.
 */
import { RestTesProvider } from "@elixir-cloud/tes/providers";
import { RestWesProvider } from "@elixir-cloud/wes/providers";

/** Source of the access token: an empty string if there is none */
type TokenSource = () => Promise<string>;

/**
 * Get the access token of the session
 * @returns The token, or an empty string without a session or on errors
 */
async function getAccessToken(): Promise<string> {
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

/**
 * Add the bearer token to the options of a request
 * @param init Options of the request
 * @param getToken Source of the token
 * @returns The options, with an `Authorization` header if there is a token
 */
async function withToken(
    init: RequestInit | undefined,
    getToken: TokenSource,
): Promise<RequestInit> {
    const headers = new Headers(init?.headers);
    const token = await getToken();

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    return { ...init, headers };
}

/** TES provider that sends the user's access token with each request */
class TokenTesProvider extends RestTesProvider {
    private getToken: TokenSource;

    /**
     * @param baseUrl Base URL of the TES API
     * @param getToken Source of the token
     */
    constructor(baseUrl: string, getToken: TokenSource = getAccessToken) {
        super(baseUrl);
        this.getToken = getToken;
    }

    protected async fetch(input: RequestInfo | URL, init?: RequestInit) {
        return super.fetch(input, await withToken(init, this.getToken));
    }
}

/** WES provider that sends the user's access token with each request */
class TokenWesProvider extends RestWesProvider {
    private getToken: TokenSource;

    /**
     * @param baseUrl Base URL of the WES API
     * @param getToken Source of the token
     */
    constructor(baseUrl: string, getToken: TokenSource = getAccessToken) {
        super(baseUrl);
        this.getToken = getToken;
    }

    protected async fetch(input: RequestInfo | URL, init?: RequestInit) {
        return super.fetch(input, await withToken(init, this.getToken));
    }
}

export { getAccessToken, TokenTesProvider, TokenWesProvider };
