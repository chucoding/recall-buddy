# Today I Learned Alarm

GitHub 커밋 데이터를 기반으로 학습용 플래시카드를 생성하는 PWA 애플리케이션입니다.

## 🏗️ 프로젝트 구조

```
repo/
├── app/                  # React + Vite + TypeScript (PWA)
├── functions/            # Cloud Functions (TypeScript + tsup)
├── package.json          # 워크스페이스 루트
├── pnpm-workspace.yaml
└── firebase.json
```

## 🚀 기술 스택

- **패키지 매니저**: pnpm (워크스페이스 지원)
- **프론트엔드**: Vite + React + TypeScript + PWA
- **백엔드**: Firebase Cloud Functions (TypeScript + tsup)
- **데이터베이스**: IndexedDB (클라이언트), Supabase (선택적)
- **배포**: Firebase Hosting + Functions
- **스케줄링**: Firebase Functions v2 onSchedule

## 📦 설치 및 실행

### 사전 요구사항
- Node.js 20+
- pnpm 9+
- Firebase CLI

### 설치
```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 빌드
pnpm build

# 배포
pnpm deploy
```

### 환경 변수 설정
`app/env.example`을 참고하여 `.env` 파일을 생성하세요:

```bash
cp app/env.example app/.env
```

## 🔧 개발

### 웹 앱 개발
```bash
cd app
pnpm dev
```

### Functions 개발
```bash
cd functions
pnpm serve  # 에뮬레이터 실행
```

## 📱 PWA 기능

- 오프라인 지원
- 웹 푸시 알림
- 설치 가능한 앱
- 백그라운드 동기화

## 🔔 알림 기능

- 매일 오전 8시(KST) 자동 알림
- Firebase Cloud Messaging 사용
- 토픽 기반 브로드캐스트

## 🚀 배포

### Firebase 설정
```bash
firebase login
firebase init hosting functions
```

### CI/CD
GitHub Actions를 통한 자동 배포:
- `main` 브랜치 푸시 시 자동 배포
- Firebase Hosting + Functions 동시 배포

## 📝 라이선스

MIT License