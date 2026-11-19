"use client";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useWESProvider } from "@/hooks";
import { withSelfHostedAce } from "@/lib/ace-workers";
import { useWESStore } from "@/stores/wes";

const ECCClientGa4ghWesRuns = dynamic(
    () =>
        import("@elixir-cloud/wes/react").then(
            (mod) => withSelfHostedAce(mod).ECCClientGa4ghWesRuns,
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

export function ECCClientGa4ghWesRunsClient() {
    const router = useRouter();
    const { wesProvider } = useWESProvider();
    const selectedServer = useWESStore((state) => state.selectedServer);
    const servers = useWESStore((state) => state.servers);
    const serviceId = servers.find(
        (server) => server.url === selectedServer,
    )?.id;

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

    return (
        <ECCClientGa4ghWesRuns
            key={selectedServer}
            provider={wesProvider}
            pageSize={10}
            onEccRunsSelected={(event) =>
                router.push(
                    `/dashboard/workflows/details?${new URLSearchParams({
                        id: event.detail.runId,
                        ...(serviceId ? { service: serviceId } : {}),
                    })}`,
                )
            }
        />
    );
}
