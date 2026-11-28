/**
 * @description "Use an example": a member submits the example task and
 * workflow without typing anything. The task form has the built-in
 * examples, the workflow form those of `WORKFLOW_EXAMPLES` (see
 * `e2e/settings.ts`), of which it offers only the ones of the service's
 * workflow types. The forms of the Cloud Components get the examples
 * through their internal state (`src/lib/example-forms.ts`): these tests
 * fail when an update of the components breaks that
 */
import { DEFAULT_TASK_EXAMPLES } from "../src/lib/examples";
import {
    accessToken,
    expect,
    login,
    tesRequests,
    test,
    wesRequests,
} from "./fixtures";
import { workflowExamples } from "./settings";

test.describe("members", () => {
    test("submit the example task", async ({ page }) => {
        await login(page);
        const token = await accessToken(page);

        await page.goto("/dashboard/tasks/create");
        await page.getByRole("combobox").click();
        await page.getByRole("option", { name: /Mock TES/ }).click();
        // something typed before is replaced
        await page.getByRole("textbox", { name: "Image" }).fill("ubuntu");

        const [example] = DEFAULT_TASK_EXAMPLES;
        await page.getByRole("button", { name: example.name }).click();
        await expect(
            page.getByRole("textbox", { name: "Name", exact: true }),
        ).toHaveValue("hello-world");
        await expect(page.getByRole("textbox", { name: "Image" })).toHaveValue(
            "alpine:3.22",
        );
        await page.getByRole("button", { name: "Submit Task" }).click();

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
                body: example.task,
            },
        ]);
    });

    test("submit an example workflow of the service's types", async ({
        page,
    }) => {
        await login(page);
        const token = await accessToken(page);

        await page.goto("/dashboard/workflows/create");
        await page.getByRole("combobox").click();
        await page.getByRole("option", { name: /Mock WES/ }).click();

        // the form has loaded the service's types and versions
        await expect(page.getByRole("button", { name: "v1.2" })).toBeVisible();

        // the mock service runs CWL, not Nextflow
        const [cwl, nextflow] = workflowExamples;
        await expect(
            page.getByRole("button", { name: nextflow.name }),
        ).toHaveCount(0);
        await page.getByRole("button", { name: cwl.name }).click();
        await expect(
            page.getByRole("textbox", {
                name: "https://example.com/workflow.cwl",
            }),
        ).toHaveValue(cwl.run.workflow_url);
        await page.getByRole("button", { name: "Submit Run" }).click();

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
                    workflow_url: cwl.run.workflow_url,
                    workflow_type: "CWL",
                    workflow_type_version: "v1.2",
                    workflow_params: JSON.stringify(cwl.run.workflow_params),
                },
            },
        ]);
    });
});

test.describe("anonymous visitors", () => {
    test("get no examples", async ({ page }) => {
        await page.goto("/dashboard/tasks/create");
        await expect(page.getByText("with compute access")).toBeVisible();
        await expect(
            page.getByRole("button", { name: DEFAULT_TASK_EXAMPLES[0].name }),
        ).toHaveCount(0);

        await page.goto("/dashboard/workflows/create");
        await page.getByRole("combobox").click();
        await page.getByRole("option", { name: /Mock WES/ }).click();
        await expect(page.getByText("with compute access")).toBeVisible();
        await expect(
            page.getByRole("button", { name: workflowExamples[0].name }),
        ).toHaveCount(0);
    });
});
