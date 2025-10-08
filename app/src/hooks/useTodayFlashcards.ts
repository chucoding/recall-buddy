import { useEffect, useState } from 'react';
import { useIndexedDB } from 'react-indexed-db-hook';
import { User } from 'firebase/auth';
import { chatCompletions } from '../api/ncloud-api';
import { getCommits, getFilename, getMarkdown, type CommitDetail } from '../api/github-api';
import { getCurrentDate } from '../modules/utils';

const DATES_AGO = [1, 7, 30]; // days ago list

export type ContentType = 'markdown' | 'code-diff';

export interface FlashCardData {
  question: string;
  answer: string;
  contentType: ContentType;
  metadata?: {
    filename?: string;
    commitMessage?: string;
  };
}

/**
 * 오늘의 플래시카드 데이터를 로드하는 커스텀 훅
 * 
 * @param user - 현재 로그인한 사용자 (로그인하지 않은 경우 null)
 * @returns loading - 데이터 로딩 중 여부
 */
export function useTodayFlashcards(user: User | null) {
  const { add, getByID } = useIndexedDB("data");
  const [loading, setLoading] = useState<boolean>(true);
  const [hasData, setHasData] = useState<boolean>(false);

  useEffect(() => {
    // 사용자가 로그인하지 않은 경우 로딩 종료
    if (!user) {
      setLoading(false);
      setHasData(false);
      return;
    }

    const loadFlashcards = async () => {
      try {
        // 오늘 날짜의 데이터가 이미 있는지 확인
        const todayData = await getByID(getCurrentDate());
        if (todayData) {
          setLoading(false);
          setHasData(todayData.data && todayData.data.length > 0);
          return;
        }

        // 오늘 데이터가 없으면 새로 생성
        const list = await generateFlashcards();
        
        // 생성된 플래시카드가 있으면 저장
        if (list.length > 0) {
          await add({ date: getCurrentDate(), data: list });
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
  }, [add, getByID, user]);

  return { loading, hasData };
}

/**
 * 여러 날짜의 GitHub 데이터를 기반으로 플래시카드 생성
 */
async function generateFlashcards(): Promise<FlashCardData[]> {
  const list: FlashCardData[] = [];

  for (const daysAgo of DATES_AGO) {
    try {
      const githubData = await getGithubData(daysAgo);
      
      if (!githubData) {
        continue;
      }

      const { content, contentType, metadata } = githubData;

      // AI를 통해 질문 생성 (contentType에 따라 프롬프트 변경)
      const result = await chatCompletions(content, contentType);
      const questions = JSON.parse(result.result.message.content);
      
      // 질문-답변 쌍 생성
      for (const question of questions) {
        list.push({
          question: question,
          answer: content,
          contentType: contentType,
          metadata: metadata
        });
      }
    } catch (error) {
      console.error(`Error fetching data for ${daysAgo} days ago:`, error);
      // 에러가 발생해도 다음 날짜 처리를 계속함
    }
  }

  return list;
}

interface GithubData {
  content: string;
  contentType: ContentType;
  metadata?: {
    filename?: string;
    commitMessage?: string;
  };
}

/**
 * GitHub에서 특정 날짜의 데이터 가져오기
 * 마크다운 파일이 있으면 마크다운, 없으면 코드 변경 내용(diff) 반환
 * 
 * @param daysAgo - 며칠 전 데이터를 가져올지
 * @returns GithubData 또는 null
 */
async function getGithubData(daysAgo: number): Promise<GithubData | null> {
  const interval = 24 * daysAgo * 60 * 60 * 1000;
  const currentDate = new Date();
  const pastDate = new Date(currentDate.getTime() - interval);

  const since = new Date(pastDate);
  since.setHours(0, 0, 0, 0);

  const until = new Date(pastDate);
  until.setHours(23, 59, 59, 999);

  const commits = await getCommits(since, until);

  if (commits.length === 0) {
    return null;
  }

  for (const commit of commits) {
    const commit_detail = await getFilename(commit.sha);
    
    // 1. 마크다운 파일이 있는지 확인
    const markdownFile = commit_detail.files.find(file => file.filename.endsWith('.md'));
    
    if (markdownFile) {
      // 마크다운 파일이 있으면 전체 내용 가져오기
      const data = await getMarkdown(markdownFile.filename);
      return {
        content: data,
        contentType: 'markdown',
        metadata: {
          filename: markdownFile.filename,
          commitMessage: commit_detail.commit.message
        }
      };
    }
    
    // 2. 마크다운 파일이 없으면 코드 변경 내용(diff) 사용
    const codeDiff = formatCodeDiff(commit_detail);
    if (codeDiff) {
      return {
        content: codeDiff,
        contentType: 'code-diff',
        metadata: {
          commitMessage: commit_detail.commit.message
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

