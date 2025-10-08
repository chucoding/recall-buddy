import React, { useEffect, useState } from 'react';
import { initDB, useIndexedDB } from "react-indexed-db-hook";
import { onAuthStateChanged, User } from 'firebase/auth';

import { DBConfig } from './DBConfig';
import { auth } from './firebase';
import { chatCompletions } from './api/ncloud-api';
import { getCurrentDate } from './modules/utils';
import FlashCardViewer from './pages/FlashCardViewer';
import Login from './pages/Login';
import Settings from './pages/Settings';
import { getGithubData } from './services/github-service';
import UserDropdown from './widgets/UserDropdown';

initDB(DBConfig);
const dates = [1, 7, 30]; // days ago list

type Page = 'flashcard' | 'settings';

const App: React.FC = () => {
  const { add, getByID } = useIndexedDB("data");
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<Page>('flashcard');
  const [isScrollAtTop, setIsScrollAtTop] = useState<boolean>(true);

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

  // 사용자가 로그인한 경우에만 데이터 로드
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    (async () => {
      const todayData = await getByID(getCurrentDate());
      if (todayData) {
        setLoading(false);
        return;
      }

      let list: Array<{question: string, answer: string}> = [];
      for (const ago of dates) {
        try {
          const githubData = await getGithubData(ago);
          if (githubData) {
            const result = await chatCompletions(githubData);
            const questions = JSON.parse(result.body.result.message.content);
            for (let ncloudData of questions) {
              list.push({question: ncloudData, answer: githubData});
            }
          }
        } catch (error) {
          console.error(`Error fetching data for ${ago}:`, error);
        }
      }
      
      if (list.length > 0) {
        add({date: getCurrentDate(), data: list });
      }
      setLoading(false);
    })();
  }, [add, getByID, user]);

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
        fontSize: '1.2rem'
      }}>
        데이터를 불러오는 중...
      </div>
    );
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
              onClick={() => setCurrentPage('flashcard')}
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
          onNavigateToSettings={() => setCurrentPage('settings')}
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
