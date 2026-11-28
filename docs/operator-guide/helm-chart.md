# Helm chart

The Helm chart in
[`deployment/`](https://github.com/elixir-cloud-aai/krini/tree/dev/deployment)
deploys Krini on Kubernetes and OpenShift: a Deployment of the container
image, a Service, and an Ingress, a Gateway API HTTPRoute or an OpenShift
Route. It has no defaults for any deployment: you set the host name, the
Cloud Registry and the login providers, and the login providers' secrets
come only from a Kubernetes Secret of your own.

Each [release](https://github.com/elixir-cloud-aai/krini/releases), from
0.1.0 on, has the chart attached, packaged with the release's version
(`krini-X.Y.Z.tgz`), which deploys that release's image by default. The
chart isn't published to a chart repository: install it from that file,
after [verifying it](#verifying-the-chart). The chart in the repository
(version `0.0.0`) deploys the image of the newest commit on `dev` by
default; use it for development and testing only.

## Prerequisites

- Kubernetes 1.27 or later (or OpenShift 4.14 or later) and Helm 3.
- One way to reach Krini from outside the cluster: an ingress controller, a
  Gateway of the [Gateway API](https://gateway-api.sigs.k8s.io/), or
  OpenShift's router.
- An OpenID Connect client at each login provider, with the redirect URI
  `https://<host name>/auth/api/callback`, the post-logout redirect URI
  `https://<host name>/` and the scopes of [Registering Krini with a login
  provider](login.md#registering-krini-with-a-login-provider), including the scope
  with which the provider releases the claim with the user's groups
  (`groupsClaim`) for the [access tiers](login.md#access-tiers).
- A Cloud Registry whose list of services (`GET /services`, without
  login) has the TES services and gateways (types `tes` and
  `tes-gateway`) and WES services and gateways (types `wes` and
  `wes-gateway`) that Krini should offer (see [Cloud
  Registry](deployment.md#cloud-registry)); Krini lists what the registry
  returns, so register only services that you have checked. Krini only
  reads the registry.
- TES services, gateways and WES services that accept access tokens
  issued to Krini's `clientId` of each login provider, and allow
  Krini's origin in their CORS settings: see [Service
  configuration](deployment.md#service-configuration) and [CORS
  configuration](deployment.md#cors-configuration).

## Installation

1. Write the login providers (`LOGIN_PROVIDERS`) to a file outside the
   repository, e.g. `login-providers.json`: a JSON array with one object
   per provider (see [Login providers](#login-providers)), for example:

    ```json
    [
      {
        "id": "example",
        "name": "Example login",
        "issuer": "https://login.example.org/oidc",
        "clientId": "my-client-id",
        "clientSecret": "my-client-secret"
      }
    ]
    ```

2. Create a Secret with it in the namespace of the release (or with your
   secrets manager, e.g. External Secrets or Sealed Secrets), then delete
   the file:

    ```bash
    kubectl create namespace krini
    kubectl create secret generic krini-login-providers -n krini \
        --from-file=login-providers=login-providers.json
    ```

3. Write the values of the deployment to a file outside the repository, e.g.
   `values-prod.yaml`:

    ```yaml
    hostName: krini.example.org
    config:
      cloudRegistryUrl: https://registry.example.org/ga4gh/registry/v1
      privacy:
        controller: Example Institute, Example Street 1, Example City
        contact: privacy@example.org
    loginProviders:
      existingSecret: krini-login-providers
    ```

    The chart of a release deploys the image of that release (see
    [Image](#image)), so the values need no image tag.
    On OpenShift, add `krini: {ingress: {enabled: false}}`, so that
    the chart creates a Route with TLS instead of an Ingress (see
    [Exposing Krini](#exposing-krini)); for a host name outside the
    router's domain, keep the Ingress with a certificate instead (see [Own
    host name on OpenShift](#own-host-name-on-openshift)).

4. Download the chart of the release that you deploy (here 0.1.0) from its
   GitHub release, with the [GitHub CLI](https://cli.github.com/) (or from
   the release page), [verify it](#verifying-the-chart), and install it:

    ```bash
    version=0.1.0
    gh release download "v${version}" --repo elixir-cloud-aai/krini \
        --pattern "krini-${version}.tgz*"
    # verify it (see "Verifying the chart"), then:
    helm install krini "krini-${version}.tgz" -n krini -f values-prod.yaml
    ```

    `krini` is the name of the release, which upgrades and `helm uninstall`
    refer to. Helm prints Krini's URL and how to check the rollout; `helm get
    notes krini -n krini` shows them again.

5. Check the release:

    ```bash
    kubectl rollout status deployment/krini -n krini
    helm test krini -n krini
    ```

    The test requests the privacy notice and the start page from the
    Service, so it shows that Krini serves pages; it doesn't log in.

Rendering fails, with a message naming the value, if `hostName` (or
`config.appOrigin`), `config.cloudRegistryUrl` or
`loginProviders.existingSecret` is missing, if a value has the wrong type
or isn't known to the chart (`values.schema.json`), or if values contradict
each other.

## Values

All values with their defaults and comments are in
[`deployment/values.yaml`](https://github.com/elixir-cloud-aai/krini/blob/dev/deployment/values.yaml).

### Configuration

The chart passes Krini's settings (see [Configuration](configuration.md))
to its container as environment variables. Empty values aren't passed, so
that Krini's defaults apply. Changing a value restarts the pods on `helm
upgrade`.

| Value | Variable | Default |
| --- | --- | --- |
| `hostName` | — | none; the public host name of the Ingress, HTTPRoute or Route, e.g. `krini.example.org` |
| `config.cloudRegistryUrl` | `CLOUD_REGISTRY_URL` | none; required |
| `config.appOrigin` | `APP_ORIGIN` | `https://<hostName>`; an `https` origin without path or trailing slash |
| `config.redirectToAppOrigin` | `REDIRECT_TO_APP_ORIGIN` | `true`: requests at other hosts are redirected to `APP_ORIGIN`; passed only if `false` |
| `config.oidcRedirectUri` | `OIDC_REDIRECT_URI` | not set: Krini uses `<APP_ORIGIN>/auth/api/callback` |
| `config.computeAccessRequestUrl` | `COMPUTE_ACCESS_REQUEST_URL` | not set |
| `config.privacy.controller` | `PRIVACY_CONTROLLER` | not set |
| `config.privacy.contact` | `PRIVACY_CONTACT` | not set |
| `config.privacy.noticeUrl` | `PRIVACY_NOTICE_URL` | not set |
| `config.privacy.loginNoticeUrl` | `PRIVACY_LOGIN_NOTICE_URL` | not set |
| `loginProviders.existingSecret` | `LOGIN_PROVIDERS` | none; required: the Secret with the login providers |
| `loginProviders.secretKey` | — | `login-providers`: the key of the Secret |
| `extraEnv` | any | `[]`: further variables, as Kubernetes `EnvVar`s |

The `config` values reach the browser or are public by design (see
[Configuration](configuration.md#settings)): never put a secret into them.
Secrets go into Secrets, which `loginProviders` and `extraEnv`
(`valueFrom.secretKeyRef`) refer to.

`extraEnv` sets variables that the chart has no value for, e.g.
`LISTEN_HOSTNAME` for IPv6-only clusters:

```yaml
extraEnv:
  - name: LISTEN_HOSTNAME
    value: "::"
```

Rendering fails if `extraEnv` sets a variable of the table above or `PORT`,
which the chart sets: use the chart's value instead.

Krini reads the Secret only when it starts: after changing it, restart the
pods with `kubectl rollout restart deployment/krini -n krini`.

### Login providers

The key `loginProviders.secretKey` of the Secret `loginProviders.existingSecret`
holds the JSON array of `LOGIN_PROVIDERS`: one object per provider, with
the fields of [Login providers](login.md#login-providers).

### Image

The image is `krini.image` (default `docker.io/elixircloud/krini`, fully
qualified, as some container runtimes refuse short names) with the tag
`krini.tag`. Without a tag, the chart deploys its `appVersion`: in the chart
of a release (`krini-X.Y.Z.tgz`), the image of that release (`X.Y.Z`); in
the chart in the repository, `dev`, the image of the newest commit on the
branch `dev`, which changes with every commit. Set `krini.tag` only to
deploy another image than the chart's, or include a digest in
`krini.image` (e.g. `docker.io/elixircloud/krini@sha256:...`; `krini.tag`
must then be empty) to pin the image; see [Container
image](deployment.md#container-image) for the tags and how to verify an
image.

The image is pulled whenever a pod starts (`krini.imagePullPolicy: Always`),
so that moving tags deploy their latest image; set `IfNotPresent` for
releases or digests, or `Never` for images loaded into the nodes (e.g. with
`kind load`).

### Exposing Krini

The chart exposes Krini for `hostName` in one of three ways, routing all
paths to it:

- **Ingress** (`krini.ingress`, enabled by default) for any ingress
  controller: `className` sets the Ingress class (default: the cluster's
  default class), and `annotations` sets annotations for the controller;
  they take precedence over the chart's, and `null` removes one of the
  chart's. The chart sets no annotations for particular controllers. By
  default, the Ingress has no TLS, so TLS must be terminated in front of
  the cluster (e.g. by a load balancer); with `https.enabled: true`, the
  Ingress serves HTTPS with a certificate either from cert-manager or from
  a Secret of your own:
    - cert-manager issues it via the issuer `https.issuer` (e.g.
      `letsencrypt-prod`), a ClusterIssuer (annotation
      `cert-manager.io/cluster-issuer`), or with `https.issuerKind:
      Issuer` a namespaced Issuer in the release's namespace (annotation
      `cert-manager.io/issuer`), and renews it; it is kept in the Secret
      `<release>-krini-tls` (`krini-tls` for a release named `krini`).
    - `https.existingSecret` names an existing TLS Secret
      (`kubernetes.io/tls`) in the release's namespace with the
      certificate of `hostName`, which you renew yourself; the chart then
      requests no certificate (set either `https.issuer` or
      `https.existingSecret`; rendering also fails if `annotations` add a
      cert-manager issuer annotation, as cert-manager would overwrite the
      Secret).

    `https.issuerKind` is `ClusterIssuer` by default (also if `null`);
    rendering fails for other kinds, and if `annotations` would give the
    Ingress both `cert-manager.io/cluster-issuer` and
    `cert-manager.io/issuer`, which cert-manager refuses.

- **Gateway API HTTPRoute** (`krini.httpRoute`), attached to an existing
  Gateway whose listener terminates TLS, with the annotations of
  `krini.httpRoute.annotations`; the Ingress must be disabled:

    ```yaml
    krini:
      ingress:
        enabled: false
      httpRoute:
        enabled: true
        parentRefs:
          - name: gateway
            namespace: gateway-system
            sectionName: https
    ```

- **OpenShift Route** (`krini.route`): if neither the Ingress nor the
  HTTPRoute is enabled and the cluster serves Routes, the chart creates a
  Route with TLS terminated at the router, which redirects HTTP to HTTPS.
  `krini.route.annotations` sets annotations of the Route, e.g. the
  router's timeouts (`haproxy.router.openshift.io/timeout`). Set
  `krini.route.enabled: false` for a Route of your own. On OpenShift,
  disable the Ingress (`krini.ingress.enabled: false`), which is enabled
  by default: OpenShift turns a plain Ingress into a Route without TLS.
  The Route has no certificate of its own, so the router serves its
  default (wildcard) certificate; for a host name outside the router's
  domain, use the Ingress with a certificate instead (see [Own host name
  on OpenShift](#own-host-name-on-openshift)).

Krini must be served over HTTPS: it sets secure cookies, and sends users
back to `APP_ORIGIN` (`https://<hostName>`) after the login. If none of
them is enabled, Krini is reachable only within the cluster, and Helm's
notes say so.

If Krini is also reachable at other addresses (e.g., an old Route kept for
existing links), it redirects their requests to `APP_ORIGIN`, where the
login works; probes and `helm test` reach the pod and the Service at
internal addresses, which are never redirected. `config.redirectToAppOrigin:
false` switches the redirect off (see [Several
addresses](deployment.md#several-addresses)).

#### Own host name on OpenShift

To serve a certificate of your own host name (e.g., from Let's Encrypt)
instead of the router's wildcard certificate, use the chart's Ingress,
which OpenShift turns into a Route. Where projects can't create
cluster-scoped resources (and thus no ClusterIssuer), request the
certificate from a namespaced cert-manager `Issuer` in the release's
namespace, which `krini.ingress.https.issuerKind: Issuer` selects:

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: letsencrypt-prod
  namespace: krini
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.org
    privateKeySecretRef:
      name: letsencrypt-prod-account-key
    solvers:
    - http01:
        ingress:
          ingressClassName: openshift-default
```

```yaml
krini:
  ingress:
    enabled: true
    className: openshift-default
    annotations:
      route.openshift.io/termination: edge
    https:
      enabled: true
      issuer: letsencrypt-prod
      issuerKind: Issuer
```

The class `openshift-default` and the annotation
`route.openshift.io/termination` are OpenShift's; the solver's
`ingressClassName` must be the Ingress's `className`, or the HTTP-01
challenge is not answered. cert-manager stores the certificate in the
Secret that the Ingress names (`<release>-krini-tls`), and OpenShift
copies it into the Route it creates for the Ingress, with edge
termination, and renews it there with the Secret. The HTTP-01 challenge
is answered by an Ingress of the solver in the same class, which
OpenShift serves over plain HTTP; check the generated Route (`oc get
route -o yaml`), e.g., that it redirects HTTP to HTTPS
(`insecureEdgeTerminationPolicy`). The router's annotations (e.g., for
timeouts) then go into `krini.ingress.annotations`, which OpenShift
copies to the generated Route, as `krini.route.annotations` apply only to
the chart's own Route. Helm's notes no longer warn about the Ingress on
OpenShift once `krini.ingress.https.enabled` is true.

With a certificate of your own instead of cert-manager, create a TLS
Secret with it in the release's namespace (e.g., `oc create secret tls
krini-certificate --cert=tls.crt --key=tls.key -n krini`) and name it in
`https.existingSecret` instead of `issuer`. OpenShift copies it into the
Route too, but nothing renews it: replace the Secret before the
certificate expires.

```yaml
krini:
  ingress:
    enabled: true
    className: openshift-default
    annotations:
      route.openshift.io/termination: edge
    https:
      enabled: true
      existingSecret: krini-certificate
```

The chart's Ingress serves `hostName` only: for a second host name
(e.g., an old one), create a second Ingress outside the chart for that
host, with the same class, the annotations above and
`cert-manager.io/issuer: letsencrypt-prod`, to the chart's Service (named
like the Deployment, port `http`), and a `tls` section with a Secret of
its own, so that cert-manager issues and renews its certificate, too (a
Route made by hand embeds its certificate, which nothing renews). Krini
redirects the requests at that host to `APP_ORIGIN` (see [Several
addresses](deployment.md#several-addresses)).

### Security

The pod runs with the restricted [Pod Security
Standard](https://kubernetes.io/docs/concepts/security/pod-security-standards/):
as the image's non-root user `bun` (UID 1000, set as `runAsUser` so that
Kubernetes can check `runAsNonRoot`), without privilege escalation or
capabilities, with the seccomp profile `RuntimeDefault` and a read-only
root file system; Next.js's cache goes to an `emptyDir` at `/tmp` (up to
`krini.tmpSizeLimit`, default `256Mi`; `null` for no limit). These are the
defaults of `krini.podSecurityContext` and `krini.securityContext` (see
`values.yaml`). The pod gets no service account token, as Krini
doesn't call the Kubernetes API.

On OpenShift (if the cluster serves `security.openshift.io/v1`), the chart
leaves out `runAsUser`, `runAsGroup`, `fsGroup` and `seccompProfile`: the
security context constraints assign a user ID from the namespace's range
and a seccomp profile, and some clusters reject others. The image runs
with any user ID. To render the chart for OpenShift without access to the
cluster (`helm template`), pass `--api-versions security.openshift.io/v1
--api-versions route.openshift.io/v1`. Override `krini.podSecurityContext`
and `krini.securityContext` for other platforms.

### Network policy

With `krini.networkPolicy.enabled`, a NetworkPolicy allows connections to
Krini only from the peers in `krini.networkPolicy.ingressFrom` (e.g. the
namespace of the ingress controller), and from the node (the kubelet's
probes). There are no default peers, as they depend on the cluster:
rendering fails if the policy is enabled without any, or with a peer
without `podSelector`, `namespaceSelector` or `ipBlock`, which would
allow all sources. The policy also blocks the test pod of `helm test`
(pod labels can be forged, so it gets no exception): run the test before
enabling the policy, or check Krini through the ingress instead. For example, for an
ingress controller in the namespace `ingress-nginx`:

```yaml
krini:
  networkPolicy:
    enabled: true
    ingressFrom:
      - namespaceSelector:
          matchLabels:
            kubernetes.io/metadata.name: ingress-nginx
```

Egress isn't restricted: Krini's server connects to the Cloud Registry, the
login providers and the WES services.

### Pods

- `krini.replicas` (default 1; during a rolling update, such as `helm
  upgrade`, a new pod runs next to the old one for a short time, with the
  same effect as two replicas): sessions are in cookies, and the tabs of a
  browser refresh a session one at a time (see [Sessions and
  logout](login.md#sessions-and-logout)), so any pod can serve any
  request. Only in browsers without Web Locks can two tabs refresh the
  same session at once; each pod remembers the refresh tokens it has just
  used only in memory, to tell such a refresh from a replay, so if the two
  refreshes reach different pods and the provider rotates refresh tokens,
  the session ends and the user is sent to the login page. Sticky sessions
  (e.g. cookie-based affinity of the ingress controller) avoid even that.
  With more than one, a PodDisruptionBudget (`krini.podDisruptionBudget`) lets node
  drains evict one pod at a time (`maxUnavailable: 1`), or as set by
  `minAvailable` or `maxUnavailable`.
- `krini.resources`: requests and limits of the container (default:
  100m CPU and 256Mi memory requested, limits of 500m and 512Mi).
- `krini.probePath` (default `/privacy`): the startup, readiness and
  liveness probes request the privacy notice, which needs no login and no
  other service; `krini.startupProbe`, `readinessProbe` and `livenessProbe`
  replace the default probes.
- `krini.preStopSleepSeconds` (default 5): Krini keeps serving for that
  long after its pod is deleted, so that the ingress controller stops
  sending requests to it first.
- `krini.nodeSelector`, `krini.tolerations` and `krini.affinity` are set on
  the pod.

### Names and labels

Resources are named `<release>-krini`, or after the release if its name
contains `krini` (e.g. `krini` for the release `krini`, `prod-krini` for
the release `prod`); `fullnameOverride` replaces that name, `nameOverride`
the chart name `krini`. Set them only when installing: changing them later
changes the pod selector, which can't be upgraded. All resources have
Helm's [standard
labels](https://helm.sh/docs/chart_best_practices/labels/), and the pods
`app.kubernetes.io/component: app`, e.g.:

```bash
kubectl get pods -n krini -l app.kubernetes.io/instance=krini
```

## Upgrades

Read the release notes (see [Upgrading](upgrading.md)), then download and
[verify](#verifying-the-chart) the chart of the new release, and upgrade
with it (if your values file sets `krini.tag`, set the new version there,
or remove it):

```bash
version=0.2.0
gh release download "v${version}" --repo elixir-cloud-aai/krini \
    --pattern "krini-${version}.tgz*"
helm upgrade krini "krini-${version}.tgz" -n krini -f values-prod.yaml
```

Upgrade with the complete values file rather than `--reuse-values`, so that
new values of the chart get their defaults. The Deployment replaces its pods
one after the other (rolling update).

## Verifying the chart

The chart of a release is packaged, attested and signed by the release
workflow (`.github/workflows/release.yml`), like the image: it has a
[GitHub artifact
attestation](https://docs.github.com/en/actions/concepts/security/artifact-attestations)
of its provenance and a keyless [Sigstore](https://www.sigstore.dev/)
signature, in the bundle `krini-X.Y.Z.tgz.sigstore.json` attached to the
release next to it. Check both before installing it, with the [GitHub
CLI](https://cli.github.com/) and
[cosign](https://docs.sigstore.dev/cosign/system_config/installation/) 3 or
later (`gh release download` above fetches both files), e.g. for 0.1.0:

```bash
version=0.1.0
gh attestation verify "krini-${version}.tgz" --repo elixir-cloud-aai/krini \
    --signer-workflow elixir-cloud-aai/krini/.github/workflows/release.yml \
    --source-ref "refs/tags/v${version}"
cosign verify-blob "krini-${version}.tgz" \
    --bundle "krini-${version}.tgz.sigstore.json" \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com \
    --certificate-identity "https://github.com/elixir-cloud-aai/krini/.github/workflows/release.yml@refs/tags/v${version}"
```

`--source-ref` and the ref in `--certificate-identity` check that the
workflow ran for the release's tag. The chart deploys the release's image,
which you can [verify](deployment.md#verifying-images) too.

## Uninstallation

```bash
helm uninstall krini -n krini
```

This deletes all resources of the release, but not the Secret with the
login providers, which isn't part of it, nor the pod of the last `helm
test` (`krini-test`; Helm keeps it for its logs and replaces it on the
next test): delete it with `kubectl delete pod krini-test -n krini`. Krini keeps no data, so nothing
else is lost.

## Testing the chart

CI lints the chart (`helm lint --strict`) and runs its tests
(`deployment/tests/test-chart.sh`, which renders it with `helm template` and
checks the objects and the errors of invalid values), and installs it on a
kind cluster with the image built from the commit
(`deployment/tests/install-chart.sh`). It also packages the chart as the
release workflow does (`scripts/package-chart.sh`, tested by
`deployment/tests/test-package.sh`). To run them locally, with Helm 3,
yq, jq and, for the installation, Docker, kind and kubectl:

```bash
helm lint deployment --strict -f deployment/ci/test-values.yaml
deployment/tests/test-chart.sh
deployment/tests/test-package.sh
export KUBECONFIG="$PWD/kind-kubeconfig"   # leaves your kubeconfig alone
kind create cluster --name krini
docker build -t krini:chart-ci .
kind load docker-image krini:chart-ci --name krini
deployment/tests/install-chart.sh krini:chart-ci
kind delete cluster --name krini
```
