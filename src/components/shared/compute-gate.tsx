"use client";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useUserInfo } from "@/hooks";

type Props = {
    children: ReactNode;
    fallback?: ReactNode;
    anonymousFallback?: ReactNode;
    loadingFallback?: ReactNode;
};

function ComputeGate({
    children,
    fallback,
    anonymousFallback,
    loadingFallback,
}: Props) {
    const { user, tier, accessRequestUrl, loading } = useUserInfo();

    if (loading) {
        return <>{loadingFallback ?? null}</>;
    }

    if (tier === "compute" || tier === "admin") {
        return <>{children}</>;
    }

    if (!user) {
        return <>{anonymousFallback ?? null}</>;
    }

    if (fallback !== undefined) {
        return <>{fallback}</>;
    }

    return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            {accessRequestUrl ? (
                <a
                    href={accessRequestUrl}
                    className="font-medium underline underline-offset-4"
                >
                    Request compute access
                </a>
            ) : (
                <span>Compute access required</span>
            )}
        </div>
    );
}

export { ComputeGate };
