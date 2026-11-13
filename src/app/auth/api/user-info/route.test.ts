import { describe, expect, it, vi } from "vitest";
import { cookieStore, http, httpError, loginUrl, setUp } from "@/test/routes";

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

/**
 * Get the user info with the given session cookies
 * @param cookies Cookies of the request
 * @param reply Result of the user info request: data, or an error to throw
 */
async function userInfo(
    cookies: Record<string, string | undefined>,
    reply: unknown = { sub: "a", name: "Alice" },
) {
    setUp(cookies);
    const get = vi.spyOn(await http(), "get");
    if (reply instanceof Error) get.mockRejectedValue(reply);
    else get.mockResolvedValue({ status: 200, data: reply });
    const { GET } = await import("./route");
    return { response: await GET(), get };
}

describe("GET /auth/api/user-info", () => {
    it("returns the provider's user info", async () => {
        const { response, get } = await userInfo({ access_token: "access" });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            error: false,
            user: { sub: "a", name: "Alice" },
        });
        expect(get).toHaveBeenCalledWith(`${loginUrl}/oidc/userinfo`, {
            headers: {
                Authorization: "Bearer access",
                Accept: "application/json",
            },
        });
    });

    it("rejects requests without a session", async () => {
        const { response, get } = await userInfo({});
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: true, user: null });
        expect(get).not.toHaveBeenCalled();
    });

    it("fails on an error of the provider", async () => {
        const { response } = await userInfo(
            { access_token: "access" },
            httpError(401),
        );
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({ error: true, user: null });
    });

    it.each([
        ["no body", ""],
        ["a body that isn't an object", "text"],
    ])("fails on a response with %s", async (_, reply) => {
        const { response } = await userInfo({ access_token: "access" }, reply);
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: true, user: null });
    });
});
