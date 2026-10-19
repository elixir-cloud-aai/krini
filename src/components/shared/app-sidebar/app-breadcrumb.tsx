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
            <BreadcrumbList className="hidden sm:flex">
                <BreadcrumbItem>
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
