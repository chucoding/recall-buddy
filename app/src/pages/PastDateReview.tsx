import React, { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { FlashCardPlayer } from '../features/flashcard';
import type { FlashCard, DeleteMethod } from '../features/flashcard';
import { auth, store } from '../firebase';
import { trackEvent } from '../analytics';
import { useNavigationStore } from '../stores/navigationStore';
import { Button } from '@/components/ui/button';

interface PastDateReviewProps {
  date: string;
}

const PastDateReview: React.FC<PastDateReviewProps> = ({ date }) => {
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [syncSlideIndex, setSyncSlideIndex] = useState<number | null>(null);
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

  const handleDeleteCard = useCallback((index: number, method: DeleteMethod) => {
    const deletedCard = cards[index];
    const newCards = cards.filter((_, i) => i !== index);
    const newSlide = index >= newCards.length ? Math.max(0, newCards.length - 1) : index;

    setCards(newCards);
    setCurrentSlide(newSlide);
    setSyncSlideIndex(newSlide);

    const user = auth.currentUser;
    if (user) {
      const flashcardDocRef = doc(store, 'users', user.uid, 'flashcards', date);
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
  }, [cards, date]);

  if (cards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-5 text-center">
        <p className="text-muted-foreground text-[1rem] font-medium mb-1">해당 날짜에 저장된 카드가 없습니다.</p>
        <p className="text-muted-foreground text-[0.9rem] mb-6">{date}</p>
        <Button type="button" onClick={() => setSelectedPastDate(null)}>
          오늘로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col bg-bg p-5 relative overflow-hidden before:content-[''] before:absolute before:-top-1/2 before:-left-1/2 before:w-[200%] before:h-[200%] before:bg-[radial-gradient(circle,rgba(7,166,107,0.04)_1px,transparent_1px)] before:bg-[length:50px_50px] before:animate-[float-bg_20s_linear_infinite] before:pointer-events-none max-[768px]:p-2.5">
      <div className="text-center mb-2 relative z-[1] flex justify-center items-center gap-3">
        <span className="text-muted-foreground text-sm">{date} 복습</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSelectedPastDate(null)}
          className="bg-card/90"
        >
          오늘로 돌아가기
        </Button>
      </div>
      <FlashCardPlayer
        cards={cards}
        keyboardShortcuts
        onSlideChange={(n) => { setCurrentSlide(n); setSyncSlideIndex(null); }}
        onDeleteCard={handleDeleteCard}
        slideIndex={syncSlideIndex ?? undefined}
      />
    </div>
  );
};

export default PastDateReview;
