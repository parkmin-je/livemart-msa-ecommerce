output "external_secrets_role_arn" {
  description = "External Secrets Operator IAM 역할 ARN"
  value       = aws_iam_role.external_secrets.arn
}

output "alb_controller_role_arn" {
  description = "AWS Load Balancer Controller IAM 역할 ARN"
  value       = aws_iam_role.alb_controller.arn
}

output "cluster_autoscaler_role_arn" {
  description = "Cluster Autoscaler IAM 역할 ARN"
  value       = aws_iam_role.cluster_autoscaler.arn
}

output "product_service_role_arn" {
  description = "product-service IAM 역할 ARN (S3 + OpenSearch)"
  value       = aws_iam_role.product_service.arn
}

output "ai_service_role_arn" {
  description = "ai-service IAM 역할 ARN (Bedrock + S3)"
  value       = aws_iam_role.ai_service.arn
}

output "oidc_provider_arn" {
  description = "EKS OIDC 공급자 ARN"
  value       = aws_iam_openid_connect_provider.eks.arn
}
