import { beforeEach, describe, expect, it, vi } from "vitest";
import { services, verifications, verificationsOf } from "@/test/registry";
import {
    http,
    httpError,
    networkError,
    registryOptions,
    registryUrl,
    setUp,
} from "@/test/routes";

const service = (id: string, artifact: string) => ({
    id,
    url: `https://${id}.example.org/ga4gh/${artifact}/v1`,
    type: { group: "org.ga4gh", artifact, version: "1.1.0" },
});

/**
 * Get the TES list for the replies of the registry
 * @param entries Entries of the registry, or an error to throw
 * @param verified Verifications of the registry, or an error to throw
 *     (default: every service with an ID is verified)
 */
async function tesServers(entries: unknown, verified?: unknown) {
    setUp();
    const get = vi.spyOn(await http(), "get");
    get.mockImplementation(async (url) => {
        const data =
            url === `${registryUrl}/verifications`
                ? (verified ?? verificationsOf(entries))
                : entries;
        if (data instanceof Error) throw data;
        return { status: 200, data };
    });
    const { GET } = await import("./route");
    return { response: await GET(), get };
}

beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
});

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
        for (const path of ["services", "verifications"])
            expect(get).toHaveBeenCalledWith(
                `${registryUrl}/${path}`,
                registryOptions,
            );
    });

    it("lists only verified https TES services", async () => {
        const { response } = await tesServers(services, verifications);
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.map((val: { id: string }) => val.id)).toEqual([
            "tes-verified",
        ]);
    });

    it("ignores trailing slashes of the registry URL", async () => {
        setUp();
        vi.stubEnv("CLOUD_REGISTRY_URL", `${registryUrl}//`);
        const get = vi
            .spyOn(await http(), "get")
            .mockResolvedValue({ status: 200, data: [] });
        const { GET } = await import("./route");
        await GET();
        expect(get).toHaveBeenCalledWith(
            `${registryUrl}/services`,
            expect.anything(),
        );
    });

    it("fails without a registry URL", async () => {
        setUp();
        vi.stubEnv("CLOUD_REGISTRY_URL", "");
        const get = vi.spyOn(await http(), "get");
        const { GET } = await import("./route");
        const response = await GET();
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            message: "Cloud Registry URL is not configured",
        });
        expect(get).not.toHaveBeenCalled();
    });

    it("lists nothing if the registry has no verifications", async () => {
        const { response } = await tesServers(services, httpError(404));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([]);
    });

    it.each([
        ["no body", ""],
        ["an object", { services: [] }],
        ["an error status", httpError(503, { msg: "maintenance" })],
        ["no answer", networkError("ECONNREFUSED")],
    ])("fails on a registry response with %s", async (_, reply) => {
        // any registry failure is a 502, without the registry's status
        const { response } = await tesServers(reply, []);
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            message: "Failed to fetch Cloud Registry services",
        });
    });

    it("fails if the verifications can't be read", async () => {
        const { response } = await tesServers(services, httpError(503));
        expect(response.status).toBe(502);
    });
});
