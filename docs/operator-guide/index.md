# Operator guide

This guide is for those who run Krini for their users: how to deploy the
container image or the Helm chart, configure the login provider, the Cloud Registry and the
privacy notice, prepare the TES and WES services, and upgrade.

- [Deployment](deployment.md): the container image, its tags and how to
  verify and run it, and what the login provider and the TES and WES
  services need (client allowlisting, JWT access tokens, CORS).
- [Helm chart](helm-chart.md): installing Krini on Kubernetes or
  OpenShift with the chart in the repository, its values, and upgrades.
- [Configuration](configuration.md): all settings, which Krini reads from
  the environment when it starts.
- [Upgrading](upgrading.md): moving to a newer version.

## Compatibility

Krini supports the following GA4GH API versions:

- **TES (Task Execution Service)**: v1
- **WES (Workflow Execution Service)**: v1

It uses the following client libraries of the
[Cloud Components](https://cloud-components.readthedocs.io/):

- `@elixir-cloud/tes`: ^1.0.1
- `@elixir-cloud/wes`: ^2.0.0-alpha.49

Krini finds the services in a
[Cloud Registry](https://cloud-registry.readthedocs.io/en/latest/)
(`CLOUD_REGISTRY_URL`).
