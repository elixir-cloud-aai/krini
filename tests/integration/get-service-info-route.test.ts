import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/workflows/get-service-info/route";
import {
    httpError,
    REGISTRY_URL,
    services,
    verifications,
} from "../fixtures/registry";

const get = vi.hoisted(() => vi.fn());
vi.mock("@/lib/axios", () => ({ axiosBase: { get } }));

function request(id: string) {
    return new NextRequest(
        `https://krini.example.org/api/workflows/get-service-info?id=${id}`,
    );
}

describe("GET /api/workflows/get-service-info", () => {
    beforeEach(() => {
        vi.stubEnv("CLOUD_REGISTRY_URL", REGISTRY_URL);
        vi.spyOn(console, "error").mockImplementation(() => {});
        get.mockImplementation(async (url: string) => {
            if (url === `${REGISTRY_URL}/services`) return { data: services };
            if (url === `${REGISTRY_URL}/verifications`) {
                return { data: verifications };
            }
            return { data: { id: "org.example.wes", name: "Example WES" } };
        });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
        get.mockReset();
    });

    it("returns the service info of a verified service", async () => {
        const response = await GET(request("wes-verified"));

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ name: "Example WES" });
        expect(get).toHaveBeenCalledWith(
            "https://wes.example.org/ga4gh/wes/v1/service-info",
            expect.anything(),
        );
    });

    it("doesn't fetch the service info of an unverified service", async () => {
        const response = await GET(request("wes-unverified"));

        expect(response.status).toBe(404);
        expect(get).toHaveBeenCalledTimes(2);
    });

    it("reports a registry failure", async () => {
        get.mockRejectedValue(httpError(503));

        const response = await GET(request("wes-verified"));

        expect(response.status).toBe(502);
    });

    it("reports a missing registry URL", async () => {
        vi.stubEnv("CLOUD_REGISTRY_URL", "");

        const response = await GET(request("wes-verified"));

        expect(response.status).toBe(500);
    });
});
