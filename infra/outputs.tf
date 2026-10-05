output "url" { value = "https://${var.domain}" }
output "bucket" { value = aws_s3_bucket.site.id }
output "distribution_id" { value = aws_cloudfront_distribution.site.id }
output "cloudfront_domain" { value = aws_cloudfront_distribution.site.domain_name }
output "user_pool_id" { value = aws_cognito_user_pool.grownups.id }
output "app_client_id" { value = aws_cognito_user_pool_client.app.id }
output "api_function" { value = aws_lambda_function.api.function_name }
