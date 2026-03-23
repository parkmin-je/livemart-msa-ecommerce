# 데이터베이스 스키마 — LiveMart MSA

각 서비스는 독립된 DB 인스턴스를 사용합니다 (Database per Service 패턴).

## user-service (MySQL 8.0 / userdb)

```mermaid
erDiagram
    users {
        bigint id PK
        varchar email UK
        varchar password_hash
        varchar name
        varchar phone
        varchar role "USER | SELLER | ADMIN"
        boolean email_verified
        boolean mfa_enabled
        varchar mfa_secret
        timestamp created_at
        timestamp updated_at
    }

    oauth2_accounts {
        bigint id PK
        bigint user_id FK
        varchar provider "GOOGLE | KAKAO | NAVER"
        varchar provider_id
        timestamp linked_at
    }

    security_audit_logs {
        bigint id PK
        bigint user_id FK
        varchar event_type "LOGIN | LOGOUT | FAILED_LOGIN | MFA_ENABLED"
        varchar ip_address
        varchar user_agent
        timestamp created_at
    }

    users ||--o{ oauth2_accounts : "has"
    users ||--o{ security_audit_logs : "generates"
```

## product-service (PostgreSQL / productdb)

```mermaid
erDiagram
    products {
        bigint id PK
        varchar name
        text description
        decimal price
        decimal original_price
        bigint category_id FK
        bigint seller_id
        varchar status "ACTIVE | INACTIVE | DELETED"
        varchar image_url
        int stock_quantity
        timestamp created_at
        timestamp updated_at
    }

    categories {
        bigint id PK
        varchar name
        bigint parent_id FK
        int depth
    }

    reviews {
        bigint id PK
        bigint product_id FK
        bigint user_id
        int rating "1-5"
        text content
        boolean verified_purchase
        timestamp created_at
    }

    products ||--o{ reviews : "has"
    categories ||--o{ products : "contains"
    categories ||--o{ categories : "parent-child"
```

## order-service (PostgreSQL / orderdb)

```mermaid
erDiagram
    orders {
        bigint id PK
        varchar order_number UK
        bigint user_id
        varchar status "PENDING | CONFIRMED | SHIPPED | DELIVERED | CANCELLED"
        decimal total_amount
        varchar delivery_address
        varchar phone_number
        varchar payment_method
        varchar payment_transaction_id
        timestamp created_at
        timestamp updated_at
    }

    order_items {
        bigint id PK
        bigint order_id FK
        bigint product_id
        varchar product_name
        int quantity
        decimal unit_price
        decimal subtotal
    }

    outbox_events {
        bigint id PK
        varchar aggregate_type
        varchar aggregate_id
        varchar event_type
        text payload
        varchar status "PENDING | PUBLISHED | FAILED"
        int retry_count
        timestamp created_at
        timestamp published_at
    }

    orders ||--|{ order_items : "contains"
```

## payment-service (PostgreSQL / paymentdb)

```mermaid
erDiagram
    payments {
        bigint id PK
        bigint order_id
        varchar idempotency_key UK
        varchar status "PENDING | COMPLETED | FAILED | REFUNDED"
        decimal amount
        varchar currency "KRW"
        varchar payment_gateway "STRIPE | TOSS"
        varchar transaction_id
        text failure_reason
        timestamp created_at
        timestamp updated_at
    }

    refunds {
        bigint id PK
        bigint payment_id FK
        decimal amount
        varchar reason
        varchar status "PENDING | COMPLETED | FAILED"
        varchar gateway_refund_id
        timestamp created_at
    }

    payments ||--o{ refunds : "may have"
```

## 서비스 간 데이터 참조 방식

```mermaid
graph TB
    subgraph "order-service (PostgreSQL)"
        OT[orders table]
        OI[order_items table]
    end

    subgraph "product-service (PostgreSQL)"
        PT[products table]
    end

    subgraph "user-service (MySQL)"
        UT[users table]
    end

    subgraph "payment-service (PostgreSQL)"
        PAT[payments table]
    end

    OT -->|"user_id (ID 참조만, FK 없음)"| UT
    OI -->|"product_id (ID 참조만, FK 없음)"| PT
    PAT -->|"order_id (ID 참조만, FK 없음)"| OT

    style OT fill:#e8f4f8
    style PT fill:#e8f4f8
    style UT fill:#f8e8e8
    style PAT fill:#e8f8e8
```

> **설계 원칙**: 서비스 간 외래키(FK) 제약 없음. ID만 보관하며 데이터는 API/이벤트로 조회.
> 데이터 일관성은 Saga + Outbox 패턴으로 보장.
