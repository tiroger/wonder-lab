#!/usr/bin/env bash
# One-time: create the private, versioned S3 bucket that stores Terraform state.
# Usage: infra/bootstrap.sh [bucket-name]   (default: wonderlab-camp-tfstate-<account id>)
set -euo pipefail
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET=${1:-wonderlab-camp-tfstate-$ACCOUNT}
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then echo "State bucket $BUCKET already exists"; else
  aws s3api create-bucket --bucket "$BUCKET" --region us-east-1
  aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  aws s3api put-bucket-versioning --bucket "$BUCKET" --versioning-configuration Status=Enabled
  aws s3api put-bucket-encryption --bucket "$BUCKET" --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  echo "Created state bucket $BUCKET"
fi
echo "Next: cd infra && terraform init -backend-config=\"bucket=$BUCKET\" && terraform apply"
