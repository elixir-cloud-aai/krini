import { afterEach, describe, expect, it, vi } from "vitest";
import { providersJson } from "@/test/oidc";
import {
    enforceSettings,
    getComputeAccessRequestUrl,
    validateSettings,
} from "./settings";

function setUp(overrides: Record<string, string | undefined> = {}) {
    vi.stubEnv(
        "LOGIN_PROVIDERS",
        providersJson({ computeGroups: ["compute"] }),
    );
    vi.stubEnv("APP_ORIGIN", "https://app.example.org");
    vi.stubEnv("CLOUD_REGISTRY_URL", "https://registry.example.org/v1");
    vi.stubEnv("OIDC_REDIRECT_URI", undefined);
    vi.stubEnv("COMPUTE_ACCESS_REQUEST_URL", undefined);
    vi.stubEnv("TASK_EXAMPLES", undefined);
    vi.stubEnv("WORKFLOW_EXAMPLES", undefined);
    for (const [key, value] of Object.entries(overrides))
        vi.stubEnv(key, value);
}

describe("validateSettings", () => {
    it("accepts a complete configuration", () => {
        setUp();
        expect(validateSettings()).toEqual({ fatal: [], warnings: [] });
    });

    it("requires LOGIN_PROVIDERS", () => {
        setUp({ LOGIN_PROVIDERS: undefined });
        expect(validateSettings().fatal).toContainEqual({
            setting: "LOGIN_PROVIDERS",
            problem: "is not set",
        });
    });

    it.each([
        ["not JSON", "{"],
        ["not an array", "{}"],
        ["empty", "[]"],
    ])("rejects LOGIN_PROVIDERS that is %s", (_, value) => {
        setUp({ LOGIN_PROVIDERS: value });
        expect(validateSettings().fatal.length).toBeGreaterThan(0);
    });

    it("warns about each invalid provider entry when another is usable", () => {
        setUp({
            LOGIN_PROVIDERS: JSON.stringify([
                { id: "broken", issuer: "https://i.example.org" },
                "not-an-object",
                {
                    id: "dup",
                    issuer: "https://i.example.org",
                    clientId: "c",
                    clientSecret: "s3cr3t-value",
                },
                {
                    id: "dup",
                    issuer: "https://i.example.org",
                    clientId: "c",
                    clientSecret: "s3cr3t-value",
                },
            ]),
        });
        const { fatal, warnings } = validateSettings();
        const problems = warnings
            .filter((p) => p.setting === "LOGIN_PROVIDERS")
            .map((p) => p.problem);
        expect(problems).toEqual(
            expect.arrayContaining([
                'entry "broken" has no clientId',
                'entry "broken" has no clientSecret',
                "entry 2 is not an object",
                'entry "dup" has a duplicate id',
            ]),
        );
        expect(fatal.filter((p) => p.setting === "LOGIN_PROVIDERS")).toEqual(
            [],
        );
        // secret values never appear in the report (field names may)
        expect(JSON.stringify({ fatal, warnings })).not.toContain(
            "s3cr3t-value",
        );
    });

    it("rejects entry problems when no provider is usable", () => {
        setUp({
            LOGIN_PROVIDERS: JSON.stringify([
                { id: "broken", issuer: "https://i.example.org" },
            ]),
        });
        const { fatal } = validateSettings();
        expect(fatal).toEqual(
            expect.arrayContaining([
                {
                    setting: "LOGIN_PROVIDERS",
                    problem: 'entry "broken" has no clientId',
                },
                {
                    setting: "LOGIN_PROVIDERS",
                    problem: "has no valid provider",
                },
            ]),
        );
    });

    it("requires APP_ORIGIN and CLOUD_REGISTRY_URL", () => {
        setUp({
            APP_ORIGIN: undefined,
            CLOUD_REGISTRY_URL: undefined,
        });
        const { fatal } = validateSettings();
        expect(fatal).toEqual(
            expect.arrayContaining([
                { setting: "APP_ORIGIN", problem: "is not set" },
                {
                    setting: "CLOUD_REGISTRY_URL",
                    problem: "is not set",
                },
            ]),
        );
    });

    it("rejects non-http APP_ORIGIN and CLOUD_REGISTRY_URL", () => {
        setUp({
            APP_ORIGIN: "ftp://app.example.org",
            CLOUD_REGISTRY_URL: "not a url",
        });
        const { fatal } = validateSettings();
        expect(fatal).toEqual(
            expect.arrayContaining([
                {
                    setting: "APP_ORIGIN",
                    problem: "is not a valid http(s) URL",
                },
                {
                    setting: "CLOUD_REGISTRY_URL",
                    problem: "is not a valid URL",
                },
            ]),
        );
    });

    it("rejects a non-https APP_ORIGIN in production", () => {
        setUp({
            NODE_ENV: "production",
            APP_ORIGIN: "http://app.example.org",
        });
        expect(validateSettings().fatal).toContainEqual({
            setting: "APP_ORIGIN",
            problem:
                "must use https in production (http is allowed only for localhost)",
        });
    });

    it.each([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://[::1]:3000",
    ])("accepts the localhost APP_ORIGIN %s in production", (origin) => {
        setUp({ NODE_ENV: "production", APP_ORIGIN: origin });
        expect(validateSettings().fatal).toEqual([]);
    });

    it("accepts an https APP_ORIGIN in production", () => {
        setUp({
            NODE_ENV: "production",
            APP_ORIGIN: "https://app.example.org",
        });
        expect(validateSettings().fatal).toEqual([]);
    });

    it("accepts an http APP_ORIGIN outside production", () => {
        setUp({ APP_ORIGIN: "http://app.example.org" });
        expect(validateSettings().fatal).toEqual([]);
    });

    it("rejects an unparseable APP_ORIGIN", () => {
        setUp({ APP_ORIGIN: "not a url" });
        expect(validateSettings().fatal).toContainEqual({
            setting: "APP_ORIGIN",
            problem: "is not a valid http(s) URL",
        });
    });

    it("rejects a non-http CLOUD_REGISTRY_URL", () => {
        setUp({ CLOUD_REGISTRY_URL: "ftp://registry.example.org" });
        expect(validateSettings().fatal).toContainEqual({
            setting: "CLOUD_REGISTRY_URL",
            problem: "is not a valid URL",
        });
    });

    it.each([
        "https://registry.example.org/v1?foo=bar",
        "https://registry.example.org/v1#frag",
    ])("rejects a CLOUD_REGISTRY_URL with query or fragment: %s", (url) => {
        setUp({ CLOUD_REGISTRY_URL: url });
        expect(validateSettings().fatal).toContainEqual({
            setting: "CLOUD_REGISTRY_URL",
            problem: "must not contain a query or fragment",
        });
    });

    it("requires OIDC_REDIRECT_URI on the origin of APP_ORIGIN", () => {
        setUp({
            OIDC_REDIRECT_URI: "https://other.example.org/auth/api/callback",
        });
        expect(validateSettings().fatal).toContainEqual({
            setting: "OIDC_REDIRECT_URI",
            problem:
                "must be an http(s) URL on the origin of APP_ORIGIN with path /auth/api/callback",
        });
    });

    it("accepts OIDC_REDIRECT_URI on the origin of APP_ORIGIN", () => {
        setUp({
            OIDC_REDIRECT_URI: "https://app.example.org/auth/api/callback",
        });
        expect(validateSettings().fatal).toEqual([]);
    });

    it("warns on an invalid COMPUTE_ACCESS_REQUEST_URL", () => {
        setUp({ COMPUTE_ACCESS_REQUEST_URL: "not a url" });
        expect(validateSettings().warnings).toContainEqual({
            setting: "COMPUTE_ACCESS_REQUEST_URL",
            problem: "is not a valid http(s) URL; the link is ignored",
        });
    });

    it("warns on invalid TASK_EXAMPLES and WORKFLOW_EXAMPLES", () => {
        setUp({
            TASK_EXAMPLES: "{",
            WORKFLOW_EXAMPLES: JSON.stringify([{ name: "No run" }]),
        });
        const { fatal, warnings } = validateSettings();
        expect(fatal).toEqual([]);
        expect(warnings).toEqual([
            {
                setting: "TASK_EXAMPLES",
                problem: "is not valid JSON; the built-in examples are used",
            },
            {
                setting: "WORKFLOW_EXAMPLES",
                problem: "entry 1 has no run; the entry is left out",
            },
        ]);
    });

    it("warns when no provider has compute or admin groups", () => {
        setUp({
            LOGIN_PROVIDERS: JSON.stringify([
                {
                    id: "p",
                    issuer: "https://i.example.org",
                    clientId: "c",
                    clientSecret: "s",
                },
            ]),
        });
        expect(validateSettings().warnings).toContainEqual({
            setting: "LOGIN_PROVIDERS",
            problem:
                "no provider has computeGroups or adminGroups: nobody can run tasks or workflows",
        });
    });

    it("rejects LOGIN_PROVIDERS with no valid provider", () => {
        setUp({ LOGIN_PROVIDERS: JSON.stringify([{ id: "x" }]) });
        expect(validateSettings().fatal).toContainEqual({
            setting: "LOGIN_PROVIDERS",
            problem: "has no valid provider",
        });
    });

    it("rejects a non-http OIDC_REDIRECT_URI", () => {
        setUp({ OIDC_REDIRECT_URI: "ftp://app.example.org/cb" });
        expect(validateSettings().fatal).toContainEqual({
            setting: "OIDC_REDIRECT_URI",
            problem:
                "must be an http(s) URL on the origin of APP_ORIGIN with path /auth/api/callback",
        });
    });

    it("rejects an OIDC_REDIRECT_URI with a wrong path", () => {
        setUp({
            OIDC_REDIRECT_URI: "https://app.example.org/auth/callback",
        });
        expect(validateSettings().fatal).toContainEqual({
            setting: "OIDC_REDIRECT_URI",
            problem:
                "must be an http(s) URL on the origin of APP_ORIGIN with path /auth/api/callback",
        });
    });

    it("rejects an unparseable OIDC_REDIRECT_URI", () => {
        setUp({ OIDC_REDIRECT_URI: "not a url" });
        expect(validateSettings().fatal).toContainEqual({
            setting: "OIDC_REDIRECT_URI",
            problem: "is not a valid URL",
        });
    });

    it("reports an entry with an empty id by position", () => {
        setUp({
            LOGIN_PROVIDERS: JSON.stringify([
                {
                    id: "",
                    issuer: "https://i.example.org",
                    clientId: "c",
                    clientSecret: "s",
                },
            ]),
        });
        expect(validateSettings().fatal).toContainEqual({
            setting: "LOGIN_PROVIDERS",
            problem: "entry 1 has no id",
        });
    });

    it("checks OIDC_REDIRECT_URI's protocol when APP_ORIGIN is unset", () => {
        setUp({
            APP_ORIGIN: undefined,
            OIDC_REDIRECT_URI: "https://app.example.org/auth/api/callback",
        });
        const { fatal } = validateSettings();
        expect(fatal).toContainEqual({
            setting: "APP_ORIGIN",
            problem: "is not set",
        });
        expect(fatal.filter((p) => p.setting === "OIDC_REDIRECT_URI")).toEqual(
            [],
        );
    });

    it("doesn't warn when a provider has compute groups", () => {
        setUp({
            LOGIN_PROVIDERS: JSON.stringify([
                {
                    id: "p",
                    issuer: "https://i.example.org",
                    clientId: "c",
                    clientSecret: "s",
                    computeGroups: ["compute"],
                },
            ]),
        });
        expect(validateSettings().warnings).toEqual([]);
    });
});

