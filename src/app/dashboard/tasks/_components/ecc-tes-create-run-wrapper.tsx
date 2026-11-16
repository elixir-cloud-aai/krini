"use client";
import dynamic from "next/dynamic";
import { useTESProvider } from "@/hooks";

const ECCClientGa4ghTesRunCreate = dynamic(
    () =>
        import("@elixir-cloud/tes/react").then(
            (mod) => mod.ECCClientGa4ghTesRunCreate,
        ),
    {
        ssr: false,
        loading: () => (
            <div className="p-4 text-sm text-muted-foreground">
                Loading task form...
            </div>
        ),
    },
);

export function ECCClientGa4ghTesCreateRunsClient() {
    const provider = useTESProvider();

    if (!provider) {
        return (
            <div className="p-4 text-sm text-muted-foreground text-center">
                Select a TES instance to create task runs.
            </div>
        );
    }

    return <ECCClientGa4ghTesRunCreate provider={provider} />;
}
