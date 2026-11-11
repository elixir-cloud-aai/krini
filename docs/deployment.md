# Deployment Guide

This guide covers configuration requirements for deploying Krini in production environments.

## Container Image

CI publishes the Docker image of the `Dockerfile` to
`docker.io/elixircloud/krini` for every push to `dev`:

| Tag | Points to |
| --- | --- |
| `dev` | The latest commit on `dev` |
| `sha-<commit>` | A given commit on `dev` (full commit SHA) |

CI never sets `latest`: that tag is reserved for releases. Deployments pull
these images and update themselves (e.g. with their own CD); the repository
doesn't deploy anywhere itself.

Before CI tags an image, it checks it (lint, type check, build, dependency
audit, a smoke test of the image), scans exactly the pushed digest for
known vulnerabilities (Trivy, failing on fixable critical and high
findings), attests its build provenance and signs it with Sigstore keyless
signing. The image also carries an SBOM and BuildKit provenance.

### Running the Image

The image has no settings of its own: pass all environment variables of
the [README](../README.md#environment-variables) when the container starts,
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
- The image has a health check that requests the start page.

### Verifying Images

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

### Building the Image

To build the image yourself:

```bash
docker build -t krini .
```

The build uses no settings or `.env*` files (`.dockerignore` keeps them out
of the build context). The Bun version of both stages of the `Dockerfile`
must match `packageManager` in `package.json`, pinned by digest; CI checks
this.

## Service Configuration

For Krini to authenticate with TES and WES services, the following service-side configuration is required:

### OIDC Client Allowlisting

- TES services must allowlist the `OIDC_CLIENT_ID` in their authorization configuration
- WES services must allowlist the `OIDC_CLIENT_ID` in their authorization configuration
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

### Scopes

Ensure your OIDC provider is configured to support the following scopes:

- `openid`: Required for OpenID Connect authentication
- `profile`: Access to user profile information
- `email`: Access to user email
- `offline_access`: Required for refresh token support

### Token Type

The OIDC provider must issue JWT (JSON Web Token) access tokens per [RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068). TES and WES services expect JWT tokens for authentication.

### Client Allowlisting

Configure your TES and WES services to allowlist Krini's `OIDC_CLIENT_ID` in their authorization configuration. Only allowlisted clients can use their access tokens to authenticate with these services.

## Environment Variables

For a complete list of required environment variables, see the main [README.md](../README.md#environment-variables).

### Production Considerations

- Set `NODE_ENV=production` to enable secure cookies
- Use HTTPS for all production deployments
- Configure `APP_ORIGIN` to your production domain
- Store `OIDC_CLIENT_SECRET` securely (e.g., using a secrets manager)
- Rotate credentials regularly

## Security Recommendations

1. **HTTPS Only**: Always deploy Krini behind HTTPS in production
2. **Secure Cookies**: Production deployments use `Secure` flag on cookies automatically when `NODE_ENV=production`
3. **Secret Management**: Never commit `.env.local` or expose secrets in client-side code
4. **Origin Validation**: The logout endpoint validates requests against `APP_ORIGIN` to prevent CSRF
5. **Token Refresh**: The `offline_access` scope enables silent token renewal, improving user experience
6. **CORS Restrictions**: Configure CORS to only allow trusted origins
