import { Copy, UserKey } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import type { UserTier } from "@/lib/oidc";

type Props = {
    user: User;
    tier?: UserTier | null;
    accessRequestUrl?: string | null;
};

const TIER_LABELS: Record<UserTier, string> = {
    admin: "Admin",
    compute: "Compute",
    user: "User",
};

function AppSidebarFooterMenu({ user, tier, accessRequestUrl }: Props) {
    const { isMobile } = useSidebar();

    const copyToken = async () => {
        try {
            const response = await fetch("/auth/api/token", {
                credentials: "same-origin",
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Failed to fetch token");
            }

            const data = await response.json();
            if (data.access_token) {
                await navigator.clipboard.writeText(data.access_token);
                toast.success("Token copied successfully.");
            } else {
                toast.error("No token available.");
            }
        } catch {
            toast.error("Please try again to copy the token.");
        }
    };

    const handleLogout = async () => {
        try {
            const response = await fetch("/auth/api/logout", {
                method: "POST",
                credentials: "same-origin",
            });

            if (!response.ok) {
                throw new Error("Logout failed");
            }
            const data = await response.json();
            if (data.end_session_url) {
                window.location.href = data.end_session_url;
                return;
            }
            toast.success("Logged out successfully.");
            window.location.reload();
        } catch {
            toast.error("Unable to log out. Please try again.");
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
                            <span className="truncate font-medium">
                                {user?.name || "Anonymous"}
                            </span>
                            <span className="truncate text-xs">
                                {user?.email || user?.sub}
                            </span>
                            {tier && (
                                <span className="truncate text-xs font-medium text-muted-foreground">
                                    User Tier : {TIER_LABELS[tier]}
                                </span>
                            )}
                        </div>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={copyToken}>
                    <Copy />
                    Copy token to Dashboard
                </DropdownMenuItem>
                {tier === "user" && accessRequestUrl && (
                    <DropdownMenuItem
                        render={
                            <Link
                                href={accessRequestUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <UserKey />
                                Request compute access
                            </Link>
                        }
                    ></DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="text-red-500"
                    onClick={handleLogout}
                >
                    Logout
                </DropdownMenuItem>
            </DropdownMenuGroup>
        </DropdownMenuContent>
    );
}

export default AppSidebarFooterMenu;
