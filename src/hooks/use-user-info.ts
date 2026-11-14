"use client";
import { UserTier } from "@/lib/oidc";
import { useCallback, useEffect, useState } from "react";

type UserInfoResponse = {
    error: boolean;
    user: User | null;
    tier?: UserTier;
    access_request_url?: string | null;
};

export function useUserInfo() {
    const [user, setUser] = useState<User | null>(null);
    const [tier, setTier] = useState<UserTier | null>(null);
    const [accessRequestUrl, setAccessRequestUrl] = useState<string | null>(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<boolean>(false);

    const fetchUserInfo = useCallback(async () => {
        setLoading(true);
        setError(false);

        try {
            const userRawResp = await fetch("/auth/api/user-info");
            const userResp: UserInfoResponse = await userRawResp.json();

            if (userResp.error === false) {
                setUser(userResp.user);
                setTier(userResp.tier ?? "user");
                setAccessRequestUrl(userResp.access_request_url ?? null);
            } else {
                if (userRawResp.status === 401) {
                    setUser(null);
                    setTier(null);
                    setAccessRequestUrl(null);
                } else {
                    setError(true);
                }
            }
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserInfo();
    }, [fetchUserInfo]);

    return {
        user,
        tier,
        accessRequestUrl,
        loading,
        error,
        refetch: fetchUserInfo,
    };
}
