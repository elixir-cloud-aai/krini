"use client";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useTESProvider } from "@/hooks";
import { useTESStore } from "@/stores/tes";
import { TESServerList } from "./tes-server-list";

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
 * Details of a task, with its logs, and to cancel it
 *
 * The task belongs to the service of the link (`serviceId`, the registry
 * ID), which is selected from the registry list. There is no selector to
 * switch to another service, which would look up the same task ID there.
 * Without a service in the link, the user chooses one first.
 * @param props.taskId ID of the task
 * @param props.serviceId Registry ID of the task's service, if known
 */
export function ECCClientGa4ghTesTaskClient({
    taskId,
    serviceId,
}: {
    taskId: string;
    serviceId?: string;
}) {
    const servers = useTESStore((state) => state.servers);
    const serversLoaded = useTESStore((state) => state.serversLoaded);
    const selectedServer = useTESStore((state) => state.selectedServer);
    const setSelectedServer = useTESStore((state) => state.setSelectedServer);
    const provider = useTESProvider();

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
                The service of this task isn't in the list of TES instances.
            </p>
        );
    }

    if (!serviceId && !selectedServer) {
        return (
            <div className="flex flex-col items-center gap-2 p-4 text-sm text-muted-foreground">
                <TESServerList />
                Select the TES instance of the task to view it.
            </div>
        );
    }

    if (!provider || (serviceId && linked?.url !== selectedServer)) {
        // loads the registry list, which the link's service comes from
        return <TESServerList />;
    }

    const name = servers.find((server) => server.url === selectedServer)?.name;

    return (
        <div className="space-y-2">
            {name ? (
                <p className="text-sm text-muted-foreground">
                    TES instance: {name}
                </p>
            ) : null}
            <ECCClientGa4ghTesRun
                key={`${selectedServer} ${taskId}`}
                provider={provider}
                runId={taskId}
            />
        </div>
    );
}
