/**
 * GitHub Repository
 * 
 * id: 리포지토리 고유 아이디
 * name: 리포지토리 이름
 * full_name: 리포지토리 전체 이름
 * description: 리포지토리 설명
 * html_url: 리포지토리 홈페이지 주소
 * private: 리포지토리 공개 여부
 */
export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
}

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

