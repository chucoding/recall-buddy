import { onRequest } from 'firebase-functions/v2/https';

/**
 * GitHub API 인증 헤더 생성
 * 클라이언트에서 전달받은 사용자의 GitHub OAuth 토큰 사용
 */
function getGitHubAuthHeader(req: any): string {
  const userToken = req.headers['x-github-token'];
  
  if (!userToken) {
    throw new Error('GitHub token not provided. Please authenticate with GitHub.');
  }
  
  return `Bearer ${userToken}`;
}

// GitHub API 호출을 위한 HTTP Functions
export const getCommits = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { since, until } = req.query;
      
      if (!since || !until) {
        res.status(400).json({ error: 'since and until parameters are required' });
        return;
      }

      const authHeader = getGitHubAuthHeader(req);

      const response = await fetch(`https://api.github.com/repos/hssuh/TIL/commits?since=${since}&until=${until}`, {
        headers: {
          "Authorization": authHeader,
          "Accept": "application/vnd.github.v3+json",
          "X-GitHub-Api-Version": "2022-11-28"
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`GitHub API error: ${response.status}`, errorBody);
        res.status(response.status).json({ 
          error: 'Failed to fetch commits from GitHub',
          details: errorBody 
        });
        return;
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching commits:', error);
      res.status(500).json({ 
        error: 'Failed to fetch commits',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export const getFilename = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { commit_sha } = req.query;
      
      if (!commit_sha) {
        res.status(400).json({ error: 'commit_sha parameter is required' });
        return;
      }

      const authHeader = getGitHubAuthHeader(req);

      const response = await fetch(`https://api.github.com/repos/hssuh/TIL/commits/${commit_sha}`, {
        headers: {
          "Authorization": authHeader,
          "Accept": "application/vnd.github.v3+json",
          "X-GitHub-Api-Version": "2022-11-28"
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`GitHub API error: ${response.status}`, errorBody);
        res.status(response.status).json({ 
          error: 'Failed to fetch commit details from GitHub',
          details: errorBody 
        });
        return;
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching commit details:', error);
      res.status(500).json({ 
        error: 'Failed to fetch commit details',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export const getMarkdown = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { filename } = req.query;
      
      if (!filename) {
        res.status(400).json({ error: 'filename parameter is required' });
        return;
      }

      const authHeader = getGitHubAuthHeader(req);

      const response = await fetch(`https://api.github.com/repos/hssuh/TIL/contents/${filename}`, {
        headers: {
          "Accept": "application/vnd.github.raw",
          "Authorization": authHeader,
          "X-GitHub-Api-Version": "2022-11-28"
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`GitHub API error: ${response.status}`, errorBody);
        res.status(response.status).json({ 
          error: 'File not found or access denied',
          details: errorBody 
        });
        return;
      }

      const content = await response.text();
      res.json({ content });
    } catch (error) {
      console.error('Error fetching markdown:', error);
      res.status(500).json({ 
        error: 'Failed to fetch markdown content',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);
