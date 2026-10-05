# One-time setup, applied by hand with admin credentials (same pattern as windchaser-ai):
#   - the S3 bucket that holds the site's Terraform state
#   - a read-only plan role that pull requests use for `terraform plan`
#   - a deploy role that only the repo's `production` GitHub environment can assume
#   - the IAM roles the app itself needs (the API's execution role, Cognito's email role), so CI never needs IAM
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
  project     = "wonderlab" # the Project tag infra/versions.tf puts on every site resource
  prefix      = replace(var.domain, ".", "-")
  site_names  = [var.domain, "www.${var.domain}"]
  site_bucket = "${local.prefix}-site"
  subjects    = ["repo:${var.github_repo}", "repo:${var.github_repo_immutable}"] # both subject formats
  # the accounts pieces (infra/accounts.tf) are all named wonder-lab-*
  app       = "wonder-lab"
  table_arn = "arn:aws:dynamodb:us-east-1:${local.account}:table/${local.app}-*"
  fn_arn    = "arn:aws:lambda:us-east-1:${local.account}:function:${local.app}-*"
  logs_arn  = "arn:aws:logs:us-east-1:${local.account}:log-group:/aws/lambda/${local.app}-*"
  ses_arn   = "arn:aws:ses:us-east-1:${local.account}:identity/${var.domain}"
}

