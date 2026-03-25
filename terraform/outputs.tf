output "eks_cluster_name" {
  description = "EKS 클러스터 이름"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "EKS API 서버 엔드포인트"
  value       = aws_eks_cluster.main.endpoint
}

output "eks_cluster_ca" {
  description = "EKS 클러스터 CA 인증서"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "rds_endpoint" {
  description = "RDS PostgreSQL 엔드포인트"
  value       = aws_db_instance.main.endpoint
}

output "redis_primary_endpoint" {
  description = "ElastiCache Redis Primary 엔드포인트"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "alb_dns_name" {
  description = "ALB DNS 이름 (도메인 CNAME 레코드 설정에 사용)"
  value       = aws_lb.main.dns_name
}

output "ecr_urls" {
  description = "ECR 리포지토리 URL 맵"
  value = {
    for name, repo in aws_ecr_repository.services : name => repo.repository_url
  }
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "kubectl_config_command" {
  description = "kubectl 설정 명령어"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main.name}"
}

# 아래 출력은 MSK/OpenSearch/IAM 모듈이 추가된 environments/production/main.tf에서 관리됨
# 루트 main.tf는 단순화를 위해 기존 리소스 출력만 유지
