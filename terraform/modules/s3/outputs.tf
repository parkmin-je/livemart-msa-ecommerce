output "product_images_bucket_name" {
  description = "상품 이미지 S3 버킷 이름"
  value       = aws_s3_bucket.product_images.id
}

output "product_images_bucket_arn" {
  description = "상품 이미지 S3 버킷 ARN"
  value       = aws_s3_bucket.product_images.arn
}

output "logs_bucket_name" {
  description = "로그 아카이브 S3 버킷 이름"
  value       = aws_s3_bucket.logs.id
}

output "logs_bucket_arn" {
  description = "로그 아카이브 S3 버킷 ARN"
  value       = aws_s3_bucket.logs.arn
}

output "ai_assets_bucket_name" {
  description = "AI 에셋 S3 버킷 이름"
  value       = aws_s3_bucket.ai_assets.id
}
