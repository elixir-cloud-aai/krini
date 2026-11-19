import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issuer, mockOidcProvider, signIdToken } from "@/test/oidc";
import {
    appOrigin,
    cookieOf,
    cookieStore,
    http,
    httpError,
    jar,
    networkError,
    setUp,
} from "@/test/routes";

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const now = new Date("2026-11-12T12:00:00Z").getTime();
const thirtyDays = 30 * 24 * 60 * 60;

const idToken = (claims: Record<string, unknown> = {}) =>
    signIdToken({
        iss: issuer,
        aud: "client",
        exp: Math.floor(now / 1000) + 3600,
        sub: "u1",
        ...claims,
    });

const tokens = () => ({
    access_token: "access-2",
    id_token: idToken(),
    refresh_token: "refresh-2",
    expires_in: 600,
});

beforeEach(() => {
    vi.useFakeTimers({ now, toFake: ["Date"] });
});

afterEach(() => {
    vi.useRealTimers();
});

/**
 * Build a refresh request from Krini's own pages
 * @param origin The request's `Origin` (null: none)
 * @returns The request
 */
function request(origin: string | null = appOrigin) {
    return new NextRequest(`${appOrigin}/auth/api/refresh`, {
        method: "POST",
        headers: origin === null ? {} : { origin },
    });
}

/**
 * Run the refresh with the given session cookies
 * @param cookies Cookies of the request
 * @param reply Result of the token request: data, or an error to throw
 */
async function refresh(
    cookies: Record<string, string | undefined> = {
        refresh_token: "rt-SECRET-1",
    },
    reply: unknown = tokens(),
) {
    setUp(cookies);
    mockOidcProvider();
    const post = vi.spyOn(await http(), "post");
    if (reply instanceof Error) post.mockRejectedValue(reply);
    else post.mockResolvedValue({ status: 200, data: reply });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("./route");
    const response = await POST(request());
    return { response, post, error };
}

const sessionCookies = [
    "access_token",
    "id_token",
    "refresh_token",
    "token_expires_at",
    "oidc_provider",
];

/** Expect a response that ends the session, and its cookies */
async function expectSessionEnded(response: Response, error: string) {
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error, code: "session_ended" });
    for (const name of sessionCookies)
        expect(cookieOf(response, name)?.value).toBe("");
    // the logout marker stays
    expect(cookieOf(response, "logout_marker")).toBeUndefined();
}

