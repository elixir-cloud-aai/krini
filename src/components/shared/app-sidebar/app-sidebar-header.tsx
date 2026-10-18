import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import Image from "next/image";
import Link from "next/link";

function AppSidebarHeader() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton size="lg" isActive render={
                    <Link href={"/dashboard"}>
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                            <Image src={"/logo.svg"} width={40} height={40} alt="icon" />
                        </div>
                        <div className="flex flex-col gap-0.5 leading-none">
                            <span className="font-medium">Elixir Cloud AAI</span>
                            <span className="text-xs">Krini</span>
                        </div>
                    </Link>
                }>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}

export default AppSidebarHeader;
