import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    authorizationEndpoint,
    endSessionEndpoint,
    issuer,
    jwksUri,
    mockOidcProvider,
    providerJwk,
    providersJson,
    signIdToken,
    tokenEndpoint,
    userinfoEndpoint,
} from "@/test/oidc";
import type { LoginProvider, OidcEndpoints } from "./index";

const appOrigin = "https://app.example.org";

function baseEnv() {
    vi.stubEnv("LOGIN_PROVIDERS", providersJson());
    vi.stubEnv("APP_ORIGIN", appOrigin);
}

async function load() {
    vi.resetModules();
    return import("./index");
}

const endpoints: OidcEndpoints = {
    authorizationEndpoint,
    tokenEndpoint,
    userinfoEndpoint,
    jwksUri,
    endSessionEndpoint,
};

const provider: LoginProvider = {
    id: "test",
    name: "Test IdP",
    issuer,
    clientId: "client",
    clientSecret: "secret",
    scopes: ["openid"],
    groupsFromUserinfo: true,
    computeGroups: [],
    adminGroups: [],
};

const validPayload = {
    iss: issuer,
    aud: "client",
    exp: Math.floor(Date.now() / 1000) + 3600,
    nonce: "n1",
    sub: "u1",
};

beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe("getLoginProviders", () => {
    it("parses the LOGIN_PROVIDERS JSON", async () => {
        baseEnv();
        vi.stubEnv(
            "LOGIN_PROVIDERS",
            providersJson({
                name: "Test Provider",
                logo: "/logo.png",
                issuer: `${issuer}/`,
                scopes: ["openid", "groups"],
                groupsClaim: "eduperson_entitlement",
                groupsFromUserinfo: false,
                computeGroups: ["compute", "wgs"],
                adminGroups: ["admin"],
                groupSubgroupSeparator: ":",
            }),
        );

        const { getLoginProviders } = await load();
        expect(getLoginProviders()).toEqual([
            {
                id: "test",
                name: "Test Provider",
                logo: "/logo.png",
                issuer,
                clientId: "client",
                clientSecret: "client-secret",
                scopes: ["openid", "groups"],
                groupsClaim: "eduperson_entitlement",
                groupsFromUserinfo: false,
                computeGroups: ["compute", "wgs"],
                adminGroups: ["admin"],
                groupSubgroupSeparator: ":",
            },
        ]);
    });

    it("applies defaults", async () => {
        baseEnv();
        vi.stubEnv(
            "LOGIN_PROVIDERS",
            JSON.stringify([
                { id: "bare", issuer, clientId: "c", clientSecret: "s" },
            ]),
        );
        const { getLoginProviders } = await load();
        expect(getLoginProviders()[0]).toMatchObject({
            name: "bare",
            scopes: ["openid", "profile", "email", "offline_access"],
            groupsClaim: undefined,
            groupsFromUserinfo: true,
            computeGroups: [],
            adminGroups: [],
            groupSubgroupSeparator: undefined,
        });
    });

    it("parses several providers and skips invalid entries", async () => {
        baseEnv();
        vi.stubEnv(
            "LOGIN_PROVIDERS",
            JSON.stringify([
                { id: "a", issuer, clientId: "c", clientSecret: "s" },
                { id: "broken" },
                "not-an-object",
                {
                    id: "b",
                    issuer: "https://b.example.org",
                    clientId: "c2",
                    clientSecret: "s2",
                },
            ]),
        );
        const { getLoginProviders, getProviderById } = await load();
        const providers = getLoginProviders();
        expect(providers.map((p) => p.id)).toEqual(["a", "b"]);
        expect(getProviderById("b")?.issuer).toBe("https://b.example.org");
        expect(getProviderById("missing")).toBeUndefined();
    });

    it.each([
        undefined,
        "",
        "not json",
        "{}",
        "[1]",
    ])("returns an empty list for %s", async (value) => {
        vi.stubEnv("LOGIN_PROVIDERS", value);
        const { getLoginProviders } = await load();
        expect(getLoginProviders()).toEqual([]);
    });
});

