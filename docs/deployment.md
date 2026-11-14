# Deployment Guide

This guide covers configuration requirements for deploying Krini in production environments.

## Container Image

CI publishes the Docker image of the `Dockerfile` to
`docker.io/elixircloud/krini` for pushes to `staging` and `dev`:

| Tag | Points to |
| --- | --- |
| `staging` | The newest commit that passed CI while it was the head of `staging` |
| `dev` | The newest commit that passed CI while it was the head of `dev` |
| `sha-<commit>` | That commit (full commit SHA); for a commit on both branches, the image published first |

The label `org.opencontainers.image.version` of each image is
`<version in package.json>-<branch>+<short commit SHA>`, e.g.
`0.1.0-staging+1a2b3c4`.

Only a commit that is still the head of its branch when its checks have
passed is tagged: when commits are pushed in quick succession, the earlier
ones get no tags, and the branch tag can lag behind the branch until the
run of its newest commit passes. CI never sets `latest`: that tag is
reserved for releases. Deployments pull these images and update themselves
(e.g. with their own CD); the repository doesn't deploy anywhere itself.

Before CI tags an image, the commit passes lint, type check, build and a
dependency audit, and exactly the pushed digest passes a smoke test
(non-root, read-only root file system) and a scan for known
vulnerabilities (Trivy, failing on fixable critical and high findings).
CI then attests its build provenance and signs it with Sigstore keyless
signing. The image also carries an SBOM and BuildKit provenance.

### Running the Image

