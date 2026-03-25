/**
 * Amazon MSK (Managed Streaming for Kafka) 모듈
 *
 * 구성:
 * - 3-브로커 Kafka 클러스터 (Multi-AZ 고가용성)
 * - kafka.m5.large 인스턴스 (프로덕션 권장)
 * - TLS 암호화 + IAM 인증
 * - CloudWatch 메트릭 활성화
 */

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.80"
    }
  }
}

# ── 보안 그룹 ────────────────────────────────────────────
resource "aws_security_group" "msk" {
  name        = "${var.cluster_name}-msk-sg"
  description = "MSK Kafka 클러스터 보안 그룹"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Kafka plaintext (EKS 노드)"
    from_port       = 9092
    to_port         = 9092
    protocol        = "tcp"
    security_groups = [var.eks_node_sg_id]
  }

  ingress {
    description     = "Kafka TLS (EKS 노드)"
    from_port       = 9094
    to_port         = 9094
    protocol        = "tcp"
    security_groups = [var.eks_node_sg_id]
  }

  ingress {
    description     = "Kafka IAM SASL/TLS (EKS 노드)"
    from_port       = 9098
    to_port         = 9098
    protocol        = "tcp"
    security_groups = [var.eks_node_sg_id]
  }

  ingress {
    description     = "Zookeeper (내부 통신)"
    from_port       = 2181
    to_port         = 2181
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
    Name = "${var.cluster_name}-msk-sg"
  }
}

# ── MSK 서브넷 그룹 ──────────────────────────────────────
resource "aws_msk_configuration" "main" {
  name              = "${var.cluster_name}-kafka-config"
  kafka_versions    = ["3.6.0"]
  server_properties = <<-EOT
    auto.create.topics.enable=false
    default.replication.factor=3
    min.insync.replicas=2
    num.io.threads=8
    num.network.threads=5
    num.partitions=6
    num.replica.fetchers=2
    replica.lag.time.max.ms=30000
    socket.receive.buffer.bytes=102400
    socket.request.max.bytes=104857600
    socket.send.buffer.bytes=102400
    unclean.leader.election.enable=false
    zookeeper.session.timeout.ms=18000
    log.retention.hours=168
    log.segment.bytes=1073741824
    log.retention.check.interval.ms=300000
    message.max.bytes=10485760
  EOT
}

# ── MSK 클러스터 ─────────────────────────────────────────
resource "aws_msk_cluster" "main" {
  cluster_name           = "${var.cluster_name}-kafka"
  kafka_version          = "3.6.0"
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type  = var.broker_instance_type
    client_subnets = var.private_subnet_ids
    storage_info {
      ebs_storage_info {
        volume_size = var.broker_volume_size
      }
    }
    security_groups = [aws_security_group.msk.id]
  }

  # 암호화 설정
  encryption_info {
    encryption_in_transit {
      client_broker = "TLS"
      in_cluster    = true
    }
    encryption_at_rest_kms_key_arn = var.kms_key_arn != "" ? var.kms_key_arn : null
  }

  # 인증 방식
  client_authentication {
    sasl {
      iam = true # IAM 역할 기반 인증 (IRSA 연동)
    }
  }

  # MSK 설정 적용
  configuration_info {
    arn      = aws_msk_configuration.main.arn
    revision = aws_msk_configuration.main.latest_revision
  }

  # CloudWatch 메트릭 (PER_BROKER 레벨 → 브로커별 상세 메트릭)
  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = true
      }
      node_exporter {
        enabled_in_broker = true
      }
    }
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = "/aws/msk/${var.cluster_name}"
      }
      s3 {
        enabled = var.s3_logs_bucket != "" ? true : false
        bucket  = var.s3_logs_bucket
        prefix  = "msk-logs"
      }
    }
  }

  tags = {
    Name = "${var.cluster_name}-kafka"
  }
}

# CloudWatch 로그 그룹
resource "aws_cloudwatch_log_group" "msk" {
  name              = "/aws/msk/${var.cluster_name}"
  retention_in_days = 30
}

# ── MSK 토픽 (Kafka CLI로 생성하거나 애플리케이션 자동 생성) ───
# 주요 토픽은 terraform 외부에서 관리 (MSK는 topic 리소스 미지원)
# 대신 초기화 스크립트 참고: scripts/kafka-init-topics.sh
