import { WESServer } from "@/types/workflows";
import { create } from "zustand";

interface WESStore {
    selectedServer: string;
    setSelectedServer: (server: string) => void;

    servers: WESServer[];
    serversLoaded: boolean;
    setServers: (servers: WESServer[]) => void;
}

export const useWESStore = create<WESStore>((set) => ({
    selectedServer: "/tes-api",
    setSelectedServer: (selectedServer) => set({ selectedServer }),

    servers: [],
    serversLoaded: false,
    setServers: (servers) =>
        set({ servers, serversLoaded: true }),
}));