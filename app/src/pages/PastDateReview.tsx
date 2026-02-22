import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { FlashCardPlayer } from '../features/flashcard';
import type { FlashCard } from '../features/flashcard';
import { auth, store } from '../firebase';
import { useNavigationStore } from '../stores/navigationStore';

interface PastDateReviewProps {
  date: string;
}

const PastDateReview: React.FC<PastDateReviewProps> = ({ date }) => {
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [loading, setLoading] = useState(true);
  const setSelectedPastDate = useNavigationStore((s) => s.setSelectedPastDate);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    const ref = doc(store, 'users', user.uid, 'flashcards', date);
    getDoc(ref).then((snap) => {
      setCards(snap.exists() ? (snap.data().data || []) : []);
      setLoading(false);
    });
  }, [date]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-5">
        <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg p-5 text-center">
        <p className="text-text-body text-[1rem] font-medium mb-1">해당 날짜에 저장된 카드가 없습니다.</p>
        <p className="text-text-muted text-[0.9rem] mb-6">{date}</p>
        <button
          type="button"
          onClick={() => setSelectedPastDate(null)}
          className="py-2.5 px-5 bg-primary text-bg font-semibold rounded-lg border-none cursor-pointer transition-colors duration-200 hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg"
        >
          오늘로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col bg-bg p-5 relative overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:h-[200%] before:bg-[radial-gradient(circle,rgba(7,166,107,0.04)_1px,transparent_1px)] before:bg-[length:50px_50px] before:animate-[float-bg_20s_linear_infinite] before:pointer-events-none max-[768px]:p-2.5">
      <div className="text-center mb-2 relative z-[1] flex justify-center items-center gap-3">
        <span className="text-text-light text-sm">{date} 복습</span>
        <button
          type="button"
          onClick={() => setSelectedPastDate(null)}
          className="py-1.5 px-3 bg-surface/90 text-text border border-border rounded-lg text-[0.85rem] font-medium transition-colors duration-200 hover:bg-surface-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-bg"
        >
          오늘로 돌아가기
        </button>
      </div>
      <FlashCardPlayer cards={cards} keyboardShortcuts />
    </div>
  );
};

export default PastDateReview;
