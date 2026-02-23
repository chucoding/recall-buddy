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
import { doc, getDoc } from 'firebase/firestore';

import { FlashCardPlayer } from '../features/flashcard';
import type { FlashCard } from '../features/flashcard';
import { auth, store } from '../firebase';
import { getCurrentDate, shuffleArray } from '../modules/utils';
import { Shuffle } from 'lucide-react';

/**
 * 로그인 사용자 전용 플래시카드 뷰어
 * 데이터 소스: Firestore (users/{uid}/flashcards/{오늘날짜}). 데모는 LandingDemo + lib/demoFlashcards.
 * 진입 시 1회 셔플, "덱 셔플" 버튼으로 순서 재섞기.
 */
const FlashCardViewer: React.FC = () => {
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const isMobile = useIsMobile();

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
  }, []);

  const handleShuffleDeck = useCallback(() => {
    setCards((prev) => shuffleArray(prev));
    setShuffleKey((k) => k + 1);
  }, []);

  if (cards.length === 0) {
    return null;
  }

  const indicatorPillClass =
      'items-center justify-center bg-surface py-2 px-[18px] rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.3)] text-[0.85rem] font-semibold text-primary backdrop-blur-[10px] border border-border';
    const shuffleBtnClass =
      'inline-flex items-center gap-2 px-4 py-2 rounded-[20px] bg-surface/90 border border-border shadow-[0_4px_12px_rgba(0,0,0,0.3)] text-[0.85rem] font-medium text-text-light backdrop-blur-sm transition-colors duration-200 hover:bg-surface-light hover:border-border-medium hover:text-text cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

  return (
    <div className="min-h-full flex flex-col bg-bg p-5 relative overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:h-[200%] before:bg-[radial-gradient(circle,rgba(7,166,107,0.04)_1px,transparent_1px)] before:bg-[length:50px_50px] before:animate-[float-bg_20s_linear_infinite] before:pointer-events-none max-[768px]:p-2.5 max-[768px]:justify-center">
      {/* 모바일: 인디케이터+셔플+카드 영역을 한 블록으로 묶어 세로 가운데 배치 */}
      <div className="flex flex-col max-[768px]:flex-shrink-0 max-[768px]:w-full">
        {/* 데스크톱: 키보드 안내 + 셔플 | 모바일: 인디케이터 + 셔플 한 줄 (설정 버튼은 App nav에 있음) */}
        <div className="flex flex-wrap justify-center gap-3 mb-2 relative z-[100] max-[768px]:gap-2 max-[768px]:justify-between max-[768px]:items-center max-[768px]:mb-3 shrink-0">
          <div className="inline-flex bg-surface/90 px-5 py-2.5 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] text-[0.85rem] text-text-light backdrop-blur-sm gap-4 items-center border border-border animate-fade-in max-[768px]:hidden">
            <div className="flex items-center gap-1.5">
              <kbd className="bg-surface-light border border-border-medium rounded px-2 py-0.5 font-mono text-[0.75rem] text-text shadow-[0_1px_2px_rgba(0,0,0,0.2)]">&larr;</kbd>
              <kbd className="bg-surface-light border border-border-medium rounded px-2 py-0.5 font-mono text-[0.75rem] text-text shadow-[0_1px_2px_rgba(0,0,0,0.2)]">&rarr;</kbd>
              <span>이동</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="bg-surface-light border border-border-medium rounded px-2 py-0.5 font-mono text-[0.75rem] text-text shadow-[0_1px_2px_rgba(0,0,0,0.2)]">Space</kbd>
              <span>뒤집기</span>
            </div>
          </div>
          {/* 모바일만: 인디케이터 + 셔플 한 줄 (동일 pill 스타일로 조화). 데스크톱에서는 hidden만 적용되도록 inline-flex는 768 이하에서만 */}
          <span className={`hidden max-[768px]:inline-flex max-[768px]:order-first ${indicatorPillClass}`} aria-live="polite">
            {currentSlide + 1} / {cards.length}
          </span>
          <button
            type="button"
            onClick={handleShuffleDeck}
            aria-label="덱 순서 섞기"
            className={`${shuffleBtnClass} max-[768px]:order-last`}
          >
            <Shuffle className="w-5 h-5 shrink-0" aria-hidden />
            <span>덱 셔플</span>
          </button>
        </div>

        <FlashCardPlayer
          key={shuffleKey}
          cards={cards}
          keyboardShortcuts
          onSlideChange={setCurrentSlide}
          renderIndicator={isMobile ? () => null : undefined}
        />
      </div>
    </div>
  );
};

export default FlashCardViewer;
