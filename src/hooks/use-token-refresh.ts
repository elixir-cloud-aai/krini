"use client";
import { getCookie } from "cookies-next/client";
import { useEffect } from "react";
import {
    createTokenRefresher,
    lockWith,
    parseExpiry,
    postRefresh,
} from "@/lib/token-refresh";

/** Runs a function while holding the lock that refreshes hold */
export function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
    return lockWith(globalThis.navigator?.locks)(fn);
}

/** The page's one refresher; the browser APIs are used only when it runs */
const refresher = createTokenRefresher({
    readExpiry: () => parseExpiry(getCookie("token_expires_at")),
    refresh: () => postRefresh(fetch),
    onSessionEnded: () => {
        window.location.href = "/auth/login";
    },
    withLock: withRefreshLock,
});

/** Keeps the session's access token fresh while the page is open */
export function useTokenRefresh() {
    useEffect(() => {
        refresher.start();
        return () => {
            void refresher.stop();
        };
    }, []);
}

/**
 * Stops the page's refreshes and waits for one in flight, e.g. before a
 * logout, so that no refresh can set the session's cookies again
 */
export function stopTokenRefresh(): Promise<void> {
    return refresher.stop();
}

/** Starts the page's refreshes again, e.g. after a failed logout */
export function startTokenRefresh(): void {
    refresher.start();
}
