output "url" { value = "https://${var.domain}" }
output "bucket" { value = aws_s3_bucket.site.id }
output "distribution_id" { value = aws_cloudfront_distribution.site.id }
output "cloudfront_domain" { value = aws_cloudfront_distribution.site.domain_name }
