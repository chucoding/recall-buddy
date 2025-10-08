# Today I Learned Alarm

매일 학습한 내용을 정리하고 알림을 받는 앱입니다.

## 🚀 빠른 시작

### 1. 환경 설정
```bash
# Firebase 프로젝트 정보를 사용해 app/.env에 Functions 프록시 주소 생성/추가
pnpm env:setup

# (옵션) 수동 설정 시 app/.env에 다음 키들을 추가하세요
# Firebase Web 설정 (Console > 프로젝트 설정 > 일반 > 웹 앱 구성에서 복사)
VITE_API_KEY=...
VITE_AUTH_DOMAIN=...
VITE_PROJECT_ID=...
VITE_STORAGE_BUCKET=...
VITE_MESSAGING_SENDER_ID=...
VITE_APP_ID=...
VITE_MEASUREMENT_ID=...

# Functions 호출용 (env:setup가 자동 추가)
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_REGION=us-central1
VITE_FUNCTIONS_URL_LOCAL=http://localhost:5001/your-project-id/us-central1
VITE_FUNCTIONS_URL_PROD=https://us-central1-your-project-id.cloudfunctions.net
```

### 2. 개발 서버 시작
```bash
pnpm dev
```

### 3. Firebase Functions 설정
```bash
cd functions

# 환경변수 설정 (로컬 개발용)
echo "GITHUB_TOKEN=your_github_token_here" > .env

# Functions 실행
pnpm serve
```

## 📁 프로젝트 구조

```
├── app/                    # React 앱 (프론트엔드)
│   ├── src/
│   │   ├── api/           # API 호출 함수들
│   │   ├── modules/       # 유틸리티 (axios 등)
│   │   └── pages/         # 페이지 컴포넌트들
│   └── vite.config.ts     # Vite 설정 (프록시 포함)
├── functions/              # Firebase Functions (백엔드)
│   ├── src/
│   │   ├── github.ts      # GitHub API Functions
│   │   ├── schedule.ts    # 스케줄러 Functions
│   │   └── hypercloax.ts  # Hypercloax API Functions
│   └── package.json
└── scripts/
    └── setup-proxy.js     # app/.env에 Functions URL 자동 추가/보강 스크립트
```

## 🔧 환경변수

### 앱 환경변수 (app/.env)
```bash
# Firebase Web 설정 (콘솔에서 복사)
VITE_API_KEY=...
VITE_AUTH_DOMAIN=...
VITE_PROJECT_ID=...
VITE_STORAGE_BUCKET=...
VITE_MESSAGING_SENDER_ID=...
VITE_APP_ID=...
VITE_MEASUREMENT_ID=...

# Functions 호출 설정 (env:setup 실행 시 자동 추가/보강)
VITE_FIREBASE_PROJECT_ID=til-alarm
VITE_FIREBASE_REGION=us-central1
VITE_FUNCTIONS_URL_LOCAL=http://localhost:5001/til-alarm/us-central1
VITE_FUNCTIONS_URL_PROD=https://us-central1-til-alarm.cloudfunctions.net
```

### Functions 환경변수 (functions/.env)
```bash
GITHUB_TOKEN=your_github_token_here
CLOVA_API_KEY=your_clova_api_key
NCLOUD_API_KEY=your_ncloud_api_key
```

## 🚀 배포

### Functions 개별 배포
```bash
cd functions

# GitHub API만 배포
pnpm deploy:github

# Schedule만 배포
pnpm deploy:schedule

# Hypercloax만 배포
pnpm deploy:hypercloax

# 전체 배포
pnpm deploy
```

### 앱 배포
```bash
# 루트에서 전체 배포
pnpm deploy
```

## 🔄 API 구조

### GitHub API
- `GET /api/getCommits?since={date}&until={date}` - 커밋 목록
- `GET /api/getFilename?commit_sha={sha}` - 커밋 상세
- `GET /api/getMarkdown?filename={filename}` - 마크다운 내용

### Hypercloax API
- `POST /api/chatCompletions` - CLOVA Studio 질문 생성
- `POST /api/registerDeviceToken` - FCM 토큰 등록
- `POST /api/removeDeviceToken` - FCM 토큰 삭제
- `POST /api/registerSchedule` - 스케줄 등록

### Schedule
- 자동 실행 (매일 오전 8시 KST)

## 🛠️ 개발 도구

- **프론트엔드**: React + TypeScript + Vite
- **백엔드**: Firebase Functions + TypeScript
- **API 통신**: Axios
- **배포**: Firebase Hosting + Functions