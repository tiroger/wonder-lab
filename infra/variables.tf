variable "domain" {
  description = "Root domain. Its Route 53 hosted zone must already exist (Route 53 creates it when you register the domain)."
  type        = string
  default     = "wonderlab.camp"
}
variable "bucket_name" {
  description = "Private S3 bucket that holds the built site. Leave empty to use <domain>-site."
  type        = string
  default     = ""
}
