/**
 * @description the session's refresh with the mock provider's failure
 * modes: a session the provider ended, a provider outage, a stale expiry
 * of a visitor, and a refresh in flight during a logout
 */
import {
    accessToken,
    expect,
    expireAccessToken,
    login,
    setRefreshMode,
    test,
} from "./fixtures";

const isRefresh = (url: string) => url.endsWith("/auth/api/refresh");

test("a session that the provider ended leads to the login page once", async ({
    page,
}) => {
    await login(page);
    await setRefreshMode({ status: 400, error: "invalid_grant" });
    await expireAccessToken(page);

    await page.goto("/dashboard/workflows");
    await page.waitForURL(/\/auth\/login$/);
    // the session's cookies are gone, so the dashboard is anonymous now
    const names = (await page.context().cookies()).map((val) => val.name);
    expect(names).toEqual([]);
    await page.goto("/dashboard/workflows");
    await expect(page.getByRole("button", { name: /Anonymous/ })).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/workflows$/);
});

test("a provider outage keeps the session, and the refresh is retried", async ({
    page,
    problems,
}) => {
    await login(page);
    const token = await accessToken(page);
    await setRefreshMode({ status: 503, error: "temporarily_unavailable" });
    await expireAccessToken(page);

    const failed = page.waitForResponse((res) => isRefresh(res.url()));
    await page.goto("/dashboard/workflows");
    expect((await failed).status()).toBe(503);
    await expect(
        page.getByRole("button", { name: /Alice Example/ }),
    ).toBeVisible();
    expect(await accessToken(page)).toBe(token);

    // the provider is back: the next try renews the token
    await setRefreshMode({});
    const renewed = await page.waitForResponse(
        (res) => isRefresh(res.url()) && res.status() === 200,
    );
    expect(renewed.ok()).toBe(true);
    expect(await accessToken(page)).not.toBe(token);
    await expect(page).toHaveURL(/\/dashboard\/workflows$/);

    // the 503 was expected here
    const expected = problems.filter((val) => isRefresh(val));
    expect(expected).toHaveLength(1);
    problems.splice(
        0,
        problems.length,
        ...problems.filter((val) => !isRefresh(val)),
    );
});

test("visitors with a stale expiry stay on the page", async ({ page }) => {
    await page.goto("/privacy");
    await expireAccessToken(page);

    const refreshed = page.waitForResponse((res) => isRefresh(res.url()));
    await page.goto("/dashboard/workflows");
    expect((await refreshed).status()).toBe(401);
    await expect(page.getByRole("button", { name: /Anonymous/ })).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/workflows$/);
    // nothing left that would start another refresh
    expect(await page.context().cookies()).toEqual([]);
});

test("a refresh in flight doesn't undo the logout", async ({
    page,
    context,
}) => {
    await login(page);
    await setRefreshMode({ delayMs: 3000 });
    await expireAccessToken(page);

    // a second tab starts a refresh, which the provider answers late
    const other = await context.newPage();
    const started = other.waitForRequest((req) => isRefresh(req.url()));
    await other.goto("/dashboard");
    await started;

    // the first tab logs out meanwhile
    await page.getByRole("button", { name: /Alice Example/ }).click();
    await page.getByRole("menuitem", { name: "Logout" }).click();
    await expect(page.getByRole("button", { name: /Anonymous/ })).toBeVisible();

    // whatever the refresh answered, the session stays ended
    await other.waitForTimeout(3500);
    expect((await page.request.get("/auth/api/token")).status()).toBe(401);
    const names = (await context.cookies()).map((val) => val.name);
    expect(names).toEqual(["logout_marker"]);
    await other.reload();
    await expect(
        other.getByRole("button", { name: /Anonymous/ }),
    ).toBeVisible();
});
