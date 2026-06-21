output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_region" {
  value = var.region
}

output "configure_kubectl" {
  description = "Run this to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}

output "ecr_repository_urls" {
  value = { for k, v in aws_ecr_repository.service : k => v.repository_url }
}

output "app_irsa_role_arn" {
  description = "Annotate the bcf-app ServiceAccount with this ARN"
  value       = module.app_irsa.iam_role_arn
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
