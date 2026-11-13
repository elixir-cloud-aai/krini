/**
 * @description helpers for tests of the route handlers: a cookie store in
 * place of `next/headers`, mocked HTTP calls of the shared axios instance,
 * and the settings of a mock deployment
 */
import { AxiosError, AxiosHeaders } from "axios";
import { vi } from "vitest";

type Cookie = { name: string; value: string; [option: string]: unknown };

/** Cookies of the request; what the route sets or deletes changes them */
const jar = new Map<string, Cookie>();

const cookieStore = {
    get: (name: string) => jar.get(name),
    getAll: () => [...jar.values()],
    has: (name: string) => jar.has(name),
    set: (cookie: Cookie) => {
        jar.set(cookie.name, cookie);
    },
    delete: (name: string) => {
        jar.delete(name);
    },
};

const appOrigin = "https://app.example.org";
const loginUrl = "https://login.example.org";
const registryUrl = "https://registry.example.org/ga4gh/registry/v1";

/**
 * Start a test: request cookies, the settings of the mock deployment and
 * fresh modules (the WES list keeps a cache per module instance)
 * @param cookies Cookies of the request, by name (undefined: not set)
 */
function setUp(cookies: Record<string, string | undefined> = {}) {
    vi.resetModules();
    jar.clear();
    for (const [name, value] of Object.entries(cookies))
        if (value !== undefined) jar.set(name, { name, value });
    vi.stubEnv("LS_LOGIN_URL", loginUrl);
    vi.stubEnv("OIDC_CLIENT_ID", "client");
    vi.stubEnv("OIDC_CLIENT_SECRET", "client-secret");
    vi.stubEnv("OIDC_REDIRECT_URI", `${appOrigin}/auth/api/callback`);
    vi.stubEnv("CLOUD_REGISTRY_URL", registryUrl);
    vi.stubEnv("APP_ORIGIN", appOrigin);
    // the default scope, whatever the shell sets
    vi.stubEnv("OIDC_SCOPE", undefined);
}

/**
 * Get the shared axios instance of the current module graph, to mock its
 * calls; import it after `setUp()`, which resets the modules
 * @returns The instance that the routes use
 */
async function http() {
    const { axiosBase } = await import("@/lib/axios");
    return axiosBase;
}

/**
 * Build the error that axios throws for an HTTP error status
 * @param status HTTP status of the response
 * @param data Body of the response
 * @returns The error
 */
function httpError(status: number, data: unknown = null) {
    const config = { headers: new AxiosHeaders() };
    return new AxiosError(
        `Request failed with status code ${status}`,
        undefined,
        config,
        undefined,
        { status, statusText: "", headers: {}, config, data },
    );
}

/**
 * Build the error that axios throws when no response arrives
 * @param code Error code, e.g. `ECONNREFUSED` (undefined: none)
 * @returns The error
 */
function networkError(code?: string) {
    return new AxiosError("Network Error", code);
}

/**
 * Get the `Set-Cookie` options of a cookie in a response
 * @param response Response of the route
 * @param name Name of the cookie
 * @returns The cookie's value and options, or undefined if not set
 */
function cookieOf(response: Response, name: string) {
    const header = response.headers
        .getSetCookie()
        .find((val) => val.startsWith(`${name}=`));
    if (header === undefined) return undefined;
    const [pair, ...attributes] = header.split(/;\s*/);
    return {
        value: decodeURIComponent(pair.slice(name.length + 1)),
        attributes: attributes.map((val) => val.toLowerCase()),
    };
}

export {
    appOrigin,
    cookieOf,
    cookieStore,
    http,
    httpError,
    jar,
    loginUrl,
    networkError,
    registryUrl,
    setUp,
};
