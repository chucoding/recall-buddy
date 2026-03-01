import React, { useEffect, useState, useCallback } from 'react';

const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    setIsMobile(m.matches);
    const handler = () => setIsMobile(m.matches);
    m.addEventListener('change', handler);
    return () => m.removeEventListener('change', handler);
  }, []);
  return isMobile;
}
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';

import { FlashCardPlayer } from '../features/flashcard';
import type { DeleteMethod } from '../features/flashcard';
import type { FlashCard } from '../features/flashcard';
import { auth, store } from '../firebase';
import { trackEvent } from '../analytics';
import { useNavigationStore } from '../stores/navigationStore';
import { useSubscription } from '../hooks/useSubscription';
import { getCurrentDate, shuffleArray } from '../modules/utils';
import {
  regenerateCardQuestion,
  REGENERATE_QUESTION_LIMIT_FREE,
  REGENERATE_QUESTION_LIMIT_PRO,
} from '../api/subscription-api';
import { Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FlashCardKeyboardIndicator } from '@/components/FlashCardKeyboardIndicator';

/**
 * 로그인 사용자 전용 플래시카드 뷰어
 * 데이터 소스: Firestore (users/{uid}/flashcards/{오늘날짜}). 데모는 LandingDemo + lib/demoFlashcards.
 * 진입 시 1회 셔플, "덱 셔플" 버튼으로 순서 재섞기.
 */
