import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { reauthenticateWithPopup } from 'firebase/auth';
import { auth, store, githubProvider } from '../firebase';
import { getRepositories } from '../api/github-api';
import { Repository } from '../types';
import TermsLinks from '../widgets/TermsLinks';

interface RepositorySettings {
  repositoryFullName: string;
  repositoryUrl: string;
}

interface Notice {
  id: string;
  message: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<RepositorySettings>({
    repositoryFullName: '',
    repositoryUrl: '',
  });
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [reposFetchError, setReposFetchError] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>('');
  const [deleting, setDeleting] = useState<boolean>(false);
  const [notices, setNotices] = useState<Notice[]>([]);
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
            });
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
  const handleRepositorySelect = (repo: Repository) => {
    setIsDropdownOpen(false);
    setMessage(null);
    setSettings({
      repositoryFullName: repo.full_name,
      repositoryUrl: repo.html_url,
    });
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
      <div className="min-h-screen flex justify-center items-start bg-linear-to-br from-primary to-primary-dark pt-20 px-5 pb-5">
        <div className="bg-white rounded-2xl p-10 max-w-[600px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.3)] text-center">
          <div className="w-10 h-10 border-4 border-[#f3f3f3] border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-body">설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center items-start bg-linear-to-br from-primary to-primary-dark pt-20 px-5 pb-5">
      <div className="bg-white rounded-2xl p-10 max-w-[600px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.3)] max-[768px]:p-6">
        {/* 공지사항 */}
        {notices.length > 0 && (
          <div className="flex items-start gap-3 bg-[linear-gradient(135deg,#fff3e0_0%,#ffe0b2_100%)] border-2 border-[#ff9800] rounded-xl p-4 mb-8 animate-fade-in max-[768px]:p-3 max-[768px]:mb-6">
            <div className="text-2xl shrink-0 max-[768px]:text-xl">📢</div>
            <div className="flex-1">
              {notices.map((notice, index) => (
                <p key={notice.id} className={`m-0 text-[#e65100] text-[0.9rem] leading-relaxed font-medium max-[768px]:text-[0.85rem] ${index < notices.length - 1 ? 'mb-2' : ''}`}>
                  {notice.message}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center gap-3">
              <label htmlFor="repository" className="font-semibold text-[#333] text-[0.95rem] block m-0 uppercase-none">
                GitHub 리포지토리
                <span className="text-error ml-1">*</span>
              </label>
            </div>
            
            <p className="m-0 mb-3 text-[0.85rem] text-text-light font-medium">
              {repositories.length > 0 
                ? `총 ${repositories.length}개의 리포지토리를 찾았습니다`
                : '접근 가능한 리포지토리가 없습니다'}
            </p>
            
            {loadingRepos ? (
              <div className="flex items-center gap-3 p-4 bg-surface border-2 border-border rounded-lg text-text-body text-[0.95rem]">
                <div className="w-5 h-5 border-3 border-[#f3f3f3] border-t-primary rounded-full animate-spin shrink-0"></div>
                <span>리포지토리 목록을 불러오는 중...</span>
              </div>
            ) : reposFetchError ? (
              <div className="flex items-center gap-3 p-4 bg-surface border-2 border-border rounded-lg text-text-body text-[0.95rem]">
                <span>리포지토리를 불러오지 못했습니다.</span>
                <button
                  type="button"
                  className="ml-2 px-3 py-1.5 bg-transparent text-primary border border-primary rounded-md text-[1.1rem] cursor-pointer transition-all duration-200 flex items-center justify-center min-w-[40px] h-8 hover:bg-primary hover:text-white hover:rotate-180 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => fetchRepositories()}
                >
                  🔄 다시 시도
                </button>
              </div>
            ) : (
              <div className="relative w-full" ref={dropdownRef}>
                <button
                  type="button"
                  className={`w-full px-4 py-3 border-2 border-border rounded-lg bg-white cursor-pointer flex items-center justify-between gap-3 transition-all duration-200 text-left text-base hover:border-border-medium disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-surface ${isDropdownOpen ? 'border-primary shadow-[0_0_0_3px_rgba(102,126,234,0.1)]' : ''} ${saving ? 'cursor-wait opacity-80' : ''}`}
                  onClick={() => !saving && setIsDropdownOpen(!isDropdownOpen)}
                  disabled={repositories.length === 0 || saving}
                >
                  {saving ? (
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-5 h-5 border-3 border-[#f3f3f3] border-t-primary rounded-full animate-spin shrink-0"></div>
                      <span className="font-mono font-medium text-text-dark">저장 중...</span>
                    </div>
                  ) : selectedRepo ? (
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-mono font-medium text-text-dark">{selectedRepo.full_name}</span>
                      <span className="text-[0.75rem] px-2 py-0.5 rounded bg-border text-text-body whitespace-nowrap">{selectedRepo.private ? '🔒 Private' : '🌐 Public'}</span>
                    </div>
                  ) : (
                    <span className="text-text-muted">리포지토리를 선택하세요</span>
                  )}
                  <span className="text-text-light text-[0.75rem]">{isDropdownOpen ? '▲' : '▼'}</span>
                </button>

                {isDropdownOpen && !saving && (
                  <div className="absolute top-[calc(100%+4px)] left-0 right-0 max-h-[300px] overflow-y-auto bg-white border-2 border-primary rounded-lg shadow-[0_10px_25px_rgba(0,0,0,0.15)] z-[1000] animate-fade-in">
                    {repositories.map((repo) => (
                      <div
                        key={repo.id}
                        className={`px-4 py-3 cursor-pointer transition-colors duration-150 border-b border-surface last:border-b-0 hover:bg-surface ${settings.repositoryFullName === repo.full_name ? 'bg-[#edf2f7]' : ''}`}
                        onClick={() => handleRepositorySelect(repo)}
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className="font-mono font-semibold text-text-dark text-[0.95rem]">{repo.full_name}</span>
                          <span className="text-[0.7rem] px-1.5 py-0.5 rounded bg-border text-text-body whitespace-nowrap">{repo.private ? '🔒' : '🌐'}</span>
                        </div>
                        {repo.description && (
                          <div className="text-[0.85rem] text-text-light leading-snug mt-1 pl-0.5">{repo.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {settings.repositoryFullName && (
            <div className="bg-surface border border-border rounded-lg p-4 mt-2">
              <p className="m-0 mb-2 text-[0.9rem] font-semibold text-text-body">📂 선택된 리포지토리:</p>
              <code className="block px-3 py-2 bg-white border border-border-medium rounded-md font-mono text-[0.9rem] text-text-dark break-all">
                <a 
                  href={settings.repositoryUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary no-underline transition-colors duration-200 hover:text-primary-dark hover:underline"
                >
                  {settings.repositoryUrl}
                </a>
              </code>
            </div>
          )}

          {message && (
            <div className={`px-[18px] py-3.5 rounded-lg text-[0.95rem] font-medium my-4 animate-slide-up ${message.type === 'success' ? 'bg-success-bg text-success border border-[#9ae6b4] shadow-[0_2px_8px_rgba(72,187,120,0.2)]' : 'bg-[#fed7d7] text-[#742a2a] border border-error-light shadow-[0_2px_8px_rgba(252,129,129,0.2)]'}`}>
              {message.text}
            </div>
          )}

          {settings.repositoryFullName && (
            <button
              type="button"
              className="w-full py-3 px-6 text-base font-bold text-white bg-linear-to-br from-primary to-primary-dark border-none rounded-lg cursor-pointer mt-5 mb-5 transition-all duration-200 shadow-[0_4px_12px_rgba(102,126,234,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(102,126,234,0.4)] disabled:bg-[#ccc] disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              onClick={handleSaveSettings}
              disabled={saving || !settings.repositoryFullName}
            >
              {saving ? '저장 중...' : '🚀 설정 저장'}
            </button>
          )}
        </div>
        <p className="m-0 mb-2 text-[0.85rem] text-text-light text-left leading-relaxed">
          ℹ️ GitHub OAuth로 로그인하여 접근 가능한 모든 리포지토리가 표시됩니다.
        </p>
        <p className="m-0 text-[0.85rem] text-text-light text-left leading-relaxed">
          🔒 = Private 리포지토리, 🌐 = Public 리포지토리
        </p>

        {/* 릴리즈 노트 */}
        <div className="border-t border-border text-left mt-8 pt-5 max-[768px]:pt-4">
          <h2 className="m-0 mb-2 text-text-body text-base font-semibold max-[768px]:text-[0.95rem]">📝 릴리즈 노트</h2>
          <p className="m-0 mb-4 text-text-light text-[0.9rem] leading-relaxed max-[768px]:text-[0.85rem]">
            새로운 기능과 개선사항을 확인하세요
          </p>
          <a
            href="https://www.notion.so/chucoding/RELEASE_NOTE-287fd64d44a080cd9564d2492b7de718"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-linear-to-br from-primary to-primary-dark text-white border-none rounded-lg text-[0.95rem] font-semibold cursor-pointer transition-all duration-200 no-underline shadow-[0_4px_12px_rgba(102,126,234,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(102,126,234,0.4)] max-[768px]:text-[0.9rem] max-[768px]:px-5 max-[768px]:py-2.5"
          >
            📋 릴리즈 노트 보기
          </a>
        </div>

        {/* 계정 관리 */}
        <div className="border-t border-border text-left mt-4 pt-5 max-[768px]:pt-4">
          <h2 className="m-0 mb-2 text-text-body text-base font-semibold max-[768px]:text-[0.95rem]">👤 계정 관리</h2>
          <p className="m-0 mb-4 text-text-light text-[0.9rem] leading-relaxed max-[768px]:text-[0.85rem]">
            계정 로그아웃 또는 서비스 탈퇴를 진행할 수 있습니다.
          </p>
          <div className="flex gap-3 mt-4 max-[768px]:flex-col">
            <button
              type="button"
              className="flex-1 py-3 px-6 bg-linear-to-br from-primary to-primary-dark text-white border-none rounded-lg text-[0.95rem] font-semibold cursor-pointer transition-all duration-200 shadow-[0_4px_12px_rgba(102,126,234,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(102,126,234,0.4)] max-[768px]:w-full"
              onClick={handleLogout}
            >
              🚪 로그아웃
            </button>
            <button
              type="button"
              className="flex-1 py-3 px-6 bg-transparent text-text-muted border border-border rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all duration-200 hover:text-text-light hover:border-border-medium hover:bg-surface max-[768px]:w-full"
              onClick={() => setShowDeleteDialog(true)}
            >
              서비스 탈퇴
            </button>
          </div>
        </div>

        {/* 이용약관 링크 */}
        <div className="border-t border-[#e0e0e0] text-center mt-4 pt-4">
          <TermsLinks />
        </div>
      </div>

      {/* 서비스 탈퇴 확인 다이얼로그 */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[9999] animate-fade-in p-5" onClick={() => !deleting && setShowDeleteDialog(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-[500px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.4)] animate-slide-up max-h-[90vh] overflow-y-auto max-[768px]:p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="m-0 mb-4 text-text-body text-2xl font-bold max-[768px]:text-xl">👋 서비스 탈퇴</h2>
            <p className="m-0 mb-5 text-text-body text-base leading-relaxed">
              정말 탈퇴하시겠어요? 걱정하지 마세요, 언제든 다시 돌아올 수 있습니다.
            </p>
            <div className="m-0 mb-6 p-4 bg-surface border border-border rounded-lg">
              <p className="m-0 mb-3 text-text-body text-[0.95rem] font-semibold">✨ 탈퇴 시 안내사항</p>
              <ul className="m-0 pl-5 text-text-light">
                <li className="my-2 leading-relaxed text-[0.9rem]">저장된 모든 데이터가 삭제됩니다</li>
                <li className="my-2 leading-relaxed text-[0.9rem]">탈퇴 시 다음날부터 재가입할 수 있습니다</li>
                <li className="my-2 leading-relaxed text-[0.9rem] text-primary font-medium mt-3 pt-3 border-t border-dashed border-border">💡 보안을 위해 GitHub 재인증 팝업이 표시될 수 있습니다</li>
              </ul>
            </div>
            
            <div className="flex flex-col gap-2">
              <label htmlFor="confirmText" className="font-semibold text-[#333] text-[0.95rem] block m-0">
                확인을 위해 <strong>"회원탈퇴"</strong>를 입력해주세요:
              </label>
              <input
                id="confirmText"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="회원탈퇴"
                disabled={deleting}
                className="px-4 py-3 border-2 border-border rounded-lg text-base transition-all duration-200 w-full font-inherit focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)] disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-surface"
              />
            </div>

            {message && message.type === 'error' && (
              <div className="px-[18px] py-3.5 rounded-lg text-[0.95rem] font-medium my-4 animate-slide-up bg-[#fed7d7] text-[#742a2a] border border-error-light shadow-[0_2px_8px_rgba(252,129,129,0.2)]">
                {message.text}
              </div>
            )}

            <div className="flex gap-3 mt-6 justify-end max-[768px]:flex-col">
              <button
                type="button"
                className="px-6 py-3 border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-200 min-w-[100px] bg-border text-text-body hover:bg-border-medium disabled:opacity-60 disabled:cursor-not-allowed max-[768px]:w-full"
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
                className="px-6 py-3 border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-200 min-w-[100px] bg-text-muted text-white hover:bg-text-light hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(113,128,150,0.3)] disabled:opacity-60 disabled:cursor-not-allowed max-[768px]:w-full"
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