describe("getPublicProviders", () => {
    it("returns providers without secrets", async () => {
        baseEnv();
        const { getPublicProviders } = await load();
        expect(getPublicProviders()).toEqual([
            { id: "test", name: "Test IdP", logo: undefined },
        ]);
    });
});

describe("getSessionProvider", () => {
    it("finds the provider by the session cookie", async () => {
        baseEnv();
        const { getSessionProvider } = await load();
        expect(getSessionProvider("test", null)?.id).toBe("test");
    });

    it("falls back to the ID token issuer", async () => {
        baseEnv();
        const { getSessionProvider } = await load();
        expect(getSessionProvider(undefined, { iss: `${issuer}/` })?.id).toBe(
            "test",
        );
    });

    it("uses the only provider when nothing identifies the session", async () => {
        baseEnv();
        const { getSessionProvider } = await load();
        expect(getSessionProvider(undefined, null)?.id).toBe("test");
    });

    it("accepts the cookie provider when it matches the ID token issuer", async () => {
        baseEnv();
        const { getSessionProvider } = await load();
        expect(getSessionProvider("test", { iss: `${issuer}/` })?.id).toBe(
            "test",
        );
    });

    it("rejects the cookie provider when it differs from the ID token issuer", async () => {
        baseEnv();
        vi.stubEnv(
            "LOGIN_PROVIDERS",
            JSON.stringify([
                { id: "a", issuer, clientId: "c", clientSecret: "s" },
                {
                    id: "b",
                    issuer: "https://b.example.org",
                    clientId: "c",
                    clientSecret: "s",
                },
            ]),
        );
        const { getSessionProvider } = await load();
        // the session's ID token was issued by "a"; the cookie names "b"
        expect(getSessionProvider("b", { iss: issuer })).toBeUndefined();
        // without the conflicting cookie the issuer still resolves
        expect(getSessionProvider(undefined, { iss: issuer })?.id).toBe("a");
    });

    it("returns undefined for an unknown session", async () => {
        baseEnv();
        vi.stubEnv(
            "LOGIN_PROVIDERS",
            JSON.stringify([
                { id: "a", issuer, clientId: "c", clientSecret: "s" },
                {
                    id: "b",
                    issuer: "https://b.example.org",
                    clientId: "c",
                    clientSecret: "s",
                },
            ]),
        );
        const { getSessionProvider } = await load();
        expect(getSessionProvider(undefined, null)).toBeUndefined();
        expect(getSessionProvider("a", null)?.id).toBe("a");
    });
});

describe("getRedirectUri", () => {
    it("derives the callback URL from APP_ORIGIN", async () => {
        baseEnv();
        const { getRedirectUri } = await load();
        expect(getRedirectUri()).toBe(`${appOrigin}/auth/api/callback`);
    });

    it("honours OIDC_REDIRECT_URI", async () => {
        baseEnv();
        vi.stubEnv("OIDC_REDIRECT_URI", "https://app.example.org/custom");
        const { getRedirectUri } = await load();
        expect(getRedirectUri()).toBe("https://app.example.org/custom");
    });

    it("returns null without APP_ORIGIN or OIDC_REDIRECT_URI", async () => {
        vi.stubEnv("APP_ORIGIN", undefined);
        const { getRedirectUri } = await load();
        expect(getRedirectUri()).toBeNull();
    });
});

describe("getAppOrigin", () => {
    it("returns the origin of APP_ORIGIN", async () => {
        vi.stubEnv("APP_ORIGIN", `${appOrigin}/some/path`);
        const { getAppOrigin } = await load();
        expect(getAppOrigin()).toBe(appOrigin);
    });

    it.each([undefined, "not a url"])("returns null for %s", async (value) => {
        vi.stubEnv("APP_ORIGIN", value);
        const { getAppOrigin } = await load();
        expect(getAppOrigin()).toBeNull();
    });
});

