import { create } from "zustand";
import type { WESServer, WESServiceInfo } from "@/types/workflows";

interface WESStore {
    selectedServer: string | null;
    setSelectedServer: (server: string) => void;

    servers: WESServer[];
    serversLoaded: boolean;
    setServers: (servers: WESServer[]) => void;
    getIdByServerURL: (id: string) => string | undefined;

    serviceInfo: Record<string, WESServiceInfo | null>;
    setServiceInfo: (serverId: string, info: WESServiceInfo | null) => void;
}

export const useWESStore = create<WESStore>((set, get) => ({
    selectedServer: null,
    setSelectedServer: (selectedServer) => set({ selectedServer }),

    servers: [],
    serversLoaded: false,
    setServers: (servers) => set({ servers, serversLoaded: true }),
    getIdByServerURL: (url) =>
        get().servers.find((server) => server.url === url)?.id,

    serviceInfo: {},
    setServiceInfo: (serverId, info) =>
        set((state) => ({
            serviceInfo: { ...state.serviceInfo, [serverId]: info },
        })),
}));
