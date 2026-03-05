export interface FileChange {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  raw_url?: string;
  blob_url?: string;
}

export interface CommitDetail {
  sha: string;
  commit: {
    message: string;
  };
  files: FileChange[];
}

export interface Branch {
  name: string;
  protected: boolean;
}
