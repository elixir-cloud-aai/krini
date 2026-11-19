import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/oidc";

/**
 * Checks that a state-changing request comes from Krini's own pages: its
 * `Origin` header must be `APP_ORIGIN`. `SameSite=Lax` cookies alone don't
 * cover sibling subdomains of the same site.
 * @param req The request
 * @returns An error response to return, or null if the request may go on
 */
export function rejectForeignOrigin(req: Request): NextResponse | null {
    const appOrigin = getAppOrigin();
    if (!appOrigin) {
        return NextResponse.json(
            { error: "APP_ORIGIN environment variable is not set" },
            { status: 500 },
        );
    }
    if (req.headers.get("origin") !== appOrigin) {
        return NextResponse.json(
            { error: "Invalid request origin" },
            { status: 403 },
        );
    }
    return null;
}
