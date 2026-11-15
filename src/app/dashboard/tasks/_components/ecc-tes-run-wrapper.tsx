"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTESProvider } from "@/hooks";
import { useTESStore } from "@/stores/tes";

const ECCClientGa4ghTesRuns = dynamic(
    () =>
        import("@elixir-cloud/tes/react").then(
            (mod) => mod.ECCClientGa4ghTesRuns,
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

export function ECCClientGa4ghTesRunsClient() {
    const router = useRouter();
    const selectedServer = useTESStore((state) => state.selectedServer);
    const servers = useTESStore((state) => state.servers);
    const provider = useTESProvider();
    // the details link names the service, so the task is looked up there
    const serviceId = servers.find(
        (server) => server.url === selectedServer,
    )?.id;

    if (!provider) {
        return (
            <div className="p-4 text-sm text-muted-foreground text-center">
                Select a TES instance to view task runs.
            </div>
        );
    }

    return (
        <ECCClientGa4ghTesRuns
            key={selectedServer}
            provider={provider}
            pageSize={10}
            onEccRunsSelected={(event) =>
                router.push(
                    `/dashboard/tasks/details?${new URLSearchParams({
                        id: event.detail.runId,
                        ...(serviceId ? { service: serviceId } : {}),
                    })}`,
                )
            }
        />
    );
}
