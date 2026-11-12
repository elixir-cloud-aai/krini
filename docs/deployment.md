# Deployment Guide

This guide covers configuration requirements for deploying Krini in production environments.

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
- Set the `PRIVACY_*` variables (see the [README](../README.md#configuration)), so that the privacy notice at `/privacy` names who is responsible and how to reach them. Without them, the page says that the operator hasn't named anyone. They are read at runtime, so changing them needs a restart, not a new image. Values that aren't valid (e.g. a URL that isn't `https`) are ignored, with a warning in the server log.
- The notice's text is the same for every deployment. It describes what Krini itself does. Put anything specific to your deployment (purposes, legal basis, retention, rights) into your own notice and link it with `PRIVACY_NOTICE_URL`.
- Krini sets no cookies for visitors, unless they start a login or change the sidebar. Its cookies are listed in the notice, with their lifetimes. All except the sidebar setting are strictly necessary. Krini has no analytics, so it needs no consent banner. If you add anything that sets other cookies or tracks users, update the notice and add consent.

## Security Recommendations

1. **HTTPS Only**: Always deploy Krini behind HTTPS in production
2. **Secure Cookies**: Production deployments use `Secure` flag on cookies automatically when `NODE_ENV=production`
3. **Secret Management**: Never commit `.env.local` or expose secrets in client-side code
4. **Origin Validation**: The logout endpoint validates requests against `APP_ORIGIN` to prevent CSRF
5. **Token Refresh**: The `offline_access` scope enables silent token renewal, improving user experience
6. **CORS Restrictions**: Configure CORS to only allow trusted origins
