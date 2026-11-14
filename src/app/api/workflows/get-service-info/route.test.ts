import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { services, verifications, verificationsOf } from "@/test/registry";
import {
    appOrigin,
    http,
    httpError,
    networkError,
    registryUrl,
    setUp,
} from "@/test/routes";

const wesUrl = "https://wes.example.org/ga4gh/wes/v1";
const serviceInfo = { id: "wes", name: "WES", workflow_type_versions: {} };
const wesType = { group: "org.ga4gh", artifact: "wes", version: "1.1.0" };
const registryOptions = {
    timeout: 8000,
    signal: expect.any(AbortSignal),
    headers: { Accept: "application/json" },
};

beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
});

/**
 * Get the service info of a WES service from the registry
 * @param id Registry ID of the service (undefined: no `id` parameter)
 * @param services Services in the registry, or an error to throw
 * @param info Service info of the WES service, or an error to throw
 * @param verified Verifications of the registry, or an error to throw
 *     (default: every service with an ID is verified)
 */
async function serviceInfoOf(
    id: string | undefined,
    entries: unknown = [{ id: "wes", url: wesUrl, type: wesType }],
    info: unknown = serviceInfo,
    verified: unknown = verificationsOf(entries),
) {
    setUp();
    const get = vi.spyOn(await http(), "get");
    get.mockImplementation(async (url) => {
        const reply =
            url === `${registryUrl}/services`
                ? entries
                : url === `${registryUrl}/verifications`
                  ? verified
                  : info;
        if (reply instanceof Error) throw reply;
        return { status: 200, data: reply };
    });
    const { GET } = await import("./route");
    const query = id === undefined ? "" : `?id=${encodeURIComponent(id)}`;
    const response = await GET(
        new NextRequest(`${appOrigin}/api/workflows/get-service-info${query}`),
    );
    return { response, get };
}

describe("GET /api/workflows/get-service-info", () => {
    it("returns the service info of a registered WES service", async () => {
        const { response, get } = await serviceInfoOf("wes");
        expect(response.status).toBe(200);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(await response.json()).toEqual({
            ...serviceInfo,
            url: `${wesUrl}/service-info`,
        });
        expect(get.mock.calls).toEqual([
            [`${registryUrl}/services`, registryOptions],
            [`${registryUrl}/verifications`, registryOptions],
            [
                `${wesUrl}/service-info`,
                { maxRedirects: 0, headers: { Accept: "application/json" } },
            ],
        ]);
    });

    it("accepts WES URLs with a trailing slash and a path prefix", async () => {
        const url = "https://example.org/wes/ga4gh/wes/v1/";
        const { response, get } = await serviceInfoOf("wes", [
            { id: "wes", url, type: wesType },
        ]);
        expect(response.status).toBe(200);
        expect(get.mock.calls[2][0]).toBe(
            "https://example.org/wes/ga4gh/wes/v1/service-info",
        );
    });

    it("requires an ID", async () => {
        const { response, get } = await serviceInfoOf(undefined);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: "Server ID is required.",
        });
        expect(get).not.toHaveBeenCalled();
    });

    it("rejects IDs that aren't in the registry", async () => {
        const { response, get } = await serviceInfoOf("other");
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({
            error: "WES server not found.",
        });
        expect(get).toHaveBeenCalledTimes(2);
    });

    it("never calls an unverified WES service", async () => {
        const { response, get } = await serviceInfoOf(
            "wes-unverified",
            services,
            serviceInfo,
            verifications,
        );
        expect(response.status).toBe(404);
        expect(get).toHaveBeenCalledTimes(2);
    });

    it("returns the service info of a verified WES service", async () => {
        const { response, get } = await serviceInfoOf(
            "wes-verified",
            services,
            serviceInfo,
            verifications,
        );
        expect(response.status).toBe(200);
        expect(get).toHaveBeenLastCalledWith(
            "https://wes.example.org/ga4gh/wes/v1/service-info",
            expect.anything(),
        );
    });

    it.each([
        ["malformed", "not a url"],
        ["http", "http://wes.example.org/ga4gh/wes/v1"],
        ["with user info", "https://user:pw@wes.example.org/ga4gh/wes/v1"],
        ["with a user name only", "https://user@wes.example.org/ga4gh/wes/v1"],
    ])("doesn't offer a WES URL that is %s", async (_, url) => {
        const { response, get } = await serviceInfoOf("wes", [
            { id: "wes", url, type: wesType },
        ]);
        expect(response.status).toBe(404);
        expect(get).toHaveBeenCalledTimes(2);
    });

    it.each([
        ["with a port", "https://wes.example.org:8443/ga4gh/wes/v1"],
        ["not a WES API", "https://wes.example.org/ga4gh/tes/v1"],
        ["below a WES API", "https://wes.example.org/ga4gh/wes/v1/runs"],
    ])("never calls a WES URL that is %s", async (_, url) => {
        const { response, get } = await serviceInfoOf("wes", [
            { id: "wes", url, type: wesType },
        ]);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: "Invalid WES service endpoint.",
        });
        expect(get).toHaveBeenCalledTimes(2);
    });

    it("fails without a registry URL", async () => {
        setUp();
        vi.stubEnv("CLOUD_REGISTRY_URL", "");
        const { GET } = await import("./route");
        const response = await GET(
            new NextRequest(`${appOrigin}/api/workflows/get-service-info?id=a`),
        );
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            error: "Cloud Registry URL is not configured.",
        });
    });

    it("fails on a registry response that isn't a list", async () => {
        const { response } = await serviceInfoOf("wes", { services: [] });
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            error: "Unable to fetch service information.",
        });
    });

    it("fails if the verifications can't be read", async () => {
        const { response } = await serviceInfoOf(
            "wes",
            undefined,
            serviceInfo,
            httpError(503),
        );
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            error: "Failed to fetch service information (503).",
        });
    });

    it("fails on an error status of the WES service", async () => {
        const { response } = await serviceInfoOf(
            "wes",
            undefined,
            httpError(404),
        );
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            error: "Failed to fetch service information (404).",
        });
    });

    it("fails when the registry doesn't answer", async () => {
        const { response } = await serviceInfoOf("wes", networkError());
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            error: "Unable to reach the registry or WES service.",
        });
    });
});
