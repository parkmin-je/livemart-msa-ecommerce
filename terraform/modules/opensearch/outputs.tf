output "domain_endpoint" {
  description = "OpenSearch 도메인 엔드포인트 (HTTPS)"
  value       = "https://${aws_opensearch_domain.main.endpoint}"
}

output "domain_arn" {
  description = "OpenSearch 도메인 ARN"
  value       = aws_opensearch_domain.main.arn
}

output "kibana_endpoint" {
  description = "OpenSearch Dashboards (구 Kibana) 엔드포인트"
  value       = "https://${aws_opensearch_domain.main.dashboard_endpoint}"
}

output "security_group_id" {
  description = "OpenSearch 보안 그룹 ID"
  value       = aws_security_group.opensearch.id
}
