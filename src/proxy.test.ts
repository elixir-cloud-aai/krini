import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

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
