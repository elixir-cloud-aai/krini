"use client";
import { Info } from "lucide-react";
import Link from "next/link";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWESStore } from "@/stores/wes";

function ServiceInfoButton() {
    const selectedWESServer = useWESStore((state) => state.selectedServer);

    if (selectedWESServer === null) return;

    return (
        <Tooltip>
            <TooltipTrigger
                render={
                    <Link
                        href={`/dashboard/workflows/service-info?url=${selectedWESServer}/service-info`}
                    >
                        <Info className="h-4 w-4" />
                    </Link>
                }
            ></TooltipTrigger>
            <TooltipContent>Selected Service's Info</TooltipContent>
        </Tooltip>
    );
}

export { ServiceInfoButton };
