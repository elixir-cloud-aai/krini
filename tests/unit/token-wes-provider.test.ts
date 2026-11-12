import { afterEach, describe, expect, it, vi } from "vitest";
import { renewSession, TokenWesProvider } from "@/lib/token-wes-provider";

const BASE_URL = "https://wes.example.org/ga4gh/wes/v1";

function respond(status: number) {
    return new Response(JSON.stringify({ runs: [] }), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function setup(statuses: number[], renewed = true) {
    const fetchMock = vi.fn(async () => respond(statuses.shift() ?? 200));
    vi.stubGlobal("fetch", fetchMock);

    let token = "first";
    const renew = vi.fn(async () => {
        token = "second";
        return renewed;
    });
    const onUnauthorized = vi.fn();
    const provider = new TokenWesProvider(BASE_URL, {
        getToken: async () => token,
        renew,
        onUnauthorized,
    });

    const authorization = () =>
        fetchMock.mock.calls.map(([, init]) =>
            new Headers((init as RequestInit).headers).get("Authorization"),
        );

    return { provider, fetchMock, renew, onUnauthorized, authorization };
}

describe("TokenWesProvider", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("adds the token to each request", async () => {
        const { provider, renew, authorization } = setup([200]);

        await provider.listRuns();

        expect(authorization()).toEqual(["Bearer first"]);
        expect(renew).not.toHaveBeenCalled();
    });

    it("renews once and retries once after a 401", async () => {
        const { provider, fetchMock, renew, onUnauthorized, authorization } =
            setup([401, 200]);

        await provider.listRuns();

        expect(renew).toHaveBeenCalledOnce();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(authorization()).toEqual(["Bearer first", "Bearer second"]);
        expect(onUnauthorized).not.toHaveBeenCalled();
    });

    it("asks to log in if the retry is rejected too", async () => {
        const { provider, fetchMock, renew, onUnauthorized } = setup([
            401, 401, 401,
        ]);

        await expect(provider.listRuns()).rejects.toThrow();

        expect(renew).toHaveBeenCalledOnce();
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(onUnauthorized).toHaveBeenCalledOnce();
    });

    it("doesn't retry if the session can't be renewed", async () => {
        const { provider, fetchMock, onUnauthorized } = setup([401], false);

        await expect(provider.listRuns()).rejects.toThrow();

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(onUnauthorized).toHaveBeenCalledOnce();
    });
});

describe("renewSession", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("shares one refresh request between concurrent calls", async () => {
        const fetchMock = vi.fn(
            async () => new Response(null, { status: 200 }),
        );
        vi.stubGlobal("fetch", fetchMock);

        const results = await Promise.all([renewSession(), renewSession()]);

        expect(results).toEqual([true, true]);
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(fetchMock).toHaveBeenCalledWith(
            "/auth/api/refresh",
            expect.objectContaining({ method: "POST" }),
        );
    });

    it("reports a failed refresh", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(null, { status: 401 })),
        );

        await expect(renewSession()).resolves.toBe(false);
    });
});
