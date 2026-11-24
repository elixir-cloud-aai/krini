import { describe, expect, it, vi } from "vitest";
import {
    http,
    httpError,
    networkError,
    registryUrl,
    setUp,
} from "@/test/routes";

const service = (id: string, artifact: string, url?: string) => ({
    id,
    url: url ?? `https://${id}.example.org/ga4gh/${artifact}/v1`,
    type: { group: "org.ga4gh", artifact, version: "1.1.0" },
});

const REGISTRY_ERROR = {
    error: "Unable to fetch the service registry.",
};

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
        expect(get.mock.calls[0][0]).toBe(`${registryUrl}/services`);
    });

    it("lists only services over an allowed URL, normalized", async () => {
        const tes = service("tes", "tes");
        const { response } = await tesServers([
            tes,
            {
                ...service("plain", "tes", "http://plain.example.org/x"),
            },
            {
                ...service(
                    "credentials",
                    "tes-gateway",
                    "https://user:pw@cred.example.org/ga4gh/tes/v1",
                ),
            },
            { ...service("bad", "tes"), url: "not a URL" },
            { ...service("none", "tes"), url: undefined },
            {
                ...service(
                    "query",
                    "tes",
                    "https://query.example.org/ga4gh/tes/v1/?a=b#c",
                ),
            },
        ]);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([
            tes,
            {
                ...service(
                    "query",
                    "tes",
                    "https://query.example.org/ga4gh/tes/v1/?a=b#c",
                ),
                url: "https://query.example.org/ga4gh/tes/v1",
            },
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
        expect(get.mock.calls[0][0]).toBe(`${registryUrl}/services`);
    });

    it("fails without a registry URL", async () => {
        setUp();
        vi.stubEnv("CLOUD_REGISTRY_URL", "");
        const get = vi.spyOn(await http(), "get");
        const { GET } = await import("./route");
        const response = await GET();
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual(REGISTRY_ERROR);
        expect(get).not.toHaveBeenCalled();
    });

    it.each([
        [""],
        [null],
        [{ services: [] }],
        ["text"],
    ])("fails on a registry response that isn't a list: %s", async (reply) => {
        const { response } = await tesServers(reply);
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual(REGISTRY_ERROR);
    });

    it("answers a registry error with a fixed 502, not its status", async () => {
        const { response } = await tesServers(
            httpError(401, { msg: "unauthorized" }),
        );
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual(REGISTRY_ERROR);
    });

    it("fails when the registry doesn't answer", async () => {
        const { response } = await tesServers(networkError("ECONNREFUSED"));
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual(REGISTRY_ERROR);
    });
});
