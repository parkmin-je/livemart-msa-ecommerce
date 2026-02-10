terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "livemart-terraform-state"
    key    = "dev/terraform.tfstate"
    region = "ap-northeast-2"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "ap-northeast-2"
}

variable "project_name" {
  type    = string
  default = "livemart"
}

variable "environment" {
  type    = string
  default = "dev"
}

# VPC
module "vpc" {
  source       = "../../modules/vpc"
  project_name = var.project_name
  environment  = var.environment
  vpc_cidr     = "10.0.0.0/16"
}

# EKS
module "eks" {
  source              = "../../modules/eks"
  project_name        = var.project_name
  environment         = var.environment
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  kubernetes_version  = "1.29"
  node_instance_types = ["t3.medium"]
  node_desired_size   = 2
  node_min_size       = 1
  node_max_size       = 4
}

# RDS (MySQL)
module "rds" {
  source             = "../../modules/rds"
  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  instance_class     = "db.t3.micro"

  databases = {
    userdb = {
      db_name  = "userdb"
      username = "user"
      password = "user123dev"
    }
    productdb = {
      db_name  = "productdb"
      username = "product"
      password = "product123dev"
    }
    orderdb = {
      db_name  = "orderdb"
      username = "order"
      password = "order123dev"
    }
  }
}

# ElastiCache (Redis)
module "elasticache" {
  source             = "../../modules/elasticache"
  project_name       = var.project_name
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  node_type          = "cache.t3.micro"
}

# ECR
module "ecr" {
  source       = "../../modules/ecr"
  project_name = var.project_name
}

# Outputs
output "eks_cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  value = module.eks.cluster_name
}

output "rds_endpoints" {
  value     = module.rds.db_endpoints
  sensitive = true
}

output "redis_endpoint" {
  value = module.elasticache.redis_endpoint
}

output "ecr_repository_urls" {
  value = module.ecr.repository_urls
}
