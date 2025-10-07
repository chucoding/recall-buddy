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

initDB(DBConfig);
const dates = [1, 7, 30]; // days ago list

type Page = 'flashcard' | 'settings';

const App: React.FC = () => {
  const { add, getByID } = useIndexedDB("data");
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<Page>('flashcard');

  // 인증 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
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
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setCurrentPage('flashcard')}
            style={{
              padding: '8px 16px',
              background: currentPage === 'flashcard' ? '#667eea' : 'transparent',
              color: currentPage === 'flashcard' ? 'white' : '#667eea',
              border: '2px solid #667eea',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            📚 학습하기
          </button>
          <button
            onClick={() => setCurrentPage('settings')}
            style={{
              padding: '8px 16px',
              background: currentPage === 'settings' ? '#667eea' : 'transparent',
              color: currentPage === 'settings' ? 'white' : '#667eea',
              border: '2px solid #667eea',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
          >
            ⚙️ 설정
          </button>
        </div>
        
        <div style={{ fontSize: '0.9rem', color: '#666' }}>
          👤 {user.displayName || user.email}
        </div>
      </nav>

      {/* 페이지 컨텐츠 */}
      <div style={{ paddingTop: '60px' }}>
        {currentPage === 'flashcard' && <FlashCardViewer />}
        {currentPage === 'settings' && <Settings />}
      </div>
    </main>
  );
};

export default App;
