@echo off
echo ====================================
echo LiveMart MSA - 전체 서비스 중지
echo ====================================
echo.

REM 1. Gradle 프로세스 종료
echo [1/2] 애플리케이션 서비스 중지 중...
taskkill /F /FI "WINDOWTITLE eq Eureka Server*" 2>nul
taskkill /F /FI "WINDOWTITLE eq API Gateway*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Product Service*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Order Service*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Payment Service*" 2>nul
taskkill /F /FI "WINDOWTITLE eq User Service*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Analytics Service*" 2>nul
echo 애플리케이션 서비스 중지 완료!
echo.

REM 2. Docker 컨테이너 중지
echo [2/2] Docker 인프라 중지 중...
docker-compose -f docker-compose-infra.yml down
if %errorlevel% neq 0 (
    echo WARNING: Docker 인프라 중지 실패 (이미 중지되었을 수 있습니다)
) else (
    echo Docker 인프라 중지 완료!
)
echo.

echo ====================================
echo 모든 서비스 중지 완료!
echo ====================================
pause
