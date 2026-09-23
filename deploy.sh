#!/usr/bin/env bash
# Build the site and upload it to the bucket Terraform created, then refresh CloudFront.
# Usage: ./deploy.sh   (run from the repo root after `terraform apply` in infra/)
set -euo pipefail
cd "$(dirname "$0")"
python3 build.py
BUCKET=$(terraform -chdir=infra output -raw bucket)
DIST=$(terraform -chdir=infra output -raw distribution_id)
# the page changes often: always revalidate. the voice file is big: cache a day (invalidated below on each deploy)
aws s3 cp dist/index.html "s3://$BUCKET/index.html" --content-type "text/html; charset=utf-8" --cache-control "no-cache"
aws s3 sync dist/voice "s3://$BUCKET/voice" --delete --content-type "audio/mpeg" --cache-control "public, max-age=86400"
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*" --query 'Invalidation.Id' --output text
echo "Deployed: $(terraform -chdir=infra output -raw url)"
