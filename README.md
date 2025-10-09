# RecallBuddy

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

# Functions 호출용 (`pnpm proxy`로 자동 추가)
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_REGION=
VITE_FUNCTIONS_URL_LOCAL=
VITE_FUNCTIONS_URL_PROD=
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

# Functions 호출 설정 (`pnpm proxy` 실행 시 자동 추가)
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_REGION=
VITE_FUNCTIONS_URL_LOCAL=
VITE_FUNCTIONS_URL_PROD=
```

### Functions 환경변수 (functions/.env)
```bash
CLOVA_API_KEY=your_clova_api_key
```

## 🌏 리전 설정

이 프로젝트는 기본적으로 **Seoul (asia-northeast3)** 리전에 배포됩니다.

### 사용 가능한 Firebase Functions 리전
- `asia-northeast3` - Seoul (서울) ⭐ 기본값
- `asia-northeast1` - Tokyo (도쿄)
- `us-central1` - Iowa (아이오와)
- `us-west1` - Oregon (오레곤)
- `europe-west1` - Belgium (벨기에)
- [전체 리전 목록](https://firebase.google.com/docs/functions/locations)

### 리전 변경 방법

다른 리전으로 변경하려면 다음 파일들을 수정하세요:

#### 1. Functions 코드 (모든 함수의 region 옵션 수정)

**`functions/src/github.ts`**
```typescript
export const getCommits = onRequest(
  { cors: true, region: 'your-region' },  // 변경
  async (req, res) => { ... }
);
// getFilename, getMarkdown, getRepositories, getBranches도 동일하게 수정
```

**`functions/src/hyperclovax.ts`**
```typescript
export const chatCompletions = onRequest(
  { cors: true, region: 'your-region' },  // 변경
  async (req, res) => { ... }
);
```

**`functions/src/schedule.ts`**
```typescript
export const sendDaily8amPush = onSchedule(
  {
    schedule: '0 23 * * *',
    timeZone: 'Asia/Seoul',
    region: 'your-region'  // 변경
  },
  async () => { ... }
);
```

#### 2. Setup 스크립트 (환경변수 자동 생성용)

**`scripts/setup-proxy.js`**
```javascript
const envVars = {
  VITE_FIREBASE_PROJECT_ID: projectId,
  VITE_FIREBASE_REGION: 'your-region',  // 변경
  VITE_FUNCTIONS_URL_LOCAL: `http://localhost:5001/${projectId}/your-region`,  // 변경
  VITE_FUNCTIONS_URL_PROD: `https://your-region-${projectId}.cloudfunctions.net`  // 변경
};
```

#### 3. 환경변수 재생성

```bash
# setup 스크립트 재실행하여 app/.env 업데이트
pnpm env:setup
```

## 🚀 배포

### ⚠️ 배포 전 체크리스트

**Firebase Hosting은 정적 파일 호스팅이므로, 환경 변수는 빌드 시점에 코드에 포함됩니다.**

1. **`app/.env` 파일이 올바르게 설정되어 있는지 확인**
   ```bash
   # app/.env 파일이 있는지 확인
   cat app/.env  # Linux/Mac
   type app\.env  # Windows
   ```

2. **환경 변수 변경 시 반드시 재빌드**
   ```bash
   pnpm build
   ```

3. **민감 정보 주의**: `.env` 파일의 내용은 빌드된 JavaScript에 포함되어 브라우저에서 볼 수 있습니다.
   - API 키, 프로젝트 ID 등은 괜찮음 (Firebase 자체적으로 보안 규칙으로 보호)
   - 절대 비밀키(Secret Key)를 클라이언트 코드에 넣지 마세요!

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

### 앱 배포 (Hosting)
```bash
# 1. 빌드 (환경 변수 포함)
pnpm build

# 2. 배포
firebase deploy --only hosting

# 또는 한 번에 (루트에서 전체 빌드 + 배포)
pnpm push
```

### CI/CD 자동 배포 (GitHub Actions)

GitHub Actions 워크플로우가 이미 설정되어 있습니다:
- **PR 생성 시**: 미리보기 배포 (`.github/workflows/firebase-hosting-pull-request.yml`)
- **main 브랜치 머지 시**: 프로덕션 배포 (`.github/workflows/firebase-hosting-merge.yml`)

#### 🔧 GitHub Secrets 설정 (필수)

GitHub Actions가 정상 동작하려면 환경 변수를 GitHub Secrets에 추가해야 합니다.

**1. GitHub Repository 설정으로 이동**
   - Repository 페이지 > Settings > Secrets and variables > Actions

**2. New repository secret 클릭 후 다음 값들을 추가**

로컬 `app/.env` 파일의 값을 복사하여 하나씩 추가:

| Secret Name | 설명 |
|-------------|------|
| `VITE_API_KEY` | Firebase API 키 |
| `VITE_AUTH_DOMAIN` | Firebase Auth 도메인 |
| `VITE_PROJECT_ID` | Firebase 프로젝트 ID |
| `VITE_STORAGE_BUCKET` | Firebase Storage 버킷 |
| `VITE_MESSAGING_SENDER_ID` | FCM 발신자 ID |
| `VITE_APP_ID` | Firebase 앱 ID |
| `VITE_MEASUREMENT_ID` | Google Analytics 측정 ID |
| `VITE_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID (Functions용) |
| `VITE_FIREBASE_REGION` | Firebase Functions 리전 |
| `VITE_FUNCTIONS_URL_LOCAL` | Functions 로컬 URL |
| `VITE_FUNCTIONS_URL_PROD` | Functions 프로덕션 URL |

**3. Firebase Service Account (이미 설정되어 있음)**
   - `FIREBASE_SERVICE_ACCOUNT_TIL_ALARM`은 이미 설정되어 있습니다.

**4. 확인**
   - main 브랜치에 푸시하거나 PR을 생성하면 자동으로 배포됩니다.
   - Actions 탭에서 워크플로우 실행 상태를 확인할 수 있습니다.

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