import { afterEach, describe, expect, it, vi } from "vitest";
import {
    getAccessToken,
    TokenTesProvider,
    TokenWesProvider,
} from "./service-providers";

const tesUrl = "https://tes.example.org/ga4gh/tes/v1";
const wesUrl = "https://wes.example.org/ga4gh/wes/v1";

/**
 * Stub `fetch` with JSON replies
 * @param body Body of every reply
 * @param status Status of every reply
 * @returns The stub
 */
function stubFetch(body: unknown, status = 200) {
    const stub = vi.fn(
        async (_input: RequestInfo | URL, _init?: RequestInit) =>
            new Response(JSON.stringify(body), {
                status,
                headers: { "Content-Type": "application/json" },
            }),
    );
    vi.stubGlobal("fetch", stub);
    return stub;
}

/**
 * Get the `Authorization` header of a request of the stub
 * @param stub `fetch` stub
 * @param index Index of the request
 * @returns The header, or `null` if the request had none
 */
function authorizationOf(stub: ReturnType<typeof stubFetch>, index = 0) {
    return new Headers(stub.mock.calls[index][1]?.headers).get("Authorization");
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("getAccessToken", () => {
    it("gets the token of the session from the same origin, uncached", async () => {
        const stub = stubFetch({ access_token: "token-1", expires_at: 1 });
        expect(await getAccessToken()).toBe("token-1");
        expect(stub).toHaveBeenCalledWith("/auth/api/token", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
        });
    });

    it("returns no token without a session", async () => {
        stubFetch({ message: "not logged in" }, 401);
        expect(await getAccessToken()).toBe("");
    });

    it("returns no token for a reply without one", async () => {
        stubFetch({});
        expect(await getAccessToken()).toBe("");
    });

    it("returns no token when the request fails", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(new TypeError("offline")),
        );
        expect(await getAccessToken()).toBe("");
    });
});

describe("TokenTesProvider", () => {
    it("sends the token with every request", async () => {
        const stub = stubFetch({ id: "task-1" });
        const getToken = vi
            .fn()
            .mockResolvedValueOnce("token-1")
            .mockResolvedValueOnce("token-2");
        const provider = new TokenTesProvider(tesUrl, getToken);

        await provider.createTask({ executors: [] });
        await provider.getTask("task-1");

        expect(stub.mock.calls[0][0]).toBe(`${tesUrl}/tasks`);
        // the token is read per request, so a renewed one is used
        expect(authorizationOf(stub, 0)).toBe("Bearer token-1");
        expect(authorizationOf(stub, 1)).toBe("Bearer token-2");
        // the provider's own headers stay
        expect(
            new Headers(stub.mock.calls[0][1]?.headers).get("Content-Type"),
        ).toBe("application/json");
    });

    it("sends requests without a token when there is none", async () => {
        const stub = stubFetch({ tasks: [] });
        const provider = new TokenTesProvider(tesUrl, async () => "");
        await provider.listTasks();
        expect(authorizationOf(stub)).toBeNull();
    });

    it("gets the token of the session by default", async () => {
        const stub = stubFetch({ access_token: "token-1", tasks: [] });
        await new TokenTesProvider(tesUrl).listTasks();
        expect(stub.mock.calls[0][0]).toBe("/auth/api/token");
        expect(stub.mock.calls[1][0]).toBe(`${tesUrl}/tasks`);
        expect(authorizationOf(stub, 1)).toBe("Bearer token-1");
    });
});

describe("TokenWesProvider", () => {
    it("sends the token with every request", async () => {
        const stub = stubFetch({ runs: [] });
        const provider = new TokenWesProvider(wesUrl, async () => "token-1");
        await provider.listRuns();
        expect(stub.mock.calls[0][0]).toMatch(/^https:\/\/wes\.example\.org/);
        expect(authorizationOf(stub)).toBe("Bearer token-1");
    });

    it("sends requests without a token when there is none", async () => {
        const stub = stubFetch({ runs: [] });
        const provider = new TokenWesProvider(wesUrl, async () => "");
        await provider.listRuns();
        expect(authorizationOf(stub)).toBeNull();
    });

    it("gets the token of the session by default", async () => {
        const stub = stubFetch({ access_token: "token-1", runs: [] });
        await new TokenWesProvider(wesUrl).listRuns();
        expect(stub.mock.calls[0][0]).toBe("/auth/api/token");
        expect(authorizationOf(stub, 1)).toBe("Bearer token-1");
    });
});
