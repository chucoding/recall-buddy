import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { reauthenticateWithPopup } from 'firebase/auth';
import { auth, store, githubProvider } from '../firebase';
import { getRepositories, getBranches, Branch } from '../api/github-api';
import { Repository } from '../types';
import TermsLinks from '../widgets/TermsLinks';
import './Settings.css';

interface RepositorySettings {
  repositoryFullName: string;
  repositoryUrl: string;
  branch: string;
}

interface Notice {
  id: string;
  message: string;
}

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
  const [reposFetchError, setReposFetchError] = useState<boolean>(false);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false); //TODO : Tanstack Query로 변경
  const [branchesFetchError, setBranchesFetchError] = useState<boolean>(false); //TODO : Tanstack Query로 변경
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [deleting, setDeleting] = useState<boolean>(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    };

    if (isDropdownOpen || isBranchDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, isBranchDropdownOpen]);

  // Firestore에서 공지사항 실시간 가져오기
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(store, 'notices'),
      (snapshot) => {
        const noticesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Notice));
        
        console.log('📢 공지사항 업데이트:', noticesList.length, '개');
        setNotices(noticesList);
      },
      (error) => {
        console.error('❌ 공지사항 가져오기 실패:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // GitHub 리포지토리 목록 불러오기
  const fetchRepositories = useCallback(async () => {
    try {
      setLoadingRepos(true);
      setReposFetchError(false);
      const repos = await getRepositories();
      setRepositories(repos);
    } catch (error) {
      console.error('❌ 리포지토리 불러오기 실패:', error);
      setReposFetchError(true);
      setMessage({ type: 'error', text: '리포지토리 목록을 불러오는데 실패했습니다.' });
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  // 브랜치 목록 불러오기
  const fetchBranches = useCallback(async (owner: string, repo: string) => {
    try {
      setLoadingBranches(true);
      setBranchesFetchError(false);
      const branchList = await getBranches(owner, repo);
      setBranches(branchList);
    } catch (error) {
      console.error('❌ 브랜치 불러오기 실패:', error);
      setBranchesFetchError(true);
      setMessage({ type: 'error', text: '브랜치 목록을 불러오는데 실패했습니다.' });
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  }, []);

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
        const userDoc = await getDoc(doc(store, 'users', user.uid));
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
      // 기존 데이터 확인
      const userDoc = await getDoc(doc(store, 'users', user.uid));
      const existingData = userDoc.exists() ? userDoc.data() : {};

      // Firestore에 설정 저장
      await setDoc(doc(store, 'users', user.uid), {
        ...existingData,
        repositoryFullName: settings.repositoryFullName,
        repositoryUrl: settings.repositoryUrl,
        branch: settings.branch,
        updatedAt: new Date().toISOString(),
      });

      // 저장 후 Firestore에서 플래시카드 데이터 삭제하고 새로 생성
      try {
        const flashcardsRef = collection(store, 'users', user.uid, 'flashcards');
        const flashcardsSnapshot = await getDocs(flashcardsRef);
        const deletePromises = flashcardsSnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        console.log('🗑️ Firestore 플래시카드 데이터를 삭제했습니다.');
        
        setMessage({ type: 'success', text: '✅ 설정이 저장되었습니다. 새로운 데이터를 불러옵니다...' });
        
        // 페이지 새로고침으로 플래시카드 새로 생성
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (clearError) {
        console.error('❌ 플래시카드 데이터 삭제 실패:', clearError);
        setMessage({ type: 'error', text: '데이터 삭제에 실패했습니다. 다시 시도해주세요.' });
        setSaving(false);
      }
    } catch (error) {
      console.error('설정 저장 실패:', error);
      setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' });
      setSaving(false);
    }
  };

  // 선택된 리포지토리 찾기
  const selectedRepo = repositories.find(repo => repo.full_name === settings.repositoryFullName);

  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('로그아웃 실패:', error);
      setMessage({ type: 'error', text: '로그아웃에 실패했습니다.' });
    }
  };

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

      console.log('🚨 회원탈퇴 시작:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });

      // 1. 탈퇴 기록 생성 (재가입 방지용)
      console.log('📝 탈퇴 기록 생성 중...');
      await setDoc(doc(store, 'deletedUsers', user.uid), {
        deletedAt: new Date().toISOString(),
        email: user.email,
        githubUsername: user.displayName,
      });
      console.log('✅ 탈퇴 기록 생성 완료');
      
      // 2. Firestore 플래시카드 서브컬렉션 삭제 (Auth 삭제 전에 처리해야 함)
      console.log('🗑️ Firestore 플래시카드 데이터 삭제 중...');
      const flashcardsRef = collection(store, 'users', user.uid, 'flashcards');
      const flashcardsSnapshot = await getDocs(flashcardsRef);
      const deletePromises = flashcardsSnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      console.log('✅ Firestore 플래시카드 데이터 삭제 완료');

      // 3. Firestore 사용자 데이터 삭제
      console.log('🗑️ Firestore 사용자 데이터 삭제 중...');
      await deleteDoc(doc(store, 'users', user.uid));
      console.log('✅ Firestore 사용자 데이터 삭제 완료');

      // 4. Firebase Auth 계정 삭제 (항상 마지막 — 이후 인증 불가)
      console.log('🗑️ Firebase Auth 계정 삭제 중...');
      await user.delete();
      console.log('✅ Firebase Auth 계정 삭제 완료');
      
      console.log('🎉 회원탈퇴 완료');
    } catch (error: any) {
      console.error('❌ 회원탈퇴 실패:', error);
      
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
          console.log('📝 (재시도) 탈퇴 기록 생성 중...');
          await setDoc(doc(store, 'deletedUsers', user.uid), {
            deletedAt: new Date().toISOString(),
            email: user.email,
            githubUsername: user.displayName,
          });
          console.log('✅ (재시도) 탈퇴 기록 생성 완료');
          
          // 2. Firestore 플래시카드 서브컬렉션 삭제 (Auth 삭제 전에 처리해야 함)
          console.log('🗑️ (재시도) Firestore 플래시카드 데이터 삭제 중...');
          const flashcardsRef = collection(store, 'users', user.uid, 'flashcards');
          const flashcardsSnapshot = await getDocs(flashcardsRef);
          const deletePromises = flashcardsSnapshot.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletePromises);
          console.log('✅ (재시도) Firestore 플래시카드 데이터 삭제 완료');

          // 3. Firestore 사용자 데이터 삭제
          console.log('🗑️ (재시도) Firestore 사용자 데이터 삭제 중...');
          await deleteDoc(doc(store, 'users', user.uid));
          console.log('✅ (재시도) Firestore 사용자 데이터 삭제 완료');

          // 4. Firebase Auth 계정 삭제 (항상 마지막 — 이후 인증 불가)
          console.log('🗑️ (재시도) Firebase Auth 계정 삭제 중...');
          await user.delete();
          console.log('✅ (재시도) Firebase Auth 계정 삭제 완료');
          
          console.log('🎉 (재시도) 회원탈퇴 완료');
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
        {/* 공지사항 */}
        {notices.length > 0 && (
          <div className="notice-banner">
            <div className="notice-icon">📢</div>
            <div className="notice-content">
              {notices.map((notice, index) => (
                <p key={notice.id} className="notice-text" style={{ marginBottom: index < notices.length - 1 ? '8px' : '0' }}>
                  {notice.message}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="settings-form">
          <div className="form-group">
            <label htmlFor="repository">
              GitHub 리포지토리
              <span className="required">*</span>
            </label>
            
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
            ) : reposFetchError ? (
              <div className="loading-repos">
                <span>리포지토리를 불러오지 못했습니다.</span>
                <button
                  type="button"
                  className="refresh-button"
                  onClick={() => fetchRepositories()}
                  style={{ marginLeft: '8px' }}
                >
                  🔄 다시 시도
                </button>
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
                ) : branchesFetchError ? (
                  <div className="loading-repos">
                    <span>브랜치 목록을 불러오지 못했습니다.</span>
                    <button
                      type="button"
                      className="refresh-button"
                      onClick={() => {
                        const [owner, repoName] = settings.repositoryFullName.split('/');
                        fetchBranches(owner, repoName);
                      }}
                      style={{ marginLeft: '8px' }}
                    >
                      🔄 다시 시도
                    </button>
                  </div>
                ) : branches.length > 0 ? (
                  <div className="custom-select-container" ref={branchDropdownRef}>
                    <button
                      type="button"
                      className={`custom-select-trigger ${isBranchDropdownOpen ? 'open' : ''} ${saving ? 'saving' : ''}`}
                      onClick={() => !saving && setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                      disabled={saving}
                    >
                      {saving ? (
                        <div className="selected-repo">
                          <div className="loading-spinner-small"></div>
                          <span className="repo-name">저장 중...</span>
                        </div>
                      ) : (
                        <div className="selected-repo">
                          <span className="repo-name">{settings.branch}</span>
                          {branches.find(b => b.name === settings.branch)?.protected && (
                            <span className="repo-badge">🔒 Protected</span>
                          )}
                        </div>
                      )}
                      <span className="dropdown-arrow">{isBranchDropdownOpen ? '▲' : '▼'}</span>
                    </button>

                    {isBranchDropdownOpen && !saving && (
                      <div className="custom-select-dropdown">
                        {branches.map((branch) => (
                          <div
                            key={branch.name}
                            className={`custom-select-option ${settings.branch === branch.name ? 'selected' : ''}`}
                            onClick={() => {
                              setSettings({ ...settings, branch: branch.name });
                              setIsBranchDropdownOpen(false);
                            }}
                          >
                            <div className="option-header">
                              <span className="option-name">{branch.name}</span>
                              {branch.protected && <span className="option-badge">🔒</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
              disabled={saving || !settings.repositoryFullName || !settings.branch}
            >
              {saving ? '저장 중...' : '🚀 설정 저장'}
            </button>
          )}
        </div>
        <p className="info-text">
          ℹ️ GitHub OAuth로 로그인하여 접근 가능한 모든 리포지토리가 표시됩니다.
        </p>
        <p className="info-text">
          🔒 = Private 리포지토리, 🌐 = Public 리포지토리
        </p>

        {/* 릴리즈 노트 */}
        <div className="release-note-zone">
          <h2 className="release-note-title">📝 릴리즈 노트</h2>
          <p className="release-note-description">
            새로운 기능과 개선사항을 확인하세요
          </p>
          <a
            href="https://www.notion.so/chucoding/RELEASE_NOTE-287fd64d44a080cd9564d2492b7de718"
            target="_blank"
            rel="noopener noreferrer"
            className="release-note-button"
          >
            📋 릴리즈 노트 보기
          </a>
        </div>

        {/* 계정 관리 */}
        <div className="account-zone">
          <h2 className="account-zone-title">👤 계정 관리</h2>
          <p className="account-description">
            계정 로그아웃 또는 서비스 탈퇴를 진행할 수 있습니다.
          </p>
          <div className="account-buttons">
            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
            >
              🚪 로그아웃
            </button>
            <button
              type="button"
              className="delete-account-button"
              onClick={() => setShowDeleteDialog(true)}
            >
              서비스 탈퇴
            </button>
          </div>
        </div>

        {/* 이용약관 링크 */}
        <div className="settings-footer">
          <TermsLinks />
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
                <li>탈퇴 시 다음날부터 재가입할 수 있습니다</li>
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

