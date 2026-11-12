/**
 * @description fixtures of the end-to-end tests: login through the mock
 * provider, the requests that the mock WES service received, and a check
 * that no page throws or gets server errors from the app
 */
import { test as base, expect, type Page } from "@playwright/test";

/** Base URL of the mock login provider and registry (`e2e/mock/server.ts`) */
const mock = "http://127.0.0.1:8291";

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
    await page.waitForURL(/\/dashboard$/);
    await expect(
        page.getByRole("button", { name: /Alice Example/ }),
    ).toBeVisible();
}

/** A request that the mock WES service received */
type WesRequest = {
    method: string;
    path: string;
    authorization: string | null;
};

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
 * Whether a page error is a known one of a dependency
 * @param message Message of the error
 * @returns Whether to ignore it
 */
function knownError(message: string) {
    // the code editor of `@elixir-cloud/design` 2.0.0-alpha.49 (from
    // `@elixir-cloud/wes`) checks `:host-context()`, which Firefox doesn't
    // support; fixed upstream in elixir-cloud-aai/cloud-components#446:
    // remove once Krini uses a release with the fix
    return message.includes("':host-context(.dark)' is not a valid selector");
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
                if (!knownError(err.message))
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

export { expect, login, test, user, wesRequests };
