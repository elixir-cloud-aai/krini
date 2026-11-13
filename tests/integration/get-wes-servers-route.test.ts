import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    httpError,
    REGISTRY_URL,
    services,
    verifications,
} from "../fixtures/registry";

const get = vi.hoisted(() => vi.fn());
vi.mock("@/lib/axios", () => ({ axiosBase: { get } }));

const serviceInfo = {
    id: "org.example.wes",
    name: "Example WES",
    workflow_type_versions: { CWL: { workflow_type_version: ["v1.2"] } },
};

async function loadRoute() {
    // The route caches the list in module state
    vi.resetModules();
    return import("@/app/api/workflows/get-wes-servers/route");
}

describe("GET /api/workflows/get-wes-servers", () => {
    beforeEach(() => {
        vi.stubEnv("CLOUD_REGISTRY_URL", REGISTRY_URL);
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
        get.mockReset();
    });

    it("lists and probes only verified services", async () => {
        get.mockImplementation(async (url: string) => {
            if (url === `${REGISTRY_URL}/services`) return { data: services };
            if (url === `${REGISTRY_URL}/verifications`) {
                return { data: verifications };
            }
            return { data: serviceInfo };
        });
        const { GET } = await loadRoute();

        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.map((s: { id: string }) => s.id)).toEqual(["wes-verified"]);
        expect(body[0].health).toEqual({ status: "ok" });
        const probed = get.mock.calls
            .map(([url]) => url as string)
            .filter((url) => !url.startsWith(REGISTRY_URL));
        expect(probed).toEqual([
            "https://wes.example.org/ga4gh/wes/v1/service-info",
        ]);
    });

    it("lists nothing if the registry has no verifications", async () => {
        get.mockImplementation(async (url: string) => {
            if (url === `${REGISTRY_URL}/services`) return { data: services };
            throw httpError(404);
        });
        const { GET } = await loadRoute();

        const response = await GET();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([]);
        expect(get).toHaveBeenCalledTimes(2);
    });

    it("reports a registry failure instead of an empty list", async () => {
        get.mockImplementation(async (url: string) => {
            if (url === `${REGISTRY_URL}/services`) return { data: services };
            throw httpError(503);
        });
        const { GET } = await loadRoute();

        const response = await GET();

        expect(response.status).toBe(502);
    });
});
