/**
 * Examples that the task and workflow forms can be filled with
 *
 * "Use an example" fills the task form with a TES task and the workflow
 * form with a WES run request, so that a member can try Krini without
 * typing anything. Each deployment can replace the built-in examples with
 * its own: `TASK_EXAMPLES` and `WORKFLOW_EXAMPLES` hold JSON arrays,
 * read on the server at request time, so one image serves every
 * deployment. Unset, Krini offers the built-in examples, which run on the
 * services of ELIXIR On-Cloud (proTES and TESK for tasks, Conquest for
 * workflows); `[]` offers none.
 *
 * The task and the run use the field names of the TES and WES APIs. Only
 * what the forms can show and submit is accepted: the forms' own fields,
 * under the task form's own rules (e.g. absolute paths); anything else is
 * reported and the example left out. The types and the checks below name
 * the same fields: change them together (the unit tests run the built-in
 * examples and one with every field through the checks).
 */

/** An executor of a TES task, as the task form takes it */
type TesExecutor = {
    image: string;
    /** One argument per element; the form shows one per line */
    command: string[];
    workdir?: string;
    stdin?: string;
    stdout?: string;
    stderr?: string;
    env?: Record<string, string>;
    ignore_error?: boolean;
};

/** An input of a TES task */
type TesInput = {
    url?: string;
    path: string;
    type?: "FILE" | "DIRECTORY";
    content?: string;
};

/** An output of a TES task */
type TesOutput = {
    url: string;
    path: string;
    path_prefix?: string;
    type?: "FILE" | "DIRECTORY";
};

/** Resources of a TES task */
type TesResources = {
    cpu_cores?: number;
    ram_gb?: number;
    disk_gb?: number;
    zones?: string[];
    preemptible?: boolean;
    backend_parameters?: Record<string, string>;
    backend_parameters_strict?: boolean;
};

/** A TES task, as far as the task form takes it */
type TesTask = {
    name?: string;
    description?: string;
    executors: TesExecutor[];
    inputs?: TesInput[];
    outputs?: TesOutput[];
    resources?: TesResources;
    volumes?: string[];
    tags?: Record<string, string>;
};

/** A WES run request, as far as the workflow form takes it */
type WesRun = {
    workflow_url: string;
    workflow_type: string;
    workflow_type_version: string;
    workflow_params?: Record<string, unknown>;
    workflow_engine_parameters?: Record<string, unknown>;
    tags?: Record<string, string>;
};

/** An example of the task form */
type TaskExample = {
    /** Label of the example's button */
    name: string;
    /** Tooltip of the button */
    description?: string;
    task: TesTask;
};

/** An example of the workflow form */
type WorkflowExample = {
    /** Label of the example's button */
    name: string;
    /** Tooltip of the button */
    description?: string;
    run: WesRun;
};

type Env = Record<string, string | undefined>;

/** Examples of a setting, and the problems of its value */
type Examples<T> = {
    examples: T[];
    /** Problems, for the server log; without them, all entries are used */
    problems: string[];
};

/**
 * The built-in task: a small public image, no inputs, a few seconds of
 * work; as the tasks of the end-to-end tests of ELIXIR On-Cloud through
 * proTES to TESK
 */
const DEFAULT_TASK_EXAMPLES: TaskExample[] = [
    {
        name: "Hello world",
        description:
            "Prints a greeting, the user ID and the date in a small Alpine Linux container",
        task: {
            name: "hello-world",
            description: "Example task of Krini",
            executors: [
                {
                    image: "alpine:3.22",
                    command: [
                        "sh",
                        "-c",
                        'echo "Hello from Krini!"; id -u; date -u',
                    ],
                },
            ],
        },
    },
];

/**
 * The built-in workflows, one per language that Conquest runs; public
 * GitHub repositories at a full commit SHA, as Conquest requires
 * (`revision`), without inputs
 */
