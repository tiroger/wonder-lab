# One-time setup, applied by hand with admin credentials (same pattern as windchaser-ai):
#   - the S3 bucket that holds the site's Terraform state
#   - a read-only plan role that pull requests use for `terraform plan`
#   - a deploy role that only the repo's `production` GitHub environment can assume
# Both roles are reached through GitHub OIDC with short-lived sessions. No AWS keys on a laptop or in GitHub.
# This root keeps its own state locally, because it creates the bucket the other root stores state in.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}

provider "aws" {
  region = "us-east-1"
  default_tags { tags = { Project = "wonderlab", ManagedBy = "terraform", Root = "bootstrap" } }
}

variable "github_repo" {
  description = "owner/name of the GitHub repository allowed to deploy"
  type        = string
  default     = "tiroger/wonder-lab"
}
# GitHub now puts immutable IDs in the OIDC subject (repo:owner@owner_id/name@repo_id:...), so a renamed or
# recreated repo can't inherit the roles. See: gh api repos/<owner>/<name>/actions/oidc/customization/sub
variable "github_repo_immutable" {
  description = "owner@owner_id/name@repo_id of the same repository"
  type        = string
  default     = "tiroger@49209247/wonder-lab@1391446809"
}
variable "domain" {
  type    = string
  default = "wonderlab.camp"
}

data "aws_caller_identity" "current" {}

# The GitHub OIDC provider already exists in this account (created by windchaser-ai's bootstrap);
# an account can only have one per URL, so it is looked up rather than created.
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

data "aws_route53_zone" "site" {
  name         = var.domain
  private_zone = false
}

locals {
  account     = data.aws_caller_identity.current.account_id
  project     = "wonderlab"                   # the Project tag infra/versions.tf puts on every site resource
  owned_tags  = [local.project, "wonder-lab"] # "wonder-lab" is the old value: drop it once the site is retagged
  prefix      = replace(var.domain, ".", "-")
  site_names  = [var.domain, "www.${var.domain}"]
  site_bucket = "${local.prefix}-site"
  subjects    = ["repo:${var.github_repo}", "repo:${var.github_repo_immutable}"] # both subject formats
}

# ---------------------------------------------------------------- state bucket --
resource "aws_s3_bucket" "state" {
  bucket = "wonder-lab-tfstate-${data.aws_caller_identity.current.account_id}"
  lifecycle { prevent_destroy = true }
}
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}
resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
data "aws_iam_policy_document" "state_tls" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
    principals {
      type        = "*"
      identifiers = ["*"]
    }
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}
resource "aws_s3_bucket_policy" "state" {
  bucket     = aws_s3_bucket.state.id
  policy     = data.aws_iam_policy_document.state_tls.json
  depends_on = [aws_s3_bucket_public_access_block.state]
}

# ---------------------------------------------------------------- CI roles --
data "aws_iam_policy_document" "assume_plan" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [for s in local.subjects : "${s}:pull_request"]
    }
  }
}

