# Login

Users log in with one of the OpenID Connect providers that you configure in
`LOGIN_PROVIDERS`. Krini then sends the user's access token from the browser
to the TES and WES services that the user selects, so the provider, Krini's
client at the provider, and the services must fit together. This page
describes the provider settings, how to register Krini with a login
provider, the access tiers and the sessions;
[Deployment](deployment.md#service-configuration)
describes what the TES and WES services need.

## How the login works

- Krini uses the authorization code flow with PKCE (`S256`), a `state` and a
  nonce. Its server reads the provider's endpoints from
  `<issuer>/.well-known/openid-configuration`; the `issuer` in that
  document must be the configured `issuer` (a trailing slash doesn't
  matter). Krini reads the document again after an hour.
- The provider sends the browser back to the redirect URI,
  `<APP_ORIGIN>/auth/api/callback` (or `OIDC_REDIRECT_URI`). Krini's server
  exchanges the code at the token endpoint, with the client ID and secret
  in the body of the request (`client_secret_post`), and checks the ID
  token: its signature against the provider's keys (`RS256`, `RS384`,
  `RS512`, `ES256`, `ES384` or `ES512`), the issuer, the audience (the
  client ID), the expiry and the nonce.
- Krini keeps the tokens in `httpOnly` cookies. Its pages get the access
  token from Krini's own server (`/auth/api/token`) when they call a TES or
  WES service. With a refresh token (scope `offline_access`), Krini renews
  the access token shortly before it expires, while one of its pages is
  open.
- Krini's server reads the user's groups from the provider's user info
  (or the ID token, see `groupsFromUserinfo`) and keeps them for five
  minutes.

The client secret stays on Krini's server: only the token endpoint gets it.
The login page shows each provider's `id`, `name` and `logo`, and the login
redirect carries the client ID, the redirect URI and the scopes, which are
public by design.

## Login providers

