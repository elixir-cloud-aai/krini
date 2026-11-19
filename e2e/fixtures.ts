/**
 * @description fixtures of the end-to-end tests: login through the mock
 * provider, the requests that the mock WES and TES services received, and a check
 * that no page throws, gets server errors from the app, breaks its Content
 * Security Policy or loads anything from a CDN
 */
import { test as base, expect, type Page } from "@playwright/test";
import {
    mockURL,
    type RefreshMode,
    type TesRequest,
    type WesRequest,
} from "./settings";

/** Base URL of the mock login provider and registry (`e2e/mock/server.ts`) */
const mock = mockURL;

/** The test user of the mock provider */
const user = { name: "Alice Example", email: "alice@example.org" };

/**
 * Log in from the sidebar's account menu; the mock provider logs in the
 * test user without a form
 * @param page Page
 */
async function login(page: Page) {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Anonymous/ }).click();
    await page.getByRole("menuitem", { name: "Login" }).click();
    await page.getByRole("link", { name: "Mock IdP" }).click();
    await page.waitForURL(/\/dashboard$/);
    await expect(
        page.getByRole("button", { name: /Alice Example/ }),
    ).toBeVisible();
}

/**
 * Get the access token of the page's session
 * @param page Page
 * @returns The token, from the session's cookie
 */
async function accessToken(page: Page) {
    const cookies = await page.context().cookies();
    const token = cookies.find((val) => val.name === "access_token");
    expect(token?.httpOnly).toBe(true);
    return token?.value as string;
}

/**
 * Get the requests that the mock WES service received, except for its
 * service info
 * @returns The requests, oldest first
 */
async function wesRequests(): Promise<WesRequest[]> {
    const response = await fetch(`${mock}/mock/requests`);
    return response.json();
}

/**
 * Get all requests that the mock TES service received
 * @returns The requests, oldest first
 */
async function tesRequests(): Promise<TesRequest[]> {
    const response = await fetch(`${mock}/mock/tes-requests`);
    return response.json();
}

/**
 * Set how the mock provider answers refresh token grants, until the next
 * test
 * @param mode Error status and `error`, and delay; empty: normally
 */
async function setRefreshMode(mode: RefreshMode) {
    await fetch(`${mock}/mock/refresh`, {
        method: "POST",
        body: JSON.stringify(mode),
    });
}

/**
 * Make the page's session due for a refresh: its access token expires now,
 * as far as the browser's refresh timer knows (`token_expires_at`)
 * @param page Page of the app
 */
async function expireAccessToken(page: Page) {
    await page.evaluate(() => {
        // biome-ignore lint/suspicious/noDocumentCookie: sets the cookie as the app's page sees it, in every test browser
        document.cookie = `token_expires_at=${Date.now()}; path=/`;
    });
}

/**
 * Drop problems that a test expects, e.g. server errors it provoked
 * @param problems The test's `problems` fixture
 * @param expected Whether a problem is expected
 * @returns How many problems were dropped
 */
function forgiveProblems(
    problems: string[],
    expected: (problem: string) => boolean,
) {
    const kept = problems.filter((val) => !expected(val));
    const dropped = problems.length - kept.length;
    problems.splice(0, problems.length, ...kept);
    return dropped;
}

type Fixtures = {
    /** Problems in the browser, which fail the test: page errors, server
     * errors of the app, violations of its Content Security Policy and
     * requests to a CDN */
    problems: string[];
};

const test = base.extend<Fixtures>({
    problems: [
        async ({ page, baseURL }, use) => {
            const problems: string[] = [];
            const app = new URL(baseURL as string).origin;
            page.on("pageerror", (err) => {
                problems.push(`page error: ${err.message}`);
            });
            // the browser reports violations as events of the document; an
            // init script isn't subject to the page's policy
            await page.addInitScript(() => {
                document.addEventListener(
                    "securitypolicyviolation",
                    (event) => {
                        console.error(
                            `CSP violation: ${event.effectiveDirective} ${event.blockedURI}`,
                        );
                    },
                );
            });
            page.on("console", (message) => {
                if (message.text().startsWith("CSP violation:"))
                    problems.push(message.text());
            });
            page.on("request", (request) => {
                if (new URL(request.url()).hostname === "cdn.jsdelivr.net")
                    problems.push(`CDN request: ${request.url()}`);
            });
            page.on("response", (response) => {
                if (
                    new URL(response.url()).origin === app &&
                    response.status() >= 500
                )
                    problems.push(
                        `server error: ${response.status()} ${response.url()}`,
                    );
            });
            // a clean mock WES service for every test
            await fetch(`${mock}/mock/reset`, { method: "POST" });
            await use(problems);
            expect(problems).toEqual([]);
        },
        { auto: true },
    ],
});

export {
    accessToken,
    expect,
    expireAccessToken,
    forgiveProblems,
    login,
    setRefreshMode,
    test,
    tesRequests,
    user,
    wesRequests,
};
