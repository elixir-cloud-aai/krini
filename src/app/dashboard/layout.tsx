import { AppBreadcrumb, AppSidebar, AppTopbarActions } from "@/components/shared/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="flex flex-col h-screen">
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4 mt-6"
                    />
                    <div className="flex items-center justify-between w-full">
                        <AppBreadcrumb />
                        <AppTopbarActions />
                    </div>
                </header>
                <main className="relative px-4 md:px-8 py-4 h-full overflow-y-auto">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}