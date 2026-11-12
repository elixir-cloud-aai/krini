import { beforeEach, describe, expect, it } from "vitest";
import { useTESStore } from "@/stores/tes";
import { useWESStore } from "@/stores/wes";
import type { TESServer } from "@/types/tasks";
import type { WESServer } from "@/types/workflows";

const kept = "https://kept.example.org/ga4gh/wes/v1";
const dropped = "https://dropped.example.org/ga4gh/wes/v1";

describe.each([
    ["WES", useWESStore],
    ["TES", useTESStore],
] as const)("%s store", (_name, store) => {
    type Server = WESServer & TESServer;
    const server = (url: string) => ({ id: url, url }) as Server;

    beforeEach(() => {
        store.setState({
            selectedServer: null,
            servers: [],
            serversLoaded: false,
        });
    });

    it("keeps the selection if the new list has it", () => {
        store.getState().setServers([server(kept), server(dropped)]);
        store.getState().setSelectedServer(kept);

        store.getState().setServers([server(kept)]);

        expect(store.getState().selectedServer).toBe(kept);
    });

    it("clears the selection if the new list doesn't have it", () => {
        store.getState().setServers([server(kept), server(dropped)]);
        store.getState().setSelectedServer(dropped);

        store.getState().setServers([server(kept)]);

        expect(store.getState().selectedServer).toBeNull();
    });
});
