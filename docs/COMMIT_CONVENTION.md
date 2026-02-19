# 커밋 메시지 컨벤션

## 기본 원칙

**"왜 이 변경을 했는가"를 명확히 설명합니다.**

좋은 커밋 메시지는:
- 코드 리뷰 시간을 단축시킵니다
- 미래의 나와 팀원이 변경 이유를 이해하는 데 도움을 줍니다
- 프로젝트 히스토리를 이해하기 쉽게 만듭니다

## 커밋 메시지 구조

```
<type>: <subject>

<body>

<footer>
```

### Type (필수)

| Type | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 추가 | feat: Saga Pattern 보상 트랜잭션 구현 |
| `fix` | 버그 수정 | fix: Redis Cluster 연결 실패 문제 해결 |
| `refactor` | 코드 리팩토링 (기능 변경 없음) | refactor: PaymentService 생성자 의존성 주입 방식 변경 |
| `docs` | 문서 수정 | docs: README에 로컬 실행 방법 추가 |
| `style` | 코드 포맷팅, 세미콜론 누락 등 | style: 코드 포맷팅 적용 |
| `test` | 테스트 코드 추가/수정 | test: OrderService 통합 테스트 추가 |
| `chore` | 빌드 설정, 패키지 매니저 설정 등 | chore: Gradle 버전 8.5로 업그레이드 |
| `perf` | 성능 개선 | perf: Redis 캐싱으로 상품 조회 성능 개선 |

### Subject (필수)

- 50자 이내로 작성
- 마침표 사용 안 함
- 명령조로 작성 ("추가한다" ❌, "추가" ✅)
- 무엇을 했는지 간결하게 설명

**Good:**
```
fix: Payment Service 기동 실패 문제 해결
```

**Bad:**
```
수정함
버그 픽스
음.. 이것저것 고침
```

### Body (선택적, 복잡한 변경사항에 권장)

- 왜 이 변경을 했는지 설명
- 어떻게 문제를 해결했는지 설명
- 부작용이나 고려사항이 있다면 명시

```
fix: Redis Cluster 설정으로 인한 서비스 기동 실패 해결

문제:
- Payment Service가 Redis Cluster 모드로 연결 시도
- 로컬 환경에는 Standalone Redis만 실행 중
- Health check가 DOWN 상태로 서비스 사용 불가

해결:
- RedisClusterConfig를 비활성화 (.disabled로 rename)
- 단순한 RedisConfig(Standalone 모드) 생성
- application.yml의 redis.host/port 설정 활용

영향:
- 로컬 개발 환경에서 정상 동작
- 프로덕션 배포 시 Cluster 설정 필요
```

### Footer (선택적)

- 이슈 트래커 ID 연결
- Breaking Change 명시
- Co-Authored-By 명시 (페어 프로그래밍, AI 협업 시)

```
Resolves: #123
See also: #456, #789

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## 실전 예시

### 예시 1: 간단한 버그 수정
```
fix: Feign Client API 경로 불일치 문제 해결

Order Service → Payment Service 호출 시
/api/payments와 /api/v1/payments 경로 불일치로 404 발생.
PaymentFeignClient 경로를 /api/v1/payments로 수정.
```

### 예시 2: 새로운 기능 추가
```
feat: Payment Service에 분산 락 기반 중복 결제 방지 추가

동일한 주문에 대해 중복 결제 요청이 발생할 수 있는 문제를 해결.
Redis Redisson 분산 락을 사용하여 orderNumber를 키로 동시성 제어.

구현 내용:
- RLock을 활용한 결제 처리 임계 영역 보호
- 5초 타임아웃 설정
- 락 획득 실패 시 BusinessException 발생

테스트:
- 동일 주문 번호로 100개 동시 요청 시 1개만 성공 확인
```

### 예시 3: 리팩토링
```
refactor: EventPublisher를 Optional 의존성으로 변경

문제:
- EventPublisher가 필수 의존성으로 설정되어 있음
- Kafka 없는 로컬 환경에서 서비스 기동 실패

해결:
- EventPublisher를 Optional<EventPublisher>로 변경
- 이벤트 발행 시 null 체크 추가
- Kafka 미사용 환경에서도 서비스 정상 기동

영향:
- 로컬 개발 편의성 향상
- 프로덕션 환경에서는 기존과 동일하게 동작
```

### 예시 4: 문서 수정
```
docs: README에 학습 과정에서 겪은 문제 섹션 추가

면접 대비 및 학습 증명을 위해 실제로 해결한 문제들을 문서화:
- Redis Cluster vs Standalone 설정 이슈
- Feign Client API 경로 불일치
- Payment DTO 필드명 매핑 오류

각 문제마다 원인, 해결 방법, 학습 내용 명시.
```

## Anti-Pattern (피해야 할 패턴)

### ❌ Bad Examples

```
수정
버그 수정
update
fix bug
코드 개선
작업 완료
...
테스트
Merge branch 'main'
```

### ✅ Good Examples

```
fix: Kafka consumer offset 초기화 문제 해결
feat: Saga Pattern 보상 트랜잭션 구현
refactor: Payment Service 생성자 의존성 주입으로 변경
docs: API 명세에 에러 응답 형식 추가
test: Order Service 통합 테스트 추가
```

## 커밋 단위

### 하나의 커밋 = 하나의 논리적 변경

**Good:**
```
commit 1: feat: User 도메인 엔티티 추가
commit 2: feat: User Repository 추가
commit 3: feat: 회원가입 API 구현
```

**Bad:**
```
commit 1: 회원가입 기능 전부 추가 (Entity, Repository, Service, Controller, Test 한꺼번에)
```

## AI 도구 활용 시

AI (Claude, GPT 등)를 활용하여 코드를 작성한 경우:

```
feat: Kafka 이벤트 발행 기능 추가

Order 생성 시 order-created 이벤트를 Kafka에 발행.
Payment Service와 Inventory Service가 해당 이벤트를 구독.

구현:
- DomainEvent DTO 정의
- EventPublisher 인터페이스 및 구현체
- OrderService에서 이벤트 발행 로직 추가

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## 체크리스트

커밋하기 전 확인사항:

- [ ] Type이 적절한가?
- [ ] Subject가 50자 이내인가?
- [ ] 변경 이유(Why)를 설명하는가?
- [ ] 한 커밋에 하나의 논리적 변경사항만 포함되는가?
- [ ] 테스트를 통과하는가?
- [ ] 불필요한 파일(로그, 임시 파일)이 포함되지 않았는가?

## 참고 자료

- [Conventional Commits](https://www.conventionalcommits.org/)
- [How to Write a Git Commit Message](https://chris.beams.io/posts/git-commit/)
- [Angular Commit Message Format](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
