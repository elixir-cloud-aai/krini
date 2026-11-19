import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    createTokenRefresher,
    lockWith,
    MIN_CHECK_INTERVAL_MS,
    parseExpiry,
    postRefresh,
    REFRESH_LOCK,
    REFRESH_MARGIN_MS,
    RETRY_BASE_MS,
    RETRY_MAX_MS,
    type RefreshResult,
} from "./token-refresh";

const minute = 60 * 1000;

beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-11-12T12:00:00Z") });
});

afterEach(() => {
    vi.useRealTimers();
});

/**
 * A refresher with a fake cookie and refresh route
 * @param expiry The access token's expiry (null: no `token_expires_at`)
 * @param results Results of the refresh requests, in order; a successful
 * one sets the expiry an hour ahead
 */
function setUp(expiry: number | null, results: RefreshResult[] = []) {
    const state = { expiry };
    const refresh = vi.fn(async () => {
        const result = results.shift() ?? { status: 200 };
        if (result.status === 200) state.expiry = Date.now() + 60 * minute;
        return result;
    });
    const onSessionEnded = vi.fn();
    const refresher = createTokenRefresher({
        readExpiry: () => state.expiry,
        refresh,
        onSessionEnded,
        withLock: (fn) => fn(),
    });
    return { state, refresh, onSessionEnded, refresher };
}

describe("parseExpiry", () => {
    it.each([
        [undefined, null],
        ["", null],
        ["abc", null],
        ["0", null],
        ["-5", null],
        ["1794488400000", 1794488400000],
    ])("parses %j as %j", (value, expected) => {
        expect(parseExpiry(value)).toBe(expected);
    });
});

describe("postRefresh", () => {
    it("posts to the refresh route and returns the status and code", async () => {
        const fetchFn = vi.fn(
            async () =>
                new Response(JSON.stringify({ code: "session_ended" }), {
                    status: 401,
                }),
        );
        expect(await postRefresh(fetchFn)).toEqual({
            status: 401,
            code: "session_ended",
        });
        expect(fetchFn).toHaveBeenCalledWith("/auth/api/refresh", {
            method: "POST",
            credentials: "same-origin",
        });
    });

    it.each([
        ["no JSON", "<html>"],
        ["no code", JSON.stringify({ success: true })],
        ["a code that is no string", JSON.stringify({ code: 1 })],
        ["null", "null"],
    ])("returns only the status for a body with %s", async (_, body) => {
        const fetchFn = vi.fn(async () => new Response(body, { status: 200 }));
        expect(await postRefresh(fetchFn)).toEqual({ status: 200 });
    });

    it("returns status 0 without a response", async () => {
        const fetchFn = vi.fn(async () => {
            throw new TypeError("Failed to fetch");
        });
        expect(await postRefresh(fetchFn)).toEqual({ status: 0 });
    });
});

describe("lockWith", () => {
    it("runs functions under the refresh lock", async () => {
        const request = vi.fn(
            async (_name: string, fn: () => Promise<unknown>) => fn(),
        );
        const withLock = lockWith({ request } as unknown as LockManager);
        expect(await withLock(async () => 42)).toBe(42);
        expect(request.mock.calls[0][0]).toBe(REFRESH_LOCK);
    });

    it("runs functions without a lock manager", async () => {
        expect(await lockWith(undefined)(async () => 42)).toBe(42);
    });
});

