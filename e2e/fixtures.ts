/**
 * @description fixtures of the end-to-end tests: login through the mock
 * provider, the requests that the mock WES and TES services received, and a check
 * that no page throws or gets server errors from the app
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

type Fixtures = {
    /** Problems in the browser, which fail the test: page errors and
     * server errors of the app */
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
    login,
    setRefreshMode,
    test,
    tesRequests,
    user,
    wesRequests,
};
