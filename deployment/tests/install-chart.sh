#!/usr/bin/env bash
# Installs the chart on the current Kubernetes cluster (in CI, a kind
# cluster that has the image loaded) with the CI values and a Secret with a
# placeholder login provider, waits until Krini is ready, runs `helm test`,
# checks that Krini runs as a non-root user, and upgrades the release to two
# replicas with a PodDisruptionBudget. Run by the `chart-install` job of
# `.github/workflows/ci.yml`; needs helm, kubectl, jq and openssl. Removes
# the namespace on success.
#
# Usage: deployment/tests/install-chart.sh <image> [namespace]
set -euo pipefail

if [[ $# -lt 1 || -z "$1" ]]; then
  echo "Usage: $0 <image> [namespace]" >&2
  exit 2
fi
image="$1"
namespace="${2:-krini-ci}"
release=krini
chart="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

show_state() {
  kubectl get all,pdb,secrets -n "${namespace}" || true
  kubectl describe pods -n "${namespace}" || true
  kubectl logs -n "${namespace}" --all-containers --prefix \
    -l app.kubernetes.io/instance="${release}" --tail=100 || true
}
trap 'show_state' ERR

install() {
  helm upgrade --install "${release}" "${chart}" -n "${namespace}" \
    -f "${chart}/ci/test-values.yaml" \
    --set krini.image="${image}" --set krini.imagePullPolicy=Never \
    --wait --timeout 300s "$@"
}

kubectl create namespace "${namespace}"
# A placeholder provider: the login isn't tested here (see `e2e/`)
providers="$(jq -cn --arg secret "$(openssl rand -hex 16)" '[{
  id: "example", name: "Example login", issuer: "https://login.example.org",
  clientId: "krini-ci", clientSecret: $secret}]')"
kubectl create secret generic krini-login-providers -n "${namespace}" \
  --from-literal=login-providers="${providers}"

install
helm test "${release}" -n "${namespace}" --logs --timeout 120s

uid="$(kubectl exec -n "${namespace}" "deployment/${release}" -- id -u)"
echo "UID: ${uid}"
if [[ "${uid}" == 0 ]]; then
  echo "::error::Krini runs as root"
  exit 1
fi

install --set krini.replicas=2
ready="$(kubectl get deployment "${release}" -n "${namespace}" -o jsonpath='{.status.readyReplicas}')"
budget="$(kubectl get pdb "${release}" -n "${namespace}" -o jsonpath='{.spec.maxUnavailable}')"
echo "Ready replicas: ${ready}, maxUnavailable: ${budget}"
if [[ "${ready}" != 2 || "${budget}" != 1 ]]; then
  echo "::error::Expected 2 ready replicas and a PodDisruptionBudget"
  exit 1
fi

trap - ERR
helm uninstall "${release}" -n "${namespace}" --wait
kubectl delete namespace "${namespace}" --wait=false
