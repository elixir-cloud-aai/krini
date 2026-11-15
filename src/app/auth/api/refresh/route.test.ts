import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { issuer, mockOidcProvider, signIdToken } from "@/test/oidc";
import {
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

const tokens = () => ({
    access_token: "access-2",
    id_token: signIdToken({
        iss: issuer,
        aud: "client",
        exp: Math.floor(now / 1000) + 3600,
        sub: "u1",
    }),
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
    const response = await POST();
    return { response, post, error };
}

const sessionCookies = [
    "access_token",
    "id_token",
    "refresh_token",
    "token_expires_at",
];

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
        expect(cookieOf(response, "id_token")).toBeDefined();
        // rotated refresh tokens replace the old one
        expect(cookieOf(response, "refresh_token")?.value).toBe("refresh-2");
        const expiry = cookieOf(response, "token_expires_at");
        expect(expiry?.value).toBe(String(now + 5 * 60 * 1000));
        expect(expiry?.attributes).not.toContain("httponly");
    });

    it("does not clear cookies when a concurrent refresh already succeeded", async () => {
        setUp({ refresh_token: "rt-SECRET-1" });
        mockOidcProvider();
        const post = vi.spyOn(await http(), "post");
        post.mockResolvedValueOnce({ status: 200, data: tokens() });
        post.mockRejectedValueOnce(httpError(401));
        const { POST } = await import("./route");

        // two tabs refresh the same session; the provider rotates the
        // refresh token, so the second request is a replay rejection
        expect((await POST()).status).toBe(200);
        const replay = await POST();
        expect(replay.status).toBe(401);
        // the losing response must not undo the winner's session cookies
        expect(replay.headers.getSetCookie()).toEqual([]);
    });

    it("still clears cookies once the success record expires", async () => {
        setUp({ refresh_token: "rt-SECRET-1" });
        mockOidcProvider();
        const post = vi.spyOn(await http(), "post");
        post.mockResolvedValueOnce({ status: 200, data: tokens() });
        const { POST } = await import("./route");
        await POST();

        vi.setSystemTime(now + 61 * 1000);
        post.mockRejectedValueOnce(httpError(401));
        const response = await POST();
        expect(response.status).toBe(401);
        expect(cookieOf(response, "access_token")?.value).toBe("");
        expect(cookieOf(response, "refresh_token")?.value).toBe("");
    });

    it("keeps recent successes while sweeping expired ones", async () => {
        setUp({ refresh_token: "rt-1" });
        mockOidcProvider();
        const post = vi.spyOn(await http(), "post");
        post.mockResolvedValue({ status: 200, data: tokens() });
        const { POST } = await import("./route");
        expect((await POST()).status).toBe(200);

        // a second session's success inside the window is kept
        vi.setSystemTime(now + 30 * 1000);
        jar.set("refresh_token", { name: "refresh_token", value: "rt-2" });
        expect((await POST()).status).toBe(200);

        // later, the first session's expired entry is swept
        vi.setSystemTime(now + 61 * 1000);
        expect((await POST()).status).toBe(200);
    });

    it("keeps the refresh token when the response does not rotate it", async () => {
        const { refresh_token: _, ...reply } = tokens();
        const { response } = await refresh(undefined, reply);
        expect(response.status).toBe(200);
        expect(cookieOf(response, "refresh_token")).toBeUndefined();
        expect(cookieOf(response, "access_token")?.value).toBe("access-2");
    });

    it("honours refresh_expires_in for the refresh cookie", async () => {
        const { response } = await refresh(undefined, {
            ...tokens(),
            refresh_expires_in: 7200,
        });
        expect(cookieOf(response, "refresh_token")?.attributes).toContain(
            "max-age=7200",
        );
    });

    it("sets secure cookies in production", async () => {
        vi.stubEnv("NODE_ENV", "production");
        const { response } = await refresh();
        expect(cookieOf(response, "access_token")?.attributes).toContain(
            "secure",
        );
    });

    it("keeps the ID and refresh tokens if the provider sends no new ones", async () => {
        const { response } = await refresh(undefined, {
            access_token: "access-2",
            expires_in: 3600,
        });
        expect(response.status).toBe(200);
        expect(cookieOf(response, "access_token")).toMatchObject({
            value: "access-2",
            attributes: expect.arrayContaining(["max-age=3600"]),
        });
        expect(cookieOf(response, "id_token")).toBeUndefined();
        expect(cookieOf(response, "refresh_token")).toBeUndefined();
        expect(cookieOf(response, "token_expires_at")?.value).toBe(
            String(now + 55 * 60 * 1000),
        );
    });

    it("fails without a refresh token", async () => {
        const { response, post } = await refresh({});
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            error: "No refresh token available",
        });
        expect(post).not.toHaveBeenCalled();
    });

    it("fails after a logout", async () => {
        const { response, post } = await refresh({
            refresh_token: "rt-SECRET-1",
            logout_marker: "1",
        });
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Session terminated" });
        expect(post).not.toHaveBeenCalled();
    });

    it("drops the new tokens after a logout during the refresh", async () => {
        setUp({ refresh_token: "rt-SECRET-1" });
        mockOidcProvider();
        vi.spyOn(await http(), "post").mockImplementation(async () => {
            jar.set("logout_marker", { name: "logout_marker", value: "1" });
            return { status: 200, data: tokens() };
        });
        const { POST } = await import("./route");
        const response = await POST();
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Session terminated" });
        expect(response.headers.getSetCookie()).toEqual([]);
    });

    it("resolves the session provider from the provider cookie and ID token", async () => {
        const { response } = await refresh({
            refresh_token: "rt-SECRET-1",
            oidc_provider: "test",
            id_token: "h.e30.c2ln",
        });
        expect(response.status).toBe(200);
    });

    it("fails when no login providers are configured", async () => {
        setUp({ refresh_token: "rt-SECRET-1" });
        mockOidcProvider();
        vi.stubEnv("LOGIN_PROVIDERS", "[]");
        const { POST } = await import("./route");
        const response = await POST();
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            error: "Unknown login provider",
        });
    });

    it("fails when the provider cannot be discovered", async () => {
        setUp({ refresh_token: "rt-SECRET-1" });
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("err", { status: 500 })),
        );
        const { POST } = await import("./route");
        const response = await POST();
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "Could not discover the OIDC provider configuration",
        });
    });

    it("rejects a token response without an access token", async () => {
        const { response, error } = await refresh(undefined, {
            id_token: "x",
        });
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "Invalid token response",
        });
        expect(error.mock.calls[0][0]).toMatch(/category=invalid_response/);
    });

    it("rejects an ID token that fails validation", async () => {
        const { response, error } = await refresh(undefined, {
            access_token: "access-2",
            id_token: "not-a-jwt",
        });
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "Invalid token response",
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

    it("ends the session when the provider rejects the refresh token", async () => {
        const { response, error } = await refresh(undefined, httpError(401));
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
            error: "Failed to refresh token",
        });
        for (const name of [...sessionCookies, "logout_marker"])
            expect(cookieOf(response, name)?.value).toBe("");
        expect(error.mock.calls[0][0]).toContain("category=upstream_401");
    });

    it.each([
        ["another error status", httpError(503), "upstream_503"],
        ["a network error", networkError("ETIMEDOUT"), "network_ETIMEDOUT"],
        ["an axios error without details", networkError(), "unknown"],
        ["another error", new Error("boom"), "unexpected"],
    ])("keeps the session on %s", async (_, reply, category) => {
        const { response, error } = await refresh(undefined, reply);
        expect(response.status).toBe(401);
        expect(response.headers.getSetCookie()).toEqual([]);
        expect(error.mock.calls[0][0]).toContain(`category=${category}`);
        // the log has no tokens or secrets
        expect(error.mock.calls[0][0]).not.toContain("rt-SECRET-1");
        expect(error.mock.calls[0][0]).not.toContain("client-secret");
    });
});
