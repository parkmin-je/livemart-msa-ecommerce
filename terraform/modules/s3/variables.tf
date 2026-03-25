variable "project_name" {
  description = "프로젝트 이름 (버킷 이름 접두사)"
  type        = string
}

variable "cloudfront_distribution_arn" {
  description = "CloudFront 배포 ARN (이미지 버킷 OAC 정책용)"
  type        = string
  default     = ""
}

variable "product_service_role_arn" {
  description = "product-service IRSA 역할 ARN (이미지 업로드 권한)"
  type        = string
  default     = ""
}