describe("getEndpoints", () => {
    it("discovers the endpoints and caches them", async () => {
        mockOidcProvider();
        const { getEndpoints } = await load();
        const first = await getEndpoints(provider);
        const second = await getEndpoints(provider);
        expect(first).toEqual(endpoints);
        expect(second).toEqual(endpoints);
    });

    it("rejects a discovery document without an issuer", async () => {
        mockOidcProvider({ discovery: { issuer: undefined } });
        const { getEndpoints } = await load();
        const result = await getEndpoints(provider);
        expect(result).toBeNull();
    });

    it("rejects a discovery document of another issuer", async () => {
        mockOidcProvider({
            discovery: { issuer: "https://other.example.org" },
        });
        const { getEndpoints } = await load();
        expect(await getEndpoints(provider)).toBeNull();
    });

    it("rejects a document without the required endpoints", async () => {
        mockOidcProvider({
            discovery: {
                token_endpoint: undefined,
                authorization_endpoint: undefined,
            },
        });
        const { getEndpoints } = await load();
        expect(await getEndpoints(provider)).toBeNull();
    });

    it("returns null when discovery fails", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("err", { status: 500 })),
        );
        const { getEndpoints } = await load();
        expect(await getEndpoints(provider)).toBeNull();
    });

    it("returns null when discovery cannot be reached", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new Error("network down");
            }),
        );
        const { getEndpoints } = await load();
        expect(await getEndpoints(provider)).toBeNull();
    });

    it("returns null for an unreadable discovery document", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(
                async () =>
                    new Response("not json", {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    }),
            ),
        );
        const { getEndpoints } = await load();
        expect(await getEndpoints(provider)).toBeNull();
    });

    it("refetches for a different issuer", async () => {
        const fetchMock = mockOidcProvider();
        const { getEndpoints } = await load();
        await getEndpoints(provider);
        await getEndpoints({
            ...provider,
            issuer: "https://other.example.org",
        });
        // the other issuer's document doesn't match, but it was requested
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("refetches after the discovery cache expires", async () => {
        vi.useFakeTimers();
        const fetchMock = mockOidcProvider();
        const { getEndpoints } = await load();
        await getEndpoints(provider);
        vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
        await getEndpoints(provider);
        vi.useRealTimers();
        const discoveryCalls = fetchMock.mock.calls.filter(([input]) =>
            String(input).includes("openid-configuration"),
        );
        expect(discoveryCalls).toHaveLength(2);
    });
});

describe("login transaction", () => {
    it("creates unique state, nonce and verifier", async () => {
        const { createLoginTransaction } = await load();
        const a = createLoginTransaction("test");
        const b = createLoginTransaction("test");
        expect(a.providerId).toBe("test");
        expect(a.state).not.toBe(b.state);
        expect(a.nonce).not.toBe(b.nonce);
        expect(a.codeVerifier).not.toBe(b.codeVerifier);
        expect(a.codeVerifier.length).toBeGreaterThanOrEqual(43);
    });

    it("computes the PKCE S256 challenge (RFC 7636 example)", async () => {
        const { pkceChallenge } = await load();
        expect(
            pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
        ).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    });
});

