# Login

Users log in with one of the OpenID Connect providers that you configure in
`LOGIN_PROVIDERS`, e.g. [LS Login](https://lifescience-ri.eu/ls-login/) for
ELIXIR On-Cloud. Krini then sends the user's access token from the browser
to the TES and WES services that the user selects, so the provider, Krini's
client at the provider, and the services must fit together. This page
describes the provider settings, how to register Krini with LS Login, the
access tiers and the sessions; [Deployment](deployment.md#service-configuration)
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
| `id` | yes | Identifier of the provider, unique in the array, e.g. `ls-login` |
| `issuer` | yes | OpenID Connect issuer URL, e.g. `https://login.aai.lifescience-ri.eu/oidc/` |
| `clientId` | yes | Client ID of Krini at the provider |
| `clientSecret` | yes | Client secret of Krini at the provider |
| `name` | no | Name on the login page; the `id` if not set |
| `logo` | no | Logo on the login page: an `https` URL, or a path of a file in the image's `public/` directory, e.g. `/ls-login-grey-wide.jpg` |
| `scopes` | no | Scopes to request; `["openid", "profile", "email", "offline_access"]` if not set. If you set them, include `openid` and `offline_access`, and the scope that releases the groups (e.g. `eduperson_entitlement` for LS Login) |
| `groupsClaim` | no | Claim with the user's groups, for the [access tiers](#access-tiers), e.g. `eduperson_entitlement` |
| `groupsFromUserinfo` | no | Whether to read the groups from the user info (`true`, the default) or from the ID token (`false`) |
| `computeGroups` | no | Groups whose members may run tasks and workflows |
| `adminGroups` | no | Groups whose members are admins (and may run tasks and workflows) |
| `groupSubgroupSeparator` | no | Separator of subgroups in group names (e.g. `:`), so that members of subgroups count too |

Krini ignores providers without one of the required fields, and providers
with the `id` of an earlier one. If `LOGIN_PROVIDERS` isn't a valid JSON
array, Krini has no providers. **It doesn't log either case**: if the login
page shows no button, or not all of them, check the JSON (e.g. with
`jq . <<< "$LOGIN_PROVIDERS"`) and the required fields.

Example for LS Login, with placeholders for the client and the groups:

```env
LOGIN_PROVIDERS=[{"id":"ls-login","name":"LS Login","logo":"/ls-login-grey-wide.jpg","issuer":"https://login.aai.lifescience-ri.eu/oidc/","clientId":"<client ID>","clientSecret":"<client secret>","scopes":["openid","profile","email","eduperson_entitlement","offline_access"],"groupsClaim":"eduperson_entitlement","computeGroups":["<compute group>"],"adminGroups":["<admin group>"]}]
```

`LOGIN_PROVIDERS` holds the client secrets: pass it from a secret (e.g. a
Kubernetes Secret, see [Helm chart](helm-chart.md#login-providers)), never
from a file in the repository or the image, and never as a client-side
(`NEXT_PUBLIC_*`) variable. Restart Krini after changing it.

## Registering Krini with LS Login

Register Krini with [LS Login](https://lifescience-ri.eu/ls-login/) as a
service (an OpenID Connect client) in the LS Login service registry. Other
providers need the same settings under their own names.

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
- **Scopes:** `openid`, `profile`, `email`, `eduperson_entitlement` and
  `offline_access`. LS Login releases the groups (`eduperson_entitlement`)
  only with their scope; `offline_access` needs the refresh token grant to
  be enabled for the client.
- **Access tokens:** JWTs ([RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068)),
  not opaque tokens: TES and WES services validate them themselves.

Put the client ID and secret into `LOGIN_PROVIDERS` (see the example above)
and keep its `scopes`. Then give the client ID to the operators of the TES
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
response); in production builds, such as the image, the cookies are
`Secure`, so Krini must be served over HTTPS. With a refresh token, Krini
renews the access token shortly before it expires while one of its pages is
open, so the session can last as long as the provider's refresh token;
without one, users log in again when the access token expires. Each Krini server remembers the refresh tokens
it has just used in memory (see [Pods](helm-chart.md#pods) for more than one
replica).

Logging out is a `POST` to `/auth/api/logout` from Krini's own pages: Krini
accepts it only with the `Origin` of `APP_ORIGIN`, so serve Krini at that
address. It deletes Krini's cookies and, if the provider's discovery
document has an `end_session_endpoint` (OpenID Connect RP-Initiated
Logout), sends the browser there, with the ID token, the client ID and
`<APP_ORIGIN>/` as `post_logout_redirect_uri`; register that URI with the
provider (see above). Krini doesn't revoke tokens: an access token stays
valid until it expires.
