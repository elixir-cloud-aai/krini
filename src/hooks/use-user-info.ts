"use client"
import { AxiosError } from "axios";
import { useCallback, useEffect, useState } from "react";

type UserInfoResponse = {
    error: boolean;
    user: User | null;
};

export function useUserInfo() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<boolean>(false);

    const fetchUserInfo = useCallback(async () => {
        setLoading(true);
        setError(false);

        try {
            const userRawResp = await fetch("/auth/api/user-info");
            const userResp: UserInfoResponse = await userRawResp.json();

            if (userResp.error === false) setUser(userResp.user);
            else setError(true);
        } catch (e: any) {
            e = e as AxiosError;
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserInfo();
    }, [fetchUserInfo]);

    return { user, loading, error, refetch: fetchUserInfo };
}
