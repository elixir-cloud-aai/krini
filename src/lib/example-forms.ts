/**
 * Filling the forms of the Cloud Components with an example
 *
 * The task and workflow forms (`ecc-client-ga4gh-tes-run-create` and
 * `ecc-client-ga4gh-wes-run-create` of `@elixir-cloud/tes` and
 * `@elixir-cloud/wes`) have no public property for initial values yet.
 * Until they have, Krini sets their internal form state: the TES form's
 * `form`, the WES form's `formData` and `tags`, which are Lit states, so
 * the forms render them at once. The shapes below are those of the
 * components' versions in `package.json`; `fillTaskForm` and
 * `fillWorkflowForm` report it if an element lacks them (e.g. after an
 * update of the components), and the end-to-end tests (`e2e/examples.spec.ts`)
 * fail when the forms don't take an example any more.
 */
import type { TesTask, WesRun, WorkflowExample } from "./examples";

/** A row of key and value of the forms */
type Row = { key: string; value: string };

/** State of the TES form (`form`) */
type TesForm = {
    name: string;
    description: string;
    executors: {
        image: string;
        command: string;
        workdir: string;
        stdin: string;
        stdout: string;
        stderr: string;
        env: Row[];
        ignoreError: boolean;
    }[];
    inputs: Record<string, string>[];
    outputs: Record<string, string>[];
    tags: Row[];
    volumes: { value: string }[];
    cpuCores: string;
    ramGb: string;
    diskGb: string;
    zones: string;
    preemptible: boolean;
    backendParametersStrict: boolean;
    backendParameters: Row[];
};

/** State of the WES form (`formData` and `tags`) */
type WesForm = {
    formData: {
        workflowUrl: string;
        workflowType: string;
        workflowTypeVersion: string;
        workflowParams: string;
        workflowEngineParams: string;
    };
    tags: Row[];
};

/**
 * Rows of an object of strings
 * @param record The object, if any
 * @returns One row per entry
 */
function rows(record: Record<string, string> | undefined): Row[] {
    return Object.entries(record ?? {}).map(([key, value]) => ({
        key,
        value,
    }));
}

/**
 * Text of an optional number, as the form's inputs hold it
 * @param value The number, if any
 * @returns The number as text, or an empty string
 */
function numberText(value: number | undefined): string {
    return value === undefined ? "" : String(value);
}

/**
 * The TES form's state of a task
 * @param task The task
 * @returns The state, which the form turns back into the task
 */
function taskForm(task: TesTask): TesForm {
    const resources = task.resources ?? {};
    return {
        name: task.name ?? "",
        description: task.description ?? "",
        executors: task.executors.map((ex) => ({
            image: ex.image,
            command: ex.command.join("\n"),
            workdir: ex.workdir ?? "",
            stdin: ex.stdin ?? "",
            stdout: ex.stdout ?? "",
            stderr: ex.stderr ?? "",
            env: rows(ex.env),
            ignoreError: ex.ignore_error ?? false,
        })),
        inputs: (task.inputs ?? []).map((input) => ({ ...input })),
        outputs: (task.outputs ?? []).map((output) => ({ ...output })),
        tags: rows(task.tags),
        volumes: (task.volumes ?? []).map((value) => ({ value })),
        cpuCores: numberText(resources.cpu_cores),
        ramGb: numberText(resources.ram_gb),
        diskGb: numberText(resources.disk_gb),
        zones: (resources.zones ?? []).join(", "),
        preemptible: resources.preemptible ?? false,
        backendParametersStrict: resources.backend_parameters_strict ?? false,
        backendParameters: rows(resources.backend_parameters),
    };
}

/**
 * The WES form's state of a run request
 * @param run The run request
 * @returns The state, which the form turns back into the request
 */
