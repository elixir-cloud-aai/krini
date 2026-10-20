import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "../theme";
import Image from "next/image";
import { getCookie } from "cookies-next/server";
import { cookies } from "next/headers";

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
                    }></TooltipTrigger>
                <TooltipContent>Service Info</TooltipContent>
            </Tooltip>

            <ThemeToggle />

            {idToken ? (
                <div className="opacity-80">
                    <Image
                        src="/ls-login-grey-wide.jpg"
                        height={80}
                        width={130}
                        alt="Logged in with LS Login"
                        loading="eager"
                    />
                </div>
            ) : (
                <a href="/auth/api/login-redirect">
                    <Image
                        src="/ls-login-grey-wide.jpg"
                        height={80}
                        width={130}
                        alt="Login with LS Login"
                        loading="eager"
                    />
                </a>
            )}
        </div>
    );
}

export default AppTopbarActions;
