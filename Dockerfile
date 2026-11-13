# Both stages use the Bun version of `packageManager` in `package.json`,
# the one source of the version (CI's `lint` job checks that they match),
# pinned by digest. Dependabot bumps tag and digest: bump `packageManager`
# in the same pull request
#
# Build stage: dependencies, sources and the build; none of it is kept
FROM oven/bun:1.4.4@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# No settings: all are read when the server starts (see "Environment
# Variables" in `README.md`), so one image serves any deployment. Builds the
# standalone server (`.dockerignore` lets in no `.env*` files or keys)
COPY . .
RUN NEXT_OUTPUT=standalone bun run build

# Runtime stage: only the standalone server, its static files and `public/`
FROM oven/bun:1.4.4@sha256:1d22548f177f4ff38e0c15baa3c2c46c6c2060ba2d1bc573bb4720b407548f1d

# The version of the image, passed by CI (OCI label)
ARG VERSION=dev
LABEL org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.title="Krini" \
      org.opencontainers.image.source="https://github.com/elixir-cloud-aai/krini" \
      org.opencontainers.image.licenses="Apache-2.0"

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Security fixes that the base image doesn't have yet, which the scans
# would otherwise report
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Owned by root, so that the server can't change its own code. It writes
# only to `.next/cache` (e.g. optimized images), a link to
# `/tmp/next-cache` (created by CMD), so that the image runs with a
# read-only root file system and a writable `/tmp`
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/LICENSE ./
RUN ln -s /tmp/next-cache .next/cache

USER bun
EXPOSE 3000

# The start page redirects to the dashboard; the redirect is enough
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["bun", "-e", "fetch(`http://127.0.0.1:${process.env.PORT || 3000}/`, { redirect: 'manual' }).then((res) => process.exit(res.status < 400 ? 0 : 1), () => process.exit(1))"]

# Listen on all IPv4 interfaces, or on `LISTEN_HOSTNAME` (e.g. `::` for
# IPv6); set in CMD, not with ENV, as container runtimes such as
# Kubernetes' set `HOSTNAME` to the container's host name. Creates the
# target of `.next/cache` first, as `/tmp` may be a fresh, empty mount
CMD ["sh", "-c", "mkdir -p /tmp/next-cache && HOSTNAME=\"${LISTEN_HOSTNAME:-0.0.0.0}\" exec bun server.js"]
