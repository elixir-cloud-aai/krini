import { describe, expect, it, vi } from "vitest";
import {
    DEFAULT_TASK_EXAMPLES,
    DEFAULT_WORKFLOW_EXAMPLES,
    taskExamples,
    workflowExamples,
} from "./examples";

const hello = {
    name: "Hello",
    description: "Says hello",
    task: {
        executors: [{ image: "alpine", command: ["echo", "hello"] }],
    },
};

/** An example with every field of the task form */
const fullTask = {
    name: "Everything",
    task: {
        name: "everything",
        description: "All fields of the form",
        executors: [
            {
                image: "alpine",
                command: ["sh", "-c", "cat /in/a > /out/b"],
                workdir: "/in",
                stdin: "/in/a",
                stdout: "/out/stdout",
                stderr: "/out/stderr",
                env: { GREETING: "hello" },
                ignore_error: true,
            },
        ],
        inputs: [
            { url: "https://example.org/a", path: "/in/a", type: "FILE" },
            { path: "/in/c", content: "one line" },
        ],
        outputs: [
            {
                url: "s3://bucket/b",
                path: "/out/*",
                path_prefix: "/out/",
                type: "DIRECTORY",
            },
            { url: "s3://bucket/c", path: "/out/c" },
        ],
        resources: {
            cpu_cores: 1,
            ram_gb: 0.5,
            disk_gb: 0,
            zones: ["zone-a"],
            preemptible: false,
            backend_parameters: { queue: "short" },
            backend_parameters_strict: true,
        },
        volumes: ["/scratch"],
        tags: { project: "demo" },
    },
};

/** An example with every field of the workflow form */
const fullRun = {
    name: "CWL",
    run: {
        workflow_url: "https://example.org/hello.cwl",
        workflow_type: "CWL",
        workflow_type_version: "v1.2",
        workflow_params: { message: "hello" },
        workflow_engine_parameters: {},
        tags: { project: "demo" },
    },
};

/** The problems of a setting, without the common suffix */
function problemsOf(problems: string[]) {
    return problems.map((val) => val.replace(/; the entry is left out$/, ""));
}

