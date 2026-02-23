@echo off
chcp 65001 > nul
echo ================================================
echo  LiveMart - Kubernetes 상태 확인
echo ================================================
echo.
echo [Pods]
kubectl get pods -n livemart
echo.
echo [Services]
kubectl get svc -n livemart
echo.
echo [HPA (Auto Scaling)]
kubectl get hpa -n livemart
echo.
pause
