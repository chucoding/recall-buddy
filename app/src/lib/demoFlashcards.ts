/**
 * 랜딩 데모 전용 플래시카드 생성
 *
 * 데이터 소스: GitHub Public API + AI (chatCompletions) 만 사용.
 * Firebase/Firestore 미사용. 저장 없이 매 요청마다 AI에서 바로 생성.
 *
 * 반대로 로그인 사용자 플래시카드는 useTodayFlashcards + Firestore 사용.
 */

import { chatCompletions } from '../api/ai-api';
import type { FlashcardStructuredOutput } from '../types';
import type { FlashCard } from '../features/flashcard';
import type { FileChange } from '../api/github-api';

/** GitHub Commits API 응답의 커밋 한 건 (public API) */
export interface DemoCommitData {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
    raw_url?: string;
  }>;
}

function buildAnswerContent(commit: DemoCommitData): string {
  const message = commit.commit.message.split('\n')[0];
  const filesInfo = commit.files
    ? commit.files
        .slice(0, 5)
        .map((f) => `- \`${f.filename}\` (+${f.additions} -${f.deletions})`)
        .join('\n')
    : '_파일 정보 없음_';
  const patchPreview = commit.files
    ?.filter((f) => f.patch)
    .slice(0, 2)
    .map((f) => `### ${f.filename}\n\`\`\`diff\n${f.patch?.slice(0, 400)}\n\`\`\``)
    .join('\n\n');
  return `## ${message}\n\n**변경된 파일:**\n${filesInfo}${patchPreview ? `\n\n**코드 변경 미리보기:**\n\n${patchPreview}` : ''}`;
}

function buildRawDiff(commit: DemoCommitData): string | null {
  if (!commit.files?.length) return null;
  const message = commit.commit.message.split('\n')[0];
  const parts: string[] = [];
  parts.push(`## ${message}\n`);
  parts.push(`Commit: ${commit.sha.substring(0, 7)}\n`);
  for (const file of commit.files) {
    parts.push(`\n### ${file.filename}`);
    parts.push(`**Status**: ${file.status} | **Changes**: +${file.additions} -${file.deletions}\n`);
    if (file.patch) {
      parts.push('```diff');
      parts.push(file.patch);
      parts.push('```\n');
    }
  }
  return parts.join('\n');
}

function buildFallbackQuestion(commit: DemoCommitData): string {
  const message = commit.commit.message.split('\n')[0];
  const date = new Date(commit.commit.author.date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return `${date}\n\n"${message}"\n\n이 커밋에서 어떤 변경이 있었나요?`;
}

/** 예시 답변 플로팅용: AI 실패 시 보여줄 짧은 평문 (마크다운 아님) */
function buildFallbackAnswer(commit: DemoCommitData): string {
  const message = commit.commit.message.split('\n')[0];
  const fileList = commit.files?.length
    ? commit.files.slice(0, 5).map((f) => f.filename).join(', ')
    : '파일 정보 없음';
  return `커밋 메시지: ${message}\n변경된 파일: ${fileList}`;
}

/** 데모 전용: AI에서 질문·답변 1쌍 생성 (items[0].question, items[0].answer). 예시 답변은 평문으로 표시되므로 answer 사용 */
async function fetchDemoFlashcardFromAI(answerContent: string): Promise<{ question: string; answer: string } | null> {
  const result = await chatCompletions(answerContent);
  const parsed = JSON.parse(result.result.message.content) as FlashcardStructuredOutput;
  const first = parsed?.items?.[0];
  if (first && typeof first.question === 'string' && typeof first.answer === 'string') {
    return { question: first.question, answer: first.answer };
  }
  return null;
}

function parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  const cleaned = url.trim().replace(/\/+$/, '');
  // owner/repo 또는 owner/repo@branch
  const simpleMatch = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:@([a-zA-Z0-9/_.-]+))?$/);
  if (simpleMatch) {
    return { owner: simpleMatch[1], repo: simpleMatch[2], branch: simpleMatch[3] || undefined };
  }
  // github.com/owner/repo 또는 github.com/owner/repo@branch
  const urlMatch = cleaned.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:@([a-zA-Z0-9/_.-]+))?/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2], branch: urlMatch[3] || undefined };
  }
  return null;
}

