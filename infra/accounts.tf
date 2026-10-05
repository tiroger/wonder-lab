# ---------- Accounts: grown-up sign-in, kid profiles and sync (the API at /api) ----------
# Grown-ups sign in with any email and a one-time code (Cognito, Essentials tier, sent through SES). Kid profiles and
# progress live in one DynamoDB table. One Lambda serves /api through CloudFront. The Lambda's IAM role and Cognito's
# email role are made by infra/bootstrap, so CI never needs IAM permissions.

locals {
  app        = "wonder-lab" # name prefix for the accounts pieces; infra/bootstrap scopes CI to it
  api_name   = "${local.app}-api"
  api_role   = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${local.app}-api"
  mail_from  = "hello@${var.domain}"
  table_name = "${local.app}-accounts"
}

data "aws_caller_identity" "current" {}

# ---------- email: SES sends the sign-in codes from hello@wonderlab.camp ----------
resource "aws_sesv2_email_identity" "site" {
  email_identity = var.domain
}
resource "aws_route53_record" "dkim" {
  count   = 3
  zone_id = data.aws_route53_zone.site.zone_id
  name    = "${aws_sesv2_email_identity.site.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.domain}"
  type    = "CNAME"
  ttl     = 1800
  records = ["${aws_sesv2_email_identity.site.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}
# DMARC: tells inboxes that mail from this domain is DKIM-signed, so they trust the codes
resource "aws_route53_record" "dmarc" {
  zone_id = data.aws_route53_zone.site.zone_id
  name    = "_dmarc.${var.domain}"
  type    = "TXT"
  ttl     = 1800
  records = ["v=DMARC1; p=none;"]
}

# Cognito only accepts a sender whose domain SES has verified, which takes a few minutes after the DKIM records exist.
# The first deploy waits here (up to 30 minutes); later deploys pass straight through.
resource "terraform_data" "email_verified" {
  triggers_replace = [aws_sesv2_email_identity.site.arn]
  depends_on       = [aws_route53_record.dkim]
  provisioner "local-exec" {
    interpreter = ["bash", "-c"]
    command     = <<-SH
      for i in $(seq 1 60); do
        [ "$(aws sesv2 get-email-identity --email-identity ${var.domain} --query VerifiedForSendingStatus --output text)" = "True" ] && exit 0
        echo "waiting for SES to verify ${var.domain} ($i)"; sleep 30
      done
      echo "SES has not verified ${var.domain} yet; check the DKIM records, then run the deploy again"; exit 1
    SH
  }
}

# ---------- grown-ups: Cognito with passwordless email codes ----------
resource "aws_cognito_user_pool" "grownups" {
  depends_on               = [terraform_data.email_verified]
  name                     = "${local.app}-grownups"
  user_pool_tier           = "ESSENTIALS"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  deletion_protection      = "ACTIVE"

  # an email code is the only way in; PASSWORD stays listed because Cognito requires it, but no one has one
  sign_in_policy {
    allowed_first_auth_factors = ["EMAIL_OTP", "PASSWORD"]
  }
  email_configuration {
    email_sending_account = "DEVELOPER"
    source_arn            = aws_sesv2_email_identity.site.arn
    from_email_address    = "Wonder Lab <${local.mail_from}>"
  }
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Your Wonder Lab code"
    email_message        = "Your Wonder Lab code is {####}. It works for a few minutes."
  }
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }
  admin_create_user_config {
    allow_admin_create_user_only = false # anyone with an email can sign up
  }
  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
    string_attribute_constraints {
      min_length = 3
      max_length = 254
    }
  }
}

resource "aws_cognito_user_pool_client" "app" {
  name                          = "${local.app}-app"
  user_pool_id                  = aws_cognito_user_pool.grownups.id
  generate_secret               = false # a browser app can't keep a secret
  explicit_auth_flows           = ["ALLOW_USER_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true
  auth_session_validity         = 5 # minutes to type the emailed code
  id_token_validity             = 60
  access_token_validity         = 60
  refresh_token_validity        = 30
  token_validity_units {
    id_token      = "minutes"
    access_token  = "minutes"
    refresh_token = "days"
  }
}

# ---------- data: one table for grown-ups, groups, kids, codes, device tokens and rate counters ----------
resource "aws_dynamodb_table" "accounts" {
  name                        = local.table_name
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "pk"
  range_key                   = "sk"
  deletion_protection_enabled = true
  attribute {
    name = "pk"
    type = "S"
  }
  attribute {
    name = "sk"
    type = "S"
  }
  ttl {
    attribute_name = "ttl" # device tokens and rate counters clean themselves up
    enabled        = true
  }
  point_in_time_recovery {
    enabled = true
  }
}

# ---------- the API: one Lambda with a function URL, reached only through CloudFront ----------
data "archive_file" "api" {
  type        = "zip"
  source_dir  = "${path.module}/../api"
  excludes    = ["test/**", "package.json"]
  output_path = "${path.module}/.build/api.zip"
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${local.api_name}"
  retention_in_days = 14
}

# CloudFront sends this header; the Lambda answers 404 to anything without it
resource "random_password" "origin_secret" {
  length  = 40
  special = false
}

resource "aws_lambda_function" "api" {
  function_name                  = local.api_name
  description                    = "Wonder Lab API: grown-ups, groups, kid profiles, sync"
  role                           = local.api_role
  runtime                        = "nodejs22.x"
  architectures                  = ["arm64"]
  handler                        = "index.handler"
  filename                       = data.archive_file.api.output_path
  source_code_hash               = data.archive_file.api.output_base64sha256
  memory_size                    = 256
  timeout                        = 10
  reserved_concurrent_executions = 10 # caps cost if something misbehaves
  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.api.name
  }
  environment {
    variables = {
      TABLE         = aws_dynamodb_table.accounts.name
      POOL_ID       = aws_cognito_user_pool.grownups.id
      CLIENT_ID     = aws_cognito_user_pool_client.app.id
      ORIGIN_SECRET = random_password.origin_secret.result
    }
  }
}

resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE" # the secret header and the app's own checks guard it
}
resource "aws_lambda_permission" "url" {
  statement_id           = "FunctionUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.api.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}
resource "aws_lambda_permission" "url_invoke" {
  statement_id             = "FunctionUrlInvoke"
  action                   = "lambda:InvokeFunction"
  function_name            = aws_lambda_function.api.function_name
  principal                = "*"
  invoked_via_function_url = true
}
