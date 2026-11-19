"use client";
import dynamic from "next/dynamic";
import { useWESProvider } from "@/hooks";
import { withSelfHostedAce } from "@/lib/ace-workers";
import { useWESStore } from "@/stores/wes";

const ECCClientGa4ghWesCreateRuns = dynamic(
    () =>
        import("@elixir-cloud/wes/react").then(
            (mod) => withSelfHostedAce(mod).ECCClientGa4ghWesRunCreate,
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

export function ECCClientGa4ghWesCreateRunsClient() {
    const { wesProvider } = useWESProvider();
    const selectedServer = useWESStore((state) => state.selectedServer);

    if (
        selectedServer === null ||
        selectedServer === "" ||
        wesProvider === null
    )
        return (
            <div className="h-full mt-10 gap-2 text-sm text-muted-foreground text-center">
                Please select a WES Server to continue.
            </div>
        );
    return <ECCClientGa4ghWesCreateRuns provider={wesProvider} />;
}
