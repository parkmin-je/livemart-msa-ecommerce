variable "cluster_name" {
  description = "MSK 클러스터 이름 접두사"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "MSK 브로커를 배치할 프라이빗 서브넷 ID (3개 필요 - 3 AZ)"
  type        = list(string)
}

variable "eks_node_sg_id" {
  description = "EKS 노드 보안 그룹 ID (MSK 접근 허용)"
  type        = string
}

variable "broker_instance_type" {
  description = "Kafka 브로커 인스턴스 타입"
  type        = string
  default     = "kafka.m5.large"
}

variable "broker_volume_size" {
  description = "브로커당 EBS 볼륨 크기 (GiB)"
  type        = number
  default     = 100
}

variable "kms_key_arn" {
  description = "저장 암호화용 KMS 키 ARN (빈 문자열이면 AWS 관리 키 사용)"
  type        = string
  default     = ""
}

variable "s3_logs_bucket" {
  description = "브로커 로그 저장 S3 버킷 (빈 문자열이면 비활성화)"
  type        = string
  default     = ""
}
