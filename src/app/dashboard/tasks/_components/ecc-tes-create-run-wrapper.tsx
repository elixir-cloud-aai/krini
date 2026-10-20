"use client";
import { useTESStore } from "@/stores/tes";
import dynamic from "next/dynamic";

const ECCClientGa4ghTesCreateRuns = dynamic(
    () =>
        import("@elixir-cloud/tes/dist/react").then(
            (mod) => mod.ECCCLientGa4ghTesCreateRun,
        ),
    {
        ssr: false,
        loading: () => (
            <div className="p-4 text-sm text-muted-foreground">
                Loading task runs...
            </div>
        ),
    },
);

export function ECCClientGa4ghTesCreateRunsClient() {
    const selectedServer = useTESStore((state) => state.selectedServer);

    if (!selectedServer) {
        return (
            <div className="p-4 text-sm text-muted-foreground text-center">
                Select a TES instance to create task runs.
            </div>
        );
    }

    const baseURL = `${selectedServer.replace(/\/+$/, "")}/ga4gh/tes/v1`;
    
    return <ECCClientGa4ghTesCreateRuns baseURL={baseURL} />;
}
