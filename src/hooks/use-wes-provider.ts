import { RestWesProvider } from "@elixir-cloud/wes/providers";
import { useEffect, useState } from "react";
import { useWESStore } from "@/stores/wes";

class TokenWesProvider extends RestWesProvider {
    private getToken: () => Promise<string>;

    constructor(baseUrl: string, getToken: () => Promise<string>) {
        super(baseUrl);
        this.getToken = getToken;
    }

    async fetch(input: string, init: RequestInit = {}) {
        const headers = new Headers(init.headers);
        const token = await this.getToken();

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        return super.fetch(input, {
            ...init,
            headers,
        });
    }
}

async function getAccessToken(): Promise<string> {
    try {
        const response = await fetch("/auth/api/token", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
        });

        if (!response.ok) {
            return "";
        }

        const data: { access_token: string } = await response.json();
        return data.access_token || "";
    } catch {
        return "";
    }
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
