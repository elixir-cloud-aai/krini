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
[![Docs][badge-docs]][badge-url-docs]
[![Coverage][badge-coverage]][badge-url-coverage]
[![GitHub_tag][badge-github-tag]][badge-url-github-tag]
[![Docker_image][badge-docker]][badge-url-docker]
[![DOI][badge-doi]][badge-url-doi]

A virtual research environment for running and managing life science
analyses, brought to you by [ELIXIR On-Cloud](https://elixir-on.cloud/).
Users log in through a configurable OpenID Connect provider, find compute services in a [Cloud
Registry](https://cloud-registry.readthedocs.io/en/latest/), run tasks on
[GA4GH Task Execution Service
(TES)](https://github.com/ga4gh/task-execution-schemas) and workflows on
[GA4GH Workflow Execution Service
(WES)](https://github.com/ga4gh/workflow-execution-service-schemas) instances,
and follow their runs. Deploy Krini with its container image for your own
registry, login provider and services; see the [operator
guide][docs-operator-guide] for the deployment, the [settings][docs-configuration]
and the [login][docs-login].

**Read the [documentation][docs]**: the [user guide][docs-user-guide], the
[operator guide][docs-operator-guide] for the deployment, configuration and
upgrades, and [development][docs-development] for the local setup, checks,
tests and releases.

## Known deployments

| Deployment | Operated by | Notes |
| --- | --- | --- |
| <https://krini.rahtiapp.fi/> | [ELIXIR On-Cloud](https://elixir-on.cloud/) | Hosted on CSC Rahti |

Running Krini yourself? Open a pull request that adds your deployment to the
table in [`README.md`](README.md).

## Quick start

Write the settings to a file outside the repository, e.g.
`~/krini/settings.env` (see [Configuration][docs-configuration]; plain
`KEY=value` lines without quotes, as Docker doesn't strip them), and start
the image of a [release][releases]; it reads all settings when the
container starts:

```bash
docker run --rm -p 3000:3000 --read-only --tmpfs /tmp \
    --env-file ~/krini/settings.env docker.io/elixircloud/krini:<version>
```

On Kubernetes or OpenShift, write the login providers to
`login-providers.json`, a JSON array with Krini's OpenID Connect client
at each provider (more fields in the [Helm chart][docs-helm-chart] docs):

```json
[{"id": "example", "issuer": "https://login.example.org/oidc",
  "clientId": "my-client-id", "clientSecret": "my-client-secret"}]
```

Then install the Helm chart (from [`deployment/`](deployment/), packaged
and attached to each [release][releases] as `krini-<version>.tgz`, which
deploys that release's image), with the login providers in a Secret of
your own and the settings in a values file (see [Helm
chart][docs-helm-chart] for all steps and values, and how to verify the
chart):

```bash
kubectl create secret generic krini-login-providers -n <namespace> \
    --from-file=login-providers=login-providers.json
gh release download v<version> --repo elixir-cloud-aai/krini \
    --pattern 'krini-<version>.tgz*'
helm install krini krini-<version>.tgz -n <namespace> \
    --set hostName=krini.example.org \
    --set config.cloudRegistryUrl=https://registry.example.org \
    --set loginProviders.existingSecret=krini-login-providers
```

On OpenShift, add `--set krini.ingress.enabled=false`, so that the chart
creates a Route with TLS instead of an Ingress.

The [operator guide][docs-operator-guide] describes the image tags, how to
verify an image and check a deployment, and what the login provider, the
Cloud Registry and the TES and WES services need (client registration,
CORS).

## Citation

If you use Krini, please cite it with its DOI
[10.5281/zenodo.24375681](https://doi.org/10.5281/zenodo.24375681), which
always resolves to the latest version on [Zenodo](https://zenodo.org/); the
Zenodo record lists the DOI of each version, too. The citation metadata is in
[`CITATION.cff`](CITATION.cff): on GitHub, "Cite this repository" in the
sidebar of the repository formats it as APA or BibTeX.

## Contributing

Contributions are welcome! See the organisation's [contributing
guide][contributing], mind our [code of conduct][code-of-conduct], and see
[Development][docs-development] in the documentation for the setup, checks,
tests and releases of this repository; the sources of the documentation are
in [`docs/`](docs/).

## Contact

Use the [issue tracker](https://github.com/elixir-cloud-aai/krini/issues) to
request features or report bugs. For anything else, write to
[cloud-service@elixir-europe.org](mailto:cloud-service@elixir-europe.org).

## License

Krini is released under the [Apache License 2.0](LICENSE); third-party
material that it contains or builds on is listed in [`NOTICE`](NOTICE).

[badge-build-status]: <https://github.com/elixir-cloud-aai/krini/actions/workflows/ci.yml/badge.svg>
[badge-coverage]: <https://codecov.io/gh/elixir-cloud-aai/krini/branch/dev/graph/badge.svg?branch=dev>
[badge-docker]: <https://img.shields.io/docker/v/elixircloud/krini?sort=semver&label=image&color=C39BD3>
[badge-docs]: <https://img.shields.io/readthedocs/krini>
[badge-doi]: <https://zenodo.org/badge/DOI/10.5281/zenodo.24375681.svg>
[badge-github-tag]: <https://img.shields.io/github/v/tag/elixir-cloud-aai/krini?color=C39BD3>
[badge-license]: <https://img.shields.io/badge/license-Apache%202.0-blue.svg>
[badge-url-build-status]: <https://github.com/elixir-cloud-aai/krini/actions/workflows/ci.yml>
[badge-url-coverage]: <https://codecov.io/gh/elixir-cloud-aai/krini?branch=dev>
[badge-url-docker]: <https://hub.docker.com/r/elixircloud/krini/tags>
[badge-url-docs]: <https://krini.readthedocs.io/en/latest/>
[badge-url-doi]: <https://doi.org/10.5281/zenodo.24375681>
[badge-url-github-tag]: <https://github.com/elixir-cloud-aai/krini/releases>
[badge-url-license]: <https://www.apache.org/licenses/LICENSE-2.0>
[code-of-conduct]: <https://github.com/elixir-cloud-aai/.github/blob/main/CODE_OF_CONDUCT.md>
[contributing]: <https://github.com/elixir-cloud-aai/.github/blob/main/CONTRIBUTING.md>
[docs]: <https://krini.readthedocs.io/en/latest/>
[docs-configuration]: <https://krini.readthedocs.io/en/latest/operator-guide/configuration/>
[docs-development]: <https://krini.readthedocs.io/en/latest/development/>
[docs-helm-chart]: <https://krini.readthedocs.io/en/latest/operator-guide/helm-chart/>
[docs-login]: <https://krini.readthedocs.io/en/latest/operator-guide/login/>
[docs-operator-guide]: <https://krini.readthedocs.io/en/latest/operator-guide/>
[docs-user-guide]: <https://krini.readthedocs.io/en/latest/user-guide/>
[releases]: <https://github.com/elixir-cloud-aai/krini/releases>
