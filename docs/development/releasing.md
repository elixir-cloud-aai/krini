# Releasing

Krini follows [semantic versioning](https://semver.org/). Features and
fixes are merged into `dev`. Branch `main` only ever moves
forward to commits on `dev` that are released, and release tags are on
`main`. Releases are cut by the maintainers with the release workflow
(`.github/workflows/release.yml`), which publishes the image
`docker.io/elixircloud/krini:X.Y.Z` and the GitHub release, with the Helm
chart attached (`krini-X.Y.Z.tgz`, and its Sigstore bundle
`krini-X.Y.Z.tgz.sigstore.json`). Until 1.0.0,
all releases are GitHub pre-releases; stable versions (without `-alphaN`,
`-betaN` or `-rcN`) still update the image tag `latest`.

The tag is the only source of the chart's version: the release workflow
packages `deployment/` with `version` and `appVersion` set to the release
version (`scripts/package-chart.sh`), so `deployment/Chart.yaml` keeps its
placeholders (`0.0.0` and `dev`, the image of the newest commit on `dev`)
and is never bumped in a release-prep pull request. The packaged chart
deploys the release's image by default (`appVersion` is its tag).

## Steps

1. Shortly before the release, open a release-prep pull request into `dev`:
    add the curated release notes as `docs/releases/<version>.md` and to
    `nav` in `mkdocs.yml` (under `Releases`, newest first; the strict docs
    build fails on pages missing from `nav`), set the
    version in `package.json` and in `CITATION.cff` (`version`; add or
    update `date-released`), and update the authors in `CITATION.cff` (see
    "Citation metadata" in the
    [contributing guide][org-contributing]). Each version, also each
    pre-release (e.g., `X.Y.Z-rc1`), needs its own such change. CI's
    `Release readiness` job checks it, on every pull request and push: the
    versions in `package.json` and `CITATION.cff` must always agree, and
    unless the version is tagged on an earlier commit, a `date-released`,
    release notes or a version bump after an earlier release start the
    release preparation: then `date-released` must be set and the notes
    must exist, without TODOs, in the organization's format. Merge it.

    The first release-prep pull request adds the section `Releases` at the
    end of `nav`; later ones add their notes at its top:

    ```yaml
      - Releases:
          - "0.2.0": releases/0.2.0.md
          - "0.1.0": releases/0.1.0.md
    ```

    The release workflow publishes the notes as the start of the GitHub
    release, so they follow the organization's format: an intro paragraph
    saying what the release brings, with a link to the upgrade notes if
    operators must act, then the sections `## Breaking changes`,
    `## Features`, `## Security`, `## Fixes`, `## Documentation` and
    `## Maintenance` (in this order, empty ones left out), holding bullets
    only, each ending with its issue and pull request numbers, e.g.,
    `(#12, #34)`. Links must be absolute, as they must also work on GitHub;
    no `## Commits` section and no `**Full Changelog**` line, which the
    workflow adds. The shared action
    [`publish-release`](https://github.com/elixir-cloud-aai/.github/tree/main/actions/publish-release)
    describes the format and its checks.

2. Wait until CI has passed for the push to `dev` of the commit that the
    merge created on `dev` (`<sha>`, not the head of the pull request): the
    release workflow requires a successful CI run for a push of the tagged
    commit (runs for pull requests test merge commits, not the commit
    itself). CI also scans the image with the flags of the release scan, so
    that a fixable critical or high vulnerability fails CI before the tag
    rather than the release; fix it (e.g., by bumping the Bun image of the
    `Dockerfile`) or, with a reason and an expiry date, accept it in
    `.trivyignore.yaml`. Vulnerabilities published between the CI run and
    the release can still fail the release scan: tag soon after CI has
    passed.

3. Run the release workflow's checks that need no tag, as it runs them
    (keep these commands in sync with the `prepare` job of
    `.github/workflows/release.yml`), in Bash, with `git`, `jq`, `yq`
    ([mikefarah/yq](https://github.com/mikefarah/yq) v4), `curl`, Python 3,
    `bun`, `tar`, [Helm](https://helm.sh/) 3.22.1 (the version of
    `release.yml`) and the [GitHub CLI](https://cli.github.com/). Run them
    before tagging: tags can't be moved or deleted, and the release workflow
    checks the tagged commit, so a check that fails after the tag is pushed
    (other than a CI run that hasn't finished yet) fails again on re-runs,
    and the release then needs a new version, with its own release-prep
    pull request. The commands expect `origin` to be
    `elixir-cloud-aai/krini` (replace it with the name of your remote for it
    otherwise).

    ```bash
    version=X.Y.Z  # e.g. 0.1.0
    sha=""
    git fetch origin && sha="$(git rev-parse --verify "<sha>^{commit}")"  # the full SHA
    (
        [[ -n "${sha}" ]] || { echo "Fetch failed, or the commit is unknown"; exit 1; }
        git merge-base --is-ancestor "${sha}" origin/dev || { echo "${sha} is not on dev"; exit 1; }
        pattern='^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-(alpha|beta|rc)[1-9][0-9]*)?$'
        [[ "v${version}" =~ ${pattern} ]] || { echo "Not a release version: v${version}"; exit 1; }
        # The files of the commit, not of the working tree
        [[ "$(git show "${sha}:package.json" | jq -r .version)" == "${version}" ]] || { echo "Wrong version in package.json"; exit 1; }
        [[ "$(git show "${sha}:CITATION.cff" | yq -r .version)" == "${version}" ]] || { echo "Wrong version in CITATION.cff"; exit 1; }
        [[ -n "$(git show "${sha}:CITATION.cff" | yq -r '.date-released // ""')" ]] || { echo "No date-released in CITATION.cff"; exit 1; }
        # The notes of the commit, with the checker of the action that
        # `release.yml` pins (as the `readiness` job of `ci.yml` does)
        notes="$(mktemp -d)" && git show "${sha}:docs/releases/${version}.md" > "${notes}/notes.md" &&
            curl -fsSL "https://raw.githubusercontent.com/elixir-cloud-aai/.github/7b4bff2bce8b0afb9ea2292193707b4c3a50fae4/actions/publish-release/publish.py" -o "${notes}/publish.py" &&
            python3 -I "${notes}/publish.py" check "${notes}/notes.md" || { echo "Release notes docs/releases/${version}.md missing or not in the format"; exit 1; }
        # The chart of the commit, packaged and checked as the release
        # workflow packages it (version from the tag, lint, render); in a
        # fork, use the image of its DOCKERHUB_ORG
        chart="$(mktemp -d)" && git archive "${sha}" deployment scripts/package-chart.sh | tar -x -C "${chart}" &&
            "${chart}/scripts/package-chart.sh" "${version}" docker.io/elixircloud/krini "${chart}/dist" > /dev/null || { echo "The chart can't be packaged"; exit 1; }
        # Also drafts, which the release workflow can't see before it fails on them
        release="$(gh release view "v${version}" --repo elixir-cloud-aai/krini 2>&1)" && { echo "A release or draft of v${version} exists: delete a draft"; exit 1; }
        [[ "${release}" == *"release not found"* ]] || { echo "Cannot check the releases: ${release}"; exit 1; }
        runs="$(gh api "repos/elixir-cloud-aai/krini/actions/workflows/ci.yml/runs?head_sha=${sha}&branch=dev&event=push&status=success&per_page=1" --jq .total_count)"
        (( runs >= 1 )) || { echo "No successful CI run for the push of ${sha} to dev"; exit 1; }
        git merge-base --is-ancestor origin/main "${sha}" || { echo "main can't be fast-forwarded to ${sha}"; exit 1; }
        # Not in the release workflow: advisories published since the CI run
        # (the `audit` job of `ci.yml`), in the lockfile of the commit
        audit="$(mktemp -d)" && git show "${sha}:package.json" > "${audit}/package.json" &&
            git show "${sha}:bun.lock" > "${audit}/bun.lock" || { echo "Cannot read the lockfile of ${sha}"; exit 1; }
        (cd "${audit}" && bun audit --prod --audit-level=high) || { echo "High or critical advisories in the production dependencies"; exit 1; }
    ) && echo "All checks passed"
    ```

    Only if all checks passed, tag the commit with a signed, annotated tag
    `vX.Y.Z` (or `vX.Y.Z-alphaN`, `vX.Y.Z-betaN` or `vX.Y.Z-rcN` for a
    pre-release), and push it together with `main`, moved to the commit, in
    one atomic push: either both refs are updated or neither (e.g. if `main`
    can't be fast-forwarded or a ruleset rejects the tag), so that neither
    a tag on a commit that isn't on `main` (which would use up the version)
    nor an untagged `main` can result. If the push fails, delete the local
    tag (`git tag -d "v${version}"`) before you try again.

    ```bash
    git tag -s "v${version}" "${sha}" -m "v${version}" &&
        git push --atomic origin "${sha}:refs/heads/main" "refs/tags/v${version}"
    ```

    No workflow of this repository deploys `main`, but a hosting project may
    follow it (a Vercel project follows this repository): check its settings
    before you move `main`.

4. Approve the jobs of the release workflow in the `release` environment,
    after checking that the run is for the tag you pushed. It checks that
    GitHub verified the tag's signature, that its commit is on `main`, the
    versions, the curated notes and the CI run, and packages the chart
    (`Prepare release`); builds
    and pushes the image by digest (`Push release image`, needs approval);
    scans exactly that digest (`Scan release image`) and runs the smoke test
    of CI on it (`Smoke test`, `scripts/check-image.sh`); attests and signs
    it, attests and signs the chart, and only then tags the image `X.Y.Z`
    (and `latest` for the highest stable version), so that a failure before
    leaves the image untagged
    (`Release image`, needs approval); and then, without another approval,
    creates the GitHub release (`Publish release`): the curated notes of the
    tagged commit, then GitHub's generated notes under `## Commits` (without
    their `## What's Changed` header, with "New Contributors"), and GitHub's
    `**Full Changelog**` line last, with the chart and its Sigstore bundle
    attached (it creates a draft, uploads them, and publishes it only then,
    as assets of immutable releases can't be added later; if that fails,
    the draft is deleted); versions below 1.0.0 and `-alpha`,
    `-beta` and `-rc` versions are pre-releases. Releases aren't edited after
    publishing (by convention): fix mistakes in the notes of the next
    release. If a job fails, use "Re-run failed jobs", not "Re-run all
    jobs": once the image is tagged, a new attempt of all jobs stops at the
    existing tag and can't finish the release, and once the GitHub release
    exists, `prepare` fails; a re-run of `Publish release` passes without
    changes if an earlier attempt created the release after all. `prepare`
    can't see draft releases and `Publish release` fails on them, so delete
    any draft of the tag before you push the tag. If `prepare` fails because
    CI hasn't finished for the commit, re-run the workflow once it passed.

## Repository Settings

The repository needs, once:

- an environment `release` with a required reviewer, deployments limited
  to `v*` tags, and the Docker Hub secrets `DOCKERHUB_LOGIN` and
  `DOCKERHUB_TOKEN` (allowed to push `elixircloud/krini`), only in that
  environment, not as repository secrets;
- optionally the variable `DOCKERHUB_ORG` for another Docker Hub
  organization (forks: set it before pushing a test tag, as the workflows
  fall back to `elixircloud`); the packaged chart then deploys that
  organization's image by default;
- a ruleset for `dev` that requires the check `CI passed` (the gate job of
  `ci.yml`); a ruleset for `main` that lets only maintainers update it and
  protects it against non-fast-forward pushes; a ruleset that lets only
  maintainers create `v*` tags and keeps them from being moved or deleted;
  and immutable releases.

Tags and published releases and images can't be changed: if a release
fails after its tag was pushed and re-running its failed jobs doesn't help,
release the next patch version (with its own release-prep pull request).

## Scheduled Scan

After a release, the workflow `Scan` (`.github/workflows/scan.yml`) scans
the image of the latest release (or, before the first stable release, of
the newest pre-release) every Monday, and can be run by hand. It uploads
the fixable findings to code scanning and a full report as a workflow
artifact, and fails on fixable critical and high vulnerabilities: release a
patch version with the fix.

[org-contributing]: https://github.com/elixir-cloud-aai/.github/blob/main/CONTRIBUTING.md
