const kbdClass =
  'bg-surface-light border border-border-medium rounded px-2 py-0.5 font-mono text-[0.75rem] text-text shadow-[0_1px_2px_rgba(0,0,0,0.2)]';

export interface FlashCardKeyboardIndicatorProps {
  /** 삭제 단축키( Del ) 표시 여부. 기본 true */
  showDelete?: boolean;
  /** 컨테이너 추가 className */
  className?: string;
}

/**
 * 플래시카드 키보드 단축키 안내 (데스크톱 전용, 768px 이하에서 숨김)
 */
export function FlashCardKeyboardIndicator({
  showDelete = true,
  className = '',
}: FlashCardKeyboardIndicatorProps) {
  return (
    <div
      className={`inline-flex bg-surface/90 px-5 py-2.5 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] text-[0.85rem] text-text-light backdrop-blur-sm gap-4 items-center border border-border animate-fade-in max-[768px]:hidden ${className}`}
      role="status"
      aria-label="키보드 단축키 안내"
    >
      <div className="flex items-center gap-1.5">
        <kbd className={kbdClass}>&larr;</kbd>
        <kbd className={kbdClass}>&rarr;</kbd>
        <span>이동</span>
      </div>
      <div className="flex items-center gap-1.5">
        <kbd className={kbdClass}>Space</kbd>
        <span>뒤집기</span>
      </div>
      {showDelete && (
        <div className="flex items-center gap-1.5">
          <kbd className={kbdClass}>Del</kbd>
          <span>삭제</span>
        </div>
      )}
    </div>
  );
}