describe("createTokenRefresher", () => {
    it("does nothing for visitors without a session", async () => {
        const { refresh, onSessionEnded, refresher } = setUp(null);
        refresher.start();
        await vi.advanceTimersByTimeAsync(24 * 60 * minute);
        expect(refresh).not.toHaveBeenCalled();
        expect(onSessionEnded).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);
    });

    it("refreshes once the token expires within the margin", async () => {
        const { refresh, refresher } = setUp(Date.now() + 60 * minute);
        refresher.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(refresh).not.toHaveBeenCalled();

        // due 5 minutes before the real expiry, not earlier
        await vi.advanceTimersByTimeAsync(60 * minute - REFRESH_MARGIN_MS - 1);
        expect(refresh).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(refresh).toHaveBeenCalledTimes(1);

        // and again before the new token expires
        await vi.advanceTimersByTimeAsync(60 * minute - REFRESH_MARGIN_MS);
        expect(refresh).toHaveBeenCalledTimes(2);
        await refresher.stop();
    });

    it("refreshes at once a token close to expiry", async () => {
        const { refresh, refresher } = setUp(Date.now() + minute);
        refresher.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(refresh).toHaveBeenCalledTimes(1);
        await refresher.stop();
    });

    it("checks no more often than the minimum interval", async () => {
        // a token shorter-lived than the margin: due at every check
        const { refresh, refresher, state } = setUp(Date.now() + minute);
        refresh.mockImplementation(async () => {
            state.expiry = Date.now() + 2 * minute;
            return { status: 200 };
        });
        refresher.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(refresh).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(MIN_CHECK_INTERVAL_MS - 1);
        expect(refresh).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(refresh).toHaveBeenCalledTimes(2);
        await refresher.stop();
    });

    it("skips the refresh when another tab already did it", async () => {
        const { refresh, refresher, state } = setUp(Date.now() + 60 * minute);
        refresher.start();
        await vi.advanceTimersByTimeAsync(0);
        // the other tab's refresh moved the shared cookie
        state.expiry = Date.now() + 120 * minute;
        await vi.advanceTimersByTimeAsync(60 * minute - REFRESH_MARGIN_MS);
        expect(refresh).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(60 * minute);
        expect(refresh).toHaveBeenCalledTimes(1);
        await refresher.stop();
    });

    it("leaves the page only when the session ended", async () => {
        const { refresh, onSessionEnded, refresher } = setUp(Date.now(), [
            { status: 401, code: "session_ended" },
        ]);
        refresher.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(onSessionEnded).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(60 * minute);
        expect(refresh).toHaveBeenCalledTimes(1);
    });

    it.each([
        ["no_refresh_token"],
        [undefined],
    ])("stops without leaving the page on 401 %s", async (code) => {
        const { refresh, onSessionEnded, refresher } = setUp(Date.now(), [
            { status: 401, code },
        ]);
        refresher.start();
        await vi.advanceTimersByTimeAsync(60 * minute);
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(onSessionEnded).not.toHaveBeenCalled();
    });

    it("retries transient failures with backoff", async () => {
        const { refresh, onSessionEnded, refresher } = setUp(Date.now(), [
            { status: 503, code: "unavailable" },
            { status: 0 },
            { status: 409, code: "concurrent_refresh" },
        ]);
        refresher.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(refresh).toHaveBeenCalledTimes(1);

        await vi.advanceTimersByTimeAsync(RETRY_BASE_MS);
        expect(refresh).toHaveBeenCalledTimes(2);
        // the wait doubles
        await vi.advanceTimersByTimeAsync(2 * RETRY_BASE_MS - 1);
        expect(refresh).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(1);
        expect(refresh).toHaveBeenCalledTimes(3);
        await vi.advanceTimersByTimeAsync(4 * RETRY_BASE_MS);
        expect(refresh).toHaveBeenCalledTimes(4);
        expect(onSessionEnded).not.toHaveBeenCalled();
        await refresher.stop();
    });

    it("waits at most the maximum between retries", async () => {
        const { refresh, refresher } = setUp(Date.now());
        refresh.mockResolvedValue({ status: 503 });
        refresher.start();
        await vi.advanceTimersByTimeAsync(60 * minute);
        const calls = refresh.mock.calls.length;
        await vi.advanceTimersByTimeAsync(RETRY_MAX_MS);
        expect(refresh).toHaveBeenCalledTimes(calls + 1);
        await refresher.stop();
    });

    it("retries later when the lock fails", async () => {
        const refresh = vi.fn(async () => ({ status: 200 }));
        const withLock = vi.fn(async () => {
            throw new Error("lock failed");
        });
        const refresher = createTokenRefresher({
            readExpiry: () => Date.now(),
            refresh,
            onSessionEnded: vi.fn(),
            withLock,
        });
        refresher.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(withLock).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(RETRY_MAX_MS);
        expect(withLock).toHaveBeenCalledTimes(2);
        await refresher.stop();
        await vi.advanceTimersByTimeAsync(RETRY_MAX_MS);
        expect(withLock).toHaveBeenCalledTimes(2);
    });

    it("waits for a refresh in flight on stop, and refreshes no more", async () => {
        let answer: (result: RefreshResult) => void = () => {};
        const { refresh, onSessionEnded, refresher } = setUp(Date.now());
        refresh.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    answer = resolve;
                }),
        );
        refresher.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(refresh).toHaveBeenCalledTimes(1);

        let stopped = false;
        const stopping = refresher.stop().then(() => {
            stopped = true;
        });
        await vi.advanceTimersByTimeAsync(0);
        expect(stopped).toBe(false);
        answer({ status: 401, code: "session_ended" });
        await stopping;
        // a stopped page ignores the answer and schedules nothing
        expect(onSessionEnded).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(60 * minute);
        expect(refresh).toHaveBeenCalledTimes(1);
    });

    it("refreshes nothing that was waiting for the lock at stop", async () => {
        let release: () => void = () => {};
        const refresh = vi.fn(async () => ({ status: 200 }));
        const refresher = createTokenRefresher({
            readExpiry: () => Date.now(),
            refresh,
            onSessionEnded: vi.fn(),
            // another tab holds the lock
            withLock: (fn) =>
                new Promise<void>((resolve) => {
                    release = resolve;
                }).then(fn),
        });
        refresher.start();
        const stopping = refresher.stop();
        release();
        await stopping;
        expect(refresh).not.toHaveBeenCalled();
    });

    it("stops when the session's expiry is gone after a refresh", async () => {
        const { refresh, refresher, state } = setUp(Date.now());
        refresh.mockImplementationOnce(async () => {
            state.expiry = null;
            return { status: 200 };
        });
        refresher.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(vi.getTimerCount()).toBe(0);
    });

    it("schedules no retry when the lock fails after stop", async () => {
        let fail: () => void = () => {};
        const withLock = vi.fn(
            () =>
                new Promise<never>((_, reject) => {
                    fail = () => reject(new Error("lock failed"));
                }),
        );
        const refresher = createTokenRefresher({
            readExpiry: () => Date.now(),
            refresh: vi.fn(),
            onSessionEnded: vi.fn(),
            withLock,
        });
        refresher.start();
        const stopping = refresher.stop();
        fail();
        await stopping;
        expect(vi.getTimerCount()).toBe(0);
    });

    it("keeps one timer when started again", async () => {
        const { refresh, refresher } = setUp(Date.now() + 60 * minute);
        refresher.start();
        refresher.start();
        await vi.advanceTimersByTimeAsync(0);
        expect(vi.getTimerCount()).toBe(1);
        await vi.advanceTimersByTimeAsync(60 * minute - REFRESH_MARGIN_MS);
        expect(refresh).toHaveBeenCalledTimes(1);
        await refresher.stop();
        expect(vi.getTimerCount()).toBe(0);
    });
});