`LOGIN_PROVIDERS` is a JSON array with one object per provider, on one line
in env files (see [Configuration](configuration.md#settings)). Krini offers
one login button per provider on `/auth/login`. Each provider has these
fields:

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Identifier of the provider, unique in the array, e.g. `example-login` |
| `issuer` | yes | OpenID Connect issuer URL, e.g. `https://login.example.org/oidc/` |
| `clientId` | yes | Client ID of Krini at the provider |
| `clientSecret` | yes | Client secret of Krini at the provider |
| `name` | no | Name on the login page; the `id` if not set |
| `logo` | no | Logo on the login page: an `https` URL, or a path of a file in the image's `public/` directory |
| `scopes` | no | Scopes to request; `["openid", "profile", "email", "offline_access"]` if not set. If you set them, include `openid` and `offline_access`, and the scope that releases the groups, if the provider needs one (see [Registering Krini with a login provider](#registering-krini-with-a-login-provider)) |
| `groupsClaim` | no | Claim with the user's groups, for the [access tiers](#access-tiers), e.g. `groups` |
| `groupsFromUserinfo` | no | Whether to read the groups from the user info (`true`, the default) or from the ID token (`false`) |
| `computeGroups` | no | Groups whose members may run tasks and workflows |
| `adminGroups` | no | Groups whose members are admins (and may run tasks and workflows) |
| `groupSubgroupSeparator` | no | Separator of subgroups in group names (e.g. `:`), so that members of subgroups count too |

Krini ignores providers without one of the required fields, and providers
with the `id` of an earlier one. If `LOGIN_PROVIDERS` isn't a valid JSON
array, Krini has no providers. **At start** Krini checks the setting and
logs each problem — the provider `id` and the missing field, never the
`clientSecret` — and refuses to start when no provider is valid (see
[Configuration](configuration.md)). If the login page shows no button,
or not all of them, check the JSON (e.g. with
`jq . <<< "$LOGIN_PROVIDERS"`) and the required fields.

The providers, `groupsClaim`, `computeGroups`, `adminGroups` and
`COMPUTE_ACCESS_REQUEST_URL` are deployment configuration: Krini has no
provider-specific defaults for them. Guides for a specific provider belong
to the documentation of the deployment that uses it.

Example, with placeholders for the client and the groups:

```env
LOGIN_PROVIDERS=[{"id":"example-login","name":"Example Login","logo":"https://login.example.org/logo.png","issuer":"https://login.example.org/oidc/","clientId":"<client ID>","clientSecret":"<client secret>","scopes":["openid","profile","email","groups","offline_access"],"groupsClaim":"groups","computeGroups":["krini-compute"],"adminGroups":["krini-admins"]}]
```

`LOGIN_PROVIDERS` holds the client secrets: pass it from a secret (e.g. a
Kubernetes Secret, see [Helm chart](helm-chart.md#login-providers)), never
from a file in the repository or the image, and never as a client-side
(`NEXT_PUBLIC_*`) variable. Restart Krini after changing it.

## Registering Krini with a login provider

Register Krini as a service (an OpenID Connect client) at your login
provider. Every provider needs the same client settings:

- **Flow:** authorization code, with a client secret (confidential
  client), and PKCE with `S256`.
- **Token endpoint authentication:** client secret in the request body
  (`client_secret_post`).
- **Redirect URI:** `<APP_ORIGIN>/auth/api/callback`, e.g.
  `https://krini.example.org/auth/api/callback` (or the value of
  `OIDC_REDIRECT_URI`). Use a separate client for local development, with
  `http://localhost:3000/auth/api/callback`.
- **Post-logout redirect URI:** `<APP_ORIGIN>/`, e.g.
  `https://krini.example.org/` (see [Sessions and
  logout](#sessions-and-logout)).
- **Scopes:** `openid`, `offline_access`, and the scope that releases the
  groups, if the provider needs one. Some providers release their groups
  only with a specific scope or claim — e.g. `eduperson_entitlement` in
  eduPerson-based federations — and `groupsClaim` names the claim that
  carries them. `offline_access` needs the refresh token grant to be
  enabled for the client.
- **Access tokens:** JWTs ([RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068)),
  not opaque tokens: TES and WES services validate them themselves.

Put the client ID and secret into `LOGIN_PROVIDERS` (see the example above)
and keep its `scopes` and `groupsClaim`. Then give the client ID to the operators of the TES
and WES services that Krini should use, so that they accept tokens issued
to it (see [Service configuration](deployment.md#service-configuration)).
The Cloud Registry needs no settings for Krini: Krini only reads its public
list of services, without a token.

## Access tiers

Krini derives a tier from the groups in `groupsClaim`: members of one of
the `adminGroups` are admins, members of one of the `computeGroups` have
compute access, and everybody else is a user. Only compute and admin users
see the forms that run tasks and workflows and the lists of their runs;
users get "Request compute access", linked to
`COMPUTE_ACCESS_REQUEST_URL` if it is set.

!!! warning "Set `computeGroups` or `adminGroups`"
    Without `groupsClaim` and at least one of `computeGroups` and
    `adminGroups`, every user is in the user tier, and nobody can run tasks
    or workflows in Krini.

The tiers only decide what Krini's pages offer. The TES and WES services
decide what a token may do: they get the user's token, whatever the tier,
so restrict access there (e.g. by group or by client, see [Service
configuration](deployment.md#service-configuration)).

## Sessions and logout

Krini keeps the session in `httpOnly` cookies for as long as the provider's
tokens are valid (`expires_in` and `refresh_expires_in` of the token
response, at most 30 days); in production builds, such as the image, the cookies are
`Secure`, so Krini must be served over HTTPS. With a refresh token, Krini
renews the access token shortly before it expires (5 minutes before, or
at half its lifetime if that is shorter) while one of its pages is open,
so the session can last as long as the provider's refresh token (at
most 30 days); without one, users log in again when the access token
expires. The ID token, whose `sub` names the user, is kept as long as the
session, as providers needn't send a new one on refresh; a new one must
name the same user and issuer (OpenID Connect Core 12.2). The tabs of a
browser take turns, so only one of them refreshes at a time (Web Locks;
see [Pods](helm-chart.md#pods) for more than one replica). Refreshes are
`POST` requests to `/auth/api/refresh`, which Krini, like the logout,
accepts only with the `Origin` of `APP_ORIGIN`.

How Krini handles the provider's answer to a refresh (RFC 6749, section
5.2):

| Answer of the token endpoint | Krini |
| --- | --- |
| `400` with `invalid_grant` (refresh token expired, revoked or reused), or `401` other than `invalid_client` and `unauthorized_client` | Ends the session: deletes its cookies and sends the user to the login page |
| `invalid_client` or `unauthorized_client` (e.g. a rotated client secret), other errors, timeouts, an invalid token response | Keeps the session and logs the error (`OIDC refresh error: category=…, provider_error=…`); the page tries again with growing waits (5 seconds, doubling, at most 5 minutes). A new refresh token in an invalid token response is kept, as the provider may have revoked the old one |
| An ID token for another `sub` or `iss` | Ends the session |
| No ID token, while the session has none either (e.g. its cookie expired) | Ends the session, as nothing names the user any more |

Visitors without a session, or whose refresh token is gone, are never
sent anywhere; without a refresh token, the access token is used until it
expires. A provider outage doesn't log users out, but once the access
token has expired, the services reject it until the provider is back.

Logging out is a `POST` to `/auth/api/logout` from Krini's own pages: Krini
accepts it only with the `Origin` of `APP_ORIGIN`, so serve Krini at that
address. The page first waits for a refresh in flight in any of its tabs.
Krini then revokes the refresh token if the provider's discovery
document has a `revocation_endpoint` (RFC 7009), deletes Krini's cookies,
and sets `logout_marker`, which makes Krini refuse the session's cookies
until the next successful login (or 30 days, as long as any session
cookie lives), should a refresh have set them again anyway. If the discovery document has an `end_session_endpoint` (OpenID
Connect RP-Initiated Logout), Krini sends the browser there, with the ID
token, the client ID and `<APP_ORIGIN>/` as `post_logout_redirect_uri`;
register that URI with the provider (see above). An access token that was
handed out before the logout (e.g. with "Copy access token") stays valid
at the services until it expires.
