# Operator guide

This guide is for those who run Krini for their users: how to deploy the
container image, configure the login provider, the Cloud Registry and the
privacy notice, prepare the TES and WES services, and upgrade.

- [Deployment](deployment.md): the container image, its tags and how to
  verify and run it, and what the login provider and the TES and WES
  services need (client allowlisting, JWT access tokens, CORS).
- [Configuration](configuration.md): all settings, which Krini reads from
  the environment when it starts.
- [Upgrading](upgrading.md): moving to a newer version.

## Compatibility

Krini supports the following GA4GH API versions:

- **TES (Task Execution Service)**: v1
- **WES (Workflow Execution Service)**: v1

It uses the following client libraries of the
[Cloud Components](https://cloud-components.readthedocs.io/):

- `@elixir-cloud/tes`: ^2.0.0-alpha.51
- `@elixir-cloud/wes`: ^2.0.0-alpha.51

Krini finds the services in a
[Cloud Registry](https://cloud-registry.readthedocs.io/en/latest/)
(`CLOUD_REGISTRY_URL`).
