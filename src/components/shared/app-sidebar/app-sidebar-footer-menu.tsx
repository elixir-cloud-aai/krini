import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { getCookie } from "cookies-next/client";
import { Copy, LogOut } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type Props = {
    user: User;
};

function AppSidebarFooterMenu({ user }: Props) {
    const { isMobile } = useSidebar();

    const copyToken = () => {
        const token = getCookie("access_token");
        if (token && typeof token === "string") {
            navigator.clipboard
                .writeText(token as string)
                .then(() => toast.success("Token copied successfully."))
                .catch(() => toast.error("Please try again to copy the token."));
        }
    };

    return (
        <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
        >
            
            <DropdownMenuGroup>
                <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-lg">
                            <AvatarFallback className="rounded-lg">
                                {user?.name?.charAt(0) || "AN"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">{user?.name || "Anonymous"}</span>
                            <span className="truncate text-xs">{user?.email || user?.sub}</span>
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={copyToken}>
                    <Copy />
                    Copy token to Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={
                    <Link href={"/auth/api/logout"} className="text-red-500">
                        <LogOut />
                        Log out
                    </Link>
                }>
                </DropdownMenuItem>
            </DropdownMenuGroup>
        </DropdownMenuContent>
    );
}

export default AppSidebarFooterMenu;
