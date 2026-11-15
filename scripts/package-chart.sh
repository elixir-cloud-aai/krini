#!/usr/bin/env bash
# Packages the Helm chart in `deployment/` for a release, as the `prepare`
# job of `.github/workflows/release.yml` does: `version` and `appVersion`
# (the default image tag) are the release version, and the default image
# (`krini.image`) is the release workflow's image, so that forks that
# publish to another Docker Hub organization (`DOCKERHUB_ORG`) package a
# chart that deploys their image. The chart in the repository keeps its
# placeholders (`0.0.0`, `dev`): it is packaged from a copy. Then checks
# the package: its version, `helm lint --strict` and the image that it
# renders, both with the CI values (`deployment/ci/test-values.yaml`).
# Prints `file=<file name>` and `sha256=<checksum>` of the package (for
# `GITHUB_OUTPUT`). Needs helm, yq (mikefarah/yq v4), tar and sha256sum;
# tested by `deployment/tests/test-package.sh`.
#
# Usage: scripts/package-chart.sh <version> <image> <output directory>
#   <version>: X.Y.Z, or X.Y.Z-alphaN, -betaN, -rcN (the tag without `v`)
#   <image>: fully qualified repository, without tag or digest (e.g.
#     docker.io/elixircloud/krini)
#   <output directory>: new or empty; gets only the package
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <version> <image> <output directory>" >&2
  exit 2
fi
version="$1"
image="$2"
dist="$3"

# The release versions of the release workflow (its tags, without `v`)
pattern='^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-(alpha|beta|rc)[1-9][0-9]*)?$'
if [[ ! "${version}" =~ ${pattern} ]]; then
  echo "::error::Not a release version: '${version}' (X.Y.Z, or X.Y.Z-alphaN, -betaN, -rcN)" >&2
  exit 1
fi
# A registry host with a dot (and an optional port), then the path; no tag
# or digest, which `appVersion` provides
if [[ ! "${image}" =~ ^[a-z0-9-]+(\.[a-z0-9-]+)+(:[0-9]+)?(/[a-z0-9]+([._-][a-z0-9]+)*)+$ ]]; then
  echo "::error::Not a fully qualified image without tag or digest: '${image}'" >&2
  exit 1
fi
if [[ -e "${dist}" && -n "$(ls -A "${dist}")" ]]; then
  echo "::error::The output directory ${dist} is not empty" >&2
  exit 1
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
values="${root}/deployment/ci/test-values.yaml"
work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT

# A copy named after the chart, as `helm package` names the package after
# the chart's `name`; `values.yaml` is rewritten (by yq) only for another
# image, so that the default one is packaged as written
chart="${work}/krini"
cp -R "${root}/deployment" "${chart}"
if [[ "$(yq .krini.image "${chart}/values.yaml")" != "${image}" ]]; then
  IMAGE="${image}" yq -i '.krini.image = strenv(IMAGE)' "${chart}/values.yaml"
fi
mkdir -p "${dist}"
helm package "${chart}" --version "${version}" --app-version "${version}" \
  -d "${dist}" >&2
package="${dist}/krini-${version}.tgz"

# The checks of the package
check() {
  if [[ "$2" != "$3" ]]; then
    echo "::error::Packaged chart: $1 is '$2', expected '$3'" >&2
    exit 1
  fi
}
chart_yaml="$(tar -xzOf "${package}" krini/Chart.yaml)"
check "version" "$(yq .version <<< "${chart_yaml}")" "${version}"
check "appVersion" "$(yq .appVersion <<< "${chart_yaml}")" "${version}"
check "krini.image" "$(tar -xzOf "${package}" krini/values.yaml | yq .krini.image)" "${image}"
helm lint "${package}" --strict -f "${values}" >&2
rendered="$(helm template krini "${package}" --namespace krini -f "${values}" \
  | yq 'select(.kind == "Deployment") | .spec.template.spec.containers[0].image')"
check "the rendered image" "${rendered}" "${image}:${version}"

echo "file=krini-${version}.tgz"
echo "sha256=$(sha256sum "${package}" | cut -d ' ' -f 1)"
