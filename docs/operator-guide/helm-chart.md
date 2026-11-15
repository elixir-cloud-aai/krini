# Helm chart

The Helm chart in
[`deployment/`](https://github.com/elixir-cloud-aai/krini/tree/dev/deployment)
deploys Krini on Kubernetes and OpenShift: a Deployment of the container
image, a Service, and an Ingress, a Gateway API HTTPRoute or an OpenShift
Route. It has no defaults for any deployment: you set the host name, the
Cloud Registry and the login providers, and the login providers' secrets
come only from a Kubernetes Secret of your own.

The chart isn't published to a chart repository yet: install it from a
checkout of the repository, at the tag of the release that you deploy.

## Prerequisites

- Kubernetes 1.27 or later (or OpenShift 4.14 or later) and Helm 3.
- One way to reach Krini from outside the cluster: an ingress controller, a
  Gateway of the [Gateway API](https://gateway-api.sigs.k8s.io/), or
  OpenShift's router.
- An OpenID Connect client at each login provider, with the redirect URI
  `https://<host name>/auth/api/callback`, and a Cloud Registry with the TES
  and WES services; see [Service configuration](deployment.md#service-configuration)
  for what the services need.

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
   `values-prod.yaml`, with the release to deploy (see [Image](#image)):

    ```yaml
    hostName: krini.example.org
    config:
      cloudRegistryUrl: https://registry.example.org
      privacy:
        controller: Example Institute, Example Street 1, Example City
        contact: privacy@example.org
    loginProviders:
      existingSecret: krini-login-providers
    krini:
      tag: "0.1.0"
    ```

4. Install the chart from a checkout of the release's tag:

    ```bash
    git clone --depth 1 --branch v0.1.0 https://github.com/elixir-cloud-aai/krini.git
    helm install krini krini/deployment -n krini -f values-prod.yaml
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
| `config.appOrigin` | `APP_ORIGIN` | `https://<hostName>` |
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
holds the JSON array of `LOGIN_PROVIDERS`. Each provider is an object with
these fields; providers without one of the required fields, or with the
`id` of an earlier one, are ignored:

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Identifier of the provider, unique in the array |
| `issuer` | yes | OpenID Connect issuer URL (Krini reads its discovery document) |
| `clientId` | yes | Client ID of Krini at the provider |
| `clientSecret` | yes | Client secret of Krini at the provider |
| `name` | no | Name on the login page; the `id` if not set |
| `logo` | no | URL of a logo for the login page |
| `scopes` | no | Scopes to request; `["openid", "profile", "email", "offline_access"]` if not set |
| `groupsClaim` | no | Claim with the user's groups, for the access tiers |
| `groupsFromUserinfo` | no | Whether to read the groups from the user info (default `true`) |
| `computeGroups` | no | Groups whose members may run tasks and workflows |
| `adminGroups` | no | Groups whose members are admins |
| `groupSubgroupSeparator` | no | Separator of subgroups in group names (e.g. `:`), so that members of subgroups count too |

### Image

The image is `krini.image` (default `docker.io/elixircloud/krini`, fully
qualified, as some container runtimes refuse short names) with the tag
`krini.tag`. Without a tag, the chart deploys its `appVersion`, `dev`: the
image of the newest commit on the branch `dev`, which changes with every
commit. In production, set the tag of a release (`X.Y.Z`), or include a
digest in `krini.image` (e.g. `docker.io/elixircloud/krini@sha256:...`;
`krini.tag` must then be empty); see [Container
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
  default class), and `annotations` sets annotations for the controller.
  The chart sets no annotations for particular controllers. By default, the
  Ingress has no TLS, so TLS must be terminated in front of the cluster
  (e.g. by a load balancer); with `https.enabled: true`, cert-manager issues
  a certificate via the ClusterIssuer `https.issuer`, and the Ingress serves
  HTTPS with it (Secret `<release>-krini-tls`, or `krini-tls` for a release
  named `krini`).
- **Gateway API HTTPRoute** (`krini.httpRoute`), attached to an existing
  Gateway whose listener terminates TLS; the Ingress must be disabled:

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
  Set `krini.route.enabled: false` for a Route of your own.

Krini must be served over HTTPS: it sets secure cookies, and sends users
back to `APP_ORIGIN` (`https://<hostName>`) after the login. If none of
them is enabled, Krini is reachable only within the cluster, and Helm's
notes say so.

### Security

The pod runs with the restricted [Pod Security
Standard](https://kubernetes.io/docs/concepts/security/pod-security-standards/):
as the image's non-root user `bun` (UID 1000, set as `runAsUser` so that
Kubernetes can check `runAsNonRoot`), without privilege escalation or
capabilities, with the seccomp profile `RuntimeDefault` and a read-only
root file system; Next.js's cache goes to an `emptyDir` at `/tmp` (up to
`krini.tmpSizeLimit`). The pod gets no service account token, as Krini
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
rendering fails if the policy is enabled without any. For example, for an
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

- `krini.replicas` (default 1): Krini keeps no state of its own (sessions
  are in cookies), so any number of pods serve the same users. With more
  than one, a PodDisruptionBudget (`krini.podDisruptionBudget`) lets node
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

Read the release notes (see [Upgrading](upgrading.md)), then upgrade from a
checkout of the new release's tag, with its tag in the values file:

```bash
helm upgrade krini krini/deployment -n krini -f values-prod.yaml
```

Upgrade with the complete values file rather than `--reuse-values`, so that
new values of the chart get their defaults. The Deployment replaces its pods
one after the other (rolling update).

## Uninstallation

```bash
helm uninstall krini -n krini
```

This deletes all resources of the release, but not the Secret with the
login providers, which isn't part of it. Krini keeps no data, so nothing
else is lost.

## Testing the chart

CI lints the chart (`helm lint --strict`) and runs its tests
(`deployment/tests/test-chart.sh`, which renders it with `helm template` and
checks the objects and the errors of invalid values), and installs it on a
kind cluster with the image built from the commit
(`deployment/tests/install-chart.sh`). To run them locally, with Helm 3,
yq, jq and, for the installation, Docker, kind and kubectl:

```bash
helm lint deployment --strict -f deployment/ci/test-values.yaml
deployment/tests/test-chart.sh
export KUBECONFIG="$PWD/kind-kubeconfig"   # leaves your kubeconfig alone
kind create cluster --name krini
docker build -t krini:chart-ci .
kind load docker-image krini:chart-ci --name krini
deployment/tests/install-chart.sh krini:chart-ci
kind delete cluster --name krini
```