describe("validateIdToken", () => {
    it("accepts a valid token and returns its payload", async () => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const token = signIdToken(validPayload);
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.toMatchObject({ sub: "u1", nonce: "n1" });
    });

    it("accepts an audience list with a matching azp and an issuer with a trailing slash", async () => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const token = signIdToken({
            ...validPayload,
            iss: `${issuer}/`,
            aud: ["other", "client"],
            azp: "client",
        });
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.not.toBeNull();
    });

    it.each([
        ["missing", undefined],
        ["for another client", "someone-else"],
    ])("rejects a multi-audience token with %s azp", async (_, azp) => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const token = signIdToken({
            ...validPayload,
            aud: ["other", "client"],
            azp,
        });
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.toBeNull();
    });

    it("skips the nonce check when none is expected", async () => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const { nonce: _, ...payload } = validPayload;
        const token = signIdToken(payload);
        await expect(
            validateIdToken(token, endpoints, provider, null),
        ).resolves.not.toBeNull();
    });

    it.each([
        ["not a JWT", "abc"],
        ["a bad header", "!!!.e30.c2ln"],
        ["a bad payload", null],
    ])("rejects %s", async (_, token) => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const bad =
            token ??
            `${Buffer.from(JSON.stringify({ alg: "RS256" })).toString("base64url")}.!!!.c2ln`;
        await expect(
            validateIdToken(bad, endpoints, provider, "n1"),
        ).resolves.toBeNull();
    });

    it("rejects a token without alg in the header", async () => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const header = Buffer.from(JSON.stringify({ kid: "k1" })).toString(
            "base64url",
        );
        const payload = Buffer.from(JSON.stringify(validPayload)).toString(
            "base64url",
        );
        await expect(
            validateIdToken(
                `${header}.${payload}.c2ln`,
                endpoints,
                provider,
                "n1",
            ),
        ).resolves.toBeNull();
    });

    it("rejects when no JWKS URI is advertised", async () => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const token = signIdToken(validPayload);
        await expect(
            validateIdToken(
                token,
                { ...endpoints, jwksUri: undefined },
                provider,
                "n1",
            ),
        ).resolves.toBeNull();
    });

    it("rejects when the JWKS cannot be fetched", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL) => {
                const url = String(input);
                if (url === jwksUri)
                    return new Response("err", { status: 500 });
                if (url === `${issuer}/.well-known/openid-configuration`)
                    return new Response(
                        JSON.stringify({
                            issuer,
                            authorization_endpoint: authorizationEndpoint,
                            token_endpoint: tokenEndpoint,
                            jwks_uri: jwksUri,
                        }),
                        { status: 200 },
                    );
                return new Response("nf", { status: 404 });
            }),
        );
        const { validateIdToken } = await load();
        await expect(
            validateIdToken(
                signIdToken(validPayload),
                endpoints,
                provider,
                "n1",
            ),
        ).resolves.toBeNull();
    });

    it("rejects when the JWKS document is malformed", async () => {
        mockOidcProvider({ jwks: { keys: "nope" } });
        const { validateIdToken } = await load();
        await expect(
            validateIdToken(
                signIdToken(validPayload),
                endpoints,
                provider,
                "n1",
            ),
        ).resolves.toBeNull();
    });

    it("rejects an unknown key id", async () => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const token = signIdToken(validPayload, { kid: "unknown" });
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.toBeNull();
    });

    it("refetches the JWKS once for an unknown key id", async () => {
        const other = providerJwk("k2");
        let jwksCalls = 0;
        const base = mockOidcProvider();
        const inner = base.getMockImplementation() as (
            input: RequestInfo | URL,
        ) => Promise<Response>;
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL) => {
                if (String(input) === jwksUri) {
                    jwksCalls += 1;
                    return new Response(
                        JSON.stringify({
                            keys: [jwksCalls === 1 ? providerJwk("k1") : other],
                        }),
                        { status: 200 },
                    );
                }
                return inner(input);
            }),
        );
        const { validateIdToken } = await load();
        // signed with the provider key but header claims k2: first lookup
        // misses, the refetch finds k2's JWK — but the signature was made
        // with the same key, so validation succeeds
        const token = signIdToken(validPayload, { kid: "k2" });
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.not.toBeNull();
        expect(jwksCalls).toBe(2);
    });

    it("rejects a token signed by another key", async () => {
        mockOidcProvider();
        const { generateKeyPairSync, createPrivateKey } = await import(
            "node:crypto"
        );
        const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
        const { validateIdToken } = await load();
        const token = signIdToken(validPayload, { key: other.privateKey });
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.toBeNull();
        void createPrivateKey;
    });

    it("rejects an unsupported algorithm", async () => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const token = signIdToken(validPayload, { alg: "HS256" });
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.toBeNull();
    });

    it("rejects a key that cannot be imported", async () => {
        mockOidcProvider({ jwks: { keys: ["not-a-jwk"] } });
        const { validateIdToken } = await load();
        // no kid in the header selects keys[0]
        const token = signIdToken(validPayload, { kid: null });
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.toBeNull();
    });

    it("rejects a token of another issuer", async () => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const token = signIdToken({
            ...validPayload,
            iss: "https://evil.example.org",
        });
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.toBeNull();
    });

    it("rejects a token without an issuer", async () => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const { iss: _, ...payload } = validPayload;
        const token = signIdToken(payload);
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.toBeNull();
    });

    it("uses the first JWKS key when the token has no key id", async () => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const token = signIdToken(validPayload, { kid: null });
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.not.toBeNull();
    });

    it("caches the JWKS between validations", async () => {
        const fetchMock = mockOidcProvider();
        const { validateIdToken } = await load();
        const token = signIdToken(validPayload);
        await validateIdToken(token, endpoints, provider, "n1");
        await validateIdToken(token, endpoints, provider, "n1");
        const jwksCalls = fetchMock.mock.calls.filter(([input]) =>
            String(input).includes("/jwks"),
        );
        expect(jwksCalls).toHaveLength(1);
    });

    it("refetches the JWKS after its cache expires", async () => {
        vi.useFakeTimers();
        const fetchMock = mockOidcProvider();
        const { validateIdToken } = await load();
        const token = signIdToken(validPayload);
        await validateIdToken(token, endpoints, provider, "n1");
        vi.setSystemTime(Date.now() + 2 * 60 * 60 * 1000);
        await validateIdToken(token, endpoints, provider, "n1");
        vi.useRealTimers();
        const jwksCalls = fetchMock.mock.calls.filter(([input]) =>
            String(input).includes("/jwks"),
        );
        expect(jwksCalls).toHaveLength(2);
    });

    it("rejects when the JWKS request fails", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL) => {
                if (String(input) === jwksUri) throw new Error("down");
                return new Response("nf", { status: 404 });
            }),
        );
        const { validateIdToken } = await load();
        await expect(
            validateIdToken(
                signIdToken(validPayload),
                endpoints,
                provider,
                "n1",
            ),
        ).resolves.toBeNull();
    });

    it("rejects when the JWKS document is not JSON", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL) => {
                if (String(input) === jwksUri)
                    return new Response("not json", { status: 200 });
                return new Response("nf", { status: 404 });
            }),
        );
        const { validateIdToken } = await load();
        await expect(
            validateIdToken(
                signIdToken(validPayload),
                endpoints,
                provider,
                "n1",
            ),
        ).resolves.toBeNull();
    });

    it("rejects when the JWKS refetch fails", async () => {
        let jwksCalls = 0;
        mockOidcProvider();
        const inner = globalThis.fetch;
        vi.stubGlobal(
            "fetch",
            vi.fn(async (input: RequestInfo | URL) => {
                if (String(input) === jwksUri) {
                    jwksCalls += 1;
                    if (jwksCalls > 1)
                        return new Response("err", { status: 500 });
                }
                return inner(input);
            }),
        );
        const { validateIdToken } = await load();
        const token = signIdToken(validPayload, { kid: "unknown" });
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.toBeNull();
    });

    it("rejects a token for another audience", async () => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const token = signIdToken({ ...validPayload, aud: ["someone-else"] });
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.toBeNull();
    });

    it("rejects a token without an audience", async () => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const { aud: _, ...payload } = validPayload;
        const token = signIdToken(payload);
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.toBeNull();
    });

    it.each([
        ["missing", undefined],
        ["not a number", "3600"],
        ["expired", Math.floor(Date.now() / 1000) - 3600],
    ])("rejects a token with %s exp", async (_, exp) => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const payload = { ...validPayload } as Record<string, unknown>;
        if (exp === undefined) delete payload.exp;
        else payload.exp = exp;
        const token = signIdToken(payload);
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.toBeNull();
    });

    it("accepts a token within the clock skew", async () => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const token = signIdToken({
            ...validPayload,
            exp: Math.floor(Date.now() / 1000) - 30,
        });
        await expect(
            validateIdToken(token, endpoints, provider, "n1"),
        ).resolves.not.toBeNull();
    });

    it("rejects a nonce mismatch", async () => {
        mockOidcProvider();
        const { validateIdToken } = await load();
        const token = signIdToken(validPayload);
        await expect(
            validateIdToken(token, endpoints, provider, "other"),
        ).resolves.toBeNull();
    });
});

