"use client";
import dynamic from "next/dynamic";
import { useTESProvider } from "@/hooks";
import { useTESStore } from "@/stores/tes";

const ECCClientGa4ghTesRun = dynamic(
    () =>
        import("@elixir-cloud/tes/react").then(
            (mod) => mod.ECCClientGa4ghTesRun,
        ),
    {
        ssr: false,
        loading: () => (
            <div className="p-4 text-sm text-muted-foreground">
                Loading task...
            </div>
        ),
    },
);

/**
 * Details of a task of the selected TES service, with its logs, and to
 * cancel it
 * @param props.taskId ID of the task
 */
export function ECCClientGa4ghTesTaskClient({ taskId }: { taskId: string }) {
    const selectedServer = useTESStore((state) => state.selectedServer);
    const provider = useTESProvider();

    if (!provider) {
        return (
            <div className="p-4 text-sm text-muted-foreground text-center">
                Select the TES instance of the task to view it.
            </div>
        );
    }

    return (
        <ECCClientGa4ghTesRun
            key={`${selectedServer} ${taskId}`}
            provider={provider}
            runId={taskId}
        />
    );
}
