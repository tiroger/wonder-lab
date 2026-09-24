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
  default_tags { tags = { Project = "wonder-lab", ManagedBy = "terraform", Root = "bootstrap" } }
}

variable "github_repo" {
  description = "owner/name of the GitHub repository allowed to deploy"
  type        = string
  default     = "tiroger/wonder-lab"
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
  site_bucket = "${replace(var.domain, ".", "-")}-site"
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
      values   = ["repo:${var.github_repo}:pull_request"]
    }
  }
}

resource "aws_iam_role" "plan" {
  name                 = "wonder-lab-ci-plan"
  description          = "Read-only: terraform plan on pull requests to ${var.github_repo}"
  assume_role_policy   = data.aws_iam_policy_document.assume_plan.json
  max_session_duration = 3600
}
resource "aws_iam_role_policy_attachment" "plan_readonly" {
  role       = aws_iam_role.plan.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}
data "aws_iam_policy_document" "plan_state" {
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
}
resource "aws_iam_role_policy" "plan_state" {
  name   = "wonder-lab-plan-state"
  role   = aws_iam_role.plan.id
  policy = data.aws_iam_policy_document.plan_state.json
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
      values   = ["repo:${var.github_repo}:environment:production"]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name                 = "wonder-lab-ci-deploy"
  description          = "GitHub Actions (production environment of ${var.github_repo}) deploys Wonder Lab"
  assume_role_policy   = data.aws_iam_policy_document.assume.json
  max_session_duration = 3600
}

# Scoped to what the site's Terraform and deploy.sh touch. No IAM permissions at all,
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
  statement {
    sid = "CloudFront" # CloudFront and ACM don't support resource-level scoping for create calls
    actions = [
      "cloudfront:*Distribution*", "cloudfront:*OriginAccessControl*", "cloudfront:*Function*",
      "cloudfront:CreateInvalidation", "cloudfront:GetInvalidation", "cloudfront:ListInvalidations",
      "cloudfront:GetCachePolicy", "cloudfront:ListCachePolicies",
      "cloudfront:GetResponseHeadersPolicy", "cloudfront:ListResponseHeadersPolicies",
      "cloudfront:TagResource", "cloudfront:UntagResource", "cloudfront:ListTagsForResource"
    ]
    resources = ["*"]
  }
  statement {
    sid       = "Certificate"
    actions   = ["acm:RequestCertificate", "acm:DescribeCertificate", "acm:DeleteCertificate", "acm:ListCertificates", "acm:ListTagsForCertificate", "acm:AddTagsToCertificate", "acm:RemoveTagsFromCertificate", "acm:GetCertificate"]
    resources = ["*"]
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
  description = "Run these once: create the production environment and point the workflows at this account"
  value       = <<-EOT
    gh api -X PUT repos/${var.github_repo}/environments/production
    gh variable set TF_STATE_BUCKET --repo ${var.github_repo} --body "${aws_s3_bucket.state.id}"
    gh variable set AWS_PLAN_ROLE_ARN --repo ${var.github_repo} --body "${aws_iam_role.plan.arn}"
    gh variable set AWS_DEPLOY_ROLE_ARN --repo ${var.github_repo} --env production --body "${aws_iam_role.deploy.arn}"
  EOT
}
