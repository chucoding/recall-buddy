#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Firebase 프로젝트 설정을 확인하고 환경변수를 설정합니다...\n');

const ensureTrailingNewline = (text) => (text.endsWith('\n') ? text : text + '\n');
const parseEnvToMap = (content) => {
  const map = new Map();
  (content || '').split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.substring(0, eqIdx).trim();
    const value = trimmed.substring(eqIdx + 1).trim();
    map.set(key, value);
  });
  return map;
};
const upsertEnvVars = (existingContent, newVars, sectionTitle) => {
  let result = existingContent || '';
  result = ensureTrailingNewline(result);
  if (sectionTitle && !result.includes(sectionTitle)) {
    result += `\n${sectionTitle}\n`;
  }
  const existingMap = parseEnvToMap(result);
  Object.entries(newVars).forEach(([key, value]) => {
    if (value == null || value === '') return;
    if (!existingMap.has(key)) {
      result += `${key}=${value}\n`;
    } else {
      // 이미 키가 존재하지만 값이 비어있는 경우에는 값을 채워준다
      const regex = new RegExp(`^(${key})=\s*$`, 'm');
      if (regex.test(result)) {
        result = result.replace(regex, `$1=${value}`);
        console.log(`   ✏️  ${key}의 빈 값을 채웠습니다.`);
      } else {
        console.log(`   ⚠️  ${key}는 이미 존재합니다. 건너뜁니다.`);
      }
    }
  });
  return result;
};

try {
  // Firebase 프로젝트 정보 가져오기 (현재 선택된 프로젝트 ID)
  const projectId = execSync('firebase use', { encoding: 'utf8' }).trim();
  console.log(`📋 현재 Firebase 프로젝트: ${projectId}`);
  
  // .env 파일 경로
  const envPath = path.join(__dirname, '..', 'app', '.env');
  
  // 환경변수 내용 생성 (Functions용)
  const envVars = {
    VITE_FIREBASE_PROJECT_ID: projectId,
    VITE_FIREBASE_REGION: 'us-central1',
    VITE_FUNCTIONS_URL_LOCAL: `http://localhost:5001/${projectId}/us-central1`,
    VITE_FUNCTIONS_URL_PROD: `https://us-central1-${projectId}.cloudfunctions.net`
  };
  
  let envFileContent = '';
  
  if (fs.existsSync(envPath)) {
    console.log('📄 기존 .env 파일을 발견했습니다.');
    envFileContent = fs.readFileSync(envPath, 'utf8');
    envFileContent = upsertEnvVars(envFileContent, envVars, '# Firebase Functions 설정 (자동 생성)');
    console.log('   ✅ 기존 내용을 보존하고 Functions 환경변수를 추가했습니다.');
  } else {
    console.log('📄 새로운 .env 파일을 생성합니다.');
    envFileContent = upsertEnvVars('', envVars, '# Firebase Functions 설정 (자동 생성)');
  }

  // Firebase Web 앱 설정 안내
  console.log('📝 Firebase Web 앱 설정이 필요한 경우:');
  console.log('   1. Firebase Console (https://console.firebase.google.com) 접속');
  console.log(`   2. 프로젝트 "${projectId}" 선택`);
  console.log('   3. 프로젝트 설정 > 일반 탭 > 내 앱 > 웹 앱 선택');
  console.log('   4. "구성" 버튼 클릭하여 config 객체 복사');
  console.log('   5. app/src/firebase.ts에 config 객체 붙여넣기');
  console.log('   또는 app/.env 파일에 환경변수로 설정');

  // .env 파일 저장 (append/upsert 결과)
  fs.writeFileSync(envPath, envFileContent);
  
  console.log('✅ .env 파일이 생성되었습니다:');
  console.log(envFileContent);
  
  console.log('🚀 이제 다음 명령어로 개발 서버를 시작할 수 있습니다:');
  console.log('   cd app && pnpm dev');
  
} catch (error) {
  console.error('❌ 오류가 발생했습니다:', error.message);
  console.log('\n📝 수동으로 .env 파일을 생성하세요:');
  console.log('   cp app/env.example app/.env');
  console.log('   # app/.env 파일에서 VITE_FIREBASE_PROJECT_ID를 실제 프로젝트 ID로 수정');
}
