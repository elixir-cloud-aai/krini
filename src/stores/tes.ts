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
    setServers: (servers) => set({ servers, serversLoaded: true }),
}));
