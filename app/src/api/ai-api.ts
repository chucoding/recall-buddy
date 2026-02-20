import type { ChatCompletionResponse } from '../types';
import { chatCompletions as clovaChatCompletions } from './clova-api';
import { chatCompletions as openaiChatCompletions } from './openai-api';

const provider = import.meta.env.VITE_AI_PROVIDER ?? 'openai';

/**
 * 환경변수 VITE_AI_PROVIDER에 따라 Clova 또는 OpenAI를 호출합니다.
 * 미설정 시 OpenAI 사용. "clova"이면 Clova 사용.
 *
 * 사용처: (1) 로그인 플래시카드 생성 useTodayFlashcards (2) 랜딩 데모 lib/demoFlashcards
 */
export async function chatCompletions(text: string): Promise<ChatCompletionResponse> {
  if (provider === 'clova') {
    return clovaChatCompletions(text);
  }
  return openaiChatCompletions(text);
}
