/**
 * @description the main user journey: browse anonymously, log in, submit a
 * workflow to a WES service and a task to a TES service from the registry
 * with the user's token, and log out
 */
import {
    accessToken,
    expect,
    login,
    tesRequests,
    test,
    user,
    wesRequests,
} from "./fixtures";

const workflowUrl = { name: "https://example.com/workflow.cwl" };

test.describe("anonymous visitors", () => {
    test("can browse the WES services of the registry", async ({ page }) => {
        await page.goto("/");
        await page.waitForURL(/\/dashboard$/);
        await expect(
            page.getByRole("button", { name: /Anonymous/ }),
        ).toBeVisible();

        await page
            .getByRole("link", { name: "Workflows", exact: true })
            .click();
        await page.getByRole("combobox").click();
        // only the https entry; the http entry and the TES are dropped
        await expect(page.getByRole("option")).toHaveCount(1);
        await expect(page.getByRole("option")).toContainText("Mock WES");
    });

    test("can browse the TES services of the registry", async ({ page }) => {
        await page.goto("/dashboard/tasks");
        await page.getByRole("combobox").click();
        // only the https entry; the http entry and the WES are dropped
        await expect(page.getByRole("option")).toHaveCount(1);
        await expect(page.getByRole("option")).toContainText("Mock TES");
    });

    test("see hints on task details without a task or service", async ({
        page,
    }) => {
        await page.goto("/dashboard/tasks/details");
        await expect(page.getByText("No task ID was provided.")).toBeVisible();

        // e.g. a bookmarked link: the service must be chosen first
        await page.goto("/dashboard/tasks/details?id=task-1");
        await expect(
            page.getByText("Select the TES instance of the task to view it."),
        ).toBeVisible();

        // only services of the registry list: not the http entry
        await page.goto("/dashboard/tasks/details?id=task-1&service=plain-tes");
        await expect(
            page.getByText(
                "The service of this task isn't in the list of TES instances.",
            ),
        ).toBeVisible();
        expect(await tesRequests()).toEqual([]);
    });

    test("get no token", async ({ page }) => {
        const response = await page.request.get("/auth/api/token");
        expect(response.status()).toBe(401);
    });
});

test.describe("members", () => {
    test("can't log in with a callback of another login", async ({ page }) => {
        // a state that the app didn't issue to this browser
        await page.goto("/auth/api/callback?code=forged&state=forged");
        await page.waitForURL(/\/auth\/error\?type=state$/);
        const response = await page.request.get("/auth/api/token");
        expect(response.status()).toBe(401);
    });

    test("log in and out", async ({ page }) => {
        await login(page);
        await page.getByRole("button", { name: /Alice Example/ }).click();
        await expect(
            page.getByRole("menu").getByText(user.email),
        ).toBeVisible();
        // the session's tokens are for the server only
        await accessToken(page);

        await page.getByRole("menuitem", { name: "Logout" }).click();
        await expect(
            page.getByRole("button", { name: /Anonymous/ }),
        ).toBeVisible();
        const response = await page.request.get("/auth/api/token");
        expect(response.status()).toBe(401);
    });

    test("submit a workflow with their token", async ({ page }) => {
        await login(page);
        const token = await accessToken(page);

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
            {
                method: "POST",
                path: "/runs",
                authorization: `Bearer ${token}`,
                fields: {
                    workflow_url: "https://example.org/workflows/hello.cwl",
                    workflow_type: "CWL",
                    workflow_type_version: "v1.2",
                    workflow_params: "{}",
                },
            },
        ]);
        // the form is empty again
        await expect(page.getByRole("textbox", workflowUrl)).toHaveValue("");

        // the run is in the list of the same service
        await page.getByRole("link", { name: "View Workflows" }).click();
        await page.waitForURL(/\/dashboard\/workflows$/);
        await expect(page.getByText("run-1")).toBeVisible();
    });

    test("submit, view and cancel a task with their token", async ({
        page,
    }) => {
        await login(page);
        const token = await accessToken(page);

        await page.goto("/dashboard/tasks/create");
        await page.getByRole("combobox").click();
        await page.getByRole("option", { name: /Mock TES/ }).click();
        await page
            .getByRole("textbox", { name: "Name", exact: true })
            .fill("hello");
        await page.getByRole("textbox", { name: "Image" }).fill("alpine");
        await page
            .getByRole("textbox", { name: "Executor 1 command" })
            .fill("echo\nhello");
        await page.getByRole("button", { name: "Submit Task" }).click();

        // the service got the task with the user's token
        const submissions = async () =>
            (await tesRequests()).filter(
                (val) => val.method === "POST" && val.path === "/tasks",
            );
        await expect.poll(submissions).toHaveLength(1);
        expect(await submissions()).toEqual([
            {
                method: "POST",
                path: "/tasks",
                authorization: `Bearer ${token}`,
                body: {
                    name: "hello",
                    executors: [
                        { image: "alpine", command: ["echo", "hello"] },
                    ],
                },
            },
        ]);

        // the task is in the list of the same service, with its details
        await page.getByRole("link", { name: "View Tasks" }).click();
        await page.waitForURL(/\/dashboard\/tasks$/);
        await page.getByRole("button", { name: "View Details" }).click();
        await page.waitForURL(
            /\/dashboard\/tasks\/details\?id=task-1&service=mock-tes$/,
        );
        await expect(
            page.getByRole("heading", { name: "hello" }),
        ).toBeVisible();
        // the link names the service: it still works after a reload, which
        // clears the selection
        await page.reload();
        await expect(page.getByText("TES instance: Mock TES")).toBeVisible();
        await expect(
            page.getByRole("heading", { name: "hello" }),
        ).toBeVisible();

        await page.getByRole("button", { name: "Cancel" }).click();
        const cancels = async () =>
            (await tesRequests()).filter(
                (val) =>
                    val.method === "POST" &&
                    val.path === "/tasks/task-1:cancel",
            );
        await expect.poll(cancels).toHaveLength(1);
        expect((await cancels())[0].authorization).toBe(`Bearer ${token}`);
        // every request to the service carried the token
        for (const request of await tesRequests())
            expect(request.authorization).toBe(`Bearer ${token}`);
    });
});
