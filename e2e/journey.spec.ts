/**
 * @description the main user journey: browse anonymously, log in, submit a
 * workflow to a WES service from the registry with the user's token, and
 * log out
 */
import { expect, login, test, user, wesRequests } from "./fixtures";

const workflowUrl = { name: "https://example.com/workflow.cwl" };

test.describe("anonymous visitors", () => {
    test("can browse the WES services of the registry", async ({ page }) => {
        await page.goto("/");
        await page.waitForURL(/\/dashboard$/);
        await expect(
            page.getByRole("button", { name: /Anonymous/ }),
        ).toBeVisible();

        await page.getByRole("link", { name: "Workflows" }).click();
        await page.getByRole("combobox").click();
        // only the https entry; the http entry and the TES are dropped
        await expect(page.getByRole("option")).toHaveCount(1);
        await expect(page.getByRole("option")).toContainText("Mock WES");
    });

    test("get no token", async ({ page }) => {
        const response = await page.request.get("/auth/api/token");
        expect(response.status()).toBe(401);
    });
});

test.describe("members", () => {
    test("log in and out", async ({ page }) => {
        await login(page);
        await page.getByRole("button", { name: /Alice Example/ }).click();
        await expect(
            page.getByRole("menu").getByText(user.email),
        ).toBeVisible();
        // the session's tokens are for the server only
        const cookies = await page.context().cookies();
        const access = cookies.find((val) => val.name === "access_token");
        expect(access?.httpOnly).toBe(true);

        await page.getByRole("menuitem", { name: "Logout" }).click();
        await expect(
            page.getByRole("button", { name: /Anonymous/ }),
        ).toBeVisible();
        const response = await page.request.get("/auth/api/token");
        expect(response.status()).toBe(401);
    });

    test("submit a workflow with their token", async ({ page }) => {
        await login(page);
        const cookies = await page.context().cookies();
        const token = cookies.find((val) => val.name === "access_token")?.value;

        await page.goto("/dashboard/workflows/create");
        await page.getByRole("combobox").click();
        await page.getByRole("option", { name: /Mock WES/ }).click();
        // the types and versions come from the service info; the only ones
        // of the service are preselected
        await expect(page.getByRole("button", { name: "CWL" })).toBeVisible();
        await expect(page.getByRole("button", { name: "v1.2" })).toBeVisible();

        await page
            .getByRole("textbox", workflowUrl)
            .fill("https://example.org/workflows/hello.cwl");
        await page.getByRole("button", { name: "Submit Run" }).click();

        // the service got the run with the user's token
        const submissions = async () =>
            (await wesRequests()).filter(
                (val) => val.method === "POST" && val.path === "/runs",
            );
        await expect.poll(submissions).toHaveLength(1);
        expect(await submissions()).toEqual([
            { method: "POST", path: "/runs", authorization: `Bearer ${token}` },
        ]);
        // the form is empty again
        await expect(page.getByRole("textbox", workflowUrl)).toHaveValue("");

        // the run is in the list of the same service
        await page.getByRole("link", { name: "View Workflows" }).click();
        await page.waitForURL(/\/dashboard\/workflows$/);
        await expect(page.getByText("run-1")).toBeVisible();
    });
});
