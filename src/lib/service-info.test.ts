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
    const { getWesServiceInfo } = await import("./service-info");
    const result = await getWesServiceInfo(id);
    return { result, get };
}

describe("getWesServiceInfo", () => {
    it("returns the service info of a registered WES service", async () => {
        const { result, get } = await serviceInfoOf("wes");
        expect(result).toMatchObject({
            ok: true,
            serviceInfo: {
                id: "wes",
                name: "WES",
                url: `${wesUrl}/service-info`,
            },
        });
        expect(get.mock.calls.map(([url]) => url)).toEqual([
            `${registryUrl}/services`,
            `${wesUrl}/service-info`,
        ]);
        expect(get.mock.calls[1][1]).toMatchObject({
            maxRedirects: 0,
            headers: { Accept: "application/json" },
        });
    });

    it("accepts WES URLs with a trailing slash, a path prefix and a port", async () => {
        for (const url of [
            "https://example.org/wes/ga4gh/wes/v1/",
            "https://example.org:8443/ga4gh/wes/v1",
            "https://example.org/wes/ga4gh/wes/v1/runs?x=1",
        ]) {
            const { result, get } = await serviceInfoOf("wes", [
                { id: "wes", url },
            ]);
            expect(result).toMatchObject({ ok: true });
            const normalized = new URL(url);
            normalized.search = "";
            normalized.hash = "";
            normalized.pathname = normalized.pathname.replace(/\/+$/, "");
            expect(get.mock.calls[1][0]).toBe(
                `${normalized.origin}${normalized.pathname}/service-info`,
            );
        }
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

    it("shows bad service-info fields as missing", async () => {
        const { result } = await serviceInfoOf("wes", undefined, {
            id: 42,
            name: { text: "WES" },
            contactUrl: "",
            contact_info_url: 7,
            tags: { good: "x", bad: 7 },
            system_state_counts: { RUNNING: "many", QUEUED: 2 },
            workflow_engine_versions: ["cwltool"],
            supported_filesystem_protocols: ["https", 7, null],
            supported_wes_versions: "1.1",
            type: null,
            organization: null,
            default_workflow_engine_parameters: ["x"],
            workflow_type_versions: {
                CWL: "v1",
                WDL: { workflow_type_version: ["v1", 2] },
            },
        });
        expect(result).toMatchObject({
            ok: true,
            serviceInfo: {
                id: "",
                name: "",
                contactUrl: undefined,
                contact_info_url: undefined,
                tags: { good: "x" },
                system_state_counts: { QUEUED: 2 },
                workflow_engine_versions: {},
                workflow_type_versions: {
                    WDL: { workflow_type_version: ["v1"] },
                },
            },
        });
    });

    it("shows a service-info answer that isn't an object as missing", async () => {
        const { result } = await serviceInfoOf("wes", undefined, "text");
        expect(result).toMatchObject({
            ok: true,
            serviceInfo: { id: "", name: "" },
        });
    });

    it("fails without a registry URL", async () => {
        setUp();
        vi.stubEnv("CLOUD_REGISTRY_URL", "");
        const { getWesServiceInfo } = await import("./service-info");
        const result = await getWesServiceInfo("a");
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
            error: "Unable to fetch service information.",
        });
    });

    it("fails when the WES service doesn't answer", async () => {
        const { result } = await serviceInfoOf(
            "wes",
            undefined,
            networkError("ECONNREFUSED"),
        );
        expect(result).toEqual({
            ok: false,
            status: 502,
            error: "Unable to reach the registry or WES service.",
        });
    });

    it("fails on a non-HTTP error of the WES service", async () => {
        const { result } = await serviceInfoOf(
            "wes",
            undefined,
            new Error("x"),
        );
        expect(result).toEqual({
            ok: false,
            status: 502,
            error: "Unable to fetch service information.",
        });
    });
});
