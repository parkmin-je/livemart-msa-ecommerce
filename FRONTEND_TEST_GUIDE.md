# 🎨 LiveMart 프론트엔드 테스트 가이드

## ✅ 프론트엔드 시작 완료!

### 접속 정보
- **URL**: http://localhost:3001
- **프레임워크**: Next.js 14.2.35
- **스타일**: Tailwind CSS
- **상태관리**: Zustand
- **API 통신**: Axios + React Query

### 🔗 백엔드 연동 설정
- API Gateway: http://localhost:8080
- Analytics SSE: http://localhost:8087

## 🚀 현재 실행 중인 전체 시스템

### Frontend (포트 3001)
```
✅ Next.js Dev Server: http://localhost:3001
```

### Backend Services
```
✅ Eureka Server:     http://localhost:8761
✅ API Gateway:       http://localhost:8080
✅ User Service:      http://localhost:8081
✅ Product Service:   http://localhost:8082
✅ Order Service:     http://localhost:8083
✅ Inventory Service: http://localhost:8085
✅ Analytics Service: http://localhost:8087
```

### Databases (PostgreSQL 15)
```
✅ User DB:      localhost:5434/userdb
✅ Product DB:   localhost:5435/productdb
✅ Order DB:     localhost:5436/orderdb
✅ Inventory DB: localhost:5432/inventorydb
✅ Analytics DB: localhost:5433/analyticsdb
```

### Infrastructure
```
✅ Redis:         localhost:6379
✅ Elasticsearch: localhost:9200
✅ Kafka:         localhost:9092
```

## 🎯 프론트엔드 기능 테스트

### 1. 메인 페이지
- [x] LiveMart 로고 및 헤더
- [x] 실시간 대시보드 버튼
- [x] 로그인 버튼
- [x] 장바구니 버튼
- [x] 성능 지표 표시 (3,500 RPS, 80ms P95, 100K 동시 연결)
- [x] 카테고리 필터 (전자기기, 패션, 식품, 도서, 가전)
- [x] 상품 그리드 (로딩 스켈레톤)

### 2. 브라우저 개발자 도구로 확인할 사항

#### Network 탭에서 확인
```bash
# 프론트엔드가 백엔드 API를 호출하는지 확인
- GET http://localhost:8080/api/products
- GET http://localhost:8080/api/categories
```

#### Console 탭에서 확인
- React Query 초기화 메시지
- API 호출 로그
- 오류가 없는지 확인

## 🧪 API 통합 테스트

### 브라우저에서 직접 테스트
1. **http://localhost:3001** 접속
2. 개발자 도구 열기 (F12)
3. Network 탭 확인
4. API 호출 확인

### 터미널에서 API 테스트
```bash
# API Gateway를 통한 서비스 접근 테스트
curl http://localhost:8080/actuator/health

# User Service
curl http://localhost:8081/actuator/health

# Product Service
curl http://localhost:8082/actuator/health

# Order Service
curl http://localhost:8083/actuator/health
```

## 📊 Eureka 대시보드에서 서비스 확인
**http://localhost:8761** 접속하여 모든 서비스가 등록되었는지 확인

등록된 서비스:
- API-GATEWAY (1 instance)
- USER-SERVICE (1 instance)
- PRODUCT-SERVICE (1 instance)
- ORDER-SERVICE (1 instance)
- ANALYTICS-SERVICE (1 instance)

## 🎨 프론트엔드 페이지 구조

```
LiveMart
├── 헤더
│   ├── 로고 (🛒 LiveMart)
│   ├── MSA E-Commerce 태그
│   ├── 실시간 대시보드 버튼
│   ├── 로그인 버튼
│   └── 장바구니 버튼
├── 히어로 섹션
│   ├── 제목: "실시간 대규모 트래픽 처리 가능한 엔터프라이즈 E-Commerce 플랫폼"
│   ├── 부제: "MSA, Event-Driven, WebFlux 기반 고성능 쇼핑몰"
│   └── 성능 지표
│       ├── 3,500 RPS 처리량
│       ├── 80ms P95 응답시간
│       └── 100K 동시 연결
├── 메인 컨텐츠
│   ├── 사이드바 필터
│   │   ├── 카테고리 필터
│   │   ├── 가격대 슬라이더
│   │   └── 필터 적용 버튼
│   └── 상품 그리드 (3열)
│       └── 로딩 스켈레톤 (6개)
└── 푸터
    ├── LiveMart 소개
    ├── 기술 스택 (Spring Boot, Kafka, Redis, Elasticsearch)
    └── 성능 지표
```

## 🔥 실시간 기능 테스트 (향후)

### 실시간 대시보드
- Server-Sent Events (SSE)를 통한 실시간 분석 데이터
- Analytics Service (8087)에서 실시간 이벤트 스트리밍

### 장바구니
- Redis 캐시 기반 실시간 장바구니
- 세션 관리

### 상품 검색
- Elasticsearch 기반 전문 검색
- 실시간 자동완성

## 🎓 기술 스택 확인

### Frontend
- ✅ React 18.2.0
- ✅ Next.js 14.2.35
- ✅ TypeScript 5.3.0
- ✅ Tailwind CSS 3.4.0
- ✅ Zustand 4.4.0 (상태 관리)
- ✅ React Query 5.17.0 (서버 상태)
- ✅ Axios 1.6.0
- ✅ React Hot Toast 2.4.1

### Backend
- ✅ Java 21
- ✅ Spring Boot 3.3.0
- ✅ Spring Cloud 2023.0.2
- ✅ PostgreSQL 15
- ✅ Redis 7.4.7
- ✅ Elasticsearch
- ✅ Kafka Streams

## 💡 다음 테스트 단계

1. **상품 데이터 추가**
   - Product Service API를 통해 샘플 상품 추가
   - 프론트엔드에서 상품 목록 확인

2. **사용자 인증**
   - User Service를 통한 회원가입/로그인
   - JWT 토큰 기반 인증 테스트

3. **주문 플로우**
   - 장바구니 추가 → 주문 생성 → 결제
   - Saga 패턴 트랜잭션 확인

4. **실시간 분석**
   - Analytics Service SSE 연결
   - 실시간 대시보드 데이터 확인

## 🎯 성공 기준

- [x] 프론트엔드가 http://localhost:3001에서 정상 작동
- [x] 모든 백엔드 서비스가 Eureka에 등록됨
- [x] API Gateway를 통한 라우팅 작동
- [x] PostgreSQL 연결 정상
- [x] Redis 캐시 연결 정상
- [ ] 상품 데이터 CRUD 테스트
- [ ] 사용자 인증 테스트
- [ ] 주문 생성 테스트
- [ ] 실시간 분석 테스트

---
작성일: 2026-02-13
프론트엔드 포트: 3001
백엔드 준비: ✅ 완료
