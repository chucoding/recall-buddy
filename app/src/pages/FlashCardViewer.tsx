import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { FlashCardPlayer } from '../features/flashcard';
import type { FlashCard } from '../features/flashcard';
import { auth, store } from '../firebase';
import { getCurrentDate } from '../modules/utils';

const FlashCardViewer: React.FC = () => {
  const [cards, setCards] = useState<FlashCard[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const todayDate = getCurrentDate();
    const flashcardDocRef = doc(store, 'users', user.uid, 'flashcards', todayDate);

    getDoc(flashcardDocRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCards(data.data || []);
      } else {
        setCards([]);
      }
    });
  }, []);

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg p-5 relative overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:h-[200%] before:bg-[radial-gradient(circle,rgba(7,166,107,0.04)_1px,transparent_1px)] before:bg-[length:50px_50px] before:animate-[float-bg_20s_linear_infinite] before:pointer-events-none max-[768px]:p-2.5">
      <FlashCardPlayer
        cards={cards}
        keyboardShortcuts
        renderHeader={() => (
          <div className="text-center mb-2 relative z-[1] max-[768px]:hidden">
            <div className="inline-flex bg-surface/90 px-5 py-2.5 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] text-[0.85rem] text-text-light backdrop-blur-sm gap-4 items-center border border-border animate-fade-in">
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
          </div>
        )}
      />
    </div>
  );
};

export default FlashCardViewer;
