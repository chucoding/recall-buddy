export interface FlashCard {
  question: string;
  answer: string;
  metadata?: {
    filename?: string;
    commitMessage?: string;
  };
}
