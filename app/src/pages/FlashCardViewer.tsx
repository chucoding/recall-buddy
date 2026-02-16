import React, { useEffect, useState, useRef } from 'react';
import Slider from "react-slick";
import { doc, getDoc } from 'firebase/firestore';

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./FlashCardViewer.css";

import MarkdownBlock from '../templates/MarkdownBlock';
import CodeDiffBlock from '../templates/CodeDiffBlock';
import { auth, store } from '../firebase';
import { getCurrentDate } from '../modules/utils';
import type { ContentType } from '../hooks/useTodayFlashcards';

interface Card {
  question: string;
  answer: string;
  contentType?: ContentType;
  metadata?: {
    filename?: string;
    commitMessage?: string;
  };
}

const FlashCardViewer: React.FC = () => {
    const [cards, setCards] = useState<Card[]>([]);
    const [flipped, setFlipped] = useState<boolean>(false);
    const [currentSlide, setCurrentSlide] = useState<number>(0);

    let sliderRef = useRef<Slider>(null);
    
    const next = () => {
        setFlipped(false);
        sliderRef.current?.slickNext();
    };
    
    const previous = () => {
        setFlipped(false);
        sliderRef.current?.slickPrev();
    };

    const flipCard = () => {
        setFlipped(!flipped);
    };

    // Firestore에서 오늘의 플래시카드 1회 조회
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
    
    // 키보드 단축키 추가
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // 입력 필드에서는 작동하지 않도록
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }
            
            switch(e.key) {
                case 'ArrowLeft':
                    if (currentSlide > 0) {
                        previous();
                    }
                    break;
                case 'ArrowRight':
                    if (currentSlide < cards.length - 1) {
                        next();
                    }
                    break;
                case 'ArrowUp':
                case 'ArrowDown':
                case ' ':
                    e.preventDefault();
                    flipCard();
                    break;
            }
        };
        
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [currentSlide, cards.length, flipped]);
    
    // 이제 App.tsx에서 로딩과 데이터 없음을 처리하므로 여기서는 빈 배열일 때만 처리
    if (cards.length === 0) {
        return null; // App.tsx에서 처리됨
    }

    return (
        <div className='flashcard-container'>
            <div className='progress-indicator'>
                {currentSlide + 1} / {cards.length}
            </div>
            
            <div className='keyboard-hint'>
                <div className='keyboard-hint-item'>
                    <kbd>←</kbd>
                    <kbd>→</kbd>
                    <span>이동</span>
                </div>
                <div className='keyboard-hint-item'>
                    <kbd>Space</kbd>
                    <span>뒤집기</span>
                </div>
            </div>
            
            <div className='card-player'>
                <div>
                    <Slider
                        ref={slider => {
                            (sliderRef as any).current = slider;
                        }}
                        dots={true}
                        arrows={false}
                        swipe={false}
                        infinite={false}
                        beforeChange={(_, next) => {
                            setCurrentSlide(next);
                        }}
                        appendDots={(dots) => (
                            <div style={{ top:'10px'}}>
                                <ul style={{ padding:'0px' }}>{dots}</ul>
                            </div>
                        )}
                    >
                        {cards.map((card, i) => {
                            const contentType = card.contentType || 'markdown';
                            
                            return (
                                <div key={i} className={`flashcard ${flipped && currentSlide === i ? 'flipped' : ''}`}>
                                    {flipped && currentSlide === i ? (
                                        contentType === 'code-diff' ? (
                                            <CodeDiffBlock diffContent={card.answer} />
                                        ) : (
                                            <MarkdownBlock markdown={card.answer} />
                                        )
                                    ) : (
                                        <p>{card.question}</p>
                                    )}
                                </div>
                            );
                        })}                       
                    </Slider>
                </div>
                <div className='button-wrapper'>
                    <button 
                        className='button-circle' 
                        onClick={previous}
                        disabled={currentSlide === 0}
                        aria-label="이전 카드"
                    >
                        ⬅
                    </button>
                    <button 
                        className='button-oval' 
                        onClick={flipCard}
                        aria-label="카드 뒤집기"
                    >
                        {flipped ? '질문 보기' : '카드 뒤집기'}
                    </button>
                    <button 
                        className='button-circle' 
                        onClick={next}
                        disabled={currentSlide === cards.length - 1}
                        aria-label="다음 카드"
                    >
                        ➡
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FlashCardViewer;
