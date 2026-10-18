import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { BreadcrumbClient } from "./breadcrumb-client";

function AppBreadcrumb() {
    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem className="hidden md:flex">
                    <BreadcrumbLink href="/dashboard">
                        Krini
                    </BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbClient />
            </BreadcrumbList>
        </Breadcrumb>
    );
}

export default AppBreadcrumb;
