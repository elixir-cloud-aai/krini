"use client";

import { useTokenRefresh } from "@/hooks/use-token-refresh";

export function TokenRefreshProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    useTokenRefresh();
    return <>{children}</>;
}
