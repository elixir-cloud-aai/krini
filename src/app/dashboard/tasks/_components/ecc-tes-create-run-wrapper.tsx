"use client";
import dynamic from "next/dynamic";

const ECCClientGa4ghTesCreateRuns = dynamic(
  () =>
    import("@elixir-cloud/tes/dist/react").then(
      (mod) => mod.ECCCLientGa4ghTesCreateRun
    ),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 text-sm text-muted-foreground">
        Loading task runs...
      </div>
    ),
  }
);

export function ECCClientGa4ghTesCreateRunsClient() {
  return <ECCClientGa4ghTesCreateRuns  />;
}
