"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useWESProvider } from "@/hooks";
import { useWESStore } from "@/stores/wes";
import { WESServerList } from "./wes-server-list";

const ECCClientGa4ghWesRun = dynamic(
    () =>
        import("@elixir-cloud/wes/react").then(
            (mod) => mod.ECCClientGa4ghWesRun,
        ),
    {
        ssr: false,
        loading: () => (
            <div className="p-4 text-sm text-muted-foreground">
                Loading workflow run...
            </div>
        ),
    },
);

/**
 * Details of a workflow run: its state, logs and outputs
 *
 * The run belongs to the service of the link (`serviceId`, the registry
 * ID), which is selected from the registry list. Without a service in the
 * link, the current selection is used, with a selector to change it.
 * @param props.runId ID of the workflow run
 * @param props.serviceId Registry ID of the run's service, if known
 */
export function ECCClientGa4ghWesRunClient({
    runId,
    serviceId,
}: {
    runId: string;
    serviceId?: string;
}) {
    const servers = useWESStore((state) => state.servers);
    const serversLoaded = useWESStore((state) => state.serversLoaded);
    const selectedServer = useWESStore((state) => state.selectedServer);
    const setSelectedServer = useWESStore((state) => state.setSelectedServer);
    const { wesProvider } = useWESProvider();

    // only services of the (https-only) registry list can be selected
    const linked = serviceId
        ? servers.find((server) => server.id === serviceId)
        : undefined;

    useEffect(() => {
        if (linked && linked.url !== selectedServer)
            setSelectedServer(linked.url);
    }, [linked, selectedServer, setSelectedServer]);

    if (serviceId && serversLoaded && !linked) {
        return (
            <p className="p-4 text-sm text-muted-foreground text-center">
                The service of this run isn't in the list of WES instances.
            </p>
        );
    }

    if (!serviceId && !selectedServer) {
        return (
            <div className="flex flex-col items-center gap-2 p-4 text-sm text-muted-foreground">
                <WESServerList />
                Select the WES instance of the run to view it.
            </div>
        );
    }

    if (!wesProvider || (serviceId && linked?.url !== selectedServer)) {
        // loads the registry list, which the link's service comes from
        return <WESServerList />;
    }

    const name = servers.find((server) => server.url === selectedServer)?.name;

    return (
        <div className="space-y-2">
            {/* a link without a service uses the current selection, which
            the user can change if the run is on another service */}
            {serviceId ? null : <WESServerList />}
            {name ? (
                <p className="text-sm text-muted-foreground">
                    WES instance: {name}
                </p>
            ) : null}
            <ECCClientGa4ghWesRun
                key={`${selectedServer} ${runId}`}
                provider={wesProvider}
                runId={runId}
            />
        </div>
    );
}
