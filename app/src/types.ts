/**
 * GitHub Repository
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

