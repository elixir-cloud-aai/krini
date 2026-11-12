# <img src="https://github.com/elixir-cloud-aai/krini/blob/master/public/logo.png?raw=true" align="left" height="38" alt=""> <span >Krini</span>

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
  > **_NOTE:_** You might face a problem while login if your application isn't running on `http://localhost:3000/`. In the case of port change, change the environment variable `VITE_HOST_URI` in file `.env.development` file to the required url.

Great, now you are good to go!


### Environment Variables

Create a `.env.local` file in the project root:

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

#### Configuration

- `LS_LOGIN_URL`: Base URL of the LS Login identity provider.
- `OIDC_CLIENT_ID`: Client ID registered with LS Login.
- `OIDC_CLIENT_SECRET`: Client secret associated with the OIDC client. Keep this private.
- `OIDC_REDIRECT_URI`: Callback URL registered with your LS Login client. It must match the redirect URI configured with the identity provider.
- `OIDC_SCOPE`: OAuth 2.0 scopes to request from the identity provider. Must include `offline_access` for refresh token support. Default: `openid profile email offline_access`.
- `CLOUD_REGISTRY_URL`: Base URL of the Cloud Registry API.
- `APP_ORIGIN`: Origin of your application (e.g., `http://localhost:3000` for local development or your production URL).
- Privacy notice at `/privacy`, linked from the login page and the sidebar and reachable without login. It describes what Krini processes, lists its cookies, and says what happens at the login provider and the services. The text is the same for every deployment. Each deployment adds who is responsible and can link its own full notice. All four settings are optional and read at runtime. Invalid values are ignored, with a warning in the server log.
  - `PRIVACY_CONTROLLER`: Name and address of the operator who is responsible for the processing (the controller).
  - `PRIVACY_CONTACT`: The controller's contact for privacy questions: an email address or an `https` URL.
  - `PRIVACY_NOTICE_URL`: `https` URL of the deployment's full privacy notice, if it has one.
  - `PRIVACY_LOGIN_NOTICE_URL`: `https` URL of the login provider's privacy notice.

#### Cloud Component Versions

This application supports the following GA4GH Cloud Component API versions:

- **TES (Task Execution Service)**: v1
- **WES (Workflow Execution Service)**: v1

The application uses the following client libraries:
- `@elixir-cloud/tes`: ^1.0.1
- `@elixir-cloud/wes`: ^2.0.0-alpha.49

Make sure the OIDC client has the following redirect URI registered:

```text
http://localhost:3000/auth/api/callback
```

Do not commit `.env.local` or expose `OIDC_CLIENT_SECRET` to client-side code.

For detailed deployment and service configuration requirements, see the [Deployment Guide](./docs/DEPLOYMENT.md).

### Tests

CI runs both test levels on pull requests and pushes to `dev`, `master` and `staging`. Neither calls real services.

- **Unit tests** ([Vitest](https://vitest.dev/)): the route handlers and helpers, in `src/**/*.test.ts`. The code in `src/lib/`, `src/app/api/` and `src/app/auth/api/` must stay fully covered: CI fails if new code there has no tests. Components and hooks have no unit tests yet.

  ```sh
  bun run test            # run once
  bun run test:coverage   # with the coverage report and the 100% threshold
  ```

- **End-to-end tests** ([Playwright](https://playwright.dev/)): the main user journey in Chromium and Firefox, in `e2e/`. They browse anonymously, log in, reject a forged login callback, submit a workflow with the user's token and log out. They also check the privacy notice and that visitors get no cookies and members only the session's. TES tasks aren't covered yet. The mock services in `e2e/mock/server.ts` play the login provider, the registry and a WES service. The WES service runs over `https` with a self-signed certificate, which `openssl` creates at start, so the tests need `bun` and `openssl`. Playwright starts the mock services, builds the app and starts it. The ports are in `e2e/settings.ts`.

  ```sh
  bunx playwright install chromium firefox   # once
  bun run test:e2e
  ```

  On Linux distributions that Playwright doesn't support yet, run the tests in the Playwright image, as CI does (see the `e2e` job in `.github/workflows/checks.yml`).


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

This project is covered by the MIT License also
[shipped with this repository](https://github.com/elixir-cloud-aai/krini/blob/master/LICENSE).

## Contact

The project is a collaborative effort under the umbrella of [ELIXIR Cloud &
AAI](https://github.com/elixir-cloud-aai/). Follow the link to get in touch with us via chat or email.
Please mention the name of this service for any inquiry, proposal, question,
etc. Alternatively, you can also make use of the [issue
tracker](https://github.com/elixir-cloud-aai/krini/issues) to request features or report bugs.