# GitHub Actions → AWS via OIDC (no long-lived keys). Creates the GitHub OIDC
# identity provider and a deploy role scoped to this repo that can push to ECR.
# Set the output `github_actions_deploy_role_arn` as the GitHub secret
# AWS_DEPLOY_ROLE_ARN, and `ecr_registry` as ECR_REGISTRY.

data "aws_caller_identity" "current" {}

variable "github_repo" {
  description = "GitHub repo (org/name) allowed to assume the CI deploy role"
  type        = string
  default     = "dollarsmoney/JP-Morgan-Cloud-BlockChain"
}

resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  # Thumbprints are validated by AWS's trust store now, but the resource still
  # requires them. These are GitHub's well-known intermediate CA thumbprints.
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]
}

# Trust policy: only this repo (any branch/tag) may assume the role.
data "aws_iam_policy_document" "github_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_actions_deploy" {
  name               = "${var.cluster_name}-${var.environment}-gha-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_assume.json
}

# Permissions: ECR login + push/pull to the bcf-* repos, and read EKS (for kubeconfig).
data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "ECRAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid = "ECRPushPull"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
      "ecr:CompleteLayerUpload",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = ["arn:aws:ecr:*:${data.aws_caller_identity.current.account_id}:repository/bcf-*"]
  }
  statement {
    sid       = "EKSDescribe"
    actions   = ["eks:DescribeCluster", "eks:ListClusters"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "deploy"
  role   = aws_iam_role.github_actions_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}

output "github_actions_deploy_role_arn" {
  description = "Set as GitHub secret AWS_DEPLOY_ROLE_ARN"
  value       = aws_iam_role.github_actions_deploy.arn
}

output "ecr_registry" {
  description = "Set as GitHub secret ECR_REGISTRY"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.region}.amazonaws.com"
}
