import { describe, expect, it, vi } from "vitest";
import {
    http,
    httpError,
    networkError,
    registryUrl,
    setUp,
} from "@/test/routes";

const wesUrl = "https://wes.example.org/ga4gh/wes/v1";
const serviceInfo = { id: "wes", name: "WES", workflow_type_versions: {} };

/** Get `getWesServiceInfo` of the current module graph, after `setUp()` */
async function serviceInfoFn() {
    return (await import("./service-info")).getWesServiceInfo;
}

/**
 * Get the service info of a WES service from the registry
 * @param id Registry ID of the service
 * @param services Services in the registry, or an error to throw
 * @param info Service info of the WES service, or an error to throw
 */
async function serviceInfoOf(
    id: string,
    services: unknown = [{ id: "wes", url: wesUrl }],
    info: unknown = serviceInfo,
) {
    setUp();
    const get = vi.spyOn(await http(), "get");
    get.mockImplementation(async (url) => {
        const reply = url === `${registryUrl}/services` ? services : info;
        if (reply instanceof Error) throw reply;
        return { status: 200, data: reply };
    });
    const result = await (await serviceInfoFn())(id);
    return { result, get };
}

describe("getWesServiceInfo", () => {
    it("returns the service info of a registered WES service", async () => {
        const { result, get } = await serviceInfoOf("wes");
        expect(result).toEqual({
            ok: true,
            serviceInfo: { ...serviceInfo, url: `${wesUrl}/service-info` },
        });
        expect(get.mock.calls).toEqual([
            [
                `${registryUrl}/services`,
                { headers: { Accept: "application/json" } },
            ],
            [
                `${wesUrl}/service-info`,
                { maxRedirects: 0, headers: { Accept: "application/json" } },
            ],
        ]);
    });

    it("accepts WES URLs with a trailing slash and a path prefix", async () => {
        const url = "https://example.org/wes/ga4gh/wes/v1/";
        const { result, get } = await serviceInfoOf("wes", [
            { id: "wes", url },
        ]);
        expect(result).toMatchObject({ ok: true });
        expect(get.mock.calls[1][0]).toBe(
            "https://example.org/wes/ga4gh/wes/v1/service-info",
        );
    });

    it("rejects IDs that aren't in the registry", async () => {
        const { result, get } = await serviceInfoOf("other");
        expect(result).toEqual({
            ok: false,
            status: 404,
            error: "WES server not found.",
        });
        expect(get).toHaveBeenCalledTimes(1);
    });

    it.each([
        ["malformed", "not a url"],
        ["http", "http://wes.example.org/ga4gh/wes/v1"],
        ["with user info", "https://user:pw@wes.example.org/ga4gh/wes/v1"],
        ["with a user name only", "https://user@wes.example.org/ga4gh/wes/v1"],
        ["with a port", "https://wes.example.org:8443/ga4gh/wes/v1"],
        ["not a WES API", "https://wes.example.org/ga4gh/tes/v1"],
        ["below a WES API", "https://wes.example.org/ga4gh/wes/v1/runs"],
    ])("never calls a WES URL that is %s", async (_, url) => {
        const { result, get } = await serviceInfoOf("wes", [
            { id: "wes", url },
        ]);
        expect(result).toEqual({
            ok: false,
            status: 400,
            error: "Invalid WES service endpoint.",
        });
        expect(get).toHaveBeenCalledTimes(1);
    });

    it("fails without a registry URL", async () => {
        setUp();
        vi.stubEnv("CLOUD_REGISTRY_URL", "");
        const result = await (await serviceInfoFn())("a");
        expect(result).toEqual({
            ok: false,
            status: 502,
            error: "Unable to fetch service information.",
        });
    });

    it("fails on an error status of the WES service", async () => {
        const { result } = await serviceInfoOf(
            "wes",
            undefined,
            httpError(404),
        );
        expect(result).toEqual({
            ok: false,
            status: 502,
            error: "Failed to fetch service information (404).",
        });
    });

    it("fails when the registry doesn't answer", async () => {
        const { result } = await serviceInfoOf("wes", networkError());
        expect(result).toEqual({
            ok: false,
            status: 502,
            error: "Unable to reach the registry or WES service.",
        });
    });
});
