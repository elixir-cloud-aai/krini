# Deployment

How to run the container image of Krini, pass it its settings, and prepare
the login provider and the TES and WES services for it.

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

For deployments, prefer a release (`X.Y.Z`); `dev` follows the
development branch.

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
build, a dependency audit and the end-to-end tests, and exactly the
pushed digest passes a smoke test (non-root, read-only root file system)
and a scan for known vulnerabilities (Trivy, failing on fixable critical
and high findings). CI then attests its build provenance and signs it
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
    docker.io/elixircloud/krini:dev
```

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
  `elixircloud`), with a public repository `krini` in it, as the scan and
  the smoke test pull the pushed digest without login;
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

For Krini to authenticate with WES services, the login provider and the
services need the following configuration. Krini doesn't send tokens to
TES services yet
([krini#44](https://github.com/elixir-cloud-aai/krini/issues/44)); the same
requirements will apply to them then.

### Scopes

Ensure your OIDC provider is configured to support the following scopes:

- `openid`: Required for OpenID Connect authentication
- `profile`: Access to user profile information
- `email`: Access to user email
- `offline_access`: Required for refresh token support

### Token type

The OIDC provider must issue access tokens as JWT (JSON Web Tokens) per
[RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068), not opaque
tokens: TES and WES services expect JWT access tokens for authentication.

### Client allowlisting

TES and WES services must allowlist Krini's `OIDC_CLIENT_ID` in their
authorization configuration: only allowlisted clients can use their access
tokens to authenticate with these services.

## CORS configuration

Krini makes direct requests to WES (Workflow Execution Service) and TES (Task Execution Service) endpoints from the browser. You must configure CORS on your WES and TES services to allow requests from Krini's origin.

### Required CORS headers

Your WES and TES services must return the following CORS headers for requests from Krini:

```
Access-Control-Allow-Origin: https://your-krini-domain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Credentials: true
```

### Configuration example

For Nginx reverse proxy configurations:

```nginx
location / {
    add_header 'Access-Control-Allow-Origin' 'https://your-krini-domain.com' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;

    if ($request_method = 'OPTIONS') {
        return 204;
    }

    proxy_pass http://backend;
}
```

For application-level CORS configuration (e.g., Express.js):

```javascript
app.use(cors({
    origin: 'https://your-krini-domain.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true
}));
```

### Multiple origins

If you need to support multiple Krini deployments (e.g., staging and production), configure your CORS to allow specific origins:

```javascript
const allowedOrigins = [
    'https://krini-staging.example.com',
    'https://krini.example.com'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
```

## Environment variables

The Docker image contains no env files (`.dockerignore` excludes them) and
its build takes no settings. Pass the settings of
[Configuration](configuration.md) to the container when it starts, as
environment variables, for example:

- Docker: `docker run --env-file krini.env ...`, with `krini.env` kept outside the repository and the build context. Docker reads plain `KEY=value` lines and doesn't strip quotes, so write `PRIVACY_CONTROLLER=Example Institute, Example City`, not `PRIVACY_CONTROLLER="..."`.
- Kubernetes or OpenShift: a `ConfigMap` for the non-secret settings and a `Secret` for `OIDC_CLIENT_SECRET`, referenced with `envFrom` or `env[].valueFrom` in the deployment.

Changing a setting needs a restart, not a new image; which settings reach
the browser is described in [Configuration](configuration.md#settings).

### Production considerations

- Cookies get the `Secure` flag in production builds (`next build`, as in the Docker image); `NODE_ENV` is fixed when the app is built, so setting it at runtime changes nothing
- Use HTTPS for all production deployments
- Configure `APP_ORIGIN` to your production domain
- Store `OIDC_CLIENT_SECRET` securely (e.g., using a secrets manager)
- Rotate credentials regularly
- Set the `PRIVACY_*` variables (see [Privacy notice](configuration.md#privacy-notice)), so that the privacy notice at `/privacy` names who is responsible and how to reach them.
- The notice's text is the same for every deployment. It describes what Krini itself does. Put anything specific to your deployment (purposes, legal basis, retention, rights) into your own notice and link it with `PRIVACY_NOTICE_URL`.
- Krini sets no cookies for visitors, unless they start a login or change the sidebar. Its cookies are listed in the notice, with their lifetimes. All except the sidebar setting are strictly necessary. Krini has no analytics, so it needs no consent banner. Krini's server reads the registry and checks the registered WES services, without user data. Browsers contact the selected TES and WES services directly, and the code editor of the workflow form loads a helper script from cdn.jsdelivr.net (from the Cloud Components); the notice says so. If you add anything that sets other cookies or tracks users, update the notice and add consent.

## Security recommendations

1. **HTTPS only**: Always deploy Krini behind HTTPS in production
2. **Secure cookies**: Production builds set the `Secure` flag on cookies automatically
3. **Secret management**: Never commit `.env.local` or other env files (only `.env.example` belongs in the repository), never copy them into an image, and never expose secrets in client-side code
4. **Origin validation**: The logout endpoint validates requests against `APP_ORIGIN` to prevent CSRF
5. **Token refresh**: The `offline_access` scope enables silent token renewal, improving user experience
6. **CORS restrictions**: Configure CORS to only allow trusted origins
