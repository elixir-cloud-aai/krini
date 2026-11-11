"use client";
import { AlertCircle, ChevronsUpDown, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserInfo } from "@/hooks";
import AppSidebarFooterMenu from "./app-sidebar-footer-menu";
import AppSidebarFooterMenuNoUser from "./app-sidebar-footer-menu-nologin";

export function AppSidebarFooter() {
    const { user, loading, error, refetch } = useUserInfo();

    if (loading) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" disabled>
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="grid flex-1 gap-1">
                            <Skeleton className="h-3.5 w-24" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="ml-auto h-4 w-4" />
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    if (error && user !== null) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        size="lg"
                        className="text-destructive"
                        onClick={() => refetch()}
                    >
                        <AlertCircle className="h-8 w-8 rounded-lg" />
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">
                                Identity Provider Error
                            </span>
                            <span className="truncate text-xs">
                                Unable to connect to identity provider
                            </span>
                        </div>
                        <RefreshCw className="ml-auto size-4" />
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
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
                                </div>
                                <ChevronsUpDown className="ml-auto size-4" />
                            </SidebarMenuButton>
                        }
                    ></DropdownMenuTrigger>
                    {user && <AppSidebarFooterMenu user={user} />}
                    {!user && <AppSidebarFooterMenuNoUser />}
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
