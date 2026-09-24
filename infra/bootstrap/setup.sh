#!/usr/bin/env bash
# One-time setup for automatic deploys. Run from anywhere, after logging in to AWS:
#   aws sso login [--profile <name>]      (and export AWS_PROFILE=<name> if it isn't your default)
#   infra/bootstrap/setup.sh
# It shows which AWS account it will use, applies the bootstrap (asks you to confirm),
# creates the private GitHub repo if needed, sets the two repo variables and pushes main,
# which starts the first deploy.
set -euo pipefail
cd "$(dirname "$0")"
REPO=${GITHUB_REPO:-tiroger/wonder-lab}
REMOTE=${GIT_REMOTE:-git@github.com-personal:$REPO.git}   # same SSH alias windchaser-ai uses

echo "AWS account: $(aws sts get-caller-identity --query '[Account,Arn]' --output text)"
read -r -p "Deploy Wonder Lab into this account? [y/N] " ok; [[ $ok == y* ]] || exit 1

terraform init -input=false
terraform apply -var "github_repo=$REPO"

cd ../..
if ! gh repo view "$REPO" >/dev/null 2>&1; then
  gh repo create "$REPO" --private --description "Wonder Lab: playful science activities for a 3rd grader"
fi
git remote get-url origin >/dev/null 2>&1 || git remote add origin "$REMOTE"
gh variable set AWS_DEPLOY_ROLE_ARN --repo "$REPO" --body "$(terraform -chdir=infra/bootstrap output -raw deploy_role_arn)"
gh variable set TF_STATE_BUCKET --repo "$REPO" --body "$(terraform -chdir=infra/bootstrap output -raw state_bucket)"
git push -u origin main
echo "Pushed. Watch the first deploy with: gh run watch --repo $REPO"