describe("POST /auth/api/refresh", () => {
    it("renews the tokens with the refresh token", async () => {
        const { response, post } = await refresh();
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true });

        const [endpoint, body, options] = post.mock.calls[0];
        expect(endpoint).toBe(`${issuer}/token`);
        expect(Object.fromEntries(body as URLSearchParams)).toEqual({
            grant_type: "refresh_token",
            refresh_token: "rt-SECRET-1",
            client_id: "client",
            client_secret: "client-secret",
        });
        expect(options?.validateStatus?.(200)).toBe(true);
        expect(options?.validateStatus?.(401)).toBe(false);

        expect(cookieOf(response, "access_token")).toMatchObject({
            value: "access-2",
            attributes: expect.arrayContaining(["httponly", "max-age=600"]),
        });
        // rotated refresh tokens replace the old one
        expect(cookieOf(response, "refresh_token")).toMatchObject({
            value: "refresh-2",
            attributes: expect.arrayContaining([`max-age=${thirtyDays}`]),
        });
        // the ID token and the expiry live as long as the session
        expect(cookieOf(response, "id_token")?.attributes).toContain(
            `max-age=${thirtyDays}`,
        );
        const expiry = cookieOf(response, "token_expires_at");
        // the access token's real expiry, without a margin
        expect(expiry?.value).toBe(`${now + 600 * 1000}:${600 * 1000}`);
        expect(expiry?.attributes).toContain(`max-age=${thirtyDays}`);
        expect(expiry?.attributes).not.toContain("httponly");
    });

    it.each([
        ["no Origin", null],
        ["another Origin", "https://evil.example"],
    ])("rejects a request with %s", async (_, origin) => {
        setUp({ refresh_token: "rt-SECRET-1" });
        mockOidcProvider();
        const post = vi.spyOn(await http(), "post");
        const { POST } = await import("./route");
        const response = await POST(request(origin));
        expect(response.status).toBe(403);
        expect(response.headers.getSetCookie()).toEqual([]);
        expect(post).not.toHaveBeenCalled();
    });

    it("fails without APP_ORIGIN", async () => {
        setUp({ refresh_token: "rt-SECRET-1" });
        vi.stubEnv("APP_ORIGIN", undefined);
        const { POST } = await import("./route");
        const response = await POST(request());
        expect(response.status).toBe(500);
    });

    it("does not end the session when a concurrent refresh already succeeded", async () => {
        setUp({ refresh_token: "rt-SECRET-1" });
        mockOidcProvider();
        const post = vi.spyOn(await http(), "post");
        post.mockResolvedValueOnce({ status: 200, data: tokens() });
        post.mockRejectedValueOnce(httpError(400, { error: "invalid_grant" }));
        vi.spyOn(console, "error").mockImplementation(() => {});
        const { POST } = await import("./route");

        // two tabs refresh the same session; the provider rotates the
        // refresh token, so the second request is a replay rejection
        expect((await POST(request())).status).toBe(200);
        const replay = await POST(request());
        expect(replay.status).toBe(409);
        expect(await replay.json()).toMatchObject({
            code: "concurrent_refresh",
        });
        // the losing response must not undo the winner's session cookies
        expect(replay.headers.getSetCookie()).toEqual([]);
    });

    it("still ends the session once the success record expires", async () => {
        setUp({ refresh_token: "rt-SECRET-1" });
        mockOidcProvider();
        const post = vi.spyOn(await http(), "post");
        post.mockResolvedValueOnce({ status: 200, data: tokens() });
        vi.spyOn(console, "error").mockImplementation(() => {});
        const { POST } = await import("./route");
        await POST(request());

        vi.setSystemTime(now + 61 * 1000);
        post.mockRejectedValueOnce(httpError(400, { error: "invalid_grant" }));
        await expectSessionEnded(
            await POST(request()),
            "Failed to refresh token",
        );
    });

    it("keeps recent successes while sweeping expired ones", async () => {
        setUp({ refresh_token: "rt-1" });
        mockOidcProvider();
        const post = vi.spyOn(await http(), "post");
        post.mockResolvedValue({ status: 200, data: tokens() });
        const { POST } = await import("./route");
        expect((await POST(request())).status).toBe(200);

        // a second session's success inside the window is kept
        vi.setSystemTime(now + 30 * 1000);
        jar.set("refresh_token", { name: "refresh_token", value: "rt-2" });
        expect((await POST(request())).status).toBe(200);

        // later, the first session's expired entry is swept
        vi.setSystemTime(now + 61 * 1000);
        expect((await POST(request())).status).toBe(200);
    });

    it("keeps the refresh token when the response does not rotate it", async () => {
        const { refresh_token: _, ...reply } = tokens();
        const { response } = await refresh(undefined, reply);
        expect(response.status).toBe(200);
        expect(cookieOf(response, "refresh_token")).toBeUndefined();
        expect(cookieOf(response, "access_token")?.value).toBe("access-2");
    });

    it("honours refresh_expires_in for the refresh cookie and the session", async () => {
        const { response } = await refresh(undefined, {
            ...tokens(),
            refresh_expires_in: 7200,
        });
        for (const name of ["refresh_token", "id_token", "token_expires_at"])
            expect(cookieOf(response, name)?.attributes).toContain(
                "max-age=7200",
            );
    });

    it("keeps the session cookies at most 30 days", async () => {
        const { response } = await refresh(undefined, {
            ...tokens(),
            expires_in: 90 * 24 * 60 * 60,
            refresh_expires_in: 90 * 24 * 60 * 60,
        });
        // the logout marker (30 days) outlives every session cookie
        for (const name of [
            "access_token",
            "refresh_token",
            "id_token",
            "token_expires_at",
        ])
            expect(cookieOf(response, name)?.attributes).toContain(
                `max-age=${thirtyDays}`,
            );
    });

    it("sets secure cookies in production", async () => {
        vi.stubEnv("NODE_ENV", "production");
        const { response } = await refresh();
        expect(cookieOf(response, "access_token")?.attributes).toContain(
            "secure",
        );
    });

    it("keeps the session's ID token if the provider sends no new one", async () => {
        const sessionIdToken = idToken();
        const { response } = await refresh(
            { refresh_token: "rt-SECRET-1", id_token: sessionIdToken },
            { access_token: "access-2", expires_in: 3600 },
        );
        expect(response.status).toBe(200);
        expect(cookieOf(response, "access_token")).toMatchObject({
            value: "access-2",
            attributes: expect.arrayContaining(["max-age=3600"]),
        });
        // set again with the session's lifetime, so that it doesn't expire
        // with the first access token
        expect(cookieOf(response, "id_token")).toMatchObject({
            value: sessionIdToken,
            attributes: expect.arrayContaining([`max-age=${thirtyDays}`]),
        });
        expect(cookieOf(response, "refresh_token")).toBeUndefined();
        expect(cookieOf(response, "token_expires_at")?.value).toBe(
            `${now + 3600 * 1000}:${3600 * 1000}`,
        );
    });

    it("accepts a new ID token of a session without one", async () => {
        const { response } = await refresh();
        expect(response.status).toBe(200);
    });

    it.each([
        ["another user", { sub: "u2" }],
        // the same provider, but not the same `iss` string
        ["another issuer", { iss: `${issuer}/` }],
    ])("ends the session on an ID token of %s", async (_, claims) => {
        const { response, error } = await refresh(
            {
                refresh_token: "rt-SECRET-1",
                // decoded only: the session's ID token was validated at login
                id_token: `h.${Buffer.from(JSON.stringify({ iss: issuer, sub: "u1", ...claims })).toString("base64url")}.s`,
                oidc_provider: "test",
            },
            tokens(),
        );
        await expectSessionEnded(response, "Invalid token response");
        expect(error.mock.calls[0][0]).toMatch(
            /category=id_token_subject_mismatch/,
        );
    });

    it("stops refreshes of visitors without a refresh token", async () => {
        const { response, post } = await refresh({ token_expires_at: "1" });
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            error: "No refresh token available",
            code: "no_refresh_token",
        });
        // a stale expiry no longer starts refreshes, and no cookie of the
        // ended session (e.g. its ID token) outlives it
        for (const name of sessionCookies)
            expect(cookieOf(response, name)?.value).toBe("");
        expect(post).not.toHaveBeenCalled();
    });

    it("keeps an access token without a refresh token until it expires", async () => {
        const { response } = await refresh({
            access_token: "access-1",
            token_expires_at: "1",
        });
        expect(response.status).toBe(401);
        expect(await response.json()).toMatchObject({
            code: "no_refresh_token",
        });
        // only the expiry goes, so that no further refresh starts
        expect(response.headers.getSetCookie()).toHaveLength(1);
        expect(cookieOf(response, "token_expires_at")?.value).toBe("");
    });

    it("ends the session after a logout", async () => {
        const { response, post } = await refresh({
            refresh_token: "rt-SECRET-1",
            logout_marker: "1",
        });
        await expectSessionEnded(response, "Session terminated");
        expect(post).not.toHaveBeenCalled();
    });

    it("resolves the session provider from the provider cookie and ID token", async () => {
        setUp({
            refresh_token: "rt-SECRET-1",
            oidc_provider: "test",
            id_token: "h.e30.c2ln",
        });
        // a second provider, so the single-provider fallback cannot mask
        // a failed cookie lookup
        vi.stubEnv(
            "LOGIN_PROVIDERS",
            JSON.stringify([
                {
                    id: "test",
                    name: "Test",
                    issuer,
                    clientId: "client",
                    clientSecret: "client-secret",
                },
                {
                    id: "other",
                    name: "Other",
                    issuer: "https://other.example.org",
                    clientId: "client",
                    clientSecret: "client-secret",
                },
            ]),
        );
        mockOidcProvider();
        const post = vi.spyOn(await http(), "post");
        // the session's ID token is a stub, so no new one to compare
        const { id_token: _, ...reply } = tokens();
        post.mockResolvedValue({ status: 200, data: reply });
        const { POST } = await import("./route");
        const response = await POST(request());
        expect(response.status).toBe(200);
        expect(post).toHaveBeenCalled();
    });

    it("ends the session when its login provider is gone", async () => {
        setUp({ refresh_token: "rt-SECRET-1" });
        mockOidcProvider();
        vi.stubEnv("LOGIN_PROVIDERS", "[]");
        const { POST } = await import("./route");
        await expectSessionEnded(
            await POST(request()),
            "Unknown login provider",
        );
    });

    it("keeps the session when the provider cannot be discovered", async () => {
        setUp({ refresh_token: "rt-SECRET-1" });
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("err", { status: 500 })),
        );
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const { POST } = await import("./route");
        const response = await POST(request());
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({
            error: "Could not discover the OIDC provider configuration",
            code: "unavailable",
        });
        expect(response.headers.getSetCookie()).toEqual([]);
        expect(error.mock.calls[0][0]).toMatch(/category=discovery_failed/);
    });

    it("rejects a token response without an access token", async () => {
        const { response, error } = await refresh(undefined, {
            id_token: "x",
        });
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({
            error: "Invalid token response",
            code: "unavailable",
        });
        expect(response.headers.getSetCookie()).toEqual([]);
        expect(error.mock.calls[0][0]).toMatch(/category=invalid_response/);
    });

    it.each([
        ["null", null],
        ["a string", "oops"],
    ])("rejects a token response that is %s", async (_, reply) => {
        const { response, error } = await refresh(undefined, reply);
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({
            error: "Invalid token response",
            code: "unavailable",
        });
        expect(response.headers.getSetCookie()).toEqual([]);
        expect(error.mock.calls[0][0]).toMatch(/category=invalid_response/);
    });

    it.each([
        ["without an access token", { id_token: "x" }],
        [
            "with an invalid ID token",
            { access_token: "access-2", id_token: "not-a-jwt" },
        ],
    ])("keeps a rotated refresh token of a response %s", async (_, reply) => {
        const { response } = await refresh(undefined, {
            ...reply,
            refresh_token: "refresh-2",
        });
        expect(response.status).toBe(503);
        // the provider may have invalidated the old one already
        expect(cookieOf(response, "refresh_token")).toMatchObject({
            value: "refresh-2",
            attributes: expect.arrayContaining([`max-age=${thirtyDays}`]),
        });
        expect(cookieOf(response, "access_token")).toBeUndefined();
        expect(cookieOf(response, "id_token")).toBeUndefined();
    });

    it("ends a session that has no ID token and gets none", async () => {
        const { response } = await refresh(undefined, {
            access_token: "access-2",
            expires_in: 600,
        });
        await expectSessionEnded(response, "Session has no ID token");
    });

    it("rejects an ID token that fails validation", async () => {
        const { response, error } = await refresh(undefined, {
            access_token: "access-2",
            id_token: "not-a-jwt",
        });
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({
            error: "Invalid token response",
            code: "unavailable",
        });
        expect(error.mock.calls[0][0]).toMatch(
            /category=id_token_validation_failed/,
        );
    });

    it.each([
        ["not a number", "600"],
        ["not positive", 0],
    ])("assumes an hour when expires_in is %s", async (_, expires_in) => {
        const { response } = await refresh(undefined, {
            access_token: "access-2",
            id_token: idToken(),
            expires_in,
        });
        expect(cookieOf(response, "access_token")?.attributes).toContain(
            "max-age=3600",
        );
    });

    it("logs the provider's error field on failure", async () => {
        const { error } = await refresh(
            undefined,
            httpError(400, { error: "invalid_grant" }),
        );
        expect(error.mock.calls[0][0]).toContain(
            "provider_error=invalid_grant",
        );
    });

    it.each([
        ["400 invalid_grant", httpError(400, { error: "invalid_grant" })],
        ["401 without an error field", httpError(401)],
        ["401 invalid_token", httpError(401, { error: "invalid_token" })],
    ])("ends the session when the provider answers %s", async (_, reply) => {
        const { response, error } = await refresh(undefined, reply);
        await expectSessionEnded(response, "Failed to refresh token");
        expect(error.mock.calls[0][0]).toMatch(/category=upstream_40[01]/);
    });

    it.each([
        ["401 invalid_client", httpError(401, { error: "invalid_client" })],
        ["400 invalid_client", httpError(400, { error: "invalid_client" })],
        [
            "401 unauthorized_client",
            httpError(401, { error: "unauthorized_client" }),
        ],
        ["400 invalid_request", httpError(400, { error: "invalid_request" })],
        ["400 without an error field", httpError(400)],
        ["503", httpError(503)],
        ["a network error", networkError("ETIMEDOUT")],
        ["an axios error without details", networkError()],
        ["another error", new Error("boom")],
    ])("keeps the session on %s", async (_, reply) => {
        const { response, error } = await refresh(undefined, reply);
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({
            error: "Failed to refresh token",
            code: "unavailable",
        });
        expect(response.headers.getSetCookie()).toEqual([]);
        // the log has no tokens or secrets
        expect(error.mock.calls[0][0]).not.toContain("rt-SECRET-1");
        expect(error.mock.calls[0][0]).not.toContain("client-secret");
    });

    it.each([
        ["upstream_503", httpError(503)],
        ["network_ETIMEDOUT", networkError("ETIMEDOUT")],
        ["unknown", networkError()],
        ["unexpected", new Error("boom")],
    ])("logs the category %s", async (category, reply) => {
        const { error } = await refresh(undefined, reply);
        expect(error.mock.calls[0][0]).toContain(`category=${category}`);
    });
});
