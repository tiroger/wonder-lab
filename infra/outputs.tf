output "url" { value = "https://${var.domain}" }
output "bucket" { value = aws_s3_bucket.site.id }
output "distribution_id" { value = aws_cloudfront_distribution.site.id }
output "cloudfront_domain" { value = aws_cloudfront_distribution.site.domain_name }
output "user_pool_id" { value = aws_cognito_user_pool.grownups.id }
output "app_client_id" { value = aws_cognito_user_pool_client.app.id }
output "api_function" { value = aws_lambda_function.api.function_name }
# read by infra/bootstrap to limit CI's permissions to exactly these resources
output "distribution_arn" { value = aws_cloudfront_distribution.site.arn }
output "certificate_arn" { value = aws_acm_certificate.site.arn }
output "user_pool_arn" { value = aws_cognito_user_pool.grownups.arn }
output "origin_access_control_ids" { value = [aws_cloudfront_origin_access_control.site.id, aws_cloudfront_origin_access_control.api.id] }
