import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
 */
async function load(services: unknown, probes: Record<string, Reply> = {}) {
    const get = vi.spyOn(await http(), "get");
    get.mockImplementation(async (url) => {
        if (url === `${registryUrl}/services`) {
            if (services instanceof Error) throw services;
            return { status: 200, data: services };
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
    vi.useFakeTimers({ now, toFake: ["Date"] });
});

afterEach(() => {
    vi.useRealTimers();
});

const REGISTRY_ERROR = {
    error: "Unable to fetch the service registry.",
};

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
        expect(get.mock.calls[0][0]).toBe(`${registryUrl}/services`);
        expect(get.mock.calls[0][1]).toMatchObject({
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

    it("keeps the registry's order, not the probes' completion order", async () => {
        // the first service answers last
        const { GET } = await load(
            [service("slow", urlOf("slow")), service("fast", urlOf("fast"))],
            {
                slow: async (url: string) => {
                    await new Promise((resolve) => setTimeout(resolve, 20));
                    return { status: 200, data: infoOf(new URL(url).hostname) };
                },
                fast: async (url: string) => ({
                    status: 200,
                    data: infoOf(new URL(url).hostname),
                }),
            },
        );
        const body = await (await GET()).json();
        expect(body.map((val: { id: string }) => val.id)).toEqual([
            "slow",
            "fast",
        ]);
    });

    it("probes the normalized URL: no query, fragment or trailing slash", async () => {
        const { GET, get } = await load([
            service("wes", `${urlOf("wes")}/?a=b#c`),
            service("port", "https://port.example.org:8443/ga4gh/wes/v1/"),
        ]);
        await GET();
        expect(get.mock.calls[1][0]).toBe(`${urlOf("wes")}/service-info`);
        expect(get.mock.calls[2][0]).toBe(
            "https://port.example.org:8443/ga4gh/wes/v1/service-info",
        );
    });

    it("gives the browser the normalized URL", async () => {
        const { GET } = await load([service("wes", `${urlOf("wes")}/?a=b#c`)]);
        const body = await (await GET()).json();
        expect(body[0].url).toBe(urlOf("wes"));
    });

    it.each<[string, unknown, Reply?]>([
        ["no URL", undefined],
        ["a malformed URL", "not a url"],
        ["an http URL", "http://wes.example.org/ga4gh/wes/v1"],
        ["credentials in the URL", "https://user:pw@wes.example.org/x"],
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
        expect(get).toHaveBeenCalledTimes(3);

        vi.setSystemTime(now + 59_999);
        const cached = await GET();
        expect(cached.headers.get("x-cache")).toBe("HIT");
        expect(cached.headers.get("x-unreachable-count")).toBe("1");
        expect(await cached.json()).toHaveLength(2);
        expect(get).toHaveBeenCalledTimes(3);

        vi.setSystemTime(now + 60_000);
        const fresh = await GET();
        expect(fresh.headers.get("x-cache")).toBe("MISS");
        expect(get).toHaveBeenCalledTimes(6);
    });

    it("shares one load between concurrent cache misses", async () => {
        const { GET, get } = await load([service("wes", urlOf("wes"))], {
            wes: async (url: string) => ({
                status: 200,
                data: infoOf(new URL(url).hostname),
            }),
        });
        const [first, second] = await Promise.all([GET(), GET()]);
        expect(first.headers.get("x-cache")).toBe("MISS");
        expect(second.headers.get("x-cache")).toBe("MISS");
        expect(second.headers.get("x-unreachable-count")).toBe("0");
        // one registry read and one probe for both requests
        expect(get).toHaveBeenCalledTimes(2);
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

    it("returns an empty list for a registry without WES services", async () => {
        const { GET } = await load([]);
        const response = await GET();
        expect(await response.json()).toEqual([]);
    });

    it("fails without a registry URL", async () => {
        vi.stubEnv("CLOUD_REGISTRY_URL", "");
        const { GET, get } = await load([]);
        const response = await GET();
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual(REGISTRY_ERROR);
        expect(get).not.toHaveBeenCalled();
    });

    it("fails when the registry doesn't answer", async () => {
        const { GET } = await load(networkError("ECONNREFUSED"));
        const response = await GET();
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual(REGISTRY_ERROR);
    });

    it("fails on a registry response that isn't a list", async () => {
        const { GET } = await load({ services: [] });
        const response = await GET();
        expect(response.status).toBe(502);
        expect(await response.json()).toEqual(REGISTRY_ERROR);
    });
});
