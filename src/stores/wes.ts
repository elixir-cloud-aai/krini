import { create } from "zustand";
import type { WESServer } from "@/types/workflows";

interface WESStore {
    selectedServer: string | null;
    setSelectedServer: (server: string) => void;

    servers: WESServer[];
    serversLoaded: boolean;
    setServers: (servers: WESServer[]) => void;
}

export const useWESStore = create<WESStore>((set) => ({
    selectedServer: null,
    setSelectedServer: (selectedServer) => set({ selectedServer }),

    servers: [],
    serversLoaded: false,
    setServers: (servers) => set({ servers, serversLoaded: true }),
}));