const DEFAULT_WORKFLOW_EXAMPLES: WorkflowExample[] = [
    {
        name: "Nextflow",
        description: "nextflow-io/hello: says hello in four languages",
        run: {
            workflow_url: "https://github.com/nextflow-io/hello",
            workflow_type: "NFL",
            workflow_type_version: "DSL2",
            workflow_params: {},
            workflow_engine_parameters: {
                revision: "3c2cdc9823c2b4636e5e3e73e223878099ff5dc9",
            },
        },
    },
    {
        name: "Snakemake",
        description: "nathanhaigh/snakemake-hello-world: four small shell jobs",
        run: {
            workflow_url:
                "https://github.com/nathanhaigh/snakemake-hello-world",
            workflow_type: "SMK",
            workflow_type_version: "9.17.3",
            workflow_params: {},
            workflow_engine_parameters: {
                revision: "225cc26bdb097d8deb060306e64c24adbc8ccffc",
            },
        },
    },
    {
        name: "WDL",
        description: "openwdl/learn-wdl: greets the name it gets as input",
        run: {
            workflow_url: "https://github.com/openwdl/learn-wdl",
            workflow_type: "WDL",
            workflow_type_version: "1.0",
            workflow_params: { "HelloInput.name": "ELIXIR On-Cloud" },
            workflow_engine_parameters: {
                revision: "b219e5b5b8d79d2cf940f6f3a614d1eb9501866c",
                main_workflow_path:
                    "1_script_examples/1_hello_worlds/4_hello_input_workflow/input-workflow.wdl",
            },
        },
    },
];

/**
 * Check a value; returns the problems, each starting with `where`, the
 * path of the value
 */
type Check = (value: unknown, where: string) => string[];

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Text of a single line: the forms show it in one input */
const line: Check = (value, where) =>
    typeof value === "string" && !/[\r\n]/.test(value)
        ? []
        : [`${where} is not a string without line breaks`];

/** Text of a single line, not only white space */
const nonEmptyLine: Check = (value, where) => {
    const problems = line(value, where);
    if (problems.length === 0 && (value as string).trim() === "")
        problems.push(`${where} is empty`);
    return problems;
};

/** An absolute path in the container, as the task form requires */
const absolutePath: Check = (value, where) => {
    const problems = line(value, where);
    if (problems.length === 0 && !(value as string).trim().startsWith("/"))
        problems.push(`${where} is not an absolute path`);
    return problems;
};

const flag: Check = (value, where) =>
    typeof value === "boolean" ? [] : [`${where} is not true or false`];

const number: Check = (value, where) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0
        ? []
        : [`${where} is not a number of at least 0`];

const integer: Check = (value, where) =>
    Number.isInteger(value) && (value as number) >= 0
        ? []
        : [`${where} is not an integer of at least 0`];

const fileType: Check = (value, where) =>
    value === "FILE" || value === "DIRECTORY"
        ? []
        : [`${where} is not FILE or DIRECTORY`];

/** Any JSON object */
const object: Check = (value, where) =>
    isRecord(value) ? [] : [`${where} is not an object`];

/**
 * An array of values that `item` accepts
 * @param item Check of an item
 * @param nonEmpty Whether the array needs at least one item
 */
function list(item: Check, nonEmpty = false): Check {
    return (value, where) => {
        if (!Array.isArray(value)) return [`${where} is not an array`];
        if (nonEmpty && value.length === 0) return [`${where} is empty`];
        return value.flatMap((val, index) => item(val, `${where}[${index}]`));
    };
}

/** An object of single-line strings, with keys of one non-empty line:
 * the form shows a row of key and value per entry */
const lines: Check = (value, where) =>
    isRecord(value)
        ? Object.entries(value).flatMap(([key, val]) => [
              ...nonEmptyLine(key, `${where} key "${key}"`),
              ...line(val, `${where}.${key}`),
          ])
        : [`${where} is not an object`];

/** Check of a field, and whether it's required */
type Field = { check: Check; required?: boolean };

/**
 * An object with the given fields, and no others
 * @param fields Check of each field
 * @param rule Check of the whole object, if its fields are valid
 */
function shape(
    fields: Record<string, Field>,
    rule?: (value: Record<string, unknown>, where: string) => string[],
): Check {
    return (value, where) => {
        if (!isRecord(value)) return [`${where} is not an object`];
        const problems: string[] = [];
        for (const [name, { check, required }] of Object.entries(fields)) {
            if (value[name] === undefined) {
                if (required) problems.push(`${where} has no ${name}`);
            } else {
                problems.push(...check(value[name], `${where}.${name}`));
            }
        }
        for (const name of Object.keys(value)) {
            if (!Object.hasOwn(fields, name))
                problems.push(
                    `${where} has ${name}, which the form doesn't take`,
                );
        }
        if (problems.length === 0 && rule) problems.push(...rule(value, where));
        return problems;
    };
}

const optional = (check: Check): Field => ({ check });
const required = (check: Check): Field => ({ check, required: true });

