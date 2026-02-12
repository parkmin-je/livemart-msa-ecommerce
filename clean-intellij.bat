@echo off
echo ========================================
echo IntelliJ IDEA 캐시 및 설정 정리
echo ========================================

echo.
echo [1/5] Gradle 캐시 정리 중...
cd /d C:\project\livemart
call gradlew.bat clean

echo.
echo [2/5] Gradle 빌드 디렉토리 삭제 중...
for /d %%i in (*-service\build) do (
    if exist "%%i" (
        echo 삭제 중: %%i
        rmdir /s /q "%%i"
    )
)

echo.
echo [3/5] IntelliJ IDEA 프로젝트 파일 삭제 중...
if exist ".idea" (
    echo 삭제 중: .idea 폴더
    rmdir /s /q ".idea"
)
if exist "*.iml" (
    echo 삭제 중: *.iml 파일
    del /q *.iml
)

echo.
echo [4/5] Gradle 래퍼 캐시 정리 중...
if exist ".gradle" (
    echo 삭제 중: .gradle 폴더
    rmdir /s /q ".gradle"
)

echo.
echo [5/5] 완료!
echo.
echo ========================================
echo 정리 완료! IntelliJ를 다시 시작하세요.
echo ========================================
echo.
echo 다음 단계:
echo 1. IntelliJ IDEA 열기
echo 2. File -^> Open -^> C:\project\livemart
echo 3. Gradle 동기화 완료 대기
echo 4. Build -^> Rebuild Project
echo.
pause
