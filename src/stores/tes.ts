import { create } from "zustand";
import type { TESServer } from "@/types/tasks";

interface TESStore {
    selectedServer: string | null;
    setSelectedServer: (server: string) => void;

    servers: TESServer[];
    serversLoaded: boolean;
    setServers: (servers: TESServer[]) => void;
}

export const useTESStore = create<TESStore>((set) => ({
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
}));
