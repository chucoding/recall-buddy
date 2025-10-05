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

export async function getCommits(since: Date, until: Date): Promise<Commit[]> {
  const sinceISO = since.toISOString();
  const untilISO = until.toISOString();
  
  const response = await fetch(`https://api.github.com/repos/hssuh/TIL/commits?since=${sinceISO}&until=${untilISO}`);
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
  return await response.json();
}

export async function getFilename(sha: string): Promise<CommitDetail> {
  const response = await fetch(`https://api.github.com/repos/hssuh/TIL/commits/${sha}`);
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
  return await response.json();
}

export async function getMarkdown(filename: string): Promise<string> {
  const response = await fetch(`https://raw.githubusercontent.com/hssuh/TIL/main/${filename}`);
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
  return await response.text();
}
