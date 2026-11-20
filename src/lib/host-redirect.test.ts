import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { hostRedirect } from "./host-redirect";

const appOrigin = "https://portal.example.org";

/** A request to `url`, with the `Host` header that browsers send for it */
function request(url: string, host = new URL(url).host): NextRequest {
    return new NextRequest(url, { headers: { host } });
}

describe("hostRedirect", () => {
    it("sends other hosts to APP_ORIGIN, with path and query", () => {
        vi.stubEnv("APP_ORIGIN", appOrigin);
        expect(
            hostRedirect(
                request("https://old.example.org/dashboard/tasks?id=1&x=%20"),
            )?.toString(),
        ).toBe("https://portal.example.org/dashboard/tasks?id=1&x=%20");
    });

    it("sends other public hosts to APP_ORIGIN", () => {
        vi.stubEnv("APP_ORIGIN", appOrigin);
        for (const host of [
            "krini.rahtiapp.fi",
            "portal.example.org.evil.example",
            "svc.example.org",
            "1.2.3.4.example.org",
            "app.team.svc.example.org",
        ]) {
            expect(
                hostRedirect(request("https://x.example.org/", host))?.host,
                host,
            ).toBe("portal.example.org");
        }
    });

    it("sends the start of the login to APP_ORIGIN", () => {
        vi.stubEnv("APP_ORIGIN", appOrigin);
        expect(
            hostRedirect(
                request("https://old.example.org/auth/api/login?provider=a"),
            )?.toString(),
        ).toBe("https://portal.example.org/auth/api/login?provider=a");
    });

    it("leaves requests to the host of APP_ORIGIN alone", () => {
        vi.stubEnv("APP_ORIGIN", appOrigin);
        for (const host of [
            "portal.example.org",
            "PORTAL.example.org",
            "portal.example.org:443",
            "portal.example.org.",
        ]) {
            expect(
                hostRedirect(request("https://portal.example.org/", host)),
                host,
            ).toBeNull();
        }
    });

    it("accepts a trailing dot in APP_ORIGIN", () => {
        vi.stubEnv("APP_ORIGIN", "https://portal.example.org.");
        for (const host of ["portal.example.org", "portal.example.org."]) {
            expect(
                hostRedirect(request("https://portal.example.org/", host)),
                host,
            ).toBeNull();
        }
    });

    it("leaves internal addresses alone (health checks)", () => {
        vi.stubEnv("APP_ORIGIN", appOrigin);
        for (const host of [
            "10.1.2.3:3000",
            "127.0.0.1:3000",
            "[fd00::1]:3000",
            "[::1]",
            "localhost:3000",
            "krini:3000",
            "krini.portal.svc",
            "krini.portal.svc.cluster.local:3000",
        ]) {
            expect(
                hostRedirect(request("http://10.1.2.3:3000/privacy", host)),
                host,
            ).toBeNull();
        }
    });

    it("leaves requests without a valid host alone", () => {
        vi.stubEnv("APP_ORIGIN", appOrigin);
        for (const host of ["", "bad host", "a:b:c"]) {
            expect(
                hostRedirect(request("https://old.example.org/", host)),
                host,
            ).toBeNull();
        }
    });

    it("does nothing without a valid APP_ORIGIN", () => {
        for (const value of [undefined, "", "not a url"]) {
            vi.stubEnv("APP_ORIGIN", value);
            expect(
                hostRedirect(request("https://old.example.org/")),
                String(value),
            ).toBeNull();
        }
    });

    it.each([
        "false",
        " FALSE ",
    ])("can be switched off (REDIRECT_TO_APP_ORIGIN=%s)", (value) => {
        vi.stubEnv("APP_ORIGIN", appOrigin);
        vi.stubEnv("REDIRECT_TO_APP_ORIGIN", value);
        expect(hostRedirect(request("https://old.example.org/"))).toBeNull();
    });

    it.each([
        "true",
        "",
    ])("stays on with REDIRECT_TO_APP_ORIGIN=%j", (value) => {
        vi.stubEnv("APP_ORIGIN", appOrigin);
        vi.stubEnv("REDIRECT_TO_APP_ORIGIN", value);
        expect(
            hostRedirect(request("https://old.example.org/"))?.toString(),
        ).toBe("https://portal.example.org/");
    });
});
