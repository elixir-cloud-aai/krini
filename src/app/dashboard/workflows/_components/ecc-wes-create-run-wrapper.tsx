"use client";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { toast } from "sonner";
import { ExampleButtons } from "@/components/shared/example-buttons";
import { useWESProvider } from "@/hooks";
import { withSelfHostedAce } from "@/lib/ace-workers";
import { examplesForService, fillWorkflowForm } from "@/lib/example-forms";
import type { WorkflowExample } from "@/lib/examples";
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

type Props = {
    /** Examples that fill the form (`WORKFLOW_EXAMPLES`) */
    examples?: WorkflowExample[];
};

export function ECCClientGa4ghWesCreateRunsClient({ examples = [] }: Props) {
    const { wesProvider } = useWESProvider();
    const selectedServer = useWESStore((state) => state.selectedServer);
    const servers = useWESStore((state) => state.servers);
    const container = useRef<HTMLDivElement>(null);

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

    // only the examples of the workflow types that the service runs
    const offered = examplesForService(
        examples,
        servers.find((server) => server.url === selectedServer)?.serviceInfo
            ?.workflow_type_versions,
    );

    const applyExample = (name: string) => {
        const example = offered.find((val) => val.name === name);
        const form =
            container.current?.querySelector(
                "ecc-client-ga4gh-wes-run-create",
            ) ?? null;
        if (!example) return;
        if (!form) toast.info("The workflow form is still loading; try again.");
        else if (!fillWorkflowForm(form, example.run))
            toast.error(
                "The workflow form couldn't be filled with the example.",
            );
    };

    return (
        <div className="space-y-4">
            <ExampleButtons examples={offered} onUse={applyExample} />
            <div ref={container}>
                <ECCClientGa4ghWesCreateRuns provider={wesProvider} />
            </div>
        </div>
    );
}
