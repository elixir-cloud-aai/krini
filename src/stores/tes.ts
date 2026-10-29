import { TESServer } from "@/types/tasks";
import { create } from "zustand";

interface TESStore {
    selectedServer: string;
    setSelectedServer: (server: string) => void;

    servers: TESServer[];
    serversLoaded: boolean;
    setServers: (servers: TESServer[]) => void;
}

export const useTESStore = create<TESStore>((set) => ({
    selectedServer: "/tes-api",
    setSelectedServer: (selectedServer) => set({ selectedServer }),

    servers: [],
    serversLoaded: false,
    setServers: (servers) =>
        set({ servers, serversLoaded: true }),
}));