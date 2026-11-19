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
 * only at runtime, hence any `https:` origin for `connect-src`.
 * @param nonce Nonce of the request, base64
 * @param development Whether the app runs with `next dev`, which needs
 * `eval` for its error overlay
 * @returns The value of the `Content-Security-Policy` header
 */
function contentSecurityPolicy(nonce: string, development = false): string {
    const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
    if (development) scriptSrc.push("'unsafe-eval'");

    return [
        "default-src 'self'",
        `script-src ${scriptSrc.join(" ")}`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self' https:",
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
 * Browsers honour `Strict-Transport-Security` only over HTTPS, so it does no
 * harm over plain HTTP (e.g. in local development); it covers only Krini's
 * host, not its subdomains.
 */
const securityHeaders: { key: string; value: string }[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    // for browsers that don't know `frame-ancestors`
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Strict-Transport-Security", value: "max-age=63072000" },
];

export { contentSecurityPolicy, createNonce, securityHeaders };
