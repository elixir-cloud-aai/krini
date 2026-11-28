import { describe, expect, it } from "vitest";
import {
    examplesForService,
    fillTaskForm,
    fillWorkflowForm,
    taskForm,
    workflowForm,
} from "./example-forms";
import {
    DEFAULT_WORKFLOW_EXAMPLES,
    type TesTask,
    type WorkflowExample,
} from "./examples";

/** A stand-in of a form element, with the given state */
function element(state: Record<string, unknown>): Element {
    return state as unknown as Element;
}

const minimal: TesTask = {
    executors: [{ image: "alpine", command: ["echo", "hello"] }],
};

describe("taskForm", () => {
    it("fills the fields of a minimal task", () => {
        expect(taskForm(minimal)).toEqual({
            name: "",
            description: "",
            executors: [
                {
                    image: "alpine",
                    command: "echo\nhello",
                    workdir: "",
                    stdin: "",
                    stdout: "",
                    stderr: "",
                    env: [],
                    ignoreError: false,
                },
            ],
            inputs: [],
            outputs: [],
            tags: [],
            volumes: [],
            cpuCores: "",
            ramGb: "",
            diskGb: "",
            zones: "",
            preemptible: false,
            backendParametersStrict: false,
            backendParameters: [],
        });
    });

    it("fills every field of the form", () => {
        expect(
            taskForm({
                name: "all",
                description: "All fields",
                executors: [
                    {
                        image: "alpine",
                        command: ["cat"],
                        workdir: "/in",
                        stdin: "/in/a",
                        stdout: "/out/stdout",
                        stderr: "/out/stderr",
                        env: { A: "1" },
                        ignore_error: true,
                    },
                ],
                inputs: [{ path: "/in/a", url: "https://example.org/a" }],
                outputs: [{ path: "/out/b", url: "s3://bucket/b" }],
                resources: {
                    cpu_cores: 2,
                    ram_gb: 0.5,
                    disk_gb: 1,
                    zones: ["a", "b"],
                    preemptible: true,
                    backend_parameters: { queue: "short" },
                    backend_parameters_strict: true,
                },
                volumes: ["/scratch"],
                tags: { project: "demo" },
            }),
        ).toEqual({
            name: "all",
            description: "All fields",
            executors: [
                {
                    image: "alpine",
                    command: "cat",
                    workdir: "/in",
                    stdin: "/in/a",
                    stdout: "/out/stdout",
                    stderr: "/out/stderr",
                    env: [{ key: "A", value: "1" }],
                    ignoreError: true,
                },
            ],
            inputs: [{ path: "/in/a", url: "https://example.org/a" }],
            outputs: [{ path: "/out/b", url: "s3://bucket/b" }],
            tags: [{ key: "project", value: "demo" }],
            volumes: [{ value: "/scratch" }],
            cpuCores: "2",
            ramGb: "0.5",
            diskGb: "1",
            zones: "a, b",
            preemptible: true,
            backendParametersStrict: true,
            backendParameters: [{ key: "queue", value: "short" }],
        });
    });
});

describe("workflowForm", () => {
    it("fills the fields of a run request", () => {
        expect(workflowForm(DEFAULT_WORKFLOW_EXAMPLES[2].run)).toEqual({
            formData: {
                workflowUrl: "https://github.com/openwdl/learn-wdl",
                workflowType: "WDL",
                workflowTypeVersion: "1.0",
                workflowParams: '{\n  "HelloInput.name": "ELIXIR On-Cloud"\n}',
                workflowEngineParams: JSON.stringify(
                    DEFAULT_WORKFLOW_EXAMPLES[2].run.workflow_engine_parameters,
                    null,
                    2,
                ),
            },
            tags: [{ key: "", value: "" }],
        });
    });

    it("fills empty parameters and tags", () => {
        expect(
            workflowForm({
                workflow_url: "https://example.org/hello.cwl",
                workflow_type: "CWL",
                workflow_type_version: "v1.2",
                tags: { project: "demo" },
            }),
        ).toEqual({
            formData: {
                workflowUrl: "https://example.org/hello.cwl",
                workflowType: "CWL",
                workflowTypeVersion: "v1.2",
                workflowParams: "{}",
                workflowEngineParams: "{}",
            },
            tags: [{ key: "project", value: "demo" }],
        });
    });
});

describe("fillTaskForm", () => {
    it("sets the form's state and clears its messages", () => {
        const form: Record<string, unknown> = {
            form: {},
            error: "Failed",
            success: "Submitted",
        };
        expect(fillTaskForm(element(form), minimal)).toBe(true);
        expect(form.form).toEqual(taskForm(minimal));
        expect(form.error).toBeNull();
        expect(form.success).toBeNull();
    });

    it("sets only the state that the form has", () => {
        const form: Record<string, unknown> = { form: {} };
        expect(fillTaskForm(element(form), minimal)).toBe(true);
        expect(Object.keys(form)).toEqual(["form"]);
    });

    it("refuses an element without the form's state", () => {
        expect(fillTaskForm(null, minimal)).toBe(false);
        expect(fillTaskForm(element({}), minimal)).toBe(false);
        expect(fillTaskForm(element({ form: null }), minimal)).toBe(false);
    });
});

describe("fillWorkflowForm", () => {
    const { run } = DEFAULT_WORKFLOW_EXAMPLES[0];

    it("sets the form's state, drops attachments and clears messages", () => {
        const form: Record<string, unknown> = {
            formData: {},
            tags: [],
            attachedFiles: ["file"],
            error: "Failed",
            success: "Submitted",
        };
        expect(fillWorkflowForm(element(form), run)).toBe(true);
        const state = workflowForm(run);
        expect(form.formData).toEqual(state.formData);
        expect(form.tags).toEqual(state.tags);
        expect(form.attachedFiles).toEqual([]);
        expect(form.error).toBeNull();
        expect(form.success).toBeNull();
    });

    it("sets only the state that the form has", () => {
        const form: Record<string, unknown> = { formData: {}, tags: [] };
        expect(fillWorkflowForm(element(form), run)).toBe(true);
        expect(Object.keys(form)).toEqual(["formData", "tags"]);
    });

    it("refuses an element without the form's state", () => {
        expect(fillWorkflowForm(null, run)).toBe(false);
        expect(fillWorkflowForm(element({ tags: [] }), run)).toBe(false);
        expect(
            fillWorkflowForm(element({ formData: null, tags: [] }), run),
        ).toBe(false);
        expect(fillWorkflowForm(element({ formData: {} }), run)).toBe(false);
    });
});

describe("examplesForService", () => {
    const examples: WorkflowExample[] = DEFAULT_WORKFLOW_EXAMPLES;

    it("offers all examples without workflow types", () => {
        expect(examplesForService(examples, undefined)).toBe(examples);
        expect(examplesForService(examples, null)).toBe(examples);
        expect(examplesForService(examples, {})).toBe(examples);
    });

    it("offers the examples of the service's types", () => {
        const offered = examplesForService(examples, {
            NFL: { workflow_type_version: ["DSL2"] },
            WDL: { workflow_type_version: ["1.0", "1.1"] },
            CWL: { workflow_type_version: ["v1.2"] },
        });
        expect(offered.map((val) => val.name)).toEqual(["Nextflow", "WDL"]);
    });

    it("uses the service's spelling of a type", () => {
        const offered = examplesForService(examples, {
            smk: { workflow_type_version: ["9.17.3"] },
        });
        expect(offered).toHaveLength(1);
        expect(offered[0].run.workflow_type).toBe("smk");
        // the configured example is unchanged
        expect(examples[1].run.workflow_type).toBe("SMK");
    });
});
