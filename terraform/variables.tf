variable "aws_region" {
  description = "AWS 리전"
  type        = string
  default     = "ap-northeast-2"   # 서울 리전
}

variable "project_name" {
  description = "프로젝트 이름 (리소스 이름 접두사)"
  type        = string
  default     = "livemart"
}

variable "environment" {
  description = "배포 환경"
  type        = string
  default     = "production"
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "environment must be one of: development, staging, production"
  }
}

# ── VPC ──────────────────────────────────────────────────
variable "vpc_cidr" {
  description = "VPC CIDR 블록"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "사용할 AZ 목록 (고가용성을 위해 최소 2개)"
  type        = list(string)
  default     = ["ap-northeast-2a", "ap-northeast-2c"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.101.0/24", "10.0.102.0/24"]
}

# ── EKS ──────────────────────────────────────────────────
variable "kubernetes_version" {
  description = "EKS Kubernetes 버전"
  type        = string
  default     = "1.31"
}

variable "node_group_instance_types" {
  description = "EKS 노드 인스턴스 타입"
  type        = list(string)
  default     = ["t3.large"]   # 4vCPU, 8GB — 마이크로서비스 8개 + 인프라 실행 가능
}

variable "node_group_scaling" {
  description = "노드 그룹 스케일링 설정"
  type = object({
    min_size     = number
    max_size     = number
    desired_size = number
  })
  default = {
    min_size     = 2    # 가용성 보장: 최소 2노드
    max_size     = 5    # 트래픽 급증 대비
    desired_size = 3
  }
}

# ── RDS (PostgreSQL) ──────────────────────────────────────
variable "db_instance_class" {
  description = "RDS 인스턴스 클래스"
  type        = string
  default     = "db.t3.medium"
}

variable "db_username" {
  description = "RDS 마스터 사용자명"
  type        = string
  default     = "livemart_admin"
  sensitive   = true
}

variable "db_password" {
  description = "RDS 마스터 비밀번호 (환경변수로 주입: TF_VAR_db_password)"
  type        = string
  sensitive   = true
}

# ── ElastiCache (Redis) ────────────────────────────────────
variable "redis_node_type" {
  description = "ElastiCache Redis 노드 타입"
  type        = string
  default     = "cache.t3.medium"
}

# ── ECR ───────────────────────────────────────────────────
variable "ecr_services" {
  description = "ECR 리포지토리를 생성할 서비스 목록"
  type        = list(string)
  default = [
    "user-service", "product-service", "order-service", "payment-service",
    "notification-service", "analytics-service", "inventory-service",
    "ai-service", "api-gateway", "eureka-server"
  ]
}
