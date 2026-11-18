import { getCookie } from "cookies-next/server";
import { LogIn } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "../theme";

async function AppTopbarActions() {
    const idToken = await getCookie("id_token", { cookies });

    return (
        <div className="flex items-center gap-2">
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
