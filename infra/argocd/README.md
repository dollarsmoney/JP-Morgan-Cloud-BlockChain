# ArgoCD GitOps

App-of-apps layout:

- `project.yaml` — the `blockchain-fintech` AppProject (RBAC + allowed repos/destinations)
- `app-of-apps.yaml` — root Application that watches `infra/argocd/apps/`
- `apps/platform-dev.yaml` — auto-synced dev environment (`infra/k8s/overlays/dev`)
- `apps/platform-prod.yaml` — prod environment, manual sync (drift detected, human-approved)

## Bootstrap

```bash
# 1. Install ArgoCD into the cluster
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 2. Point manifests at your repo (replace YOUR_ORG) and apply the project + root app
kubectl apply -f infra/argocd/project.yaml
kubectl apply -f infra/argocd/app-of-apps.yaml

# ArgoCD now reconciles the dev (and prod) overlays automatically.
# CD pipeline (.github/workflows/cd.yml) bumps image tags in the overlay → ArgoCD syncs.
```

Get the initial admin password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```
