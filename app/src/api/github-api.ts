import { apiClient } from '../modules/axios';
import type { Repository } from '@recall-buddy/shared';

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
}

export interface FileChange {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface CommitDetail {
  sha: string;
  commit: {
    message: string;
  };
  files: FileChange[];
}

interface MarkdownResponse {
  content: string;
}

export async function getCommits(since: Date, until: Date): Promise<Commit[]> {
  const sinceISO = since.toISOString();
  const untilISO = until.toISOString();
  
  const response = await apiClient.get('/getCommits', {
    params: { since: sinceISO, until: untilISO }
  });
  
  return response.data;
}

export async function getFilename(sha: string): Promise<CommitDetail> {
  const response = await apiClient.get('/getFilename', {
    params: { commit_sha: sha }
  });
  
  return response.data;
}

export async function getMarkdown(filename: string): Promise<string> {
  const response = await apiClient.get('/getMarkdown', {
    params: { filename }
  });
  
  const data: MarkdownResponse = response.data;
  return data.content;
}

export async function getRepositories(): Promise<Repository[]> {
  const response = await apiClient.get('/getRepositories');
  return response.data;
}

export interface Branch {
  name: string;
  protected: boolean;
}

export async function getBranches(owner: string, repo: string): Promise<Branch[]> {
  const response = await apiClient.get('/getBranches', {
    params: { owner, repo }
  });
  return response.data;
}