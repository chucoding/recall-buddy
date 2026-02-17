import React, { useState, useEffect, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, store } from '../firebase';
import { getRepositories } from '../api/github-api';
import { Repository } from '../types';

interface OnboardingProps {
  onComplete: () => void;
}

interface RepositorySettings {
  repositoryFullName: string;
  repositoryUrl: string;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(1);
  const [settings, setSettings] = useState<RepositorySettings>({
    repositoryFullName: '',
    repositoryUrl: '',
  });
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [error, setError] = useState<{ type: 'repos' | 'save'; message: string } | null>(null);

  // 리포지토리 목록 가져오기
  const fetchRepositories = useCallback(async () => {
    try {
      setLoadingRepos(true);
      setError(null);
      const repos = await getRepositories();
      setRepositories(repos);
      setLoadingRepos(false);
    } catch (error: any) {
      console.error('리포지토리 불러오기 실패:', error);
      const errorMessage = error?.response?.status === 401 || error?.response?.status === 403
        ? 'GitHub 접근 권한이 없습니다. 다시 로그인해주세요.'
        : 'GitHub 리포지토리를 불러오는데 실패했습니다.';
      
      setError({
        type: 'repos',
        message: errorMessage
      });
      setLoadingRepos(false);
    }
  }, []);

  // Step 2에 진입하면 리포지토리 목록 로드
  useEffect(() => {
    if (step === 2 && repositories.length === 0) {
      fetchRepositories();
    }
  }, [step, repositories.length, fetchRepositories]);

  const handleRepositorySelect = (repo: Repository) => {
    setSettings({
      repositoryFullName: repo.full_name,
      repositoryUrl: repo.html_url,
    });
    setIsDropdownOpen(false);
  };

