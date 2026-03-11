# AWS EKS 배포 가이드

LiveMart MSA를 AWS EKS에 배포하는 전체 가이드입니다.

## 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS ap-northeast-2 (서울)            │
│                                                              │
│  ┌─────────────┐    ┌──────────────────────────────────┐   │
│  │  Route 53   │───▶│  Application Load Balancer (ALB)  │   │
│  └─────────────┘    └────────────┬─────────────────────┘   │
│                                   │                          │
│         ┌─────────── VPC ─────────┼──────────────┐          │
│         │                         │               │          │
│         │  Public Subnet (AZ-a, AZ-c)             │          │
│         │  ┌─────────┐  ┌────────────┐            │          │
│         │  │ NAT GW  │  │  NAT GW   │            │          │
│         │  └────┬────┘  └─────┬─────┘            │          │
│         │       │              │                   │          │
│         │  Private Subnet (AZ-a)  Private (AZ-c)  │          │
│         │  ┌──────────────────────────────────┐   │          │
│         │  │      EKS Node Group (t3.large)    │   │          │
│         │  │  ┌──────────┐  ┌──────────────┐  │   │          │
│         │  │  │ api-gw   │  │ user-service │  │   │          │
│         │  │  │ order-svc│  │ product-svc  │  │   │          │
│         │  │  │ ai-svc   │  │ payment-svc  │  │   │          │
│         │  │  └──────────┘  └──────────────┘  │   │          │
│         │  └──────────────────────────────────┘   │          │
│         │                                          │          │
│         │  ┌────────────┐  ┌──────────────────┐  │          │
│         │  │ RDS Multi  │  │ ElastiCache Redis │  │          │
│         │  │ AZ (PG 16) │  │ (Primary+Replica) │  │          │
│         │  └────────────┘  └──────────────────┘  │          │
│         └──────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## 사전 준비

```bash
# 필수 도구 설치
brew install terraform awscli kubectl helm

# AWS 자격증명 설정
aws configure
# AWS Access Key ID: [IAM 사용자 키]
# AWS Secret Access Key: [IAM 비밀 키]
# Default region: ap-northeast-2
# Default output format: json

# Terraform 상태 저장 S3 버킷 생성 (최초 1회)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws s3 mb s3://livemart-terraform-state --region ap-northeast-2
aws s3api put-bucket-versioning \
  --bucket livemart-terraform-state \
  --versioning-configuration Status=Enabled

# DynamoDB Lock 테이블 생성
aws dynamodb create-table \
  --table-name livemart-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-northeast-2
```

## 1단계: Terraform으로 인프라 프로비저닝

```bash
cd terraform/

# 초기화
terraform init

# 실행 계획 확인 (변경 내역 미리보기)
terraform plan \
  -var="db_password=YourSecurePassword123!" \
  -out=tfplan

# 적용 (약 15~20분 소요)
terraform apply tfplan

# 출력값 확인
terraform output
```

## 2단계: kubectl 설정

```bash
# EKS 클러스터에 kubectl 연결
aws eks update-kubeconfig \
  --region ap-northeast-2 \
  --name livemart-cluster

# 연결 확인
kubectl get nodes
kubectl get namespaces
```

## 3단계: ECR에 도커 이미지 빌드 & 푸시

```bash
# ECR 로그인
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=ap-northeast-2
aws ecr get-login-password --region $REGION | \
  docker login --username AWS \
  --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# 서비스 빌드 & 푸시 (예: product-service)
SERVICES=(user-service product-service order-service payment-service \
          notification-service analytics-service inventory-service \
          ai-service api-gateway eureka-server)

cd /path/to/livemart-clean
for SERVICE in "${SERVICES[@]}"; do
  echo "Building $SERVICE..."
  ./gradlew :$SERVICE:bootJar -x test -q

  docker build -t livemart/$SERVICE:latest ./$SERVICE/
  docker tag livemart/$SERVICE:latest \
    $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/livemart/$SERVICE:latest
  docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/livemart/$SERVICE:latest
done
```

## 4단계: K8s 시크릿 & ConfigMap 생성

```bash
kubectl create namespace livemart

# DB 자격증명 시크릿
kubectl create secret generic livemart-secrets -n livemart \
  --from-literal=DB_PASSWORD=YourSecurePassword123! \
  --from-literal=JWT_SECRET=YourJwtSecretKey256bits \
  --from-literal=OPENAI_API_KEY=sk-... \
  --from-literal=SMTP_USERNAME=no-reply@livemart.kr \
  --from-literal=SMTP_PASSWORD=SmtpPassword

# ConfigMap (RDS/Redis 엔드포인트는 terraform output에서 가져옴)
RDS_ENDPOINT=$(terraform -chdir=terraform output -raw rds_endpoint)
REDIS_ENDPOINT=$(terraform -chdir=terraform output -raw redis_primary_endpoint)

kubectl create configmap livemart-config -n livemart \
  --from-literal=SPRING_PROFILES_ACTIVE=k8s \
  --from-literal=DB_HOST=$RDS_ENDPOINT \
  --from-literal=REDIS_HOST=$REDIS_ENDPOINT \
  --from-literal=EUREKA_URL=http://eureka-server:8761/eureka/
```

## 5단계: 서비스 배포

```bash
# 인프라 서비스 먼저 (Eureka)
kubectl apply -f k8s/services/eureka-server.yml

# 백엔드 서비스 (순서 중요: user → product → order → payment)
kubectl apply -f k8s/services/

# PodDisruptionBudget 적용
kubectl apply -f k8s/base/pdb.yml

# 배포 상태 확인
kubectl get pods -n livemart -w

# 서비스별 로그 확인
kubectl logs -n livemart -l app=api-gateway --tail=100
```

## 6단계: ALB Ingress 설정

```bash
# AWS Load Balancer Controller 설치
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=livemart-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

## 환경별 이미지 태그 전략

| 환경 | 태그 | 업데이트 방식 |
|------|------|--------------|
| 개발 | `latest` | 매 커밋 |
| 스테이징 | `staging-YYYYMMDD` | PR 머지 시 |
| 프로덕션 | `v1.2.3` (SemVer) | 수동 배포 |

## 비용 예상 (월간)

| 리소스 | 스펙 | 예상 비용 |
|--------|------|-----------|
| EKS 클러스터 | - | $72 |
| EC2 노드 3개 | t3.large × 3 | $180 |
| RDS Multi-AZ | db.t3.medium | $80 |
| ElastiCache | cache.t3.medium × 2 | $60 |
| ALB | - | $20 |
| NAT Gateway | 2개 | $70 |
| **합계** | | **~$482/월** |

> 💡 개발/테스트 환경에서는 노드를 t3.medium으로, RDS를 Single-AZ로 변경 시 **~$200/월**로 절감 가능
