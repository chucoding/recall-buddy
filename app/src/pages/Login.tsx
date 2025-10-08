import React, { useState } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, User, GithubAuthProvider } from 'firebase/auth';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, githubProvider, db } from '../firebase';
import './Login.css';

const Login: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // 인증 상태 변경 감지
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // GitHub 로그인 함수
  const handleGitHubLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await signInWithPopup(auth, githubProvider);
      
      // GitHub OAuth 토큰을 Firestore에 저장
      // Google의 at-rest encryption으로 자동 암호화됨
      const credential = GithubAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken && result.user) {
        await setDoc(doc(db, 'users', result.user.uid), {
          githubToken: credential.accessToken,
          updatedAt: new Date().toISOString(),
        });
        console.log('로그인 성공 및 GitHub 토큰 저장 완료');
      }
      
      console.log('로그인 성공:', result.user);
    } catch (error: any) {
      console.error('로그인 실패:', error);
      setError('로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃 함수
  const handleLogout = async () => {
    try {
      const currentUser = auth.currentUser;
      await signOut(auth);
      if (currentUser) {
        await deleteDoc(doc(db, 'users', currentUser.uid));
      }
      console.log('로그아웃 성공');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="loading-spinner"></div>
          <p>로그인 중...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="user-info">
            <img 
              src={user.photoURL || ''} 
              alt="프로필" 
              className="profile-image"
            />
            <h2>안녕하세요, {user.displayName || user.email}님!</h2>
            <p className="user-email">{user.email}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="logout-button"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Today I Learned</h1>
          <p>GitHub 계정으로 로그인하여 학습을 시작하세요</p>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button 
          onClick={handleGitHubLogin}
          className="github-login-button"
          disabled={loading}
        >
          <svg 
            className="github-icon" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub로 로그인
        </button>

        <div className="login-footer">
          <p>로그인하면 GitHub의 공개 정보에 접근할 수 있습니다</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
