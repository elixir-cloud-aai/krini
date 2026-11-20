# Upgrading

Krini keeps no data of its own: an upgrade replaces the container image and
restarts it.

## Updating a deployment

1. Read the release notes of every version between yours and the new one
   (the GitHub releases of
   [elixir-cloud-aai/krini](https://github.com/elixir-cloud-aai/krini/releases)):
   they list breaking changes, such as new, renamed or removed settings,
   under "Breaking changes", and every release that changes settings says
   so there.
2. Adapt the settings (see [Configuration](configuration.md)).
3. Pull and [verify](deployment.md#verifying-images) the image of the new
   version, and restart the container with it; with the Helm chart, run
   `helm upgrade` with the chart attached to the new release, which
   deploys its image unless your values set `krini.tag` (remove it, or set
   the new version; see [Helm chart](helm-chart.md#upgrades)), and whose
   values may have changed, too.
4. Go through [Checking a deployment](deployment.md#checking-a-deployment).

Sessions survive an upgrade, as they are in cookies. While the old and
the new container run side by side (e.g. during the rolling update of the
Helm chart), the tabs of a browser still refresh a session one at a time;
only in browsers without Web Locks (or in tabs loaded from images older
than 0.1.0, which don't take turns) can two tabs whose refreshes reach
both containers end the session, and send the user to the login page (see
[Pods](helm-chart.md#pods)). Keep each browser on one pod (sticky
sessions) to avoid even that.

## From 0.1.0 to the next release

Krini now redirects requests at other hosts than that of `APP_ORIGIN` to
`APP_ORIGIN`, by default (see [Several
addresses](deployment.md#several-addresses)). If your deployment serves
other public host names on purpose, set `REDIRECT_TO_APP_ORIGIN=false`
(Helm chart: `config.redirectToAppOrigin: false`) to keep serving them as
they are. A proxy in front of Krini must pass on the `Host` header of the
browser's request.

## From the branch images to 0.1.0

Deployments that pull `krini:staging`, `krini:dev` or a `sha-<commit>`
tag should move to a release (see [Branches and
tags](deployment.md#branches-and-tags)); `staging` is no longer updated.
The settings of 0.1.0 are those of the newest `dev` images.

Images built before the provider-agnostic login (krini#70) read the
settings of one LS Login client; 0.1.0 reads the login providers from
`LOGIN_PROVIDERS` (see [Login](login.md)) and ignores the old settings:

| Before | 0.1.0 |
| --- | --- |
| `LS_LOGIN_URL` | `issuer` of the provider: `LS_LOGIN_URL` followed by `/oidc/`, e.g. `https://login.aai.lifescience-ri.eu/oidc/` |
| `OIDC_CLIENT_ID` | `clientId` of the provider |
| `OIDC_CLIENT_SECRET` | `clientSecret` of the provider |
| `OIDC_SCOPE` (space-separated) | `scopes` of the provider (a JSON array) |
| — | `groupsClaim`, `computeGroups`, `adminGroups`: without them, nobody can run tasks or workflows (see [Access tiers](login.md#access-tiers)) |
| `OIDC_REDIRECT_URI` | unchanged, now optional (default `<APP_ORIGIN>/auth/api/callback`) |

Krini now reads the provider's endpoints from its discovery document
instead of appending `/oidc/token` to `LS_LOGIN_URL`. Since krini#84,
`APP_ORIGIN` must be the public origin of Krini, as the login sends users
back to it; register `<APP_ORIGIN>/` as post-logout redirect URI with the
provider, too.

Krini no longer appends `/ga4gh/tes/v1` to the URLs of TES services, and
lists only TES services over `https`, as for WES. Before upgrading from a
version with `@elixir-cloud/tes` 1.x, check that the TES entries of your
registry have `https` URLs with the API path, e.g.
`https://tes.example.org/ga4gh/tes/v1`, not only the host (see [Cloud
Registry](deployment.md#cloud-registry)).

## From the Vite app to 0.1.0

Krini 0.1.0 is a rewrite of the earlier Vite app (branch `dev-legacy`) as
a Next.js app with a server of its own. A deployment of the Vite app needs
a new setup rather than an upgrade:

| Vite app | 0.1.0 |
| --- | --- |
| Static files served by Nginx on port `8081` | Next.js server on port `3000` (`PORT`) |
| `VITE_HOST_URI`, built into the image (`.env.production`) | `APP_ORIGIN`, read when the container starts; `VITE_HOST_URI` is gone |
| WES service built into the code | TES and WES services from the Cloud Registry (`CLOUD_REGISTRY_URL`) |
| One LS Login client, built into the code, with the implicit flow in the browser | Login providers of `LOGIN_PROVIDERS` (see [Login](login.md)), with the authorization code flow and a client secret on Krini's server: register a client of your own |
| Image built per deployment | One image for all deployments, `docker.io/elixircloud/krini:<version>` |

Set all required settings of [Configuration](configuration.md#settings),
register Krini with the login provider (see [Registering Krini with LS
Login](login.md#registering-krini-with-ls-login)), point the port of your
service or route to `3000`, and set up the TES and WES services for Krini's
origin (see [Service configuration](deployment.md#service-configuration)
and [CORS configuration](deployment.md#cors-configuration)).
