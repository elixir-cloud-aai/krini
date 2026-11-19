import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    turbopack: {
        rules: {
            "*.css": {
                loaders: ["@tailwindcss/turbopack"],
                as: "*.css",
            },
        },
    },
    // The Docker image runs the standalone server (`NEXT_OUTPUT` is set in
    // the `Dockerfile`); `next start` doesn't work with it
    output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
    // no `X-Powered-By: Next.js`
    poweredByHeader: false,
    // the security headers of every response; the Content Security Policy
    // comes from `src/proxy.ts` (see "Security headers" in
    // `docs/operator-guide/deployment.md`)
    async headers() {
        // `NODE_ENV` is `production` in `next build` and `next start`,
        // `development` in `next dev`
        const production = process.env.NODE_ENV === "production";
        return [{ source: "/:path*", headers: securityHeaders(production) }];
    },
};

export default nextConfig;
