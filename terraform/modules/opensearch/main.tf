/**
 * Amazon OpenSearch Service 모듈
 *
 * 구성:
 * - 3-노드 OpenSearch 클러스터 (Multi-AZ)
 * - 전용 마스터 노드 3개 (안정성)
 * - HTTPS + 저장 암호화 + VPC 내부 배치
 * - Kibana → OpenSearch Dashboards 접근
 * - ISM(Index State Management)으로 인덱스 수명 주기 관리
 */

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }
}

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# ── 보안 그룹 ────────────────────────────────────────────
resource "aws_security_group" "opensearch" {
  name        = "${var.domain_name}-opensearch-sg"
  description = "OpenSearch 도메인 보안 그룹"
  vpc_id      = var.vpc_id

  ingress {
    description     = "HTTPS (EKS 노드)"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [var.eks_node_sg_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.domain_name}-opensearch-sg"
  }
}

# ── 서비스 연결 역할 (OpenSearch VPC 배치 필요) ──────────
resource "aws_iam_service_linked_role" "opensearch" {
  aws_service_name = "opensearchservice.amazonaws.com"
  # 이미 생성된 경우 오류 발생 → lifecycle ignore 처리
  lifecycle {
    ignore_changes = [aws_service_name]
  }
}

# ── OpenSearch 도메인 ─────────────────────────────────────
resource "aws_opensearch_domain" "main" {
  domain_name    = var.domain_name
  engine_version = "OpenSearch_2.13"

  # 클러스터 구성
  cluster_config {
    instance_type            = var.instance_type
    instance_count           = var.instance_count
    zone_awareness_enabled   = true
    dedicated_master_enabled = var.instance_count >= 3 ? true : false
    dedicated_master_type    = "m6g.large.search"
    dedicated_master_count   = 3

    zone_awareness_config {
      availability_zone_count = min(var.instance_count, 3)
    }
  }

  # EBS 스토리지
  ebs_options {
    ebs_enabled = true
    volume_size = var.volume_size
    volume_type = "gp3"
    iops        = 3000
    throughput  = 125
  }

  # VPC 설정
  vpc_options {
    subnet_ids         = slice(var.private_subnet_ids, 0, min(var.instance_count, 3))
    security_group_ids = [aws_security_group.opensearch.id]
  }

  # 암호화
  encrypt_at_rest {
    enabled = true
  }

  node_to_node_encryption {
    enabled = true
  }

  # HTTPS 강제
  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  # 고급 보안 옵션 (Fine-grained Access Control)
  advanced_security_options {
    enabled                        = true
    anonymous_auth_enabled         = false
    internal_user_database_enabled = true

    master_user_options {
      master_user_name     = var.master_user_name
      master_user_password = var.master_user_password
    }
  }

  # CloudWatch 로그 게시
  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch_index.arn
    log_type                 = "INDEX_SLOW_LOGS"
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch_search.arn
    log_type                 = "SEARCH_SLOW_LOGS"
  }

  log_publishing_options {
    cloudwatch_log_group_arn = aws_cloudwatch_log_group.opensearch_error.arn
    log_type                 = "ES_APPLICATION_LOGS"
  }

  # 자동 소프트웨어 업데이트
  auto_tune_options {
    desired_state       = "ENABLED"
    rollback_on_disable = "NO_ROLLBACK"
  }

  depends_on = [aws_iam_service_linked_role.opensearch]

  tags = {
    Name = var.domain_name
  }
}

# ── 접근 정책 ─────────────────────────────────────────────
resource "aws_opensearch_domain_policy" "main" {
  domain_name = aws_opensearch_domain.main.domain_name

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = "*" }
        Action    = "es:*"
        Resource  = "${aws_opensearch_domain.main.arn}/*"
        Condition = {
          StringEquals = {
            "aws:PrincipalAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

# ── CloudWatch 로그 그룹 ──────────────────────────────────
resource "aws_cloudwatch_log_group" "opensearch_index" {
  name              = "/aws/opensearch/${var.domain_name}/index-slow"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "opensearch_search" {
  name              = "/aws/opensearch/${var.domain_name}/search-slow"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "opensearch_error" {
  name              = "/aws/opensearch/${var.domain_name}/application"
  retention_in_days = 14
}

# CloudWatch 로그 리소스 정책 (OpenSearch가 로그 게시 가능하도록)
resource "aws_cloudwatch_log_resource_policy" "opensearch" {
  policy_name = "${var.domain_name}-opensearch-logs-policy"

  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "es.amazonaws.com"
      }
      Action = [
        "logs:PutLogEvents",
        "logs:CreateLogStream"
      ]
      Resource = [
        "${aws_cloudwatch_log_group.opensearch_index.arn}:*",
        "${aws_cloudwatch_log_group.opensearch_search.arn}:*",
        "${aws_cloudwatch_log_group.opensearch_error.arn}:*"
      ]
    }]
  })
}