const FlashCardViewer: React.FC = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [syncSlideIndex, setSyncSlideIndex] = useState<number | null>(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const flashcardReloadTrigger = useNavigationStore((s) => s.flashcardReloadTrigger);
  const { subscription } = useSubscription(user);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const todayDate = getCurrentDate();
    const flashcardDocRef = doc(store, 'users', user.uid, 'flashcards', todayDate);

    getDoc(flashcardDocRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const raw = (data?.data || []) as FlashCard[];
        setCards(shuffleArray(raw));
      } else {
        setCards([]);
      }
    });
  }, [flashcardReloadTrigger]);

  const handleShuffleDeck = useCallback(() => {
    setCards((prev) => shuffleArray(prev));
    setShuffleKey((k) => k + 1);
  }, []);

  const handleDeleteCard = useCallback((index: number, method: DeleteMethod) => {
    const deletedCard = cards[index];
    const newCards = cards.filter((_, i) => i !== index);
    const newSlide = index >= newCards.length ? Math.max(0, newCards.length - 1) : index;

    setCards(newCards);
    setCurrentSlide(newSlide);
    setSyncSlideIndex(newSlide);

    const user = auth.currentUser;
    if (user) {
      const todayDate = getCurrentDate();
      const flashcardDocRef = doc(store, 'users', user.uid, 'flashcards', todayDate);
      setDoc(flashcardDocRef, { data: newCards });

      toast('카드가 제거되었습니다', {
        action: {
          label: '실행 취소',
          onClick: () => {
            const restored = [...newCards];
            restored.splice(index, 0, deletedCard);
            setCards(restored);
            setCurrentSlide(index);
            setSyncSlideIndex(index);
            setDoc(flashcardDocRef, { data: restored });
          },
        },
        duration: 5000,
      });
    }

    trackEvent('flashcard_delete', {
      method,
      card_index: index + 1,
      total_before: cards.length,
      total_after: newCards.length,
    });
  }, [cards]);

  const tier = subscription?.subscriptionTier === 'pro' ? 'pro' : 'free';
  const limit = tier === 'pro' ? REGENERATE_QUESTION_LIMIT_PRO : REGENERATE_QUESTION_LIMIT_FREE;
  const todayStr = getCurrentDate();
  const count =
    subscription?.lastRegenerateDate === todayStr
      ? (subscription?.regenerateCountToday ?? 0)
      : 0;
  const canRegenerateQuestion = count < limit;

  const handleRegenerateQuestion = useCallback(
    async (index: number) => {
      const card = cards[index];
      if (!card?.metadata?.rawDiff || !canRegenerateQuestion || !user) return;

      setRegeneratingIndex(index);
      try {
        const { question, highlights } = await regenerateCardQuestion({
          rawDiff: card.metadata.rawDiff,
          existingQuestion: card.question,
          existingAnswer: card.answer,
          flashcardDate: getCurrentDate(),
        });
        const newCards = cards.map((c, i) =>
          i === index ? { ...c, question, highlights: highlights ?? c.highlights } : c
        );
        setCards(newCards);
        toast('질문이 재생성되었습니다');
        const flashcardDocRef = doc(store, 'users', user.uid, 'flashcards', getCurrentDate());
        await setDoc(flashcardDocRef, { data: newCards });
      } catch (e: unknown) {
        const err = e as { response?: { status?: number; data?: { error?: string } } };
        const msg =
          err.response?.status === 429
            ? '오늘 질문 재생성 한도를 모두 사용했습니다.'
            : (err.response?.data?.error || (e instanceof Error ? e.message : '재생성에 실패했습니다.'));
        toast.error(msg);
      } finally {
        setRegeneratingIndex(null);
      }
    },
    [cards, canRegenerateQuestion, user]
  );

  if (cards.length === 0) {
    return null;
  }

    const indicatorPillClass =
      'items-center justify-center bg-card py-2 px-[18px] rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.3)] text-[0.85rem] font-semibold text-primary backdrop-blur-[10px] border border-border';

  return (
    <div className="min-h-full flex flex-col bg-bg p-5 relative overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:h-[200%] before:bg-[radial-gradient(circle,rgba(7,166,107,0.04)_1px,transparent_1px)] before:bg-[length:50px_50px] before:animate-[float-bg_20s_linear_infinite] before:pointer-events-none max-[768px]:p-2.5 max-[768px]:justify-center">
      {/* 모바일: 인디케이터+셔플+카드 영역을 한 블록으로 묶어 세로 가운데 배치 */}
      <div className="flex flex-col max-[768px]:flex-shrink-0 max-[768px]:w-full">
        {/* 데스크톱: 키보드 안내 + 셔플 | 모바일: 인디케이터 + 셔플 한 줄 (설정 버튼은 App nav에 있음) */}
        <div className="flex flex-wrap justify-center gap-3 mb-2 relative z-[100] max-[768px]:gap-2 max-[768px]:justify-between max-[768px]:items-center max-[768px]:mb-3 shrink-0">
          <FlashCardKeyboardIndicator showDelete />
          {/* 모바일만: 인디케이터 + 셔플 한 줄 (동일 pill 스타일로 조화). 데스크톱에서는 hidden만 적용되도록 inline-flex는 768 이하에서만 */}
          <span className={`hidden max-[768px]:inline-flex max-[768px]:order-first ${indicatorPillClass}`} aria-live="polite">
            {currentSlide + 1} / {cards.length}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShuffleDeck}
            aria-label="덱 순서 섞기"
            className="inline-flex items-center gap-2 rounded-[20px] bg-card/90 backdrop-blur-sm max-[768px]:order-last"
          >
            <Shuffle className="w-5 h-5 shrink-0" aria-hidden />
            <span>덱 셔플</span>
          </Button>
        </div>

        <FlashCardPlayer
          key={shuffleKey}
          cards={cards}
          keyboardShortcuts
          onSlideChange={(n) => { setCurrentSlide(n); setSyncSlideIndex(null); }}
          onDeleteCard={handleDeleteCard}
          slideIndex={syncSlideIndex ?? undefined}
          renderIndicator={isMobile ? () => null : undefined}
          onRegenerateQuestion={handleRegenerateQuestion}
          regeneratingIndex={regeneratingIndex}
        />
      </div>
    </div>
  );
};

export default FlashCardViewer;
