export type ContentType = 'markdown' | 'code-diff';

export interface FlashCard {
  question: string;
  answer: string;
  contentType?: ContentType;
  metadata?: {
    filename?: string;
    commitMessage?: string;
  };
}
