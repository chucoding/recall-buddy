import { onRequest } from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions';

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

      // 환경변수에서 GitHub 토큰 가져오기 (로컬: process.env, 프로덕션: functions.config)
      const githubToken = process.env.GITHUB_TOKEN || functions.config().github?.token;
      
      if (!githubToken) {
        throw new Error('GitHub token not configured');
      }

      const response = await fetch(`https://api.github.com/repos/hssuh/TIL/commits?since=${since}&until=${until}`, {
        headers: {
          "Authorization": `Bearer ${githubToken}`,
          "Accept": "application/vnd.github.v3+json"
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching commits:', error);
      res.status(500).json({ error: 'Failed to fetch commits' });
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

      // 환경변수에서 GitHub 토큰 가져오기
      const githubToken = process.env.GITHUB_TOKEN || functions.config().github?.token;
      
      if (!githubToken) {
        throw new Error('GitHub token not configured');
      }

      const response = await fetch(`https://api.github.com/repos/hssuh/TIL/commits/${commit_sha}`, {
        headers: {
          "Authorization": `Bearer ${githubToken}`,
          "Accept": "application/vnd.github.v3+json"
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error fetching commit details:', error);
      res.status(500).json({ error: 'Failed to fetch commit details' });
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

      // 환경변수에서 GitHub 토큰 가져오기
      const githubToken = process.env.GITHUB_TOKEN || functions.config().github?.token;
      
      if (!githubToken) {
        throw new Error('GitHub token not configured');
      }

      const response = await fetch(`https://api.github.com/repos/hssuh/TIL/contents/${filename}`, {
        headers: {
          "Accept": "application/vnd.github.raw",
          "Authorization": `Bearer ${githubToken}`
        }
      });

      if (!response.ok) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const content = await response.text();
      res.json({ content });
    } catch (error) {
      console.error('Error fetching markdown:', error);
      res.status(500).json({ error: 'Failed to fetch markdown content' });
    }
  }
);
