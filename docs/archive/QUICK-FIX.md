# 🚨 Lombok 컴파일 에러 해결법

## 문제 상황
```
error: cannot find symbol
  symbol:   method builder()
  symbol:   method getCreatedAt()
```
→ Lombok annotation processor가 Gradle에서 제대로 작동하지 않음

---

## ✅ 해결 방법 (3가지)

### 방법 1: IntelliJ Community Edition 설치 (가장 추천!)

**1. 다운로드 및 설치**
```
https://www.jetbrains.com/idea/download/
→ Community Edition (무료) 다운로드
→ 설치 완료
```

**2. 프로젝트 열기**
```
IntelliJ IDEA 실행
File → Open → C:\project\livemart 선택
```

**3. Lombok 플러그인 확인**
```
File → Settings → Plugins
→ "Lombok" 검색
→ 이미 설치되어 있음 (Community Edition 기본 포함)
→ Enable Annotation Processing 자동 활성화됨
```

**4. Gradle 동기화**
```
우측 Gradle 탭 → 🔄 새로고침
→ 의존성 다운로드 완료될 때까지 대기 (1~2분)
```

**5. 서비스 실행**
```
eureka-server/.../EurekaServerApplication.java 우클릭 → Run
api-gateway/.../ApiGatewayApplication.java 우클릭 → Run
user-service/.../UserServiceApplication.java 우클릭 → Run
product-service/.../ProductServiceApplication.java 우클릭 → Run
```

---

### 방법 2: VS Code + Java Extension

**1. VS Code 설치**
```
https://code.visualstudio.com/
```

**2. Extension 설치**
```
Ctrl + Shift + X

필수 Extensions:
- Extension Pack for Java (Microsoft)
- Spring Boot Extension Pack (VMware)
- Lombok Annotations Support for VS Code
```

**3. 프로젝트 열기**
```
File → Open Folder → C:\project\livemart
```

**4. Java Home 설정**
```
Ctrl + , (설정)
"java.configuration.runtimes" 검색

설정 추가:
{
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-21",
      "path": "C:\\Program Files\\Java\\jdk-21"
    }
  ]
}
```

**5. Gradle 빌드**
```
VS Code 터미널 (Ctrl + `)에서:
.\gradlew.bat clean build -x test
```

---

### 방법 3: Gradle에서 Lombok 강제 적용 (임시 해결)

**build.gradle 수정 (각 서비스별로)**

현재:
```gradle
compileOnly 'org.projectlombok:lombok'
annotationProcessor 'org.projectlombok:lombok'
```

추가:
```gradle
// Lombok을 강제로 컴파일 클래스패스에 추가
implementation 'org.projectlombok:lombok'
annotationProcessor 'org.projectlombok:lombok'
```

**그러나 이 방법은 권장하지 않음** → IntelliJ Community나 VS Code 사용 권장

---

## 🎯 가장 빠른 해결책

### ⏱️ 지금 당장 (5분):
1. **IntelliJ Community Edition 다운로드**
   - https://www.jetbrains.com/idea/download/
   - Community Edition 선택

2. **설치 후 프로젝트 열기**
   - File → Open → C:\project\livemart

3. **Gradle 동기화 대기** (자동)

4. **서비스 실행**
   - 우클릭 → Run

### ✅ 왜 IntelliJ Community를 추천?
- ✅ **완전 무료** (영구 사용)
- ✅ **Lombok 플러그인 기본 포함**
- ✅ **Spring Boot 완벽 지원**
- ✅ **Gradle 자동 통합**
- ✅ **디버깅, Git GUI 모두 지원**
- ✅ **Ultimate와 90% 동일한 기능**

---

## 🔍 현재 상태 확인

### 정상 작동하는 서비스:
- ✅ Eureka Server (8761) - 실행 중
- ✅ API Gateway (8080) - 컴파일 성공

### Lombok 에러로 실행 안 되는 서비스:
- ❌ User Service (8081)
- ❌ Product Service (8082)
- ❌ Order Service (8083)
- ❌ Analytics Service (8087)

---

## 📞 추가 도움

IntelliJ Community 설치 후에도 문제가 있다면:

**Enable Annotation Processing 확인:**
```
File → Settings → Build, Execution, Deployment
→ Compiler → Annotation Processors
→ ✅ Enable annotation processing 체크
```

**Lombok 플러그인 확인:**
```
File → Settings → Plugins
→ "Lombok" 검색
→ Installed 탭에서 활성화 확인
```

---

**지금 바로 IntelliJ Community Edition을 설치하세요!** 🚀
무료이고 모든 문제가 해결됩니다.
