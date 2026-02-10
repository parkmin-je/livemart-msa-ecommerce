{{/*
공통 라벨 생성
*/}}
{{- define "livemart.labels" -}}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: livemart
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end }}

{{/*
서비스 셀렉터 라벨
*/}}
{{- define "livemart.selectorLabels" -}}
app: {{ .name }}
{{- end }}

{{/*
이미지 전체 경로
*/}}
{{- define "livemart.image" -}}
{{ .registry }}/{{ .image }}:{{ .tag }}
{{- end }}
