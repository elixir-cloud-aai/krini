"use client";
import { ChevronDown, Info, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWESStore } from "@/stores/wes";

function WESServerList() {
    const servers = useWESStore((state) => state.servers);
    const serversLoaded = useWESStore((state) => state.serversLoaded);
    const setServers = useWESStore((state) => state.setServers);

    const selectedServer = useWESStore((state) => state.selectedServer);
    const setSelectedServer = useWESStore((state) => state.setSelectedServer);

    const [loading, setLoading] = useState(!serversLoaded);

    useEffect(() => {
        if (serversLoaded) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        async function fetchServers() {
            try {
                const res = await fetch("/api/workflows/get-wes-servers");

                if (!res.ok) {
                    toast.error("Failed to fetch WES servers.");
                    return;
                }

                const data = await res.json();

                if (!Array.isArray(data)) {
                    throw new Error("Invalid WES server response");
                }

                if (!cancelled) {
                    setServers(data);
                }
            } catch {
                if (!cancelled) {
                    toast.error("Failed to fetch WES servers.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void fetchServers();

        return () => {
            cancelled = true;
        };
    }, [serversLoaded, setServers]);

    if (loading) {
        return (
            <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading WES instances...
            </div>
        );
    }

    return (
        <Select
            value={selectedServer}
            onValueChange={(value) => {
                if (value != null) setSelectedServer(value);
            }}
            items={servers.map((server) => ({
                value: server.url,
                label: server.name,
            }))}
        >
            <SelectTrigger>
                <SelectValue placeholder="Select WES Instance" />
            </SelectTrigger>

            <SelectContent
                side="bottom"
                align="start"
                sideOffset={4}
                className="min-w-87.5 max-w-[min(90vw,480px)]"
            >
                <SelectGroup>
                    {servers.map((server) => {
                        const info = server.serviceInfo;
                        const workflowTypes = info?.workflow_type_versions ?? {};
                        const typeCount = Object.keys(workflowTypes).length;

                        const workflowTypesList = Object.entries(workflowTypes).map(
                            ([type, details]) => ({
                                type,
                                versions: details.workflow_type_version || [],
                            }),
                        );

                        return (
                            <SelectItem
                                key={server.id}
                                value={server.url}
                                disabled={server.health.status !== "ok"}
                            >
                                <div className="flex items-center justify-between gap-2 w-full">
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <span
                                            className="block truncate font-medium"
                                            title={server.name}
                                        >
                                            {server.name}
                                        </span>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>Health: {server.health.status}</span>
                                            {server.health.status === "unreachable" && (
                                                <span className="text-xs text-muted-foreground">
                                                    ({server.health.reason})
                                                </span>
                                            )}
                                            {typeCount > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        {typeCount} workflow type
                                                        {typeCount !== 1 ? "s" : ""}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {workflowTypesList.length > 0 && (
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <Link
                                                    href={`/dashboard/workflows/service-info?id=${server.id}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex"
                                                >
                                                    <Info className="size-4 text-muted-foreground hover:text-foreground" />
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="max-w-xs">
                                                <div className="space-y-2">
                                                    <p className="font-medium text-sm">
                                                        Supported Workflow Types
                                                    </p>
                                                    {workflowTypesList.map(
                                                        ({ type, versions }) => (
                                                            <div
                                                                key={type}
                                                                className="text-xs"
                                                            >
                                                                <p className="font-medium">
                                                                    {type}
                                                                </p>
                                                                <p className="text-muted-foreground">
                                                                    {versions.join(", v")}
                                                                </p>
                                                            </div>
                                                        ),
                                                    )}
                                                    <p className="text-xs text-muted-foreground pt-2 border-t">
                                                        Click the info button to view full service details
                                                    </p>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>
                            </SelectItem>
                        );
                    })}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}

export { WESServerList };
