.PHONY: help build test lint clean dev infra-up infra-down docker-build docker-push deploy k8s-deploy k8s-delete coverage contract-test load-test fmt check

# ────────────────────────────────────────────────────────────
# Variables
# ────────────────────────────────────────────────────────────
REGISTRY     ?= ghcr.io/parkmin-je
VERSION      ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
NAMESPACE    ?= livemart
SERVICES     := api-gateway order-service payment-service product-service \
                user-service inventory-service notification-service analytics-service

RED    := \033[0;31m
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
RESET  := \033[0m

# ────────────────────────────────────────────────────────────
# Help
# ────────────────────────────────────────────────────────────
help: ## 사용 가능한 명령어 목록
	@echo ""
	@echo "$(CYAN)LiveMart MSA — 개발 도구$(RESET)"
	@echo "$(CYAN)Version: $(VERSION)$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "%-25s %s\n", "Target", "Description"} \
		/^[a-zA-Z_-]+:.*?##/ { printf "$(GREEN)%-25s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""

# ────────────────────────────────────────────────────────────
# Build
# ────────────────────────────────────────────────────────────
build: ## 전체 서비스 빌드 (테스트 제외)
	@echo "$(CYAN)▶ Building all services...$(RESET)"
	./gradlew build -x test --parallel --no-daemon
	@echo "$(GREEN)✔ Build complete$(RESET)"

build-service: ## 단일 서비스 빌드: make build-service SERVICE=order-service
	@echo "$(CYAN)▶ Building $(SERVICE)...$(RESET)"
	./gradlew :$(SERVICE):build -x test --no-daemon

classes: ## 컴파일만 (테스트·JAR 제외)
	./gradlew classes --parallel --no-daemon

# ────────────────────────────────────────────────────────────
# Test
# ────────────────────────────────────────────────────────────
test: ## 전체 테스트 실행
	@echo "$(CYAN)▶ Running all tests...$(RESET)"
	./gradlew test --no-daemon
	@echo "$(GREEN)✔ Tests complete$(RESET)"

test-service: ## 단일 서비스 테스트: make test-service SERVICE=order-service
	./gradlew :$(SERVICE):test --no-daemon

test-unit: ## 단위 테스트만 (통합 테스트 제외)
	./gradlew test -Dspring.profiles.active=test --no-daemon

test-arch: ## ArchUnit 아키텍처 테스트
	./gradlew :order-service:architecture :user-service:architecture \
		:payment-service:architecture :product-service:architecture --no-daemon

test-contract: ## Spring Cloud Contract 계약 테스트
	./gradlew :payment-service:contractTest --no-daemon

coverage: ## JaCoCo 커버리지 리포트 생성 + 검증
	@echo "$(CYAN)▶ Generating coverage reports...$(RESET)"
	./gradlew jacocoTestReport jacocoTestCoverageVerification --no-daemon
	@echo "$(GREEN)✔ Coverage reports: build/reports/jacoco/$(RESET)"

# ────────────────────────────────────────────────────────────
# Code Quality
# ────────────────────────────────────────────────────────────
lint: ## 코드 스타일 검사 (Checkstyle)
	./gradlew checkstyleMain --no-daemon

fmt: ## 코드 포맷 확인
	@echo "$(YELLOW)⚠ Java 포맷 체크는 IDE 또는 google-java-format 직접 실행$(RESET)"

check: test coverage lint ## 전체 품질 게이트 (test + coverage + lint)
	@echo "$(GREEN)✔ All quality gates passed$(RESET)"

# ────────────────────────────────────────────────────────────
# Local Infrastructure
# ────────────────────────────────────────────────────────────
dev: infra-up ## 로컬 개발 환경 시작 (인프라 + 서비스)
	@echo "$(GREEN)✔ Infrastructure ready. Run 'make run-service SERVICE=order-service' to start a service.$(RESET)"

infra-up: ## 인프라 컨테이너 기동 (PostgreSQL, Redis, Kafka, Elasticsearch)
	@echo "$(CYAN)▶ Starting infrastructure...$(RESET)"
	docker-compose -f docker-compose-infra.yml up -d
	@echo "$(GREEN)✔ Infra up: PostgreSQL:5432, Redis:6379, Kafka:9092, ES:9200$(RESET)"

infra-down: ## 인프라 컨테이너 중지
	docker-compose -f docker-compose-infra.yml down

infra-down-v: ## 인프라 컨테이너 + 볼륨 삭제 (데이터 초기화)
	docker-compose -f docker-compose-infra.yml down -v
	@echo "$(YELLOW)⚠ All infra data volumes removed$(RESET)"

infra-logs: ## 인프라 컨테이너 로그 조회
	docker-compose -f docker-compose-infra.yml logs -f

run-all: ## 전체 서비스 Docker Compose로 실행
	docker-compose -f docker-compose-all.yml up -d

stop-all: ## 전체 서비스 중지
	docker-compose -f docker-compose-all.yml down

run-service: ## 단일 서비스 실행: make run-service SERVICE=order-service
	@echo "$(CYAN)▶ Starting $(SERVICE)...$(RESET)"
	./gradlew :$(SERVICE):bootRun

# ────────────────────────────────────────────────────────────
# Docker
# ────────────────────────────────────────────────────────────
docker-build: ## 전체 서비스 Docker 이미지 빌드
	@echo "$(CYAN)▶ Building Docker images (version: $(VERSION))...$(RESET)"
	@for svc in $(SERVICES); do \
		echo "  Building $$svc..."; \
		docker build -t $(REGISTRY)/$$svc:$(VERSION) -t $(REGISTRY)/$$svc:latest ./$$svc; \
	done
	@echo "$(GREEN)✔ All images built$(RESET)"

docker-build-service: ## 단일 서비스 이미지 빌드: make docker-build-service SERVICE=order-service
	docker build -t $(REGISTRY)/$(SERVICE):$(VERSION) -t $(REGISTRY)/$(SERVICE):latest ./$(SERVICE)

docker-push: ## 빌드된 이미지 GHCR 푸시
	@echo "$(CYAN)▶ Pushing images to $(REGISTRY)...$(RESET)"
	@for svc in $(SERVICES); do \
		docker push $(REGISTRY)/$$svc:$(VERSION); \
		docker push $(REGISTRY)/$$svc:latest; \
	done
	@echo "$(GREEN)✔ Images pushed$(RESET)"

docker-push-service: ## 단일 서비스 이미지 푸시: make docker-push-service SERVICE=order-service
	docker push $(REGISTRY)/$(SERVICE):$(VERSION)

# ────────────────────────────────────────────────────────────
# Kubernetes
# ────────────────────────────────────────────────────────────
k8s-deploy: ## Kubernetes 전체 배포 (kubectl apply)
	@echo "$(CYAN)▶ Deploying to Kubernetes (namespace: $(NAMESPACE))...$(RESET)"
	kubectl apply -f k8s/base/namespace.yml
	kubectl apply -f k8s/base/
	kubectl apply -f k8s/infra/
	kubectl apply -f k8s/services/
	@echo "$(GREEN)✔ Deployment complete$(RESET)"

k8s-status: ## Pod / Service / HPA 상태 확인
	@echo "\n$(CYAN)=== Pods ===$(RESET)"
	kubectl get pods -n $(NAMESPACE)
	@echo "\n$(CYAN)=== Services ===$(RESET)"
	kubectl get svc -n $(NAMESPACE)
	@echo "\n$(CYAN)=== HPA ===$(RESET)"
	kubectl get hpa -n $(NAMESPACE)

k8s-logs: ## 서비스 로그 스트리밍: make k8s-logs SERVICE=order-service
	kubectl logs -n $(NAMESPACE) -l app=$(SERVICE) -f --tail=100

k8s-delete: ## Kubernetes 리소스 전체 삭제
	@echo "$(RED)▶ Deleting all resources in namespace $(NAMESPACE)...$(RESET)"
	kubectl delete -f k8s/services/ --ignore-not-found
	kubectl delete -f k8s/infra/ --ignore-not-found
	kubectl delete -f k8s/base/ --ignore-not-found
	@echo "$(YELLOW)⚠ All resources deleted$(RESET)"

k8s-port-forward: ## 모니터링 포트 포워딩 (Grafana + Kibana + Zipkin)
	@echo "$(GREEN)Forwarding: Grafana→13000, Kibana→15601, Zipkin→19411$(RESET)"
	kubectl port-forward -n $(NAMESPACE) svc/grafana 13000:3000 &
	kubectl port-forward -n $(NAMESPACE) svc/kibana 15601:5601 &
	kubectl port-forward -n $(NAMESPACE) svc/zipkin 19411:9411 &

helm-install: ## Helm Chart 설치
	helm install livemart helm/livemart/ \
		-n $(NAMESPACE) \
		-f helm/livemart/values-production.yaml \
		--create-namespace

helm-upgrade: ## Helm Chart 업그레이드
	helm upgrade livemart helm/livemart/ \
		-n $(NAMESPACE) \
		-f helm/livemart/values-production.yaml

helm-rollback: ## Helm 롤백: make helm-rollback REVISION=1
	helm rollback livemart $(REVISION) -n $(NAMESPACE)

helm-uninstall: ## Helm Chart 삭제
	helm uninstall livemart -n $(NAMESPACE)

# ────────────────────────────────────────────────────────────
# Load Testing
# ────────────────────────────────────────────────────────────
load-test: ## k6 전체 부하 테스트 실행
	k6 run tests/k6/load-test.js

smoke-test: ## k6 스모크 테스트 (3 VU, 정상 동작 확인)
	k6 run tests/k6/smoke-test.js

spike-test: ## k6 스파이크 테스트 (플래시 세일 시뮬레이션)
	k6 run tests/k6/spike-test.js

stress-test: ## k6 스트레스 테스트 (한계점 탐색)
	k6 run tests/k6/stress-test.js

# ────────────────────────────────────────────────────────────
# Database
# ────────────────────────────────────────────────────────────
db-init: ## PostgreSQL 데이터베이스 초기화
	@echo "$(CYAN)▶ Initializing databases...$(RESET)"
	docker exec -i postgres psql -U postgres < scripts/init-databases.sql
	@echo "$(GREEN)✔ Databases initialized$(RESET)"

db-migrate: ## Flyway 마이그레이션 실행
	./gradlew flywayMigrate --no-daemon

# ────────────────────────────────────────────────────────────
# Frontend
# ────────────────────────────────────────────────────────────
frontend-install: ## 프론트엔드 의존성 설치
	cd frontend && npm ci

frontend-dev: ## 프론트엔드 개발 서버 시작
	cd frontend && npm run dev

frontend-build: ## 프론트엔드 프로덕션 빌드
	cd frontend && npm run build

frontend-lint: ## 프론트엔드 ESLint 검사
	cd frontend && npm run lint

frontend-audit: ## npm 보안 감사
	cd frontend && npm audit --audit-level=high

lighthouse: ## Lighthouse CI 성능 테스트
	cd frontend && npx lhci autorun

# ────────────────────────────────────────────────────────────
# Utilities
# ────────────────────────────────────────────────────────────
clean: ## 빌드 결과물 전체 삭제
	./gradlew clean --no-daemon
	@rm -rf frontend/.next frontend/out
	@echo "$(GREEN)✔ Clean complete$(RESET)"

version: ## 현재 버전 출력
	@echo "$(VERSION)"

git-tag: ## 새 버전 태그 생성: make git-tag VERSION=v2.1.0
	git tag -a $(VERSION) -m "Release $(VERSION)"
	git push origin $(VERSION)
	@echo "$(GREEN)✔ Tagged and pushed: $(VERSION)$(RESET)"
