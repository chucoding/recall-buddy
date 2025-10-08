import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { getRepositories } from '../api/github-api';
import { Repository } from '@til-alarm/shared';
import './Settings.css';

interface RepositorySettings {
  repositoryFullName: string;
  repositoryUrl: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<RepositorySettings>({
    repositoryFullName: '',
    repositoryUrl: '',
  });
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // GitHub 리포지토리 목록 불러오기 (Firebase Functions를 통해)
  const fetchRepositories = useCallback(async () => {
    try {
      setLoadingRepos(true);
      const repos = await getRepositories();
      setRepositories(repos);
    } catch (error) {
      console.error('리포지토리 불러오기 실패:', error);
      setMessage({ type: 'error', text: '리포지토리 목록을 불러오는데 실패했습니다.' });
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  // 설정 및 리포지토리 목록 불러오기
  useEffect(() => {
    const loadSettings = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          
          // 저장된 설정 불러오기
          setSettings({
            repositoryFullName: data.repositoryFullName || '',
            repositoryUrl: data.repositoryUrl || '',
          });
        }

        // Firebase Functions를 통해 리포지토리 목록 불러오기
        await fetchRepositories();
      } catch (error) {
        console.error('설정 불러오기 실패:', error);
        setMessage({ type: 'error', text: '설정을 불러오는데 실패했습니다.' });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [fetchRepositories]);

  // 설정 저장
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    
    if (!user) {
      setMessage({ type: 'error', text: '로그인이 필요합니다.' });
      return;
    }

    if (!settings.repositoryFullName) {
      setMessage({ type: 'error', text: '리포지토리를 선택해주세요.' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      // 기존 데이터 유지하면서 업데이트
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const existingData = userDoc.exists() ? userDoc.data() : {};

      // full_name에서 username과 repository 분리
      const [githubUsername, repositoryName] = settings.repositoryFullName.split('/');

      await setDoc(doc(db, 'users', user.uid), {
        ...existingData,
        repositoryFullName: settings.repositoryFullName,
        repositoryUrl: settings.repositoryUrl,
        githubUsername,
        repositoryName,
        updatedAt: new Date().toISOString(),
      });

      setMessage({ type: 'success', text: '설정이 저장되었습니다!' });
    } catch (error) {
      console.error('설정 저장 실패:', error);
      setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  // 리포지토리 선택 핸들러
  const handleRepositorySelect = (repo: Repository) => {
    setSettings({
      repositoryFullName: repo.full_name,
      repositoryUrl: repo.html_url,
    });
    setIsDropdownOpen(false);
  };

  // 선택된 리포지토리 찾기
  const selectedRepo = repositories.find(repo => repo.full_name === settings.repositoryFullName);

  if (loading) {
    return (
      <div className="settings-container">
        <div className="settings-card">
          <div className="loading-spinner"></div>
          <p>설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="settings-card">
        <div className="settings-header">
          <h1>⚙️ 리포지토리 설정</h1>
          <p>학습 내용을 가져올 GitHub 리포지토리를 선택하세요</p>
        </div>

        <form onSubmit={handleSave} className="settings-form">
          <div className="form-group">
            <label htmlFor="repository">
              GitHub 리포지토리
              <span className="required">*</span>
            </label>
            
            {loadingRepos ? (
              <div className="loading-repos">
                <div className="loading-spinner-small"></div>
                <span>리포지토리 목록을 불러오는 중...</span>
              </div>
            ) : (
              <div className="custom-select-container" ref={dropdownRef}>
                <button
                  type="button"
                  className={`custom-select-trigger ${isDropdownOpen ? 'open' : ''}`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={repositories.length === 0}
                >
                  {selectedRepo ? (
                    <div className="selected-repo">
                      <span className="repo-name">{selectedRepo.full_name}</span>
                      <span className="repo-badge">{selectedRepo.private ? '🔒 Private' : '🌐 Public'}</span>
          </div>
                  ) : (
                    <span className="placeholder">리포지토리를 선택하세요</span>
                  )}
                  <span className="dropdown-arrow">{isDropdownOpen ? '▲' : '▼'}</span>
                </button>

                {isDropdownOpen && (
                  <div className="custom-select-dropdown">
                    {repositories.map((repo) => (
                      <div
                        key={repo.id}
                        className={`custom-select-option ${settings.repositoryFullName === repo.full_name ? 'selected' : ''}`}
                        onClick={() => handleRepositorySelect(repo)}
                      >
                        <div className="option-header">
                          <span className="option-name">{repo.full_name}</span>
                          <span className="option-badge">{repo.private ? '🔒' : '🌐'}</span>
                        </div>
                        {repo.description && (
                          <div className="option-description">{repo.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <p className="form-hint">
              {repositories.length > 0 
                ? `총 ${repositories.length}개의 리포지토리를 찾았습니다`
                : '접근 가능한 리포지토리가 없습니다'}
            </p>
          </div>

          {settings.repositoryFullName && (
          <div className="form-preview">
              <p className="preview-label">📂 선택된 리포지토리:</p>
            <code className="preview-path">
                <a 
                  href={settings.repositoryUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="repo-link"
                >
                  {settings.repositoryUrl}
                </a>
            </code>
          </div>
          )}

          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            className="save-button"
            disabled={saving || !settings.repositoryFullName}
          >
            {saving ? '저장 중...' : '💾 설정 저장'}
          </button>
        </form>

        <div className="settings-footer">
          <p className="info-text">
            ℹ️ GitHub OAuth로 로그인하여 접근 가능한 모든 리포지토리가 표시됩니다.
          </p>
          <p className="info-text">
            🔒 = Private 리포지토리, 🌐 = Public 리포지토리
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;