function workflowForm(run: WesRun): WesForm {
    const tags = rows(run.tags);
    return {
        formData: {
            workflowUrl: run.workflow_url,
            workflowType: run.workflow_type,
            workflowTypeVersion: run.workflow_type_version,
            workflowParams: JSON.stringify(run.workflow_params ?? {}, null, 2),
            workflowEngineParams: JSON.stringify(
                run.workflow_engine_parameters ?? {},
                null,
                2,
            ),
        },
        // the form shows one empty row without tags
        tags: tags.length > 0 ? tags : [{ key: "", value: "" }],
    };
}

/**
 * Clear the form's message of the last submission, if it has one
 * @param element The form
 */
function clearMessages(element: Record<string, unknown>) {
    if ("error" in element) element.error = null;
    if ("success" in element) element.success = null;
}

/**
 * Result of filling a form: `filled`; `loading` if the form isn't there
 * yet or still loads what it needs (it would overwrite the example);
 * `unsupported` if the element lacks the state (another version of the
 * components)
 */
type FillResult = "filled" | "loading" | "unsupported";

/**
 * Fill the TES form with a task
 * @param element The form (`ecc-client-ga4gh-tes-run-create`), if found
 * @param task The task
 * @returns Whether the form took the task
 */
function fillTaskForm(element: Element | null, task: TesTask): FillResult {
    const form = element as unknown as Record<string, unknown> | null;
    if (!form) return "loading";
    if (typeof form.form !== "object" || form.form === null)
        return "unsupported";
    form.form = taskForm(task);
    clearMessages(form);
    return "filled";
}

/**
 * Fill the WES form with a run request; attached files are dropped
 * @param element The form (`ecc-client-ga4gh-wes-run-create`), if found
 * @param run The run request
 * @returns Whether the form took the request
 */
function fillWorkflowForm(element: Element | null, run: WesRun): FillResult {
    const form = element as unknown as Record<string, unknown> | null;
    if (!form) return "loading";
    if (
        typeof form.formData !== "object" ||
        form.formData === null ||
        !Array.isArray(form.tags)
    )
        return "unsupported";
    // the service info, once loaded, sets the type and version
    if (form.loading === true) return "loading";
    const state = workflowForm(run);
    form.formData = state.formData;
    form.tags = state.tags;
    if (Array.isArray(form.attachedFiles)) form.attachedFiles = [];
    clearMessages(form);
    return "filled";
}

/**
 * The message for a result of filling a form
 * @param result The result
 * @param form What the form creates: `task` or `workflow`
 * @returns The message and its kind, or null if the form was filled
 */
function fillMessage(
    result: FillResult,
    form: "task" | "workflow",
): { kind: "info" | "error"; text: string } | null {
    if (result === "loading")
        return {
            kind: "info",
            text: `The ${form} form is still loading; try again.`,
        };
    if (result === "unsupported")
        return {
            kind: "error",
            text: `The ${form} form couldn't be filled with the example.`,
        };
    return null;
}

/**
 * The examples that a WES service can run: those of its workflow types and
 * versions, with the type as the service spells it (types match
 * regardless of case); all if the service lists no types (e.g. without
 * service info), and those of any version if it lists none for a type
 * @param examples The examples
 * @param types The service's `workflow_type_versions`, if known
 * @returns The examples to offer
 */
function examplesForService(
    examples: WorkflowExample[],
    types:
        | Record<string, { workflow_type_version?: string[] }>
        | null
        | undefined,
): WorkflowExample[] {
    const names = Object.keys(types ?? {});
    if (names.length === 0) return examples;
    return examples.flatMap((example) => {
        const wanted = example.run.workflow_type.toLowerCase();
        const name = names.find((val) => val.toLowerCase() === wanted);
        if (name === undefined) return [];
        const versions = types?.[name]?.workflow_type_version ?? [];
        if (
            versions.length > 0 &&
            !versions.includes(example.run.workflow_type_version)
        )
            return [];
        return [{ ...example, run: { ...example.run, workflow_type: name } }];
    });
}

export {
    examplesForService,
    type FillResult,
    fillMessage,
    fillTaskForm,
    fillWorkflowForm,
    type TesForm,
    taskForm,
    type WesForm,
    workflowForm,
};
