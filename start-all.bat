@echo off
echo ====================================
echo LiveMart MSA - 전체 서비스 시작
echo ====================================
echo.

REM 1. Docker 인프라 시작
echo [1/8] Docker 인프라 시작 중...
docker-compose -f docker-compose-infra.yml up -d
if %errorlevel% neq 0 (
    echo ERROR: Docker 인프라 시작 실패!
    pause
    exit /b 1
)
echo Docker 인프라 시작 완료!
echo.

REM 2. 인프라가 완전히 시작될 때까지 대기
echo [2/8] 인프라 준비 대기 중 (30초)...
timeout /t 30 /nobreak
echo.

REM 3. Eureka Server 시작
echo [3/8] Eureka Server 시작 중 (8761)...
start "Eureka Server" cmd /k "cd /d %~dp0 && gradlew.bat :eureka-server:bootRun"
timeout /t 30 /nobreak
echo Eureka Server 시작 완료!
echo.

REM 4. API Gateway 시작
echo [4/8] API Gateway 시작 중 (8080)...
start "API Gateway" cmd /k "cd /d %~dp0 && gradlew.bat :api-gateway:bootRun"
timeout /t 20 /nobreak
echo API Gateway 시작 완료!
echo.

REM 5. Product Service 시작
echo [5/8] Product Service 시작 중 (8082)...
start "Product Service" cmd /k "cd /d %~dp0 && gradlew.bat :product-service:bootRun"
timeout /t 5 /nobreak
echo.

REM 6. Order Service 시작
echo [6/8] Order Service 시작 중 (8083)...
start "Order Service" cmd /k "cd /d %~dp0 && gradlew.bat :order-service:bootRun"
timeout /t 5 /nobreak
echo.

REM 7. Payment Service 시작
echo [7/8] Payment Service 시작 중 (8084)...
start "Payment Service" cmd /k "cd /d %~dp0 && gradlew.bat :payment-service:bootRun"
timeout /t 5 /nobreak
echo.

REM 8. User Service 시작
echo [8/8] User Service 시작 중 (8085)...
start "User Service" cmd /k "cd /d %~dp0 && gradlew.bat :user-service:bootRun"
echo.

echo ====================================
echo 모든 서비스 시작 완료!
echo ====================================
echo.
echo 실행 중인 서비스:
echo - Eureka Server:     http://localhost:8761
echo - API Gateway:       http://localhost:8080
echo - Product Service:   http://localhost:8082
echo - Order Service:     http://localhost:8083
echo - Payment Service:   http://localhost:8084
echo - User Service:      http://localhost:8085
echo.
echo Frontend는 별도로 시작해주세요:
echo   cd frontend ^&^& npm run dev
echo.
pause
