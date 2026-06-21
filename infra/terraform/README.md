# Terraform — AWS EKS Platform

Provisions the full AWS platform: multi-AZ VPC, EKS cluster + managed node group,
ECR repositories, IRSA roles, AWS Load Balancer Controller, EBS CSI driver,
Cluster Autoscaler and metrics-server. Supabase Postgres is external (not managed here).

## Prerequisites

- Terraform >= 1.6, AWS CLI v2, `kubectl`, `helm`
- An S3 bucket + DynamoDB table for remote state/locking (see `envs/<env>/backend.hcl`)
- AWS credentials with admin permissions for the bootstrap

## Usage

```bash
cd infra/terraform

# Dev
terraform init -backend-config=envs/dev/backend.hcl
terraform plan  -var-file=envs/dev/dev.tfvars
terraform apply -var-file=envs/dev/dev.tfvars

# Configure kubectl (see output `configure_kubectl`)
aws eks update-kubeconfig --region us-east-1 --name blockchain-fintech-dev

# Prod (separate state key)
terraform init -reconfigure -backend-config=envs/prod/backend.hcl
terraform apply -var-file=envs/prod/prod.tfvars
```

## Outputs

- `ecr_repository_urls` — push images here from CI
- `app_irsa_role_arn` — set on the `bcf-app` ServiceAccount annotation
- `configure_kubectl` — kubeconfig command

## After apply

1. Push images to ECR (CI does this — see `.github/workflows/cd.yml`).
2. Update `infra/k8s/overlays/<env>/kustomization.yaml` image registry/account/region
   and the `bcf-app` ServiceAccount IRSA annotation with `app_irsa_role_arn`.
3. Create the `bcf-secrets` Secret (or wire External Secrets to Secrets Manager).
4. Bootstrap ArgoCD (see `infra/argocd/`) which then syncs the app.
