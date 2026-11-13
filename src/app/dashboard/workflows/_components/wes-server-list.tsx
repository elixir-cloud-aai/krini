"use client";
import { Info, LoaderCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
    const [error, setError] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchServers = useCallback(
        async (isBackground = false) => {
            try {
                const res = await fetch("/api/workflows/get-wes-servers");

                if (!res.ok) {
                    if (!isBackground) {
                        toast.error("Failed to fetch WES servers.");
                        setError(true);
                    }
                    return;
                }

                const data = await res.json();

                if (!Array.isArray(data)) {
                    throw new Error("Invalid WES server response");
                }

                setServers(data);
                setError(false);
            } catch {
                if (!isBackground) {
                    toast.error("Failed to fetch WES servers.");
                    setError(true);
                }
            } finally {
                if (!isBackground) {
                    setLoading(false);
                }
                setRefreshing(false);
            }
        },
        [setServers],
    );

    useEffect(() => {
        if (serversLoaded) {
            setLoading(false);
            setError(false);
            return;
        }

        void fetchServers(false);
    }, [serversLoaded, fetchServers]);

    const handleRetry = () => {
        setLoading(true);
        setError(false);
        void fetchServers(false);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        void fetchServers(true);
    };

    if (loading) {
        return (
            <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading WES instances...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                <span>Failed to load WES instances</span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRetry}
                    className="h-7 px-2"
                >
                    <RefreshCw className="size-3" />
                    Retry
                </Button>
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
                    <div className="flex items-center justify-between px-2 py-1.5 border-b">
                        <span className="text-xs text-muted-foreground">
                            WES Instances
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="h-6 px-2"
                        >
                            <RefreshCw
                                className={`size-3 ${refreshing ? "animate-spin" : ""}`}
                            />
                            Refresh
                        </Button>
                    </div>
                    {servers.map((server) => {
                        const info = server.serviceInfo;
                        const workflowTypes =
                            info?.workflow_type_versions ?? {};
                        const typeCount = Object.keys(workflowTypes).length;

                        const workflowTypesList = Object.entries(
                            workflowTypes,
                        ).map(([type, details]) => ({
                            type,
                            versions: details.workflow_type_version || [],
                        }));

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
                                            <span>
                                                Health: {server.health.status}
                                            </span>
                                            {server.health.status ===
                                                "unreachable" && (
                                                <span className="text-xs text-muted-foreground">
                                                    ({server.health.reason})
                                                </span>
                                            )}
                                            {typeCount > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        {typeCount} workflow
                                                        type
                                                        {typeCount !== 1
                                                            ? "s"
                                                            : ""}
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
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                    className="flex"
                                                >
                                                    <Info className="size-4 text-muted-foreground hover:text-foreground" />
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent
                                                side="right"
                                                className="max-w-xs"
                                            >
                                                <div className="space-y-2">
                                                    <p className="font-medium text-sm">
                                                        Supported Workflow Types
                                                    </p>
                                                    {workflowTypesList.map(
                                                        ({
                                                            type,
                                                            versions,
                                                        }) => (
                                                            <div
                                                                key={type}
                                                                className="text-xs"
                                                            >
                                                                <p className="font-medium">
                                                                    {type}
                                                                </p>
                                                                <p className="text-muted-foreground">
                                                                    {versions.join(
                                                                        ", ",
                                                                    )}
                                                                </p>
                                                            </div>
                                                        ),
                                                    )}
                                                    <p className="text-xs text-muted-foreground pt-2 border-t">
                                                        Click the info button to
                                                        view full service
                                                        details
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
