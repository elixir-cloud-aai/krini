import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, renewSession } from "@/lib/session";

describe("renewSession", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("shares one refresh request between concurrent calls", async () => {
        const fetchMock = vi.fn(
            async (_input: RequestInfo | URL, _init?: RequestInit) =>
                new Response(null, { status: 200 }),
        );
        vi.stubGlobal("fetch", fetchMock);

        // E.g. the refresh timer and a WES request after a 401
        const results = await Promise.all([renewSession(), renewSession()]);

        expect(results).toEqual([true, true]);
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(fetchMock).toHaveBeenCalledWith(
            "/auth/api/refresh",
            expect.objectContaining({ method: "POST" }),
        );
    });

    it("sends a new request once the previous one is done", async () => {
        const fetchMock = vi.fn(
            async () => new Response(null, { status: 200 }),
        );
        vi.stubGlobal("fetch", fetchMock);

        await renewSession();
        await renewSession();

        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("reports a failed refresh", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(null, { status: 401 })),
        );

        await expect(renewSession()).resolves.toBe(false);
    });

    it("gives up on a refresh request that doesn't settle", async () => {
        vi.useFakeTimers();
        vi.stubGlobal(
            "fetch",
            vi.fn(
                (_input: RequestInfo | URL, init?: RequestInit) =>
                    new Promise<Response>((_resolve, reject) => {
                        init?.signal?.addEventListener("abort", () =>
                            reject(init.signal?.reason),
                        );
                    }),
            ),
        );

        const renewal = renewSession();
        await vi.advanceTimersByTimeAsync(15_000);

        await expect(renewal).resolves.toBe(false);
        vi.useRealTimers();
    });
});

describe("getAccessToken", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("returns the token of the session", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => Response.json({ access_token: "token" })),
        );

        await expect(getAccessToken()).resolves.toBe("token");
    });

    it("returns an empty token without a session", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response(null, { status: 401 })),
        );

        await expect(getAccessToken()).resolves.toBe("");
    });
});
