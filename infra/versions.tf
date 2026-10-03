terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
  # State lives in S3 (created once by infra/bootstrap). use_lockfile gives S3-native locking, no DynamoDB needed.
  backend "s3" {
    key          = "wonder-lab/site.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
    # bucket is passed at init time: terraform init -backend-config="bucket=<state bucket>"
  }
}

# Everything lives in us-east-1 because CloudFront only accepts ACM certificates from that region.
provider "aws" {
  region = "us-east-1"
  default_tags { tags = { Project = "wonder-lab", ManagedBy = "terraform" } }
}
