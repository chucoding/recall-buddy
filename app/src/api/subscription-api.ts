import { apiClient } from '../modules/axios';

export type PriceId = 'monthly' | 'yearly';

/**
 * Stripe Checkout 세션 생성 후 리다이렉트 URL 반환
 */
export async function createCheckoutSession(priceId: PriceId, returnUrlBase?: string): Promise<{ url: string }> {
  const { data } = await apiClient.post<{ url: string }>('/createCheckoutSession', {
    priceId,
    returnUrlBase: returnUrlBase || (typeof window !== 'undefined' ? window.location.origin : ''),
  });
  return data;
}

/**
 * 오늘 플래시카드 수동 재생성 (Pro 전용, 일 3회 한도)
 */
export async function regenerateTodayFlashcards(): Promise<{ ok: boolean }> {
  const { data } = await apiClient.post<{ ok: boolean }>('/regenerateTodayFlashcards', {});
  return data;
}
