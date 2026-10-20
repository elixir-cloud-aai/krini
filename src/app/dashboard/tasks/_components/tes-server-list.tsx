"use client";

import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useTESStore } from "@/stores/tes";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function TESServerList() {
    const servers = useTESStore((state) => state.servers);
    const serversLoaded = useTESStore((state) => state.serversLoaded);
    const setServers = useTESStore((state) => state.setServers);

    const selectedServer = useTESStore((state) => state.selectedServer);
    const setSelectedServer = useTESStore((state) => state.setSelectedServer);

    const [loading, setLoading] = useState(!serversLoaded);

    useEffect(() => {
        if (serversLoaded) {
            setLoading(false);
            return;
        }

        let cancelled = false;
        async function fetchServers() {
            try {
                const res = await fetch("/api/tasks/get-tes-servers");

                if (!res.ok) {
                    if (res.status === 401) {
                        toast.error(
                            "Login to fetch TES servers from registry.",
                        );
                    } else {
                        toast.error("Failed to fetch TES servers.");
                    }
                    return;
                }

                const data = await res.json();

                if (!Array.isArray(data)) {
                    throw new Error("Invalid TES server response");
                }

                if (!cancelled) {
                    setServers(data);
                }
            } catch {
                if (!cancelled) {
                    toast.error("Failed to fetch TES servers.");
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
                Loading TES instances...
            </div>
        );
    }

    return (
        <Select
            value={selectedServer}
            onValueChange={(value) => {
                if (value != null) setSelectedServer(value);
            }}
            items={[
                { value: "/tes-api", label: "TEST SERVER" },
                ...servers.map((server) => ({
                    value: server.url,
                    label: server.name,
                })),
            ]}>
            <SelectTrigger>
                <SelectValue placeholder="Select TES Instance" />
            </SelectTrigger>

            <SelectContent
                side="bottom"
                align="start"
                sideOffset={4}
                className="min-w-87.5 max-w-[min(90vw,480px)]">
                <SelectGroup>
                    <SelectItem value="/tes-api">TEST SERVER</SelectItem>

                    {servers.map((server) => (
                        <SelectItem
                            key={server.url + Math.random()}
                            value={server.url}>
                            <span
                                className="block truncate"
                                title={server.name}>
                                {server.name}
                            </span>
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}

export { TESServerList };
