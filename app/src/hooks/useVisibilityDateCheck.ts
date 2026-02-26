import { useEffect, useRef, useCallback } from 'react';
import { useNavigationStore } from '../stores/navigationStore';
import { getCurrentDate } from '../modules/utils';

const DEBOUNCE_MS = 250;

/**
 * 앱이 다시 활성화될 때(visibilitychange, pageshow, focus) 날짜가 바뀌었는지 확인하고,
 * 오늘 뷰에서 하루가 지났으면 플래시카드 재로드를 트리거함.
 * PWA/탭이 백그라운드에 있다가 다시 포그라운드로 돌아올 때 유효.
 */
export function useVisibilityDateCheck(enabled: boolean) {
  const selectedPastDate = useNavigationStore((s) => s.selectedPastDate);
  const lastLoadedDateKey = useNavigationStore((s) => s.lastLoadedDateKey);
  const triggerFlashcardReload = useNavigationStore((s) => s.triggerFlashcardReload);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAndReloadIfNeeded = useCallback(() => {
    if (!enabled || typeof document === 'undefined' || document.visibilityState !== 'visible') {
      return;
    }
    // 과거 날짜 보는 중에는 건드리지 않음
    if (selectedPastDate !== null) {
      return;
    }
    if (!lastLoadedDateKey) {
      return;
    }
    const todayKey = getCurrentDate();
    if (todayKey !== lastLoadedDateKey) {
      triggerFlashcardReload();
    }
  }, [enabled, selectedPastDate, lastLoadedDateKey, triggerFlashcardReload]);

  const debouncedCheck = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(checkAndReloadIfNeeded, DEBOUNCE_MS);
  }, [checkAndReloadIfNeeded]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('visibilitychange', debouncedCheck);
    window.addEventListener('pageshow', debouncedCheck);
    window.addEventListener('focus', debouncedCheck);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      document.removeEventListener('visibilitychange', debouncedCheck);
      window.removeEventListener('pageshow', debouncedCheck);
      window.removeEventListener('focus', debouncedCheck);
    };
  }, [enabled, debouncedCheck]);
}
