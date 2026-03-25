variable "domain_name" {
  description = "OpenSearch 도메인 이름"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "OpenSearch 노드를 배치할 프라이빗 서브넷 ID"
  type        = list(string)
}

variable "eks_node_sg_id" {
  description = "EKS 노드 보안 그룹 ID (OpenSearch 접근 허용)"
  type        = string
}

variable "instance_type" {
  description = "OpenSearch 노드 인스턴스 타입"
  type        = string
  default     = "m6g.large.search"
}

variable "instance_count" {
  description = "데이터 노드 수 (Multi-AZ를 위해 3의 배수 권장)"
  type        = number
  default     = 3
}

variable "volume_size" {
  description = "노드당 EBS 볼륨 크기 (GiB)"
  type        = number
  default     = 100
}

variable "master_user_name" {
  description = "OpenSearch 마스터 사용자 이름"
  type        = string
  default     = "admin"
}

variable "master_user_password" {
  description = "OpenSearch 마스터 사용자 패스워드"
  type        = string
  sensitive   = true
}
