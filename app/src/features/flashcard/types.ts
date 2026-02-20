import type { FileChange } from '../../api/github-api';

export interface FlashCard {
  question: string;
  answer: string;
  metadata?: {
    commitMessage?: string;
    /** Diff 보기용 원본 코드 변경 내용 */
    rawDiff?: string;
    /** 전체 파일 목록 (raw_url 등) */
    files?: FileChange[];
    filename?: string;
  };
}
