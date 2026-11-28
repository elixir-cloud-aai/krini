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
| `TASK_EXAMPLES` | no | JSON array of examples of the task form, on one line (see [Examples](#examples)) | the built-in example; `[]`: none | `[{"name":"Hello","task":{"executors":[{"image":"alpine:3.22","command":["echo","hello"]}]}}]` |
| `WORKFLOW_EXAMPLES` | no | JSON array of examples of the workflow form, on one line (see [Examples](#examples)) | the built-in examples; `[]`: none | `[{"name":"CWL","run":{"workflow_url":"https://example.org/hello.cwl","workflow_type":"CWL","workflow_type_version":"v1.2"}}]` |
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
`COMPUTE_ACCESS_REQUEST_URL`, no provider with
`computeGroups`/`adminGroups`, or invalid `TASK_EXAMPLES` or
`WORKFLOW_EXAMPLES` — are logged but don't stop the start.
After each change, still go through
[Checking a deployment](deployment.md#checking-a-deployment).

An example with all settings of `.env.example`, in a format that both
`.env.local` and `docker run --env-file` accept. Don't quote values: Docker
keeps quotes as part of the value (see
[Deployment](deployment.md#environment-variables)):

```env
# Login providers: a JSON array; each entry configures one OIDC provider.
# Endpoints are discovered via <issuer>/.well-known/openid-configuration.
# Optional per-provider fields: name, logo, scopes (default
# ["openid","profile","email","offline_access"]), groupsClaim,
# groupsFromUserinfo (default true), computeGroups, adminGroups,
# groupSubgroupSeparator.
LOGIN_PROVIDERS=[{"id":"example-login","name":"Example Login","logo":"https://login.example.org/logo.png","issuer":"https://login.example.org/oidc/","clientId":"<client ID>","clientSecret":"<client secret>","scopes":["openid","profile","email","groups","offline_access"],"groupsClaim":"groups","computeGroups":["krini-compute"],"adminGroups":["krini-admins"]}]

# Optional override of the callback URL (default: <APP_ORIGIN>/auth/api/callback).
# Must use the same origin as APP_ORIGIN: the session cookies are set for it.
OIDC_REDIRECT_URI=

# Where users without compute access can request it (shown in the UI)
COMPUTE_ACCESS_REQUEST_URL=

CLOUD_REGISTRY_URL=https://registry.example.org/ga4gh/registry/v1
APP_ORIGIN=http://localhost:3000

# Redirect requests at other hosts than that of APP_ORIGIN to it (default:
# true; set to false to serve every host as is)
REDIRECT_TO_APP_ORIGIN=

# Privacy notice (optional): the operator, a contact, and links to the
# deployment's and the login provider's privacy notices
PRIVACY_CONTROLLER=
PRIVACY_CONTACT=
PRIVACY_NOTICE_URL=
PRIVACY_LOGIN_NOTICE_URL=
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
URI and scopes, the privacy notice shows the `PRIVACY_*` values, and the
task and workflow forms get `TASK_EXAMPLES` and `WORKFLOW_EXAMPLES`.
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

## Examples

Members (users with compute access) can fill the task and the workflow
form with an example in one click ("Use an example"), and submit it without
typing anything, e.g. in demonstrations and tutorials. Without settings,
Krini offers built-in examples that run on the services of ELIXIR On-Cloud
(proTES with TESK behind it for tasks, Conquest for workflows); see
[Examples](../user-guide/workflow-examples.md) for what they do.
Each deployment can replace them with its own:

- `TASK_EXAMPLES`: a JSON array of objects with `name` (the label of the
  button), optional `description` (its tooltip) and `task`, a
  [TES task](https://ga4gh.github.io/task-execution-schemas/docs/) with
  the fields that the task form has: `name`, `description`, `executors`
  (`image`, `command`, `workdir`, `stdin`, `stdout`, `stderr`, `env`,
  `ignore_error`), `inputs` (`url`, `path`, `type`, `content`), `outputs`
  (`url`, `path`, `path_prefix`, `type`), `resources`, `volumes` and
  `tags`, under the form's rules: absolute paths for `stdin`, `stdout`,
  `stderr` and the inputs' and outputs' `path`, a `url` or `content` for
  each input, a `path_prefix` for an output whose path has wildcards, and
  resources of at least 0.
- `WORKFLOW_EXAMPLES`: a JSON array of objects with `name`, optional
  `description` and `run`, a
  [WES run request](https://ga4gh.github.io/workflow-execution-service-schemas/docs/)
  with the fields that the workflow form has: `workflow_url`,
  `workflow_type`, `workflow_type_version`, `workflow_params`,
  `workflow_engine_parameters` and `tags` (no attachments). The form
  offers only the examples of the workflow types and versions that the
  selected service lists in its service info (the type matched regardless
  of case, and submitted as the service spells it), or all if it lists
  none; an example of a type for which the service lists no versions is
  offered whatever its version. The buttons wait until the form has
  loaded the service info, which would otherwise overwrite the example's
  type and version.

Names must be unique within a setting. An empty array (`[]`) offers no
examples. The examples reach the browser of anyone who can open the
forms' pages, also without logging in (the buttons show only with compute
access): put no secrets into them. Krini reads both settings at request
time and leaves out entries that don't fit the forms (a missing or unknown
field, a field of the wrong type, a broken rule, a line break in any field
other than the parameters, a duplicate name, white space that the form
would trim); a value that isn't a JSON array is ignored in favour of the
built-in examples. Both are logged as warnings when Krini starts. Make
sure that your examples run on the services that your registry lists.
For example, a task and a workflow on one line each:

```env
TASK_EXAMPLES=[{"name":"Hello world","description":"Prints a greeting","task":{"name":"hello","executors":[{"image":"alpine:3.22","command":["echo","Hello world"]}]}}]
WORKFLOW_EXAMPLES=[{"name":"Nextflow","run":{"workflow_url":"https://github.com/nextflow-io/hello","workflow_type":"NFL","workflow_type_version":"DSL2","workflow_engine_parameters":{"revision":"3c2cdc9823c2b4636e5e3e73e223878099ff5dc9"}}}]
```

The forms are Cloud Components without a public property for initial
values yet: Krini sets their internal state (see
`src/lib/example-forms.ts`). If a new version of the components doesn't
take it any more, "Use an example" shows an error instead of filling the
form, and Krini's end-to-end tests fail.

## Env files

`.env.example` is the only env file in the repository; Git and the Docker
build ignore all others, and CI fails if another one is committed or isn't
excluded from the Docker build context. Don't commit `.env.local`. In
production, pass the settings to the container when it starts (see
[Deployment](deployment.md#environment-variables)).
