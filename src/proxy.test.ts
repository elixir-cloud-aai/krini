import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { config, proxy } from "./proxy";

describe("config", () => {
    // Next.js matches the source against the whole path
    const matches = (path: string) =>
        new RegExp(`^${config.matcher[0].source}$`).test(path);

    it("covers pages and API routes", () => {
        for (const path of [
            "/",
            "/dashboard",
            "/dashboard/workflows/create",
            "/privacy",
            "/auth/api/token",
            "/api/tasks/get-tes-servers",
        ]) {
            expect(matches(path), path).toBe(true);
        }
    });

    it("skips static files", () => {
        for (const path of [
            "/_next/static/chunks/main.js",
            "/_next/image",
            "/ace/worker-json.js",
            "/favicon.ico",
        ]) {
            expect(matches(path), path).toBe(false);
        }
    });
});

describe("proxy", () => {
    it("sends a policy with a new nonce for each request", () => {
        const first = proxy(new NextRequest("http://localhost:3000/dashboard"));
        const second = proxy(
            new NextRequest("http://localhost:3000/dashboard"),
        );

        const policy = first.headers.get("Content-Security-Policy");
        expect(policy).toMatch(
            /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
        );
        expect(second.headers.get("Content-Security-Policy")).not.toBe(policy);
    });

    it("passes the nonce on to the rendering", () => {
        const response = proxy(
            new NextRequest("http://localhost:3000/dashboard"),
        );

        const policy = response.headers.get("Content-Security-Policy") ?? "";
        const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];
        // `NextResponse.next()` hands changed request headers on as
        // `x-middleware-request-<name>`
        expect(response.headers.get("x-middleware-request-x-nonce")).toBe(
            nonce,
        );
        expect(
            response.headers.get(
                "x-middleware-request-content-security-policy",
            ),
        ).toBe(policy);
    });
});

describe("proxy at another host", () => {
    it("redirects permanently to APP_ORIGIN, with path and query", () => {
        vi.stubEnv("APP_ORIGIN", "https://portal.example.org");
        const response = proxy(
            new NextRequest("https://old.example.org/dashboard?tab=1", {
                headers: { host: "old.example.org" },
            }),
        );

        expect(response.status).toBe(308);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(response.headers.get("location")).toBe(
            "https://portal.example.org/dashboard?tab=1",
        );
    });

    it("serves the host of APP_ORIGIN", () => {
        vi.stubEnv("APP_ORIGIN", "https://portal.example.org");
        const response = proxy(
            new NextRequest("https://portal.example.org/dashboard", {
                headers: { host: "portal.example.org" },
            }),
        );

        expect(response.headers.get("location")).toBeNull();
        expect(response.headers.get("Content-Security-Policy")).toBeTruthy();
    });
});
