import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { reauthenticateWithPopup } from 'firebase/auth';
import { useIndexedDB } from 'react-indexed-db-hook';
import { auth, db, githubProvider } from '../firebase';
import { getRepositories, getBranches, Branch } from '../api/github-api';
import { Repository } from '@til-alarm/shared';
import { useNavigationStore } from '../stores/navigationStore';
import './Settings.css';

interface RepositorySettings {
  repositoryFullName: string;
  repositoryUrl: string;
  branch: string;
}

// 캐시 설정 (컴포넌트 외부로 이동)
const CACHE_KEY = 'github_repositories';
const getBranchCacheKey = (owner: string, repo: string) => `github_branches_${owner}_${repo}`;

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<RepositorySettings>({
    repositoryFullName: '',
    repositoryUrl: '',
    branch: 'main',
  });
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [deleting, setDeleting] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // IndexedDB 훅
  const repositoriesDB = useIndexedDB('repositories');
  const flashcardsDB = useIndexedDB('data'); // 플래시카드 데이터 스토어
  const { triggerFlashcardReload } = useNavigationStore();
  
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

  // GitHub 리포지토리 목록 불러오기 (IndexedDB 캐싱)
  const fetchRepositories = useCallback(async (forceRefresh = false) => {
    try {
      setLoadingRepos(true);

      // 캐시 확인 (수동 새로고침이 아닌 경우)
      if (!forceRefresh) {
        try {
          const cached = await repositoriesDB.getByID(CACHE_KEY);
          if (cached) {
            const now = Date.now();
            const cacheAge = now - cached.timestamp;
            console.log(`✅ 캐시된 리포지토리 목록 사용 (IndexedDB) - ${Math.floor(cacheAge / 1000 / 60)}분 전 캐시`);
            setRepositories(cached.data);
            setLoadingRepos(false);
            return;
          } else {
            console.log('📭 캐시 없음 - API 호출');
          }
        } catch (cacheError) {
          console.error('❌ 캐시 읽기 실패:', cacheError);
        }
      } else {
        console.log('🔄 수동 새로고침 - API 호출');
      }

      // API 호출
      console.log('🌐 API에서 리포지토리 목록 불러오기...');
      const repos = await getRepositories();
      setRepositories(repos);

      // IndexedDB에 캐시 저장
      try {
        const cacheData = {
          id: CACHE_KEY,
          data: repos,
          timestamp: Date.now(),
        };

        // 기존 캐시 확인
        const existing = await repositoriesDB.getByID(CACHE_KEY);
        if (existing) {
          await repositoriesDB.update(cacheData);
        } else {
          await repositoriesDB.add(cacheData);
        }
        console.log('💾 리포지토리 목록 캐시 저장 완료 (IndexedDB)');
      } catch (saveError) {
        console.error('❌ 캐시 저장 실패:', saveError);
      }
    } catch (error) {
      console.error('❌ 리포지토리 불러오기 실패:', error);
      setMessage({ type: 'error', text: '리포지토리 목록을 불러오는데 실패했습니다.' });
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  // 브랜치 목록 불러오기 (IndexedDB 캐싱)
  const fetchBranches = useCallback(async (owner: string, repo: string, forceRefresh = false) => {
    try {
      setLoadingBranches(true);
      const cacheKey = getBranchCacheKey(owner, repo);

      // 캐시 확인 (수동 새로고침이 아닌 경우)
      if (!forceRefresh) {
        try {
          const cached = await repositoriesDB.getByID(cacheKey);
          if (cached) {
            const now = Date.now();
            const cacheAge = now - cached.timestamp;
            console.log(`✅ 캐시된 브랜치 목록 사용 (IndexedDB) - ${Math.floor(cacheAge / 1000 / 60)}분 전 캐시`);
            setBranches(cached.data);
            setLoadingBranches(false);
            return;
          } else {
            console.log('📭 브랜치 캐시 없음 - API 호출');
          }
        } catch (cacheError) {
          console.error('❌ 브랜치 캐시 읽기 실패:', cacheError);
        }
      } else {
        console.log('🔄 수동 새로고침 - API 호출');
      }

      // API 호출
      console.log(`🌿 API에서 브랜치 목록 불러오기: ${owner}/${repo}`);
      const branchList = await getBranches(owner, repo);
      setBranches(branchList);
      console.log(`✅ ${branchList.length}개의 브랜치 발견`);

      // IndexedDB에 캐시 저장
      try {
        const cacheData = {
          id: cacheKey,
          data: branchList,
          timestamp: Date.now(),
        };

        // 기존 캐시 확인
        const existing = await repositoriesDB.getByID(cacheKey);
        if (existing) {
          await repositoriesDB.update(cacheData);
        } else {
          await repositoriesDB.add(cacheData);
        }
        console.log('💾 브랜치 목록 캐시 저장 완료 (IndexedDB)');
      } catch (saveError) {
        console.error('❌ 브랜치 캐시 저장 실패:', saveError);
      }
    } catch (error) {
      console.error('❌ 브랜치 불러오기 실패:', error);
      setMessage({ type: 'error', text: '브랜치 목록을 불러오는데 실패했습니다.' });
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  }, [repositoriesDB]);

  // 설정 및 리포지토리 목록 불러오기
  useEffect(() => {
    let mounted = true;

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
          if (mounted) {
            setSettings({
              repositoryFullName: data.repositoryFullName || '',
              repositoryUrl: data.repositoryUrl || '',
              branch: data.branch || 'main',
            });

            // 리포지토리가 선택되어 있으면 브랜치 목록 불러오기
            if (data.repositoryFullName) {
              const [owner, repo] = data.repositoryFullName.split('/');
              await fetchBranches(owner, repo);
            }
          }
        }

        // 리포지토리 목록 불러오기 (캐시 우선)
        if (mounted) {
          await fetchRepositories();
        }
      } catch (error) {
        console.error('설정 불러오기 실패:', error);
        if (mounted) {
          setMessage({ type: 'error', text: '설정을 불러오는데 실패했습니다.' });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []); // 마운트 시 한 번만 실행

  // 리포지토리 선택 (상태만 변경)
  const handleRepositorySelect = async (repo: Repository) => {
    setIsDropdownOpen(false);
    setMessage(null);

    // 설정 업데이트
    setSettings({
      repositoryFullName: repo.full_name,
      repositoryUrl: repo.html_url,
      branch: 'main', // 리포지토리 변경 시 기본 브랜치로 초기화
    });

    // 브랜치 목록 불러오기
    const [owner, repoName] = repo.full_name.split('/');
    await fetchBranches(owner, repoName);
    
    setHasChanges(true);
  };

  // 설정 저장
  const handleSaveSettings = async () => {
    const user = auth.currentUser;
    
    if (!user) {
      setMessage({ type: 'error', text: '로그인이 필요합니다.' });
      return;
    }

    if (!settings.repositoryFullName) {
      setMessage({ type: 'error', text: '리포지토리를 선택해주세요.' });
      return;
    }

    if (!settings.branch) {
      setMessage({ type: 'error', text: '브랜치를 선택해주세요.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      // 기존 리포지토리 확인
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const existingData = userDoc.exists() ? userDoc.data() : {};
      const previousRepo = existingData.repositoryFullName;
      const previousBranch = existingData.branch;
      
      // 리포지토리 또는 브랜치가 변경되었는지 확인
      const isRepoOrBranchChanged = 
        (previousRepo && previousRepo !== settings.repositoryFullName) ||
        (previousBranch && previousBranch !== settings.branch);

      // full_name에서 username과 repository 분리
      const [githubUsername, repositoryName] = settings.repositoryFullName.split('/');

      await setDoc(doc(db, 'users', user.uid), {
        ...existingData,
        repositoryFullName: settings.repositoryFullName,
        repositoryUrl: settings.repositoryUrl,
        githubUsername,
        repositoryName,
        branch: settings.branch,
        updatedAt: new Date().toISOString(),
      });

      // 리포지토리 또는 브랜치가 변경된 경우 플래시카드 데이터 삭제 후 홈으로 이동
      if (isRepoOrBranchChanged) {
        try {
          // 모든 캐시된 플래시카드 데이터 삭제
          await flashcardsDB.clear();
          console.log('🗑️ 설정 변경으로 인해 플래시카드 데이터를 삭제했습니다.');
          
          setMessage({ type: 'success', text: '✅ 설정이 저장되었습니다. 새로운 데이터를 불러옵니다...' });
          setHasChanges(false);
          setSaving(false);
          
          // 플래시카드 페이지로 이동하면서 리로드 트리거
          // 이렇게 하면 useTodayFlashcards 훅이 다시 실행되면서 새로운 데이터를 불러옴
          setTimeout(() => {
            triggerFlashcardReload();
          }, 500);
        } catch (clearError) {
          console.error('❌ 플래시카드 데이터 삭제 실패:', clearError);
          setMessage({ type: 'error', text: '데이터 삭제에 실패했습니다. 다시 시도해주세요.' });
          setSaving(false);
        }
      } else {
        // 리포지토리/브랜치 변경이 없는 경우 현재 페이지 유지
        setMessage({ type: 'success', text: '✅ 설정이 성공적으로 저장되었습니다!' });
        setHasChanges(false);
        setSaving(false);
        
        // 3초 후 메시지 자동 제거
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      }
    } catch (error) {
      console.error('설정 저장 실패:', error);
      setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' });
      setSaving(false);
    }
  };

  // 선택된 리포지토리 찾기
  const selectedRepo = repositories.find(repo => repo.full_name === settings.repositoryFullName);

  // 회원탈퇴 핸들러
  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    
    if (!user) {
      setMessage({ type: 'error', text: '로그인이 필요합니다.' });
      return;
    }

    if (deleteConfirmText !== '회원탈퇴') {
      setMessage({ type: 'error', text: '"회원탈퇴"를 정확히 입력해주세요.' });
      return;
    }

    try {
      setDeleting(true);
      setMessage(null);

      // 1. 탈퇴 기록 생성 (재가입 방지용)
      await setDoc(doc(db, 'deletedUsers', user.uid), {
        deletedAt: new Date().toISOString(),
        email: user.email,
        githubUsername: user.displayName,
      });
      
      // 2. Firestore 사용자 데이터 삭제
      await deleteDoc(doc(db, 'users', user.uid));
      
      // 3. IndexedDB 모든 데이터 삭제
      try {
        await flashcardsDB.clear();
        await repositoriesDB.clear();
        console.log('🗑️ IndexedDB 데이터 삭제 완료');
      } catch (dbError) {
        console.error('❌ IndexedDB 삭제 실패:', dbError);
      }
      
      // 4. Firebase Auth 계정 삭제
      await user.delete();
      
      console.log('✅ 회원탈퇴 완료');
    } catch (error: any) {
      console.error('회원탈퇴 실패:', error);
      
      // 재인증이 필요한 경우 (다양한 오류 코드 처리)
      const needsReauth = 
        error.code === 'auth/requires-recent-login' ||
        error.message?.includes('CREDENTIAL_TOO_OLD') ||
        error.message?.includes('LOGIN_AGAIN');
      
      if (needsReauth) {
        try {
          // 자동으로 재인증 시도
          console.log('🔄 재인증이 필요합니다. GitHub 로그인 팝업을 엽니다...');
          setMessage({ 
            type: 'error', 
            text: '보안을 위해 재인증이 필요합니다. 팝업에서 GitHub 로그인을 진행해주세요.' 
          });
          
          await reauthenticateWithPopup(user, githubProvider);
          console.log('✅ 재인증 완료');
          
          // 재인증 후 다시 계정 삭제 시도
          setMessage({ type: 'error', text: '재인증되었습니다. 다시 탈퇴를 시도합니다...' });
          
          // 1. 탈퇴 기록 생성
          await setDoc(doc(db, 'deletedUsers', user.uid), {
            deletedAt: new Date().toISOString(),
            email: user.email,
            githubUsername: user.displayName,
          });
          
          // 2. Firestore 사용자 데이터 삭제
          await deleteDoc(doc(db, 'users', user.uid));
          
          // 3. IndexedDB 모든 데이터 삭제
          try {
            await flashcardsDB.clear();
            await repositoriesDB.clear();
            console.log('🗑️ IndexedDB 데이터 삭제 완료');
          } catch (dbError) {
            console.error('❌ IndexedDB 삭제 실패:', dbError);
          }
          
          // 4. Firebase Auth 계정 삭제
          await user.delete();
          
          console.log('✅ 회원탈퇴 완료');
        } catch (reauthError: any) {
          console.error('재인증 실패:', reauthError);
          
          if (reauthError.code === 'auth/popup-closed-by-user') {
            setMessage({ 
              type: 'error', 
              text: '재인증이 취소되었습니다. 탈퇴를 계속하려면 다시 시도해주세요.' 
            });
          } else {
            setMessage({ 
              type: 'error', 
              text: '재인증에 실패했습니다. 잠시 후 다시 시도해주세요.' 
            });
          }
          setDeleting(false);
        }
      } else {
        setMessage({ type: 'error', text: '회원탈퇴에 실패했습니다.' });
        setDeleting(false);
      }
    }
  };

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
        <div className="settings-form">
          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="repository">
                GitHub 리포지토리
                <span className="required">*</span>
              </label>
              <button
                type="button"
                className="refresh-button"
                onClick={() => fetchRepositories(true)}
                disabled={loadingRepos}
                title="리포지토리 목록 새로고침"
              >
                {loadingRepos ? '⏳' : '🔄'}
              </button>
            </div>
            
            <p className="form-hint">
              {repositories.length > 0 
                ? `총 ${repositories.length}개의 리포지토리를 찾았습니다`
                : '접근 가능한 리포지토리가 없습니다'}
            </p>
            
            {loadingRepos ? (
              <div className="loading-repos">
                <div className="loading-spinner-small"></div>
                <span>리포지토리 목록을 불러오는 중...</span>
              </div>
            ) : (
              <div className="custom-select-container" ref={dropdownRef}>
                <button
                  type="button"
                  className={`custom-select-trigger ${isDropdownOpen ? 'open' : ''} ${saving ? 'saving' : ''}`}
                  onClick={() => !saving && setIsDropdownOpen(!isDropdownOpen)}
                  disabled={repositories.length === 0 || saving}
                >
                  {saving ? (
                    <div className="selected-repo">
                      <div className="loading-spinner-small"></div>
                      <span className="repo-name">저장 중...</span>
                    </div>
                  ) : selectedRepo ? (
                    <div className="selected-repo">
                      <span className="repo-name">{selectedRepo.full_name}</span>
                      <span className="repo-badge">{selectedRepo.private ? '🔒 Private' : '🌐 Public'}</span>
                    </div>
                  ) : (
                    <span className="placeholder">리포지토리를 선택하세요</span>
                  )}
                  <span className="dropdown-arrow">{isDropdownOpen ? '▲' : '▼'}</span>
                </button>

                {isDropdownOpen && !saving && (
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
          </div>

          {settings.repositoryFullName && (
            <>
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

              <div className="form-group">
                <div className="form-label-row">
                  <label htmlFor="branch">
                    브랜치 이름
                    <span className="required">*</span>
                  </label>
                  {settings.repositoryFullName && (
                    <button
                      type="button"
                      className="refresh-button"
                      onClick={() => {
                        const [owner, repoName] = settings.repositoryFullName.split('/');
                        fetchBranches(owner, repoName, true);
                      }}
                      disabled={loadingBranches}
                      title="브랜치 목록 새로고침"
                    >
                      {loadingBranches ? '⏳' : '🔄'}
                    </button>
                  )}
                </div>
                <p className="form-hint">
                  커밋을 가져올 브랜치를 선택하세요
                  {branches.length > 0 && ` (총 ${branches.length}개의 브랜치)`}
                </p>
                
                {loadingBranches ? (
                  <div className="loading-repos">
                    <div className="loading-spinner-small"></div>
                    <span>브랜치 목록을 불러오는 중...</span>
                  </div>
                ) : branches.length > 0 ? (
                  <select
                    id="branch"
                    value={settings.branch}
                    onChange={(e) => {
                      setSettings({ ...settings, branch: e.target.value });
                      setHasChanges(true);
                    }}
                    disabled={saving}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    {branches.map((branch) => (
                      <option key={branch.name} value={branch.name}>
                        {branch.name} {branch.protected ? '🔒' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="form-hint" style={{ color: '#999', fontStyle: 'italic' }}>
                    리포지토리를 선택하면 브랜치 목록이 표시됩니다.
                  </p>
                )}
              </div>
            </>
          )}

          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          {settings.repositoryFullName && (
            <button
              type="button"
              className="save-settings-button"
              onClick={handleSaveSettings}
              disabled={saving || !hasChanges}
              style={{
                width: '100%',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: 'white',
                backgroundColor: hasChanges ? '#4CAF50' : '#ccc',
                border: 'none',
                borderRadius: '8px',
                cursor: hasChanges && !saving ? 'pointer' : 'not-allowed',
                marginTop: '20px',
                transition: 'background-color 0.3s',
              }}
            >
              {saving ? '저장 중...' : hasChanges ? '설정 저장' : '저장됨'}
            </button>
          )}
        </div>

        <div className="settings-footer">
          <p className="info-text">
            ℹ️ GitHub OAuth로 로그인하여 접근 가능한 모든 리포지토리가 표시됩니다.
          </p>
          <p className="info-text">
            🔒 = Private 리포지토리, 🌐 = Public 리포지토리
          </p>
        </div>

        {/* 계정 관리 */}
        <div className="account-zone">
          <h2 className="account-zone-title">👤 계정 관리</h2>
          <p className="account-description">
            서비스 이용을 중단하고 싶으신가요?
          </p>
          <button
            type="button"
            className="delete-account-button"
            onClick={() => setShowDeleteDialog(true)}
          >
            서비스 탈퇴
          </button>
        </div>
      </div>

      {/* 서비스 탈퇴 확인 다이얼로그 */}
      {showDeleteDialog && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">👋 서비스 탈퇴</h2>
            <p className="modal-description">
              정말 탈퇴하시겠어요? 걱정하지 마세요, 언제든 다시 돌아올 수 있습니다.
            </p>
            <div className="modal-info-box">
              <p className="info-box-title">✨ 탈퇴 시 안내사항</p>
              <ul className="modal-info-list">
                <li>저장된 모든 데이터가 삭제됩니다</li>
                <li>탈퇴 후 24시간 이내에는 재가입할 수 없습니다</li>
                <li className="info-reauth">💡 보안을 위해 GitHub 재인증 팝업이 표시될 수 있습니다</li>
              </ul>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmText">
                확인을 위해 <strong>"회원탈퇴"</strong>를 입력해주세요:
              </label>
              <input
                id="confirmText"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="회원탈퇴"
                disabled={deleting}
                className="confirm-input"
              />
            </div>

            {message && message.type === 'error' && (
              <div className="message error">
                {message.text}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="modal-button cancel"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmText('');
                  setMessage(null);
                }}
                disabled={deleting}
              >
                취소
              </button>
              <button
                type="button"
                className="modal-button danger"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== '회원탈퇴'}
              >
                {deleting ? '탈퇴 처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