describe("taskExamples", () => {
    it("has the built-in examples without the setting", () => {
        expect(taskExamples({})).toEqual({
            examples: DEFAULT_TASK_EXAMPLES,
            problems: [],
        });
        expect(taskExamples({ TASK_EXAMPLES: "  " }).examples).toBe(
            DEFAULT_TASK_EXAMPLES,
        );
    });

    it("reads the process's environment by default", () => {
        vi.stubEnv("TASK_EXAMPLES", JSON.stringify([hello]));
        expect(taskExamples().examples).toEqual([hello]);
    });

    it("built-in task is small, valid and needs no inputs", () => {
        const [example] = DEFAULT_TASK_EXAMPLES;
        expect(example.task.inputs).toBeUndefined();
        expect(example.task.executors).toHaveLength(1);
        // a public image of Docker Hub, at a fixed version
        expect(example.task.executors[0].image).toMatch(/^alpine:\d+\.\d+$/);
        // the checks of the setting accept it
        expect(
            taskExamples({
                TASK_EXAMPLES: JSON.stringify(DEFAULT_TASK_EXAMPLES),
            }),
        ).toEqual({ examples: DEFAULT_TASK_EXAMPLES, problems: [] });
    });

    it("reads examples of the deployment", () => {
        expect(
            taskExamples({ TASK_EXAMPLES: JSON.stringify([hello, fullTask]) }),
        ).toEqual({ examples: [hello, fullTask], problems: [] });
    });

    it("offers none for an empty array", () => {
        expect(taskExamples({ TASK_EXAMPLES: "[]" })).toEqual({
            examples: [],
            problems: [],
        });
    });

    it("uses the built-in examples for invalid JSON", () => {
        expect(taskExamples({ TASK_EXAMPLES: "[{" })).toEqual({
            examples: DEFAULT_TASK_EXAMPLES,
            problems: ["is not valid JSON; the built-in examples are used"],
        });
    });

    it("uses the built-in examples for other JSON than an array", () => {
        expect(taskExamples({ TASK_EXAMPLES: JSON.stringify(hello) })).toEqual({
            examples: DEFAULT_TASK_EXAMPLES,
            problems: ["is not a JSON array; the built-in examples are used"],
        });
    });

    it("leaves out invalid entries and keeps the others", () => {
        const { examples, problems } = taskExamples({
            TASK_EXAMPLES: JSON.stringify([
                "hello",
                null,
                { name: " ", task: hello.task },
                { name: "No task" },
                hello,
                { ...hello, description: "Says hello again" },
            ]),
        });
        expect(examples).toEqual([hello]);
        expect(problems).toEqual([
            "entry 1 is not an object; the entry is left out",
            "entry 2 is not an object; the entry is left out",
            "entry 3.name is empty; the entry is left out",
            "entry 4 has no task; the entry is left out",
            "entry 6 has the name of an earlier entry; the entry is left out",
        ]);
    });

    it("names each problem of a task", () => {
        const { examples, problems } = taskExamples({
            TASK_EXAMPLES: JSON.stringify([
                {
                    name: "Two\nlines",
                    description: 1,
                    extra: true,
                    task: {
                        executors: [
                            {
                                image: " ",
                                command: ["echo", "a\nb", 1],
                                stdout: "out.txt",
                                env: { A: 1, "": "empty" },
                                ignore_error: "yes",
                                shell: "sh",
                            },
                            "alpine",
                        ],
                        inputs: [
                            { url: "x", type: "LINK", content: "a\nb" },
                            { path: "data/a", url: "https://example.org/a" },
                        ],
                        outputs: "none",
                        resources: {
                            cpu_cores: 1.5,
                            ram_gb: "1",
                            disk_gb: -1,
                            zones: "a",
                        },
                        volumes: [1],
                        tags: [],
                    },
                },
                { name: "No executors", task: { executors: [] } },
                { name: "No command", task: { executors: [{ image: "a" }] } },
                { name: "Executors", task: { executors: {} } },
            ]),
        });
        expect(examples).toEqual([]);
        expect(problemsOf(problems)).toEqual([
            "entry 1.name is not a string without line breaks",
            "entry 1.description is not a string without line breaks",
            "entry 1.task.executors[0].image is empty",
            "entry 1.task.executors[0].command[1] is not a string without line breaks",
            "entry 1.task.executors[0].command[2] is not a string without line breaks",
            "entry 1.task.executors[0].stdout is not an absolute path",
            "entry 1.task.executors[0].env.A is not a string without line breaks",
            'entry 1.task.executors[0].env key "" is empty',
            "entry 1.task.executors[0].ignore_error is not true or false",
            "entry 1.task.executors[0] has shell, which the form doesn't take",
            "entry 1.task.executors[1] is not an object",
            "entry 1.task.inputs[0].url is not a URL",
            "entry 1.task.inputs[0] has no path",
            "entry 1.task.inputs[0].type is not FILE or DIRECTORY",
            "entry 1.task.inputs[0].content is not a string without line breaks",
            "entry 1.task.inputs[1].path is not an absolute path",
            "entry 1.task.outputs is not an array",
            "entry 1.task.resources.cpu_cores is not an integer of at least 0",
            "entry 1.task.resources.ram_gb is not a number of at least 0",
            "entry 1.task.resources.disk_gb is not a number of at least 0",
            "entry 1.task.resources.zones is not an array",
            "entry 1.task.volumes[0] is not a string without line breaks",
            "entry 1.task.tags is not an object",
            "entry 1 has extra, which the form doesn't take",
            "entry 2.task.executors is empty",
            "entry 3.task.executors[0] has no command",
            "entry 4.task.executors is not an array",
        ]);
    });

    it("applies the task form's rules of inputs and outputs", () => {
        const task = (inputs: unknown[], outputs: unknown[]) => ({
            name: `${JSON.stringify(inputs)}${JSON.stringify(outputs)}`,
            task: { ...hello.task, inputs, outputs },
        });
        const { examples, problems } = taskExamples({
            TASK_EXAMPLES: JSON.stringify([
                task([{ path: "/in/a" }], []),
                task([], [{ url: "s3://b/o", path: "/out/*.txt" }]),
                task(
                    [],
                    [{ url: "s3://b/o", path: "/out/[ab]", path_prefix: " " }],
                ),
                task([], [{ url: " ", path: "/out/a" }]),
            ]),
        });
        expect(examples).toEqual([]);
        expect(problemsOf(problems)).toEqual([
            "entry 1.task.inputs[0] has no url or content",
            "entry 2.task.outputs[0] has a wildcard path but no path_prefix",
            "entry 3.task.outputs[0] has a wildcard path but no path_prefix",
            "entry 4.task.outputs[0].url is empty",
        ]);
    });

    it("refuses what the task form would trim, split or refuse", () => {
        const { examples, problems } = taskExamples({
            TASK_EXAMPLES: JSON.stringify([
                {
                    name: "Trimmed",
                    task: {
                        executors: [
                            {
                                image: "a",
                                command: [" ", ""],
                                env: { " A": "1" },
                            },
                        ],
                        inputs: [{ path: "/in/a", url: "  " }],
                        resources: { zones: ["eu-1,eu-2", " "] },
                    },
                },
            ]),
        });
        expect(examples).toEqual([]);
        expect(problemsOf(problems)).toEqual([
            "entry 1.task.executors[0].command is empty",
            'entry 1.task.executors[0].env key " A" has white space around it',
            "entry 1.task.inputs[0].url is empty",
            "entry 1.task.resources.zones[0] has a comma",
            "entry 1.task.resources.zones[1] is empty",
        ]);
    });

    it("refuses paths with white space and URLs that don't parse", () => {
        const { examples, problems } = taskExamples({
            TASK_EXAMPLES: JSON.stringify([
                {
                    name: "Paths",
                    task: {
                        executors: [
                            {
                                image: "a",
                                command: ["b"],
                                stdout: " /out",
                                stderr: 1,
                            },
                        ],
                        inputs: [{ path: "/in/a", url: "x" }],
                        outputs: [{ url: "bucket/o", path: "/out/a " }],
                    },
                },
            ]),
        });
        expect(examples).toEqual([]);
        expect(problemsOf(problems)).toEqual([
            "entry 1.task.executors[0].stdout has white space around it",
            "entry 1.task.executors[0].stderr is not a string without line breaks",
            "entry 1.task.inputs[0].url is not a URL",
            "entry 1.task.outputs[0].url is not a URL",
            "entry 1.task.outputs[0].path has white space around it",
        ]);
    });

    it("refuses fields of the prototype", () => {
        const { problems } = taskExamples({
            TASK_EXAMPLES: `[{"name":"Proto","task":{"executors":[{"image":"a","command":["b"],"constructor":1,"__proto__":{}}]}}]`,
        });
        expect(problemsOf(problems)).toEqual([
            "entry 1.task.executors[0] has constructor, which the form doesn't take",
            "entry 1.task.executors[0] has __proto__, which the form doesn't take",
        ]);
    });
});

