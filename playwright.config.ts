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
// empty counts as unset
const image = process.env.E2E_IMAGE || undefined;

// The image and the certificate directory (where the mock services write
// it: relative to this file, the web servers' working directory) are part
// of a shell command: only the characters of image references and of plain
// paths, without quotes, spaces or `$`
const certPath = resolve(__dirname, certDir);
if (image !== undefined && !/^\w[\w.:/@-]*$/.test(image)) {
    throw new Error(
        `E2E_IMAGE has characters of no image reference: '${image}'`,
    );
}
if (image !== undefined && !/^[\w./-]+$/.test(certPath)) {
    throw new Error(
        `Run the tests with E2E_IMAGE from a plain path, not '${certPath}'`,
    );
}

/** Settings of the app, the same for the build of the checkout and the
 * image */
const appEnv = {
    LOGIN_PROVIDERS: JSON.stringify([
        {
            id: "mock",
            name: "Mock IdP",
            issuer: mockHttp,
            clientId: client.id,
            clientSecret: client.secret,
            scopes: ["openid", "profile", "email"],
            groupsClaim: "groups",
            computeGroups: ["compute"],
        },
    ]),
    CLOUD_REGISTRY_URL: `${mockHttp}/ga4gh/registry/v1`,
    APP_ORIGIN: baseURL,
    OIDC_REDIRECT_URI: `${baseURL}/auth/api/callback`,
    PRIVACY_CONTROLLER: privacy.controller,
    PRIVACY_CONTACT: privacy.contact,
    PRIVACY_NOTICE_URL: privacy.noticeUrl,
    PRIVACY_LOGIN_NOTICE_URL: privacy.loginNoticeUrl,
};

/** The app: the image, or the build of the checkout */
const app = image
    ? {
          // `--env <name>` passes the variable from `env` below, so that no
          // value is part of the command; the certificate directory is
          // mounted at `/certs`. On SIGTERM, Docker stops the container, and
          // `--rm` removes it; a container left by a killed run keeps the
          // name, so the next run fails at once
          command: [
              "docker run --rm --init --name krini-e2e --network host",
              "--read-only --tmpfs /tmp",
              `--volume ${certPath}:/certs:ro`,
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
          // `e2e/build.ts` builds without the privacy settings, so the test
          // fails if the notice is rendered at build time; `env -u` would be
          // Unix-only
          command: `bun e2e/build.ts && bun run start --port ${port}`,
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
