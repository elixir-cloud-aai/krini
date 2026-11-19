import { describe, expect, it, vi } from "vitest";
import { cookieStore, setUp } from "@/test/routes";

vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

async function token() {
    const { GET } = await import("./route");
    return GET();
}

describe("GET /auth/api/token", () => {
    it("returns the access token of the session, uncached", async () => {
        setUp({ access_token: "access" });
        const response = await token();
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store, private");
        expect(await response.json()).toEqual({ access_token: "access" });
    });

    it("rejects requests without a session", async () => {
        setUp();
        const response = await token();
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: "Not authenticated" });
    });

    it("gives no token after a logout", async () => {
        // e.g. a refresh that the logout overtook set the cookie again
        setUp({ access_token: "access", logout_marker: "1" });
        const response = await token();
        expect(response.status).toBe(401);
    });
});
