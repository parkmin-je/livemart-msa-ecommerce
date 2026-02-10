variable "project_name" {
  type = string
}

variable "services" {
  type    = list(string)
  default = [
    "eureka-server",
    "api-gateway",
    "config-server",
    "user-service",
    "product-service",
    "order-service",
    "payment-service"
  ]
}

resource "aws_ecr_repository" "services" {
  for_each = toset(var.services)

  name                 = "${var.project_name}/${each.value}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name    = "${var.project_name}/${each.value}"
    Project = var.project_name
  }
}

resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = toset(var.services)
  repository = aws_ecr_repository.services[each.key].name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = {
        type = "expire"
      }
    }]
  })
}

output "repository_urls" {
  value = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}
