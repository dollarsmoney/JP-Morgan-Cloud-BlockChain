# terraform init -backend-config=envs/prod/backend.hcl
bucket         = "blockchain-fintech-tfstate"
key            = "prod/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "blockchain-fintech-tflock"
encrypt        = true
