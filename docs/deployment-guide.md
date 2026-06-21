# Production Deployment Guide

End-to-end: from a fresh AWS account to a running platform on EKS.

## 0. Prerequisites
- AWS account + admin credentials for bootstrap; AWS CLI v2, `terraform` ≥1.6, `kubectl`, `helm`.
- A Supabase project (Postgres + Storage — avatars use a public `avatars` bucket, auto-created).
- A domain + ACM certificate in the target region.
- An S3 bucket + DynamoDB table for Terraform state/locking.

## 1. Provision infrastructure (Terraform)
```bash
cd infra/terraform
terraform init  -backend-config=envs/prod/backend.hcl
terraform apply -var-file=envs/prod/prod.tfvars
aws eks update-kubeconfig --region us-east-1 --name blockchain-fintech-prod
```
Note the outputs: `ecr_repository_urls`, `app_irsa_role_arn`.

## 2. Prepare the database (Supabase)
- Create one schema per service: `app_auth, users, wallets, blockchain, transactions, notifications, audit`
  (`auth` is reserved by Supabase, so the Auth service uses `app_auth`). Prisma migrations create these.
- Run migrations (uses the **direct** connection, not pgBouncer):
```bash
cp .env.example .env   # fill Supabase URL + keys + DB pooler strings + JWT values
npm ci && npm run build -w @blockchain/common
npm run db:migrate:all
```

## 3. Build & push images
Push happens automatically via [`.github/workflows/cd.yml`](../.github/workflows/cd.yml) on merge to
`main` (GitHub OIDC → ECR). To do it manually:
```bash
aws ecr get-login-password | docker login --username AWS --password-stdin <ECR_REGISTRY>
for s in api-gateway auth user wallet blockchain transaction notification audit; do
  docker build -f services/$s/Dockerfile -t <ECR_REGISTRY>/bcf-$s:stable .
  docker push <ECR_REGISTRY>/bcf-$s:stable
done
docker build -f frontend/Dockerfile -t <ECR_REGISTRY>/bcf-frontend:stable .
docker push <ECR_REGISTRY>/bcf-frontend:stable
```

## 4. Configure Kubernetes manifests
In `infra/k8s/overlays/prod/kustomization.yaml`, set the ECR account/region and image tags.
In `infra/k8s/base/serviceaccount.yaml`, set the `bcf-app` IRSA annotation to `app_irsa_role_arn`.
In `infra/k8s/base/{configmap,ingress}.yaml`, set Kafka/Redis endpoints, domains and the ACM ARN.

Create the secret (or wire External Secrets to Secrets Manager):
```bash
kubectl create namespace blockchain-fintech
kubectl create secret generic bcf-secrets -n blockchain-fintech \
  --from-env-file=.env.production   # keys per infra/k8s/base/secret.example.yaml
```

## 5. Platform dependencies in-cluster
- AWS Load Balancer Controller, EBS CSI driver, Cluster Autoscaler, metrics-server — installed by
  Terraform (`addons.tf`).
- Deploy Kafka (e.g. Strimzi) and Redis (e.g. Bitnami/ElastiCache) into `kafka`/`redis` namespaces,
  and the observability stack (kube-prometheus-stack, Loki, Jaeger) into `observability`.

## 6. Deploy with GitOps (ArgoCD)
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f infra/argocd/project.yaml
kubectl apply -f infra/argocd/app-of-apps.yaml
```
ArgoCD syncs the dev overlay automatically; approve prod syncs in the ArgoCD UI.

## 7. Verify
```bash
kubectl get pods -n blockchain-fintech          # all Running/Ready
curl https://api.<domain>/healthz               # gateway up
open https://api.<domain>/docs                   # Swagger
open https://app.<domain>                        # web app
```
Run the synthetic flow: register → create wallet → send transaction → watch it confirm → check
notification + `GET /blockchain/validate`.

## Local development
```bash
npm ci
cp .env.example .env        # fill Supabase URL + keys + DB pooler strings
npm run prisma:generate && npm run db:migrate:all
docker compose up --build   # services + Redis + Kafka + Prometheus + Grafana + Loki + Jaeger
# Web http://localhost:3000 · API/Swagger http://localhost:4000/docs
# Grafana http://localhost:3001 · Jaeger http://localhost:16686
```
