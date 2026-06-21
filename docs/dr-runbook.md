# Disaster Recovery Runbook

## Objectives

| Tier | Component | RPO | RTO |
|---|---|---|---|
| Critical | Supabase Postgres (all schemas) | ≤ 5 min (PITR) | ≤ 1 hour |
| Critical | Platform workloads (EKS) | 0 (stateless, in Git) | ≤ 1 hour |
| Important | Kafka topics | ≤ minutes (replicated) | ≤ 2 hours |
| Important | Container images (ECR) | 0 (rebuildable) | ≤ 30 min |

## What protects what
- **Code & manifests** — Git (single source of truth). Infra is Terraform; deployment is ArgoCD.
- **Database** — Supabase automated backups + **Point-in-Time Recovery**. Take periodic logical
  dumps (`pg_dump` per schema) to an S3 bucket with versioning + cross-region replication.
- **Secrets** — AWS Secrets Manager (multi-AZ); export an encrypted break-glass copy.
- **Images** — ECR (lifecycle-retained); always rebuildable from Git via CI.

## Scenario playbooks

### A. Single service failing / bad deploy
1. ArgoCD: roll back the Application to the previous synced revision (or revert the image-tag commit).
2. Verify `/readyz` and Grafana error-rate panel returns to baseline.

### B. AZ outage
- No action required: multi-AZ node group + multi-replica + PDB + topology spread keep serving.
  Cluster Autoscaler replaces lost capacity.

### C. Full region loss (rebuild)
1. `terraform apply -var-file=envs/prod/prod.tfvars` in the **DR region** (S3/Dynamo backend keyed
   per region) → new VPC + EKS + ECR + IRSA + addons.
2. Re-push (or pull-through) images to the DR-region ECR.
3. Restore Supabase from PITR/dump (or fail over to a standby project); update `*_DATABASE_URL`
   secrets.
4. `kubectl apply -f infra/argocd/{project,app-of-apps}.yaml` → ArgoCD reconciles the platform.
5. Repoint DNS (Route 53) to the new ALB; validate `GET /blockchain/validate` and a synthetic
   register→wallet→send→confirm flow.

### D. Database corruption / bad migration
1. Identify the last-good timestamp; restore via Supabase PITR to a new database.
2. Repoint `*_DATABASE_URL`/`*_DIRECT_URL` secrets; restart deployments.
3. Reconcile: replay is generally unnecessary (chain is the ledger; audit log is append-only).

### E. Kafka data loss
- Topics are replicated (RF 3). On total loss, recreate topics (auto-create enabled) and rely on the
  Audit log + chain state to reconstruct; reprocessing is idempotent (Redis dedupe by `eventId`).

## Backups checklist
- [ ] Supabase PITR enabled; nightly `pg_dump` → versioned, cross-region S3.
- [ ] Terraform state in S3 (versioned) + DynamoDB lock.
- [ ] Secrets Manager replication to DR region.
- [ ] Quarterly DR game-day: rebuild prod in DR region and run the synthetic flow.
