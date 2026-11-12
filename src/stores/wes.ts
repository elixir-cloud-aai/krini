import { create } from "zustand";
import type { WESServer } from "@/types/workflows";

interface WESStore {
    selectedServer: string | null;
    setSelectedServer: (server: string) => void;

    servers: WESServer[];
    serversLoaded: boolean;
    setServers: (servers: WESServer[]) => void;
    getIdByServerURL: (id: string) => string | undefined;
}

export const useWESStore = create<WESStore>((set, get) => ({
    selectedServer: null,
    setSelectedServer: (selectedServer) => set({ selectedServer }),

    servers: [],
    serversLoaded: false,
    // A server that left the verified list must not stay selected
    setServers: (servers) =>
        set(({ selectedServer }) => ({
            servers,
            serversLoaded: true,
            selectedServer: servers.some((s) => s.url === selectedServer)
                ? selectedServer
                : null,
        })),
    getIdByServerURL: (url) =>
        get().servers.find((server) => server.url === url)?.id,
}));
