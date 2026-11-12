/**
 * @description the privacy notice, which is reachable before login and
 * shows the deployment's settings, and the cookies that Krini sets: none
 * for visitors, only the session's after login
 */
import { expect, login, test } from "./fixtures";
import { privacy } from "./settings";

/** Cookies of a session; all are strictly necessary */
const sessionCookies = [
    "access_token",
    "id_token",
    "refresh_token",
    "token_expires_at",
];

test("the login page links the privacy notice", async ({ page }) => {
    await page.goto("/auth/login");
    await page.getByRole("link", { name: "Privacy notice" }).click();
    await page.waitForURL(/\/privacy$/);
    await expect(
        page.getByRole("heading", { name: "Privacy notice" }),
    ).toBeVisible();

    // the deployment's settings, read at runtime
    await expect(page.getByText(privacy.controller)).toBeVisible();
    await expect(
        page.getByRole("link", { name: privacy.contact }),
    ).toHaveAttribute("href", `mailto:${privacy.contact}`);
    await expect(
        page.getByRole("link", {
            name: "Full privacy notice of this deployment",
        }),
    ).toHaveAttribute("href", privacy.noticeUrl);
    await expect(
        page.getByRole("link", {
            name: "Privacy notice of the login provider",
        }),
    ).toHaveAttribute("href", privacy.loginNoticeUrl);
});

test("the sidebar links the privacy notice", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Privacy" }).click();
    await page.waitForURL(/\/privacy$/);
    await page.getByRole("link", { name: "Back to Krini" }).click();
    await page.waitForURL(/\/dashboard$/);
});

test("visitors get no cookies", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Workflows" }).click();
    await page.getByRole("combobox").click();
    await expect(page.getByRole("option")).toHaveCount(1);
    await page.goto("/privacy");
    expect(await page.context().cookies()).toEqual([]);
});

test("members get only the session's cookies", async ({ page }) => {
    await login(page);
    await page.getByRole("link", { name: "Workflows" }).click();
    await page.getByRole("combobox").click();
    await expect(page.getByRole("option")).toHaveCount(1);
    const names = (await page.context().cookies()).map((val) => val.name);
    expect(names.sort()).toEqual([...sessionCookies].sort());
});
