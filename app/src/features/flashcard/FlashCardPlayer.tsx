import React, { useState, useRef, useEffect } from 'react';
import Slider from 'react-slick';
import CodeDiffBlock from '../../templates/CodeDiffBlock';
import FileContentBlock from '../../templates/FileContentBlock';
import { getFileContent, getMarkdown } from '../../api/github-api';
import type { FlashCard } from './types';
import { trackEvent } from '../../analytics';
import { Sparkles, Folder } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

type BackViewMode = 'diff' | 'file';

/** AI 답변 플로팅 블록: 하단 고정, 코드/파일 토글과 무관하게 항상 노출 */
function AIAnswerFloatingBlock({ answer }: { answer: string }) {
  return (
    <div
      className="fc-answer-floating shrink-0 border-t border-slate-200 bg-slate-50/95 backdrop-blur-sm rounded-b-3xl"
      onClick={(e) => e.stopPropagation()}
      role="region"
      aria-label="예시 답변"
    >
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200">
        <span className="flex items-center justify-center w-6 h-6 rounded-xl bg-primary/10 text-primary" aria-hidden>
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">예시 답변</span>
      </div>
      <div className="fc-answer-body px-4 py-3 text-sm text-slate-700 leading-relaxed whitespace-pre-line max-h-[140px] overflow-y-auto">
        {answer}
      </div>
    </div>
  );
}

export interface FlashCardPlayerProps {
  cards: FlashCard[];
  keyboardShortcuts?: boolean;
  renderHeader?: () => React.ReactNode;
  renderFooter?: () => React.ReactNode;
  /** 슬라이드 변경 시 호출 (모바일에서 상단 인디케이터 연동용) */
  onSlideChange?: (index: number) => void;
  /** 제공 시 기본 인디케이터 대신 사용 (모바일에서 뷰어와 한 줄로 묶을 때) */
  renderIndicator?: (current: number, total: number) => React.ReactNode;
}

