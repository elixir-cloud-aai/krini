import { describe, expect, it, vi } from "vitest";
import {
    http,
    httpError,
    networkError,
    registryUrl,
    setUp,
} from "@/test/routes";
import { allowedServiceUrl } from "./registry";

const services = [{ id: "wes", url: "https://wes.example.org/ga4gh/wes/v1" }];

/**
 * Mock the registry and load `fetchRegistryServices` and `RegistryError`
 * of the current module graph
 * @param reply Data of the registry answer, or an error to throw
 */
async function load(reply: unknown) {
    setUp();
    const get = vi.spyOn(await http(), "get");
    if (reply instanceof Error) get.mockRejectedValue(reply);
    else get.mockResolvedValue({ status: 200, data: reply });
    const mod = await import("./registry");
    return {
        fetch: mod.fetchRegistryServices,
        RegistryError: mod.RegistryError,
        get,
    };
}

describe("fetchRegistryServices", () => {
    it("reads the services of the registry", async () => {
        const { fetch, get } = await load(services);
        expect(await fetch()).toEqual(services);
        expect(get).toHaveBeenCalledWith(
            `${registryUrl}/services`,
            expect.objectContaining({
                headers: { Accept: "application/json" },
                timeout: 10_000,
                maxContentLength: 5 * 1024 * 1024,
                maxRedirects: 0,
            }),
        );
    });

    it("ignores trailing slashes of the registry URL", async () => {
        setUp();
        vi.stubEnv("CLOUD_REGISTRY_URL", `${registryUrl}//`);
        const get = vi
            .spyOn(await http(), "get")
            .mockResolvedValue({ status: 200, data: [] });
        const { fetchRegistryServices } = await import("./registry");
        await fetchRegistryServices();
        expect(get.mock.calls[0][0]).toBe(`${registryUrl}/services`);
    });

    it("caches the list for a minute", async () => {
        const { fetch, get } = await load(services);
        await fetch();
        await fetch();
        expect(get).toHaveBeenCalledTimes(1);
    });

    it("shares one request between concurrent misses", async () => {
        setUp();
        let calls = 0;
        const get = vi
            .spyOn(await http(), "get")
            .mockImplementation(async () => {
                calls++;
                await new Promise((resolve) => setTimeout(resolve, 5));
                return { status: 200, data: services };
            });
        const { fetchRegistryServices } = await import("./registry");
        const [a, b] = await Promise.all([
            fetchRegistryServices(),
            fetchRegistryServices(),
        ]);
        expect(a).toEqual(services);
        expect(b).toEqual(services);
        expect(get).toHaveBeenCalledTimes(1);
        expect(calls).toBe(1);
    });

    it("fails without a registry URL", async () => {
        setUp();
        vi.stubEnv("CLOUD_REGISTRY_URL", "");
        const get = vi.spyOn(await http(), "get");
        const { fetchRegistryServices, RegistryError } = await import(
            "./registry"
        );
        await expect(fetchRegistryServices()).rejects.toBeInstanceOf(
            RegistryError,
        );
        expect(get).not.toHaveBeenCalled();
    });

    it("fails when the registry doesn't answer", async () => {
        const { fetch, RegistryError } = await load(
            networkError("ECONNREFUSED"),
        );
        await expect(fetch()).rejects.toBeInstanceOf(RegistryError);
    });

    it("fails on an error status of the registry", async () => {
        const { fetch, RegistryError } = await load(
            httpError(503, { msg: "maintenance" }),
        );
        await expect(fetch()).rejects.toBeInstanceOf(RegistryError);
    });

    it.each([
        [""],
        [null],
        [{ services: [] }],
        ["text"],
    ])("fails on a registry answer that isn't a list: %s", async (reply) => {
        const { fetch, RegistryError } = await load(reply);
        await expect(fetch()).rejects.toBeInstanceOf(RegistryError);
    });
});

describe("allowedServiceUrl", () => {
    it.each([
        [
            "https://wes.example.org/ga4gh/wes/v1",
            "https://wes.example.org/ga4gh/wes/v1",
        ],
        [
            "https://wes.example.org:8443/ga4gh/wes/v1/",
            "https://wes.example.org:8443/ga4gh/wes/v1",
        ],
        [
            "https://wes.example.org/base/ga4gh/wes/v1/?a=b#c",
            "https://wes.example.org/base/ga4gh/wes/v1",
        ],
    ])("normalizes %s", (value, expected) => {
        expect(allowedServiceUrl(value)).toBe(expected);
    });

    it.each([
        "http://wes.example.org/ga4gh/wes/v1",
        "https://user:pw@wes.example.org/ga4gh/wes/v1",
        "https://user@wes.example.org/ga4gh/wes/v1",
        "not a url",
        "",
        undefined,
        42,
        {},
        null,
    ])("rejects %s", (value) => {
        expect(allowedServiceUrl(value)).toBeNull();
    });
});
