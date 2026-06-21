variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev|prod)"
  type        = string
  default     = "dev"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "blockchain-fintech"
}

variable "cluster_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.30"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "node_instance_types" {
  description = "Instance types for the managed node group"
  type        = list(string)
  default     = ["t3.large"]
}

variable "node_min_size" {
  type    = number
  default = 2
}

variable "node_max_size" {
  type    = number
  default = 10
}

variable "node_desired_size" {
  type    = number
  default = 3
}

variable "ecr_repositories" {
  description = "Service image repositories to create in ECR"
  type        = list(string)
  default = [
    "bcf-api-gateway",
    "bcf-auth",
    "bcf-user",
    "bcf-wallet",
    "bcf-blockchain",
    "bcf-transaction",
    "bcf-notification",
    "bcf-audit",
    "bcf-frontend",
  ]
}
