/**
 * @description the browser's side of the session refresh: renews the access
 * token shortly before it expires, through `POST /auth/api/refresh`, and
 * handles that route's failures (see its `code`s): it retries transient
 * failures with backoff, ends the page's session only when the server
 * says the session is over, and does nothing for visitors without a
 * session. All tabs of a browser share one lock, so only one of them
 * refreshes at a time, and a logout waits for a refresh in flight.
 */

/** Refresh when the access token expires within this time, or within
 * half its lifetime if that is shorter */
export const REFRESH_MARGIN_MS = 5 * 60 * 1000;
/** Longest wait between two checks (`setTimeout` overflows at 24.8 days) */
export const MAX_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** Longest wait for an answer of the refresh route: well above its own
 * worst case (three provider requests of 10 s each), so that it doesn't
 * rotate a refresh token whose answer the browser no longer takes */
export const REFRESH_TIMEOUT_MS = 60 * 1000;
/** Shortest time between two checks */
export const MIN_CHECK_INTERVAL_MS = 30 * 1000;
/** First wait after a failed refresh; doubles with each further failure */
export const RETRY_BASE_MS = 5 * 1000;
/** Longest wait after failed refreshes */
export const RETRY_MAX_MS = 5 * 60 * 1000;
/** Name of the Web Lock that refreshes and logouts hold */
export const REFRESH_LOCK = "krini-session-refresh";

/** The access token's expiry and lifetime (null: unknown), in ms */
export type Expiry = { at: number; lifetime: number | null };

/** Outcome of a refresh request: HTTP status (0: no response) and `code` */
export type RefreshResult = { status: number; code?: string };

/** What the refresher needs from the browser; tests pass their own */
export type RefresherDeps = {
    /** The access token's expiry from `token_expires_at`, or null */
    readExpiry: () => Expiry | null;
    /** Sends the refresh request */
    refresh: () => Promise<RefreshResult>;
    /** Leaves the ended session, e.g. to the login page */
    onSessionEnded: () => void;
    /** Runs a function while holding the refresh lock */
    withLock: <T>(fn: () => Promise<T>) => Promise<T>;
};

/**
 * Parses the value of the `token_expires_at` cookie: the expiry in ms,
 * then optionally `:` and the token's lifetime in ms
 * @param value The cookie's value
 * @returns The expiry, or null if missing or no positive number
 */
export function parseExpiry(value: string | undefined): Expiry | null {
    const [at, lifetime] = (value || "-").split(":").map(Number);
    if (!(Number.isFinite(at) && at > 0)) return null;
    return {
        at,
        lifetime: Number.isFinite(lifetime) && lifetime > 0 ? lifetime : null,
    };
}

/**
 * How long before its expiry a token's refresh is due: at most half its
 * lifetime, so that a short-lived token isn't due again right after its
 * refresh
 * @param expiry The token's expiry
 * @returns The margin in ms
 */
function marginOf(expiry: Expiry): number {
    return expiry.lifetime === null
        ? REFRESH_MARGIN_MS
        : Math.min(REFRESH_MARGIN_MS, expiry.lifetime / 2);
}

/**
 * Sends `POST /auth/api/refresh`
 * @param fetchFn The fetch function
 * @returns The status and failure `code` of the response
 */
export async function postRefresh(
    fetchFn: typeof fetch,
): Promise<RefreshResult> {
    let response: Response;
    try {
        response = await fetchFn("/auth/api/refresh", {
            method: "POST",
            credentials: "same-origin",
            // the lock is held meanwhile, and logouts wait for it
            signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
        });
    } catch {
        return { status: 0 };
    }
    let body: unknown;
    try {
        body = await response.json();
    } catch {
        body = null;
    }
    const code = (body as { code?: unknown } | null)?.code;
    return {
        status: response.status,
        ...(typeof code === "string" ? { code } : {}),
    };
}

/**
 * Wraps a Web Lock manager as `withLock`; without one (old browsers,
 * insecure contexts), functions run without a lock
 * @param locks The browser's lock manager, if any
 * @returns The `withLock` function
 */
export function lockWith(locks: LockManager | undefined) {
    return <T>(fn: () => Promise<T>): Promise<T> =>
        locks ? (locks.request(REFRESH_LOCK, fn) as Promise<T>) : fn();
}

/**
 * Creates the refresher of a page
 * @param deps What it needs from the browser
 * @returns `start()`, and `stop()`, which resolves once no refresh is in
 * flight any more
 */
export function createTokenRefresher(deps: RefresherDeps) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const inFlight = new Set<Promise<void>>();
    let stopped = true;
    let failures = 0;

    function schedule(ms: number) {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            void check();
        }, ms);
    }

    /** Waits until the refresh is due; nothing without a session */
    function scheduleNext() {
        const expiry = deps.readExpiry();
        if (expiry === null) return;
        const due = expiry.at - Date.now() - marginOf(expiry);
        schedule(
            Math.min(
                Math.max(due, MIN_CHECK_INTERVAL_MS),
                MAX_CHECK_INTERVAL_MS,
            ),
        );
    }

    async function attempt() {
        if (stopped) return;
        // another tab may have refreshed while this one waited for the lock
        const expiry = deps.readExpiry();
        if (expiry === null) return;
        if (expiry.at - Date.now() > marginOf(expiry)) {
            failures = 0;
            scheduleNext();
            return;
        }

        const result = await deps.refresh();
        if (stopped) return;
        if (result.status === 200) {
            failures = 0;
            scheduleNext();
            return;
        }
        if (result.status === 401) {
            // `no_refresh_token`: the server deleted `token_expires_at`,
            // and the access token, if any, stays until it expires
            if (result.code === "session_ended") deps.onSessionEnded();
            return;
        }
        // the provider is unavailable, a concurrent refresh won, or no
        // response came: the session stays; try again
        failures += 1;
        schedule(Math.min(RETRY_BASE_MS * 2 ** (failures - 1), RETRY_MAX_MS));
    }

    /** Runs a check under the lock; `stop()` waits for those in flight */
    function check(): Promise<void> {
        const run = deps
            .withLock(attempt)
            .catch(() => {
                // the lock failed: the session stays; try again
                if (!stopped) schedule(RETRY_MAX_MS);
            })
            .finally(() => {
                inFlight.delete(run);
            });
        inFlight.add(run);
        return run;
    }

    return {
        start() {
            stopped = false;
            failures = 0;
            void check();
        },
        async stop() {
            stopped = true;
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
            await Promise.all([...inFlight]);
        },
    };
}
