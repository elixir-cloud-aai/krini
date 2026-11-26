# Configuration

Krini reads all its settings from environment variables on the server, when
it starts; the build takes none, so one image serves every deployment.
Changing a setting needs a restart, not a new image. See
[Deployment](deployment.md#environment-variables) for how to pass them to the
container, and [Development](../development/index.md#environment-variables)
for local development with `.env.local`.

## Settings

These are all the settings that Krini reads at runtime; none of them is
built into the image or into the JavaScript that the browser loads (Krini
has no `NEXT_PUBLIC_*` variables):

| Variable | Required | Format | Default | Example |
| --- | --- | --- | --- | --- |
| `LOGIN_PROVIDERS` | yes | JSON array of login providers, on one line (see [Login](login.md#login-providers)); holds the client secrets | none: no login | `[{"id":"example","issuer":"https://login.example.org/oidc","clientId":"<client ID>","clientSecret":"<client secret>"}]` |
| `APP_ORIGIN` | yes | Origin at which browsers reach Krini: scheme, host and port if not the default, without path or trailing slash | none | `https://krini.example.org` |
| `CLOUD_REGISTRY_URL` | yes | Base URL of the registry's API, to which Krini appends `/services`; no query or fragment | none | `https://registry.example.org/ga4gh/registry/v1` |
| `REDIRECT_TO_APP_ORIGIN` | no | `true` or `false` | `true`: requests at other hosts are redirected to `APP_ORIGIN` | `false` |
| `OIDC_REDIRECT_URI` | no | URL of `/auth/api/callback` at `APP_ORIGIN` | `<APP_ORIGIN>/auth/api/callback` | `https://krini.example.org/auth/api/callback` |
| `COMPUTE_ACCESS_REQUEST_URL` | no | URL | none: no link | `https://example.org/compute-access` |
| `PRIVACY_CONTROLLER` | no | Text | none | `Example Institute, Example Street 1, Example City` |
| `PRIVACY_CONTACT` | no | Email address or `https` URL | none | `privacy@example.org` |
| `PRIVACY_NOTICE_URL` | no | `https` URL | none | `https://example.org/privacy` |
| `PRIVACY_LOGIN_NOTICE_URL` | no | `https` URL | none | `https://login.example.org/privacy` |
| `PORT` | no | Port number | `3000` | `8080` |
| `LISTEN_HOSTNAME` | no | Address of the interface to listen on | `0.0.0.0` (all IPv4 interfaces) | `::` |

`PORT` and `LISTEN_HOSTNAME` are settings of the image's server (see
[Running the image](deployment.md#running-the-image)); the login providers
are described in [Login](login.md), the others below.

Krini checks its settings when it starts (see `src/lib/settings.ts`):
a missing `LOGIN_PROVIDERS`, `APP_ORIGIN` or `CLOUD_REGISTRY_URL`, or an
invalid `OIDC_REDIRECT_URI`, is logged with the reason and Krini refuses
to start; `LOGIN_PROVIDERS` without a single usable provider counts as
missing. In production `APP_ORIGIN` must be `https` — `http` is accepted
only for localhost, as Secure session cookies need https. Problems of single provider entries — a missing field, a
duplicate `id`, an entry that isn't an object — are logged too, as
warnings when another provider is usable, naming the provider `id` and
the missing field, never `clientSecret`. Other warnings — an invalid
`COMPUTE_ACCESS_REQUEST_URL`, or no provider with
`computeGroups`/`adminGroups` — are logged but don't stop the start.
After each change, still go through
[Checking a deployment](deployment.md#checking-a-deployment).

An example with all settings of `.env.example`, in a format that both
`.env.local` and `docker run --env-file` accept. Don't quote values: Docker
keeps quotes as part of the value (see
[Deployment](deployment.md#environment-variables)):

```env
# Login providers: a JSON array; each entry configures one OIDC provider
# (endpoints are discovered via <issuer>/.well-known/openid-configuration)
# One line only: env files can't carry a multiline value
LOGIN_PROVIDERS=[{"id":"example-login","name":"Example Login","logo":"https://login.example.org/logo.png","issuer":"issuer-url","clientId":"your-client-id","clientSecret":"your-client-secret","scopes":["openid","profile","email","groups","offline_access"],"groupsClaim":"groups","computeGroups":["your-compute-group"],"adminGroups":["your-admin-group"]}]

# Optional override of the callback URL (default: <APP_ORIGIN>/auth/api/callback)
OIDC_REDIRECT_URI=http://localhost:3000/auth/api/callback

# Where users without compute access can request it (shown in the UI)
COMPUTE_ACCESS_REQUEST_URL=

# Cloud Registry
CLOUD_REGISTRY_URL=https://registry.example.org/ga4gh/registry/v1

# Application
APP_ORIGIN=http://localhost:3000
# Redirect requests at other hosts to APP_ORIGIN (default: true)
REDIRECT_TO_APP_ORIGIN=true

# Privacy notice (optional)
PRIVACY_CONTROLLER=Example Institute, Example Street 1, Example City
PRIVACY_CONTACT=privacy@example.org
PRIVACY_NOTICE_URL=https://example.org/privacy
PRIVACY_LOGIN_NOTICE_URL=https://login.example.org/privacy
```

- `LOGIN_PROVIDERS`: the OpenID Connect providers that users log in with,
  with Krini's client at each, and the groups of the access tiers: see
  [Login](login.md). Set `computeGroups` or `adminGroups`: without them,
  nobody can run tasks or workflows (see [Access
  tiers](login.md#access-tiers)).
- `OIDC_REDIRECT_URI`: Callback URL registered with the identity provider.
  Must match a redirect URI configured there, and must use the same origin
  as `APP_ORIGIN` — the session cookies are set for that origin, so a
  cross-origin callback is rejected. Defaults to
  `<APP_ORIGIN>/auth/api/callback`.
- `COMPUTE_ACCESS_REQUEST_URL`: Optional URL shown to logged-in users
  without compute access ("Request compute access").
- `CLOUD_REGISTRY_URL`: Base URL of the API of the [Cloud
  Registry](https://cloud-registry.readthedocs.io/en/latest/), or of
  another GA4GH Service Registry, e.g.
  `https://registry.example.org/ga4gh/registry/v1`. Krini's server reads
  its list of services (`GET <CLOUD_REGISTRY_URL>/services`) without a
  token; the browser doesn't contact the registry (see [Service
  configuration](deployment.md#service-configuration)).
- `APP_ORIGIN`: Origin of your application (e.g., `http://localhost:3000`
  for local development or your production URL), as users' browsers reach
  it. The login sends users back to it, and the session refresh and the
  logout accept requests only from it.
- `REDIRECT_TO_APP_ORIGIN`: Whether Krini redirects requests that reach it
  at another host than that of `APP_ORIGIN` (e.g., an old address kept for
  existing links) to the same path and query at `APP_ORIGIN`, with a
  permanent redirect (`308`). On by default when `APP_ORIGIN` is set;
  `false` switches it off. Requests at internal addresses, as health
  checks use them, are never redirected. See [Several
  addresses](deployment.md#several-addresses).

Make sure each OIDC client has the redirect URI of `OIDC_REDIRECT_URI`
registered, e.g. for local development:

```text
http://localhost:3000/auth/api/callback
```

Never expose `clientSecret` values to client-side code: Krini uses no
`NEXT_PUBLIC_*` variables, so no setting is built into the JavaScript that
the browser loads; never put a secret into one. Some settings are public by
design and do reach the browser: the login page shows each provider's `id`,
`name` and `logo`, and the login redirect carries `clientId`, the redirect
URI and scopes, and the privacy notice shows the `PRIVACY_*` values.
`clientSecret` is only sent from Krini's server to the login provider.

## Privacy notice

Krini serves a privacy notice at `/privacy`, linked from the login page and
the sidebar and reachable without login. It describes what Krini processes,
lists its cookies, and says what happens at the login provider and the
services. The text is the same for every deployment. Each deployment adds
who is responsible and can link its own full notice; without these
settings, the page says that the operator hasn't named anyone. All four
settings are optional and read at runtime. Invalid values are ignored, with a warning in
the server log.

- `PRIVACY_CONTROLLER`: Name and address of the operator who is responsible
  for the processing (the controller).
- `PRIVACY_CONTACT`: The controller's contact for privacy questions: an email
  address or an `https` URL.
- `PRIVACY_NOTICE_URL`: `https` URL of the deployment's full privacy notice,
  if it has one.
- `PRIVACY_LOGIN_NOTICE_URL`: `https` URL of the login provider's privacy
  notice.

## Env files

`.env.example` is the only env file in the repository; Git and the Docker
build ignore all others, and CI fails if another one is committed or isn't
excluded from the Docker build context. Don't commit `.env.local`. In
production, pass the settings to the container when it starts (see
[Deployment](deployment.md#environment-variables)).
