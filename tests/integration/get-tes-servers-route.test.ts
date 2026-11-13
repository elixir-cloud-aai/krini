import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/tasks/get-tes-servers/route";
import { REGISTRY_URL, services, verifications } from "../fixtures/registry";

const get = vi.hoisted(() => vi.fn());
vi.mock("@/lib/axios", () => ({ axiosBase: { get } }));

describe("GET /api/tasks/get-tes-servers", () => {
    beforeEach(() => {
        vi.stubEnv("CLOUD_REGISTRY_URL", REGISTRY_URL);
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
        get.mockReset();
    });

    it("lists only verified https TES services", async () => {
        get.mockImplementation(async (url: string) => ({
            data: url.endsWith("/verifications") ? verifications : services,
        }));

        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.map((s: { id: string }) => s.id)).toEqual(["tes-verified"]);
    });

    it("reports a registry failure", async () => {
        get.mockRejectedValue(new Error("down"));

        const response = await GET();

        expect(response.status).toBe(502);
    });

    it("reports a missing registry URL", async () => {
        vi.stubEnv("CLOUD_REGISTRY_URL", "");

        const response = await GET();

        expect(response.status).toBe(500);
    });
});
