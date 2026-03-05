import type { FileChange } from '@/entities/repository';

export interface FlashCard {
  question: string;
  answer: string;
  /** 원문에서 이 질문과 연결되는 문장/코드 (Diff·파일 보기에서 하이라이트) */
  highlights?: string[];
  metadata?: {
    commitMessage?: string;
    /** Diff 보기용 원본 코드 변경 내용 */
    rawDiff?: string;
    /** 전체 파일 목록 (raw_url 등) */
    files?: FileChange[];
    filename?: string;
    /** 카드 출처 레포 (owner/repo). 다중 레포 시 표시용 */
    repositoryFullName?: string;
    /** 카드 출처 브랜치 (없으면 default branch) */
    branch?: string;
  };
}
