/**
 * OpenAI 플래시카드 구조화 출력 스키마 (functions/openai.ts response_format과 동기화)
 */
export interface FlashcardStructuredOutput {
  items: Array<{
    question: string;
    answer: string;
    highlights?: string[];
  }>;
}

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
 * 구독 티어 (Firestore users/{uid} subscriptionTier와 동기화)
 */
export type SubscriptionTier = "free" | "pro";

/**
 * 사용자 구독·한도 정보 (Firestore users 문서 일부)
 */
export interface UserSubscription {
  subscriptionTier: SubscriptionTier;
  subscriptionPeriodEnd?: string | null;
  stripeCustomerId?: string | null;
  regenerateCountToday?: number;
  lastRegenerateDate?: string | null;
  preferredPushHour?: number | null;
  /** IANA 타임존 (예: Asia/Seoul). 푸시 알림 "희망 시"가 이 시간대 기준. 없으면 서버 기본(Asia/Seoul) 사용. */
  preferredPushTimezone?: string | null;
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

