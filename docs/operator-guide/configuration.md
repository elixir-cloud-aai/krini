# Configuration

Krini reads all its settings from environment variables on the server, when
it starts; the build takes none, so one image serves every deployment.
Changing a setting needs a restart, not a new image. See
[Deployment](deployment.md#environment-variables) for how to pass them to the
container, and [Development](../development/index.md#environment-variables)
for local development with `.env.local`.

## Settings

An example with all settings of `.env.example`, in a format that both
`.env.local` and `docker run --env-file` accept. Don't quote values: Docker
keeps quotes as part of the value (see
[Deployment](deployment.md#environment-variables)):

```env
# Login providers: a JSON array; each entry configures one OIDC provider
# (endpoints are discovered via <issuer>/.well-known/openid-configuration)
LOGIN_PROVIDERS=[
  {
    "id": "ls-login",
    "name": "LS Login",
    "logo": "/icon.jpg",
    "issuer": "issuer-url",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "scopes": [
      "openid",
      "profile",
      "email",
      "eduperson_entitlement"
    ],
    "groupsClaim": "eduperson_entitlement",
    "computeGroups": [
      "your-compute-group"
    ],
    "adminGroups": [
      "your-admin-group"
    ]
  }
]

# Optional override of the callback URL (default: <APP_ORIGIN>/auth/api/callback)
OIDC_REDIRECT_URI=http://localhost:3000/auth/api/callback

# Where users without compute access can request it (shown in the UI)
COMPUTE_ACCESS_REQUEST_URL=

# Cloud Registry
CLOUD_REGISTRY_URL=https://registry.elixir-cloud.dev

# Application
APP_ORIGIN=http://localhost:3000

# Privacy notice (optional)
PRIVACY_CONTROLLER=Example Institute, Example Street 1, Example City
PRIVACY_CONTACT=privacy@example.org
PRIVACY_NOTICE_URL=https://example.org/privacy
PRIVACY_LOGIN_NOTICE_URL=https://login.example.org/privacy
```

- `LOGIN_PROVIDERS`: JSON array of login provider configurations; Krini
  offers one login button per entry on `/auth/login`. Required fields per
  entry: `id` (unique), `issuer` (the provider's issuer URL; endpoints are
  discovered from its `/.well-known/openid-configuration`), `clientId` and
  `clientSecret`. Optional fields: `name` (button label, defaults to `id`),
  `logo` (image path for the button), `scopes` (default
  `openid profile email offline_access`; keep `offline_access` for refresh
  tokens), `groupsClaim`, `groupsFromUserinfo` (default `true`),
  `computeGroups`, `adminGroups`, `groupSubgroupSeparator`. Group membership
  derives the access tier: `adminGroups` → admin, `computeGroups` → compute,
  otherwise user; compute actions are limited to compute and admin tiers.
- `OIDC_REDIRECT_URI`: Callback URL registered with the identity provider.
  Must match a redirect URI configured there. Defaults to
  `<APP_ORIGIN>/auth/api/callback`.
- `COMPUTE_ACCESS_REQUEST_URL`: Optional URL shown to logged-in users
  without compute access ("Request compute access").
- `CLOUD_REGISTRY_URL`: Base URL of the Cloud Registry API.
- `APP_ORIGIN`: Origin of your application (e.g., `http://localhost:3000`
  for local development or your production URL), as users' browsers reach
  it. The login sends users back to it, and the logout accepts requests
  only from it.

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
