import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import './FlashCardViewer.css';

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
    <div className="flashcard-container">
      <FlashCardPlayer
        cards={cards}
        keyboardShortcuts
        renderHeader={() => (
          <div className="keyboard-hint">
            <div className="keyboard-hint-item">
              <kbd>&larr;</kbd>
              <kbd>&rarr;</kbd>
              <span>이동</span>
            </div>
            <div className="keyboard-hint-item">
              <kbd>Space</kbd>
              <span>뒤집기</span>
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default FlashCardViewer;
