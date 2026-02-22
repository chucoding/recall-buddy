import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { store } from '../firebase';
import { chatCompletions } from '../api/ai-api';
import type { FlashcardStructuredOutput } from '../types';
import type { SubscriptionTier } from '../types';
import { getCommits, getFilename, type CommitDetail, type FileChange } from '../api/github-api';
import { getCurrentDate } from '../modules/utils';
import { useNavigationStore } from '../stores/navigationStore';
import { useSubscription } from './useSubscription';

const DATES_AGO_FREE = [1, 7];
const DATES_AGO_PRO = [1, 7, 30];

export interface FlashCardData {
  question: string;
  answer: string;
  highlights?: string[];
  metadata?: {
    commitMessage?: string;
    rawDiff?: string;
    files?: FileChange[];
    repositoryFullName?: string;
  };
}

/**
 * 로그인 사용자 전용: 오늘의 플래시카드 로드
 *
 * 데이터 소스: Firestore (users/{uid}/flashcards/{date})
 * - 이미 있으면 Firestore에서만 읽어서 사용
 * - 없으면 AI로 생성 후 Firestore에 저장
 *
 * 데모(랜딩) 플래시카드는 Firebase 미사용 → lib/demoFlashcards.ts 참고
 */
export function useTodayFlashcards(user: User | null) {
  const [loading, setLoading] = useState<boolean>(true);
  const [hasData, setHasData] = useState<boolean>(false);
  const flashcardReloadTrigger = useNavigationStore((state) => state.flashcardReloadTrigger);
  const { subscription } = useSubscription(user);
  const tier: SubscriptionTier = subscription?.subscriptionTier === 'pro' ? 'pro' : 'free';
  const datesAgo = tier === 'pro' ? DATES_AGO_PRO : DATES_AGO_FREE;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setHasData(false);
      return;
    }

    const loadFlashcards = async () => {
      try {
        setLoading(true);
        const todayDate = getCurrentDate();
        const flashcardDocRef = doc(store, 'users', user.uid, 'flashcards', todayDate);
        
        // 사용자 레포 목록 (repositories만 사용)
        const userDocRef = doc(store, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        const repositories = userDoc.exists() ? (userDoc.data()?.repositories as Array<{ fullName: string; url: string }> | undefined) : undefined;
        if (!Array.isArray(repositories) || repositories.length === 0) {
          setLoading(false);
          setHasData(false);
          return;
        }

        // Firestore에서 오늘 날짜의 데이터 확인
        const todayDoc = await getDoc(flashcardDocRef);
        if (todayDoc.exists()) {
          const docData = todayDoc.data();
          setLoading(false);
          setHasData(docData.data && docData.data.length > 0);
          return;
        }

        // 오늘 데이터가 없으면 새로 생성 (다중 레포 지원: 레포별·날짜별로 생성 후 합침)
        const list = await generateFlashcards(datesAgo, repositories);
        
        // 생성된 플래시카드가 있으면 Firestore에 저장
        if (list.length > 0) {
          await setDoc(flashcardDocRef, { data: list });
          setHasData(true);
        } else {
          setHasData(false);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading flashcards:', error);
        setLoading(false);
        setHasData(false);
      }
    };

    loadFlashcards();
  }, [user, flashcardReloadTrigger, tier]);

  return { loading, hasData };
}

/**
 * 여러 날짜·여러 레포의 GitHub 데이터를 기반으로 플래시카드 생성
 * @param datesAgo - 사용할 "며칠 전" 목록 (Free: [1,7], Pro: [1,7,30])
 * @param repositories - 사용자 선택 레포 목록 (Firestore users.repositories)
 */
async function generateFlashcards(
  datesAgo: number[],
  repositories: Array<{ fullName: string; url: string }>
): Promise<FlashCardData[]> {
  const list: FlashCardData[] = [];

  for (const repo of repositories) {
    const repoFullName = repo.fullName;

    for (const d of datesAgo) {
      try {
        const githubData = await getGithubData(d, repoFullName);

        if (!githubData) {
          continue;
        }

        const { content, metadata } = githubData;

        const result = await chatCompletions(content);
        const parsed = JSON.parse(result.result.message.content) as FlashcardStructuredOutput;
        const pairs =
          parsed?.items?.filter(
            (x): x is { question: string; answer: string; highlights?: string[] } =>
              x != null && typeof x.question === "string" && typeof x.answer === "string"
          ) ?? [];

        for (const { question, answer, highlights } of pairs) {
          list.push({
            question,
            answer,
            highlights: highlights?.filter((h): h is string => typeof h === "string" && h.length > 0),
            metadata: { ...metadata, rawDiff: content, repositoryFullName: repoFullName }
          });
        }
      } catch (error) {
        console.error(`Error fetching data for repo ${repoFullName} ${d} days ago:`, error);
      }
    }
  }

  return list;
}

interface GithubData {
  content: string;
  metadata?: {
    commitMessage?: string;
    files?: FileChange[];
  };
}

/**
 * GitHub에서 특정 날짜·특정 레포의 데이터 가져오기.
 * 날짜는 사용자 디바이스(로컬) 타임존 기준으로 "며칠 전" 그날 00:00~23:59 구간 사용.
 *
 * @param daysAgo - 며칠 전 데이터를 가져올지 (로컬 기준)
 * @param repositoryFullName - 레포 지정 (다중 레포 시 필수)
 * @returns GithubData 또는 null
 */
async function getGithubData(daysAgo: number, repositoryFullName: string): Promise<GithubData | null> {
  const interval = 24 * daysAgo * 60 * 60 * 1000;
  const now = new Date();
  const pastDate = new Date(now.getTime() - interval);

  const since = new Date(pastDate);
  since.setHours(0, 0, 0, 0);
  const until = new Date(pastDate);
  until.setHours(23, 59, 59, 999);

  const commits = await getCommits(since, until, repositoryFullName);

  if (commits.length === 0) {
    return null;
  }

  for (const commit of commits) {
    const commitDetail = await getFilename(commit.sha, repositoryFullName);
    const codeDiff = formatCodeDiff(commitDetail);
    if (codeDiff) {
      return {
        content: codeDiff,
        metadata: {
          commitMessage: commitDetail.commit.message,
          files: commitDetail.files
        }
      };
    }
  }

  return null;
}

/**
 * 커밋 상세 정보를 GitHub 스타일 diff 형식으로 변환
 */
function formatCodeDiff(commitDetail: CommitDetail): string | null {
  if (commitDetail.files.length === 0) {
    return null;
  }

  const diffParts: string[] = [];
  
  // 커밋 메시지
  diffParts.push(`## ${commitDetail.commit.message}\n`);
  diffParts.push(`Commit: ${commitDetail.sha.substring(0, 7)}\n`);
  
  // 각 파일의 변경 내용
  for (const file of commitDetail.files) {
    diffParts.push(`\n### ${file.filename}`);
    diffParts.push(`**Status**: ${file.status} | **Changes**: +${file.additions} -${file.deletions}\n`);
    
    if (file.patch) {
      diffParts.push('```diff');
      diffParts.push(file.patch);
      diffParts.push('```\n');
    }
  }
  
  return diffParts.join('\n');
}

