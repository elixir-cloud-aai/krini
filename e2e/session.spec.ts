/**
 * @description the session's refresh with the mock provider's failure
 * modes: a session the provider ended, concurrent refreshes with rotated
 * refresh tokens, a provider outage, a stale expiry of a visitor, and a
 * refresh in flight during a logout
 */
import {
    accessToken,
    expect,
    expireAccessToken,
    forgiveProblems,
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

    // the first rejection of the refresh token keeps the session, as a
    // concurrent refresh may have used the token; the retry (5 seconds
    // later) gets the same rejection, which ends the session
    const first = page.waitForResponse((res) => isRefresh(res.url()));
    await page.goto("/dashboard/workflows");
    expect((await first).status()).toBe(409);
    await page.waitForURL(/\/auth\/login$/);
    // the session's cookies are gone, so the dashboard is anonymous now
    const names = (await page.context().cookies()).map((val) => val.name);
    expect(names).toEqual([]);
    await page.goto("/dashboard/workflows");
    await expect(page.getByRole("button", { name: /Anonymous/ })).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/workflows$/);
});

test("concurrent refreshes keep the session when refresh tokens rotate", async ({
    page,
}) => {
    await login(page);
    const token = await accessToken(page);
    await setRefreshMode({ rotate: true, delayMs: 500 });

    // e.g. two tabs of a browser without Web Locks, whose refreshes may
    // reach different pods: both send the same refresh token, the
    // provider renews the session for one and rejects the other
    const origin = new URL(page.url()).origin;
    const refresh = () =>
        page.request.post("/auth/api/refresh", { headers: { origin } });
    const statuses = (await Promise.all([refresh(), refresh()]))
        .map((res) => res.status())
        .sort();
    expect(statuses).toEqual([200, 409]);

    // the session stays, with the winner's tokens, and renews again
    expect(await accessToken(page)).not.toBe(token);
    expect((await page.request.get("/auth/api/token")).status()).toBe(200);
    expect((await refresh()).status()).toBe(200);
    const names = (await page.context().cookies()).map((val) => val.name);
    expect(names).not.toContain("refresh_rejected");
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

    // the 503s of the refresh were expected here, and only those
    expect(forgiveProblems(problems, isRefresh)).toBeGreaterThanOrEqual(1);
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

test("a logout waits for a refresh in flight in another tab", async ({
    page,
    context,
}) => {
    await login(page);
    await setRefreshMode({ delayMs: 3000 });
    await expireAccessToken(page);

    // a second tab starts a refresh, which the provider answers late
    const other = await context.newPage();
    const started = other.waitForRequest((req) => isRefresh(req.url()));
    const events: string[] = [];
    other.on("response", (res) => {
        if (isRefresh(res.url())) events.push(`refresh ${res.status()}`);
    });
    page.on("request", (req) => {
        if (req.url().endsWith("/auth/api/logout")) events.push("logout");
    });
    await other.goto("/dashboard");
    await started;

    // the first tab logs out meanwhile; the logout goes out only after
    // the refresh answered
    await page.getByRole("button", { name: /Alice Example/ }).click();
    await page.getByRole("menuitem", { name: "Logout" }).click();
    await expect(page.getByRole("button", { name: /Anonymous/ })).toBeVisible();
    expect(events).toEqual(["refresh 200", "logout"]);

    expect((await page.request.get("/auth/api/token")).status()).toBe(401);
    const names = (await context.cookies()).map((val) => val.name);
    expect(names).toEqual(["logout_marker"]);
    await other.reload();
    await expect(
        other.getByRole("button", { name: /Anonymous/ }),
    ).toBeVisible();
});

test("session cookies that a refresh sets after the logout are void", async ({
    page,
    context,
}) => {
    await login(page);
    const session = await context.cookies();
    await page.getByRole("button", { name: /Alice Example/ }).click();
    await page.getByRole("menuitem", { name: "Logout" }).click();
    await expect(page.getByRole("button", { name: /Anonymous/ })).toBeVisible();

    // e.g. a browser without Web Locks: a refresh that the logout
    // overtook sets the session's cookies again
    await context.addCookies(session);
    expect((await page.request.get("/auth/api/token")).status()).toBe(401);
    expect((await page.request.get("/auth/api/user-info")).status()).toBe(401);
    const refresh = await page.request.post("/auth/api/refresh", {
        headers: { origin: new URL(page.url()).origin },
    });
    expect(refresh.status()).toBe(401);
    expect(await refresh.json()).toMatchObject({ code: "session_ended" });
    // and the refresh deletes them again
    const names = (await context.cookies()).map((val) => val.name);
    expect(names).toEqual(["logout_marker"]);
});
