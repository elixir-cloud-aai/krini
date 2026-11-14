# Configuration

Krini reads all its settings from environment variables on the server, when
it starts; the build takes none, so one image serves every deployment.
Changing a setting needs a restart, not a new image. See
[Deployment](deployment.md#environment-variables) for how to pass them to the
container, and [Development](../development/index.md#environment-variables)
for local development with `.env.local`.

## Settings

An example with all settings, as in `.env.example`:

```env
# LS Login / OpenID Connect
LS_LOGIN_URL=https://login.elixir-europe.org
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=http://localhost:3000/auth/api/callback
OIDC_SCOPE=openid profile email offline_access

# Cloud Registry
CLOUD_REGISTRY_URL=https://registry.elixir-cloud.dev

# Application
APP_ORIGIN=http://localhost:3000

# Privacy notice (optional)
PRIVACY_CONTROLLER="Example Institute, Example Street 1, Example City"
PRIVACY_CONTACT=privacy@example.org
PRIVACY_NOTICE_URL=https://example.org/privacy
PRIVACY_LOGIN_NOTICE_URL=https://login.example.org/privacy
```

- `LS_LOGIN_URL`: Base URL of the LS Login identity provider.
- `OIDC_CLIENT_ID`: Client ID registered with LS Login.
- `OIDC_CLIENT_SECRET`: Client secret associated with the OIDC client. Keep
  this private.
- `OIDC_REDIRECT_URI`: Callback URL registered with your LS Login client. It
  must match the redirect URI configured with the identity provider.
- `OIDC_SCOPE`: OAuth 2.0 scopes to request from the identity provider. Must
  include `offline_access` for refresh token support. Default:
  `openid profile email offline_access`.
- `CLOUD_REGISTRY_URL`: Base URL of the Cloud Registry API.
- `APP_ORIGIN`: Origin of your application (e.g., `http://localhost:3000`
  for local development or your production URL).

Make sure the OIDC client has the redirect URI of `OIDC_REDIRECT_URI`
registered, e.g. for local development:

```text
http://localhost:3000/auth/api/callback
```

Never expose `OIDC_CLIENT_SECRET` to client-side code: Krini uses no
`NEXT_PUBLIC_*` variables, and only its server sends the secret to the login
provider.

## Privacy notice

Krini serves a privacy notice at `/privacy`, linked from the login page and
the sidebar and reachable without login. It describes what Krini processes,
lists its cookies, and says what happens at the login provider and the
services. The text is the same for every deployment. Each deployment adds
who is responsible and can link its own full notice. All four settings are
optional and read at runtime. Invalid values are ignored, with a warning in
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