describe("workflowExamples", () => {
    it("has the built-in examples without the setting", () => {
        expect(workflowExamples({})).toEqual({
            examples: DEFAULT_WORKFLOW_EXAMPLES,
            problems: [],
        });
    });

    it("reads the process's environment by default", () => {
        vi.stubEnv("WORKFLOW_EXAMPLES", "[]");
        expect(workflowExamples().examples).toEqual([]);
    });

    it("built-in workflows are valid, pinned GitHub repositories", () => {
        // Conquest runs only public GitHub repositories at a full commit
        expect(
            DEFAULT_WORKFLOW_EXAMPLES.map((val) => val.run.workflow_type),
        ).toEqual(["NFL", "SMK", "WDL"]);
        for (const { run } of DEFAULT_WORKFLOW_EXAMPLES) {
            expect(run.workflow_url).toMatch(
                /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/,
            );
            expect(run.workflow_engine_parameters?.revision).toMatch(
                /^[0-9a-f]{40}$/,
            );
        }
        expect(
            workflowExamples({
                WORKFLOW_EXAMPLES: JSON.stringify(DEFAULT_WORKFLOW_EXAMPLES),
            }),
        ).toEqual({ examples: DEFAULT_WORKFLOW_EXAMPLES, problems: [] });
    });

    it("reads examples of the deployment", () => {
        expect(
            workflowExamples({ WORKFLOW_EXAMPLES: JSON.stringify([fullRun]) }),
        ).toEqual({ examples: [fullRun], problems: [] });
    });

    it("names each problem of a run", () => {
        const { examples, problems } = workflowExamples({
            WORKFLOW_EXAMPLES: JSON.stringify([
                {
                    name: "Bad",
                    run: {
                        workflow_url: "",
                        workflow_type: 1,
                        workflow_params: [],
                        workflow_engine_parameters: "{}",
                        workflow_attachment: [],
                    },
                },
                { name: "Run", run: "https://example.org/hello.cwl" },
            ]),
        });
        expect(examples).toEqual([]);
        expect(problemsOf(problems)).toEqual([
            "entry 1.run.workflow_url is empty",
            "entry 1.run.workflow_type is not a string without line breaks",
            "entry 1.run has no workflow_type_version",
            "entry 1.run.workflow_params is not an object",
            "entry 1.run.workflow_engine_parameters is not an object",
            "entry 1.run has workflow_attachment, which the form doesn't take",
            "entry 2.run is not an object",
        ]);
    });

    it("refuses what the workflow form would trim, drop or refuse", () => {
        const { problems } = workflowExamples({
            WORKFLOW_EXAMPLES: JSON.stringify([
                {
                    name: "Trimmed",
                    run: {
                        workflow_url: "example.org/hello.cwl",
                        workflow_type: " CWL",
                        workflow_type_version: "v1.2 ",
                        tags: { project: "" },
                    },
                },
            ]),
        });
        expect(problemsOf(problems)).toEqual([
            "entry 1.run.workflow_url is not a URL",
            "entry 1.run.workflow_type has white space around it",
            "entry 1.run.workflow_type_version has white space around it",
            "entry 1.run.tags.project is empty",
        ]);
    });
});
