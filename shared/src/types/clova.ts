/**
 * Content Type
 * 
 * markdown: 마크다운 콘텐츠
 * code-diff: 코드 변경 내용 (diff)
 */
export type ContentType = 'markdown' | 'code-diff';

/**
 * CLOVA Studio Chat Completion API Response
 */
export interface ChatCompletionResponse {
  status: {
    code: string;
    message: string;
  };
  result: {
    message: {
      role: string;
      content: string;
      thinkingContent?: string;
    };
    finishReason: string;
    created: number;
    seed: number;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      completionTokensDetails?: {
        thinkingTokens: number;
      };
    };
    aiFilter?: Array<{
      groupName: string;
      name: string;
      score: string;
      result: string;
    }>;
  };
}

