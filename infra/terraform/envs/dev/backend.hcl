# terraform init -backend-config=envs/dev/backend.hcl
bucket         = "blockchain-fintech-tfstate"
key            = "dev/terraform.tfstate"
region         = "us-east-1"
dynamodb_table = "blockchain-fintech-tflock"
encrypt        = true
