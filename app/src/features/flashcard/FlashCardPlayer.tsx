import React, { useState, useRef, useEffect } from 'react';
import Slider from 'react-slick';
import MarkdownBlock from '../../templates/MarkdownBlock';
import CodeDiffBlock from '../../templates/CodeDiffBlock';
import type { FlashCard } from './types';

import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './FlashCardPlayer.css';

export interface FlashCardPlayerProps {
  cards: FlashCard[];
  keyboardShortcuts?: boolean;
  renderHeader?: () => React.ReactNode;
  renderFooter?: () => React.ReactNode;
}

const FlashCardPlayer: React.FC<FlashCardPlayerProps> = ({
  cards,
  keyboardShortcuts = false,
  renderHeader,
  renderFooter,
}) => {
  const [flipped, setFlipped] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<Slider>(null);

  const next = () => {
    setFlipped(false);
    sliderRef.current?.slickNext();
  };

  const previous = () => {
    setFlipped(false);
    sliderRef.current?.slickPrev();
  };

  const flipCard = () => {
    setFlipped((prev) => !prev);
  };

  useEffect(() => {
    if (!keyboardShortcuts) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          if (currentSlide > 0) previous();
          break;
        case 'ArrowRight':
          if (currentSlide < cards.length - 1) next();
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
  }, [keyboardShortcuts, currentSlide, cards.length, flipped]);

  if (cards.length === 0) return null;

  return (
    <>
      {renderHeader?.()}

      <div className="fc-progress">
        <span className="fc-progress-badge">
          {currentSlide + 1} / {cards.length}
        </span>
      </div>

      <div className="fc-player">
        <div>
          <Slider
            ref={sliderRef}
            dots
            arrows={false}
            swipe={false}
            infinite={false}
            beforeChange={(_, next) => {
              setFlipped(false);
              setCurrentSlide(next);
            }}
            appendDots={(dots) => (
              <div style={{ top: '10px' }}>
                <ul style={{ padding: '0px' }}>{dots}</ul>
              </div>
            )}
          >
            {cards.map((card, i) => {
              const contentType = card.contentType || 'markdown';
              const isFlipped = flipped && currentSlide === i;

              return (
                <div
                  key={i}
                  className={`fc-card ${isFlipped ? 'flipped' : ''}`}
                  onClick={flipCard}
                >
                  {isFlipped ? (
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

        <div className="fc-buttons">
          <button
            className="fc-btn fc-btn-nav"
            onClick={previous}
            disabled={currentSlide === 0}
            aria-label="이전 카드"
          >
            &#8592;
          </button>
          <button
            className="fc-btn fc-btn-flip"
            onClick={flipCard}
            aria-label="카드 뒤집기"
          >
            {flipped ? '질문 보기' : '카드 뒤집기'}
          </button>
          <button
            className="fc-btn fc-btn-nav"
            onClick={next}
            disabled={currentSlide === cards.length - 1}
            aria-label="다음 카드"
          >
            &#8594;
          </button>
        </div>
      </div>

      {renderFooter?.()}
    </>
  );
};

export default FlashCardPlayer;
