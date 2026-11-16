{{/*
Name of the chart, or `nameOverride`.
*/}}
{{- define "krini.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Name of the resources: the release name, followed by the chart name unless
the release name contains it, or `fullnameOverride`; truncated to 63
characters, as some names must be DNS labels.
*/}}
{{- define "krini.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := include "krini.name" . -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Labels that select the pods.
*/}}
{{- define "krini.selectorLabels" -}}
app.kubernetes.io/name: {{ include "krini.name" . | quote }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
app.kubernetes.io/component: app
{{- end -}}

{{/*
Version of the deployed image, as a label value: `krini.tag`, the tag in
`krini.image`, or the chart's `appVersion` if the image has neither tag nor
digest; empty for an image with a digest only. Characters that labels don't
allow become `_`, and the value starts and ends with a letter or digit.
*/}}
{{- define "krini.version" -}}
{{- $version := .Values.krini.tag -}}
{{- if not $version -}}
{{- $image := .Values.krini.image | default "" -}}
{{- $ref := regexFind "[^/]+$" $image | splitList "@" | first -}}
{{- if contains ":" $ref -}}
{{- $version = splitList ":" $ref | last -}}
{{- else if not (contains "@" $image) -}}
{{- $version = .Chart.AppVersion -}}
{{- end -}}
{{- end -}}
{{- $version = regexReplaceAll "[^A-Za-z0-9_.-]" $version "_" | trunc 63 -}}
{{- regexReplaceAll "^[^A-Za-z0-9]+|[^A-Za-z0-9]+$" $version "" -}}
{{- end -}}

{{/*
Standard labels (see https://helm.sh/docs/chart_best_practices/labels/),
without the component; the version is that of the image (see
`krini.version`), left out if unknown.
*/}}
{{- define "krini.baseLabels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/name: {{ include "krini.name" . | quote }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
{{- with include "krini.version" . }}
app.kubernetes.io/version: {{ . | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/*
Labels of the app's resources; the test pod of `helm test` has the
component `test` instead, so that the Service doesn't select it.
*/}}
{{- define "krini.labels" -}}
{{ include "krini.baseLabels" . }}
app.kubernetes.io/component: app
{{- end -}}

{{/*
Port of Krini's server (`PORT`), of the container, the Service and the
routes.
*/}}
{{- define "krini.port" -}}
3000
{{- end -}}

{{/*
Image: `krini.image` with `krini.tag`, by default the chart's `appVersion`;
an image with a tag or digest is used as it is (a colon after the last
slash is a tag, not a registry port).
*/}}
{{- define "krini.image" -}}
{{- $values := .Values.krini -}}
{{- $image := required "krini.image must be set" $values.image -}}
{{- if or (contains "@" $image) (regexMatch ":[^/]+$" $image) -}}
{{- if $values.tag -}}
{{- fail "krini.tag must not be set if krini.image includes a tag or digest" -}}
{{- end -}}
{{- $image -}}
{{- else -}}
{{- printf "%s:%s" $image ($values.tag | default .Chart.AppVersion) -}}
{{- end -}}
{{- end -}}

{{/*
Origin of Krini as browsers see it (`APP_ORIGIN`): `config.appOrigin`, or
`https://<hostName>`, as TLS is terminated by the ingress, the Gateway, the
Route or a proxy in front of the cluster.
*/}}
{{- define "krini.appOrigin" -}}
{{- $origin := .Values.config.appOrigin -}}
{{- if not $origin -}}
{{- $hostName := required "hostName or config.appOrigin must be set: Krini sends users back to its origin after the login (APP_ORIGIN)" .Values.hostName -}}
{{- $origin = printf "https://%s" $hostName -}}
{{- end -}}
{{- $origin -}}
{{- end -}}

{{/*
Environment variables of the settings, in the order of the docs; empty
settings are left out, so that Krini's defaults apply.
*/}}
{{- define "krini.env" -}}
{{- $config := .Values.config -}}
{{- $privacy := $config.privacy | default dict -}}
{{- $vars := list
  (list "CLOUD_REGISTRY_URL" (required "config.cloudRegistryUrl must be set to the base URL of the Cloud Registry" $config.cloudRegistryUrl))
  (list "APP_ORIGIN" (include "krini.appOrigin" .))
  (list "OIDC_REDIRECT_URI" $config.oidcRedirectUri)
  (list "COMPUTE_ACCESS_REQUEST_URL" $config.computeAccessRequestUrl)
  (list "PRIVACY_CONTROLLER" $privacy.controller)
  (list "PRIVACY_CONTACT" $privacy.contact)
  (list "PRIVACY_NOTICE_URL" $privacy.noticeUrl)
  (list "PRIVACY_LOGIN_NOTICE_URL" $privacy.loginNoticeUrl)
-}}
{{- range $var := $vars }}
{{- with index $var 1 }}
- name: {{ index $var 0 }}
  value: {{ . | quote }}
{{- end }}
{{- end }}
- name: LOGIN_PROVIDERS
  valueFrom:
    secretKeyRef:
      name: {{ required "loginProviders.existingSecret must be set to the name of a Secret with the login providers (LOGIN_PROVIDERS), see docs/operator-guide/helm-chart.md" .Values.loginProviders.existingSecret | quote }}
      key: {{ required "loginProviders.secretKey must be set" .Values.loginProviders.secretKey | quote }}
# The port of the Service and the probes
- name: PORT
  value: {{ include "krini.port" . | quote }}
{{- end -}}

{{/*
Names of the environment variables that the chart sets, which `extraEnv`
must not set (Kubernetes would use the last one, silently).
*/}}
{{- define "krini.reservedEnv" -}}
{{- toJson (list "CLOUD_REGISTRY_URL" "APP_ORIGIN" "OIDC_REDIRECT_URI" "COMPUTE_ACCESS_REQUEST_URL" "PRIVACY_CONTROLLER" "PRIVACY_CONTACT" "PRIVACY_NOTICE_URL" "PRIVACY_LOGIN_NOTICE_URL" "LOGIN_PROVIDERS" "PORT") -}}
{{- end -}}

{{/*
`extraEnv`, after checking that it doesn't set the chart's variables.
*/}}
{{- define "krini.extraEnv" -}}
{{- $reserved := include "krini.reservedEnv" . | fromJsonArray -}}
{{- range $var := .Values.extraEnv | default list -}}
{{- if has $var.name $reserved -}}
{{- fail (printf "extraEnv must not set %s, which the chart sets: use the chart's value for it (see docs/operator-guide/helm-chart.md, Configuration)" $var.name) -}}
{{- end -}}
{{- end -}}
{{- with .Values.extraEnv -}}
{{- toYaml . -}}
{{- end -}}
{{- end -}}

{{/*
Security context from the values; call with a dict of the root context
(`root`) and the context (`context`). On OpenShift, which assigns user and
group IDs from the namespace's range (and rejects others under the default
security context constraints) and sets the seccomp profile (some clusters,
e.g., CSC Rahti, reject `RuntimeDefault`), these are omitted.
*/}}
{{- define "krini.securityContext" -}}
{{- $context := .context | default dict -}}
{{- if .root.Capabilities.APIVersions.Has "security.openshift.io/v1" -}}
{{- $context = omit $context "runAsUser" "runAsGroup" "fsGroup" "seccompProfile" -}}
{{- end -}}
{{- toYaml $context -}}
{{- end -}}

{{/*
`emptyDir` volume source with an optional size limit (a quantity string or a
number of bytes; numbers from values files are floats, so they are rendered
as integers); none if `null`.
*/}}
{{- define "krini.emptyDir" -}}
{{- if kindIs "invalid" . -}}
emptyDir: {}
{{- else -}}
emptyDir:
  sizeLimit: {{ ternary . (int64 . | toString) (kindIs "string" .) | quote }}
{{- end -}}
{{- end -}}

{{/*
Whether an OpenShift Route is created ("true") or not (empty): unless
`krini.route.enabled` is false, without an Ingress or HTTPRoute, if the
cluster serves Routes.
*/}}
{{- define "krini.routeEnabled" -}}
{{- $values := .Values.krini -}}
{{- $exposed := or $values.ingress.enabled $values.httpRoute.enabled -}}
{{- if and $values.route.enabled (not $exposed) (.Capabilities.APIVersions.Has "route.openshift.io/v1") -}}
true
{{- end -}}
{{- end -}}

{{/*
Checks of the values that the schema can't express; renders nothing.
Included by `validate.yaml`.
*/}}
{{- define "krini.validate" -}}
{{- if and .Values.krini.ingress.enabled .Values.krini.httpRoute.enabled -}}
{{- fail "krini.httpRoute.enabled requires krini.ingress.enabled: false (expose Krini with either an Ingress or an HTTPRoute)" -}}
{{- end -}}
{{- $budget := .Values.krini.podDisruptionBudget | default dict -}}
{{- if and (not (kindIs "invalid" $budget.minAvailable)) (not (kindIs "invalid" $budget.maxUnavailable)) -}}
{{- fail "krini.podDisruptionBudget: set either minAvailable or maxUnavailable, not both" -}}
{{- end -}}
{{- end -}}
