import { apiClient } from '../modules/axios';

export type PriceId = 'monthly' | 'yearly';

export const REGENERATE_QUESTION_LIMIT_FREE = 3;
export const REGENERATE_QUESTION_LIMIT_PRO = 20;

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

export interface RegenerateCardQuestionParams {
  rawDiff: string;
  existingQuestion: string;
  existingAnswer: string;
  flashcardDate: string;
}

export interface RegenerateCardQuestionDemoParams {
  rawDiff: string;
  existingQuestion: string;
  existingAnswer: string;
  demoDeviceId: string;
}

export interface RegenerateCardQuestionResult {
  question: string;
  highlights?: string[];
}

/**
 * 플래시카드 질문 재생성 (로그인 사용자, Free 3회/일, Pro 20회/일)
 */
export async function regenerateCardQuestion(
  params: RegenerateCardQuestionParams
): Promise<RegenerateCardQuestionResult> {
  const { data } = await apiClient.post<RegenerateCardQuestionResult>('/regenerateCardQuestion', params);
  return data;
}

const FUNCTIONS_URL = import.meta.env.PROD
  ? import.meta.env.VITE_FUNCTIONS_URL_PROD
  : '/api';

/**
 * 플래시카드 질문 재생성 (데모, 비로그인, 3회/일)
 */
export async function regenerateCardQuestionDemo(
  params: RegenerateCardQuestionDemoParams
): Promise<RegenerateCardQuestionResult> {
  const res = await fetch(`${FUNCTIONS_URL}/regenerateCardQuestion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `재생성 실패 (${res.status})`);
  }
  return res.json();
}
