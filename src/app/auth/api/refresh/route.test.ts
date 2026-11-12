import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    cookieOf,
    cookieStore,
    http,
    httpError,
    jar,
    loginUrl,
    networkError,
    setUp,
} from "@/test/routes";

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const tokens = {
    access_token: "access-2",
    id_token: "id-2",
    refresh_token: "refresh-2",
    expires_in: 600,
};

const now = new Date("2026-11-12T12:00:00Z").getTime();

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
    cookies: Record<string, string | undefined> = { refresh_token: "refresh" },
    reply: unknown = tokens,
) {
    setUp(cookies);
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
        expect(endpoint).toBe(`${loginUrl}/oidc/token`);
        expect(Object.fromEntries(body as URLSearchParams)).toEqual({
            grant_type: "refresh_token",
            refresh_token: "refresh",
            client_id: "client",
            client_secret: "client-secret",
        });
        expect(options?.validateStatus?.(200)).toBe(true);
        expect(options?.validateStatus?.(401)).toBe(false);

        expect(cookieOf(response, "access_token")).toMatchObject({
            value: "access-2",
            attributes: expect.arrayContaining(["httponly", "max-age=600"]),
        });
        expect(cookieOf(response, "id_token")?.value).toBe("id-2");
        // rotated refresh tokens replace the old one
        expect(cookieOf(response, "refresh_token")?.value).toBe("refresh-2");
        const expiry = cookieOf(response, "token_expires_at");
        expect(expiry?.value).toBe(String(now + 5 * 60 * 1000));
        expect(expiry?.attributes).not.toContain("httponly");
    });

    it("sends empty client settings that aren't set", async () => {
        setUp({ refresh_token: "refresh" });
        vi.stubEnv("OIDC_CLIENT_ID", undefined);
        vi.stubEnv("OIDC_CLIENT_SECRET", undefined);
        const post = vi
            .spyOn(await http(), "post")
            .mockResolvedValue({ status: 200, data: tokens });
        const { POST } = await import("./route");
        await POST();
        expect(
            Object.fromEntries(post.mock.calls[0][1] as URLSearchParams),
        ).toMatchObject({
            client_id: "",
            client_secret: "",
        });
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
            refresh_token: "refresh",
            logout_marker: "1",
        });
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Session terminated" });
        expect(post).not.toHaveBeenCalled();
    });

    it("drops the new tokens after a logout during the refresh", async () => {
        setUp({ refresh_token: "refresh" });
        vi.spyOn(await http(), "post").mockImplementation(async () => {
            jar.set("logout_marker", { name: "logout_marker", value: "1" });
            return { status: 200, data: tokens };
        });
        const { POST } = await import("./route");
        const response = await POST();
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Session terminated" });
        expect(response.headers.getSetCookie()).toEqual([]);
    });

    it("rejects a token response without an access token", async () => {
        const { response, error } = await refresh(undefined, { id_token: "x" });
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "Invalid token response",
        });
        expect(error.mock.calls[0][0]).toMatch(/category=invalid_response/);
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
        expect(error.mock.calls[0][0]).not.toMatch(/refresh-?\d?\b.*secret/);
    });
});
