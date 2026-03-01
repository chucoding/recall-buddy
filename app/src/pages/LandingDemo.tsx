import React, { useCallback, useMemo, useState, useRef } from 'react';
import { toast } from 'sonner';
import { FlashCardPlayer } from '../features/flashcard';
import type { FlashCard, DeleteMethod } from '../features/flashcard';
import { generateDemoFlashcards } from '../lib/demoFlashcards';
import { regenerateCardQuestionDemo } from '../api/subscription-api';
import { trackEvent } from '../analytics';
import { FlashCardKeyboardIndicator } from '../components/FlashCardKeyboardIndicator';
import { Info } from 'lucide-react';

const DEMO_DEVICE_ID_KEY = 'demo_device_id';

function getOrCreateDemoDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEMO_DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEMO_DEVICE_ID_KEY, id);
  }
  return id;
}

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
  const [syncSlideIndex, setSyncSlideIndex] = useState<number | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const cardSectionRef = useRef<HTMLDivElement>(null);
  const demoDeviceId = useMemo(getOrCreateDemoDeviceId, []);

  const handleDeleteCard = useCallback((index: number, _method: DeleteMethod) => {
    const deletedCard = cards[index];
    const newCards = cards.filter((_, i) => i !== index);
    const newSlide = index >= newCards.length ? Math.max(0, newCards.length - 1) : index;

    setCards(newCards);
    setSyncSlideIndex(newSlide);

    toast('카드가 제거되었습니다', {
      action: {
        label: '실행 취소',
        onClick: () => {
          const restored = [...newCards];
          restored.splice(index, 0, deletedCard);
          setCards(restored);
          setSyncSlideIndex(index);
        },
      },
      duration: 5000,
    });
  }, [cards]);

  const handleRegenerateQuestion = useCallback(
    async (index: number) => {
      const card = cards[index];
      if (!card?.metadata?.rawDiff || !demoDeviceId) return;

      setRegeneratingIndex(index);
      try {
        const { question, highlights } = await regenerateCardQuestionDemo({
          rawDiff: card.metadata.rawDiff,
          existingQuestion: card.question,
          existingAnswer: card.answer,
          demoDeviceId,
        });
        const newCards = cards.map((c, i) =>
          i === index ? { ...c, question, highlights: highlights ?? c.highlights } : c
        );
        setCards(newCards);
        toast('질문이 재생성되었습니다');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '재생성에 실패했습니다.';
        if (msg.includes('한도') || msg.includes('limit')) {
          toast('재생성 3회 모두 사용했어요. 무료 가입하면 매일 3회까지 사용할 수 있어요.', {
            action: {
              label: '무료로 시작하기',
              onClick: () => {
                trackEvent('landing_demo_cta_limit_exceeded', {});
                window.location.href = '/app';
              },
            },
            duration: 8000,
          });
        } else {
          toast.error(msg);
        }
      } finally {
        setRegeneratingIndex(null);
      }
    },
    [cards, demoDeviceId]
  );

  const runSubmit = async (url: string, source: 'form' | 'example') => {
    setError('');
    setCards([]);
    setLoading(true);
    if (source === 'form') {
      trackEvent('landing_demo_generate', { source: 'form' });
    } else {
      trackEvent('landing_demo_example_repo', { repo_url: url.slice(0, 80) });
    }
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
    runSubmit(repoUrl, 'form');
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
          <img src="/github-mark-white.svg" alt="" width={20} height={20} className="w-5 h-5 ml-4 shrink-0 max-[768px]:hidden" aria-hidden />
          <input
            type="text"
            className="flex-1 border-0 outline-none text-base py-3.5 px-3 bg-transparent text-text min-w-0 placeholder:text-text-muted max-[768px]:w-full max-[768px]:text-center max-[768px]:py-3"
            placeholder="https://github.com/owner/repo@branch"
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
              runSubmit(url, 'example');
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
            keyboardShortcuts
            onSlideChange={() => setSyncSlideIndex(null)}
            onDeleteCard={handleDeleteCard}
            slideIndex={syncSlideIndex ?? undefined}
            onRegenerateQuestion={handleRegenerateQuestion}
            regeneratingIndex={regeneratingIndex}
            renderHeader={() => (
              <div className="text-center mb-10 animate-fade-up">
                <h3 className="text-2xl font-bold text-text mb-2 max-[480px]:text-xl">AI-Generated Flashcards</h3>
                <p className="text-text-light text-sm mb-4">카드를 클릭하면 답변을 확인할 수 있습니다</p>
                <div className="flex justify-center">
                  <FlashCardKeyboardIndicator showDelete />
                </div>
              </div>
            )}
            renderFooter={() => (
              <div className="text-center mt-14 animate-fade-up">
                {cards.length === 1 && (
                  <p
                    className="mb-6 mx-auto max-w-xl text-center text-xs text-text-muted leading-relaxed flex items-center justify-center gap-1.5 flex-wrap animate-fade-in"
                    role="note"
                    aria-label="브랜치 가이드"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0 text-text-muted" aria-hidden />
                    <span>기본 브랜치(main)에 커밋이 적을 수 있어요. 다른 브랜치를 쓰려면 owner/repo@브랜치명 형식으로 다시 시도해보세요.</span>
                  </p>
                )}
                <p
                  className="mb-8 mx-auto max-w-xl text-center text-xs text-text-muted leading-relaxed flex items-center justify-center gap-1.5 flex-wrap"
                  role="note"
                  aria-label="데모 안내"
                >
                  <Info className="w-3.5 h-3.5 shrink-0 text-text-muted" aria-hidden />
                  <span>데모에서는 가장 최근 커밋 3개를 기반으로 플래시카드를 생성합니다</span>
                </p>
                <p className="text-text-body text-lg mb-5">
                  매일 자동으로 플래시카드를 받아보고 싶다면?
                </p>
                <a
                  href="/app"
                  data-landing-action="get_started_free"
                  className="inline-flex items-center gap-2.5 py-3.5 px-8 bg-primary text-bg rounded-xl text-base font-bold no-underline transition-all duration-300 shadow-[0_8px_24px_rgba(7,166,107,0.2)] hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-[0_12px_36px_rgba(7,166,107,0.3)]"
                  onClick={() => trackEvent('landing_demo_get_started_free', { from: 'after_demo' })}
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