describe("decodeJwtPayload", () => {
    it("decodes the payload without verifying", async () => {
        const { decodeJwtPayload } = await load();
        const token = signIdToken(validPayload);
        expect(decodeJwtPayload(token)).toMatchObject({ sub: "u1" });
    });

    it.each(["abc", "a.!!!.c"])("returns null for %s", async (token) => {
        const { decodeJwtPayload } = await load();
        expect(decodeJwtPayload(token)).toBeNull();
    });
});

describe("groups and tiers", () => {
    it("extracts groups from a string or array claim", async () => {
        const { extractGroups } = await load();
        expect(extractGroups({ g: "a" }, "g")).toEqual(["a"]);
        expect(extractGroups({ g: ["a", 1, "b"] }, "g")).toEqual(["a", "b"]);
        expect(extractGroups({ g: 5 }, "g")).toEqual([]);
        expect(extractGroups(null, "g")).toEqual([]);
        expect(extractGroups({ g: "a" }, undefined)).toEqual([]);
    });

    it("matches configured groups exactly and by subgroup prefix", async () => {
        const { matchConfiguredGroups } = await load();
        expect(
            matchConfiguredGroups(
                ["compute", "compute:wg1", "other"],
                ["compute"],
                ":",
            ),
        ).toEqual(["compute"]);
        expect(
            matchConfiguredGroups(["compute:wg1"], ["compute"], undefined),
        ).toEqual([]);
        expect(
            matchConfiguredGroups(["compute"], ["compute"], undefined),
        ).toEqual(["compute"]);
    });

    it("derives tiers with admin above compute", async () => {
        const { deriveTier } = await load();
        const cfg: LoginProvider = {
            ...provider,
            computeGroups: ["compute"],
            adminGroups: ["admin"],
        };
        expect(deriveTier(["admin"], cfg)).toBe("admin");
        expect(deriveTier(["admin", "compute"], cfg)).toBe("admin");
        expect(deriveTier(["compute"], cfg)).toBe("compute");
        expect(
            deriveTier(["compute:sub"], {
                ...cfg,
                groupSubgroupSeparator: ":",
            }),
        ).toBe("compute");
        expect(deriveTier([], cfg)).toBe("user");
        expect(deriveTier(["other"], cfg)).toBe("user");
    });
});

