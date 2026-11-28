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
            {
                name: "a",
                description: "Input a",
                url: "https://example.org/a",
                path: "/in/a",
                type: "FILE",
            },
            { path: "/in/c", content: "line 1\nline 2" },
        ],
        outputs: [
            {
                name: "b",
                description: "Output b",
                url: "s3://bucket/b",
                path: "/out/*",
                path_prefix: "/out/",
                type: "DIRECTORY",
            },
        ],
        resources: {
            cpu_cores: 1,
            ram_gb: 0.5,
            disk_gb: 1,
            zones: ["zone-a"],
            preemptible: false,
            backend_parameters: { queue: "short" },
            backend_parameters_strict: true,
        },
        volumes: ["/scratch"],
        tags: { project: "demo" },
    },
};

const helloRun = {
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

    it("built-in task is small and needs no inputs", () => {
        const [example] = DEFAULT_TASK_EXAMPLES;
        expect(example.task.inputs).toBeUndefined();
        expect(example.task.executors).toHaveLength(1);
        // a public image of Docker Hub, at a fixed version
        expect(example.task.executors[0].image).toMatch(/^alpine:\d+\.\d+$/);
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
                { name: "", task: hello.task },
                { name: "No task" },
                hello,
                { ...hello, description: "Says hello again" },
            ]),
        });
        expect(examples).toEqual([hello]);
        expect(problems).toEqual([
            "entry 1 is not an object; the entry is left out",
            "entry 2 is not an object; the entry is left out",
            "entry 3.name is not a non-empty string; the entry is left out",
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
                                env: { A: 1 },
                                ignore_error: "yes",
                                shell: "sh",
                            },
                            "alpine",
                        ],
                        inputs: [{ url: "x", type: "LINK", content: 1 }],
                        outputs: "none",
                        resources: {
                            cpu_cores: 1.5,
                            ram_gb: "1",
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
        expect(problems.map((val) => val.replace(/; the .*$/, ""))).toEqual([
            "entry 1.name is not a string without line breaks",
            "entry 1.description is not a string without line breaks",
            "entry 1.task.executors[0].image is not a non-empty string",
            "entry 1.task.executors[0].command[1] is not a string without line breaks",
            "entry 1.task.executors[0].command[2] is not a string without line breaks",
            "entry 1.task.executors[0].env.A is not a string without line breaks",
            "entry 1.task.executors[0].ignore_error is not true or false",
            "entry 1.task.executors[0] has shell, which the form doesn't take",
            "entry 1.task.executors[1] is not an object",
            "entry 1.task.inputs[0] has no path",
            "entry 1.task.inputs[0].type is not FILE or DIRECTORY",
            "entry 1.task.inputs[0].content is not a string",
            "entry 1.task.outputs is not an array",
            "entry 1.task.resources.cpu_cores is not an integer",
            "entry 1.task.resources.ram_gb is not a number",
            "entry 1.task.resources.zones is not an array",
            "entry 1.task.volumes[0] is not a string without line breaks",
            "entry 1.task.tags is not an object",
            "entry 1 has extra, which the form doesn't take",
            "entry 2.task.executors is empty",
            "entry 3.task.executors[0] has no command",
            "entry 4.task.executors is not an array",
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

    it("built-in workflows are pinned GitHub repositories", () => {
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
    });

    it("reads examples of the deployment", () => {
        expect(
            workflowExamples({ WORKFLOW_EXAMPLES: JSON.stringify([helloRun]) }),
        ).toEqual({ examples: [helloRun], problems: [] });
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
        expect(problems.map((val) => val.replace(/; the .*$/, ""))).toEqual([
            "entry 1.run.workflow_url is not a non-empty string",
            "entry 1.run.workflow_type is not a non-empty string",
            "entry 1.run.workflow_type is not a string without line breaks",
            "entry 1.run has no workflow_type_version",
            "entry 1.run.workflow_params is not an object",
            "entry 1.run.workflow_engine_parameters is not an object",
            "entry 1.run has workflow_attachment, which the form doesn't take",
            "entry 2.run is not an object",
        ]);
    });
});
