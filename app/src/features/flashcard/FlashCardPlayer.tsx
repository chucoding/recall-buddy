import React, { useState, useRef, useEffect } from 'react';
import Slider from 'react-slick';
import MarkdownBlock from '../../templates/MarkdownBlock';
import CodeDiffBlock from '../../templates/CodeDiffBlock';
import type { FlashCard } from './types';

import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

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
      <style>{`
        @keyframes fc-flip-in {
          0% { opacity: 0.7; transform: scale(0.98); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fc-slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fc-player .slick-list { z-index: 1; overflow: visible; }
        .fc-player .slick-track { display: flex; align-items: center; }
        .fc-player .slick-dots { position: relative; bottom: -28px; }
        .fc-player .slick-dots li { margin: 0 6px; }
        .fc-player .slick-dots li button:before {
          font-size: 11px; color: rgba(255, 255, 255, 0.45);
          transition: all 0.3s ease;
        }
        .fc-player .slick-dots li.slick-active button:before {
          color: white; transform: scale(1.3);
        }
        .fc-player .slick-dots li button:hover:before {
          color: rgba(255, 255, 255, 0.8);
        }
        .fc-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          border-radius: 24px;
          padding: 2px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.1));
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          -webkit-mask-composite: xor;
          pointer-events: none;
        }
        .fc-card::-webkit-scrollbar { width: 7px; }
        .fc-card::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.04); border-radius: 10px; }
        .fc-card::-webkit-scrollbar-thumb { background: rgba(102, 126, 234, 0.28); border-radius: 10px; }
        .fc-card::-webkit-scrollbar-thumb:hover { background: rgba(102, 126, 234, 0.45); }
        .fc-card.flipped .markdown-body {
          width: 100%; height: 100%; overflow-y: auto;
          padding: 2rem; box-sizing: border-box;
          background: white; text-align: left;
        }
        .fc-card .github-diff-container {
          margin: 12px 0; border: 1px solid #d0d7de;
          border-radius: 6px; overflow: hidden;
        }
        .fc-card .github-diff-container pre { margin: 0 !important; }
        .fc-btn::before {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          width: 0; height: 0;
          border-radius: 50%;
          background: rgba(102, 126, 234, 0.1);
          transform: translate(-50%, -50%);
          transition: width 0.6s, height 0.6s;
        }
        .fc-btn:hover:not(:disabled)::before { width: 300px; height: 300px; }
        @media (max-width: 768px) {
          .fc-card.flipped .markdown-body { padding: 1.5rem; font-size: 0.95rem; }
        }
        @media (max-width: 480px) {
          .fc-card.flipped .markdown-body { padding: 1rem; font-size: 0.9rem; }
        }
      `}</style>

      {renderHeader?.()}

      <div className="text-center mb-4">
        <span className="inline-block bg-white/95 py-2.5 px-[22px] rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.15)] text-[0.95rem] font-semibold text-primary backdrop-blur-[10px] animate-[fc-slide-down_0.5s_ease-out] max-[768px]:py-2 max-[768px]:px-[18px] max-[768px]:text-[0.85rem]">
          {currentSlide + 1} / {cards.length}
        </span>
      </div>

      <div className="fc-player flex-1 flex flex-col justify-center max-w-[1200px] mx-auto w-full relative z-10">
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
                  className={`fc-card flex !flex items-center justify-center text-2xl text-center min-h-[380px] max-h-[600px] m-3 bg-white border-none rounded-3xl overflow-auto transition-all duration-[0.6s] p-10 shadow-[0_20px_60px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)] relative antialiased max-[768px]:min-h-[300px] max-[768px]:max-h-[500px] max-[768px]:m-2 max-[768px]:p-6 max-[768px]:text-xl max-[768px]:rounded-[20px] max-[480px]:min-h-[260px] max-[480px]:max-h-[420px] max-[480px]:m-[5px] max-[480px]:p-4 max-[480px]:text-base max-[480px]:rounded-4 [transition-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)] ${isFlipped ? 'flipped items-start justify-start text-left shadow-[0_25px_70px_rgba(0,0,0,0.4),0_0_0_1px_rgba(118,75,162,0.2)] p-0 overflow-hidden animate-[fc-flip-in_0.3s_ease-out]' : ''}`}
                  onClick={flipCard}
                >
                  {isFlipped ? (
                    contentType === 'code-diff' ? (
                      <CodeDiffBlock diffContent={card.answer} />
                    ) : (
                      <MarkdownBlock markdown={card.answer} />
                    )
                  ) : (
                    <p className="text-[1.6rem] font-semibold text-text-dark leading-[1.7] p-4 break-words [word-break:keep-all] whitespace-pre-line text-center max-[768px]:text-[1.3rem] max-[768px]:p-[10px] max-[480px]:text-[1.15rem]">
                      {card.question}
                    </p>
                  )}
                </div>
              );
            })}
          </Slider>
        </div>

        <div className="mt-[52px] flex justify-center items-center gap-[14px] px-5 max-[768px]:mt-10 max-[768px]:gap-3 max-[768px]:px-[10px] max-[480px]:gap-2.5">
          <button
            className="fc-btn bg-white text-primary border-none font-semibold cursor-pointer transition-all duration-300 shadow-[0_8px_20px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.1)] relative overflow-hidden flex items-center justify-center w-16 h-16 rounded-full text-2xl shrink-0 hover:enabled:-translate-y-0.5 hover:enabled:scale-[1.05] hover:enabled:shadow-[0_12px_30px_rgba(102,126,234,0.4),0_0_0_1px_rgba(102,126,234,0.2)] active:enabled:-translate-y-px active:enabled:scale-[1.02] disabled:opacity-[0.35] disabled:cursor-not-allowed disabled:transform-none disabled:hover:transform-none disabled:hover:shadow-[0_8px_20px_rgba(0,0,0,0.2)] max-[768px]:w-[52px] max-[768px]:h-[52px] max-[768px]:text-[1.3rem] max-[480px]:w-12 max-[480px]:h-12 max-[480px]:text-xl [transition-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)]"
            onClick={previous}
            disabled={currentSlide === 0}
            aria-label="이전 카드"
          >
            &#8592;
          </button>
          <button
            className="fc-btn bg-white text-primary border-none font-semibold cursor-pointer transition-all duration-300 shadow-[0_8px_20px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.1)] relative overflow-hidden flex items-center justify-center min-w-[168px] h-16 rounded-[32px] px-7 flex-grow max-w-[300px] text-xl hover:enabled:-translate-y-0.5 hover:enabled:scale-[1.05] hover:enabled:shadow-[0_12px_30px_rgba(102,126,234,0.4),0_0_0_1px_rgba(102,126,234,0.2)] active:enabled:-translate-y-px active:enabled:scale-[1.02] max-[768px]:min-w-[140px] max-[768px]:h-[52px] max-[768px]:text-base max-[768px]:px-[22px] max-[480px]:min-w-[120px] max-[480px]:h-12 max-[480px]:text-[0.95rem] max-[480px]:px-[18px] [transition-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)]"
            onClick={flipCard}
            aria-label="카드 뒤집기"
          >
            {flipped ? '질문 보기' : '카드 뒤집기'}
          </button>
          <button
            className="fc-btn bg-white text-primary border-none font-semibold cursor-pointer transition-all duration-300 shadow-[0_8px_20px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.1)] relative overflow-hidden flex items-center justify-center w-16 h-16 rounded-full text-2xl shrink-0 hover:enabled:-translate-y-0.5 hover:enabled:scale-[1.05] hover:enabled:shadow-[0_12px_30px_rgba(102,126,234,0.4),0_0_0_1px_rgba(102,126,234,0.2)] active:enabled:-translate-y-px active:enabled:scale-[1.02] disabled:opacity-[0.35] disabled:cursor-not-allowed disabled:transform-none disabled:hover:transform-none disabled:hover:shadow-[0_8px_20px_rgba(0,0,0,0.2)] max-[768px]:w-[52px] max-[768px]:h-[52px] max-[768px]:text-[1.3rem] max-[480px]:w-12 max-[480px]:h-12 max-[480px]:text-xl [transition-timing-function:cubic-bezier(0.68,-0.55,0.265,1.55)]"
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
