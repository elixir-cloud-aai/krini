# Deployment

How to run the container image of Krini, pass it its settings, check it,
and prepare the Cloud Registry and the TES and WES services for it. On
Kubernetes or OpenShift, install Krini with the [Helm chart](helm-chart.md);
for the login provider, see [Login](login.md).

## Container image

### Branches and tags

`dev` is the default branch: all pull requests go into it, and CI runs on
pull requests into it and on pushes to it. `main` only moves forward to
released commits, and releases are made from `v*` tags (see
[Releasing](../development/releasing.md)). `dev` was formerly called `staging` (the
branch `dev-legacy` holds the older code, and `main` was called
`master`).

The Docker image of the `Dockerfile` is published to
`docker.io/elixircloud/krini`, by CI for pushes to `dev` and by the release
workflow for releases:

| Tag | Points to |
| --- | --- |
| `X.Y.Z` | The release `vX.Y.Z` (also pre-releases, e.g. `0.1.0-rc1`); never moved |
| `latest` | The highest stable release (no `-alphaN`, `-betaN` or `-rcN`) |
| `dev` | The newest commit that passed CI while it was the head of `dev` |
| `sha-<commit>` | That commit (full commit SHA) |

For deployments, use a release (`X.Y.Z`), and to be sure that the image
doesn't change under you, pin it by its digest, e.g.
`docker.io/elixircloud/krini:0.1.0@sha256:<digest>`; `docker buildx
imagetools inspect docker.io/elixircloud/krini:0.1.0` prints the digest.
`latest` moves with each release, so deployments that pull it may get
breaking changes without warning. `dev` and `sha-<commit>` images follow
the development branch: use them for testing only.

Images built before the rename carry the tag `staging`, which is no
longer updated: deployments that pull `krini:staging` must switch to
`krini:dev`.

The label `org.opencontainers.image.version` of a release image is its
version (e.g. `0.1.0`), and of the images of `dev`
`<version in package.json>-<branch>+<short commit SHA>`, e.g.
`0.1.0-dev+1a2b3c4`.

Only a commit that is still the head of its branch when its checks have
passed is tagged: when commits are pushed in quick succession, the earlier
ones get no tags, and the branch tag can lag behind the branch until the
run of its newest commit passes. CI never sets `latest`: that tag is
reserved for releases. Deployments pull these images and update themselves
(e.g. with their own CD); the repository doesn't deploy anywhere itself.

Before CI tags an image, the commit passes lint, unit tests, type check,
build, a dependency audit and the end-to-end tests on its build, and
exactly the pushed digest passes a smoke test (non-root, read-only root
file system), the end-to-end tests again, now on the image started as it
is deployed (against mock services), and a scan for known
vulnerabilities (Trivy, failing on fixable critical and high findings). CI then attests its build provenance and signs it
with Sigstore keyless signing. The image also carries an SBOM and
BuildKit provenance. The release workflow builds release images afresh from
the tagged commit, which must have passed CI on `dev`, and checks, scans,
attests and signs them in the same way before it tags them.

### Running the image

The image has no settings of its own: pass all environment variables of
[Configuration](configuration.md) when the container starts,
so that one image serves any deployment. For example:

```bash
docker run --rm -p 3000:3000 \
    --read-only --tmpfs /tmp \
    --env-file krini.env \
    docker.io/elixircloud/krini:0.1.0
```

`krini.env` holds the settings, outside the repository, e.g. for a
deployment at `https://krini.example.org` behind a reverse proxy that
terminates TLS and forwards to port 3000 (see [Login](login.md) for the
login providers):

```env
APP_ORIGIN=https://krini.example.org
CLOUD_REGISTRY_URL=https://registry.example.org/ga4gh/registry/v1
LOGIN_PROVIDERS=[{"id":"ls-login","name":"LS Login","logo":"/ls-login-grey-wide.jpg","issuer":"https://login.aai.lifescience-ri.eu/oidc/","clientId":"<client ID>","clientSecret":"<client secret>","scopes":["openid","profile","email","eduperson_entitlement","offline_access"],"groupsClaim":"eduperson_entitlement","computeGroups":["<compute group>"]}]
PRIVACY_CONTROLLER=Example Institute, Example Street 1, Example City
PRIVACY_CONTACT=privacy@example.org
```

