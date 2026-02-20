import React, { useState, useRef } from 'react';
import { FlashCardPlayer } from '../features/flashcard';
import type { FlashCard } from '../features/flashcard';
import { generateDemoFlashcards } from '../lib/demoFlashcards';

/**
 * 랜딩 데모 페이지
 * 플래시카드 데이터 소스: AI에서 바로 생성 (generateDemoFlashcards).
 * Firebase/Firestore 미사용. 로그인 후 앱 플래시카드는 Firestore에서 로드.
 */
const LandingDemo: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cardSectionRef = useRef<HTMLDivElement>(null);

  const runSubmit = async (url: string) => {
    setError('');
    setCards([]);
    setLoading(true);
    try {
      const result = await generateDemoFlashcards(url);
      if (result.ok) {
        setCards(result.cards);
        setTimeout(() => {
          cardSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSubmit(repoUrl);
  };

  const EXAMPLE_REPOS = [
    { label: 'Cursor', url: 'https://github.com/getcursor/cursor', bg: '#6366F1', text: 'white', badge: null },
    { label: 'OpenClaw', url: 'https://github.com/openclaw/openclaw', bg: '#EA580C', text: 'white', badge: null },
    { label: 'Kubernetes', url: 'https://github.com/kubernetes/kubernetes', bg: '#326CE5', text: 'white', badge: 'https://img.shields.io/badge/--326CE5?style=for-the-badge&logo=kubernetes&logoColor=white' },
    { label: 'Next.js', url: 'https://github.com/vercel/next.js', bg: '#000000', text: 'white', badge: 'https://img.shields.io/badge/--000000?style=for-the-badge&logo=nextdotjs&logoColor=white' },
    { label: 'React', url: 'https://github.com/facebook/react', bg: '#61DAFB', text: 'black', badge: 'https://img.shields.io/badge/--61DAFB?style=for-the-badge&logo=react&logoColor=black' },
    { label: 'Spring Boot', url: 'https://github.com/spring-projects/spring-boot', bg: '#6DB33F', text: 'white', badge: 'https://img.shields.io/badge/--6DB33F?style=for-the-badge&logo=springboot&logoColor=white' },
  ] as const;

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

      <div className="mt-6 w-full max-w-[100vw] md:max-w-none md:relative md:left-1/2 md:-translate-x-1/2 md:w-screen md:overflow-x-hidden" role="group" aria-label="예시 리포지토리">
        <div className="flex flex-wrap items-center justify-center gap-3 md:flex-nowrap md:justify-center">
        {EXAMPLE_REPOS.map(({ label, url, bg, text, badge }) => (
          <button
            key={url}
            type="button"
            onClick={() => {
              setRepoUrl(url);
              runSubmit(url);
            }}
            disabled={loading}
            className={`inline-flex items-center justify-center h-11 min-h-[44px] w-[max-content] shrink-0 rounded-full text-[0.85rem] font-semibold border-0 transition-[opacity,filter] duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:opacity-90 focus:outline focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg ${badge ? 'pl-4 pr-6' : 'px-4'}`}
            style={{ backgroundColor: bg, color: text }}
          >
            {badge && <img src={badge} alt="" className="h-7 w-auto block shrink-0" height={28} aria-hidden />}
            <span>{label}</span>
          </button>
        ))}
        </div>
      </div>

      {error && (
        <p className="mt-6 py-3 px-5 bg-error-bg border border-error/30 rounded-xl text-error-light text-sm animate-fade-in">
          {error}
        </p>
      )}

      {cards.length > 0 && (
        <div className="mt-14 w-full max-w-full min-w-0 overflow-x-hidden" ref={cardSectionRef}>
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
