import React, { useState, useEffect, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { auth, store } from '../firebase';
import { getRepositories } from '../api/github-api';
import { Repository } from '../types';
import './Onboarding.css';

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
    <div className="onboarding-container">
      <div className="onboarding-background"></div>
      
      <div className="onboarding-card">
        {/* Progress Bar */}
        <div className="onboarding-progress">
          <div 
            className="onboarding-progress-bar" 
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>

        {/* Step 1: 환영 */}
        {step === 1 && (
          <div className="onboarding-step onboarding-step-1">
            <div className="onboarding-character">
              <img 
                src="/onboarding.png" 
                alt="RecallBuddy 캐릭터" 
                className="character-image"
              />
            </div>
            <h1 className="onboarding-title">환영합니다!</h1>
            <p className="onboarding-description">
              <strong>RecallBuddy</strong>가 여러분의 학습을<br />
              소중한 장기 기억으로 만들어드립니다
            </p>
            
            <div className="onboarding-features">
              <div className="onboarding-feature">
                <span className="feature-icon">🔄</span>
                <span className="feature-text">1일, 7일, 30일 전 커밋 자동 분석</span>
              </div>
              <div className="onboarding-feature">
                <span className="feature-icon">💡</span>
                <span className="feature-text">AI가 핵심 내용을 질문으로 변환</span>
              </div>
              <div className="onboarding-feature">
                <span className="feature-icon">📱</span>
                <span className="feature-text">매일 아침 푸시 알림으로 학습</span>
              </div>
            </div>

            <button 
              className="onboarding-button onboarding-button-primary"
              onClick={handleNext}
            >
              시작하기 →
            </button>
          </div>
        )}

        {/* Step 2: 리포지토리 선택 */}
        {step === 2 && (
          <div className="onboarding-step onboarding-step-2">
            <div className="onboarding-icon">⚙️</div>
            <h1 className="onboarding-title">리포지토리 선택</h1>
            <p className="onboarding-description">
              학습하고 싶은 GitHub 리포지토리를 선택해주세요
            </p>

            {/* 에러 메시지 */}
            {error && (
              <div className="onboarding-error">
                <span className="error-icon">⚠️</span>
                <div className="error-content">
                  <p className="error-message">{error.message}</p>
                  <div className="error-actions">
                    <button 
                      className="error-action-button error-skip-button"
                      onClick={handleSkipOnboarding}
                    >
                      ⏭️ 나중에 설정하기
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="onboarding-form">
              {/* 리포지토리 선택 */}
              <div className="form-group">
                <label className="form-label">
                  리포지토리 *
                  {loadingRepos && <span className="form-loading"> (로딩 중...)</span>}
                </label>
                <div className="custom-dropdown">
                  <button
                    className="dropdown-button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={loadingRepos}
                  >
                    <span className={settings.repositoryFullName ? "" : "placeholder"}>
                      {settings.repositoryFullName || "리포지토리를 선택하세요"}
                    </span>
                    <span className="dropdown-arrow">▼</span>
                  </button>
                  
                  {isDropdownOpen && (
                    <div className="dropdown-menu">
                      {repositories.length === 0 ? (
                        <div className="dropdown-item disabled">
                          리포지토리가 없습니다
                        </div>
                      ) : (
                        repositories.map((repo) => (
                          <div
                            key={repo.id}
                            className="dropdown-item"
                            onClick={() => handleRepositorySelect(repo)}
                          >
                            <div className="repo-name">{repo.full_name}</div>
                            {repo.description && (
                              <div className="repo-description">{repo.description}</div>
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
              className="onboarding-button onboarding-button-primary"
              onClick={handleNext}
              disabled={!canProceed() || saving}
            >
              {saving ? '저장 중...' : '완료하기 →'}
            </button>

            <button 
              className="onboarding-button onboarding-button-secondary"
              onClick={handleSkipOnboarding}
              disabled={saving}
            >
              나중에 설정하기
            </button>
          </div>
        )}

        {/* Step 3: 완료 */}
        {step === 3 && (
          <div className="onboarding-step onboarding-step-3">
            <div className="onboarding-icon onboarding-icon-success">✨</div>
            <h1 className="onboarding-title">준비 완료!</h1>
            <p className="onboarding-description">
              플래시카드를 생성하고 있습니다...<br />
              잠시만 기다려주세요
            </p>
            
            <div className="onboarding-spinner"></div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="onboarding-steps-indicator">
          <div className={`step-dot ${step >= 1 ? 'active' : ''}`}></div>
          <div className={`step-dot ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`step-dot ${step >= 3 ? 'active' : ''}`}></div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
