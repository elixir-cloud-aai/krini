
"use client";

import {
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePathname } from "next/navigation";

export function BreadcrumbClient() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    // Hide "dashboard" only for nested dashboard routes.
    const visibleSegments =
        segments.length > 1 && segments[0] === "dashboard"
            ? segments.slice(1)
            : segments;

    const formatSegment = (segment: string) =>
        segment
            .replace(/-/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase());

    return (
        <>
            {visibleSegments.map((segment, index) => {
                const originalIndex =
                    segments.length > 1 && segments[0] === "dashboard"
                        ? index + 1
                        : index;

                const href = `/${segments
                    .slice(0, originalIndex + 1)
                    .join("/")}`;

                const isLast = index === visibleSegments.length - 1;

                return (
                    <span key={href} className="contents">
                        <BreadcrumbSeparator />

                        <BreadcrumbItem>
                            {isLast ? (
                                <BreadcrumbPage>
                                    {formatSegment(segment)}
                                </BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink href={href}>
                                    {formatSegment(segment)}
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    </span>
                );
            })}
        </>
    );
}
