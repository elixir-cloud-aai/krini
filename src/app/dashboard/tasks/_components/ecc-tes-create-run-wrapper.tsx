"use client";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { toast } from "sonner";
import { ExampleButtons } from "@/components/shared/example-buttons";
import { useTESProvider } from "@/hooks";
import { withSelfHostedAce } from "@/lib/ace-workers";
import { fillTaskForm } from "@/lib/example-forms";
import type { TaskExample } from "@/lib/examples";

const ECCClientGa4ghTesRunCreate = dynamic(
    () =>
        import("@elixir-cloud/tes/react").then(
            (mod) => withSelfHostedAce(mod).ECCClientGa4ghTesRunCreate,
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

type Props = {
    /** Examples that fill the form (`TASK_EXAMPLES`) */
    examples?: TaskExample[];
};

export function ECCClientGa4ghTesCreateRunsClient({ examples = [] }: Props) {
    const provider = useTESProvider();
    const container = useRef<HTMLDivElement>(null);

    if (!provider) {
        return (
            <div className="p-4 text-sm text-muted-foreground text-center">
                Select a TES instance to create task runs.
            </div>
        );
    }

    const applyExample = (name: string) => {
        const example = examples.find((val) => val.name === name);
        const form =
            container.current?.querySelector(
                "ecc-client-ga4gh-tes-run-create",
            ) ?? null;
        if (!example) return;
        if (!form) toast.info("The task form is still loading; try again.");
        else if (!fillTaskForm(form, example.task))
            toast.error("The task form couldn't be filled with the example.");
    };

    return (
        <div className="space-y-4">
            <ExampleButtons examples={examples} onUse={applyExample} />
            <div ref={container}>
                <ECCClientGa4ghTesRunCreate provider={provider} />
            </div>
        </div>
    );
}
