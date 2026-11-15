# User guide

Krini lets you run tasks and workflows on compute services that implement
the GA4GH [Task Execution Service (TES)](https://github.com/ga4gh/task-execution-schemas)
and [Workflow Execution Service (WES)](https://github.com/ga4gh/workflow-execution-service-schemas)
APIs, and follow their runs. It finds the services in the Cloud Registry
that its operator has configured.

## Browsing without login

Opening Krini takes you to the dashboard. Without login, the **Tasks** and
**Workflows** pages list the TES and WES services of the registry (WES
services only if they are served over `https`), and the service info page
shows what a WES service supports (e.g. workflow languages and versions).

## Logging in

Use **Login** to log in with one of the deployment's login providers (LS
Login for the ELIXIR On-Cloud deployment). Krini then sends your access
token
to the WES services you use, so that they know who you are; services that
require login accept it only if they trust the deployment's client (see the
[Operator guide](../operator-guide/deployment.md#service-configuration)).
Requests to TES services don't carry your token yet
([krini#44](https://github.com/elixir-cloud-aai/krini/issues/44)).
Your name in the sidebar opens a menu with your e-mail address and
**Logout**.

## Running tasks and workflows

- **Tasks**: choose a TES service, then create a task (container image,
  command, inputs and outputs) and follow the tasks you submitted.
- **Workflows**: choose a WES service, then submit a workflow run (workflow
  URL, type and version, parameters) and follow your runs.

[Workflow examples](workflow-examples.md) has tasks and workflows that are
known to run, with their inputs.

## Privacy

The privacy notice at `/privacy`, linked from the login page and the
sidebar, describes what Krini processes and which cookies it sets. Without
login, Krini sets no cookies, unless you start a login or change the
sidebar.
