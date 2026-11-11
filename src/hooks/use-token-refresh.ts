"use client";
import { getCookie } from "cookies-next/client";
import { useEffect, useRef } from "react";
import { axiosBase } from "@/lib/axios";

export function useTokenRefresh() {
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const checkAndRefreshToken = async () => {
            try {
                const expiresAtCookie = getCookie("token_expires_at");
                const expiresAt = expiresAtCookie
                    ? Number.parseInt(expiresAtCookie, 10)
                    : null;

                if (!expiresAt) {
                    return;
                }

                const now = Date.now();
                const timeUntilExpiry = expiresAt - now;

                if (timeUntilExpiry < 5 * 60 * 1000) {
                    await axiosBase.post("/auth/api/refresh");
                }

                const updatedExpiresAtCookie = getCookie("token_expires_at");
                const updatedExpiresAt = updatedExpiresAtCookie
                    ? Number.parseInt(updatedExpiresAtCookie, 10)
                    : null;

                if (updatedExpiresAt) {
                    const updatedTimeUntilExpiry =
                        updatedExpiresAt - Date.now();
                    const nextCheckTime = Math.max(
                        updatedTimeUntilExpiry / 2,
                        120 * 1000,
                    );
                    refreshTimerRef.current = setTimeout(
                        checkAndRefreshToken,
                        nextCheckTime,
                    );
                }
            } catch {
                window.location.href = "/auth/api/login-redirect";
            }
        };

        checkAndRefreshToken();

        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, []);
}
