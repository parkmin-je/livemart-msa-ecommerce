#!/bin/bash

echo "========================================"
echo "User Service API 테스트"
echo "========================================"
echo ""

# 1. Health Check
echo "1. Health Check 테스트..."
curl -s http://localhost:8081/api/users/health
echo -e "\n"

# 2. Actuator Health
echo "2. Actuator Health 테스트..."
curl -s http://localhost:8081/actuator/health | head -c 200
echo -e "...\n"

# 3. PostgreSQL 사용자 확인
echo "3. PostgreSQL에 저장된 사용자 확인..."
docker exec livemart-postgres-user psql -U userapp -d userdb -c "SELECT id, email, name, role, status FROM users LIMIT 5;" 2>&1 | head -10
echo ""

# 4. Redis 연결 확인
echo "4. Redis 연결 확인..."
docker exec livemart-redis redis-cli ping
echo ""

# 5. Flyway 마이그레이션 이력
echo "5. Flyway 마이그레이션 이력..."
docker exec livemart-postgres-user psql -U userapp -d userdb -c "SELECT version, description, type, installed_on, success FROM flyway_schema_history ORDER BY installed_rank;" 2>&1 | head -15
echo ""

# 6. OpenAPI 문서 확인
echo "6. OpenAPI 문서 확인..."
curl -s http://localhost:8081/api-docs | head -c 150
echo -e "...\n"

echo "========================================"
echo "✅ 모든 기본 테스트 완료!"
echo "========================================"
echo ""
echo "📌 Swagger UI: http://localhost:8081/swagger-ui.html"
echo "📌 API Docs: http://localhost:8081/api-docs"
echo "📌 Health: http://localhost:8081/actuator/health"
