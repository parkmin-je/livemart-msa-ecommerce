@echo off
chcp 65001 > nul
echo ================================================
echo  LiveMart - Kubernetes 전체 삭제
echo ================================================
echo.
set /p CONFIRM="정말 전체 삭제하시겠습니까? (y/n): "
if /i "%CONFIRM%" neq "y" ( echo 취소됨. & pause & exit /b 0 )

echo 전체 리소스 삭제 중...
kubectl delete namespace livemart

echo.
echo 삭제 완료!
pause
