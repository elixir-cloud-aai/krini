import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issuer, mockOidcProvider, signIdToken } from "@/test/oidc";
import {
    appOrigin,
    cookieOf,
    cookieStore,
    http,
    httpError,
    networkError,
    setUp,
} from "@/test/routes";

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const now = new Date("2026-11-12T12:00:00Z").getTime();

const idToken = () =>
    signIdToken({
        iss: issuer,
        aud: "client",
        exp: Math.floor(now / 1000) + 3600,
        nonce: "n1",
        sub: "u1",
    });

const tokens = () => ({
    access_token: "access",
    id_token: idToken(),
    refresh_token: "refresh",
    expires_in: 3600,
});

/** Pending login transaction stored by /auth/api/login-redirect */
const transaction = JSON.stringify({
    state: "s1",
    nonce: "n1",
    codeVerifier: "verifier",
    providerId: "test",
});

beforeEach(() => {
    vi.useFakeTimers({ now, toFake: ["Date"] });
});

afterEach(() => {
    vi.useRealTimers();
});

/**
 * Run the callback with a pending login of state `s1`
 * @param query Query of the callback URL
 * @param reply Result of the token request: data, or an error to throw
 * @param origin Origin of the request URL that the server sees
 * @param setting `APP_ORIGIN` (null: not set)
 */
async function callback(
    query: string,
    reply: unknown = tokens(),
    origin = appOrigin,
    setting: string | null = appOrigin,
) {
    setUp({ "authState-s1": transaction, logout_marker: "1" });
    mockOidcProvider();
    vi.stubEnv("APP_ORIGIN", setting ?? undefined);
    const post = vi.spyOn(await http(), "post");
    if (reply instanceof Error) post.mockRejectedValue(reply);
    else post.mockResolvedValue({ status: 200, data: reply });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const response = await GET(
        new NextRequest(`${origin}/auth/api/callback${query}`),
    );
    return { response, post, error };
}

/** Origin of requests as the standalone server of the image sees them: its
 * listening address, not the origin of the browser */
const listening = "http://0.0.0.0:3000";

const locationOf = (response: Response) =>
    response.headers.get("location") as string;

