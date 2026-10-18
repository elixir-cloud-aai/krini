"use client";
import { usePathname } from "next/navigation";

export function BreadcrumbClient() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    const currentPage =
        segments[segments.length - 1]
            ?.replace(/-/g, " ")
            ?.replace(/\b\w/g, (c) => c.toUpperCase()) || "";

    return <span>{currentPage}</span>;
}
