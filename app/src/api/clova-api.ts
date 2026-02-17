import type { ChatCompletionResponse, ContentType } from '../types';

const FUNCTIONS_URL = import.meta.env.PROD
  ? import.meta.env.VITE_FUNCTIONS_URL_PROD
  : '/api';

/**
 * CLOVA Studio - Firebase Functions를 통해 호출
 */
export async function chatCompletions(
  text: string,
  contentType: ContentType = 'markdown'
): Promise<ChatCompletionResponse> {
  const prompt =
    contentType === 'markdown'
      ? '마크다운 파일을 읽고 질문을 만들어주세요. 질문은 다음과 같은 형식으로 출력해주세요. ["첫 번째 질문", "두 번째 질문", ...]'
      : '코드 변경 내용(diff)을 보고 질문을 만들어주세요. 변경된 코드의 목적, 동작, 영향 등에 대해 물어보세요. 질문은 다음과 같은 형식으로 출력해주세요. ["첫 번째 질문", "두 번째 질문", ...]';

  const response = await fetch(`${FUNCTIONS_URL}/chatCompletions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, text }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`AI API 호출 실패 (${response.status}): ${errorText}`);
  }

  return response.json();
}