describe("GET /auth/api/callback", () => {
    it("exchanges the code with PKCE and starts the session", async () => {
        const { response, post } = await callback("?code=c1&state=s1");
        expect(response.status).toBe(307);
        expect(locationOf(response)).toBe(`${appOrigin}/dashboard`);

        const [endpoint, body, options] = post.mock.calls[0];
        expect(endpoint).toBe(`${issuer}/token`);
        expect(Object.fromEntries(body as URLSearchParams)).toEqual({
            grant_type: "authorization_code",
            code: "c1",
            redirect_uri: `${appOrigin}/auth/api/callback`,
            client_id: "client",
            client_secret: "client-secret",
            code_verifier: "verifier",
        });
        // other statuses are failures, e.g. errors with a JSON body
        expect(options?.validateStatus?.(200)).toBe(true);
        expect(options?.validateStatus?.(400)).toBe(false);

        // the pending login and an earlier logout are expired on the response
        for (const name of ["authState-s1", "logout_marker"])
            expect(cookieOf(response, name)?.value).toBe("");

        // tokens are for the server only
        for (const name of ["access_token", "id_token", "refresh_token"])
            expect(cookieOf(response, name)?.attributes).toEqual(
                expect.arrayContaining(["httponly", "samesite=lax", "path=/"]),
            );
        expect(cookieOf(response, "access_token")).toMatchObject({
            value: "access",
            attributes: expect.arrayContaining(["max-age=3600"]),
        });
        expect(cookieOf(response, "refresh_token")?.value).toBe("refresh");
        // the expiry is for the browser's refresh timer, 5 min early
        const expiry = cookieOf(response, "token_expires_at");
        expect(expiry?.value).toBe(String(now + 55 * 60 * 1000));
        expect(expiry?.attributes).not.toContain("httponly");
    });

    it.each([
        ["after a login", "?code=c1&state=s1", tokens(), "/dashboard"],
        ["without parameters", "?code=c1", tokens(), "/auth/error?type=params"],
        [
            "for another state",
            "?code=c1&state=s2",
            tokens(),
            "/auth/error?type=state",
        ],
        [
            "for an invalid token response",
            "?code=c1&state=s1",
            {},
            "/auth/error?type=internal",
        ],
        [
            "when the provider fails",
            "?code=c1&state=s1",
            httpError(500),
            "/auth/error?type=internal",
        ],
    ])("redirects to APP_ORIGIN %s", async (_, query, reply, path) => {
        const { response } = await callback(query, reply, listening);
        expect(locationOf(response)).toBe(`${appOrigin}${path}`);
    });

    it.each([
        ["without APP_ORIGIN", null],
        ["with an APP_ORIGIN that isn't a URL", "app.example.org"],
    ])("redirects to the request's origin %s", async (_, setting) => {
        setUp({ "authState-s1": transaction, logout_marker: "1" });
        mockOidcProvider();
        vi.stubEnv("APP_ORIGIN", setting ?? undefined);
        // the token exchange still needs a redirect URI
        vi.stubEnv("OIDC_REDIRECT_URI", `${appOrigin}/auth/api/callback`);
        const post = vi.spyOn(await http(), "post");
        post.mockResolvedValue({ status: 200, data: tokens() });
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const { GET } = await import("./route");
        const response = await GET(
            new NextRequest(`${listening}/auth/api/callback?code=c1&state=s1`),
        );
        expect(locationOf(response)).toBe(`${listening}/dashboard`);
        expect(error.mock.calls.length).toBe(setting ? 1 : 0);
        if (setting)
            expect(error.mock.calls[0][0]).toMatch(/APP_ORIGIN isn't a URL/);
    });

    it("rejects a callback with a provider error", async () => {
        const { response, post, error } = await callback(
            "?error=access_denied&error_description=secret-details&state=s1",
        );
        expect(locationOf(response)).toBe(
            `${appOrigin}/auth/error?type=params`,
        );
        expect(post).not.toHaveBeenCalled();
        // the description (which can echo parameters) is not logged
        expect(error.mock.calls[0][0]).toContain("access_denied");
        expect(error.mock.calls[0][0]).not.toContain("secret-details");
    });

    it("strips control characters from the logged provider error", async () => {
        const { error } = await callback(
            "?error=bad%0AINFO:%20forged%20entry&state=s1",
        );
        const logged = error.mock.calls[0][0] as string;
        expect(logged).not.toContain("\n");
        expect(logged).toContain("provider_error=badINFO: forged entry");
    });

    it("sets secure cookies in production", async () => {
        vi.stubEnv("NODE_ENV", "production");
        // `setUp()` in `callback()` keeps NODE_ENV
        const { response } = await callback("?code=c1&state=s1");
        expect(cookieOf(response, "access_token")?.attributes).toContain(
            "secure",
        );
    });

    it("honours refresh_expires_in for the refresh cookie", async () => {
        const { response } = await callback("?code=c1&state=s1", {
            ...tokens(),
            refresh_expires_in: 7200,
        });
        expect(cookieOf(response, "refresh_token")?.attributes).toContain(
            "max-age=7200",
        );
    });

    it("assumes an hour without a valid expiry", async () => {
        const { response } = await callback("?code=c1&state=s1", {
            ...tokens(),
            expires_in: "3600",
        });
        expect(cookieOf(response, "access_token")?.attributes).toContain(
            "max-age=3600",
        );
        expect(cookieOf(response, "token_expires_at")?.value).toBe(
            String(now + 55 * 60 * 1000),
        );
    });

    it("clears a stale refresh token when the response omits one", async () => {
        const { refresh_token: _, ...rest } = tokens();
        const { response } = await callback("?code=c1&state=s1", rest);
        expect(locationOf(response)).toBe(`${appOrigin}/dashboard`);
        expect(cookieOf(response, "refresh_token")?.value).toBe("");
    });

    it.each([
        ["no code", "?state=s1"],
        ["no state", "?code=c1"],
    ])("rejects a callback with %s", async (_, query) => {
        const { response, post } = await callback(query);
        expect(locationOf(response)).toBe(
            `${appOrigin}/auth/error?type=params`,
        );
        expect(post).not.toHaveBeenCalled();
    });

    it("rejects a state without a pending login", async () => {
        const { response, post } = await callback("?code=c1&state=s2");
        expect(locationOf(response)).toBe(`${appOrigin}/auth/error?type=state`);
        expect(post).not.toHaveBeenCalled();
    });

    it("rejects a pending login that isn't a transaction", async () => {
        setUp({ "authState-s1": "s1" });
        mockOidcProvider();
        const post = vi.spyOn(await http(), "post");
        const { GET } = await import("./route");
        const response = await GET(
            new NextRequest(`${appOrigin}/auth/api/callback?code=c1&state=s1`),
        );
        expect(locationOf(response)).toBe(`${appOrigin}/auth/error?type=state`);
        expect(post).not.toHaveBeenCalled();
    });

    it("rejects a transaction for another state", async () => {
        setUp({
            "authState-s1": JSON.stringify({
                state: "other",
                nonce: "n1",
                codeVerifier: "v",
                providerId: "test",
            }),
        });
        mockOidcProvider();
        const post = vi.spyOn(await http(), "post");
        const { GET } = await import("./route");
        const response = await GET(
            new NextRequest(`${appOrigin}/auth/api/callback?code=c1&state=s1`),
        );
        expect(locationOf(response)).toBe(`${appOrigin}/auth/error?type=state`);
        expect(post).not.toHaveBeenCalled();
    });

    it("rejects a transaction for an unknown provider", async () => {
        setUp({
            "authState-s1": JSON.stringify({
                state: "s1",
                nonce: "n1",
                codeVerifier: "v",
                providerId: "missing",
            }),
        });
        mockOidcProvider();
        const post = vi.spyOn(await http(), "post");
        const { GET } = await import("./route");
        const response = await GET(
            new NextRequest(`${appOrigin}/auth/api/callback?code=c1&state=s1`),
        );
        expect(locationOf(response)).toBe(`${appOrigin}/auth/error?type=state`);
        expect(post).not.toHaveBeenCalled();
    });

    it.each([
        ["no access token", { id_token: "id" }],
        ["no ID token", { access_token: "access" }],
    ])("rejects a token response with %s", async (_, reply) => {
        const { response, error } = await callback("?code=c1&state=s1", reply);
        expect(locationOf(response)).toBe(
            `${appOrigin}/auth/error?type=internal`,
        );
        // the consumed transaction and logout marker are expired
        expect(cookieOf(response, "authState-s1")?.value).toBe("");
        expect(cookieOf(response, "logout_marker")?.value).toBe("");
        expect(error.mock.calls[0][0]).toMatch(/category=invalid_response/);
    });

    it("rejects an ID token that fails validation", async () => {
        const { response, error } = await callback("?code=c1&state=s1", {
            access_token: "access",
            id_token: "not-a-jwt",
        });
        expect(locationOf(response)).toBe(
            `${appOrigin}/auth/error?type=internal`,
        );
        expect(error.mock.calls[0][0]).toMatch(
            /category=id_token_validation_failed/,
        );
    });

    it("fails when no redirect URI can be determined", async () => {
        setUp({ "authState-s1": transaction });
        mockOidcProvider();
        vi.stubEnv("APP_ORIGIN", "");
        vi.stubEnv("OIDC_REDIRECT_URI", "");
        const { GET } = await import("./route");
        const response = await GET(
            new NextRequest(`${appOrigin}/auth/api/callback?code=c1&state=s1`),
        );
        expect(locationOf(response)).toBe(
            `${appOrigin}/auth/error?type=internal`,
        );
    });

    it("rejects when no login providers are configured", async () => {
        setUp({ "authState-s1": transaction });
        mockOidcProvider();
        vi.stubEnv("LOGIN_PROVIDERS", "[]");
        const { GET } = await import("./route");
        const response = await GET(
            new NextRequest(`${appOrigin}/auth/api/callback?code=c1&state=s1`),
        );
        expect(locationOf(response)).toBe(`${appOrigin}/auth/error?type=state`);
    });

    it("rejects when the provider cannot be discovered", async () => {
        setUp({ "authState-s1": transaction });
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("err", { status: 500 })),
        );
        const { GET } = await import("./route");
        const response = await GET(
            new NextRequest(`${appOrigin}/auth/api/callback?code=c1&state=s1`),
        );
        expect(locationOf(response)).toBe(
            `${appOrigin}/auth/error?type=internal`,
        );
    });

    it.each([
        [
            "an error status",
            httpError(400, { error: "invalid_grant" }),
            "upstream_400",
        ],
        [
            "a network error",
            networkError("ECONNREFUSED"),
            "network_ECONNREFUSED",
        ],
        ["an axios error without details", networkError(), "unknown"],
        ["another error", new Error("boom"), "unexpected"],
    ])("fails on %s of the provider", async (_, reply, category) => {
        const { response, error } = await callback("?code=c1&state=s1", reply);
        expect(locationOf(response)).toBe(
            `${appOrigin}/auth/error?type=internal`,
        );
        expect(error.mock.calls[0][0]).toContain(`category=${category}`);
        // the log has no tokens, codes or secrets
        expect(error.mock.calls[0][0]).not.toMatch(/c1|client-secret/);
    });

    it("logs the provider's error field on failure", async () => {
        const { error } = await callback(
            "?code=c1&state=s1",
            httpError(400, { error: "invalid_grant" }),
        );
        expect(error.mock.calls[0][0]).toContain(
            "provider_error=invalid_grant",
        );
    });
});