describe("getComputeAccessRequestUrl", () => {
    it("returns the URL when it is a valid http(s) URL", () => {
        setUp({ COMPUTE_ACCESS_REQUEST_URL: "https://example.org/access" });
        expect(getComputeAccessRequestUrl()).toBe("https://example.org/access");
    });

    it("returns null when unset or invalid", () => {
        setUp();
        expect(getComputeAccessRequestUrl()).toBeNull();
        vi.stubEnv("COMPUTE_ACCESS_REQUEST_URL", "javascript:alert(1)");
        expect(getComputeAccessRequestUrl()).toBeNull();
    });
});

describe("enforceSettings", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("starts silently on a complete configuration", () => {
        setUp();
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const exit = vi.spyOn(process, "exit").mockImplementation((() => {
            throw new Error("exit");
        }) as never);
        enforceSettings();
        expect(warn).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
        expect(exit).not.toHaveBeenCalled();
    });

    it("warns and starts on warnings only", () => {
        setUp({ COMPUTE_ACCESS_REQUEST_URL: "bad" });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const exit = vi.spyOn(process, "exit").mockImplementation((() => {
            throw new Error("exit");
        }) as never);
        enforceSettings();
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining("COMPUTE_ACCESS_REQUEST_URL"),
        );
        expect(error).not.toHaveBeenCalled();
        expect(exit).not.toHaveBeenCalled();
    });

    it("logs every fatal problem and refuses to start", () => {
        setUp({ APP_ORIGIN: undefined, CLOUD_REGISTRY_URL: undefined });
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        const error = vi.spyOn(console, "error").mockImplementation(() => {});
        const exit = vi
            .spyOn(process, "exit")
            .mockImplementation((() => undefined) as never);
        enforceSettings();
        expect(error).toHaveBeenCalledWith(
            expect.stringContaining("APP_ORIGIN"),
        );
        expect(error).toHaveBeenCalledWith(
            expect.stringContaining("CLOUD_REGISTRY_URL"),
        );
        expect(error).toHaveBeenCalledWith(
            expect.stringContaining("refusing to start"),
        );
        expect(exit).toHaveBeenCalledWith(1);
        expect(warn).not.toHaveBeenCalled();
    });
});
