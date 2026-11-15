import type { RestWesProvider } from "@elixir-cloud/wes/providers";
import { useEffect, useState } from "react";
import { getAccessToken, TokenWesProvider } from "@/lib/service-providers";
import { useWESStore } from "@/stores/wes";

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
        const provider = new TokenWesProvider(baseUrl, getAccessToken);
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
