import { getCookie } from "cookies-next/server";
import { Info, LogIn } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "../theme";

async function AppTopbarActions() {
    const idToken = await getCookie("id_token", { cookies });

    return (
        <div className="flex items-center gap-2">
            <Tooltip>
                <TooltipTrigger
                    render={
                        <Link href="/dashboard/service-info">
                            <Info className="h-4 w-4" />
                        </Link>
                    }
                ></TooltipTrigger>
                <TooltipContent>Service Info</TooltipContent>
            </Tooltip>

            <ThemeToggle />

            {!idToken && (
                <Link
                    href="/auth/login"
                    className={buttonVariants({
                        variant: "secondary",
                        size: "sm",
                    })}
                >
                    <LogIn />
                    Log in
                </Link>
            )}
        </div>
    );
}

export default AppTopbarActions;
