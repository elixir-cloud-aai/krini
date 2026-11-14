import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { services, verifications, verificationsOf } from "@/test/registry";
import {
    http,
    httpError,
    networkError,
    registryUrl,
    setUp,
} from "@/test/routes";

const service = (id: string, url: unknown, artifact = "wes") => ({
    id,
    url,
    type: { group: "org.ga4gh", artifact, version: "1.1.0" },
});
const urlOf = (id: string) => `https://${id}.example.org/ga4gh/wes/v1`;
const infoOf = (id: string) => ({ id, name: id.toUpperCase() });

type Reply = unknown | Error | ((url: string) => Promise<unknown>);

/**
 * Mock the registry and the WES services and load the route
 * @param services Services in the registry, or an error to throw
 * @param probes Reply of each WES service by ID (default: its service info)
 * @param verified Verifications of the registry, or an error to throw
 *     (default: every service with an ID is verified)
 */
async function load(
    entries: unknown,
    probes: Record<string, Reply> = {},
    verified: unknown = verificationsOf(entries),
) {
    const get = vi.spyOn(await http(), "get");
    get.mockImplementation(async (url) => {
        if (url.startsWith(registryUrl)) {
            const data = url.endsWith("/verifications") ? verified : entries;
            if (data instanceof Error) throw data;
            return { status: 200, data };
        }
        const id = new URL(url).hostname.split(".")[0];
        const reply = id in probes ? probes[id] : infoOf(id);
        if (reply instanceof Error) throw reply;
        if (typeof reply === "function") return reply(url);
        return { status: 200, data: reply };
    });
    const { GET } = await import("./route");
    return { GET, get };
}

const now = new Date("2026-11-12T12:00:00Z").getTime();

beforeEach(() => {
    setUp();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers({ now, toFake: ["Date"] });
});

afterEach(() => {
    vi.useRealTimers();
});

