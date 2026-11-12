import type { RestWesProvider } from "@elixir-cloud/wes/providers";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getAccessToken, renewSession } from "@/lib/session";
import {
    TokenWesProvider,
    type UnauthorizedReason,
} from "@/lib/token-wes-provider";
import { useWESStore } from "@/stores/wes";

function handleUnauthorized(reason: UnauthorizedReason) {
    if (reason === "token-rejected") {
        toast.error(
            "This WES service doesn't accept your login. Please contact the service.",
            { id: "token-rejected" },
        );
        return;
    }

    toast.error("Your session has expired. Please log in again.", {
        id: "session-expired",
        action: {
            label: "Log in",
            onClick: () => {
                window.location.href = "/auth/api/login-redirect";
            },
        },
    });
}

function useWESProvider() {
    const selectedServer = useWESStore((state) => state.selectedServer);
    const [wesProvider, setWesProvider] = useState<RestWesProvider | null>(
        null,
    );

    useEffect(() => {
        if (!selectedServer) {
            setWesProvider(null);
            return;
        }

        const baseUrl = selectedServer.replace(/\/+$/, "");
        const provider = new TokenWesProvider(baseUrl, {
            getToken: getAccessToken,
            renew: renewSession,
            onUnauthorized: handleUnauthorized,
        });
        setWesProvider(provider);

        return () => {
            setWesProvider(null);
        };
    }, [selectedServer]);

    return {
        wesProvider,
        setWesProvider,
    };
}

export { useWESProvider };
