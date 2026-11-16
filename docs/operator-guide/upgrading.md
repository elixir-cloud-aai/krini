# Upgrading

Krini keeps no data of its own: an upgrade replaces the container image and
restarts it.

1. Read the release notes of every version between yours and the new one
   (the GitHub releases of
   [elixir-cloud-aai/krini](https://github.com/elixir-cloud-aai/krini/releases)):
   they list breaking changes, such as new, renamed or removed settings,
   under "Breaking changes".
2. Adapt the settings (see [Configuration](configuration.md)).
3. Pull and [verify](deployment.md#verifying-images) the image of the new
   version, and restart the container with it; with the Helm chart, set
   the new version's tag and run `helm upgrade` with the chart of that
   version (see [Helm chart](helm-chart.md#upgrades)), whose values may
   have changed, too.

Deployments that pulled `krini:staging` must switch to `krini:dev` or,
better, to a release (see [Deployment](deployment.md#branches-and-tags)).

Krini no longer appends `/ga4gh/tes/v1` to the URLs of TES services, and
lists only TES services over `https`, as for WES. Before upgrading from a
version with `@elixir-cloud/tes` 1.x, check that the TES entries of your
registry have `https` URLs with the API path, e.g.
`https://tes.example.org/ga4gh/tes/v1`, not only the host (see
[Service configuration](deployment.md#service-configuration)).