resource "aws_iam_role" "plan" {
  name                 = "wonder-lab-ci-plan"
  description          = "Read-only: terraform plan on pull requests to ${var.github_repo}"
  assume_role_policy   = data.aws_iam_policy_document.assume_plan.json
  max_session_duration = 3600
}
# Only what `terraform plan` on infra/ reads. The account is shared with other projects, so no account-wide
# read access: no S3 objects outside the state bucket, no databases, no other project's settings.
data "aws_iam_policy_document" "plan" {
  statement {
    sid       = "ReadState"
    actions   = ["s3:ListBucket", "s3:GetObject"]
    resources = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
  }
  statement {
    sid       = "StateLock" # S3-native locking writes a .tflock object next to the state
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.state.arn}/*.tflock"]
  }
  statement {
    sid       = "SiteBucketSettings" # the bucket's own settings, not the files in it
    actions   = ["s3:Get*", "s3:List*"]
    resources = ["arn:aws:s3:::${local.site_bucket}"]
  }
  statement {
    sid       = "CloudFrontAndCertificateRead" # configuration only; certificates' private keys are never readable
    actions   = ["cloudfront:Get*", "cloudfront:List*", "cloudfront:Describe*", "acm:Describe*", "acm:Get*", "acm:List*"]
    resources = ["*"]
  }
  statement {
    sid       = "DnsZone"
    actions   = ["route53:GetHostedZone", "route53:ListResourceRecordSets", "route53:ListTagsForResource"]
    resources = [data.aws_route53_zone.site.arn]
  }
  statement {
    sid       = "DnsLookup"
    actions   = ["route53:ListHostedZones", "route53:ListHostedZonesByName", "route53:GetChange"]
    resources = ["*"]
  }
}
resource "aws_iam_role_policy" "plan" {
  name   = "wonder-lab-plan"
  role   = aws_iam_role.plan.id
  policy = data.aws_iam_policy_document.plan.json
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [for s in local.subjects : "${s}:environment:production"]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name                 = "wonder-lab-ci-deploy"
  description          = "GitHub Actions (production environment of ${var.github_repo}) deploys Wonder Lab"
  assume_role_policy   = data.aws_iam_policy_document.assume.json
  max_session_duration = 3600
}

# Scoped to what the site's Terraform and the Deploy workflow touch. No IAM permissions at all,
# so a compromised workflow can't widen its own access.
data "aws_iam_policy_document" "deploy" {
  statement {
    sid       = "TerraformState"
    actions   = ["s3:ListBucket", "s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:GetObjectVersion"]
    resources = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
  }
  statement {
    sid       = "SiteBucket"
    actions   = ["s3:*"]
    resources = ["arn:aws:s3:::${local.site_bucket}", "arn:aws:s3:::${local.site_bucket}/*"]
  }
  # The account is shared, so anything that changes or deletes CloudFront or ACM resources is limited to this
  # site's: the distribution and certificate by their Project tag (the site's provider adds it to everything),
  # functions by name. Creating can't be scoped (there's no resource yet) and harms nothing else.
  statement {
    sid       = "CloudFrontAndCertificateRead"
    actions   = ["cloudfront:Get*", "cloudfront:List*", "cloudfront:Describe*", "acm:Describe*", "acm:Get*", "acm:List*"]
    resources = ["*"]
  }
  statement {
    sid       = "CloudFrontCreate"
    actions   = ["cloudfront:CreateDistribution", "cloudfront:CreateFunction", "cloudfront:CreateOriginAccessControl"]
    resources = ["*"]
  }
  statement {
    sid       = "Distribution"
    actions   = ["cloudfront:UpdateDistribution", "cloudfront:DeleteDistribution", "cloudfront:CreateInvalidation", "cloudfront:TagResource", "cloudfront:UntagResource"]
    resources = ["arn:aws:cloudfront::${local.account}:distribution/*"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/Project"
      values   = local.owned_tags
    }
  }
  statement {
    sid       = "DistributionTagNew" # tags a distribution as it's created; can't relabel another project's
    actions   = ["cloudfront:TagResource"]
    resources = ["arn:aws:cloudfront::${local.account}:distribution/*"]
    condition {
      test     = "StringEquals"
      variable = "aws:RequestTag/Project"
      values   = [local.project]
    }
    condition {
      test     = "Null"
      variable = "aws:ResourceTag/Project"
      values   = ["true"]
    }
  }
  statement {
    sid       = "Functions"
    actions   = ["cloudfront:UpdateFunction", "cloudfront:PublishFunction", "cloudfront:DeleteFunction", "cloudfront:TestFunction", "cloudfront:TagResource", "cloudfront:UntagResource"]
    resources = ["arn:aws:cloudfront::${local.account}:function/${local.prefix}-*"]
  }
  statement {
    sid       = "OriginAccessControl" # these support neither tags nor names in their ARN
    actions   = ["cloudfront:UpdateOriginAccessControl", "cloudfront:DeleteOriginAccessControl"]
    resources = ["*"]
  }
  statement {
    sid       = "CertificateRequest" # only for this site's names
    actions   = ["acm:RequestCertificate"]
    resources = ["*"]
    condition {
      test     = "ForAllValues:StringEquals"
      variable = "acm:DomainNames"
      values   = local.site_names
    }
  }
  statement {
    sid       = "Certificate"
    actions   = ["acm:DeleteCertificate", "acm:AddTagsToCertificate", "acm:RemoveTagsFromCertificate"]
    resources = ["arn:aws:acm:us-east-1:${local.account}:certificate/*"]
    condition {
      test     = "StringEquals"
      variable = "aws:ResourceTag/Project"
      values   = local.owned_tags
    }
  }
  statement {
    sid       = "CertificateTagNew" # tags a certificate as it's requested; can't relabel another project's
    actions   = ["acm:AddTagsToCertificate"]
    resources = ["arn:aws:acm:us-east-1:${local.account}:certificate/*"]
    condition {
      test     = "StringEquals"
      variable = "aws:RequestTag/Project"
      values   = [local.project]
    }
    condition {
      test     = "Null"
      variable = "aws:ResourceTag/Project"
      values   = ["true"]
    }
  }
  statement {
    sid       = "DnsRecords"
    actions   = ["route53:ChangeResourceRecordSets", "route53:ListResourceRecordSets", "route53:GetHostedZone", "route53:ListTagsForResource"]
    resources = [data.aws_route53_zone.site.arn]
  }
  statement {
    sid       = "DnsRead"
    actions   = ["route53:ListHostedZones", "route53:ListHostedZonesByName", "route53:GetChange"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "wonder-lab-deploy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}

# ---------------------------------------------------------------------- outputs --
output "state_bucket" { value = aws_s3_bucket.state.id }
output "deploy_role_arn" { value = aws_iam_role.deploy.arn }
output "plan_role_arn" { value = aws_iam_role.plan.arn }
output "github_variable_commands" {
  description = "Run these once: create the production environment (deploys from main only) and point the workflows at this account"
  value       = <<-EOT
    gh api -X PUT repos/${var.github_repo}/environments/production -F 'deployment_branch_policy[protected_branches]=false' -F 'deployment_branch_policy[custom_branch_policies]=true'
    gh api -X POST repos/${var.github_repo}/environments/production/deployment-branch-policies -f name=main -f type=branch
    gh variable set TF_STATE_BUCKET --repo ${var.github_repo} --body "${aws_s3_bucket.state.id}"
    gh variable set AWS_PLAN_ROLE_ARN --repo ${var.github_repo} --body "${aws_iam_role.plan.arn}"
    gh variable set AWS_DEPLOY_ROLE_ARN --repo ${var.github_repo} --env production --body "${aws_iam_role.deploy.arn}"
  EOT
}
