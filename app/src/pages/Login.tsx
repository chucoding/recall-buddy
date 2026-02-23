import React, { useState } from 'react';
import { signInWithPopup, signOut, GithubAuthProvider } from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, githubProvider, store } from '../firebase';
import { trackEvent } from '../analytics';
import { getCurrentDate } from '../modules/utils';

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
          
          // 사용자 로컬 타임존 기준으로 "오늘"과 탈퇴일 비교 (getCurrentDate와 동일 기준)
          const todayStr = getCurrentDate();
          const deletedAt = new Date(deletedData.deletedAt);
          const deletedDateStr = deletedAt.toLocaleDateString('en-CA');
          
          console.log('탈퇴 기록 발견:', {
            deletedAt: deletedData.deletedAt,
            deletedDateStr,
            todayStr,
            email: deletedData.email
          });
          
          if (deletedDateStr === todayStr) {
            await signOut(auth);
            setError('회원탈퇴 후에는 다음날부터 재가입할 수 있습니다.');
            setLoading(false);
            return;
          } else {
            await deleteDoc(deletedUserDocRef);
          }
        }
      } catch (firestoreError) {
        console.error('Firestore 탈퇴 기록 확인 실패:', firestoreError);
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
      trackEvent('login', { method: 'github' });
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
      <div className="flex justify-center items-center min-h-screen bg-bg p-5 font-sans">
        <div className="bg-surface rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] p-10 max-w-[400px] w-full text-center animate-slide-up border border-border">
          <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text">로그인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-bg p-5 font-sans max-[480px]:p-4">
      <div className="bg-surface rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)] p-10 max-w-[400px] w-full text-center animate-slide-up border border-border max-[480px]:p-6">
        <div className="mb-6 flex justify-center">
          <a href="/" className="inline-block" aria-label="CodeRecall 홈">
            <img src="/logo.png" alt="CodeRecall" className="h-14 w-auto max-[480px]:h-11 transition-opacity duration-200 hover:opacity-90" />
          </a>
        </div>
        <div className="mb-8">
          <p className="text-text-body text-[1.1rem] leading-relaxed font-sans font-medium max-[480px]:text-base">GitHub에 남긴 학습 기록을<br />플래시카드로 복습하세요</p>
        </div>
        
        {error && (
          <div className="bg-error-bg text-error-text px-4 py-3 rounded-lg mb-6 text-[0.9rem] border border-error/30">
            {error}
          </div>
        )}

        <button 
          onClick={handleGitHubLogin}
          className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-primary text-bg border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 mb-6 hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(7,166,107,0.3)] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none max-[480px]:py-3.5 max-[480px]:px-5 max-[480px]:text-[0.9rem]"
          disabled={loading}
        >
          GitHub로 로그인
        </button>

        <div className="text-center">
          <p className="text-text-muted text-[0.8rem] m-0 leading-snug">로그인하면 GitHub의 공개 정보에 접근할 수 있습니다</p>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-text-muted no-underline text-[0.8rem] transition-colors duration-200 hover:text-primary hover:underline">이용약관</a>
          {' · '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-text-muted no-underline text-[0.8rem] transition-colors duration-200 hover:text-primary hover:underline">개인정보처리방침</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
