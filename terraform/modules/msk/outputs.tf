output "cluster_arn" {
  description = "MSK 클러스터 ARN"
  value       = aws_msk_cluster.main.arn
}

output "bootstrap_brokers_tls" {
  description = "TLS 부트스트랩 브로커 엔드포인트 (애플리케이션 연결용)"
  value       = aws_msk_cluster.main.bootstrap_brokers_sasl_iam
  sensitive   = true
}

output "bootstrap_brokers_plaintext" {
  description = "Plaintext 부트스트랩 브로커 (VPC 내부 개발용)"
  value       = aws_msk_cluster.main.bootstrap_brokers
}

output "zookeeper_connect" {
  description = "Zookeeper 연결 문자열"
  value       = aws_msk_cluster.main.zookeeper_connect_string
  sensitive   = true
}

output "security_group_id" {
  description = "MSK 보안 그룹 ID"
  value       = aws_security_group.msk.id
}
