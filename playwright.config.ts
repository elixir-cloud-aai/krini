import { defineConfig, devices } from "@playwright/test";

// end-to-end tests (`e2e/`) against the mock services of
// `e2e/mock/server.ts` (login provider, registry, WES service), which start
// first; then the app is built and started, on its own port. Nothing calls
// real public services.
const port = 3210;
const baseURL = `http://localhost:${port}`;
const mockHttp = "http://127.0.0.1:8291";
const certDir = "e2e/.certs";

export default defineConfig({
    testDir: "e2e",
    // the tests share the mock services: one file at a time
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL,
        trace: "retain-on-failure",
        // the mock WES service has a self-signed certificate
        ignoreHTTPSErrors: true,
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    ],
    webServer: [
        {
            command: "bun e2e/mock/server.ts",
            url: `${mockHttp}/mock/health`,
            reuseExistingServer: !process.env.CI,
            env: {
                MOCK_HTTP_PORT: "8291",
                MOCK_HTTPS_PORT: "8444",
                MOCK_APP_ORIGIN: baseURL,
                MOCK_CERT_DIR: certDir,
            },
        },
        {
            command: `bun run build && bun run start --port ${port}`,
            url: `${baseURL}/auth/login`,
            reuseExistingServer: !process.env.CI,
            timeout: 300_000,
            env: {
                NEXT_TELEMETRY_DISABLED: "1",
                // the app checks the mock WES service's certificate
                NODE_EXTRA_CA_CERTS: `${certDir}/cert.pem`,
                LS_LOGIN_URL: mockHttp,
                OIDC_CLIENT_ID: "krini-e2e",
                OIDC_CLIENT_SECRET: "e2e-secret",
                OIDC_REDIRECT_URI: `${baseURL}/auth/api/callback`,
                OIDC_SCOPE: "openid profile email",
                CLOUD_REGISTRY_URL: `${mockHttp}/ga4gh/registry/v1`,
                APP_ORIGIN: baseURL,
            },
        },
    ],
});
