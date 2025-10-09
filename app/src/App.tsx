import React, { useEffect, useState } from 'react';
import { initDB } from "react-indexed-db-hook";
import { onAuthStateChanged, User } from 'firebase/auth';

import { DBConfig } from './DBConfig';
import { auth } from './firebase';
import FlashCardViewer from './pages/FlashCardViewer';
import Login from './pages/Login';
import Settings from './pages/Settings';
import NoDataView from './pages/NoDataView';
import UserDropdown from './widgets/UserDropdown';
import { useTodayFlashcards } from './hooks/useTodayFlashcards';
import { useNavigationStore } from './stores/navigationStore';

initDB(DBConfig);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isScrollAtTop, setIsScrollAtTop] = useState<boolean>(true);
  const { currentPage, navigateToSettings, navigateToFlashcard } = useNavigationStore();
  
  // 오늘의 플래시카드 데이터 로드
  const { loading, hasData } = useTodayFlashcards(user);

  // 인증 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 스크롤 위치 감지
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const isAtTop = scrollTop <= 10; // 10px 이하면 맨 위로 간주
      setIsScrollAtTop(isAtTop);
    };

    // 초기 스크롤 위치 체크
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 인증 로딩 중
  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        로딩 중...
      </div>
    );
  }

  // 로그인되지 않은 경우
  if (!user) {
    return <Login />;
  }

  // 데이터 로딩 중
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '40px',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <h2 style={{ marginBottom: '10px' }}>📚 플래시카드 준비 중</h2>
          <p>GitHub에서 최근 커밋을 분석하고 있습니다...</p>
          <p style={{ marginTop: '10px', fontSize: '0.9rem', opacity: '0.8' }}>⏱️ 데이터 양에 따라 시간이 조금 걸릴 수 있습니다</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 데이터가 없는 경우 - 하지만 Settings 페이지는 허용
  if (!hasData && currentPage === 'flashcard') {
    return <NoDataView />;
  }

  // 메인 앱 렌더링
  return (
    <main>
      {/* 네비게이션 */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'transparent',
        zIndex: 1000,
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        opacity: isScrollAtTop ? 1 : 0,
        transform: isScrollAtTop ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        pointerEvents: isScrollAtTop ? 'auto' : 'none',
      }}>
        <div>
          {currentPage === 'settings' && (
            <button
              onClick={navigateToFlashcard}
              style={{
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#333',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
              }}
            >
              ← 뒤로가기
            </button>
          )}
        </div>
        
        <UserDropdown 
          user={user}
          onNavigateToSettings={navigateToSettings}
        />
      </nav>

      {/* 페이지 컨텐츠 */}
      <div>
        {currentPage === 'flashcard' && <FlashCardViewer />}
        {currentPage === 'settings' && <Settings />}
      </div>
    </main>
  );
};

export default App;
