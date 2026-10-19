"use client";
import dynamic from "next/dynamic";

const ECCClientGa4ghWesRuns = dynamic(
  () =>
    import("@elixir-cloud/wes/react").then(
      (mod) => mod.ECCClientGa4ghWesRuns
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

export function ECCClientGa4ghWesRunsClient() {
  return <ECCClientGa4ghWesRuns baseUrl="https://weskit.bihealth.org/ga4gh/wes/v1"  />
}