describe("GET /api/workflows/get-wes-servers", () => {
    it("lists the WES services and gateways with their service info", async () => {
        const wes = service("wes", urlOf("wes"));
        const gateway = service("gateway", urlOf("gateway"), "wes-gateway");
        const { GET, get } = await load([
            wes,
            service("tes", urlOf("tes"), "tes"),
            gateway,
            { id: "no-type" },
            null,
        ]);
        const response = await GET();
        expect(response.status).toBe(200);
        expect(response.headers.get("x-cache")).toBe("MISS");
        expect(response.headers.get("x-unreachable-count")).toBe("0");
        const body = await response.json();
        expect(body).toHaveLength(2);
        expect(body).toEqual(
            expect.arrayContaining([
                {
                    ...wes,
                    health: { status: "ok" },
                    serviceInfo: infoOf("wes"),
                },
                {
                    ...gateway,
                    health: { status: "ok" },
                    serviceInfo: infoOf("gateway"),
                },
            ]),
        );

        // reads of the registry and service info are public: no token
        for (const path of ["services", "verifications"])
            expect(get).toHaveBeenCalledWith(`${registryUrl}/${path}`, {
                timeout: 8000,
                signal: expect.any(AbortSignal),
                headers: { Accept: "application/json" },
            });
        const probe = get.mock.calls.find(
            ([url]) => url === `${urlOf("wes")}/service-info`,
        );
        expect(probe?.[1]).toMatchObject({ timeout: 8000, maxRedirects: 0 });
        expect(probe?.[1]).not.toHaveProperty("headers");
        expect(probe?.[1]?.validateStatus?.(200)).toBe(true);
        expect(probe?.[1]?.validateStatus?.(299)).toBe(true);
        expect(probe?.[1]?.validateStatus?.(199)).toBe(false);
        expect(probe?.[1]?.validateStatus?.(300)).toBe(false);
    });

    it("probes URLs without their query and trailing slash", async () => {
        const { GET, get } = await load([
            service("wes", `${urlOf("wes")}/?a=b#c`),
        ]);
        await GET();
        expect(get.mock.calls[2][0]).toBe(`${urlOf("wes")}/service-info`);
    });

    it.each([
        ["no URL", undefined, undefined],
        ["a malformed URL", "not a url", undefined],
        ["an http URL", "http://wes.example.org/ga4gh/wes/v1", undefined],
        ["service info that is a list", urlOf("wes"), []],
        ["service info that is text", urlOf("wes"), "text"],
        ["no service info", urlOf("wes"), null],
        ["a client error", urlOf("wes"), httpError(404)],
    ])("drops services with %s", async (_, url, probe) => {
        const { GET } = await load(
            [service("wes", url), service("ok", urlOf("ok"))],
            probe === undefined ? {} : { wes: probe },
        );
        const response = await GET();
        const body = await response.json();
        expect(body.map((val: { id: string }) => val.id)).toEqual(["ok"]);
        expect(response.headers.get("x-unreachable-count")).toBe("0");
    });

    it.each([
        ["a server error", httpError(503), "upstream returned 503"],
        ["a timeout status", httpError(408), "upstream returned 408"],
        ["rate limiting", httpError(429), "upstream returned 429"],
        ["no answer", networkError("ECONNREFUSED"), "no response from server"],
        ["a failure", new Error("boom"), "no response from server"],
    ])("keeps services with %s as unreachable", async (_, probe, reason) => {
        const { GET } = await load([service("wes", urlOf("wes"))], {
            wes: probe,
        });
        const response = await GET();
        expect(response.headers.get("x-unreachable-count")).toBe("1");
        expect(await response.json()).toEqual([
            {
                ...service("wes", urlOf("wes")),
                health: { status: "unreachable", reason },
                serviceInfo: null,
            },
        ]);
    });

    it("caches the list for a minute", async () => {
        const { GET, get } = await load(
            [service("wes", urlOf("wes")), service("down", urlOf("down"))],
            { down: httpError(503) },
        );
        await GET();
        expect(get).toHaveBeenCalledTimes(4);

        vi.setSystemTime(now + 59_999);
        const cached = await GET();
        expect(cached.headers.get("x-cache")).toBe("HIT");
        expect(cached.headers.get("x-unreachable-count")).toBe("1");
        expect(await cached.json()).toHaveLength(2);
        expect(get).toHaveBeenCalledTimes(4);

        vi.setSystemTime(now + 60_000);
        const fresh = await GET();
        expect(fresh.headers.get("x-cache")).toBe("MISS");
        expect(get).toHaveBeenCalledTimes(8);
    });

    it("keeps the list of the request that finished first", async () => {
        let calls = 0;
        const { GET } = await load([service("wes", urlOf("wes"))], {
            // the second request's probe fails, but it doesn't replace the
            // first one's list, which finished at the same time
            wes: async () => {
                calls++;
                if (calls === 2) throw httpError(503);
                return { status: 200, data: infoOf("wes") };
            },
        });
        const [first, second] = await Promise.all([GET(), GET()]);
        expect(first.headers.get("x-cache")).toBe("MISS");
        expect(second.headers.get("x-cache")).toBe("MISS");
        expect(second.headers.get("x-unreachable-count")).toBe("1");
        const cached = await GET();
        expect(cached.headers.get("x-cache")).toBe("HIT");
        expect(cached.headers.get("x-unreachable-count")).toBe("0");
    });

    it("probes at most 8 services at a time", async () => {
        let running = 0;
        let most = 0;
        const slow = async (url: string) => {
            running++;
            most = Math.max(most, running);
            await new Promise((resolve) => setTimeout(resolve, 1));
            running--;
            return { status: 200, data: infoOf(new URL(url).hostname) };
        };
        const ids = Array.from({ length: 20 }, (_, i) => `wes${i}`);
        const { GET } = await load(
            ids.map((id) => service(id, urlOf(id))),
            Object.fromEntries(ids.map((id) => [id, slow])),
        );
        const body = await (await GET()).json();
        expect(body).toHaveLength(20);
        expect(most).toBe(8);
    });

    it("lists and probes only verified services", async () => {
        const { GET, get } = await load(services, {}, verifications);
        const response = await GET();
        const body = await response.json();
        expect(body.map((val: { id: string }) => val.id)).toEqual([
            "wes-verified",
        ]);
        const probed = get.mock.calls
            .map(([url]) => url)
            .filter((url) => !url.startsWith(registryUrl));
        expect(probed).toEqual([
            "https://wes.example.org/ga4gh/wes/v1/service-info",
        ]);
    });

    it("lists nothing if the registry has no verifications", async () => {
        const { GET, get } = await load(services, {}, httpError(404));
        const response = await GET();
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([]);
        expect(get).toHaveBeenCalledTimes(2);
    });

    it("fails if the verifications can't be read", async () => {
        const { GET } = await load(services, {}, httpError(503));
        const response = await GET();
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            message: "Failed to fetch Cloud Registry services",
        });
    });

    it("returns an empty list for a registry without WES services", async () => {
        const { GET } = await load([]);
        const response = await GET();
        expect(await response.json()).toEqual([]);
    });

    it("fails without a registry URL", async () => {
        vi.stubEnv("CLOUD_REGISTRY_URL", "");
        const { GET, get } = await load([]);
        const response = await GET();
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            message: "Cloud Registry URL is not configured",
        });
        expect(get).not.toHaveBeenCalled();
    });

    it("fails when the registry doesn't answer", async () => {
        const { GET } = await load(networkError("ECONNREFUSED"));
        const response = await GET();
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual({
            message: "Failed to fetch Cloud Registry services",
        });
    });

    it("fails on a registry response that isn't a list", async () => {
        const { GET } = await load({ services: [] });
        const response = await GET();
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({
            message: "Internal server error",
        });
    });
});
