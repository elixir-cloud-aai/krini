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
    const [servers, setServers] = useState<TESServer[]>([]);
    const [loading, setLoading] = useState(true);
    const setSelectedServer = useTESStore((state) => state.setSelectedServer);
    const selectedServer = useTESStore((state) => state.selectedServer);

    const fetchServers = async () => {
        try {
            const res = await fetch("/api/tasks/get-tes-servers");

            if (!res.ok) {
                toast.error("Failed to fetch TES servers");
            }

            const data = await res.json();
            setServers(data);
        } catch (error) {
            toast.error("Failed to fetch TES servers.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServers();
    }, []);

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
            items={servers.map((server) => ({
                value: server.url,
                label: server.name,
            }))}>
            <SelectTrigger>
                <SelectValue placeholder="Select TES Instance" />
            </SelectTrigger>
            <SelectContent
                side="bottom"
                align="start"
                sideOffset={4}
                className={"min-w-87.5 max-w-[min(90vw,480px)]"}>
                <SelectGroup>
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
