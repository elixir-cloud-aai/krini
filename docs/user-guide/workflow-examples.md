# Workflow examples

Krini's built-in examples, which **Use an example** puts into the task and
workflow forms: small, public and without inputs, so that they run without
any data of yours. They are the examples of the end-to-end tests of ELIXIR
On-Cloud: the task through the proTES gateway to TESK, the workflows on
Conquest. A deployment can replace them with its own (see
[Examples](../operator-guide/configuration.md#examples)); this page then
doesn't describe what its forms offer.

## Task

**Hello world**: one executor in a small public image (Alpine Linux from
Docker Hub), which prints a greeting, the user ID it runs as and the date.
The TES task:

```json
{
  "name": "hello-world",
  "description": "Example task of Krini",
  "executors": [
    {
      "image": "alpine:3.22",
      "command": ["sh", "-c", "echo \"Hello from Krini!\"; id -u; date -u"]
    }
  ]
}
```

It runs on any TES service that can pull images from Docker Hub. Its logs
(**View Details**) show the output.

## Workflows

One example per workflow language that Conquest runs: Nextflow (`NFL`),
Snakemake (`SMK`) and WDL. The form offers those of the languages that the
selected service lists in its service info.

Conquest runs workflows from public GitHub repositories only, at a full
commit SHA (`revision` in the engine parameters, under **Advanced
Configuration** in the form), and takes the main file of a WDL workflow
from `main_workflow_path`. Other WES services may expect other workflow
URLs and engine parameters: change the example accordingly, or ask your
operator for examples of your services.

### Nextflow

[nextflow-io/hello](https://github.com/nextflow-io/hello) (Apache-2.0):
one process that says hello in four languages, as four tasks.

```json
{
  "workflow_url": "https://github.com/nextflow-io/hello",
  "workflow_type": "NFL",
  "workflow_type_version": "DSL2",
  "workflow_params": {},
  "workflow_engine_parameters": {
    "revision": "3c2cdc9823c2b4636e5e3e73e223878099ff5dc9"
  }
}
```

### Snakemake

[nathanhaigh/snakemake-hello-world](https://github.com/nathanhaigh/snakemake-hello-world)
(GPL-3.0): four small shell jobs of the `Snakefile` at the top of the
repository.

```json
{
  "workflow_url": "https://github.com/nathanhaigh/snakemake-hello-world",
  "workflow_type": "SMK",
  "workflow_type_version": "9.17.3",
  "workflow_params": {},
  "workflow_engine_parameters": {
    "revision": "225cc26bdb097d8deb060306e64c24adbc8ccffc"
  }
}
```

### WDL

[openwdl/learn-wdl](https://github.com/openwdl/learn-wdl) (BSD-3-Clause):
a workflow with one task, which greets the name it gets as its only input
(`HelloInput.name`), in an `ubuntu` container.

```json
{
  "workflow_url": "https://github.com/openwdl/learn-wdl",
  "workflow_type": "WDL",
  "workflow_type_version": "1.0",
  "workflow_params": { "HelloInput.name": "ELIXIR On-Cloud" },
  "workflow_engine_parameters": {
    "revision": "b219e5b5b8d79d2cf940f6f3a614d1eb9501866c",
    "main_workflow_path": "1_script_examples/1_hello_worlds/4_hello_input_workflow/input-workflow.wdl"
  }
}
```

## More

- [GA4GH Task Execution Service API](https://ga4gh.github.io/task-execution-schemas/docs/)
- [GA4GH Workflow Execution Service API](https://ga4gh.github.io/workflow-execution-service-schemas/docs/)
- [Nextflow](https://www.nextflow.io/docs/latest/),
  [Snakemake](https://snakemake.readthedocs.io/),
  [WDL](https://github.com/openwdl/wdl),
  [CWL](https://www.commonwl.org/)
