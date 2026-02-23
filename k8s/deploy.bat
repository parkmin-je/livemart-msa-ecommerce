@echo off
chcp 65001 > nul
echo ================================================
echo  LiveMart - Kubernetes 배포
echo ================================================
echo.

set K8S_DIR=%~dp0

echo [1/4] kubectl 컨텍스트 확인...
kubectl config use-context docker-desktop
kubectl config current-context
echo.

echo [2/4] Namespace / ConfigMap / Secret 적용...
kubectl apply -f "%K8S_DIR%base\namespace.yml"
kubectl apply -f "%K8S_DIR%base\configmap.yml"
kubectl apply -f "%K8S_DIR%base\secrets.yml"
echo.

echo [3/4] 인프라 배포 (DB, Kafka, Redis, Monitoring)...
kubectl apply -f "%K8S_DIR%infra\postgres.yml"
kubectl apply -f "%K8S_DIR%infra\redis.yml"
kubectl apply -f "%K8S_DIR%infra\kafka.yml"
kubectl apply -f "%K8S_DIR%infra\monitoring.yml"
echo.
echo 인프라 준비 대기 중 (30초)...
timeout /t 30 /nobreak
echo.

echo [4/4] 애플리케이션 서비스 배포...
kubectl apply -f "%K8S_DIR%services\eureka-server.yml"
echo Eureka 준비 대기 중 (20초)...
timeout /t 20 /nobreak
kubectl apply -f "%K8S_DIR%services\api-gateway.yml"
kubectl apply -f "%K8S_DIR%services\user-service.yml"
kubectl apply -f "%K8S_DIR%services\product-service.yml"
kubectl apply -f "%K8S_DIR%services\order-service.yml"
kubectl apply -f "%K8S_DIR%services\payment-service.yml"
echo.

echo ================================================
echo  배포 완료! Pod 상태 확인 중...
echo ================================================
kubectl get pods -n livemart
echo.
echo [접속 주소]
echo  API Gateway  : kubectl port-forward svc/api-gateway 8080:8080 -n livemart
echo  Eureka       : kubectl port-forward svc/eureka-server 8761:8761 -n livemart
echo  Grafana      : kubectl port-forward svc/grafana 3000:3000 -n livemart
echo  Prometheus   : kubectl port-forward svc/prometheus 9090:9090 -n livemart
echo  Zipkin       : kubectl port-forward svc/zipkin 9411:9411 -n livemart
echo.
pause
