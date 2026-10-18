"use client";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Layers, Wrench } from "lucide-react";
import Link from "next/link";
import { AppSidebarFooter } from "./app-sidebar-footer";
import AppSidebarHeader from "./app-sidebar-header";

const data = [
    {
        title: "Services",
        items: [
            { title: "Tasks", url: "/dashboard/tasks", icon: Wrench },
            { title: "Workflows", url: "/dashboard/workflows", icon: Layers },
        ],
    },
];

function AppSidebar() {
    return (
        <Sidebar collapsible="icon">
            {/* Sidebar header */}
            <SidebarHeader>
                <AppSidebarHeader />
            </SidebarHeader>

            {/* Sidebar Content */}
            <SidebarContent>
                {data.map((item) => (
                    <SidebarGroup key={item.title}>
                        <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {item.items.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton render={
                                            <Link
                                                href={item.url}
                                                className="flex items-center gap-2 font-medium"
                                            >
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.title}</span>
                                            </Link>
                                        }>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            {/* Sidebar footer */}
            <SidebarFooter>
                <AppSidebarFooter />
            </SidebarFooter>
        </Sidebar>
    );
}

export default AppSidebar;