  const handleSaveSettings = async () => {
    if (!auth.currentUser) return;
    if (!settings.repositoryFullName) {
      setError({
        type: 'save',
        message: '리포지토리를 선택해주세요.'
      });
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const userDocRef = doc(store, 'users', auth.currentUser.uid);
      await setDoc(userDocRef, {
        repositoryFullName: settings.repositoryFullName,
        repositoryUrl: settings.repositoryUrl,
        onboardingCompleted: true,
        onboardingSkipped: false,
        updatedAt: new Date(),
      }, { merge: true });

      // Step 3으로 이동
      setStep(3);
      
      // 2초 후 온보딩 완료
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error: any) {
      console.error('설정 저장 실패:', error);
      setError({
        type: 'save',
        message: error?.message || '설정 저장에 실패했습니다. 네트워크 연결을 확인해주세요.'
      });
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      handleSaveSettings();
    }
  };

  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) return !!settings.repositoryFullName;
    return false;
  };

  const handleSkipOnboarding = async () => {
    if (!window.confirm('온보딩을 건너뛰시겠습니까? 나중에 설정 페이지에서 리포지토리를 설정할 수 있습니다.')) {
      return;
    }

    try {
      if (!auth.currentUser) return;
      
      // 온보딩을 건너뛰었다는 표시를 Firestore에 저장
      const userDocRef = doc(store, 'users', auth.currentUser.uid);
      await setDoc(userDocRef, {
        onboardingCompleted: true,
        onboardingSkipped: true,
        updatedAt: new Date(),
      }, { merge: true });

      onComplete();
    } catch (error) {
      console.error('온보딩 스킵 저장 실패:', error);
      // 에러가 나도 일단 진행
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex items-center justify-center z-[9999] p-5 overflow-y-auto">
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-primary to-primary-dark animate-[gradientShift_10s_ease-in-out_infinite]"></div>
      
      <div className="relative bg-white rounded-3xl pt-12 px-10 pb-10 max-w-[560px] w-full max-h-[calc(100vh-40px)] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-slide-up m-auto max-[640px]:pt-10 max-[640px]:px-6 max-[640px]:pb-8 max-[640px]:mx-4">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary/10 rounded-t-3xl overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary-dark transition-[width] duration-[400ms] ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>

        {/* Step 1: 환영 */}
        {step === 1 && (
          <div className="text-center animate-fade-in">
            <div className="flex justify-center">
              <img 
                src="/onboarding.png" 
                alt="CodeRecall 캐릭터" 
                className="w-40 max-w-full h-auto object-contain max-[640px]:w-[140px]"
              />
            </div>
            <h1 className="text-3xl font-bold text-text-dark mb-4 m-0 max-[640px]:text-[28px]">환영합니다!</h1>
            <p className="text-base text-text-light leading-relaxed mb-8 m-0 [&_strong]:text-primary [&_strong]:font-semibold max-[640px]:text-sm">
              <strong>CodeRecall</strong>가 여러분의 학습을<br />
              소중한 장기 기억으로 만들어드립니다
            </p>
            
            <div className="my-8 text-left">
              <div className="flex items-center gap-3 p-4 bg-surface rounded-xl mb-3 transition-all duration-300 ease-out hover:bg-[#edf2f7] hover:translate-x-1">
                <span className="text-2xl shrink-0">🔄</span>
                <span className="text-sm text-text-body font-medium max-[640px]:text-[13px]">1일, 7일, 30일 전 커밋 자동 분석</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-surface rounded-xl mb-3 transition-all duration-300 ease-out hover:bg-[#edf2f7] hover:translate-x-1">
                <span className="text-2xl shrink-0">💡</span>
                <span className="text-sm text-text-body font-medium max-[640px]:text-[13px]">AI가 핵심 내용을 질문으로 변환</span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-surface rounded-xl mb-3 transition-all duration-300 ease-out hover:bg-[#edf2f7] hover:translate-x-1">
                <span className="text-2xl shrink-0">📱</span>
                <span className="text-sm text-text-body font-medium max-[640px]:text-[13px]">매일 아침 푸시 알림으로 학습</span>
              </div>
            </div>

            <button 
              className="w-full py-3.5 px-8 border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-300 bg-gradient-to-br from-primary to-primary-dark text-white shadow-[0_4px_15px_rgba(102,126,234,0.4)] mb-3 hover:enabled:-translate-y-0.5 hover:enabled:shadow-[0_6px_20px_rgba(102,126,234,0.5)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              onClick={handleNext}
            >
              시작하기 →
            </button>
          </div>
        )}

        {/* Step 2: 리포지토리 선택 */}
        {step === 2 && (
          <div className="text-center animate-fade-in">
            <div className="text-6xl mb-6 max-[640px]:text-5xl max-[640px]:mb-6">⚙️</div>
            <h1 className="text-3xl font-bold text-text-dark mb-4 m-0 max-[640px]:text-[28px]">리포지토리 선택</h1>
            <p className="text-base text-text-light leading-relaxed mb-8 m-0 max-[640px]:text-sm">
              학습하고 싶은 GitHub 리포지토리를 선택해주세요
            </p>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-error-bg border-2 border-error-light rounded-xl p-4 mb-6 flex gap-3 items-start animate-[errorSlide_0.3s_ease-out]">
                <span className="text-2xl shrink-0">⚠️</span>
                <div className="flex-1">
                  <p className="text-error-text text-sm leading-relaxed mb-4 font-medium m-0">{error.message}</p>
                  <div className="flex gap-2 flex-wrap">
                    <button 
                      className="flex-1 min-w-[150px] py-2.5 px-4 border-2 border-border rounded-lg text-[13px] font-semibold cursor-pointer transition-all duration-200 bg-white text-text-light hover:bg-surface hover:border-border-medium hover:text-text-body"
                      onClick={handleSkipOnboarding}
                    >
                      ⏭️ 나중에 설정하기
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="my-8 text-left">
              {/* 리포지토리 선택 */}
              <div>
                <label className="block text-sm font-semibold text-text-dark mb-2">
                  리포지토리 *
                  {loadingRepos && <span className="font-normal text-primary text-xs"> (로딩 중...)</span>}
                </label>
                <div className="relative w-full">
                  <button
                    className="w-full p-3 px-4 bg-white border-2 border-border rounded-xl text-sm text-left cursor-pointer transition-all duration-200 flex justify-between items-center hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={loadingRepos}
                  >
                    <span className={settings.repositoryFullName ? "" : "text-text-muted"}>
                      {settings.repositoryFullName || "리포지토리를 선택하세요"}
                    </span>
                    <span className="text-xs text-text-light transition-transform duration-200">▼</span>
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border-2 border-border rounded-xl max-h-[200px] overflow-y-auto shadow-[0_10px_25px_rgba(0,0,0,0.1)] z-[100] animate-[dropdownSlide_0.2s_ease-out]">
                      {repositories.length === 0 ? (
                        <div className="p-3 px-4 cursor-not-allowed text-sm text-text-muted hover:bg-transparent">
                          리포지토리가 없습니다
                        </div>
                      ) : (
                        repositories.map((repo) => (
                          <div
                            key={repo.id}
                            className="p-3 px-4 cursor-pointer transition-colors duration-200 text-sm hover:bg-surface"
                            onClick={() => handleRepositorySelect(repo)}
                          >
                            <div className="font-semibold text-text-dark mb-1">{repo.full_name}</div>
                            {repo.description && (
                              <div className="text-xs text-text-light overflow-hidden text-ellipsis whitespace-nowrap">{repo.description}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button 
              className="w-full py-3.5 px-8 border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-300 bg-gradient-to-br from-primary to-primary-dark text-white shadow-[0_4px_15px_rgba(102,126,234,0.4)] mb-3 hover:enabled:-translate-y-0.5 hover:enabled:shadow-[0_6px_20px_rgba(102,126,234,0.5)] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              onClick={handleNext}
              disabled={!canProceed() || saving}
            >
              {saving ? '저장 중...' : '완료하기 →'}
            </button>

            <button 
              className="w-full py-3.5 px-8 bg-white text-text-light border-2 border-border rounded-xl text-base font-semibold cursor-pointer transition-all duration-300 hover:enabled:bg-surface hover:enabled:border-border-medium hover:enabled:text-text-body disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSkipOnboarding}
              disabled={saving}
            >
              나중에 설정하기
            </button>
          </div>
        )}

        {/* Step 3: 완료 */}
        {step === 3 && (
          <div className="text-center animate-fade-in">
            <div className="text-6xl mb-6 animate-[successPulse_0.6s_ease-out] max-[640px]:text-5xl">✨</div>
            <h1 className="text-3xl font-bold text-text-dark mb-4 m-0 max-[640px]:text-[28px]">준비 완료!</h1>
            <p className="text-base text-text-light leading-relaxed mb-8 m-0 max-[640px]:text-sm">
              플래시카드를 생성하고 있습니다...<br />
              잠시만 기다려주세요
            </p>
            
            <div className="w-[60px] h-[60px] border-4 border-primary/20 border-t-primary rounded-full animate-spin mt-8 mx-auto"></div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex justify-center gap-2 mt-8">
          <div className={`h-2 rounded-full transition-all duration-300 ${step >= 1 ? 'w-6 rounded bg-gradient-to-br from-primary to-primary-dark' : 'w-2 bg-border'}`}></div>
          <div className={`h-2 rounded-full transition-all duration-300 ${step >= 2 ? 'w-6 rounded bg-gradient-to-br from-primary to-primary-dark' : 'w-2 bg-border'}`}></div>
          <div className={`h-2 rounded-full transition-all duration-300 ${step >= 3 ? 'w-6 rounded bg-gradient-to-br from-primary to-primary-dark' : 'w-2 bg-border'}`}></div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
