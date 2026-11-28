#!/usr/bin/env bash
# Tests of the Helm chart: renders it with `helm template` and checks the
# objects with jq (converted with mikefarah/yq v4), and that invalid values
# fail. Run by the `chart` job of `.github/workflows/ci.yml`; needs helm, yq
# and jq.
#
# Usage: deployment/tests/test-chart.sh
set -euo pipefail

chart="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
values="${chart}/ci/test-values.yaml"
failures=0
tests=0
out=""

# Renders the chart as release `krini` (or `RELEASE`) with the CI values and
# the given arguments into `out`, as a JSON array of the objects
render() {
  out="$(helm template "${RELEASE:-krini}" "${chart}" --namespace krini -f "${values}" "$@" \
    | yq ea -o=json -I=0 '[.] | map(select(. != null))')"
}

# Prints the result of a jq expression on the rendered objects of a kind
# (and name, if given as `Kind/name`)
get() {
  local kind="${1%%/*}" name=""
  [[ "$1" == */* ]] && name="${1#*/}"
  jq -r --arg kind "${kind}" --arg name "${name}" \
    ".[] | select(.kind == \$kind and (\$name == \"\" or .metadata.name == \$name)) | $2" <<< "${out}"
}

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

# Checks that rendering the chart at `path` with the given arguments fails
# with a message matching `pattern`
assert_fails_at() {
  local path="$1" description="$2" pattern="$3" error
  shift 3
  tests=$((tests + 1))
  if error="$(helm template krini "${path}" --namespace krini "$@" 2>&1 >/dev/null)"; then
    failures=$((failures + 1))
    printf 'FAIL: %s\n  rendering succeeded\n' "${description}"
  elif ! grep -qE "${pattern}" <<< "${error}"; then
    failures=$((failures + 1))
    printf 'FAIL: %s\n  expected an error matching: %s\n  actual: %s\n' \
      "${description}" "${pattern}" "${error}"
  fi
}

# Checks that rendering the chart with the given arguments fails with a
# message matching `pattern`
assert_fails() {
  assert_fails_at "${chart}" "$@"
}

# Value of an environment variable of the container (`null` if not set)
env_value() {
  get Deployment ".spec.template.spec.containers[0].env[] | select(.name == \"$1\") | .value // \"secret:\" + .valueFrom.secretKeyRef.name + \"/\" + .valueFrom.secretKeyRef.key" | grep . || echo null
}

# Copies of the chart: without the schema (`schemaless`), and with Helm's
# notes as a template (`notes`), which `helm template` doesn't render
copies="$(mktemp -d)"
trap 'rm -rf "${copies}"' EXIT
cp -r "${chart}" "${copies}/schemaless"
rm "${copies}/schemaless/values.schema.json"
cp -r "${chart}" "${copies}/notes"
{
  echo '{{- define "krini.notesTest" -}}'
  cat "${chart}/templates/NOTES.txt"
  echo '{{- end -}}'
} > "${copies}/notes/templates/_notes-test.tpl"
echo 'notes: {{ include "krini.notesTest" . | toJson }}' > "${copies}/notes/templates/notes-test.yaml"

# Prints Helm's notes, rendered with the CI values and the given arguments
notes() {
  helm template krini "${copies}/notes" --namespace krini -f "${values}" "$@" \
    --show-only templates/notes-test.yaml | yq -r .notes
}

# --- Defaults (with the CI values) ---
render
assert_eq "kinds" "$(jq -r '[.[].kind] | sort | join(" ")' <<< "${out}")" \
  "Deployment Ingress Pod Service"
assert_eq "name" "$(get Deployment .metadata.name)" "krini"
assert_eq "standard labels" \
  "$(get Deployment '.metadata.labels | [."app.kubernetes.io/name", ."app.kubernetes.io/instance", ."app.kubernetes.io/version", ."app.kubernetes.io/managed-by", ."helm.sh/chart"] | join(",")')" \
  "krini,krini,dev,Helm,krini-0.0.0"
assert_eq "pod labels" \
  "$(get Deployment '.spec.template.metadata.labels | [."app.kubernetes.io/managed-by", ."app.kubernetes.io/component"] | join(",")')" "Helm,app"
assert_eq "selector" \
  "$(get Deployment '.spec.selector.matchLabels | to_entries | map(.key + "=" + .value) | join(",")')" \
  "app.kubernetes.io/name=krini,app.kubernetes.io/instance=krini,app.kubernetes.io/component=app"
assert_eq "image" "$(get Deployment '.spec.template.spec.containers[0].image')" \
  "docker.io/elixircloud/krini:dev"
assert_eq "pull policy" "$(get Deployment '.spec.template.spec.containers[0].imagePullPolicy')" "Always"
assert_eq "replicas" "$(get Deployment .spec.replicas)" "1"
assert_eq "APP_ORIGIN from hostName" "$(env_value APP_ORIGIN)" "https://krini.example.org"
assert_eq "CLOUD_REGISTRY_URL" "$(env_value CLOUD_REGISTRY_URL)" "https://registry.example.org"
assert_eq "LOGIN_PROVIDERS from the Secret" "$(env_value LOGIN_PROVIDERS)" \
  "secret:krini-login-providers/login-providers"
assert_eq "PORT" "$(env_value PORT)" "3000"
assert_eq "no empty settings" \
  "$(get Deployment '[.spec.template.spec.containers[0].env[].name | select(test("^(PRIVACY_|OIDC_|COMPUTE_|REDIRECT_)"))] | length')" "0"
assert_eq "container port" \
  "$(get Deployment '.spec.template.spec.containers[0].ports[0] | .name + ":" + (.containerPort | tostring)')" "http:3000"
assert_eq "probes" \
  "$(get Deployment '.spec.template.spec.containers[0] | [.startupProbe.httpGet.path, .readinessProbe.httpGet.path, .livenessProbe.httpGet.path, .readinessProbe.httpGet.port] | join(",")')" \
  "/privacy,/privacy,/privacy,http"
assert_eq "pod security context" \
  "$(get Deployment '.spec.template.spec.securityContext | [.runAsNonRoot, .runAsUser, .runAsGroup, .seccompProfile.type] | join(",")')" \
  "true,1000,1000,RuntimeDefault"
assert_eq "container security context" \
  "$(get Deployment '.spec.template.spec.containers[0].securityContext | [.allowPrivilegeEscalation, .readOnlyRootFilesystem, (.capabilities.drop | join("+"))] | join(",")')" \
  "false,true,ALL"
assert_eq "no service account token" \
  "$(get Deployment '.spec.template.spec | [.automountServiceAccountToken, .enableServiceLinks] | join(",")')" "false,false"
assert_eq "writable /tmp" \
  "$(get Deployment '.spec.template.spec | (.containers[0].volumeMounts[] | select(.name == "tmp") | .mountPath) + "," + (.volumes[] | select(.name == "tmp") | .emptyDir.sizeLimit)')" \
  "/tmp,256Mi"
assert_eq "resources" \
  "$(get Deployment '.spec.template.spec.containers[0].resources | [.requests.cpu, .requests.memory, .limits.cpu, .limits.memory] | join(",")')" \
  "100m,256Mi,500m,512Mi"
assert_eq "preStop" \
  "$(get Deployment '.spec.template.spec.containers[0].lifecycle.preStop.exec.command | join(" ")')" "sleep 5"
assert_eq "grace period" "$(get Deployment .spec.template.spec.terminationGracePeriodSeconds)" "35"
assert_eq "service" \
  "$(get Service '.spec | .type + "," + (.ports[0].port | tostring) + "," + .ports[0].targetPort')" "ClusterIP,3000,http"
assert_eq "ingress" \
  "$(get Ingress '.spec.rules[0] | .host + "," + .http.paths[0].path + "," + .http.paths[0].backend.service.name + "," + .http.paths[0].backend.service.port.name')" \
  "krini.example.org,/,krini,http"
assert_eq "ingress without TLS" "$(get Ingress '.spec.tls // "none"')" "none"
assert_eq "test pod" "$(get Pod '.metadata.annotations."helm.sh/hook"')" "test"
assert_eq "test pod not selected by the Service" \
  "$(get Pod '.metadata.labels."app.kubernetes.io/component"')" "test"
assert_eq "test pod image" "$(get Pod '.spec.containers[0].image')" "docker.io/elixircloud/krini:dev"

# --- Names ---
render --set fullnameOverride=portal
assert_eq "fullnameOverride" "$(get Deployment .metadata.name)" "portal"
RELEASE=prod render
assert_eq "release name prefix" "$(get Deployment .metadata.name)" "prod-krini"

# --- Settings ---
render --set config.appOrigin=https://portal.example.org \
  --set config.oidcRedirectUri=https://portal.example.org/auth/api/callback \
  --set config.computeAccessRequestUrl=https://example.org/access \
  --set 'config.privacy.controller=Example Institute\, Example City' \
  --set config.privacy.contact=privacy@example.org \
  --set config.privacy.noticeUrl=https://example.org/privacy \
  --set config.privacy.loginNoticeUrl=https://login.example.org/privacy \
  --set loginProviders.secretKey=providers.json
assert_eq "appOrigin" "$(env_value APP_ORIGIN)" "https://portal.example.org"
assert_eq "oidcRedirectUri" "$(env_value OIDC_REDIRECT_URI)" "https://portal.example.org/auth/api/callback"
assert_eq "computeAccessRequestUrl" "$(env_value COMPUTE_ACCESS_REQUEST_URL)" "https://example.org/access"
assert_eq "privacy controller" "$(env_value PRIVACY_CONTROLLER)" "Example Institute, Example City"
assert_eq "privacy contact" "$(env_value PRIVACY_CONTACT)" "privacy@example.org"
assert_eq "privacy notice" "$(env_value PRIVACY_NOTICE_URL)" "https://example.org/privacy"
assert_eq "privacy login notice" "$(env_value PRIVACY_LOGIN_NOTICE_URL)" "https://login.example.org/privacy"
assert_eq "secret key" "$(env_value LOGIN_PROVIDERS)" "secret:krini-login-providers/providers.json"
render --set config.redirectToAppOrigin=false
assert_eq "redirectToAppOrigin off" "$(env_value REDIRECT_TO_APP_ORIGIN)" "false"
assert_eq "built-in examples by default" \
  "$(env_value TASK_EXAMPLES),$(env_value WORKFLOW_EXAMPLES)" "null,null"
render --set-json 'config.taskExamples=[{"name":"Hello","task":{"executors":[{"image":"alpine","command":["echo","hello"]}]}}]' \
  --set-json 'config.workflowExamples=[]'
assert_eq "taskExamples as JSON" "$(env_value TASK_EXAMPLES)" \
  '[{"name":"Hello","task":{"executors":[{"command":["echo","hello"],"image":"alpine"}]}}]'
assert_eq "no workflow examples" "$(env_value WORKFLOW_EXAMPLES)" "[]"
render --set-json 'extraEnv=[{"name":"LISTEN_HOSTNAME","value":"::"}]'
assert_eq "extraEnv" "$(env_value LISTEN_HOSTNAME)" "::"
render --set hostName= --set config.appOrigin=https://portal.example.org --set krini.ingress.enabled=false
assert_eq "appOrigin without hostName" "$(env_value APP_ORIGIN)" "https://portal.example.org"
assert_eq "no Ingress without hostName" "$(get Ingress .kind)" ""

# --- Image ---
render --set krini.tag=0.1.0 --set krini.imagePullPolicy=IfNotPresent
assert_eq "tag" "$(get Deployment '.spec.template.spec.containers[0].image')" "docker.io/elixircloud/krini:0.1.0"
assert_eq "version label of the tag" \
  "$(get Deployment '[.metadata.labels, .spec.template.metadata.labels] | map(."app.kubernetes.io/version") | join(",")')" "0.1.0,0.1.0"
assert_eq "pull policy override" "$(get Deployment '.spec.template.spec.containers[0].imagePullPolicy')" "IfNotPresent"
render --set krini.image=registry.example.org/krini@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
assert_eq "image with digest" "$(get Deployment '.spec.template.spec.containers[0].image')" \
  "registry.example.org/krini@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
assert_eq "version label of a digest" "$(get Deployment '.metadata.labels."app.kubernetes.io/version" // "none"')" "none"
render --set krini.image=docker.io/elixircloud/krini:0.2.0
assert_eq "version label of the image's tag" "$(get Deployment '.metadata.labels."app.kubernetes.io/version"')" "0.2.0"
render --set krini.tag=_1.0+build.
assert_eq "version label as a valid label value" "$(get Deployment '.metadata.labels."app.kubernetes.io/version"')" "1.0_build"
render --set global.example=1
assert_eq "global values of a parent chart" "$(get Deployment .metadata.name)" "krini"
render --set krini.image=localhost:5000/krini
assert_eq "registry with port" "$(get Deployment '.spec.template.spec.containers[0].image')" "localhost:5000/krini:dev"

# --- Pod settings ---
render --set krini.replicas=3
assert_eq "replicas" "$(get Deployment .spec.replicas)" "3"
assert_eq "PodDisruptionBudget" "$(get PodDisruptionBudget .spec.maxUnavailable)" "1"
render --set krini.replicas=3 --set krini.podDisruptionBudget.minAvailable=50%
assert_eq "PodDisruptionBudget minAvailable" "$(get PodDisruptionBudget .spec.minAvailable)" "50%"
render --set krini.replicas=3 --set krini.podDisruptionBudget.enabled=false
assert_eq "no PodDisruptionBudget" "$(get PodDisruptionBudget .kind)" ""
render --set krini.preStopSleepSeconds=0 --set krini.tmpSizeLimit=null
assert_eq "no preStop" "$(get Deployment '.spec.template.spec.containers[0].lifecycle // "none"')" "none"
assert_eq "grace period without preStop" "$(get Deployment .spec.template.spec.terminationGracePeriodSeconds)" "30"
assert_eq "/tmp without limit" "$(get Deployment '.spec.template.spec.volumes[] | select(.name == "tmp") | .emptyDir | tojson')" "{}"
render --set-json 'krini.readinessProbe={"tcpSocket":{"port":"http"}}'
assert_eq "probe override" \
  "$(get Deployment '.spec.template.spec.containers[0].readinessProbe | tojson')" '{"tcpSocket":{"port":"http"}}'
render --set-json 'krini.startupProbe={"tcpSocket":{"port":"http"}}' \
  --set-json 'krini.livenessProbe={"tcpSocket":{"port":"http"}}' \
  --set krini.tmpSizeLimit=134217728
assert_eq "startup and liveness probe overrides" \
  "$(get Deployment '.spec.template.spec.containers[0] | [.startupProbe.tcpSocket.port, .livenessProbe.tcpSocket.port] | join(",")')" \
  "http,http"
assert_eq "/tmp limit in bytes" \
  "$(get Deployment '.spec.template.spec.volumes[] | select(.name == "tmp") | .emptyDir.sizeLimit')" "134217728"
render --set krini.replicas=2 --set krini.podDisruptionBudget.maxUnavailable=0
assert_eq "PodDisruptionBudget maxUnavailable" "$(get PodDisruptionBudget .spec.maxUnavailable)" "0"
render --set fullnameOverride=a-very-long-name-of-a-release-that-has-more-than-sixty-three-chars
assert_eq "test pod name within 63 characters" "$(get Pod '.metadata.name | length <= 63')" "true"
render --set-json 'krini.nodeSelector={"disk":"ssd"}' \
  --set-json 'krini.tolerations=[{"key":"k","operator":"Exists"}]' \
  --set-json 'krini.affinity={"nodeAffinity":{}}'
assert_eq "nodeSelector" "$(get Deployment .spec.template.spec.nodeSelector.disk)" "ssd"
assert_eq "tolerations" "$(get Deployment '.spec.template.spec.tolerations[0].key')" "k"
assert_eq "affinity" "$(get Deployment '.spec.template.spec.affinity | keys | join(",")')" "nodeAffinity"

# --- OpenShift ---
render --set krini.ingress.enabled=false \
  --api-versions security.openshift.io/v1 --api-versions route.openshift.io/v1
assert_eq "OpenShift pod security context" \
  "$(get Deployment '.spec.template.spec.securityContext | tojson')" '{"runAsNonRoot":true}'
assert_eq "Route" \
  "$(get Route '.spec | .host + "," + .to.name + "," + .port.targetPort + "," + .tls.termination + "," + .tls.insecureEdgeTerminationPolicy')" \
  "krini.example.org,krini,http,edge,Redirect"
assert_eq "no Ingress" "$(get Ingress .kind)" ""
render --set krini.ingress.enabled=false --api-versions route.openshift.io/v1 \
  --set krini.route.annotations.haproxy\\.router\\.openshift\\.io/timeout=60s
assert_eq "Route annotations" \
  "$(get Route '.metadata.annotations."haproxy.router.openshift.io/timeout"')" "60s"
render --set krini.ingress.enabled=false --set krini.route.enabled=false --api-versions route.openshift.io/v1
assert_eq "Route disabled" "$(get Route .kind)" ""
render --set krini.ingress.enabled=false
assert_eq "no Route without the API" "$(get Route .kind)" ""

# --- Ingress and HTTPRoute ---
render --set krini.ingress.className=traefik --set krini.ingress.https.enabled=true \
  --set krini.ingress.https.issuer=letsencrypt-prod \
  --set krini.ingress.annotations.example\\.org/a=b
assert_eq "ingress class" "$(get Ingress .spec.ingressClassName)" "traefik"
assert_eq "ingress TLS" "$(get Ingress '.spec.tls[0] | .hosts[0] + "," + .secretName')" "krini.example.org,krini-tls"
assert_eq "ingress annotations" \
  "$(get Ingress '.metadata.annotations | to_entries | map(.key + "=" + .value) | join(",")')" \
  "cert-manager.io/cluster-issuer=letsencrypt-prod,example.org/a=b"
render --set krini.ingress.https.enabled=true --set krini.ingress.https.issuer=letsencrypt-prod \
  --set-json 'krini.ingress.annotations={"cert-manager.io/cluster-issuer":null}'
assert_eq "ingress annotation removed" "$(get Ingress '.metadata.annotations // {} | tojson')" "{}"
for kind in ClusterIssuer:cluster-issuer Issuer:issuer; do
  render --set krini.ingress.https.enabled=true --set krini.ingress.https.issuer=letsencrypt-prod \
    --set krini.ingress.https.issuerKind="${kind%%:*}"
  assert_eq "ingress issuerKind ${kind%%:*}" \
    "$(get Ingress '.metadata.annotations | to_entries | map(.key + "=" + .value) | join(",")')" \
    "cert-manager.io/${kind#*:}=letsencrypt-prod"
  assert_eq "ingress TLS with issuerKind ${kind%%:*}" \
    "$(get Ingress '.spec.tls[0] | .hosts[0] + "," + .secretName')" "krini.example.org,krini-tls"
done
render --set krini.ingress.https.enabled=true --set krini.ingress.https.issuer=letsencrypt-prod \
  --set krini.ingress.https.issuerKind=null
assert_eq "ingress issuerKind null" \
  "$(get Ingress '.metadata.annotations | keys | join(",")')" "cert-manager.io/cluster-issuer"
render --set krini.ingress.https.issuerKind=Issuer
assert_eq "ingress issuerKind without HTTPS" \
  "$(get Ingress '[.metadata.annotations // {}, .spec.tls // "none"] | tojson')" '[{},"none"]'
render --set krini.ingress.https.enabled=true --set krini.ingress.https.issuer=letsencrypt-prod \
  --set krini.ingress.https.issuerKind=Issuer \
  --set-json 'krini.ingress.annotations={"cert-manager.io/issuer":null}'
assert_eq "ingress Issuer annotation removed" "$(get Ingress '.metadata.annotations // {} | tojson')" "{}"
render --set krini.ingress.https.enabled=true --set krini.ingress.https.issuer=letsencrypt-prod \
  --set krini.ingress.https.issuerKind=Issuer \
  --set krini.ingress.annotations.cert-manager\\.io/issuer=other
assert_eq "ingress Issuer annotation overridden" \
  "$(get Ingress '.metadata.annotations | tojson')" '{"cert-manager.io/issuer":"other"}'
render --set krini.ingress.https.enabled=true --set krini.ingress.https.existingSecret=krini-certificate
assert_eq "ingress TLS from an existing Secret" \
  "$(get Ingress '.spec.tls[0] | .hosts[0] + "," + .secretName')" "krini.example.org,krini-certificate"
assert_eq "no cert-manager annotation with an existing Secret" \
  "$(get Ingress '.metadata.annotations // {} | tojson')" "{}"
render --set krini.ingress.https.enabled=true --set krini.ingress.https.existingSecret=krini-certificate \
  --set krini.ingress.https.issuerKind=Issuer
assert_eq "no Issuer annotation with an existing Secret" \
  "$(get Ingress '[.metadata.annotations // {}, .spec.tls[0].secretName] | tojson')" '[{},"krini-certificate"]'
render --set krini.ingress.https.existingSecret=krini-certificate
assert_eq "existing Secret without HTTPS" "$(get Ingress '.spec.tls // "none"')" "none"
render --set krini.ingress.enabled=false --set krini.httpRoute.enabled=true \
  --set-json 'krini.httpRoute.parentRefs=[{"name":"gateway","namespace":"gateway-system","sectionName":"https"}]'
assert_eq "HTTPRoute" \
  "$(get HTTPRoute '.spec | .hostnames[0] + "," + .parentRefs[0].name + "," + .rules[0].backendRefs[0].name + "," + (.rules[0].backendRefs[0].port | tostring)')" \
  "krini.example.org,gateway,krini,3000"
render --set krini.ingress.enabled=false --set krini.httpRoute.enabled=true \
  --set-json 'krini.httpRoute.parentRefs=[{"name":"gateway"}]' \
  --set krini.httpRoute.annotations.example\\.org/a=b
assert_eq "HTTPRoute annotations" "$(get HTTPRoute '.metadata.annotations."example.org/a"')" "b"

# --- NetworkPolicy ---
render --set krini.networkPolicy.enabled=true \
  --set-json 'krini.networkPolicy.ingressFrom=[{"namespaceSelector":{"matchLabels":{"kubernetes.io/metadata.name":"ingress"}}}]'
assert_eq "NetworkPolicy" \
  "$(get NetworkPolicy '.spec | (.ingress[0].ports[0].port | tostring) + "," + .podSelector.matchLabels."app.kubernetes.io/component"')" \
  "3000,app"

# --- Notes ---
assert_eq "notes: Ingress without TLS on OpenShift" \
  "$(notes --api-versions route.openshift.io/v1 | grep -c 'Ingress without TLS, which OpenShift serves without TLS')" "1"
assert_eq "notes: Ingress with TLS on OpenShift" \
  "$(notes --api-versions route.openshift.io/v1 --set krini.ingress.https.enabled=true \
    --set krini.ingress.https.issuer=letsencrypt-prod --set krini.ingress.https.issuerKind=Issuer \
    | grep -c 'without TLS' || true)" "0"
assert_eq "notes: Ingress with an existing Secret on OpenShift" \
  "$(notes --api-versions route.openshift.io/v1 --set krini.ingress.https.enabled=true \
    --set krini.ingress.https.existingSecret=krini-certificate | grep -c 'without TLS' || true)" "0"
assert_eq "notes: Ingress without TLS" \
  "$(notes | grep -c 'The Ingress has no TLS')" "1"

# --- Invalid values ---
assert_fails "no registry" "cloudRegistryUrl" \
  --set hostName=krini.example.org --set loginProviders.existingSecret=s
assert_fails "no login providers" "loginProviders.existingSecret" \
  --set hostName=krini.example.org --set config.cloudRegistryUrl=https://registry.example.org
assert_fails "no origin" "hostName|appOrigin" -f "${values}" --set hostName= --set krini.ingress.enabled=false
assert_fails "Ingress without hostName" "hostName" -f "${values}" --set hostName= \
  --set config.appOrigin=https://portal.example.org
assert_fails "registry URL scheme" "cloudRegistryUrl" -f "${values}" --set config.cloudRegistryUrl=registry.example.org
assert_fails "appOrigin scheme" "appOrigin" -f "${values}" --set config.appOrigin=portal.example.org
assert_fails "appOrigin over HTTP" "appOrigin" -f "${values}" --set config.appOrigin=http://portal.example.org
assert_fails "appOrigin with a path" "appOrigin" -f "${values}" --set config.appOrigin=https://example.org/krini
assert_fails "privacy notice over HTTP" "noticeUrl" -f "${values}" --set config.privacy.noticeUrl=http://example.org/privacy
assert_fails "zero /tmp limit" "tmpSizeLimit" -f "${values}" --set-string krini.tmpSizeLimit=0Mi
assert_fails "host name with scheme" "hostName" -f "${values}" --set hostName=https://krini.example.org
assert_fails "unknown value" "additional properties|not allowed" -f "${values}" --set krini.unknown=1
assert_fails "tag and image tag" "krini.tag" -f "${values}" --set krini.image=docker.io/elixircloud/krini:0.1.0 --set krini.tag=0.1.0
assert_fails "Ingress and HTTPRoute" "httpRoute" -f "${values}" --set krini.httpRoute.enabled=true \
  --set-json 'krini.httpRoute.parentRefs=[{"name":"gateway"}]'
assert_fails "HTTPRoute without parentRefs" "parentRefs" -f "${values}" \
  --set krini.ingress.enabled=false --set krini.httpRoute.enabled=true
assert_fails "NetworkPolicy without peers" "ingressFrom" -f "${values}" --set krini.networkPolicy.enabled=true
assert_fails "NetworkPolicy peer without selectors" "podSelector, namespaceSelector or ipBlock" -f "${values}" \
  --set krini.networkPolicy.enabled=true --set-json 'krini.networkPolicy.ingressFrom=[{}]'
assert_fails "PodDisruptionBudget bounds" "minAvailable|maxUnavailable" -f "${values}" --set krini.replicas=2 \
  --set krini.podDisruptionBudget.minAvailable=1 --set krini.podDisruptionBudget.maxUnavailable=1
assert_fails "extraEnv for a setting of the chart" "APP_ORIGIN" -f "${values}" \
  --set-json 'extraEnv=[{"name":"APP_ORIGIN","value":"https://other.example.org"}]'
assert_fails "extraEnv for the redirect" "REDIRECT_TO_APP_ORIGIN" -f "${values}" \
  --set-json 'extraEnv=[{"name":"REDIRECT_TO_APP_ORIGIN","value":"false"}]'
assert_fails "redirectToAppOrigin not a boolean" "redirectToAppOrigin" -f "${values}" \
  --set config.redirectToAppOrigin=no
assert_fails "taskExamples not a list" "taskExamples" -f "${values}" \
  --set config.taskExamples=hello
assert_fails "extraEnv for the examples" "WORKFLOW_EXAMPLES" -f "${values}" \
  --set-json 'extraEnv=[{"name":"WORKFLOW_EXAMPLES","value":"[]"}]'
assert_fails "HTTPS without issuer" "https.issuer must be set" -f "${values}" --set krini.ingress.https.enabled=true
for annotation in cert-manager\\.io/issuer=letsencrypt-prod cert-manager\\.io/cluster-issuer=letsencrypt-prod \
  kubernetes\\.io/tls-acme=true; do
  assert_fails "existing Secret with the annotation ${annotation//\\/}" \
    "krini.ingress.https.existingSecret must not be set together with an annotation" -f "${values}" \
    --set krini.ingress.https.enabled=true --set krini.ingress.https.existingSecret=krini-certificate \
    --set-string "krini.ingress.annotations.${annotation}"
done
assert_fails "issuerKind not in the schema" "at '/krini/ingress/https/issuerKind'" -f "${values}" \
  --set krini.ingress.https.enabled=true --set krini.ingress.https.issuer=letsencrypt-prod \
  --set krini.ingress.https.issuerKind=Issuers
assert_fails "issuer and existing Secret" "either krini.ingress.https.issuer or krini.ingress.https.existingSecret" \
  -f "${values}" --set krini.ingress.https.enabled=true --set krini.ingress.https.issuer=letsencrypt-prod \
  --set krini.ingress.https.existingSecret=krini-certificate
assert_fails "both issuer annotations" "must not have both annotations cert-manager.io/issuer and cert-manager.io/cluster-issuer" \
  -f "${values}" --set krini.ingress.https.enabled=true --set krini.ingress.https.issuer=letsencrypt-prod \
  --set krini.ingress.https.issuerKind=Issuer \
  --set krini.ingress.annotations.cert-manager\\.io/cluster-issuer=other
# Without the schema, the template rejects other kinds too
for kind in Issuers issuer ""; do
  assert_fails_at "${copies}/schemaless" "issuerKind '${kind}' without the schema" \
    "krini.ingress.https.issuerKind must be ClusterIssuer or Issuer" -f "${values}" \
    --set krini.ingress.https.enabled=true --set krini.ingress.https.issuer=letsencrypt-prod \
    --set-string krini.ingress.https.issuerKind="${kind}"
done
assert_fails "replicas" "replicas" -f "${values}" --set krini.replicas=0

echo "${tests} tests, ${failures} failures"
[[ "${failures}" -eq 0 ]]
