import { describe, expect, it, vi } from "vitest";
import { issuer, mockOidcProvider, providersJson } from "@/test/oidc";
import { cookieStore, setUp } from "@/test/routes";

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const now = Date.now();

function idTokenCookie(claims: Record<string, unknown> = {}) {
    const payload = Buffer.from(
        JSON.stringify({
            iss: issuer,
            aud: "client",
            exp: Math.floor(now / 1000) + 3600,
            sub: "u1",
            ...claims,
        }),
    ).toString("base64url");
    return `h.${payload}.s`;
}

/**
 * Get the user info: `setUp` + provider mock, optional provider settings
 * applied after `setUp` (which resets env), then the route
 * @param cookies Cookies of the request
 * @param provider Provider fields that replace the defaults
 * @param oidcProvider Options of the mock provider
 */
async function userInfo(
    cookies: Record<string, string | undefined> = { access_token: "at" },
    provider: Record<string, unknown> = {},
    oidcProvider?: Parameters<typeof mockOidcProvider>[0],
) {
    setUp(cookies);
    vi.stubEnv("LOGIN_PROVIDERS", providersJson(provider));
    mockOidcProvider(oidcProvider);
    const { GET } = await import("./route");
    return GET();
}

describe("GET /auth/api/user-info", () => {
    it("returns the user, groups and tier", async () => {
        const response = await userInfo(
            { access_token: "at", id_token: idTokenCookie() },
            {
                groupsClaim: "groups",
                computeGroups: ["compute"],
                adminGroups: ["admin"],
            },
            { userinfo: { sub: "u1", groups: ["compute"] } },
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.error).toBe(false);
        expect(body.user).toMatchObject({ sub: "u1" });
        expect(body.groups).toEqual(["compute"]);
        expect(body.tier).toBe("compute");
        expect(body.access_request_url).toBeNull();
    });

    it("includes the configured access request URL", async () => {
        setUp({ access_token: "at", id_token: idTokenCookie() });
        mockOidcProvider();
        vi.stubEnv("COMPUTE_ACCESS_REQUEST_URL", "https://example.org/access");
        const { GET } = await import("./route");
        const body = await (await GET()).json();
        expect(body.access_request_url).toBe("https://example.org/access");
    });

    it("matches compute subgroups with the configured separator", async () => {
        const response = await userInfo(
            { access_token: "at", id_token: idTokenCookie() },
            {
                groupsClaim: "groups",
                computeGroups: ["compute"],
                groupSubgroupSeparator: ":",
            },
            { userinfo: { sub: "u1", groups: ["compute:wg1"] } },
        );
        const body = await response.json();
        expect(body.tier).toBe("compute");
        expect(body.groups).toEqual(["compute:wg1"]);
    });

    it("reads groups from the ID token when configured", async () => {
        const response = await userInfo(
            {
                access_token: "at",
                id_token: idTokenCookie({ groups: ["admin"] }),
            },
            {
                groupsClaim: "groups",
                groupsFromUserinfo: false,
                adminGroups: ["admin"],
            },
        );
        const body = await response.json();
        expect(body.tier).toBe("admin");
        expect(body.groups).toEqual(["admin"]);
    });

    it("rejects requests without a session", async () => {
        const response = await userInfo({});
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: true, user: null });
    });

    it("rejects requests after a logout", async () => {
        // e.g. a refresh that the logout overtook set the cookies again
        const response = await userInfo({
            access_token: "at",
            id_token: idTokenCookie(),
            logout_marker: "1",
        });
        expect(response.status).toBe(401);
    });

    it("knows the user after the session's ID token expired", async () => {
        // the cookie lives as long as the session, and refreshes needn't
        // bring a new ID token; its `sub` still names the user
        const response = await userInfo({
            access_token: "at",
            id_token: idTokenCookie({ exp: Math.floor(now / 1000) - 7200 }),
        });
        expect(response.status).toBe(200);
        expect((await response.json()).user).toMatchObject({ sub: "u1" });
    });

    it("rejects a session of an unknown provider", async () => {
        setUp({ access_token: "at", oidc_provider: "missing" });
        vi.stubEnv(
            "LOGIN_PROVIDERS",
            JSON.stringify([
                {
                    id: "a",
                    issuer,
                    clientId: "client",
                    clientSecret: "s",
                },
                {
                    id: "b",
                    issuer: "https://other.example.org",
                    clientId: "client",
                    clientSecret: "s",
                },
            ]),
        );
        mockOidcProvider();
        const { GET } = await import("./route");
        const response = await GET();
        expect(response.status).toBe(401);
    });

    it("fails when no login providers are configured", async () => {
        setUp({ access_token: "at" });
        vi.stubEnv("LOGIN_PROVIDERS", "[]");
        const { GET } = await import("./route");
        const response = await GET();
        expect(response.status).toBe(401);
    });

    it("fails when the provider cannot be discovered", async () => {
        setUp({ access_token: "at" });
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("err", { status: 500 })),
        );
        const { GET } = await import("./route");
        const response = await GET();
        expect(response.status).toBe(500);
    });

    it("fails when userinfo is for another subject", async () => {
        const response = await userInfo(
            { access_token: "at", id_token: idTokenCookie() },
            {},
            { userinfo: { sub: "u2" } },
        );
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({ error: true, user: null });
    });

    it("fails when userinfo rejects the token", async () => {
        const response = await userInfo(
            { access_token: "at" },
            {},
            { userinfoStatus: 401 },
        );
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({ error: true, user: null });
    });
});
