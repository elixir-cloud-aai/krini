import { describe, expect, it, vi } from "vitest";
import {
    authorizationEndpoint,
    issuer,
    mockOidcProvider,
    providersJson,
} from "@/test/oidc";
import { appOrigin, cookieOf, setUp } from "@/test/routes";

async function login(query = "") {
    const { GET } = await import("./route");
    return GET(new Request(`http://localhost/auth/api/login-redirect${query}`));
}

describe("GET /auth/api/login-redirect", () => {
    it("redirects to the discovered authorize endpoint with PKCE, state and nonce", async () => {
        setUp();
        mockOidcProvider();
        const response = await login();
        expect(response.status).toBe(307);

        const url = new URL(response.headers.get("location") as string);
        expect(`${url.origin}${url.pathname}`).toBe(authorizationEndpoint);

        const params = url.searchParams;
        const state = params.get("state") as string;
        const nonce = params.get("nonce") as string;
        const challenge = params.get("code_challenge") as string;
        const verifier = JSON.parse(
            cookieOf(response, `authState-${state}`)?.value as string,
        ) as {
            state: string;
            nonce: string;
            codeVerifier: string;
            providerId: string;
        };

        expect(state).toBeTruthy();
        expect(nonce).toBeTruthy();
        expect(params.get("response_type")).toBe("code");
        expect(params.get("client_id")).toBe("client");
        expect(params.get("redirect_uri")).toBe(
            `${appOrigin}/auth/api/callback`,
        );
        expect(params.get("scope")).toBe("openid profile email");
        expect(params.get("code_challenge_method")).toBe("S256");
        // the challenge is the S256 of the stored verifier
        const { createHash } = await import("node:crypto");
        expect(challenge).toBe(
            createHash("sha256")
                .update(verifier.codeVerifier)
                .digest("base64url"),
        );
        expect(verifier.state).toBe(state);
        expect(verifier.nonce).toBe(nonce);
        expect(verifier.providerId).toBe("test");

        const cookie = cookieOf(response, `authState-${state}`);
        expect(cookie?.attributes).toEqual(
            expect.arrayContaining([
                "httponly",
                "samesite=lax",
                "path=/",
                "max-age=600",
            ]),
        );
    });

    it("selects the provider of the query", async () => {
        setUp();
        vi.stubEnv(
            "LOGIN_PROVIDERS",
            JSON.stringify([
                {
                    id: "a",
                    issuer,
                    clientId: "client-a",
                    clientSecret: "s",
                },
                {
                    id: "b",
                    issuer,
                    clientId: "client-b",
                    clientSecret: "s",
                },
            ]),
        );
        mockOidcProvider();
        const response = await login("?provider=b");
        expect(response.status).toBe(307);
        const url = new URL(response.headers.get("location") as string);
        expect(url.searchParams.get("client_id")).toBe("client-b");
    });

    it("requires a provider when several are configured", async () => {
        setUp();
        vi.stubEnv(
            "LOGIN_PROVIDERS",
            JSON.stringify([
                { id: "a", issuer, clientId: "c", clientSecret: "s" },
                { id: "b", issuer, clientId: "c", clientSecret: "s" },
            ]),
        );
        mockOidcProvider();
        const response = await login();
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: "Unknown login provider",
        });
    });

    it("rejects an unknown provider", async () => {
        setUp();
        mockOidcProvider();
        const response = await login("?provider=missing");
        expect(response.status).toBe(400);
    });

    it("uses a new transaction for every login", async () => {
        setUp();
        mockOidcProvider();
        const state = async () =>
            new URL(
                (await login()).headers.get("location") as string,
            ).searchParams.get("state");
        expect(await state()).not.toBe(await state());
    });

    it("requests the configured scopes", async () => {
        setUp();
        vi.stubEnv(
            "LOGIN_PROVIDERS",
            providersJson({ scopes: ["openid", "groups"] }),
        );
        mockOidcProvider();
        const url = new URL((await login()).headers.get("location") as string);
        expect(url.searchParams.get("scope")).toBe("openid groups");
    });

    it("sets secure cookies in production", async () => {
        setUp();
        mockOidcProvider();
        vi.stubEnv("NODE_ENV", "production");
        const response = await login();
        const state = new URL(
            response.headers.get("location") as string,
        ).searchParams.get("state");
        expect(cookieOf(response, `authState-${state}`)?.attributes).toContain(
            "secure",
        );
    });

    it("fails without configured providers", async () => {
        setUp();
        vi.stubEnv("LOGIN_PROVIDERS", "[]");
        const response = await login();
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "Login providers are not configured",
        });
    });

    it("fails when the provider cannot be discovered", async () => {
        setUp();
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("err", { status: 500 })),
        );
        const response = await login();
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "Could not discover the OIDC provider configuration",
        });
    });
});
