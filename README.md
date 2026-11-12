# <img src="public/logo.svg" align="left" height="38" alt=""> <span >Krini</span>

**The Krini is a virtual research environment allowing users to run, manage, share and publish life science analyses.**

Check out the application in the [production](https://krini.rahtiapp.fi/). The rest of this doc will mainly contain details about how to run and contribute to the Krini site locally.

## Getting Started

### Prerequisites

- Git
- [Bun](https://bun.com/): Recent LTS version avaliable

### Installation

- To start with, [fork](https://github.com/elixir-cloud-aai/krini) & clone the repository and traverse into the project's root directory with:

```
git clone https://github.com/<your-github-username>/krini.git
cd krini
```

- Install the packages to be used in the development:

```
bun i
```



- Run the start script to start the development environment of the project:

```
bun run dev
```

- This will open the browser window on your desktop. If not visit `http://localhost:3000/` on your browser's new window.
  > **_NOTE:_** Login works only on the host and port of `OIDC_REDIRECT_URI` and `APP_ORIGIN` (see [Environment Variables](#environment-variables)). If you run Krini elsewhere, e.g. on another port, set both to that address and register the redirect URI with your OIDC client.

Great, now you are good to go!

- Run the unit and integration tests (Vitest; they use fixtures and mocks, no real services):

```
bun run test
```


### Environment Variables

Create a `.env.local` file in the project root:

```env
# LS Login / OpenID Connect
LS_LOGIN_URL=https://login.aai.lifescience-ri.eu
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=http://localhost:3000/auth/api/callback
OIDC_SCOPE=openid profile email offline_access

# Cloud Registry
CLOUD_REGISTRY_URL=https://registry.elixir-cloud.dev

# Application
APP_ORIGIN=http://localhost:3000
```

#### Configuration

- `LS_LOGIN_URL`: Base URL of the LS Login identity provider.
- `OIDC_CLIENT_ID`: Client ID registered with LS Login.
- `OIDC_CLIENT_SECRET`: Client secret associated with the OIDC client. Keep this private.
- `OIDC_REDIRECT_URI`: Callback URL registered with your LS Login client. It must match the redirect URI configured with the identity provider.
- `OIDC_SCOPE`: OAuth 2.0 scopes to request from the identity provider. Must include `offline_access` for refresh token support. Default: `openid profile email offline_access`.
- `CLOUD_REGISTRY_URL`: Base URL of the Cloud Registry API (e.g., `https://elixir-on.cloud/ga4gh/registry/v1`). Krini reads it without a token and lists only services that the registry's admins have verified (`GET /verifications`, same identifier, URL and type) and that have an `https` URL without user info. A registry without `GET /verifications` (Cloud Registry < 0.4.0) yields no services.
- `APP_ORIGIN`: Origin of your application (e.g., `http://localhost:3000` for local development or your production URL).

#### Cloud Component Versions

This application supports the following GA4GH Cloud Component API versions:

- **TES (Task Execution Service)**: v1
- **WES (Workflow Execution Service)**: v1

The application uses the following client libraries:
- `@elixir-cloud/tes`: ^1.0.1
- `@elixir-cloud/wes`: ^2.0.0-alpha.49

`@elixir-cloud/tes` 1.0.1 can't add the user's token to requests yet ([cloud-components#443](https://github.com/elixir-cloud-aai/cloud-components/issues/443)), so for now, tasks work only with TES services that don't require a token.

Make sure the OIDC client has the following redirect URI registered:

```text
http://localhost:3000/auth/api/callback
```

Do not commit `.env.local` or expose `OIDC_CLIENT_SECRET` to client-side code.

For detailed deployment and service configuration requirements, see the [Deployment Guide](./docs/DEPLOYMENT.md).


## Contributing

This project is a community effort and lives off your contributions, be it in
the form of bug reports, feature requests, discussions, or fixes, and other code
changes. Please refer to our organization's [contribution
guidelines](https://github.com/elixir-cloud-aai/elixir-cloud-aai/blob/dev/CONTRIBUTING.md) if you are interested in contributing.
Please mind the [code of conduct](https://github.com/elixir-cloud-aai/elixir-cloud-aai/blob/dev/CODE_OF_CONDUCT.md) for all interactions with
the community.

## Versioning

The project adopts the [semantic versioning](https://semver.org/) scheme for versioning.

## License

This project is covered by the Apache License 2.0, also
[shipped with this repository](LICENSE).

## Contact

The project is a collaborative effort under the umbrella of [ELIXIR Cloud &
AAI](https://github.com/elixir-cloud-aai/). Follow the link to get in touch with us via chat or email.
Please mention the name of this service for any inquiry, proposal, question,
etc. Alternatively, you can also make use of the [issue
tracker](https://github.com/elixir-cloud-aai/krini/issues) to request features or report bugs.