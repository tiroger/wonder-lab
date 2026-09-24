---
description: Ship a change through CI/CD (branch, PR, checks, merge to main deploys)
argument-hint: [short summary]
---
Wonder Lab deploys only through GitHub Actions. Never apply Terraform or upload to S3 by hand.

1. Make sure `/walkthrough` passes locally and `git status` only shows intended changes (never `.env`).
2. Create a branch named for the change, commit with a plain message, push it, and open a PR with `gh pr create` summarizing what the kid will notice: $ARGUMENTS
3. Watch the checks with `gh pr checks --watch`: Build and validate, Play every activity, Terraform plan. Read the plan in the run summary. It should only touch what the change needs.
4. Ask Roger before merging. Merging to `main` runs the Deploy workflow; follow it with `gh run watch` and confirm https://wonderlab.camp loads.
