import type { FlashCardData } from '@/entities/flashcard';

const FUNCTIONS_URL = import.meta.env.PROD
  ? import.meta.env.VITE_FUNCTIONS_URL_PROD
  : '/api';

/**
 * 플래시카드 Q&A를 targetLang으로 AI 번역
 * highlights, metadata는 유지
 */
export async function translateFlashcards(
  cards: FlashCardData[],
  targetLang: 'ko' | 'en'
): Promise<FlashCardData[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(`${FUNCTIONS_URL}/translateFlashcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards, targetLang }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('번역 API 호출 시간 초과 (30초)');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`번역 API 호출 실패 (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { cards?: FlashCardData[] };
  return data.cards ?? [];
}
