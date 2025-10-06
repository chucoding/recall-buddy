import React, { useEffect, useState } from 'react';
import { initDB, useIndexedDB } from "react-indexed-db-hook";
import { onAuthStateChanged, User } from 'firebase/auth';

import { DBConfig } from './DBConfig';
import { auth } from './firebase';
import { chatCompletions } from './api/ncloud-api';
import { getCurrentDate } from './modules/utils';
import FlashCardViewer from './pages/FlashCardViewer';
import Login from './pages/Login';
import { getGithubData } from './services/github-service';

initDB(DBConfig);
const dates = [1, 7, 30]; // days ago list

const App: React.FC = () => {
  const { add, getByID } = useIndexedDB("data");
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

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
       <FlashCardViewer />
    </main>
  );
};

export default App;