describe("getUserSession", () => {
    const sessionConfig: LoginProvider = {
        ...provider,
        groupsClaim: "groups",
        computeGroups: ["compute"],
        adminGroups: ["admin"],
    };

    it("returns userinfo claims, groups and tier", async () => {
        mockOidcProvider({
            userinfo: { sub: "u1", name: "User", groups: ["compute"] },
        });
        const { getUserSession } = await load();
        const session = await getUserSession(
            "at",
            { sub: "u1" },
            endpoints,
            sessionConfig,
        );
        expect(session).toEqual({
            user: { sub: "u1", name: "User", groups: ["compute"] },
            groups: ["compute"],
            tier: "compute",
        });
    });

    it("caches the session for five minutes", async () => {
        const fetchMock = mockOidcProvider({
            userinfo: { sub: "u1", groups: ["admin"] },
        });
        const { getUserSession } = await load();
        await getUserSession("at", { sub: "u1" }, endpoints, sessionConfig);
        await getUserSession("at", { sub: "u1" }, endpoints, sessionConfig);
        const userinfoCalls = fetchMock.mock.calls.filter(([input]) =>
            String(input).includes("userinfo"),
        );
        expect(userinfoCalls).toHaveLength(1);
    });

    it("refetches after the cache expires", async () => {
        vi.useFakeTimers();
        const fetchMock = mockOidcProvider({
            userinfo: { sub: "u1", groups: ["admin"] },
        });
        const { getUserSession } = await load();
        await getUserSession("at", { sub: "u1" }, endpoints, sessionConfig);
        vi.setSystemTime(Date.now() + 6 * 60 * 1000);
        await getUserSession("at", { sub: "u1" }, endpoints, sessionConfig);
        vi.useRealTimers();
        const userinfoCalls = fetchMock.mock.calls.filter(([input]) =>
            String(input).includes("userinfo"),
        );
        expect(userinfoCalls).toHaveLength(2);
    });

    it("reads groups from the ID token when configured", async () => {
        mockOidcProvider({ userinfo: { sub: "u1" } });
        const { getUserSession } = await load();
        const session = await getUserSession(
            "at",
            { sub: "u1", groups: ["admin"] },
            endpoints,
            { ...sessionConfig, groupsFromUserinfo: false },
        );
        expect(session?.groups).toEqual(["admin"]);
        expect(session?.tier).toBe("admin");
    });

    it("uses the ID token claims when there is no userinfo endpoint", async () => {
        mockOidcProvider();
        const { getUserSession } = await load();
        const session = await getUserSession(
            "at",
            { sub: "u1", groups: ["compute"] },
            { ...endpoints, userinfoEndpoint: undefined },
            { ...sessionConfig, groupsFromUserinfo: false },
        );
        expect(session?.user).toEqual({ sub: "u1", groups: ["compute"] });
        expect(session?.tier).toBe("compute");
    });

    it("clears the session cache when it reaches the size limit", async () => {
        const fetchMock = mockOidcProvider({
            userinfo: { sub: "u1", groups: ["compute"] },
        });
        const { getUserSession } = await load();
        const userinfoCalls = () =>
            fetchMock.mock.calls.filter(([input]) =>
                String(input).includes("userinfo"),
            ).length;

        for (let i = 0; i < 1000; i++) {
            await getUserSession(
                `at-${i}`,
                { sub: "u1" },
                endpoints,
                sessionConfig,
            );
        }
        expect(userinfoCalls()).toBe(1000);

        // the next insert clears the cache, so a repeat token refetches
        await getUserSession("at-new", { sub: "u1" }, endpoints, sessionConfig);
        await getUserSession("at-0", { sub: "u1" }, endpoints, sessionConfig);
        expect(userinfoCalls()).toBe(1002);
    });

    it("rejects userinfo for a different subject", async () => {
        mockOidcProvider({ userinfo: { sub: "u2", groups: ["admin"] } });
        const { getUserSession } = await load();
        await expect(
            getUserSession("at", { sub: "u1" }, endpoints, sessionConfig),
        ).resolves.toBeNull();
    });

    it("rejects userinfo without a subject claim", async () => {
        mockOidcProvider({ userinfo: { name: "No Sub" } });
        const { getUserSession } = await load();
        await expect(
            getUserSession("at", { sub: "u1" }, endpoints, sessionConfig),
        ).resolves.toBeNull();
    });

    it("rejects userinfo when the ID token has no subject", async () => {
        mockOidcProvider({ userinfo: { sub: "u1" } });
        const { getUserSession } = await load();
        await expect(
            getUserSession("at", null, endpoints, sessionConfig),
        ).resolves.toBeNull();
    });

    it("rejects a non-object userinfo document", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(
                async () =>
                    new Response(JSON.stringify(["u1"]), {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    }),
            ),
        );
        const { getUserSession } = await load();
        await expect(
            getUserSession("at", { sub: "u1" }, endpoints, sessionConfig),
        ).resolves.toBeNull();
    });

    it("returns null when userinfo fails", async () => {
        mockOidcProvider({ userinfoStatus: 401 });
        const { getUserSession } = await load();
        await expect(
            getUserSession("at", null, endpoints, sessionConfig),
        ).resolves.toBeNull();
    });

    it("returns null when userinfo is unreachable", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw new Error("down");
            }),
        );
        const { getUserSession } = await load();
        await expect(
            getUserSession("at", null, endpoints, sessionConfig),
        ).resolves.toBeNull();
    });

    it("returns an empty user without claims or a userinfo endpoint", async () => {
        mockOidcProvider();
        const { getUserSession } = await load();
        const session = await getUserSession(
            "at",
            null,
            { ...endpoints, userinfoEndpoint: undefined },
            sessionConfig,
        );
        expect(session?.user).toEqual({});
        expect(session?.tier).toBe("user");
    });

    it("returns null for an unreadable userinfo document", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(
                async () =>
                    new Response("not json", {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                    }),
            ),
        );
        const { getUserSession } = await load();
        await expect(
            getUserSession("at", null, endpoints, sessionConfig),
        ).resolves.toBeNull();
    });
});
