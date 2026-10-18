"use client";
import dynamic from "next/dynamic";

const ECCClientGa4ghTesRuns = dynamic(
  () =>
    import("@elixir-cloud/tes/dist/react").then(
      (mod) => mod.ECCClientGa4ghTesRuns
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

export function ECCClientGa4ghTesRunsClient() {
  return <ECCClientGa4ghTesRuns />;
}
