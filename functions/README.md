# Firebase Functions - 모듈별 분리

이 폴더는 3개의 모듈로 분리된 Firebase Functions를 포함합니다.

## 모듈 구조

### 1. GitHub API (`src/github.ts`)
- `getCommits` - 커밋 목록 조회
- `getFilename` - 커밋 상세 정보 조회  
- `getMarkdown` - 마크다운 파일 내용 조회

### 2. Schedule (`src/schedule.ts`)
- `sendDaily8amPush` - 매일 오전 8시 푸시 알림 전송

### 3. Hypercloax (`src/hypercloax.ts`)
- `hypercloaxApi` - Hypercloax API 연동 (구현 예정)

## 환경변수 설정

### 1. 로컬 개발용 (.env 파일)
```bash
# functions 폴더에 .env 파일 생성
cp env.example .env

# .env 파일에서 GITHUB_TOKEN 설정
GITHUB_TOKEN=your_github_token_here
```

### 2. 프로덕션용 (Firebase Config)
```bash
# Firebase Functions 환경변수 설정
firebase functions:config:set github.token="your_github_token_here"

# 설정 확인
firebase functions:config:get
```

### 환경변수 우선순위
1. `process.env.GITHUB_TOKEN` (로컬 개발용)
2. `functions.config().github.token` (프로덕션용)

## 배포 방법

### 전체 Functions 배포
```bash
pnpm deploy
```

### 개별 모듈 배포
```bash
# GitHub API만 배포
pnpm deploy:github

# Schedule만 배포
pnpm deploy:schedule

# Hypercloax만 배포
pnpm deploy:hypercloax
```

## 로컬 개발

```bash
# 로컬에서 Functions 실행
pnpm serve
```

## API 엔드포인트

배포 후 다음 엔드포인트를 사용할 수 있습니다:

### GitHub API
- `GET /getCommits?since={date}&until={date}` - 커밋 목록 조회
- `GET /getFilename?commit_sha={sha}` - 커밋 상세 정보 조회
- `GET /getMarkdown?filename={filename}` - 마크다운 파일 내용 조회

### Schedule
- 자동 실행 (매일 오전 8시 KST)

### Hypercloax
- `GET /hypercloaxApi?method={method}&path={path}` - Hypercloax API 호출