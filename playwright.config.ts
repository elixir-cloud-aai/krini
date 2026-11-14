import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import {
    appPort,
    appURL,
    client,
    mockHttpPort,
    mockHttpsPort,
    mockURL,
    privacy,
} from "./e2e/settings";

// end-to-end tests (`e2e/`) against the mock services of
// `e2e/mock/server.ts` (login provider, registry, WES service), which start
// first; then the app is built and started, on its own port. Nothing calls
// real public services. Ports are in `e2e/settings.ts`. With `E2E_IMAGE`
// set to a Docker image (e.g. `krini:local` or `<name>@<digest>`), the app
// is that image instead, started as it is deployed: as the image's
// non-root user, with a read-only root file system, a writable `/tmp` and
// all settings at start. That needs Docker with the host network (Linux).
const port = appPort;
const baseURL = appURL;
const mockHttp = mockURL;
const certDir = "e2e/.certs";
const image = process.env.E2E_IMAGE;

// a name, tag or digest only, as the image is part of a shell command
if (image !== undefined && !/^\w[\w.:/@-]*$/.test(image)) {
    throw new Error(`E2E_IMAGE isn't an image reference: '${image}'`);
}

/** Settings of the app, the same for the build of the checkout and the
 * image */
const appEnv = {
    LS_LOGIN_URL: mockHttp,
    OIDC_CLIENT_ID: client.id,
    OIDC_CLIENT_SECRET: client.secret,
    OIDC_REDIRECT_URI: `${baseURL}/auth/api/callback`,
    OIDC_SCOPE: "openid profile email",
    CLOUD_REGISTRY_URL: `${mockHttp}/ga4gh/registry/v1`,
    APP_ORIGIN: baseURL,
    PRIVACY_CONTROLLER: privacy.controller,
    PRIVACY_CONTACT: privacy.contact,
    PRIVACY_NOTICE_URL: privacy.noticeUrl,
    PRIVACY_LOGIN_NOTICE_URL: privacy.loginNoticeUrl,
};

/** The app: the image, or the build of the checkout */
const app = image
    ? {
          // `--env <name>` passes the variable from `env` below; the
          // certificate directory is mounted at `/certs`. On SIGTERM, Docker
          // stops the container, and `--rm` removes it
          command: [
              "docker run --rm --init --name krini-e2e --network host",
              "--read-only --tmpfs /tmp",
              `--volume "${resolve(certDir)}:/certs:ro"`,
              "--env PORT --env NODE_EXTRA_CA_CERTS",
              ...Object.keys(appEnv).map((name) => `--env ${name}`),
              image,
          ].join(" "),
          gracefulShutdown: { signal: "SIGTERM" as const, timeout: 10_000 },
          env: {
              PORT: String(port),
              // the app checks the mock WES service's certificate
              NODE_EXTRA_CA_CERTS: "/certs/cert.pem",
              ...appEnv,
          },
      }
    : {
          // the build doesn't get the privacy settings, so the test fails if
          // the notice is rendered at build time
          command: `env -u PRIVACY_CONTROLLER -u PRIVACY_CONTACT -u PRIVACY_NOTICE_URL -u PRIVACY_LOGIN_NOTICE_URL bun run build && bun run start --port ${port}`,
          env: {
              NEXT_TELEMETRY_DISABLED: "1",
              // the app checks the mock WES service's certificate
              NODE_EXTRA_CA_CERTS: `${certDir}/cert.pem`,
              ...appEnv,
          },
      };

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
                MOCK_HTTP_PORT: String(mockHttpPort),
                MOCK_HTTPS_PORT: String(mockHttpsPort),
                MOCK_APP_ORIGIN: baseURL,
                MOCK_CERT_DIR: certDir,
            },
        },
        {
            ...app,
            url: `${baseURL}/auth/login`,
            // with an image, a running app may be another one: never reuse it
            reuseExistingServer: !process.env.CI && !image,
            timeout: 300_000,
        },
    ],
});
