import React, { useState } from 'react';
import { signInWithPopup, signOut, GithubAuthProvider } from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, githubProvider, store } from '../firebase';
import TermsLinks from '../widgets/TermsLinks';
import './Login.css';

const Login: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // GitHub 로그인 함수
  const handleGitHubLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await signInWithPopup(auth, githubProvider);
      
      // 탈퇴 기록 확인
      const deletedUserDocRef = doc(store, 'deletedUsers', result.user.uid);
      
      try {
        const deletedUserDoc = await getDoc(deletedUserDocRef);
        
        if (deletedUserDoc.exists()) {
          const deletedData = deletedUserDoc.data();
          
          // 한국 시간 기준으로 날짜 비교
          const now = new Date();
          const kstOffset = 9 * 60; // KST = UTC+9
          const kstNow = new Date(now.getTime() + kstOffset * 60 * 1000);
          const deletedAt = new Date(deletedData.deletedAt);
          const kstDeletedAt = new Date(deletedAt.getTime() + kstOffset * 60 * 1000);
          
          // 오늘 날짜와 탈퇴 날짜 비교 (YYYY-MM-DD 형식)
          const todayKST = kstNow.toISOString().split('T')[0];
          const deletedDateKST = kstDeletedAt.toISOString().split('T')[0];
          
          console.log('⚠️ 탈퇴 기록 발견:', {
            deletedAt: deletedData.deletedAt,
            deletedDateKST,
            todayKST,
            email: deletedData.email
          });
          
          if (deletedDateKST === todayKST) {
            await signOut(auth);
            setError('회원탈퇴 후에는 다음날부터 재가입할 수 있습니다.');
            setLoading(false);
            return;
          } else {
            await deleteDoc(deletedUserDocRef);
          }
        } else {
        }
      } catch (firestoreError) {
        console.error('❌ Firestore 탈퇴 기록 확인 실패:', firestoreError);
        // Firestore 오류가 있어도 로그인은 계속 진행
        // 보안상 문제가 있을 수 있으므로 관리자에게 알림 필요
      }
      
      // 2. GitHub OAuth 토큰을 Firestore에 저장
      // Google의 at-rest encryption으로 자동 암호화됨
      const credential = GithubAuthProvider.credentialFromResult(result);
      if (credential && credential.accessToken && result.user) {
        const userDocRef = doc(store, 'users', result.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          // 기존 문서가 있으면 토큰만 업데이트 (설정 유지)
          await updateDoc(userDocRef, {
            githubToken: credential.accessToken,
            updatedAt: new Date().toISOString(),
          });
        } else {
          // 신규 사용자는 새 문서 생성
          await setDoc(userDocRef, {
            githubToken: credential.accessToken,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setError('로그인이 취소되었습니다.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
      } else {
        setError('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
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

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>RecallBuddy</h1>
        </div>
        <div className="character-image-container">
          <img 
            src="/character.png" 
            alt="친근한 캐릭터" 
            className="character-image"
          />
        </div>
        <div className="login-description">
          <p>이제 GitHub에 남긴 학습 기록을<br />RecallBuddy를 통해 오래 기억하세요🍀</p>
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
          <img src="/github-mark-white.svg" alt="GitHub Logo" className="github-icon" />
          GitHub로 로그인
        </button>

        <div className="login-footer">
          <p>로그인하면 GitHub의 공개 정보에 접근할 수 있습니다</p>
          <TermsLinks />
        </div>
      </div>
    </div>
  );
};

export default Login;
