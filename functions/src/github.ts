import { onRequest } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { Repository } from '@til-alarm/shared';

/**
 * Firebase ID Token 검증 및 사용자 정보 조회
 */
async function getUserData(req: any): Promise<{
  githubToken: string;
  githubUsername: string;
  repositoryName: string;
  branch: string;
}> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Firebase ID token not provided. Please authenticate.');
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    // Firebase ID Token 검증
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userId = decodedToken.uid;
    
    // Firestore에서 사용자 정보 조회
    const userDoc = await getFirestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found. Please login again.');
    }
    
    const userData = userDoc.data();
    const githubToken = userData?.githubToken;
    const githubUsername = userData?.githubUsername;
    const repositoryName = userData?.repositoryName;
    const branch = userData?.branch || 'main'; // 기본값 main
    
    if (!githubToken) {
      throw new Error('GitHub token not found. Please login with GitHub again.');
    }
    
    if (!githubUsername || !repositoryName) {
      throw new Error('Repository settings not found. Please configure in Settings page.');
    }
    
    return {
      githubToken,
      githubUsername,
      repositoryName,
      branch,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
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

      const userData = await getUserData(req);
      const repoPath = `${userData.githubUsername}/${userData.repositoryName}`;

      // 브랜치를 지정하여 커밋 가져오기
      const response = await fetch(`https://api.github.com/repos/${repoPath}/commits?sha=${userData.branch}&since=${since}&until=${until}`, {
        headers: {
          "Authorization": `Bearer ${userData.githubToken}`,
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

      const userData = await getUserData(req);
      const repoPath = `${userData.githubUsername}/${userData.repositoryName}`;

      const response = await fetch(`https://api.github.com/repos/${repoPath}/commits/${commit_sha}`, {
        headers: {
          "Authorization": `Bearer ${userData.githubToken}`,
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

      const userData = await getUserData(req);
      const repoPath = `${userData.githubUsername}/${userData.repositoryName}`;

      // 브랜치를 지정하여 파일 가져오기
      const response = await fetch(`https://api.github.com/repos/${repoPath}/contents/${filename}?ref=${userData.branch}`, {
        headers: {
          "Accept": "application/vnd.github.raw",
          "Authorization": `Bearer ${userData.githubToken}`,
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

/**
 * 사용자의 GitHub 리포지토리 목록 가져오기
 * Settings 페이지에서 리포지토리 선택을 위해 사용
 */
export const getRepositories = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Firebase ID token not provided. Please authenticate.' });
        return;
      }
      
      const idToken = authHeader.split('Bearer ')[1];
      
      // Firebase ID Token 검증
      const decodedToken = await getAuth().verifyIdToken(idToken);
      const userId = decodedToken.uid;
      
      // Firestore에서 GitHub 토큰 조회
      const userDoc = await getFirestore().collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found. Please login again.' });
        return;
      }
      
      const userData = userDoc.data();
      const githubToken = userData?.githubToken;
      
      if (!githubToken) {
        res.status(400).json({ error: 'GitHub token not found. Please login with GitHub again.' });
        return;
      }

      // GitHub API로 리포지토리 목록 가져오기
      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`GitHub API error: ${response.status}`, errorBody);
        res.status(response.status).json({ 
          error: 'Failed to fetch repositories from GitHub',
          details: errorBody 
        });
        return;
      }

      const repositories: Repository[] = await response.json();
      res.json(repositories);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      res.status(500).json({ 
        error: 'Failed to fetch repositories',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * 특정 리포지토리의 브랜치 목록 가져오기
 * Settings 페이지에서 브랜치 선택을 위해 사용
 */
export const getBranches = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      const { owner, repo } = req.query;
      
      if (!owner || !repo) {
        res.status(400).json({ error: 'owner and repo parameters are required' });
        return;
      }

      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Firebase ID token not provided. Please authenticate.' });
        return;
      }
      
      const idToken = authHeader.split('Bearer ')[1];
      
      // Firebase ID Token 검증
      const decodedToken = await getAuth().verifyIdToken(idToken);
      const userId = decodedToken.uid;
      
      // Firestore에서 GitHub 토큰 조회
      const userDoc = await getFirestore().collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        res.status(404).json({ error: 'User not found. Please login again.' });
        return;
      }
      
      const userData = userDoc.data();
      const githubToken = userData?.githubToken;
      
      if (!githubToken) {
        res.status(400).json({ error: 'GitHub token not found. Please login with GitHub again.' });
        return;
      }

      // GitHub API로 브랜치 목록 가져오기
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`GitHub API error: ${response.status}`, errorBody);
        res.status(response.status).json({ 
          error: 'Failed to fetch branches from GitHub',
          details: errorBody 
        });
        return;
      }

      const branches = await response.json();
      res.json(branches);
    } catch (error) {
      console.error('Error fetching branches:', error);
      res.status(500).json({ 
        error: 'Failed to fetch branches',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);