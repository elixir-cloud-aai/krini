#!/usr/bin/env bash
# Tests of the packaging of the Helm chart for releases
# (`scripts/package-chart.sh`, run by the `prepare` job of
# `.github/workflows/release.yml`): packages the chart with a release
# version, as the release workflow does, and checks the package, and that
# invalid arguments fail. Run by the `chart` job of
# `.github/workflows/ci.yml`; needs helm, yq, jq, tar and sha256sum.
#
# Usage: deployment/tests/test-package.sh
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
script="${root}/scripts/package-chart.sh"
image=docker.io/elixircloud/krini
failures=0
tests=0
work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT

# Checks that `actual` equals `expected`
assert_eq() {
  local description="$1" actual="$2" expected="$3"
  tests=$((tests + 1))
  if [[ "${actual}" != "${expected}" ]]; then
    failures=$((failures + 1))
    printf 'FAIL: %s\n  expected: %s\n  actual:   %s\n' \
      "${description}" "${expected}" "${actual}"
  fi
}

# Checks that packaging with the given arguments fails with a message
# matching `pattern`
assert_fails() {
  local description="$1" pattern="$2" error
  shift 2
  tests=$((tests + 1))
  if error="$("${script}" "$@" 2>&1 >/dev/null)"; then
    failures=$((failures + 1))
    printf 'FAIL: %s\n  packaging succeeded\n' "${description}"
  elif ! grep -qE "${pattern}" <<< "${error}"; then
    failures=$((failures + 1))
    printf 'FAIL: %s\n  expected an error matching: %s\n  actual: %s\n' \
      "${description}" "${pattern}" "${error}"
  fi
}

# A file of the package
packaged() {
  tar -xzOf "$1" "krini/$2"
}

# Image of the Deployment rendered from a package with the CI values
rendered_image() {
  helm template krini "$1" --namespace krini -f "${root}/deployment/ci/test-values.yaml" \
    | yq 'select(.kind == "Deployment") | .spec.template.spec.containers[0].image'
}

# --- A pre-release, with the default image ---
dist="${work}/release"
output="$("${script}" 1.2.3-rc1 "${image}" "${dist}")"
package="${dist}/krini-1.2.3-rc1.tgz"
assert_eq "outputs" "$(cut -d = -f 1 <<< "${output}" | paste -sd ' ')" "file sha256"
assert_eq "file" "$(sed -n 's/^file=//p' <<< "${output}")" "krini-1.2.3-rc1.tgz"
assert_eq "sha256" "$(sed -n 's/^sha256=//p' <<< "${output}")" \
  "$(sha256sum "${package}" | cut -d ' ' -f 1)"
assert_eq "only the package" "$(ls -A "${dist}")" "krini-1.2.3-rc1.tgz"
assert_eq "version" "$(packaged "${package}" Chart.yaml | yq .version)" "1.2.3-rc1"
assert_eq "appVersion" "$(packaged "${package}" Chart.yaml | yq .appVersion)" "1.2.3-rc1"
assert_eq "values unchanged" "$(packaged "${package}" values.yaml)" \
  "$(cat "${root}/deployment/values.yaml")"
assert_eq "rendered image" "$(rendered_image "${package}")" "${image}:1.2.3-rc1"
assert_eq "no chart tests" "$(tar -tzf "${package}" | grep -c '^krini/tests/' || true)" "0"
assert_eq "helm tests" "$(tar -tzf "${package}" | grep -c '^krini/templates/tests/')" "1"

# --- A fork's image (`DOCKERHUB_ORG`) ---
dist="${work}/fork"
"${script}" 0.1.0 docker.io/example/krini "${dist}" >/dev/null
package="${dist}/krini-0.1.0.tgz"
assert_eq "fork image value" "$(packaged "${package}" values.yaml | yq .krini.image)" \
  "docker.io/example/krini"
assert_eq "fork rendered image" "$(rendered_image "${package}")" "docker.io/example/krini:0.1.0"
assert_eq "fork values otherwise unchanged" \
  "$(packaged "${package}" values.yaml | yq '.krini.image = "x"' -o=json)" \
  "$(yq '.krini.image = "x"' -o=json "${root}/deployment/values.yaml")"

# --- The chart in the repository keeps its placeholders ---
assert_eq "repository chart" "$(yq '.version + " " + .appVersion' "${root}/deployment/Chart.yaml")" \
  "0.0.0 dev"
assert_eq "repository values" "$(yq .krini.image "${root}/deployment/values.yaml")" "${image}"

# --- Invalid arguments ---
assert_fails "no arguments" "Usage"
assert_fails "tag instead of version" "version" v0.1.0 "${image}" "${work}/a"
assert_fails "two-part version" "version" 0.1 "${image}" "${work}/a"
assert_fails "other pre-release" "version" 0.1.0-dev1 "${image}" "${work}/a"
assert_fails "leading zero" "version" 0.01.0 "${image}" "${work}/a"
assert_fails "image with tag" "image" 0.1.0 "${image}:0.1.0" "${work}/a"
assert_fails "image with digest" "image" 0.1.0 "${image}@sha256:$(printf '0%.0s' {1..64})" "${work}/a"
assert_fails "short image name" "image" 0.1.0 elixircloud/krini "${work}/a"
assert_fails "non-empty output" "not empty" 0.1.0 "${image}" "${work}/release"

echo "${tests} tests, ${failures} failures"
[[ "${failures}" -eq 0 ]]
