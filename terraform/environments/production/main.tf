/**
 * LiveMart 프로덕션 환경
 *
 * 모든 AWS 인프라 모듈을 조합하여 프로덕션급 인프라를 구성.
 *
 * 사전 요구사항:
 *   1. AWS CLI 설정 및 권한 확인
 *   2. terraform init (S3 백엔드 버킷 미리 생성 필요)
 *   3. terraform.tfvars 파일에 민감한 변수 설정
 *   4. aws s3 mb s3://livemart-terraform-state-<account-id>
 *   5. aws dynamodb create-table --table-name livemart-terraform-locks \
 *        --attribute-definitions AttributeName=LockID,AttributeType=S \
 *        --key-schema AttributeName=LockID,KeyType=HASH \
 *        --billing-mode PAY_PER_REQUEST
 */

terraform {
  required_version = ">= 1.9.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.17"
    }
  }

  backend "s3" {
    bucket         = "livemart-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ap-northeast-2"
    encrypt        = true
    dynamodb_table = "livemart-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "livemart"
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }
}

# ── 변수 정의 ─────────────────────────────────────────────
variable "aws_region" {
  type    = string
  default = "ap-northeast-2"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "opensearch_master_password" {
  type      = string
  sensitive = true
}

# ── 데이터 소스 ───────────────────────────────────────────
data "aws_caller_identity" "current" {}

# ── VPC ──────────────────────────────────────────────────
module "vpc" {
  source       = "../../modules/vpc"
  project_name = "livemart"
  environment  = "production"
  vpc_cidr     = "10.0.0.0/16"

  availability_zones   = ["ap-northeast-2a", "ap-northeast-2b", "ap-northeast-2c"]
  private_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnet_cidrs  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
}

# ── EKS ──────────────────────────────────────────────────
module "eks" {
  source       = "../../modules/eks"
  project_name = "livemart"
  environment  = "production"

  kubernetes_version = "1.31"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids

  # On-demand 노드 (안정적인 베이스라인)
  node_group_instance_types = ["m5.xlarge"]
  node_group_scaling = {
    min_size     = 3
    max_size     = 20
    desired_size = 6
  }

  # Spot 노드 (비용 최적화, stateless 워크로드)
  spot_node_group_enabled       = true
  spot_node_group_instance_types = ["m5.xlarge", "m5a.xlarge", "m4.xlarge"]
  spot_node_group_scaling = {
    min_size     = 0
    max_size     = 10
    desired_size = 2
  }
}

# ── RDS PostgreSQL ────────────────────────────────────────
module "rds" {
  source       = "../../modules/rds"
  project_name = "livemart"

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  eks_node_sg_id     = module.eks.node_security_group_id

  db_instance_class = "db.r6g.large"
  db_username       = "livemartadmin"
  db_password       = var.db_password
  multi_az          = true
}

# ── ElastiCache Redis ─────────────────────────────────────
module "elasticache" {
  source       = "../../modules/elasticache"
  project_name = "livemart"

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  eks_node_sg_id     = module.eks.node_security_group_id

  node_type          = "cache.r6g.large"
  num_cache_clusters = 3 # Primary + 2 Replica
}

# ── MSK Kafka ─────────────────────────────────────────────
module "msk" {
  source       = "../../modules/msk"
  cluster_name = "livemart"

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  eks_node_sg_id     = module.eks.node_security_group_id

  broker_instance_type = "kafka.m5.large"
  broker_volume_size   = 200
  s3_logs_bucket       = module.s3.logs_bucket_name
}

# ── OpenSearch ────────────────────────────────────────────
module "opensearch" {
  source      = "../../modules/opensearch"
  domain_name = "livemart-search"

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  eks_node_sg_id     = module.eks.node_security_group_id

  instance_type              = "m6g.large.search"
  instance_count             = 3
  volume_size                = 100
  master_user_name           = "admin"
  master_user_password       = var.opensearch_master_password
}

# ── S3 버킷 ───────────────────────────────────────────────
module "s3" {
  source       = "../../modules/s3"
  project_name = "livemart"

  product_service_role_arn = module.iam.product_service_role_arn
}

# ── IAM IRSA ─────────────────────────────────────────────
module "iam" {
  source = "../../modules/iam"

  cluster_name         = "livemart"
  eks_cluster_name     = module.eks.cluster_name
  kubernetes_namespace = "livemart"

  depends_on = [module.eks]
}

# ── 출력 ─────────────────────────────────────────────────
output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  value     = module.rds.endpoint
  sensitive = true
}

output "elasticache_endpoint" {
  value     = module.elasticache.primary_endpoint
  sensitive = true
}

output "msk_bootstrap_brokers" {
  value     = module.msk.bootstrap_brokers_tls
  sensitive = true
}

output "opensearch_endpoint" {
  value = module.opensearch.domain_endpoint
}

output "product_images_bucket" {
  value = module.s3.product_images_bucket_name
}

output "external_secrets_role_arn" {
  value = module.iam.external_secrets_role_arn
}

output "alb_controller_role_arn" {
  value = module.iam.alb_controller_role_arn
}

output "kubectl_config_command" {
  value = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}
