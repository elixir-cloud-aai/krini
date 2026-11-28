"use client";
import dynamic from "next/dynamic";
import { useRef } from "react";
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

    return (
        <div className="space-y-4">
            <ExampleButtons
                examples={examples}
                form="task"
                fill={(example) =>
                    fillTaskForm(
                        container.current?.querySelector(
                            "ecc-client-ga4gh-tes-run-create",
                        ) ?? null,
                        example.task,
                    )
                }
            />
            <div ref={container}>
                <ECCClientGa4ghTesRunCreate provider={provider} />
            </div>
        </div>
    );
}
