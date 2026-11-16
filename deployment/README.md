# Helm chart of Krini

Deploys [Krini](https://github.com/elixir-cloud-aai/krini) on Kubernetes
and OpenShift. The chart has no defaults for a deployment: set at least
`hostName`, `config.cloudRegistryUrl` and `loginProviders.existingSecret`
(the name of a Secret of your own with the login providers), in a values
file kept outside the repository.

See [Helm chart](https://krini.readthedocs.io/en/latest/operator-guide/helm-chart/)
in the operator guide for the installation, all values and upgrades;
`values.yaml` has every value with its default.

- `ci/test-values.yaml`: placeholder values for CI.
- `tests/test-chart.sh`: chart tests (`helm template` and checks of the
  objects).
- `tests/install-chart.sh`: installation on a cluster, as CI does on kind.