# The site's own resources, read from its Terraform outputs, so CI's permissions name them exactly. Apply this root after
# the site has been deployed with those outputs; the preconditions on the two CI policies stop an apply that would leave
# CI unable to deploy (an empty ARN would grant nothing).
data "terraform_remote_state" "site" {
  backend = "s3"
  config  = { bucket = aws_s3_bucket.state.id, key = "wonder-lab/site.tfstate", region = "us-east-1" }
}
locals {
  site_ok = alltrue([for v in [try(data.terraform_remote_state.site.outputs.distribution_arn, ""), try(data.terraform_remote_state.site.outputs.certificate_arn, ""),
  try(data.terraform_remote_state.site.outputs.user_pool_arn, "")] : v != ""]) && length(try(data.terraform_remote_state.site.outputs.origin_access_control_ids, [])) == 2
  site_missing = "The site's state is missing the outputs CI's permissions name (distribution, certificate, user pool, 2 origin access controls). Deploy the site first, then apply this."
  site = {
    distribution_arn = try(data.terraform_remote_state.site.outputs.distribution_arn, "")
    certificate_arn  = try(data.terraform_remote_state.site.outputs.certificate_arn, "")
    user_pool_arn    = try(data.terraform_remote_state.site.outputs.user_pool_arn, "")
    oac_ids          = try(data.terraform_remote_state.site.outputs.origin_access_control_ids, [])
  }
  oac_arns = [for id in local.site.oac_ids : "arn:aws:cloudfront::${local.account}:origin-access-control/${id}"]
  cloudfront_own = concat([local.site.distribution_arn, "arn:aws:cloudfront::${local.account}:function/${local.prefix}-*",
  "arn:aws:cloudfront::*:cache-policy/*", "arn:aws:cloudfront::*:origin-request-policy/*", "arn:aws:cloudfront::*:response-headers-policy/*"], local.oac_arns)
  pool_read = ["cognito-idp:DescribeUserPool", "cognito-idp:DescribeUserPoolClient", "cognito-idp:GetUserPoolMfaConfig", "cognito-idp:ListTagsForResource"]
}
# ------------------------------------------------------- roles the app needs --
# The API's Lambda: its own table and its own logs, nothing else.
resource "aws_iam_role" "api" {
  name        = "${local.app}-api"
  description = "Wonder Lab API (Lambda): reads and writes the accounts table"
  assume_role_policy = jsonencode({
    Version   = "2012-10-17"
    Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "lambda.amazonaws.com" } }]
  })
}
data "aws_iam_policy_document" "api" {
  statement {
    sid       = "Table"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query"]
    resources = ["arn:aws:dynamodb:us-east-1:${local.account}:table/${local.app}-accounts"]
  }
  statement {
    sid       = "Logs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["arn:aws:logs:us-east-1:${local.account}:log-group:/aws/lambda/${local.app}-api:*"]
  }
}
resource "aws_iam_role_policy" "api" {
  name   = "${local.app}-api"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api.json
}
# Cognito sends sign-in codes through SES with this AWS-defined role (one per account)
resource "aws_iam_service_linked_role" "cognito_email" {
  aws_service_name = "email.cognito-idp.amazonaws.com"
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
# Only what `terraform plan` on infra/ reads, and only this site's resources: the account is shared, so no reading other
# projects' settings (other distributions' origin headers can hold secrets). The state it reads holds secrets too, so the
# plan role only trusts pull requests from this repo (forks get no OIDC token), and plans print no sensitive values.
data "aws_iam_policy_document" "plan" {
  statement {
    sid       = "ReadState" # plans run with -lock=false, so they never write (or block a deploy)
    actions   = ["s3:ListBucket", "s3:GetObject"]
    resources = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
  }
  statement {
    sid       = "SiteBucketSettings" # the bucket's own settings, not the files in it
    actions   = ["s3:Get*", "s3:List*"]
    resources = ["arn:aws:s3:::${local.site_bucket}"]
  }
  statement {
    sid       = "CloudFrontRead" # this site's distribution, function and origin access controls, and AWS's managed policies
    actions   = ["cloudfront:Get*", "cloudfront:Describe*", "cloudfront:ListTagsForResource"]
    resources = local.cloudfront_own
  }
  statement {
    sid       = "CloudFrontPolicyLists" # finds AWS's managed policies by name
    actions   = ["cloudfront:ListCachePolicies", "cloudfront:ListOriginRequestPolicies", "cloudfront:ListResponseHeadersPolicies"]
    resources = ["*"]
  }
  statement {
    sid       = "CertificateRead"
    actions   = ["acm:DescribeCertificate", "acm:GetCertificate", "acm:ListTagsForCertificate"]
    resources = [local.site.certificate_arn]
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
  # the accounts pieces' settings, never the data in the table or the grown-ups in the user pool
  statement {
    sid       = "AccountsRead"
    actions   = ["dynamodb:Describe*", "dynamodb:ListTagsOfResource", "dynamodb:GetResourcePolicy", "lambda:Get*", "lambda:List*", "logs:ListTagsForResource", "logs:ListTagsLogGroup", "ses:GetEmailIdentity", "ses:ListTagsForResource"]
    resources = [local.table_arn, local.fn_arn, local.logs_arn, "${local.logs_arn}:*", local.ses_arn]
  }
  statement {
    sid       = "UserPoolRead"
    actions   = local.pool_read
    resources = [local.site.user_pool_arn]
  }
  statement {
    sid       = "LogGroupsList"
    actions   = ["logs:DescribeLogGroups"]
    resources = ["*"]
  }
}
resource "aws_iam_role_policy" "plan" {
  name   = "wonder-lab-plan"
  role   = aws_iam_role.plan.id
  policy = data.aws_iam_policy_document.plan.json
  lifecycle {
    precondition {
      condition     = local.site_ok
      error_message = local.site_missing
    }
  }
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

# Scoped to what the site's Terraform and the Deploy workflow touch, by exact resource where AWS allows it (the account is
# shared, and a tag check alone would let CI tag another project's resource as ours and then take it over). No IAM
# permissions beyond handing the API its one bootstrap-made role. CI can't create a distribution, certificate, user pool or
# origin access control. To add one: (1) grant its create action here and apply, (2) deploy the site, which creates it and
# outputs its ID, (3) name it in the outputs read above, remove the create grant, and apply again.
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
    sid       = "CloudFrontRead"
    actions   = ["cloudfront:Get*", "cloudfront:Describe*", "cloudfront:ListTagsForResource"]
    resources = local.cloudfront_own
  }
  statement {
    sid       = "CloudFrontPolicyLists"
    actions   = ["cloudfront:ListCachePolicies", "cloudfront:ListOriginRequestPolicies", "cloudfront:ListResponseHeadersPolicies"]
    resources = ["*"]
  }
  statement {
    sid       = "Distribution"
    actions   = ["cloudfront:UpdateDistribution", "cloudfront:CreateInvalidation", "cloudfront:TagResource", "cloudfront:UntagResource"]
    resources = [local.site.distribution_arn]
  }
  statement {
    sid       = "Functions"
    actions   = ["cloudfront:UpdateFunction", "cloudfront:PublishFunction", "cloudfront:TestFunction", "cloudfront:TagResource", "cloudfront:UntagResource"]
    resources = ["arn:aws:cloudfront::${local.account}:function/${local.prefix}-*"]
  }
  statement {
    sid       = "OriginAccessControls"
    actions   = ["cloudfront:UpdateOriginAccessControl"]
    resources = local.oac_arns
  }
  statement {
    sid       = "CertificateRead"
    actions   = ["acm:DescribeCertificate", "acm:GetCertificate", "acm:ListTagsForCertificate"]
    resources = [local.site.certificate_arn]
  }
  statement {
    sid       = "Certificate"
    actions   = ["acm:AddTagsToCertificate", "acm:RemoveTagsFromCertificate"]
    resources = [local.site.certificate_arn]
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

  # ---- accounts (infra/accounts.tf) ----
  statement {
    sid = "AccountsTable" # managing the table, never reading or writing the data in it
    actions = ["dynamodb:CreateTable", "dynamodb:DeleteTable", "dynamodb:UpdateTable", "dynamodb:Describe*", "dynamodb:List*", "dynamodb:GetResourcePolicy",
    "dynamodb:UpdateContinuousBackups", "dynamodb:UpdateTimeToLive", "dynamodb:TagResource", "dynamodb:UntagResource"]
    resources = [local.table_arn]
  }
  statement {
    sid       = "ApiFunction"
    actions   = ["lambda:*"]
    resources = [local.fn_arn]
  }
  statement {
    sid       = "ApiRole" # hands the bootstrap-made role to the API's Lambda, and nothing else
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.api.arn]
    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["lambda.amazonaws.com"]
    }
  }
  statement {
    sid = "ApiLogs"
    actions = ["logs:CreateLogGroup", "logs:DeleteLogGroup", "logs:PutRetentionPolicy", "logs:DeleteRetentionPolicy", "logs:TagResource", "logs:UntagResource",
    "logs:TagLogGroup", "logs:UntagLogGroup", "logs:ListTagsForResource", "logs:ListTagsLogGroup"]
    resources = [local.logs_arn, "${local.logs_arn}:*"]
  }
  statement {
    sid       = "LogGroupsList"
    actions   = ["logs:DescribeLogGroups"]
    resources = ["*"]
  }
  statement {
    sid       = "EmailIdentity" # the domain that sends sign-in codes
    actions   = ["ses:*EmailIdentity*", "ses:TagResource", "ses:UntagResource", "ses:ListTagsForResource"]
    resources = [local.ses_arn]
  }
  statement {
    sid = "UserPool" # the pool's settings and its app client, never its users (no Admin* actions, no ListUsers)
    actions = concat(local.pool_read, ["cognito-idp:UpdateUserPool", "cognito-idp:UpdateUserPoolClient", "cognito-idp:SetUserPoolMfaConfig",
    "cognito-idp:TagResource", "cognito-idp:UntagResource"])
    resources = [local.site.user_pool_arn]
  }
}
resource "aws_iam_role_policy" "deploy" {
  name   = "wonder-lab-deploy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
  lifecycle {
    precondition {
      condition     = local.site_ok
      error_message = local.site_missing
    }
  }
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
