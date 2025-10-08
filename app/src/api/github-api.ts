import { apiClient } from '../modules/axios';

interface Commit {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
  };
}

interface CommitDetail {
  files: Array<{
    filename: string;
  }>;
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
