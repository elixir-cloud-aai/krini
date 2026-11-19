/**
 * Security headers of Krini's responses
 *
 * The Content Security Policy is sent by `src/proxy.ts`, with a new nonce
 * for each request, which Next.js adds to its own scripts when it renders
 * the page; the other headers are fixed and sent with every response
 * (`headers()` in `next.config.ts`). See "Security headers" in
 * `docs/operator-guide/deployment.md`.
 */

/**
 * Build the Content Security Policy of a page
 *
 * Scripts run only with the nonce, or when loaded by a script that has it
 * (`'strict-dynamic'`, for the chunks that Next.js loads later); no script
 * comes from another origin. Styles may be inline, as React, the Cloud
 * Components and their code editor (Ace) set them at runtime. The browser
 * calls the TES and WES services of the registry, whose origins are known
 * only at runtime, hence any `https:` origin for `connect-src`; images may
 * come from any `https:` origin, too, for the logos of the login providers.
 * @param nonce Nonce of the request, base64
 * @param development Whether the app runs with `next dev`, which needs
 * `eval` for its error overlay and WebSockets for its hot reload
 * @returns The value of the `Content-Security-Policy` header
 */
function contentSecurityPolicy(nonce: string, development = false): string {
    const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
    const connectSrc = ["'self'", "https:"];
    if (development) {
        scriptSrc.push("'unsafe-eval'");
        // the hot reload of `next dev`, for browsers in which `'self'`
        // doesn't cover WebSockets
        connectSrc.push("ws:", "wss:");
    }

    return [
        "default-src 'self'",
        `script-src ${scriptSrc.join(" ")}`,
        "style-src 'self' 'unsafe-inline'",
        // login providers' logos may be `https` URLs (`docs/operator-guide/login.md`)
        "img-src 'self' https: data: blob:",
        "font-src 'self'",
        `connect-src ${connectSrc.join(" ")}`,
        // the syntax checks of the code editor (`src/lib/ace-workers.ts`)
        "worker-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ].join("; ");
}

/**
 * Create the nonce of a request
 * @returns 16 random bytes, base64
 */
function createNonce(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return btoa(String.fromCharCode(...bytes));
}

/**
 * Headers of every response, in the format of `headers()` in
 * `next.config.ts`
 *
 * `Strict-Transport-Security` only in production builds (`next build`), as
 * it binds the whole host, on every port, to HTTPS, which would get in the
 * way of `next dev --experimental-https`; browsers honour it only over
 * HTTPS, and it covers only Krini's host, not its subdomains.
 * @param production Whether the app is a production build
 * @returns The headers
 */
function securityHeaders(
    production: boolean,
): { key: string; value: string }[] {
    const headers = [
        { key: "X-Content-Type-Options", value: "nosniff" },
        // for browsers that don't know `frame-ancestors`
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ];
    if (production) {
        headers.push({
            key: "Strict-Transport-Security",
            value: "max-age=63072000",
        });
    }
    return headers;
}

export { contentSecurityPolicy, createNonce, securityHeaders };
