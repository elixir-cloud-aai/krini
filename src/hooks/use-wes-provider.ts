import { useWESStore } from "@/stores/wes";
import { RestWesProvider } from "@elixir-cloud/wes/providers";
import { getCookie } from "cookies-next/client";
import { useEffect, useState } from "react";

class TokenWesProvider extends RestWesProvider {
    private getToken: () => string;

    constructor(baseUrl: string, getToken: () => string) {
        super(baseUrl);
        this.getToken = getToken;
    }

    async fetch(input: string, init: RequestInit = {}) {
        const headers = new Headers(init.headers);
        const token = this.getToken();

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        return super.fetch(input, {
            ...init,
            headers,
        });
    }
}

function getAccessToken(): string {
    const token = getCookie("access_token");

    return typeof token === "string" ? token : "";
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
