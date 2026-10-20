"use client";
import { useTESStore } from "@/stores/tes";
import dynamic from "next/dynamic";

const ECCClientGa4ghTesRuns = dynamic(
    () =>
        import("@elixir-cloud/tes/dist/react").then(
            (mod) => mod.ECCClientGa4ghTesRuns,
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

export function ECCClientGa4ghTesRunsClient() {
  const selectedServer = useTESStore((state) => state.selectedServer);

  if (!selectedServer) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        Select a TES instance to view task runs.
      </div>
    );
  }

  const baseURL = `${selectedServer.replace(/\/+$/, "")}/ga4gh/tes/v1`;

  return (
    <ECCClientGa4ghTesRuns
      key={baseURL}
      baseURL={baseURL}
      pageSize={10}
    />
  );
}