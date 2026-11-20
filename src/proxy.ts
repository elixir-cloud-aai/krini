/**
 * Proxy (formerly middleware) that redirects requests at other hosts to
 * `APP_ORIGIN` (see `src/lib/host-redirect.ts`), and sends the Content
 * Security Policy of each page, with a new nonce, which Next.js adds to its
 * scripts when it renders the page (so all pages render per request:
 * `headers()` in the root layout); see `src/lib/security-headers.ts`
 */
import { type NextRequest, NextResponse } from "next/server";
import { hostRedirect } from "@/lib/host-redirect";
import { contentSecurityPolicy, createNonce } from "@/lib/security-headers";

/**
 * Redirect requests at other hosts permanently (308, which keeps the
 * method) to `APP_ORIGIN`; add the Content Security Policy to the others,
 * for the rendering, and to their responses
 * @param request The request
 * @returns The response
 */
export function proxy(request: NextRequest): NextResponse {
    const target = hostRedirect(request);
    if (target) return NextResponse.redirect(target, 308);

    const nonce = createNonce();
    const policy = contentSecurityPolicy(
        nonce,
        process.env.NODE_ENV === "development",
    );

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", policy);

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });
    response.headers.set("Content-Security-Policy", policy);
    return response;
}

// Not for static files, which run no scripts (`ace/` is the path of the
// editor's workers, `ACE_WORKER_PATH` in `src/lib/ace-workers.ts`), nor for
// prefetches, whose responses are no documents
export const config = {
    matcher: [
        {
            source: "/((?!_next/static|_next/image|ace/|favicon.ico).*)",
            missing: [
                { type: "header", key: "next-router-prefetch" },
                { type: "header", key: "purpose", value: "prefetch" },
            ],
        },
    ],
};
