import { afterEach, describe, expect, it, vi } from "vitest";
import { providersJson } from "@/test/oidc";
import { enforceSettings, validateSettings } from "./settings";

function setUp(overrides: Record<string, string | undefined> = {}) {
    vi.stubEnv(
        "LOGIN_PROVIDERS",
        providersJson({ computeGroups: ["compute"] }),
    );
    vi.stubEnv("APP_ORIGIN", "https://app.example.org");
    vi.stubEnv("CLOUD_REGISTRY_URL", "https://registry.example.org/v1");
    vi.stubEnv("OIDC_REDIRECT_URI", undefined);
    vi.stubEnv("COMPUTE_ACCESS_REQUEST_URL", undefined);
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

    it("names each invalid provider entry and its missing field", () => {
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
        const { fatal } = validateSettings();
        const problems = fatal
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
        // secret values never appear in the report (field names may)
        expect(JSON.stringify(fatal)).not.toContain("s3cr3t-value");
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

    it("requires OIDC_REDIRECT_URI on the origin of APP_ORIGIN", () => {
        setUp({
            OIDC_REDIRECT_URI: "https://other.example.org/auth/api/callback",
        });
        expect(validateSettings().fatal).toContainEqual({
            setting: "OIDC_REDIRECT_URI",
            problem: "must be an http(s) URL on the origin of APP_ORIGIN",
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
            problem: "must be an http(s) URL on the origin of APP_ORIGIN",
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
            OIDC_REDIRECT_URI: "https://app.example.org/cb",
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
