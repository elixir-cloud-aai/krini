import { describe, expect, it, vi } from "vitest";
import {
    http,
    httpError,
    networkError,
    registryUrl,
    setUp,
} from "@/test/routes";

const service = (id: string, artifact: string) => ({
    id,
    url: `https://${id}.example.org/ga4gh/${artifact}/v1`,
    type: { group: "org.ga4gh", artifact, version: "1.1.0" },
});

/**
 * Get the TES list for a registry reply
 * @param reply Result of the registry request: data, or an error to throw
 */
async function tesServers(reply: unknown) {
    setUp();
    const get = vi.spyOn(await http(), "get");
    if (reply instanceof Error) get.mockRejectedValue(reply);
    else get.mockResolvedValue({ status: 200, data: reply });
    const { GET } = await import("./route");
    return { response: await GET(), get };
}

describe("GET /api/tasks/get-tes-servers", () => {
    it("lists the TES services and gateways of the registry", async () => {
        const tes = service("tes", "tes");
        const gateway = service("gateway", "tes-gateway");
        const { response, get } = await tesServers([
            tes,
            service("wes", "wes"),
            gateway,
            { id: "no-type" },
            null,
        ]);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([tes, gateway]);
        // reads of the registry are public: no token
        expect(get).toHaveBeenCalledWith(`${registryUrl}/services`);
    });

    it("ignores trailing slashes of the registry URL", async () => {
        setUp();
        vi.stubEnv("CLOUD_REGISTRY_URL", `${registryUrl}//`);
        const get = vi
            .spyOn(await http(), "get")
            .mockResolvedValue({ status: 200, data: [] });
        const { GET } = await import("./route");
        await GET();
        expect(get).toHaveBeenCalledWith(`${registryUrl}/services`);
    });

    it("fails without a registry URL", async () => {
        setUp();
        vi.stubEnv("CLOUD_REGISTRY_URL", "");
        const get = vi.spyOn(await http(), "get");
        const { GET } = await import("./route");
        const response = await GET();
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            message: "Internal server error",
        });
        expect(get).not.toHaveBeenCalled();
    });

    it.each([
        ["no body", ""],
        ["an object", { services: [] }],
    ])("fails on a registry response with %s", async (_, reply) => {
        const { response } = await tesServers(reply);
        expect(response.status).toBe(500);
    });

    it("passes on the registry's error status and body", async () => {
        const { response } = await tesServers(
            httpError(503, { msg: "maintenance" }),
        );
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({ msg: "maintenance" });
    });

    it("fails when the registry doesn't answer", async () => {
        const { response } = await tesServers(networkError("ECONNREFUSED"));
        expect(response.status).toBe(500);
        expect(await response.json()).toBeNull();
    });
});