const FlashCardPlayer: React.FC<FlashCardPlayerProps> = ({
  cards,
  keyboardShortcuts = false,
  renderHeader,
  renderFooter,
  onSlideChange,
  renderIndicator,
}) => {
  const [flipped, setFlipped] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [backViewMode, setBackViewMode] = useState<BackViewMode>('diff');
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const lastFetchedUrlRef = useRef<string | null>(null);
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
    setFlipped((prev) => {
      if (!prev) {
        trackEvent('flashcard_flip', {
          card_index: currentSlide + 1,
          total_cards: cards.length,
        });
      }
      return !prev;
    });
  };

  useEffect(() => {
    if (!keyboardShortcuts) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (target?.closest('[role="tablist"]') || target?.getAttribute('role') === 'tab') {
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

  const card = cards[currentSlide];
  const metadata = card?.metadata;
  const files = metadata?.files ?? [];
  const hasFilesArray = files.length > 0;
  const legacyFilename = metadata?.filename;
  const hasFileView = hasFilesArray || Boolean(legacyFilename);
  const effectiveFiles = hasFilesArray
    ? files
    : legacyFilename
      ? [{ filename: legacyFilename, raw_url: undefined as string | undefined }]
      : [];
  const hasFiles = effectiveFiles.length > 0;
  const safeFileIndex = hasFiles ? Math.min(selectedFileIndex, effectiveFiles.length - 1) : 0;
  const currentFile = effectiveFiles[safeFileIndex];
  const currentFilename = currentFile?.filename ?? legacyFilename ?? '';
  const currentRawUrl = currentFile && 'raw_url' in currentFile ? (currentFile as { raw_url?: string }).raw_url : undefined;

  useEffect(() => {
    if (hasFiles && selectedFileIndex >= effectiveFiles.length) setSelectedFileIndex(0);
  }, [hasFiles, effectiveFiles.length, selectedFileIndex]);

  useEffect(() => {
    if (!flipped || !card || backViewMode !== 'file' || !hasFiles || !currentFilename) return;
    const fetchKey = currentRawUrl ?? currentFilename;
    if (lastFetchedUrlRef.current === fetchKey && fileContent !== null) return;

    let cancelled = false;
    lastFetchedUrlRef.current = fetchKey;
    setFileLoading(true);
    setFileError(null);
    const fetchPromise = currentRawUrl
      ? getFileContent(currentRawUrl)
      : getMarkdown(currentFilename, card?.metadata?.repositoryFullName);
    fetchPromise
      .then((content) => {
        if (!cancelled) {
          setFileContent(content);
          setFileError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFileError(err?.message ?? '파일을 불러올 수 없습니다.');
          setFileContent(null);
        }
      })
      .finally(() => {
        if (!cancelled) setFileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [flipped, currentSlide, backViewMode, safeFileIndex, cards, hasFiles, fileContent, currentFilename, currentRawUrl]);

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
          border-radius: inherit;
          padding: 2px;
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(51, 65, 85, 0.2));
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          -webkit-mask-composite: xor;
          pointer-events: none;
        }
        .fc-card::-webkit-scrollbar { width: 7px; }
        .fc-card::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.04); border-radius: 10px; }
        .fc-card::-webkit-scrollbar-thumb { background: rgba(34, 197, 94, 0.28); border-radius: 10px; }
        .fc-card::-webkit-scrollbar-thumb:hover { background: rgba(34, 197, 94, 0.45); }
        .fc-card.flipped .markdown-body {
          width: 100%; height: 100%; overflow-y: auto;
          padding: 2rem; box-sizing: border-box;
          background: white; text-align: left;
        }
        .fc-card .github-diff-container {
          margin: 12px 0; border: 1px solid rgb(226 232 240);
          border-radius: 12px; overflow: hidden;
        }
        .fc-card .github-diff-container pre { margin: 0 !important; }
        @media (max-width: 768px) {
          .fc-card.flipped .markdown-body { padding: 1.5rem; font-size: 0.95rem; }
        }
        @media (max-width: 480px) {
          .fc-card.flipped .markdown-body { padding: 1rem; font-size: 0.9rem; }
        }
        .fc-answer-floating .fc-answer-body::-webkit-scrollbar { width: 5px; }
        .fc-answer-floating .fc-answer-body::-webkit-scrollbar-track { background: rgba(0,0,0,0.04); border-radius: 10px; }
        .fc-answer-floating .fc-answer-body::-webkit-scrollbar-thumb { background: rgba(34, 197, 94, 0.25); border-radius: 10px; }
        @media (prefers-reduced-motion: reduce) {
          .fc-card { transition: none; }
          .fc-card.flipped { animation: none; }
          .fc-player .slick-dots li button:before { transition: none; }
        }
      `}</style>

      {renderHeader?.()}

      {renderIndicator ? (
        renderIndicator(currentSlide, cards.length) ?? <div className="mb-4" aria-hidden />
      ) : (
        <div className="text-center mb-4">
          <span className="inline-block bg-surface py-2.5 px-[22px] rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.3)] text-[0.95rem] font-semibold text-primary backdrop-blur-[10px] border border-border animate-[fc-slide-down_0.5s_ease-out] max-[768px]:py-2 max-[768px]:px-[18px] max-[768px]:text-[0.85rem]">
            {currentSlide + 1} / {cards.length}
          </span>
        </div>
      )}

      <div className="fc-player flex-1 flex flex-col min-h-0 max-w-[1200px] mx-auto w-full relative z-10">
        <div className="flex-1 min-h-0 flex flex-col">
          <Slider
            ref={sliderRef}
            dots
            arrows={false}
            swipe
            infinite={false}
            beforeChange={(_, next) => {
              setFlipped(false);
              setBackViewMode('diff');
              setSelectedFileIndex(0);
              setFileContent(null);
              setFileError(null);
              lastFetchedUrlRef.current = null;
              setCurrentSlide(next);
              onSlideChange?.(next);
            }}
            appendDots={(dots) => (
              <div style={{ top: '10px' }}>
                <ul style={{ padding: '0px' }}>{dots}</ul>
              </div>
            )}
          >
            {cards.map((card, i) => {
              const isFlipped = flipped && currentSlide === i;

              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  aria-label={isFlipped ? '카드 앞면 보기 (클릭 또는 Space)' : '카드 뒷면 보기 (클릭 또는 Space)'}
                  className={`fc-card flex !flex items-center justify-center text-2xl text-center min-h-[50vh] max-h-[80vh] m-3 bg-white border-none rounded-3xl overflow-auto transition-all duration-300 p-10 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_0_1px_rgba(34,197,94,0.25)] relative antialiased cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 max-[768px]:min-h-[40vh] max-[768px]:max-h-[75vh] max-[768px]:m-2 max-[768px]:p-6 max-[768px]:text-xl max-[768px]:rounded-[20px] max-[480px]:min-h-[35vh] max-[480px]:max-h-[70vh] max-[480px]:m-[5px] max-[480px]:p-4 max-[480px]:text-base max-[480px]:rounded-4 ${isFlipped ? 'flipped items-start justify-start text-left shadow-[0_25px_70px_rgba(0,0,0,0.5),0_0_0_1px_rgba(34,197,94,0.3)] p-0 overflow-hidden animate-[fc-flip-in_0.3s_ease-out]' : ''}`}
                  onClick={flipCard}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      flipCard();
                    }
                  }}
                >
                  {isFlipped ? (
                    <div className="fc-card-back w-full h-full flex flex-col min-h-0">
                      <div
                        className="fc-back-header flex flex-wrap items-center gap-1 p-2 border-b border-slate-200 bg-slate-50 shrink-0 rounded-t-3xl"
                        onClick={(e) => e.stopPropagation()}
                        role="tablist"
                        aria-label="뒷면 보기 모드"
                      >
                        {card.metadata?.repositoryFullName && (
                          <a
                            href={`https://github.com/${card.metadata.repositoryFullName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mr-2 px-2 py-1 rounded-lg bg-white border border-slate-200 text-[0.75rem] font-mono text-slate-600 no-underline transition-colors duration-200 hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Folder className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            <span className="truncate max-w-[140px] sm:max-w-[200px]" title={card.metadata.repositoryFullName}>{card.metadata.repositoryFullName}</span>
                          </a>
                        )}
                        <button
                          type="button"
                          role="tab"
                          aria-selected={backViewMode === 'diff'}
                          className={`fc-tab min-w-[100px] py-2 px-3 rounded-xl text-sm font-medium transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${backViewMode === 'diff' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-slate-800 hover:bg-slate-100'}`}
                          onClick={() => setBackViewMode('diff')}
                        >
                          Diff 보기
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={backViewMode === 'file'}
                          disabled={!hasFileView}
                          className={`fc-tab min-w-[100px] py-2 px-3 rounded-xl text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${backViewMode === 'file' ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-slate-800 hover:bg-slate-100'} ${hasFileView ? 'cursor-pointer' : ''}`}
                          onClick={() => hasFileView && setBackViewMode('file')}
                        >
                          파일 보기
                        </button>
                        {backViewMode === 'file' && hasFilesArray && effectiveFiles.length > 1 && (
                          <Select
                            value={String(safeFileIndex)}
                            onValueChange={(value) => {
                              setSelectedFileIndex(Number(value));
                              lastFetchedUrlRef.current = null;
                            }}
                          >
                            <SelectTrigger
                              className="ml-2 h-8 min-w-0 max-w-[200px] rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:ring-primary focus:ring-offset-1"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="파일 선택"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent onClick={(e) => e.stopPropagation()}>
                              {effectiveFiles.map((f, i) => (
                                <SelectItem key={i} value={String(i)} title={f.filename}>
                                  <span className="truncate block max-w-[180px]">{f.filename}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {backViewMode === 'file' && hasFileView && effectiveFiles.length === 1 && (
                          <span className="ml-2 text-xs text-slate-500 truncate max-w-[180px]" title={currentFilename}>
                            {currentFilename}
                          </span>
                        )}
                      </div>
                      <div
                        className="fc-highlight-guide flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-100 bg-amber-50/60 text-slate-600 text-[11px] shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        aria-hidden
                      >
                        <span className="inline-block w-3 h-3 rounded-sm bg-amber-100/90 border border-amber-200/80" />
                        <span>밝은 배경은 이 질문과 연결된 부분이에요. 카드에 따라 표시가 없을 수도 있어요.</span>
                      </div>
                      <div className="fc-back-content flex-1 min-h-0 overflow-auto">
                        {backViewMode === 'diff' ? (
                          card.metadata?.rawDiff ? (
                            <CodeDiffBlock diffContent={card.metadata.rawDiff} highlightStrings={card.highlights} />
                          ) : (
                            <div className="p-6 text-slate-500 text-sm">코드 변경 내용이 없습니다. 파일 보기에서 확인하세요.</div>
                          )
                        ) : fileLoading ? (
                          <div className="p-6 text-slate-500 text-sm">파일 내용을 불러오는 중...</div>
                        ) : fileError ? (
                          <div className="p-6 text-[#cf222e] text-sm">{fileError}</div>
                        ) : fileContent !== null ? (
                          <FileContentBlock content={fileContent} filename={currentFilename} highlightStrings={card.highlights} />
                        ) : (
                          <div className="p-6 text-slate-500 text-sm">파일 정보가 없습니다.</div>
                        )}
                      </div>
                      {/* 하단 플로팅: Diff/파일 보기 토글과 무관하게 항상 노출 */}
                      <AIAnswerFloatingBlock answer={card.answer} />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full p-4 text-center">
                      {card.metadata?.repositoryFullName && (
                        <span className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[0.75rem] font-mono text-slate-600">
                          <Folder className="w-3.5 h-3.5 shrink-0" aria-hidden />
                          <span className="truncate max-w-[200px] sm:max-w-[280px]" title={card.metadata.repositoryFullName}>{card.metadata.repositoryFullName}</span>
                        </span>
                      )}
                      <span className="inline-block mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        질문
                      </span>
                      <p className="text-[1.6rem] font-semibold text-[#1D232B] leading-[1.7] break-words [word-break:keep-all] whitespace-pre-line max-[768px]:text-[1.3rem] max-[480px]:text-[1.15rem]">
                        {card.question}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </Slider>
        </div>
      </div>

      {renderFooter?.()}
    </>
  );
};

export default FlashCardPlayer;
