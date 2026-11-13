import { describe, expect, it, vi } from "vitest";
import { appOrigin, cookieOf, loginUrl, setUp } from "@/test/routes";

async function login() {
    const { GET } = await import("./route");
    return GET();
}

describe("GET /auth/api/login-redirect", () => {
    it("redirects to the provider with a state", async () => {
        setUp();
        const response = await login();
        expect(response.status).toBe(307);

        const url = new URL(response.headers.get("location") as string);
        expect(`${url.origin}${url.pathname}`).toBe(
            `${loginUrl}/oidc/authorize`,
        );
        const state = url.searchParams.get("state") as string;
        expect(state).toMatch(/^[0-9a-f-]{36}$/);
        expect(Object.fromEntries(url.searchParams)).toEqual({
            response_type: "code",
            client_id: "client",
            redirect_uri: `${appOrigin}/auth/api/callback`,
            scope: "openid profile email offline_access",
            state,
        });

        const cookie = cookieOf(response, `authState-${state}`);
        expect(cookie?.value).toBe(state);
        expect(cookie?.attributes).toEqual(
            expect.arrayContaining([
                "httponly",
                "samesite=lax",
                "path=/",
                "max-age=600",
            ]),
        );
    });

    it("uses a new state for every login", async () => {
        setUp();
        const state = async () =>
            new URL(
                (await login()).headers.get("location") as string,
            ).searchParams.get("state");
        expect(await state()).not.toBe(await state());
    });

    it("requests the configured scope", async () => {
        setUp();
        vi.stubEnv("OIDC_SCOPE", "openid groups");
        const url = new URL((await login()).headers.get("location") as string);
        expect(url.searchParams.get("scope")).toBe("openid groups");
    });

    it("sets secure cookies in production", async () => {
        setUp();
        vi.stubEnv("NODE_ENV", "production");
        const response = await login();
        const state = new URL(
            response.headers.get("location") as string,
        ).searchParams.get("state");
        expect(cookieOf(response, `authState-${state}`)?.attributes).toContain(
            "secure",
        );
    });

    it.each([
        "LS_LOGIN_URL",
        "OIDC_CLIENT_ID",
        "OIDC_REDIRECT_URI",
    ])("fails without %s", async (name) => {
        setUp();
        vi.stubEnv(name, "");
        const response = await login();
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "OIDC environment variables are not configured",
        });
    });
});
