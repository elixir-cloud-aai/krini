# Development

How to set up Krini locally, run its checks and tests, and build the
documentation. For how to contribute (issues, pull requests, commit
messages), see the organisation's
[contributing guide](https://github.com/elixir-cloud-aai/.github/blob/main/CONTRIBUTING.md);
for releases, see [Releasing](releasing.md).

## Getting started

### Prerequisites

- Git
- [Bun](https://bun.com/): a recent version

### Installation

[Fork](https://github.com/elixir-cloud-aai/krini/fork) and clone the
repository, and change into its root directory:

```bash
git clone https://github.com/<your-github-username>/krini.git
cd krini
```

Install the packages:

```bash
bun i
```

Configure the app (see [Environment variables](#environment-variables)),
then start the development server:

```bash
bun run dev
```

Open `http://localhost:3000/` in your browser.

`bun run dev` and `bun run build` first copy the workers of the code editor
from `ace-builds` (the version that `@elixir-cloud/design` uses) to
`public/ace/`, which git ignores (`scripts/copy-ace-workers.ts`); Krini
serves them itself, as its Content Security Policy allows no scripts from
other origins (see
[Security headers](../operator-guide/deployment.md#security-headers)).

!!! note
    Login fails if the app doesn't run on `http://localhost:3000/`. If you
    change the port, change `APP_ORIGIN` and `OIDC_REDIRECT_URI` in your
    `.env.local` file and register the new redirect URI with your OIDC
    client. Krini redirects requests at other host names to `APP_ORIGIN`
    (IP addresses and names without a dot are served as they are); as
    Next.js turns a redirect to its own address into a relative one, which
    the browser follows at the same host, set `REDIRECT_TO_APP_ORIGIN=false`
    if you open the development server at another name with a dot (see
    [Several addresses](../operator-guide/deployment.md#several-addresses)).

### Environment variables

For local development, copy `.env.example` to `.env.local` in the project
root and fill in your values; the settings are described in
[Configuration](../operator-guide/configuration.md). Don't commit
`.env.local`.

## Checks

CI (`.github/workflows/ci.yml`) runs these on pull requests into and pushes
to `dev`, the default branch; run them before you push:

```bash
bun run lint                          # Biome: lint, formatting, imports
bunx next typegen && bunx tsc --noEmit  # type check
bun run build                         # production build
bun audit --prod --audit-level=high   # advisories in production dependencies
```

`bun run format` fixes the formatting.

## Tests

CI runs both test levels on pull requests into and pushes to `dev`. Neither
calls real services.

- **Unit tests** ([Vitest](https://vitest.dev/)): the route handlers and
  helpers, in `src/**/*.test.ts`. The code in `src/lib/`, `src/app/api/` and
  `src/app/auth/api/` must stay fully covered: CI fails if new code there has
  no tests, and uploads the coverage report to
  [Codecov](https://app.codecov.io/gh/elixir-cloud-aai/krini), where
  `codecov.yml` requires full coverage of that code and of each pull
  request's changes. Components and hooks have no unit tests yet.

    ```bash
    bun run test            # run once
    bun run test:coverage   # with the coverage report and the 100% threshold
    ```

- **End-to-end tests** ([Playwright](https://playwright.dev/)): the main user
  journey in Chromium and Firefox, in `e2e/`. They browse anonymously, log
  in, reject a forged login callback, submit a workflow with the user's
  token and log out. They also check the privacy notice and that visitors
  get no cookies and members only the session's. TES tasks aren't covered
  yet. The mock services in `e2e/mock/server.ts` play the login provider,
  the registry and a WES service. The WES service runs over `https` with a
  self-signed certificate, which `openssl` creates at start, so the tests
  need `bun` and `openssl`. Playwright starts the mock services, builds the
  app and starts it. The ports are in `e2e/settings.ts`.

    ```bash
    bunx playwright install chromium firefox   # once
    bun run test:e2e
    ```

    On Linux distributions that Playwright doesn't support yet, run the
    tests in the Playwright image, as CI does (see the `e2e` job in
    `.github/workflows/ci.yml`).

    To run them against a Docker image instead of the build of the
    checkout, set `E2E_IMAGE` to the image. Playwright then starts it as it
    is deployed: as the image's non-root user, with a read-only root file
    system, a writable `/tmp` and all settings at start. A difference
    between the two, such as a file missing from the standalone output or a
    setting read at build time, then fails the tests. This needs a built
    image, Docker with the host network (Linux) and a free container name
    `krini-e2e`, and Playwright on the host: not in the Playwright image,
    which has no Docker. CI does this in Chromium for every image it builds
    (`End-to-end tests (image)`), and the release workflow for every
    release image (`End-to-end tests (release image)`):

    ```bash
    docker build -t krini:local .
    E2E_IMAGE=krini:local bun run test:e2e --project chromium
    ```

    The container is removed when the tests end. If a run was killed and
    left it behind, the next run fails at once, as the name is taken:
    remove it with `docker rm -f krini-e2e`.

## Documentation

The documentation is built with [MkDocs](https://www.mkdocs.org/) and the
[Material theme](https://squidfunk.github.io/mkdocs-material/), from
`docs/` and `mkdocs.yml`, and published on
[Read the Docs](https://krini.readthedocs.io/) (`.readthedocs.yaml`). CI's
`docs` job builds it in strict mode, which fails on warnings such as broken
links or pages missing from `nav`. To build and preview it locally (with
the Python version of `.readthedocs.yaml`):

```bash
python3 -m venv .venv-docs
.venv-docs/bin/pip install -r docs/requirements.txt
.venv-docs/bin/mkdocs build --strict   # as CI does
.venv-docs/bin/mkdocs serve            # preview at http://127.0.0.1:8000/
```

Add new pages to `nav` in `mkdocs.yml`. Every pull request that changes
behaviour, settings or the deployment updates the documentation, too.
