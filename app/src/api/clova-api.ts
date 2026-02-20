import type { ChatCompletionResponse } from '../types';

const FUNCTIONS_URL = import.meta.env.PROD
  ? import.meta.env.VITE_FUNCTIONS_URL_PROD
  : '/api';

/**
 * CLOVA Studio - Firebase Functions를 통해 호출
 */
export async function chatCompletions(text: string): Promise<ChatCompletionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(`${FUNCTIONS_URL}/chatCompletions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('AI API 호출 시간 초과 (30초)');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`AI API 호출 실패 (${response.status}): ${errorText}`);
  }

  return response.json();
}
