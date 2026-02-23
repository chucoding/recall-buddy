import React, { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, store } from './firebase';
import { trackScreen, trackEvent } from './analytics';
import FlashCardViewer from './pages/FlashCardViewer';
import PastDateReview from './pages/PastDateReview';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import NoDataView from './pages/NoDataView';
import Onboarding from './pages/Onboarding';
import Card from './components/Card';
import { useTodayFlashcards } from './hooks/useTodayFlashcards';
import { useNavigationStore } from './stores/navigationStore';
import { BookOpen, ArrowLeft, Settings, Clock } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isScrollAtTop, setIsScrollAtTop] = useState<boolean>(true);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean>(false);
  const [onboardingChecked, setOnboardingChecked] = useState<boolean>(false);
  const { currentPage, navigateToSettings, navigateToFlashcard, selectedPastDate, setCurrentPage } = useNavigationStore();

  // Stripe 결제 복귀 URL (#settings?subscription=success) 시 설정 페이지로 이동
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('subscription=success')) {
      setCurrentPage('settings');
    }
  }, [setCurrentPage]);
  
  // 오늘의 플래시카드 데이터 로드 (user가 null이면 로드하지 않음)
  const { loading, hasData } = useTodayFlashcards(user);

  /* 인증 상태 감지 */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 온보딩 필요 여부 확인
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setOnboardingChecked(true);
        return;
      }

      try {
        const userDocRef = doc(store, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        // 문서가 없거나, 온보딩 완료 표시가 없고 리포지토리 설정도 없으면 온보딩 필요
        if (!userDoc.exists()) {
          setNeedsOnboarding(true);
        } else {
          const data = userDoc.data();
          // onboardingCompleted가 true이거나 repositories가 있으면 온보딩 불필요
          if (data?.onboardingCompleted || (Array.isArray(data?.repositories) && data.repositories.length > 0)) {
            setNeedsOnboarding(false);
          } else {
            setNeedsOnboarding(true);
          }
        }
      } catch (error) {
        console.error('온보딩 확인 실패:', error);
        setNeedsOnboarding(false);
      } finally {
        setOnboardingChecked(true);
      }
    };

    checkOnboarding();
  }, [user]);

  // GA4 화면 추적 (퍼널 탐색용): 화면이 바뀔 때만 screen_view 전송
  const lastScreenRef = useRef<string | null>(null);
  useEffect(() => {
    let screen: string;
    if (!user) screen = 'login';
    else if (authLoading || !onboardingChecked || loading) screen = 'loading';
    else if (needsOnboarding) screen = 'onboarding';
    else if (!hasData && currentPage === 'flashcard') screen = 'no_data';
    else if (currentPage === 'flashcard') screen = 'flashcard';
    else if (currentPage === 'settings') screen = 'settings';
    else if (currentPage === 'pricing') screen = 'pricing';
    else return;

    if (lastScreenRef.current === screen) return;
    lastScreenRef.current = screen;

    trackScreen(screen, screen === 'flashcard' ? 'FlashCardViewer' : screen === 'settings' ? 'Settings' : undefined);
    if (screen === 'flashcard') trackEvent('view_flashcard');
    if (screen === 'settings') trackEvent('view_settings');
  }, [user, authLoading, onboardingChecked, loading, needsOnboarding, hasData, currentPage]);

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

  // 로그인되지 않은 경우
  if (!user) {
    return <Login />;
  }

  // 로딩 중 (인증, 온보딩 확인, 데이터 로딩)
  if (authLoading || !onboardingChecked || loading) {
    return (
      <>
        <Card>
          <div className="w-[50px] h-[50px] border-[3px] border-white/30 border-t-white rounded-full animate-spin mx-auto mb-5"></div>
          <h2 className="mb-2.5 text-xl flex items-center justify-center gap-2"><BookOpen className="w-6 h-6 shrink-0" aria-hidden />플래시카드 준비 중</h2>
          <p className="text-base">GitHub에서 최근 커밋을 분석하고 있습니다...</p>
          <p className="mt-2.5 text-[0.9rem] opacity-80 flex items-center justify-center gap-1.5"><Clock className="w-4 h-4 shrink-0" aria-hidden />데이터 양에 따라 시간이 조금 걸릴 수 있습니다</p>
        </Card>
      </>
    );
  }

  // 온보딩이 필요한 경우
  if (needsOnboarding) {
    return (
      <>
        <Onboarding
          onComplete={() => {
            window.location.reload();
          }}
        />
      </>
    );
  }

  // 데이터가 없는 경우 - Settings, Pricing 페이지는 허용
  if (!hasData && currentPage === 'flashcard') {
    return <NoDataView />;
  }

  // 메인 앱 렌더링
  return (
    <>
      <main>
        {/* 플로팅 navbar: transparent 영역은 pointer-events-none으로 아래 콘텐츠 클릭 통과, 버튼만 pointer-events-auto (ui-ux-pro-max: Content padding, Floating navbar) */}
        <nav className={`fixed top-4 left-4 right-4 max-[768px]:top-2 max-[768px]:left-2 max-[768px]:right-2 bg-transparent z-[1000] px-5 py-3 max-[768px]:py-2 max-[768px]:px-3 flex justify-between items-center transition-all duration-300 ease-in-out pointer-events-none ${isScrollAtTop ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}`}>
          <div className={isScrollAtTop ? 'pointer-events-auto' : 'pointer-events-none'}>
            {(currentPage === 'settings' || currentPage === 'pricing') && (
              <button
                onClick={currentPage === 'pricing' ? navigateToSettings : navigateToFlashcard}
                className="py-2 px-4 bg-surface/95 text-text border border-border rounded-lg cursor-pointer font-semibold transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.3)] flex items-center gap-1.5 backdrop-blur-sm hover:bg-surface-light hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
              >
                <ArrowLeft className="w-5 h-5 shrink-0" aria-hidden />
                뒤로가기
              </button>
            )}
          </div>

          {currentPage === 'flashcard' && (
            <div className={isScrollAtTop ? 'pointer-events-auto' : 'pointer-events-none'}>
              <button
                onClick={navigateToSettings}
                className="py-2 px-4 bg-surface/95 text-text border border-border rounded-lg cursor-pointer text-[1.2rem] transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.3)] backdrop-blur-sm hover:bg-surface-light hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                title="설정"
              >
                <Settings className="w-5 h-5" aria-hidden />
              </button>
            </div>
          )}
        </nav>

        {/* 뷰포트 높이로 제한해 패딩+콘텐츠가 100vh를 넘지 않게 (모바일 세로 스크롤 방지) */}
        <div className="pt-16 max-[768px]:pt-12 bg-bg h-screen flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            {currentPage === 'flashcard' && (selectedPastDate ? <PastDateReview date={selectedPastDate} /> : <FlashCardViewer />)}
            {currentPage === 'settings' && <Settings />}
            {currentPage === 'pricing' && <Pricing />}
          </div>
        </div>
      </main>
    </>
  );
};

export default App;
