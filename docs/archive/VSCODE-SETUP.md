# VS Code로 Spring Boot 개발하기

## 1. VS Code 설치
https://code.visualstudio.com/

## 2. 필수 Extensions 설치

VS Code에서 Extensions (Ctrl+Shift+X) 열고 다음 설치:

### Java 개발 필수
- **Extension Pack for Java** (Microsoft) - 가장 중요!
- **Spring Boot Extension Pack** (VMware)
- **Gradle for Java** (Microsoft)

### 추가 추천
- **Docker** (Microsoft)
- **YAML** (Red Hat)

## 3. Java 설정

VS Code 설정 (Ctrl+,) 에서:
```json
{
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "C:\\Program Files\\Java\\jdk-21"
    }
  ],
  "java.home": "C:\\Program Files\\Java\\jdk-21"
}
```

## 4. 프로젝트 열기

```
File → Open Folder → C:\project\livemart
```

## 5. 서비스 실행 방법

### 방법 A: VS Code Terminal에서
```powershell
# Eureka Server
.\gradlew.bat :eureka-server:bootRun

# API Gateway (새 터미널)
.\gradlew.bat :api-gateway:bootRun

# Product Service (새 터미널)
.\gradlew.bat :product-service:bootRun
```

### 방법 B: 배치 파일 더블클릭
- start-eureka.bat
- start-gateway.bat
- start-product-service.bat
- start-user-service.bat
- start-order-service.bat
- start-analytics-service.bat

## 6. 디버깅

1. 왼쪽 사이드바 "Run and Debug" (Ctrl+Shift+D)
2. "create a launch.json file" 클릭
3. "Java" 선택

## 장점
- ✅ 완전 무료
- ✅ 가볍고 빠름
- ✅ Spring Boot 개발 완벽 지원
- ✅ Git 통합
- ✅ 터미널 내장
