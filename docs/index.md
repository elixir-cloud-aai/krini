# Krini

Krini is a virtual research environment for running and managing life
science analyses, brought to you by [ELIXIR On-Cloud](https://elixir-on.cloud/).
Users log in with LS Login, find compute services in a [Cloud
Registry](https://cloud-registry.readthedocs.io/en/latest/), run tasks on
[GA4GH Task Execution Service
(TES)](https://github.com/ga4gh/task-execution-schemas) and workflows on
[GA4GH Workflow Execution Service
(WES)](https://github.com/ga4gh/workflow-execution-service-schemas) instances,
and follow their runs. Deploy Krini with its container image for your own
registry and services; other OpenID Connect providers than LS Login are
planned ([krini#43](https://github.com/elixir-cloud-aai/krini/issues/43)).

- [User guide](user-guide/index.md): browsing services, logging in, running
  tasks and workflows, with [examples](user-guide/workflow-examples.md).
- [Operator guide](operator-guide/index.md): [deployment](operator-guide/deployment.md),
  [configuration](operator-guide/configuration.md) and
  [upgrades](operator-guide/upgrading.md).
- [Development](development/index.md): local setup, checks, tests, the
  documentation and [releases](development/releasing.md).

The source code is on
[GitHub](https://github.com/elixir-cloud-aai/krini), under the
[Apache License 2.0](https://github.com/elixir-cloud-aai/krini/blob/dev/LICENSE).
