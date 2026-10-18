import {
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { LogIn } from "lucide-react";
import Link from "next/link";

function AppSidebarFooterMenuNoUser() {
    return (
        <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={"top"}
            align="end"
            sideOffset={4}
        >
            
            <DropdownMenuGroup>
                <DropdownMenuItem render={
                    <Link href={"/auth/api/login-redirect"}>
                        <LogIn />
                        Login
                    </Link>
                }>
                </DropdownMenuItem>
            </DropdownMenuGroup>
        </DropdownMenuContent>
    );
}

export default AppSidebarFooterMenuNoUser;
