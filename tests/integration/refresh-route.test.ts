import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn());
const cookieValues = vi.hoisted(() => new Map<string, string>());

vi.mock("@/lib/axios", () => ({ axiosBase: { post } }));
vi.mock("next/headers", () => ({
    cookies: async () => ({
        get: (name: string) =>
            cookieValues.has(name)
                ? { name, value: cookieValues.get(name) }
                : undefined,
    }),
}));

const { POST } = await import("@/app/auth/api/refresh/route");

describe("POST /auth/api/refresh", () => {
    beforeEach(() => {
        vi.stubEnv("LS_LOGIN_URL", "https://login.example.org");
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        cookieValues.clear();
        post.mockReset();
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it("rejects a session that was logged out", async () => {
        cookieValues.set("refresh_token", "refresh");
        cookieValues.set("logout_marker", "1");

        const response = await POST();

        expect(response.status).toBe(401);
        expect(post).not.toHaveBeenCalled();
    });

    it("sets new tokens as httpOnly cookies", async () => {
        cookieValues.set("refresh_token", "refresh");
        post.mockResolvedValue({
            data: {
                access_token: "access",
                refresh_token: "refresh-2",
                expires_in: 3600,
            },
        });

        const response = await POST();

        expect(response.status).toBe(200);
        expect(response.cookies.get("access_token")).toMatchObject({
            value: "access",
            httpOnly: true,
        });
        expect(response.cookies.get("refresh_token")).toMatchObject({
            value: "refresh-2",
            httpOnly: true,
        });
    });
});