const FILE_STATUSES: FileChange['status'][] = ['added', 'modified', 'removed', 'renamed'];
function toFileChangeStatus(s: string): FileChange['status'] {
  const lower = s?.toLowerCase() ?? '';
  if (FILE_STATUSES.includes(lower as FileChange['status'])) return lower as FileChange['status'];
  return 'modified';
}

/** FlashCardPlayer 파일 보기용. raw_url 없으면 raw.githubusercontent.com 형식으로 생성 (데모/공개 repo) */
function toFileChangeList(
  files: DemoCommitData['files'],
  owner: string,
  repo: string,
  sha: string
): FileChange[] {
  if (!files?.length) return [];
  return files.map((f) => ({
    filename: f.filename,
    status: toFileChangeStatus(f.status),
    additions: f.additions,
    deletions: f.deletions,
    changes: f.additions + f.deletions,
    patch: f.patch,
    raw_url: f.raw_url ?? `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${f.filename}`,
  }));
}

export type GenerateDemoFlashcardsResult =
  | { ok: true; cards: FlashCard[] }
  | { ok: false; error: string };

/**
 * 랜딩 데모용 플래시카드 생성 (Firebase 미사용, AI에서 바로 생성)
 * @param repoUrl - GitHub 리포지토리 URL 또는 "owner/repo"
 */
export async function generateDemoFlashcards(repoUrl: string): Promise<GenerateDemoFlashcardsResult> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    return { ok: false, error: '올바른 GitHub 리포지토리 URL을 입력해주세요. (예: https://github.com/owner/repo)' };
  }

  const shaParam = parsed.branch ? `&sha=${encodeURIComponent(parsed.branch)}` : '';
  const commitsRes = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=3${shaParam}`,
    { headers: { Accept: 'application/vnd.github.v3+json' } }
  );
  if (!commitsRes.ok) {
    if (commitsRes.status === 404) {
      return { ok: false, error: '리포지토리를 찾을 수 없습니다. Public 리포지토리인지 확인해주세요.' };
    }
    return { ok: false, error: 'GitHub API 호출에 실패했습니다. 잠시 후 다시 시도해주세요.' };
  }

  const commits: DemoCommitData[] = await commitsRes.json();
  if (commits.length === 0) {
    return { ok: false, error: '커밋이 없는 리포지토리입니다.' };
  }

  const detailedCommits = await Promise.all(
    commits.slice(0, 3).map(async (commit) => {
      try {
        const detailRes = await fetch(
          `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits/${commit.sha}`,
          { headers: { Accept: 'application/vnd.github.v3+json' } }
        );
        if (detailRes.ok) return (await detailRes.json()) as DemoCommitData;
      } catch {
        // fallback to list item
      }
      return commit;
    })
  );

  const answerContents = detailedCommits.map(buildAnswerContent);
  const aiPairs = await Promise.all(
    answerContents.map(async (content, i) => {
      try {
        const pair = await fetchDemoFlashcardFromAI(content);
        if (pair) return pair;
      } catch {
        // fallback
      }
      const commit = detailedCommits[i];
      return {
        question: buildFallbackQuestion(commit),
        answer: buildFallbackAnswer(commit),
      };
    })
  );

  const cards: FlashCard[] = detailedCommits.map((commit, i) => {
    const rawDiff = buildRawDiff(commit);
    const files = toFileChangeList(commit.files, parsed.owner, parsed.repo, commit.sha);
    return {
      question: aiPairs[i].question,
      answer: aiPairs[i].answer,
      metadata: {
        commitMessage: commit.commit.message.split('\n')[0],
        ...(rawDiff && { rawDiff }),
        ...(files.length > 0 && { files }),
      },
    };
  });

  return { ok: true, cards };
}
