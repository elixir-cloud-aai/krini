import { describe, expect, it } from "vitest";
import {
    contentSecurityPolicy,
    createNonce,
    securityHeaders,
} from "./security-headers";

/**
 * Split a policy into its directives
 * @param policy Value of a `Content-Security-Policy` header
 * @returns The sources of each directive, by name
 */
function directives(policy: string): Record<string, string[]> {
    return Object.fromEntries(
        policy.split(";").map((directive) => {
            const [name, ...sources] = directive.trim().split(/\s+/);
            return [name, sources];
        }),
    );
}

describe("contentSecurityPolicy", () => {
    it("allows only scripts with the nonce", () => {
        const policy = directives(contentSecurityPolicy("abc123"));

        expect(policy["script-src"]).toEqual([
            "'self'",
            "'nonce-abc123'",
            "'strict-dynamic'",
        ]);
        expect(policy["script-src"]).not.toContain("'unsafe-inline'");
        expect(policy["script-src"]).not.toContain("'unsafe-eval'");
    });

    it("allows no third-party scripts, frames, plugins or bases", () => {
        const policy = directives(contentSecurityPolicy("abc123"));

        expect(policy["default-src"]).toEqual(["'self'"]);
        expect(policy["worker-src"]).toEqual(["'self'"]);
        expect(policy["frame-ancestors"]).toEqual(["'none'"]);
        expect(policy["object-src"]).toEqual(["'none'"]);
        expect(policy["base-uri"]).toEqual(["'self'"]);
        expect(policy["form-action"]).toEqual(["'self'"]);
        expect(contentSecurityPolicy("abc123")).not.toContain("jsdelivr");
    });

    it("lets the browser call the TES and WES services", () => {
        const policy = directives(contentSecurityPolicy("abc123"));

        expect(policy["connect-src"]).toEqual(["'self'", "https:"]);
    });

    it("allows the logos of the login providers from https URLs", () => {
        const policy = directives(contentSecurityPolicy("abc123"));

        expect(policy["img-src"]).toEqual([
            "'self'",
            "https:",
            "data:",
            "blob:",
        ]);
    });

    it("allows eval only in development", () => {
        const policy = directives(contentSecurityPolicy("abc123", true));

        expect(policy["script-src"]).toContain("'unsafe-eval'");
    });

    it("allows WebSockets only in development, for the hot reload", () => {
        expect(
            directives(contentSecurityPolicy("abc123", true))["connect-src"],
        ).toEqual(["'self'", "https:", "ws:", "wss:"]);
        expect(
            directives(contentSecurityPolicy("abc123"))["connect-src"],
        ).toEqual(["'self'", "https:"]);
    });

    it("is one line", () => {
        expect(contentSecurityPolicy("abc123")).not.toMatch(/[\r\n]/);
    });
});

describe("createNonce", () => {
    it("creates a new base64 value each time", () => {
        const first = createNonce();
        const second = createNonce();

        expect(first).toMatch(/^[A-Za-z0-9+/]{22}==$/);
        expect(second).not.toBe(first);
    });
});

describe("securityHeaders", () => {
    it("sets the headers of every response", () => {
        expect(
            Object.fromEntries(
                securityHeaders(true).map(({ key, value }) => [key, value]),
            ),
        ).toEqual({
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Strict-Transport-Security": "max-age=63072000",
        });
    });

    it("sends no HSTS in development", () => {
        expect(securityHeaders(false).map(({ key }) => key)).not.toContain(
            "Strict-Transport-Security",
        );
    });
});