The image has no settings of its own: pass all environment variables of
the [README](../README.md#environment-variables) when the container starts,
so that one image serves any deployment. For example:

```bash
docker run --rm -p 3000:3000 \
    --read-only --tmpfs /tmp \
    --env-file krini.env \
    docker.io/elixircloud/krini:staging
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

### Verifying Images

Check the signature and the build provenance of an image before deploying
it, e.g. with [cosign](https://docs.sigstore.dev/cosign/) and the
[GitHub CLI](https://cli.github.com/):

```bash
image=docker.io/elixircloud/krini:staging
cosign verify "${image}" \
    --certificate-identity-regexp '^https://github\.com/elixir-cloud-aai/krini/\.github/workflows/ci\.yml@refs/heads/staging$' \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com
gh attestation verify "oci://${image}" --repo elixir-cloud-aai/krini
```

For the tag `dev`, use `refs/heads/dev$` in the regular expression; for a
`sha-<commit>` tag, `refs/heads/(staging|dev)$`.

### Building the Image

To build the image yourself:

```bash
docker build -t krini .
```

The build uses no settings or `.env*` files (`.dockerignore` keeps them out
of the build context). The Bun version of both stages of the `Dockerfile`
must match `packageManager` in `package.json`, pinned by digest; CI checks
this.

### Publishing from a Fork

To publish images from a fork or for another organization, the
repository needs:

- the variable `DOCKERHUB_ORG`, the Docker Hub namespace (by default
  `elixircloud`), with a public repository `krini` in it, as the scan and
  the smoke test pull the pushed digest without login;
- the environment `dev-images`, limited to the branches `staging` and
  `dev`, with the secrets `DOCKERHUB_LOGIN` and `DOCKERHUB_TOKEN` (a token
  that can push to that repository). The name is kept from when only `dev`
  published images.

To verify such images, use the fork's repository in the
`--certificate-identity-regexp` of `cosign verify` and in the `--repo` of
`gh attestation verify`.

## Service Configuration

For Krini to authenticate with TES and WES services, the following service-side configuration is required:

### OIDC Client Allowlisting

- TES services must allowlist the `clientId` of each `LOGIN_PROVIDERS` entry in their authorization configuration
- WES services must allowlist the `clientId` of each `LOGIN_PROVIDERS` entry in their authorization configuration
- Only allowlisted clients can use their access tokens to authenticate with these services

### RFC 9068 Token Type

- The OIDC provider must issue access tokens as JWT (JSON Web Tokens) per [RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068)
- TES and WES services expect JWT access tokens for authentication
- Ensure your OIDC provider is configured to return JWT access tokens (not opaque tokens)

## CORS Configuration

Krini makes direct requests to WES (Workflow Execution Service) and TES (Task Execution Service) endpoints from the browser. You must configure CORS on your WES and TES services to allow requests from Krini's origin.

### Required CORS Headers

Your WES and TES services must return the following CORS headers for requests from Krini:

```
Access-Control-Allow-Origin: https://your-krini-domain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Allow-Credentials: true
```

### Configuration Example

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

### Multiple Origins

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

## OIDC Provider Configuration

Krini works with any OpenID Connect providers, configured in the `LOGIN_PROVIDERS` environment variable as a JSON array — one entry per provider. Each entry supports `id`, `name`, `logo`, `issuer`, `clientId`, `clientSecret`, `scopes`, `groupsClaim`, `groupsFromUserinfo`, `computeGroups`, `adminGroups` and `groupSubgroupSeparator` (see `.env.example` for a complete example). Krini discovers the authorization, token, userinfo, JWKS and end-session endpoints from each `<issuer>/.well-known/openid-configuration`. There is no provider-specific configuration in the code; the login page offers one button per configured provider.

### Flow

Krini uses the Authorization Code flow with a confidential client (client secret stays on the server). PKCE (S256), `state` and `nonce` are used on every login, and the ID token is validated (issuer, audience, signature via JWKS, expiry, nonce) before a session starts. All session tokens live in `httpOnly` cookies whose lifetime follows the provider's `expires_in`.

### Scopes

Configure the scopes each provider requests via the `scopes` array of its `LOGIN_PROVIDERS` entry (default `["openid", "profile", "email", "offline_access"]`). `offline_access` is required for refresh token support. Add the scope that releases group entitlements if your provider gates them behind one.

### Access tiers

Krini derives a display tier — `user`, `compute` or `admin` — from the `groupsClaim` of each provider (read from userinfo or the ID token, per `groupsFromUserinfo`), matched against the provider's `computeGroups` and `adminGroups` (exact match, plus subgroup prefixes when `groupSubgroupSeparator` is set). Users in the compute or admin groups see run actions; other logged-in users see a "Request compute access" entry point (`COMPUTE_ACCESS_REQUEST_URL`). Tiers only control what the UI shows — the services themselves enforce access, so list Krini's `clientId` in the `audience` (or client allowlist) of every service that accepts its tokens (registry for writes, gateway, WES services).

### Token Type

The OIDC provider must be able to return a signed ID token (JWT) so Krini can validate it. TES and WES services expect JWT access tokens per [RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068) for authentication.

### Client Allowlisting

Configure your TES and WES services to allowlist the `clientId` of each `LOGIN_PROVIDERS` entry in their authorization configuration. Only allowlisted clients can use their access tokens to authenticate with these services.

## Environment Variables

For a complete list of required environment variables, see the main [README.md](../README.md#environment-variables).

Krini reads the settings listed in the README on the server, at runtime. The Docker image contains no env files (`.dockerignore` excludes them) and its build takes no settings, so one image works for every deployment. Pass the settings to the container when it starts, as environment variables, for example:

- Docker: `docker run --env-file krini.env ...`, with `krini.env` kept outside the repository and the build context. Docker reads plain `KEY=value` lines and doesn't strip quotes, so write `PRIVACY_CONTROLLER=Example Institute, Example City`, not `PRIVACY_CONTROLLER="..."`.
- Kubernetes or OpenShift: a `ConfigMap` for the non-secret settings and a `Secret` for `LOGIN_PROVIDERS` (it contains each provider's `clientSecret`), referenced with `envFrom` or `env[].valueFrom` in the deployment.

Changing a setting needs a restart, not a new image. Krini uses no `NEXT_PUBLIC_*` variables, so no setting is built into the JavaScript that the browser loads; never put a secret into one.

### Production Considerations

- Cookies get the `Secure` flag in production builds (`next build`, as in the Docker image); `NODE_ENV` is fixed when the app is built, so setting it at runtime changes nothing
- Use HTTPS for all production deployments
- Configure `APP_ORIGIN` to your production domain
- Store `LOGIN_PROVIDERS` securely (e.g., using a secrets manager) — it contains the providers' `clientSecret` values
- Rotate credentials regularly
- Set the `PRIVACY_*` variables (see the [README](../README.md#configuration)), so that the privacy notice at `/privacy` names who is responsible and how to reach them. Without them, the page says that the operator hasn't named anyone. They are read at runtime, so changing them needs a restart, not a new image. Values that aren't valid (e.g. a URL that isn't `https`) are ignored, with a warning in the server log.
- The notice's text is the same for every deployment. It describes what Krini itself does. Put anything specific to your deployment (purposes, legal basis, retention, rights) into your own notice and link it with `PRIVACY_NOTICE_URL`.
- Krini sets no cookies for visitors, unless they start a login or change the sidebar. Its cookies are listed in the notice, with their lifetimes. All except the sidebar setting are strictly necessary. Krini has no analytics, so it needs no consent banner. Krini's server reads the registry and checks the registered WES services, without user data. Browsers contact the selected TES and WES services directly, and the code editor of the workflow form loads a helper script from cdn.jsdelivr.net (from the Cloud Components); the notice says so. If you add anything that sets other cookies or tracks users, update the notice and add consent.

## Security Recommendations

1. **HTTPS Only**: Always deploy Krini behind HTTPS in production
2. **Secure Cookies**: Production builds set the `Secure` flag on cookies automatically
3. **Secret Management**: Never commit `.env.local` or other env files (only `.env.example` belongs in the repository), never copy them into an image, and never expose secrets in client-side code
4. **Origin Validation**: The logout endpoint validates requests against `APP_ORIGIN` to prevent CSRF
5. **Token Refresh**: the `offline_access` scope (when included in a provider's `scopes`) enables silent token renewal, improving user experience
6. **CORS Restrictions**: Configure CORS to only allow trusted origins
