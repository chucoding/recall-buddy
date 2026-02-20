import type { FileChange } from '../../api/github-api';

export interface FlashCard {
  question: string;
  answer: string;
  metadata?: {
    commitMessage?: string;
    /** 새 스키마: 전체 파일 목록 (raw_url 등) */
    files?: FileChange[];
    /** 하위 호환: 파일 하나만 있을 때 */
    filename?: string;
  };
}
