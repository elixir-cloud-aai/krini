<!-- markdownlint-disable MD033 MD041 -- logo first; <picture> for dark mode -->
<a href="https://elixir-on.cloud/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo_elixir_on_cloud_night.png">
    <img src="docs/images/logo_elixir_on_cloud.png" alt="ELIXIR On-Cloud">
  </picture>
</a>
<!-- markdownlint-enable MD033 MD041 -->

# Krini

[![License][badge-license]][badge-url-license]
[![Build_status][badge-build-status]][badge-url-build-status]

A virtual research environment for running and managing life science
analyses, brought to you by [ELIXIR On-Cloud](https://elixir-on.cloud/).
Users log in with an OpenID Connect provider, such as LS Login, find compute
services in a [Cloud Registry](https://cloud-registry.readthedocs.io/en/latest/),
run tasks on [GA4GH Task Execution Service
(TES)](https://github.com/ga4gh/task-execution-schemas) and workflows on
[GA4GH Workflow Execution Service
(WES)](https://github.com/ga4gh/workflow-execution-service-schemas) instances,
and follow their runs. The rest of this README describes how to run Krini
locally and how to contribute; see the [Deployment Guide](docs/deployment.md)
for deployments.

## Known deployments

| Deployment | Operated by | Notes |
| --- | --- | --- |
| <https://krini.rahtiapp.fi/> | [ELIXIR On-Cloud](https://elixir-on.cloud/) | Hosted on CSC Rahti |

Running Krini yourself? Open a pull request that adds your deployment to the
table in [`README.md`](README.md).

## Getting Started

### Prerequisites

- Git
- [Bun](https://bun.com/): a recent version

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
  > **_NOTE:_** You might face a problem while login if your application isn't running on `http://localhost:3000/`. In the case of port change, change `APP_ORIGIN` and `OIDC_REDIRECT_URI` in your `.env.local` file (see [Environment Variables](#environment-variables)) and register the new redirect URI with your OIDC client.

Great, now you are good to go!


### Environment Variables

For local development, copy `.env.example` to `.env.local` in the project root and fill in your values:

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

`.env.example` is the only env file in the repository; Git and the Docker build ignore all others, and CI fails if another one is committed or isn't excluded from the Docker build context. In production, pass the settings to the container when it starts, see the [Deployment Guide](./docs/deployment.md#environment-variables).

For detailed deployment and service configuration requirements, see the [Deployment Guide](./docs/deployment.md).

### Tests

CI runs both test levels on pull requests into and pushes to `dev`, the default branch. Neither calls real services.

- **Unit tests** ([Vitest](https://vitest.dev/)): the route handlers and helpers, in `src/**/*.test.ts`. The code in `src/lib/`, `src/app/api/` and `src/app/auth/api/` must stay fully covered: CI fails if new code there has no tests, and uploads the coverage report to [Codecov](https://app.codecov.io/gh/elixir-cloud-aai/krini), where `codecov.yml` requires full coverage of that code and of each pull request's changes. Components and hooks have no unit tests yet.

  ```sh
  bun run test            # run once
  bun run test:coverage   # with the coverage report and the 100% threshold
  ```

- **End-to-end tests** ([Playwright](https://playwright.dev/)): the main user journey in Chromium and Firefox, in `e2e/`. They browse anonymously, log in, reject a forged login callback, submit a workflow with the user's token and log out. They also check the privacy notice and that visitors get no cookies and members only the session's. TES tasks aren't covered yet. The mock services in `e2e/mock/server.ts` play the login provider, the registry and a WES service. The WES service runs over `https` with a self-signed certificate, which `openssl` creates at start, so the tests need `bun` and `openssl`. Playwright starts the mock services, builds the app and starts it. The ports are in `e2e/settings.ts`.

  ```sh
  bunx playwright install chromium firefox   # once
  bun run test:e2e
  ```

  On Linux distributions that Playwright doesn't support yet, run the tests in the Playwright image, as CI does (see the `e2e` job in `.github/workflows/ci.yml`).


## Citation

If you use Krini, please cite it with the metadata in
[`CITATION.cff`](CITATION.cff): on GitHub, "Cite this repository" in the
sidebar of the repository formats it as APA or BibTeX.

## Contributing

Contributions are welcome! See the organisation's [contributing
guide][contributing], mind our [code of conduct][code-of-conduct], and see
[Getting Started](#getting-started) for the setup and the checks of this
repository.

## Contact

Use the [issue tracker](https://github.com/elixir-cloud-aai/krini/issues) to
request features or report bugs. For anything else, write to
[cloud-service@elixir-europe.org](mailto:cloud-service@elixir-europe.org).

## Versioning

The project adopts the [semantic versioning](https://semver.org/) scheme for
versioning.

## License

Krini is released under the [Apache License 2.0](LICENSE); third-party
material that it contains or builds on is listed in [`NOTICE`](NOTICE).

[badge-build-status]: <https://github.com/elixir-cloud-aai/krini/actions/workflows/ci.yml/badge.svg>
[badge-license]: <https://img.shields.io/badge/license-Apache%202.0-blue.svg>
[badge-url-build-status]: <https://github.com/elixir-cloud-aai/krini/actions/workflows/ci.yml>
[badge-url-license]: <https://www.apache.org/licenses/LICENSE-2.0>
[code-of-conduct]: <https://github.com/elixir-cloud-aai/.github/blob/main/CODE_OF_CONDUCT.md>
[contributing]: <https://github.com/elixir-cloud-aai/.github/blob/main/CONTRIBUTING.md>