const executor = shape({
    image: required(nonEmptyLine),
    command: required(list(line, true)),
    workdir: optional(line),
    stdin: optional(absolutePath),
    stdout: optional(absolutePath),
    stderr: optional(absolutePath),
    env: optional(lines),
    ignore_error: optional(flag),
});

// the fields and rules of the task form (`validate` of
// `ecc-client-ga4gh-tes-run-create`): an example that passes them can be
// submitted as it is; the types above must name the same fields
const input = shape(
    {
        url: optional(line),
        path: required(absolutePath),
        type: optional(fileType),
        // the form shows it in one input
        content: optional(line),
    },
    (value, where) =>
        value.url || value.content ? [] : [`${where} has no url or content`],
);

const output = shape(
    {
        url: required(nonEmptyLine),
        path: required(absolutePath),
        path_prefix: optional(line),
        type: optional(fileType),
    },
    (value, where) =>
        /[*?[]/.test(value.path as string) &&
        !(value.path_prefix as string | undefined)?.trim()
            ? [`${where} has a wildcard path but no path_prefix`]
            : [],
);

const task = shape({
    name: optional(line),
    description: optional(line),
    executors: required(list(executor, true)),
    inputs: optional(list(input)),
    outputs: optional(list(output)),
    resources: optional(
        shape({
            cpu_cores: optional(integer),
            ram_gb: optional(number),
            disk_gb: optional(number),
            zones: optional(list(line)),
            preemptible: optional(flag),
            backend_parameters: optional(lines),
            backend_parameters_strict: optional(flag),
        }),
    ),
    volumes: optional(list(line)),
    tags: optional(lines),
});

// the fields of the workflow form; the types above must name the same
const run = shape({
    workflow_url: required(nonEmptyLine),
    workflow_type: required(nonEmptyLine),
    workflow_type_version: required(nonEmptyLine),
    workflow_params: optional(object),
    workflow_engine_parameters: optional(object),
    tags: optional(lines),
});

/**
 * Read the examples of a setting
 * @param raw Value of the setting
 * @param body Name and check of the example's body (`task` or `run`)
 * @param defaults Examples if the setting is unset, empty or invalid
 * @returns The valid examples, and the problems of the others
 */
function readExamples<T>(
    raw: string | undefined,
    body: [string, Check],
    defaults: T[],
): Examples<T> {
    if (raw === undefined || raw.trim() === "")
        return { examples: defaults, problems: [] };

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return {
            examples: defaults,
            problems: ["is not valid JSON; the built-in examples are used"],
        };
    }
    if (!Array.isArray(parsed))
        return {
            examples: defaults,
            problems: ["is not a JSON array; the built-in examples are used"],
        };

    const [field, check] = body;
    const entry = shape({
        name: required(nonEmptyLine),
        description: optional(line),
        [field]: required(check),
    });
    const examples: T[] = [];
    const problems: string[] = [];
    // the name labels the example's button: one button per name
    const names = new Set<string>();
    parsed.forEach((val, index) => {
        const where = `entry ${index + 1}`;
        const found = entry(val, where);
        if (found.length === 0) {
            // only now `val` is known to be an object with a name
            const { name } = val as { name: string };
            if (names.has(name))
                found.push(`${where} has the name of an earlier entry`);
            names.add(name);
        }
        if (found.length === 0) examples.push(val as T);
        else problems.push(...found.map((p) => `${p}; the entry is left out`));
    });
    return { examples, problems };
}

/**
 * Get the examples of the task form (`TASK_EXAMPLES`)
 * @param env Environment; the process's by default
 * @returns The examples, and the problems of the setting
 */
function taskExamples(env: Env = process.env): Examples<TaskExample> {
    return readExamples(
        env.TASK_EXAMPLES,
        ["task", task],
        DEFAULT_TASK_EXAMPLES,
    );
}

/**
 * Get the examples of the workflow form (`WORKFLOW_EXAMPLES`)
 * @param env Environment; the process's by default
 * @returns The examples, and the problems of the setting
 */
function workflowExamples(env: Env = process.env): Examples<WorkflowExample> {
    return readExamples(
        env.WORKFLOW_EXAMPLES,
        ["run", run],
        DEFAULT_WORKFLOW_EXAMPLES,
    );
}

export {
    DEFAULT_TASK_EXAMPLES,
    DEFAULT_WORKFLOW_EXAMPLES,
    type Examples,
    type TaskExample,
    type TesTask,
    taskExamples,
    type WesRun,
    type WorkflowExample,
    workflowExamples,
};
