# Operator guide

This guide is for those who run Krini for their users: how to deploy the
container image or the Helm chart, configure the login provider, the Cloud
Registry and the privacy notice, prepare the TES and WES services, and
upgrade. For using Krini, see the [User guide](../user-guide/index.md).

Krini is a [Next.js](https://nextjs.org/) web app. Its server handles the
login and reads the services from the registry; the users' browsers call
the TES and WES services directly, with the user's access token. A
deployment needs:

- a [Cloud Registry](https://cloud-registry.readthedocs.io/en/latest/)
  (or another GA4GH Service Registry) that lists the TES and WES services
  (see [Cloud Registry](deployment.md#cloud-registry));
- an OpenID Connect login provider, with Krini registered as a
  client (see [Login](login.md));
- TES and WES services that accept tokens issued to Krini's client and
  allow Krini's origin in their CORS settings (see [Service
  configuration](deployment.md#service-configuration));
- a host for Krini's container, served over HTTPS (see
  [Deployment](deployment.md), or the [Helm chart](helm-chart.md) for
  Kubernetes and OpenShift).

## Quick start

1. Choose Krini's public address, e.g. `https://krini.example.org`: this is
   `APP_ORIGIN`.
2. Register Krini with your login provider, with the redirect URI
   `https://krini.example.org/auth/api/callback` (see [Registering Krini
   with a login provider](login.md#registering-krini-with-a-login-provider)).
3. Ask the operators of the TES and WES services to accept tokens issued
   to Krini's client ID and to allow `https://krini.example.org` in their
   CORS settings (see [Service
   configuration](deployment.md#service-configuration) and [CORS
   configuration](deployment.md#cors-configuration)).
4. Write the settings to a file outside the repository, e.g.
   `~/krini/settings.env` (see [Configuration](configuration.md#settings);
   plain `KEY=value` lines without quotes):

    ```env
    APP_ORIGIN=https://krini.example.org
    CLOUD_REGISTRY_URL=https://registry.example.org/ga4gh/registry/v1
    LOGIN_PROVIDERS=<login providers, see Login>
    ```

    [Login](login.md#login-providers) has an example of `LOGIN_PROVIDERS`.

5. [Verify](deployment.md#verifying-images) the image of the release,
   e.g. 0.1.0, and start it behind a reverse proxy that serves it over
   HTTPS at `APP_ORIGIN`:

    ```bash
    docker run --rm -p 3000:3000 --read-only --tmpfs /tmp \
        --env-file ~/krini/settings.env docker.io/elixircloud/krini:0.1.0
    ```

    On Kubernetes or OpenShift, install the [Helm chart](helm-chart.md)
    of the release instead.

6. Go through [Checking a deployment](deployment.md#checking-a-deployment).

## Contents

- [Deployment](deployment.md): the container image, its tags and how to
  verify, run and check it, and what the Cloud Registry and the TES and
  WES services need (client allowlisting, JWT access tokens, CORS).
- [Helm chart](helm-chart.md): installing Krini on Kubernetes or
  OpenShift with the chart attached to each release, its values, and
  upgrades.
- [Configuration](configuration.md): all settings, which Krini reads from
  the environment when it starts.
- [Login](login.md): login providers, registering Krini with a login
  provider, access tiers, sessions and logout.
- [Upgrading](upgrading.md): moving to a newer version, and from the
  branch images or the Vite app to 0.1.0.

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
