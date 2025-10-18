import { apiClient } from '../modules/axios';
import type { ChatCompletionResponse, ContentType } from '@recall-buddy/shared';

/**
 * CLOVA Studio - Firebase Functions를 통해 호출
 */
export async function chatCompletions(
  text: string, 
  contentType: ContentType = 'markdown'
): Promise<ChatCompletionResponse> {
    try {
        let prompt: string;
        
        if (contentType === 'markdown') {
            prompt = "마크다운 파일을 읽고 질문을 만들어주세요. 질문은 다음과 같은 형식으로 출력해주세요. [\"첫 번째 질문\", \"두 번째 질문\", ...]";
        } else {
            prompt = "코드 변경 내용(diff)을 보고 질문을 만들어주세요. 변경된 코드의 목적, 동작, 영향 등에 대해 물어보세요. 질문은 다음과 같은 형식으로 출력해주세요. [\"첫 번째 질문\", \"두 번째 질문\", ...]";
        }
        
        const response = await apiClient.post('/chatCompletions', {
            prompt: prompt,
            text: text,
        });

        return response.data;
    } catch (err) {
        console.error("Error during API call:", err);
        throw err;
    }
}
