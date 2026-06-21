# EKS cluster with a managed node group across 3 AZs. EBS CSI driver is installed
# as a managed add-on with its own IRSA role; cluster autoscaler + ALB controller
# are installed via Helm (see addons.tf).
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.8"

  cluster_name    = "${var.cluster_name}-${var.environment}"
  cluster_version = var.cluster_version

  cluster_endpoint_public_access = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  enable_irsa = true

  cluster_addons = {
    coredns    = { most_recent = true }
    kube-proxy = { most_recent = true }
    vpc-cni    = { most_recent = true }
    aws-ebs-csi-driver = {
      most_recent              = true
      service_account_role_arn = module.ebs_csi_irsa.iam_role_arn
    }
  }

  eks_managed_node_group_defaults = {
    ami_type = "AL2_x86_64"
  }

  eks_managed_node_groups = {
    default = {
      instance_types = var.node_instance_types
      min_size       = var.node_min_size
      max_size       = var.node_max_size
      desired_size   = var.node_desired_size

      labels = { workload = "general" }
      tags = {
        "k8s.io/cluster-autoscaler/enabled"                                = "true"
        "k8s.io/cluster-autoscaler/${var.cluster_name}-${var.environment}" = "owned"
      }
    }
  }

  # Grant the operator running terraform admin access to the cluster.
  enable_cluster_creator_admin_permissions = true
}
