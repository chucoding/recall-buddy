import { apiClient } from '../modules/axios';
import type { Repository } from '../types';

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
  /** GitHub commit file: raw content URL (해당 커밋 시점 파일 원문) */
  raw_url?: string;
  /** GitHub commit file: blob URL */
  blob_url?: string;
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

export async function getCommits(
  since: Date,
  until: Date,
  repositoryFullName?: string
): Promise<Commit[]> {
  const params: Record<string, string> = {
    since: since.toISOString(),
    until: until.toISOString(),
  };
  if (repositoryFullName) params.repositoryFullName = repositoryFullName;

  const response = await apiClient.get('/getCommits', { params });
  return response.data;
}

export async function getFilename(
  sha: string,
  repositoryFullName?: string
): Promise<CommitDetail> {
  const params: Record<string, string> = { commit_sha: sha };
  if (repositoryFullName) params.repositoryFullName = repositoryFullName;

  const response = await apiClient.get('/getFilename', { params });
  return response.data;
}

export async function getMarkdown(
  filename: string,
  repositoryFullName?: string
): Promise<string> {
  const params: Record<string, string> = { filename };
  if (repositoryFullName) params.repositoryFullName = repositoryFullName;

  const response = await apiClient.get('/getMarkdown', { params });
  const data: MarkdownResponse = response.data;
  return data.content;
}

/**
 * raw_url로 해당 커밋 시점 파일 원문 조회 (private repo 대응으로 백엔드 경유)
 */
export async function getFileContent(rawUrl: string): Promise<string> {
  const response = await apiClient.get<MarkdownResponse>('/getFileContent', {
    params: { raw_url: rawUrl }
  });
  return response.data.content;
}

export async function getRepositories(): Promise<Repository[]> {
  const response = await apiClient.get('/getRepositories');
  return response.data;
}

/**
 * @deprecated
 * 과한 정보 제공으로 인해 사용하지 않음 2026-02-16
 * @TODO
 * 결제 기능 생기면 복구
 */
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

