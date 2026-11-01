"use client";
import { LoaderCircle } from "lucide-react";
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
                <SelectValue placeholder="Select TES Instance" />
            </SelectTrigger>

            <SelectContent
                side="bottom"
                align="start"
                sideOffset={4}
                className="min-w-87.5 max-w-[min(90vw,480px)]"
            >
                <SelectGroup>
                    {servers.map((server) => (
                        <SelectItem
                            key={server.url + Math.random()}
                            value={server.url}
                        >
                            <span
                                className="block truncate"
                                title={server.name}
                            >
                                {server.name} {"("}Health :{" "}
                                {server.health.status}
                                {")"}
                            </span>
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}

export { WESServerList };
