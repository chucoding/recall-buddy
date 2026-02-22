import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { FlashCardPlayer } from '../features/flashcard';
import type { FlashCard } from '../features/flashcard';
import { auth, store } from '../firebase';
import { getCurrentDate, shuffleArray } from '../modules/utils';

/**
 * 로그인 사용자 전용 플래시카드 뷰어
 * 데이터 소스: Firestore (users/{uid}/flashcards/{오늘날짜}). 데모는 LandingDemo + lib/demoFlashcards.
 * 진입 시 1회 셔플, "덱 셔플" 버튼으로 순서 재섞기.
 */
const FlashCardViewer: React.FC = () => {
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [shuffleKey, setShuffleKey] = useState(0);

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

  return (
    <div className="min-h-screen flex flex-col bg-bg p-5 relative overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:h-[200%] before:bg-[radial-gradient(circle,rgba(7,166,107,0.04)_1px,transparent_1px)] before:bg-[length:50px_50px] before:animate-[float-bg_20s_linear_infinite] before:pointer-events-none max-[768px]:p-2.5">
      <FlashCardPlayer
        key={shuffleKey}
        cards={cards}
        keyboardShortcuts
        renderHeader={() => (
          <div className="flex flex-wrap justify-center gap-3 mb-2 relative z-[1] max-[768px]:gap-2">
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
            <button
              type="button"
              onClick={handleShuffleDeck}
              aria-label="덱 순서 섞기"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[20px] bg-surface/90 border border-border shadow-[0_4px_12px_rgba(0,0,0,0.3)] text-[0.85rem] font-medium text-text-light backdrop-blur-sm transition-colors duration-200 hover:bg-surface-light hover:border-border-medium hover:text-text cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0" aria-hidden>
                <path d="M16 3h5v5" />
                <path d="M8 3H3v5" />
                <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
                <path d="m15 9 6-6" />
                <path d="M9 21H4v-5" />
                <path d="M21 21v-5h-5" />
                <path d="m15 15 6 6" />
              </svg>
              <span>덱 셔플</span>
            </button>
          </div>
        )}
      />
    </div>
  );
};

export default FlashCardViewer;
