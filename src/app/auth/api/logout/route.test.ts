import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { appOrigin, cookieOf, setUp } from "@/test/routes";

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
];

describe("POST /auth/api/logout", () => {
    it("ends the session and marks the logout", async () => {
        setUp();
        const response = await logout(appOrigin);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true });

        for (const name of sessionCookies)
            expect(cookieOf(response, name)?.value).toBe("");
        const marker = cookieOf(response, "logout_marker");
        expect(Number(marker?.value)).toBeGreaterThan(0);
        expect(marker?.attributes).toEqual(
            expect.arrayContaining(["httponly", "samesite=lax", "path=/"]),
        );
        expect(marker?.attributes).not.toContain("secure");
    });

    it("sets a secure marker in production", async () => {
        setUp();
        vi.stubEnv("NODE_ENV", "production");
        const response = await logout(appOrigin);
        expect(cookieOf(response, "logout_marker")?.attributes).toContain(
            "secure",
        );
    });

    it("accepts an origin with a trailing slash in the setting", async () => {
        setUp();
        vi.stubEnv("APP_ORIGIN", `${appOrigin}/`);
        expect((await logout(appOrigin)).status).toBe(200);
    });

    it.each([
        ["no origin", undefined],
        ["another origin", "https://other.example.org"],
    ])("rejects requests with %s", async (_, origin) => {
        setUp();
        const response = await logout(origin);
        expect(response.status).toBe(403);
        expect(await response.json()).toEqual({
            error: "Invalid request origin",
        });
        expect(response.headers.getSetCookie()).toEqual([]);
    });

    it("fails without APP_ORIGIN", async () => {
        setUp();
        vi.stubEnv("APP_ORIGIN", "");
        const response = await logout(appOrigin);
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "APP_ORIGIN environment variable is not set",
        });
    });

    it("fails with an APP_ORIGIN that isn't a URL", async () => {
        setUp();
        vi.stubEnv("APP_ORIGIN", "not a url");
        const response = await logout(appOrigin);
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "Invalid APP_ORIGIN format",
        });
    });
});
