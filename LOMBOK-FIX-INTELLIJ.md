# 🚨 IntelliJ에서 Lombok 활성화하기

## 문제: Lombok이 작동하지 않음
```
error: cannot find symbol
  symbol: method builder()
  symbol: method getEmail()
  symbol: method getId()
```

## ✅ 해결 방법 (3단계)

### 1️⃣ Annotation Processing 활성화 (가장 중요!)

**Windows:**
```
File → Settings (또는 Ctrl + Alt + S)
```

**Mac:**
```
IntelliJ IDEA → Preferences (또는 Cmd + ,)
```

**설정 위치:**
```
Build, Execution, Deployment
  → Compiler
    → Annotation Processors
```

**체크할 항목:**
```
✅ Enable annotation processing
✅ Obtain processors from project classpath
```

**적용:**
```
Apply → OK
```

---

### 2️⃣ Lombok 플러그인 확인

```
File → Settings → Plugins
→ "Lombok" 검색
→ Installed 탭에서 확인
→ 체크박스가 활성화되어 있어야 함
```

**만약 설치되어 있지 않다면:**
```
Marketplace 탭 → "Lombok" 검색
→ Install 클릭
→ IntelliJ 재시작
```

---

### 3️⃣ 프로젝트 다시 빌드

**Gradle 새로고침:**
```
우측 Gradle 탭 클릭
→ 🔄 (새로고침 아이콘) 클릭
```

**전체 프로젝트 빌드:**
```
Build → Rebuild Project
```

또는

```
Ctrl + Shift + F9
```

---

## 🎯 완료 확인

### 빌드가 성공하면:
```
BUILD SUCCESSFUL in XX s
```

### 서비스 실행:
```
user-service/.../UserServiceApplication.java
→ 우클릭 → Run 'UserServiceApplication'
```

---

## ❌ 여전히 안 된다면?

### IntelliJ 무효화 및 재시작:
```
File → Invalidate Caches...
→ ✅ Clear file system cache and Local History
→ ✅ Clear downloaded shared indexes
→ Invalidate and Restart
```

---

## 🔍 추가 체크사항

### Java 버전 확인:
```
File → Project Structure (Ctrl + Alt + Shift + S)
→ Project
→ Project SDK: 21 (java version "21.x.x")
→ Project language level: 21 - Record patterns, pattern matching for switch
```

### Gradle JVM 확인:
```
File → Settings → Build, Execution, Deployment
→ Build Tools → Gradle
→ Gradle JVM: Project SDK (21)
```

---

**지금 바로 Annotation Processing을 활성화하세요!** 🚀
