import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { endSessionEndpoint, mockOidcProvider } from "@/test/oidc";
import {
    appOrigin,
    cookieOf,
    cookieStore,
    http,
    httpError,
    setUp,
} from "@/test/routes";

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const revocation = "https://idp.example.org/revoke";

async function logout(origin?: string) {
    const { POST } = await import("./route");
    return POST(
        new NextRequest(`${appOrigin}/auth/api/logout`, {
            method: "POST",
            headers: origin === undefined ? {} : { origin },
        }),
    );
}

const sessionCookies = [
    "access_token",
    "id_token",
    "refresh_token",
    "token_expires_at",
    "oidc_provider",
    "refresh_rejected",
];

describe("POST /auth/api/logout", () => {
    it("ends the session and marks the logout", async () => {
        setUp();
        mockOidcProvider();
        const response = await logout(appOrigin);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            success: true,
            end_session_url: expect.any(String),
        });

        for (const name of sessionCookies)
            expect(cookieOf(response, name)?.value).toBe("");
        const marker = cookieOf(response, "logout_marker");
        expect(Number(marker?.value)).toBeGreaterThan(0);
        expect(marker?.attributes).toEqual(
            expect.arrayContaining(["httponly", "samesite=lax", "path=/"]),
        );
        expect(marker?.attributes).not.toContain("secure");
        // as long as the longest session, which an overtaken refresh may
        // have renewed
        expect(marker?.attributes).toContain(`max-age=${30 * 24 * 60 * 60}`);
    });

    it("revokes the refresh token when the provider supports it", async () => {
        setUp({ refresh_token: "rt-1" });
        mockOidcProvider({ discovery: { revocation_endpoint: revocation } });
        const post = vi.spyOn(await http(), "post").mockResolvedValue({});
        const response = await logout(appOrigin);
        expect(response.status).toBe(200);
        const [endpoint, body, options] = post.mock.calls[0];
        expect(endpoint).toBe(revocation);
        expect(Object.fromEntries(body as URLSearchParams)).toEqual({
            token: "rt-1",
            token_type_hint: "refresh_token",
            client_id: "client",
            client_secret: "client-secret",
        });
        expect(options?.timeout).toBe(5000);
    });

    it("still logs out when the revocation fails", async () => {
        setUp({ refresh_token: "rt-1" });
        mockOidcProvider({ discovery: { revocation_endpoint: revocation } });
        vi.spyOn(await http(), "post").mockRejectedValue(httpError(503));
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const response = await logout(appOrigin);
        expect(response.status).toBe(200);
        expect(cookieOf(response, "refresh_token")?.value).toBe("");
        expect(error.mock.calls[0][0]).toMatch(/category=revocation_failed/);
        expect(error.mock.calls[0][0]).not.toContain("rt-1");
    });

    it.each([
        ["without a refresh token", {}, { revocation_endpoint: revocation }],
        ["without a revocation endpoint", { refresh_token: "rt-1" }, {}],
    ])("revokes nothing %s", async (_, cookies, discovery) => {
        setUp(cookies);
        mockOidcProvider({ discovery });
        const post = vi.spyOn(await http(), "post");
        expect((await logout(appOrigin)).status).toBe(200);
        expect(post).not.toHaveBeenCalled();
    });

    it("returns the provider's end-session URL with the ID token hint", async () => {
        setUp({ id_token: "id-token-value" });
        mockOidcProvider();
        const response = await logout(appOrigin);
        expect(response.status).toBe(200);
        const body = await response.json();
        const url = new URL(body.end_session_url);
        expect(`${url.origin}${url.pathname}`).toBe(endSessionEndpoint);
        expect(url.searchParams.get("post_logout_redirect_uri")).toBe(
            `${appOrigin}/`,
        );
        expect(url.searchParams.get("client_id")).toBe("client");
        expect(url.searchParams.get("id_token_hint")).toBe("id-token-value");
    });

    it("omits the ID token hint without an ID token", async () => {
        setUp();
        mockOidcProvider();
        const response = await logout(appOrigin);
        const body = await response.json();
        const url = new URL(body.end_session_url);
        expect(url.searchParams.get("id_token_hint")).toBeNull();
    });

    it("has no end-session URL when the provider does not advertise one", async () => {
        setUp();
        mockOidcProvider({
            discovery: { end_session_endpoint: undefined },
        });
        const response = await logout(appOrigin);
        const body = await response.json();
        expect(body.end_session_url).toBeUndefined();
    });

    it.each([
        ["malformed", "not a url"],
        ["non-http", "javascript:alert(1)"],
    ])("still clears the session when the end-session endpoint is %s", async (_, endSessionEndpointValue) => {
        setUp();
        mockOidcProvider({
            discovery: {
                end_session_endpoint: endSessionEndpointValue,
            },
        });
        const response = await logout(appOrigin);
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.end_session_url).toBeUndefined();
        for (const name of sessionCookies)
            expect(cookieOf(response, name)?.value).toBe("");
        expect(cookieOf(response, "logout_marker")?.value).toBeTruthy();
    });

    it("has no end-session URL when no provider matches the session", async () => {
        setUp();
        mockOidcProvider();
        vi.stubEnv("LOGIN_PROVIDERS", "[]");
        const response = await logout(appOrigin);
        const body = await response.json();
        expect(body.end_session_url).toBeUndefined();
    });

    it("still logs out when the provider cannot be discovered", async () => {
        setUp();
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("err", { status: 500 })),
        );
        const response = await logout(appOrigin);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true });
    });

    it("sets a secure marker in production", async () => {
        setUp();
        mockOidcProvider();
        vi.stubEnv("NODE_ENV", "production");
        const response = await logout(appOrigin);
        expect(cookieOf(response, "logout_marker")?.attributes).toContain(
            "secure",
        );
    });

    it("accepts an origin with a trailing slash in the setting", async () => {
        setUp();
        mockOidcProvider();
        vi.stubEnv("APP_ORIGIN", `${appOrigin}/`);
        expect((await logout(appOrigin)).status).toBe(200);
    });

    it.each([
        ["no origin", undefined],
        ["another origin", "https://other.example.org"],
    ])("rejects requests with %s", async (_, origin) => {
        setUp();
        mockOidcProvider();
        const response = await logout(origin);
        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({
            error: "Invalid request origin",
        });
        expect(response.headers.getSetCookie()).toEqual([]);
    });

    it("fails without APP_ORIGIN", async () => {
        setUp();
        mockOidcProvider();
        vi.stubEnv("APP_ORIGIN", "");
        const response = await logout(appOrigin);
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "APP_ORIGIN environment variable is not set",
        });
    });

    it("fails with an APP_ORIGIN that isn't a URL", async () => {
        setUp();
        mockOidcProvider();
        vi.stubEnv("APP_ORIGIN", "not a url");
        const response = await logout(appOrigin);
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "APP_ORIGIN environment variable is not set",
        });
    });
});
