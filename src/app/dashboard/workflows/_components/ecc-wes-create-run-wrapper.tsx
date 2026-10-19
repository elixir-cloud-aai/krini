"use client";
import dynamic from "next/dynamic";

const ECCClientGa4ghWesCreateRuns = dynamic(
  () =>
    import("@elixir-cloud/wes/react").then(
      (mod) => mod.ECCClientGa4ghWesRunCreate
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

export function ECCClientGa4ghWesCreateRunsClient() {
  return <ECCClientGa4ghWesCreateRuns />;
}
