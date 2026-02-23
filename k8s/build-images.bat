@echo off
chcp 65001 > nul
echo ================================================
echo  LiveMart - Docker 이미지 빌드
echo ================================================
echo.

set PROJECT_ROOT=%~dp0..
set TAG=latest

echo [1/6] Gradle 전체 빌드 중...
cd /d %PROJECT_ROOT%
call gradlew.bat :eureka-server:bootJar :api-gateway:bootJar :user-service:bootJar :product-service:bootJar :order-service:bootJar :payment-service:bootJar -x test
if %errorlevel% neq 0 (
    echo ERROR: Gradle 빌드 실패!
    pause
    exit /b 1
)
echo Gradle 빌드 완료!
echo.

echo [2/6] eureka-server 이미지 빌드...
docker build -t livemart/eureka-server:%TAG% %PROJECT_ROOT%\eureka-server
if %errorlevel% neq 0 ( echo ERROR: eureka-server 빌드 실패! & pause & exit /b 1 )

echo [3/6] api-gateway 이미지 빌드...
docker build -t livemart/api-gateway:%TAG% %PROJECT_ROOT%\api-gateway
if %errorlevel% neq 0 ( echo ERROR: api-gateway 빌드 실패! & pause & exit /b 1 )

echo [4/6] user-service 이미지 빌드...
docker build -t livemart/user-service:%TAG% %PROJECT_ROOT%\user-service
if %errorlevel% neq 0 ( echo ERROR: user-service 빌드 실패! & pause & exit /b 1 )

echo [5/6] product-service 이미지 빌드...
docker build -t livemart/product-service:%TAG% %PROJECT_ROOT%\product-service
if %errorlevel% neq 0 ( echo ERROR: product-service 빌드 실패! & pause & exit /b 1 )

echo [6/6] order-service / payment-service 이미지 빌드...
docker build -t livemart/order-service:%TAG% %PROJECT_ROOT%\order-service
docker build -t livemart/payment-service:%TAG% %PROJECT_ROOT%\payment-service
if %errorlevel% neq 0 ( echo ERROR: 빌드 실패! & pause & exit /b 1 )

echo.
echo ================================================
echo  빌드 완료! 생성된 이미지:
echo ================================================
docker images | findstr livemart
echo.
echo 다음 단계: deploy.bat 실행
pause
