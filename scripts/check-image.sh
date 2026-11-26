#!/usr/bin/env bash
# Smoke test of a Krini image, run by the `image` job of
# `.github/workflows/ci.yml` and the `smoke` job of
# `.github/workflows/release.yml`: the container runs as a non-root user
# with a read-only root file system and a writable `/tmp`, serves the login
# page, redirects the start page, serves the workers of
# the code editor, writes optimized images to `/tmp/next-cache` and has
# LICENSE and NOTICE (see "Container image" in
# `docs/operator-guide/deployment.md`). The optimized image is Krini's own
# `public/logo.png`: change it here if it is renamed. Needs Docker and
# curl, and port 3000 on 127.0.0.1.
#
# Usage: scripts/check-image.sh <image>
set -euo pipefail

if [[ $# -ne 1 || -z "$1" ]]; then
  echo "Usage: $0 <image>" >&2
  exit 2
fi
image="$1"

# a container of its own, removed on exit (never one of another name);
# minimal settings so that the start-up check passes (the provider's
# issuer is never contacted: the login page lists providers without
# discovering them)
app="$(docker run -d -p 127.0.0.1:3000:3000 --read-only --tmpfs /tmp \
  --env APP_ORIGIN=http://127.0.0.1:3000 \
  --env CLOUD_REGISTRY_URL=https://registry.invalid/v1 \
  --env 'LOGIN_PROVIDERS=[{"id":"smoke","issuer":"https://issuer.invalid","clientId":"smoke","clientSecret":"smoke","computeGroups":["compute"]}]' \
  "${image}")"
trap 'docker rm -f "${app}" >/dev/null 2>&1 || true' EXIT
if [[ "$(docker exec "${app}" id -u)" == 0 ]]; then
  echo "::error::The container runs as root"
  exit 1
fi
# the licence and the notices of third-party material
for file in LICENSE NOTICE; do
  if ! docker exec "${app}" test -s "/app/${file}"; then
    echo "::error::The image has no /app/${file}"
    exit 1
  fi
done
for _ in $(seq 30); do
  # the start page redirects to the dashboard; the login page is served
  # (200, not a redirect, which `curl -f` would also
  # accept); an optimized image is written to `.next/cache` (a link to
  # `/tmp`)
  login="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/auth/login || true)"
  if [[ "${login}" =~ ^[1-5] && "${login}" != 200 ]]; then
    docker logs "${app}"
    echo "::error::The login page returned ${login}, expected 200"
    exit 1
  fi
  if [[ "${login}" == 200 ]]; then
    status="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ || true)"
    if [[ "${status}" != 307 ]]; then
      echo "::error::The start page returned ${status}, expected a redirect (307)"
      exit 1
    fi
    if ! curl -fs -o /dev/null "http://127.0.0.1:3000/_next/image?url=%2Flogo.png&w=640&q=75"; then
      docker logs "${app}"
      echo "::error::The image optimizer failed"
      exit 1
    fi
    # the workers of the code editor, copied when the app is built
    if ! curl -fs -o /dev/null http://127.0.0.1:3000/ace/worker-json.js; then
      docker logs "${app}"
      echo "::error::The image doesn't serve the editor's workers (/ace/)"
      exit 1
    fi
    if ! docker exec "${app}" sh -c 'ls /tmp/next-cache/images | grep -q .'; then
      docker logs "${app}"
      echo "::error::The image optimizer didn't write to /tmp/next-cache"
      exit 1
    fi
    exit 0
  fi
  sleep 2
done
docker logs "${app}"
echo "::error::The container didn't serve the login page"
exit 1
