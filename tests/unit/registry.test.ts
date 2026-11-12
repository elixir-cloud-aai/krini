import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    fetchVerifiedServices,
    filterVerifiedServices,
    isAllowedServiceUrl,
    RegistryConfigError,
} from "@/lib/registry";
import { REGISTRY_URL, services, verifications } from "../fixtures/registry";

const get = vi.hoisted(() => vi.fn());
vi.mock("@/lib/axios", () => ({ axiosBase: { get } }));

function ids(list: Array<{ id: string }>) {
    return list.map((service) => service.id);
}

describe("isAllowedServiceUrl", () => {
    it("accepts https URLs", () => {
        expect(
            isAllowedServiceUrl("https://wes.example.org/ga4gh/wes/v1"),
        ).toBe(true);
    });

    it.each([
        ["http", "http://wes.example.org"],
        ["user info", "https://user:pw@wes.example.org"],
        ["user name", "https://user@wes.example.org"],
        ["relative", "/tes-api"],
        ["malformed", "not a url"],
        ["not a string", 42],
    ])("rejects %s", (_label, value) => {
        expect(isAllowedServiceUrl(value)).toBe(false);
    });
});

describe("filterVerifiedServices", () => {
    it("keeps only verified entries with matching URL and type", () => {
        const result = filterVerifiedServices<{ id: string }>(
            services,
            verifications,
            ["wes", "wes-gateway"],
        );

        expect(ids(result)).toEqual(["wes-verified"]);
    });

    it("keeps only the requested artifacts", () => {
        const result = filterVerifiedServices<{ id: string }>(
            services,
            verifications,
            ["tes", "tes-gateway"],
        );

        expect(ids(result)).toEqual(["tes-verified"]);
    });

    it("returns nothing without verifications", () => {
        expect(filterVerifiedServices(services, [], ["wes"])).toEqual([]);
        expect(filterVerifiedServices(services, null, ["wes"])).toEqual([]);
    });

    it("returns nothing for a malformed service list", () => {
        expect(
            filterVerifiedServices({ services }, verifications, ["wes"]),
        ).toEqual([]);
    });
});

describe("fetchVerifiedServices", () => {
    beforeEach(() => {
        vi.stubEnv("CLOUD_REGISTRY_URL", `${REGISTRY_URL}/`);
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
        get.mockReset();
    });

    it("reads services and verifications without a token", async () => {
        get.mockImplementation(async (url: string) => ({
            data: url.endsWith("/verifications") ? verifications : services,
        }));

        const result = await fetchVerifiedServices<{ id: string }>(["wes"]);

        expect(ids(result)).toEqual(["wes-verified"]);
        expect(get.mock.calls.map(([url]) => url).sort()).toEqual([
            `${REGISTRY_URL}/services`,
            `${REGISTRY_URL}/verifications`,
        ]);
        for (const [, options] of get.mock.calls) {
            expect(options?.headers?.Authorization).toBeUndefined();
        }
    });

    it("offers no services if the registry has no verifications", async () => {
        get.mockImplementation(async (url: string) => {
            if (url.endsWith("/verifications")) {
                throw new Error("Not Found");
            }
            return { data: services };
        });

        await expect(fetchVerifiedServices(["wes"])).resolves.toEqual([]);
        expect(console.error).toHaveBeenCalledOnce();
    });

    it("fails if the service list can't be read", async () => {
        get.mockImplementation(async (url: string) => ({
            data: url.endsWith("/verifications") ? verifications : "oops",
        }));

        await expect(fetchVerifiedServices(["wes"])).rejects.toThrow(
            "Invalid registry response",
        );
    });

    it("fails without a configured registry", async () => {
        vi.stubEnv("CLOUD_REGISTRY_URL", "");

        await expect(fetchVerifiedServices(["wes"])).rejects.toBeInstanceOf(
            RegistryConfigError,
        );
        expect(get).not.toHaveBeenCalled();
    });
});
