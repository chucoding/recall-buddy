import React, { useState, useRef } from 'react';
import { FlashCardPlayer } from '../features/flashcard';
import type { FlashCard } from '../features/flashcard';
import { chatCompletions } from '../api/clova-api';

interface CommitData {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
}

/** 커밋 데이터에서 답변 콘텐츠(마크다운)를 생성 */
function buildAnswerContent(commit: CommitData): string {
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

/** 템플릿 기반 폴백 질문 */
function buildFallbackQuestion(commit: CommitData): string {
  const message = commit.commit.message.split('\n')[0];
  const date = new Date(commit.commit.author.date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return `${date}\n\n"${message}"\n\n이 커밋에서 어떤 변경이 있었나요?`;
}

const LandingDemo: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cardSectionRef = useRef<HTMLDivElement>(null);

  const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
    const cleaned = url.trim().replace(/\/+$/, '');

    const simpleMatch = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (simpleMatch) {
      return { owner: simpleMatch[1], repo: simpleMatch[2] };
    }

    const urlMatch = cleaned.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
    if (urlMatch) {
      return { owner: urlMatch[1], repo: urlMatch[2] };
    }

    return null;
  };

  /** AI로 질문 생성, 실패 시 템플릿 폴백 */
  const generateAIQuestion = async (answerContent: string): Promise<string[]> => {
    const result = await chatCompletions(answerContent, 'code-diff');
    return JSON.parse(result.result.message.content);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCards([]);

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      setError('올바른 GitHub 리포지토리 URL을 입력해주세요. (예: https://github.com/owner/repo)');
      return;
    }

    setLoading(true);

    try {
      const commitsRes = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits?per_page=3`,
        {
          headers: { Accept: 'application/vnd.github.v3+json' },
        }
      );

      if (!commitsRes.ok) {
        if (commitsRes.status === 404) {
          throw new Error('리포지토리를 찾을 수 없습니다. Public 리포지토리인지 확인해주세요.');
        }
        throw new Error('GitHub API 호출에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }

      const commits: CommitData[] = await commitsRes.json();

      if (commits.length === 0) {
        throw new Error('커밋이 없는 리포지토리입니다.');
      }

      // 커밋 상세 정보 병렬 fetch
      const detailedCommits = await Promise.all(
        commits.slice(0, 3).map(async (commit) => {
          try {
            const detailRes = await fetch(
              `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits/${commit.sha}`,
              {
                headers: { Accept: 'application/vnd.github.v3+json' },
              }
            );
            if (detailRes.ok) {
              return (await detailRes.json()) as CommitData;
            }
          } catch {
            // fallback to basic commit data
          }
          return commit;
        })
      );

      // 각 커밋의 답변 콘텐츠 구성
      const answerContents = detailedCommits.map(buildAnswerContent);

      // AI 질문 생성 병렬 호출 (커밋별 1개 질문)
      const aiResults = await Promise.all(
        answerContents.map(async (content, i) => {
          try {
            const questions = await generateAIQuestion(content);
            return questions[0] || buildFallbackQuestion(detailedCommits[i]);
          } catch {
            return buildFallbackQuestion(detailedCommits[i]);
          }
        })
      );

      // 카드 조합
      const generated: FlashCard[] = detailedCommits.map((commit, i) => ({
        question: aiResults[i],
        answer: answerContents[i],
        contentType: commit.files?.some((f) => f.patch) ? 'code-diff' as const : 'markdown' as const,
      }));

      setCards(generated);

      setTimeout(() => {
        cardSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center bg-surface-light/60 backdrop-blur-md rounded-2xl border border-border shadow-[0_16px_48px_rgba(0,0,0,0.3)] overflow-hidden p-1.5 max-[768px]:flex-col max-[768px]:p-3 max-[768px]:gap-2">
          <svg
            className="w-5 h-5 ml-4 shrink-0 text-text-muted max-[768px]:hidden"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <input
            type="text"
            className="flex-1 border-0 outline-none text-base py-3.5 px-3 bg-transparent text-text min-w-0 placeholder:text-text-muted max-[768px]:w-full max-[768px]:text-center max-[768px]:py-3"
            placeholder="https://github.com/owner/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="shrink-0 py-3.5 px-7 bg-primary text-bg rounded-xl text-[0.95rem] font-bold cursor-pointer transition-all duration-300 whitespace-nowrap min-w-[120px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-primary-dark hover:enabled:-translate-y-px hover:enabled:shadow-[0_6px_20px_rgba(7,166,107,0.3)] max-[768px]:w-full max-[768px]:py-3.5"
            disabled={loading || !repoUrl.trim()}
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-[3px] border-bg/30 border-t-bg rounded-full animate-spin" />
            ) : (
              'Generate Cards'
            )}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 py-3 px-5 bg-error-bg border border-error/30 rounded-xl text-error-light text-sm animate-fade-in">
          {error}
        </p>
      )}

      {cards.length > 0 && (
        <div className="mt-12" ref={cardSectionRef}>
          <FlashCardPlayer
            cards={cards}
            renderHeader={() => (
              <div className="text-center mb-10 animate-fade-up">
                <h3 className="text-2xl font-bold text-text mb-2 max-[480px]:text-xl">AI-Generated Flashcards</h3>
                <p className="text-text-light text-sm">카드를 클릭하면 답변을 확인할 수 있습니다</p>
              </div>
            )}
            renderFooter={() => (
              <div className="text-center mt-14 animate-fade-up">
                <p className="text-text-body text-lg mb-5">
                  매일 자동으로 플래시카드를 받아보고 싶다면?
                </p>
                <a
                  href="/app"
                  className="inline-flex items-center gap-2.5 py-3.5 px-8 bg-primary text-bg rounded-xl text-base font-bold no-underline transition-all duration-300 shadow-[0_8px_24px_rgba(7,166,107,0.2)] hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-[0_12px_36px_rgba(7,166,107,0.3)]"
                >
                  Get Started Free
                </a>
              </div>
            )}
          />
        </div>
      )}
    </>
  );
};

export default LandingDemo;
