variable "cluster_name" {
  description = "EKS 클러스터 이름 (리소스 이름 접두사로 사용)"
  type        = string
}

variable "eks_cluster_name" {
  description = "EKS 클러스터 이름 (data source용)"
  type        = string
}

variable "kubernetes_namespace" {
  description = "서비스 어카운트가 위치하는 Kubernetes 네임스페이스"
  type        = string
  default     = "livemart"
}
