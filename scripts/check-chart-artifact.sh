#!/usr/bin/env bash
# Checks a downloaded artifact of the packaged chart in the release
# workflow (`.github/workflows/release.yml`): any job of a run can
# overwrite the run's artifacts with its token, so the directory must hold
# exactly the chart that `prepare` packaged (the file name and SHA-256 that
# `scripts/package-chart.sh` printed) and, if its checksum is given, the
# chart's Sigstore bundle (`<chart>.sigstore.json`) that `release-image`
# made, and nothing else (hidden files count too). Run by `release-image`
# (chart only) and `publish` (chart and bundle); tested by
# `deployment/tests/test-package.sh`.
#
# Usage: scripts/check-chart-artifact.sh <directory> <file name> <sha256> [<bundle sha256>]
set -euo pipefail

if [[ $# -lt 3 || $# -gt 4 ]]; then
  echo "Usage: $0 <directory> <file name> <sha256> [<bundle sha256>]" >&2
  exit 2
fi
dir="$1"
file="$2"
sums=("$3")
expected=("${dir}/${file}")
if [[ $# -eq 4 ]]; then
  sums+=("$4")
  expected+=("${dir}/${file}.sigstore.json")
fi

# The file names of `scripts/package-chart.sh`
if [[ ! "${file}" =~ ^krini-[0-9A-Za-z.+-]+\.tgz$ ]]; then
  echo "::error::Invalid chart file name '${file}'" >&2
  exit 1
fi
for sum in "${sums[@]}"; do
  if [[ ! "${sum}" =~ ^[0-9a-f]{64}$ ]]; then
    echo "::error::Invalid checksum '${sum}'" >&2
    exit 1
  fi
done
shopt -s nullglob dotglob
files=("${dir}"/*)
if [[ "${files[*]}" != "${expected[*]}" ]]; then
  echo "::error::Expected ${expected[*]}, found: ${files[*]}" >&2
  exit 1
fi
for i in "${!expected[@]}"; do
  printf '%s  %s\n' "${sums[i]}" "${expected[i]}"
done | sha256sum --check --strict
