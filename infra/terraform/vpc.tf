data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 3)
}

# Multi-AZ VPC with public + private subnets and tags required by the AWS Load
# Balancer Controller and EKS for subnet auto-discovery.
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = "${var.cluster_name}-${var.environment}-vpc"
  cidr = var.vpc_cidr
  azs  = local.azs

  private_subnets = [for k, v in local.azs : cidrsubnet(var.vpc_cidr, 4, k)]
  public_subnets  = [for k, v in local.azs : cidrsubnet(var.vpc_cidr, 4, k + 8)]

  enable_nat_gateway   = true
  single_nat_gateway   = var.environment != "prod" # one NAT in dev, HA in prod
  enable_dns_hostnames = true

  public_subnet_tags = {
    "kubernetes.io/role/elb"                                       = "1"
    "kubernetes.io/cluster/${var.cluster_name}-${var.environment}" = "shared"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"                              = "1"
    "kubernetes.io/cluster/${var.cluster_name}-${var.environment}" = "shared"
  }
}