Krini must be served over HTTPS at `APP_ORIGIN`: production builds, such
as the image, set `Secure` cookies, which browsers don't store over plain
HTTP (except for `localhost`). Krini doesn't terminate TLS itself; put a
reverse proxy, an ingress or a load balancer in front of it.

- The server listens on port `3000` (`PORT`) on all IPv4 interfaces; set
  `LISTEN_HOSTNAME` (e.g. `::` for IPv6) to change the interface.
- It runs as the non-root user `bun` (UID 1000) and can't change its own
  code.
- It works with a read-only root file system: only `/tmp` must be
  writable (e.g. an `emptyDir` volume in Kubernetes). Next.js caches, such
  as optimized images, go to `/tmp/next-cache`.
- The image has a health check that requests the start page on
  `127.0.0.1`; with a `LISTEN_HOSTNAME` that doesn't include the loopback
  interface, define your own health check (Kubernetes ignores the image's
  health check and uses its own probes).

### Verifying images

Check the signature and the build provenance of an image before deploying
it, e.g. with [cosign](https://docs.sigstore.dev/cosign/) and the
[GitHub CLI](https://cli.github.com/):

```bash
image=docker.io/elixircloud/krini:dev
cosign verify "${image}" \
    --certificate-identity-regexp '^https://github\.com/elixir-cloud-aai/krini/\.github/workflows/ci\.yml@refs/heads/dev$' \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com
gh attestation verify "oci://${image}" --repo elixir-cloud-aai/krini
```

This also verifies `sha-<commit>` tags of images built since the rename;
for images built before it (the tag `staging` and their `sha-<commit>`
tags), use `refs/heads/staging$` instead, or `refs/heads/(staging|dev)$`
for any `sha-<commit>` tag. Release images are signed by the release
workflow for their tag, e.g. for `0.1.0`:

```bash
image=docker.io/elixircloud/krini:0.1.0
cosign verify "${image}" \
    --certificate-identity 'https://github.com/elixir-cloud-aai/krini/.github/workflows/release.yml@refs/tags/v0.1.0' \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com
gh attestation verify "oci://${image}" --repo elixir-cloud-aai/krini
```

### Checking a deployment

After starting Krini, or changing its settings, open these pages at
`APP_ORIGIN`; each one checks a part of the configuration:

1. `/privacy`: the privacy notice names the controller and contact of
   `PRIVACY_*`. The page needs no login and no other service; the Helm
   chart's probes use it.
2. `/auth/login`: one button per login provider. No buttons means that
   `LOGIN_PROVIDERS` is missing or isn't a valid JSON array, and a missing
   button that its provider lacks a required field (see [Login
   providers](login.md#login-providers)).
3. Log in: the provider asks for consent and sends you back to Krini. An
   error of the provider about the redirect URI means that the URI isn't
   registered (see [Registering Krini with LS
   Login](login.md#registering-krini-with-ls-login)). Krini's error page
   after the login means that `APP_ORIGIN` or `OIDC_REDIRECT_URI` don't
   match the address that you opened, or that the provider's discovery
   document, token response or ID token failed Krini's checks.
4. The user menu in the sidebar shows your tier: "Compute" or "Admin" if
   your groups are among `computeGroups` or `adminGroups` (see [Access
   tiers](login.md#access-tiers)).
5. **Tasks** and **Workflows** list the TES and WES services of the
   registry. An error means that `CLOUD_REGISTRY_URL` is wrong or that the
   registry can't be reached from Krini's server; a missing service means
   that its entry doesn't meet the conditions of [Cloud
   Registry](#cloud-registry).
6. Select a service and list its tasks or runs: an error in the browser's console
   that mentions CORS means that the service doesn't allow Krini's origin
   (see [CORS configuration](#cors-configuration)), and `401` or `403`
   that it doesn't accept the token (see [TES and WES
   services](#tes-and-wes-services)).

### Building the image

To build the image yourself:

```bash
docker build -t krini .
```

The build uses no settings or `.env*` files (`.dockerignore` keeps them out
of the build context). The Bun version of both stages of the `Dockerfile`
must match `packageManager` in `package.json`, pinned by digest; CI checks
this.

### Publishing from a fork

To publish images from a fork or for another organization, the
repository needs:

- the variable `DOCKERHUB_ORG`, the Docker Hub namespace (by default
  `elixircloud`), with a public repository `krini` in it, as the scan, the
  smoke test and the end-to-end tests pull the pushed digest without login;
- the environment `dev-images`, limited to the branch `dev`, with the
  secrets `DOCKERHUB_LOGIN` and `DOCKERHUB_TOKEN` (a token
  that can push to that repository). The name is kept from when only `dev`
  published images;
- for releases, the environment `release` with the same secrets (see
  [Releasing](../development/releasing.md#repository-settings)). Set `DOCKERHUB_ORG`
  before pushing a test tag, as the workflows fall back to `elixircloud`.

To verify such images, use the fork's repository in the
`--certificate-identity-regexp` of `cosign verify` and in the `--repo` of
`gh attestation verify`.

## Service configuration

Krini's server and the users' browsers contact different services. The
user's access token goes only to the TES and WES services (from the
browser) and to the login provider's user info endpoint (from Krini's
server), and only the TES and WES services need CORS settings for Krini:

| Service | Contacted by | Requests | Token | CORS for Krini |
| --- | --- | --- | --- | --- |
| Login provider | Browser (redirects) and Krini's server (discovery, keys, token, user info) | See [Login](login.md#how-the-login-works) | Yes, to the user info endpoint, from Krini's server | No |
| Cloud Registry | Krini's server | `GET /services` | No | No |
| WES services and gateways | Krini's server | `GET /service-info`, to list and check them | No | No |
| WES services and gateways | Browser | Service info (for the workflow form) and runs: list, submit, status, cancel | Yes | Yes |
| TES services and gateways | Browser | Tasks: list, create, get, cancel | Yes | Yes |

### Cloud Registry

Krini only reads the registry's list of services, without a token, so the
registry needs no client settings and no CORS settings for Krini. From
that list, Krini offers:

- **TES:** the entries of type `tes` and `tes-gateway` (the `artifact` of
  their `type`) with an `https` URL.
- **WES:** the entries of type `wes` and `wes-gateway` with an `https`
  URL whose service info (`GET <url>/service-info`) Krini's server can
  read without a token and without redirects. Entries whose service info
  isn't a JSON object, or that answer with a client error, aren't listed;
  entries that don't answer, or answer with a server error, are listed as
  unreachable. Krini keeps the list for a minute. The page with a
  service's info accepts only URLs without a port and with a path that
  ends with `/ga4gh/wes/v1`, e.g. `https://wes.example.org/ga4gh/wes/v1`.

The URL of an entry must be the base URL of the API, as in the GA4GH
service registry, e.g. `https://tes.example.org/ga4gh/tes/v1`: Krini
appends the API paths (e.g. `/tasks`) to it.

!!! warning "Only trusted services in the registry"
    Krini sends the token to every TES and WES service of the registry that
    a user selects. Use a registry in which only administrators can
    register services (in the Cloud Registry, remove the
    `register-services` policy for regular users), so that nobody can add
    a service that collects tokens. Filtering the list to verified
    services in Krini is planned
    ([krini#40](https://github.com/elixir-cloud-aai/krini/issues/40)).

### TES and WES services

The browser sends the user's access token to the selected service, in an
`Authorization: Bearer` header. For the services to accept it:

- The login provider must issue access tokens as JWTs ([RFC
  9068](https://datatracker.ietf.org/doc/html/rfc9068)), not opaque
  tokens, and the services must trust the provider's issuer.
- The services must accept tokens issued to Krini's `clientId` of each
  login provider, e.g. by adding it to the clients or audiences that their
  authorization settings allow. Give the client IDs to the operators of
  the services; they aren't secret.
- If the services authorize by group, the token or the user info must
  carry the groups, e.g. `eduperson_entitlement` of LS Login (see
  [Registering Krini with LS
  Login](login.md#registering-krini-with-ls-login)).

## CORS configuration

The browser calls the TES and WES services, and their gateways, directly
from Krini's pages, so each of them must allow Krini's origin
(`APP_ORIGIN`) in its CORS settings. The Cloud Registry and the login
providers don't need to (see [Service
configuration](#service-configuration)).

### Required CORS headers

The requests carry the token in the `Authorization` header and, when
creating a TES task, a JSON body (`Content-Type: application/json`), so
browsers send a preflight request (`OPTIONS`) first. They send no cookies
to the services. Krini's requests use only `GET` and `POST`:

- TES: `GET /tasks`, `GET /tasks/{id}`, `POST /tasks`,
  `POST /tasks/{id}:cancel`
- WES: `GET /service-info`, `GET /runs`, `GET /runs/{id}`,
  `GET /runs/{id}/status`, `POST /runs` (multipart form data),
  `POST /runs/{id}/cancel`

The services must answer the preflight requests with these headers, and
all other responses, errors such as `401` included, at least with
`Access-Control-Allow-Origin`:

```text
Access-Control-Allow-Origin: https://krini.example.org
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

Use Krini's exact origin, without a trailing slash. Krini doesn't need
`Access-Control-Allow-Credentials`, as it sends no cookies to the
services. Without `Access-Control-Allow-Origin` on an error response, the
browser hides the error, and Krini can only report a failed request.

### Configuration example

For an Nginx reverse proxy in front of a service that sets no CORS headers
itself:

```nginx
location / {
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://krini.example.org' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
        add_header 'Access-Control-Max-Age' '600' always;
        return 204;
    }
    add_header 'Access-Control-Allow-Origin' 'https://krini.example.org' always;

    proxy_pass http://backend;
}
```

If the service sets CORS headers itself, configure them there instead of
in the proxy: browsers reject responses with two
`Access-Control-Allow-Origin` headers. For services built with Flask and
[Flask-CORS](https://flask-cors.readthedocs.io/), the same settings are:

```python
CORS(
    app,
    origins=["https://krini.example.org"],
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
```

### Multiple origins

To allow several Krini deployments (e.g. a test and a production
deployment), list all their origins in the service's CORS settings. The
header holds only one origin, so the service (or the proxy) must answer
with the origin of the request if it is in the list, together with
`Vary: Origin`. In Nginx, e.g. with a `map` in the `http` block:

```nginx
map $http_origin $krini_cors_origin {
    default "";
    "https://krini.example.org" $http_origin;
    "https://krini-test.example.org" $http_origin;
}
```

Then use `$krini_cors_origin` instead of the fixed origin in the example
above, and add `add_header 'Vary' 'Origin' always;` next to it.

## Network access

Krini's server needs outgoing HTTPS connections to:

- the Cloud Registry (`CLOUD_REGISTRY_URL`);
- each login provider's issuer and the endpoints of its discovery document
  (token, user info, keys);
- the WES services and gateways of the registry (service info).

The users' browsers need to reach Krini, the login providers, and the TES
and WES services. Krini serves all its scripts itself, including the
workers of the code editor, so browsers need no CDN.

## Environment variables

The Docker image contains no env files (`.dockerignore` excludes them) and
its build takes no settings. Pass the settings of
[Configuration](configuration.md) to the container when it starts, as
environment variables, for example:

- Docker: `docker run --env-file krini.env ...`, with `krini.env` kept outside the repository and the build context. Docker reads plain `KEY=value` lines and doesn't strip quotes, so write `PRIVACY_CONTROLLER=Example Institute, Example City`, not `PRIVACY_CONTROLLER="..."`.
- Kubernetes or OpenShift: install the [Helm chart](helm-chart.md), which passes the settings of its values to the container and `LOGIN_PROVIDERS` (it contains each provider's `clientSecret`) from a `Secret` of your own. Without the chart, use a `ConfigMap` for the non-secret settings and a `Secret` for `LOGIN_PROVIDERS`, referenced with `envFrom` or `env[].valueFrom` in the deployment.

Changing a setting needs a restart, not a new image; which settings reach
the browser is described in [Configuration](configuration.md#settings).

### Production considerations

- Cookies get the `Secure` flag in production builds (`next build`, as in the Docker image); `NODE_ENV` is fixed when the app is built, so setting it at runtime changes nothing
- Use HTTPS for all production deployments
- Configure `APP_ORIGIN` to your production domain
- Store `LOGIN_PROVIDERS` securely (e.g., using a secrets manager) — it contains the providers' `clientSecret` values
- Rotate credentials regularly
- Set the `PRIVACY_*` variables (see [Privacy notice](configuration.md#privacy-notice)), so that the privacy notice at `/privacy` names who is responsible and how to reach them.
- The notice's text is the same for every deployment. It describes what Krini itself does. Put anything specific to your deployment (purposes, legal basis, retention, rights) into your own notice and link it with `PRIVACY_NOTICE_URL`.
- Krini sets no cookies for visitors, unless they start a login or change the sidebar. Its cookies are listed in the notice, with their lifetimes. All except the sidebar setting are strictly necessary. Krini has no analytics, so it needs no consent banner. Krini's server reads the registry and checks the registered WES services, without user data. Browsers contact the selected TES and WES services directly; the notice says so. If you add anything that sets other cookies or tracks users, update the notice and add consent.

## Security headers

Krini sends these headers with its responses, so they need no
configuration:

| Header | Value | Effect |
| --- | --- | --- |
| `Content-Security-Policy` | see below; pages and API routes only | Limits where scripts, styles, workers and connections may come from |
| `X-Frame-Options` | `DENY` | No other site may embed Krini in a frame (for browsers without `frame-ancestors`) |
| `X-Content-Type-Options` | `nosniff` | Browsers use files only as their declared type |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Other origins (TES and WES services, login providers) see only Krini's origin, not the page's path |
| `Strict-Transport-Security` | `max-age=63072000` | Browsers use only HTTPS for Krini's host, on every port, for two years after a visit over HTTPS; ignored over plain HTTP; not sent by `next dev` |

Krini doesn't send `X-Powered-By`.

The Content Security Policy:

```text
default-src 'self'; script-src 'self' 'nonce-<new for each response>' 'strict-dynamic';
style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; font-src 'self';
connect-src 'self' https:; worker-src 'self'; object-src 'none'; base-uri 'self';
form-action 'self'; frame-ancestors 'none'
```

- **Scripts** run only if they carry the response's nonce, which Next.js
  adds to its own, or if such a script loads them. No script comes from
  another origin, so neither an inline script injected into a page nor a
  compromised CDN can run code that reads the access token from
  `/auth/api/token`. The workers of the
  code editor (from `ace-builds`, copied to `public/ace/` when the app is
  built) come from Krini too.
- **Connections** may go to any `https:` origin, as browsers call the TES
  and WES services of the registry, which are known only at runtime.
- **Images** may come from any `https:` origin, for the logos of the
  login providers (`logo` may be an `https` URL, see
  [Login](login.md#login-providers)).
- **Styles** may be inline, as React and the Cloud Components set them at
  runtime.
- **Frames:** no site may embed Krini (`frame-ancestors 'none'`).
- **Development:** `next dev` adds `'unsafe-eval'` to `script-src` (for its
  error overlay) and `ws:` `wss:` to `connect-src` (for its hot reload).
  Production builds don't.

As each response gets its own nonce, all pages are rendered when they are
requested, none at build time.

The headers come from the app: `src/proxy.ts` sends the policy, and
`headers()` in `next.config.ts` the others. A reverse proxy or ingress in
front of Krini needs to add none of them, and must not replace the
`Content-Security-Policy` header, whose nonce must match the page. If it
sets its own `Strict-Transport-Security` (e.g. with `includeSubDomains`),
make sure it doesn't send the header twice. Krini's HSTS header binds the
whole host to HTTPS: don't serve Krini on a host that also serves other
services over plain HTTP.

## Security recommendations

1. **HTTPS only**: Always deploy Krini behind HTTPS in production
2. **Secure cookies**: Production builds set the `Secure` flag on cookies automatically
3. **Secret management**: Never commit `.env.local` or other env files (only `.env.example` belongs in the repository), never copy them into an image, and never expose secrets in client-side code
4. **Origin validation**: The logout endpoint validates requests against `APP_ORIGIN` to prevent CSRF
5. **Token refresh**: The `offline_access` scope enables silent token renewal, improving user experience
6. **CORS restrictions**: Configure CORS to only allow trusted origins
