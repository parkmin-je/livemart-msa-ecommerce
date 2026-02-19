# LiveMart MSA - 간편 시작 가이드

## 🚀 빠른 시작

### 방법 1: 자동 시작 스크립트 (권장)

```bash
# 전체 시작
start-all.bat

# 전체 중지
stop-all.bat
```

### 방법 2: Docker Compose로 인프라만 시작

```bash
# 인프라 시작 (PostgreSQL, Redis, Kafka, Elasticsearch 등)
docker-compose -f docker-compose-infra.yml up -d

# 인프라 중지
docker-compose -f docker-compose-infra.yml down
```

그 후 IntelliJ에서 다음 순서로 실행:
1. eureka-server (8761)
2. api-gateway (8080)
3. product-service (8082)
4. order-service (8083)
5. payment-service (8084)
6. user-service (8085)

### 방법 3: 전체 Docker Compose (프로덕션급)

```bash
# 전체 빌드 및 시작 (처음에만, 시간 오래 걸림 10-15분)
docker-compose -f docker-compose-all.yml up --build -d

# 이후부터는 빌드 없이 시작
docker-compose -f docker-compose-all.yml up -d

# 전체 중지
docker-compose -f docker-compose-all.yml down
```

---

## 📋 서비스 포트 정리

### 인프라 서비스
| 서비스 | 포트 | 설명 |
|--------|------|------|
| PostgreSQL (User) | 5434 | User Service DB |
| PostgreSQL (Product) | 5435 | Product Service DB |
| PostgreSQL (Order) | 5436 | Order Service DB |
| PostgreSQL (Inventory) | 5432 | Inventory Service DB |
| PostgreSQL (Analytics) | 5433 | Analytics Service DB |
| Redis | 6379 | 캐시 & 세션 저장소 |
| Kafka | 9092 | 메시지 브로커 |
| Zookeeper | 2181 | Kafka 코디네이터 |
| Elasticsearch | 9200 | 검색 엔진 |
| Kibana | 5601 | Elasticsearch UI |
| Prometheus | 9090 | 모니터링 |
| Zipkin | 9411 | 분산 추적 |

### 애플리케이션 서비스
| 서비스 | 포트 | 설명 |
|--------|------|------|
| Eureka Server | 8761 | 서비스 디스커버리 |
| API Gateway | 8080 | API 게이트웨이 |
| Product Service | 8082 | 상품 관리 |
| Order Service | 8083 | 주문 관리 |
| Payment Service | 8084 | 결제 처리 |
| User Service | 8085 | 사용자 관리 |
| Analytics Service | 8087 | 분석 서비스 |

### 프론트엔드
| 서비스 | 포트 | 설명 |
|--------|------|------|
| Next.js Frontend | 3000 | React 프론트엔드 |

---

## ✅ 정상 작동 확인

### 1. Docker 컨테이너 확인
```bash
docker ps
```
모든 컨테이너가 `Up` 상태여야 함

### 2. Eureka 대시보드 확인
브라우저에서 `http://localhost:8761` 접속
→ 모든 서비스가 등록되었는지 확인

### 3. API Gateway 헬스체크
```bash
curl http://localhost:8080/actuator/health
```

### 4. 프론트엔드 접속
```bash
cd frontend
npm run dev
```
브라우저에서 `http://localhost:3000` 접속

---

## 🐛 문제 해결

### 포트 충돌
```bash
# 사용 중인 포트 확인
netstat -ano | findstr "8080 8761 8082 8083 8084 8085"

# 프로세스 강제 종료
taskkill /F /PID <PID>
```

### Docker가 안 켜질 때
1. Docker Desktop 재시작
2. WSL2 업데이트 확인: `wsl --update`
3. 관리자 권한으로 PowerShell 실행 후 `docker ps`

### Gradle 빌드 실패
```bash
# Gradle 캐시 정리
gradlew clean build --refresh-dependencies
```

### PostgreSQL 연결 실패
```bash
# PostgreSQL 컨테이너 재시작
docker restart livemart-postgres-product
docker restart livemart-postgres-user
docker restart livemart-postgres-order
```

---

## 📝 개발 워크플로우

### 1. 개발 시작
```bash
start-all.bat
cd frontend && npm run dev
```

### 2. 코드 수정
IntelliJ에서 서비스 코드 수정 후:
- 자동 재시작 (Spring DevTools)
- 또는 수동 재시작 (Ctrl+F2 → 다시 실행)

### 3. 개발 종료
```bash
stop-all.bat
```

---

## 🎯 통합 테스트

### 프론트엔드 통합 테스트
```
http://localhost:3000/test
```
"🚀 전체 테스트 실행" 버튼 클릭

### API 직접 테스트
```bash
# 상품 목록 조회
curl http://localhost:8080/api/products?page=0&size=5

# 상품 검색
curl http://localhost:8080/api/products/search?keyword=MacBook

# 회원가입
curl -X POST http://localhost:8080/api/users/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@livemart.com","password":"test1234","name":"테스트"}'
```

---

## 💡 팁

### IntelliJ 대신 스크립트 사용 시 장점
- ✅ 한 번에 모든 서비스 시작/중지
- ✅ 서비스 시작 순서 자동 관리
- ✅ 각 서비스별 로그를 별도 창에서 확인
- ✅ 재부팅 후에도 동일한 환경 재현

### Docker Compose 사용 시 장점
- ✅ 인프라 관리 자동화
- ✅ 포트 충돌 방지
- ✅ 데이터 영속성 (볼륨 자동 관리)
- ✅ 팀원들과 동일한 환경 공유

### 하이브리드 방식 (권장)
- Docker: 인프라만 (PostgreSQL, Redis, Kafka 등)
- 로컬: 애플리케이션 서비스 (빠른 재시작, 디버깅 가능)

---

## 📚 추가 문서

- [프론트엔드 통합 완료 보고서](./FRONTEND_INTEGRATION_COMPLETE.md)
- [API 문서](http://localhost:8080/swagger-ui.html)
- [Eureka 대시보드](http://localhost:8761)
- [Kibana](http://localhost:5601)

---

**Made with ❤️ by LiveMart Team**
