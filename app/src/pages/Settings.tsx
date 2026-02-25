import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, onSnapshot, getDocs } from 'firebase/firestore';
import { reauthenticateWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth, app, store, githubProvider } from '../firebase';
import { getRepositories, getBranches } from '../api/github-api';
import { regenerateTodayFlashcards } from '../api/subscription-api';
import { Repository, UserRepository } from '../types';
import { useSubscription } from '../hooks/useSubscription';
import { useNavigationStore } from '../stores/navigationStore';
import { getCurrentDate } from '../modules/utils';
import { X, Bell, Megaphone, ChevronUp, ChevronDown, Info, Lock, Globe, FileText, ClipboardList, User, LogOut, UserX, Sparkles, Lightbulb, CalendarIcon, GitBranch } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const MAX_REPOS_FREE = 1;
const MAX_REPOS_PRO = 5;

const Settings: React.FC = () => {
  /** 사용자가 선택한 레포 목록 (Firestore repositories와 동기화). Free 1개, Pro 최대 5개 */
  const [selectedRepos, setSelectedRepos] = useState<UserRepository[]>([]);
  /** GitHub API로 불러온 전체 레포 목록 (드롭다운용) */
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
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [pushUpdating, setPushUpdating] = useState<boolean>(false);
  const [preferredPushHour, setPreferredPushHour] = useState<number>(8);
  const [regenerating, setRegenerating] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedReposRef = useRef<UserRepository[]>([]);
  selectedReposRef.current = selectedRepos;
  /** 레포별 브랜치 목록 캐시 { fullName: { list, loading } } */
  const [branchesByRepo, setBranchesByRepo] = useState<Record<string, { list: { name: string }[]; loading: boolean }>>({});
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setCurrentUser);
    return () => unsub();
  }, []);
  const { subscription } = useSubscription(currentUser);
  const { setSelectedPastDate, setCurrentPage } = useNavigationStore();
  const [pastDateInput, setPastDateInput] = useState('');
  const [pastDatePopoverOpen, setPastDatePopoverOpen] = useState(false);
  const tier = subscription?.subscriptionTier === 'pro' ? 'pro' : 'free';
  const todayStr = getCurrentDate();
  const canRegenerate = tier === 'pro' && (
    (subscription?.lastRegenerateDate !== todayStr) ||
    (typeof subscription?.regenerateCountToday === 'number' && subscription.regenerateCountToday < 3)
  );
  const regenerateCount = subscription?.lastRegenerateDate === todayStr ? (subscription?.regenerateCountToday ?? 0) : 0;

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

  // 선택된 레포별 브랜치 목록 로드 (stale 콜백 무시: 레포 제거 후 응답이 도착하면 업데이트하지 않음 → 재추가 시 refetch 가능)
  useEffect(() => {
    selectedRepos.forEach((r) => {
      const [owner, repo] = r.fullName.split('/');
      if (!owner || !repo) return;
      const cached = branchesByRepo[r.fullName];
      if (cached) return;
      const fetchFor = r.fullName;
      setBranchesByRepo((prev) => ({ ...prev, [r.fullName]: { list: [], loading: true } }));
      getBranches(owner, repo)
        .then((list) => {
          const stillSelected = selectedReposRef.current.some((x) => x.fullName === fetchFor);
          if (stillSelected) setBranchesByRepo((prev) => ({ ...prev, [fetchFor]: { list, loading: false } }));
        })
        .catch(() => {
          const stillSelected = selectedReposRef.current.some((x) => x.fullName === fetchFor);
          if (stillSelected) setBranchesByRepo((prev) => ({ ...prev, [fetchFor]: { list: [], loading: false } }));
        });
    });
  }, [selectedRepos, branchesByRepo]);

  // 선택 해제된 레포의 브랜치 캐시 제거 (다시 추가 시 재시도 가능)
  useEffect(() => {
    const keys = new Set(selectedRepos.map((r) => r.fullName));
    const toRemove = Object.keys(branchesByRepo).filter((k) => !keys.has(k));
    if (toRemove.length === 0) return;
    setBranchesByRepo((prev) => {
      const next = { ...prev };
      toRemove.forEach((k) => delete next[k]);
      return next;
    });
  }, [selectedRepos.map((r) => r.fullName).join(',')]);

  // Stripe 결제 복귀 시 쿼리 처리
  useEffect(() => {
    const hash = window.location.hash || '';
    if (hash.includes('subscription=success')) {
      setMessage({ type: 'success', text: 'Pro 구독이 완료되었습니다. 감사합니다!' });
      window.history.replaceState(null, '', window.location.pathname + (window.location.search || ''));
    }
  }, []);

  // Firestore config/notice 단일 문서에서 공지 메시지 실시간 구독 (message 하나만 사용)
  useEffect(() => {
    const noticeRef = doc(store, 'config', 'notice');
    const unsubscribe = onSnapshot(
      noticeRef,
      (snapshot) => {
        const msg = (snapshot.exists() ? snapshot.data()?.message : undefined) ?? '';
        const trimmed = typeof msg === 'string' ? msg.trim() : '';
        setNoticeMessage(trimmed || null);
      },
      (error) => {
        console.error('공지사항 가져오기 실패:', error);
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
      console.error('리포지토리 불러오기 실패:', error);
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
          
          // 저장된 설정 불러오기 (repositories만 사용, pushEnabled 등은 users 문서에 저장)
          if (mounted) {
            const repos = data.repositories;
            setSelectedRepos(Array.isArray(repos) ? repos : []);
            setPushEnabled(!!data.pushEnabled);
            setPreferredPushHour(typeof data.preferredPushHour === 'number' ? data.preferredPushHour : 8);
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

  const maxRepos = tier === 'pro' ? MAX_REPOS_PRO : MAX_REPOS_FREE;

  /** 단일 레포 선택 (Free 또는 Pro에서 첫 번째/유일 레포 설정) */
  const handleRepositorySelect = (repo: Repository) => {
    setIsDropdownOpen(false);
    setMessage(null);
    setSelectedRepos([{ fullName: repo.full_name, url: repo.html_url }]);
  };

  /** Pro: 레포 추가 (이미 선택된 건 제외) */
  const handleAddRepository = (repo: Repository) => {
    setIsDropdownOpen(false);
    setMessage(null);
    if (selectedRepos.length >= MAX_REPOS_PRO) {
      setMessage({ type: 'error', text: `Pro는 최대 ${MAX_REPOS_PRO}개까지 연결할 수 있어요.` });
      return;
    }
    if (selectedRepos.some((r) => r.fullName === repo.full_name)) return;
    setSelectedRepos((prev) => [...prev, { fullName: repo.full_name, url: repo.html_url }]);
  };

  /** Pro: 레포 제거 */
  const handleRemoveRepository = (fullName: string) => {
    setMessage(null);
    setSelectedRepos((prev) => prev.filter((r) => r.fullName !== fullName));
  };

  /** 레포별 브랜치 변경 (value: '__default__'면 undefined) */
  const handleBranchChange = (fullName: string, value: string | undefined) => {
    setSelectedRepos((prev) =>
      prev.map((r) => (r.fullName === fullName ? { ...r, branch: value && value !== '__default__' ? value : undefined } : r))
    );
  };

  // 설정 저장
  const handleSaveSettings = async () => {
    const user = auth.currentUser;

    if (!user) {
      setMessage({ type: 'error', text: '로그인이 필요합니다.' });
      return;
    }

    if (selectedRepos.length === 0) {
      setMessage({ type: 'error', text: '리포지토리를 1개 이상 선택해주세요.' });
      return;
    }

    const reposToSave = selectedRepos.slice(0, maxRepos).map(({ fullName, url, branch }) =>
      ({ fullName, url, ...(branch ? { branch } : {}) })
    );
    if (reposToSave.length !== selectedRepos.length) {
      setMessage({ type: 'error', text: `Free는 1개, Pro는 최대 ${MAX_REPOS_PRO}개까지 가능해요.` });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const userDoc = await getDoc(doc(store, 'users', user.uid));
      const existingData = userDoc.exists() ? userDoc.data() : {};

      await setDoc(doc(store, 'users', user.uid), {
        ...existingData,
        repositories: reposToSave,
        updatedAt: new Date().toISOString(),
      });

      // 저장 후 Firestore에서 플래시카드 데이터 삭제하고 새로 생성
      try {
        const flashcardsRef = collection(store, 'users', user.uid, 'flashcards');
        const flashcardsSnapshot = await getDocs(flashcardsRef);
        const deletePromises = flashcardsSnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);

        setMessage({ type: 'success', text: '설정이 저장되었습니다. 새로운 데이터를 불러옵니다...' });
        
        // 페이지 새로고침으로 플래시카드 새로 생성
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (clearError) {
        console.error('플래시카드 데이터 삭제 실패:', clearError);
        setMessage({ type: 'error', text: '데이터 삭제에 실패했습니다. 다시 시도해주세요.' });
        setSaving(false);
      }
    } catch (error) {
      console.error('설정 저장 실패:', error);
      setMessage({ type: 'error', text: '설정 저장에 실패했습니다.' });
      setSaving(false);
    }
  };

  // PUSH 알림 토글: ON 시 권한 요청 후 FCM 토큰 발급·저장, OFF 시 pushEnabled만 false
  const handlePushToggle = async (nextEnabled: boolean) => {
    const user = auth.currentUser;
    if (!user) {
      setMessage({ type: 'error', text: '로그인이 필요합니다.' });
      return;
    }
    setPushUpdating(true);
    setMessage(null);
    try {
      if (nextEnabled) {
        if (typeof window === 'undefined' || !('Notification' in window)) {
          setMessage({ type: 'error', text: '이 브라우저에서는 알림을 지원하지 않습니다.' });
          setPushUpdating(false);
          return;
        }
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        if (permission !== 'granted') {
          setMessage({ type: 'error', text: '알림을 사용하려면 브라우저 알림을 허용해 주세요.' });
          setPushUpdating(false);
          return;
        }
        const { getMessaging, getToken } = await import('firebase/messaging');
        const messaging = getMessaging(app);
        const vapidKey = import.meta.env.VITE_VAPID_KEY;
        const token = await getToken(messaging, vapidKey ? { vapidKey } : undefined);
        if (!token) {
          setMessage({ type: 'error', text: '알림 토큰을 받지 못했습니다. 잠시 후 다시 시도해 주세요.' });
          setPushUpdating(false);
          return;
        }
        const userDoc = await getDoc(doc(store, 'users', user.uid));
        const existingData = userDoc.exists() ? userDoc.data() : {};
        const timeZone = existingData?.preferredPushTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
        await setDoc(doc(store, 'users', user.uid), {
          ...existingData,
          pushEnabled: true,
          fcmToken: token,
          preferredPushTimezone: timeZone,
          updatedAt: new Date().toISOString(),
        });
        setPushEnabled(true);
      } else {
        await updateDoc(doc(store, 'users', user.uid), {
          pushEnabled: false,
          updatedAt: new Date().toISOString(),
        });
        setPushEnabled(false);
      }
    } catch (err) {
      console.error('PUSH 알림 설정 실패:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '알림 설정에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setPushUpdating(false);
    }
  };

  /** 드롭다운에 표시할 후보: Pro일 때는 아직 선택하지 않은 레포만, Free일 때는 전체 */
  const availableReposForDropdown =
    tier === 'pro'
      ? repositories.filter((repo) => !selectedRepos.some((r) => r.fullName === repo.full_name))
      : repositories;
  const canAddMore = tier === 'pro' && selectedRepos.length < MAX_REPOS_PRO;

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

      // 1. 탈퇴 기록 생성 (재가입 방지용)
      await setDoc(doc(store, 'deletedUsers', user.uid), {
        deletedAt: new Date().toISOString(),
        email: user.email,
        githubUsername: user.displayName,
      });

      // 2. Firestore 플래시카드 서브컬렉션 삭제 (Auth 삭제 전에 처리해야 함)
      const flashcardsRef = collection(store, 'users', user.uid, 'flashcards');
      const flashcardsSnapshot = await getDocs(flashcardsRef);
      const deletePromises = flashcardsSnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);

      // 3. Firestore 사용자 데이터 삭제
      await deleteDoc(doc(store, 'users', user.uid));

      // 4. Firebase Auth 계정 삭제 (항상 마지막 — 이후 인증 불가)
      await user.delete();
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
          setMessage({ 
            type: 'error', 
            text: '보안을 위해 재인증이 필요합니다. 팝업에서 GitHub 로그인을 진행해주세요.' 
          });
          
          await reauthenticateWithPopup(user, githubProvider);

          // 재인증 후 다시 계정 삭제 시도
          setMessage({ type: 'error', text: '재인증되었습니다. 다시 탈퇴를 시도합니다...' });
          
          // 1. 탈퇴 기록 생성
          await setDoc(doc(store, 'deletedUsers', user.uid), {
            deletedAt: new Date().toISOString(),
            email: user.email,
            githubUsername: user.displayName,
          });

          // 2. Firestore 플래시카드 서브컬렉션 삭제 (Auth 삭제 전에 처리해야 함)
          const flashcardsRef = collection(store, 'users', user.uid, 'flashcards');
          const flashcardsSnapshot = await getDocs(flashcardsRef);
          const deletePromises = flashcardsSnapshot.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletePromises);

          // 3. Firestore 사용자 데이터 삭제
          await deleteDoc(doc(store, 'users', user.uid));

          // 4. Firebase Auth 계정 삭제 (항상 마지막 — 이후 인증 불가)
          await user.delete();
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
      <div className="min-h-screen flex justify-center items-start bg-bg pt-20 px-5 pb-5">
        <div className="bg-surface rounded-2xl p-10 max-w-[600px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.4)] text-center">
          <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-body">설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center items-start bg-bg pt-20 px-5 pb-5">
      <div className="bg-surface rounded-2xl p-10 max-w-[600px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.4)] max-[768px]:p-6">
        {/* 공지사항: config/notice 문서의 message가 있을 때만 표시 */}
        {noticeMessage && (
          <div className="flex items-start gap-3 bg-[#f59e0b]/10 border-2 border-[#f59e0b]/40 rounded-xl p-4 mb-8 animate-fade-in max-[768px]:p-3 max-[768px]:mb-6">
            <Megaphone className="w-7 h-7 shrink-0 max-[768px]:w-6 max-[768px]:h-6 text-[#f59e0b]" aria-hidden />
            <p className="m-0 flex-1 text-[#fbbf24] text-[0.9rem] leading-relaxed font-medium max-[768px]:text-[0.85rem]">
              {noticeMessage}
            </p>
          </div>
        )}

        {/* 구독 */}
        <div className="flex flex-col gap-2 mb-8">
          <h2 className="m-0 text-text-body text-base font-semibold max-[768px]:text-[0.95rem] flex items-center gap-2">
            구독
          </h2>
          <div className="flex flex-wrap items-center gap-3 p-4 bg-surface-light border-2 border-border rounded-lg">
            <span className="font-semibold text-text">
              {tier === 'pro' ? (
                <>Pro {subscription?.subscriptionPeriodEnd && <span className="text-text-light text-[0.85rem] font-normal">(만료: {new Date(subscription.subscriptionPeriodEnd).toLocaleDateString('ko-KR')})</span>}</>
              ) : (
                'Free'
              )}
            </span>
            {/* TODO: 준비 완료 시 onClick을 navigateToPricing으로 복구 */}
            {tier === 'free' && (
              <Button
                type="button"
                size="sm"
                onClick={() => alert('Pro 업그레이드는 준비 중이에요. 조금만 기다려 주세요.')}
              >
                Pro로 업그레이드
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center gap-3">
              <label htmlFor="repository" className="font-semibold text-text text-[0.95rem] block m-0 uppercase-none">
                GitHub 리포지토리
                <span className="text-error ml-1">*</span>
                {tier === 'pro' && (
                  <span className="text-text-light font-normal text-[0.8rem] ml-2">(최대 {MAX_REPOS_PRO}개)</span>
                )}
              </label>
            </div>

            <p className="m-0 mb-3 text-[0.85rem] text-text-light font-medium">
              {repositories.length > 0
                ? `총 ${repositories.length}개의 리포지토리를 찾았습니다`
                : '접근 가능한 리포지토리가 없습니다'}
            </p>

            {loadingRepos ? (
              <div className="flex items-center gap-3 p-4 bg-surface-light border-2 border-border rounded-lg text-text-body text-[0.95rem]">
                <div className="w-5 h-5 border-[3px] border-border border-t-primary rounded-full animate-spin shrink-0"></div>
                <span>리포지토리 목록을 불러오는 중...</span>
              </div>
            ) : reposFetchError ? (
              <div className="flex items-center gap-3 p-4 bg-muted border-2 border-border rounded-lg text-foreground text-[0.95rem]">
                <span>리포지토리를 불러오지 못했습니다.</span>
                <Button variant="outline" size="sm" className="ml-2" onClick={() => fetchRepositories()}>
                  다시 시도
                </Button>
              </div>
            ) : (
              <>
                {/* 선택된 레포 목록 (Pro일 때 여러 개, Free일 때 1개) */}
                {selectedRepos.length > 0 && (
                  <ul className="list-none m-0 p-0 flex flex-col gap-2 mb-3">
                    {selectedRepos.map((r) => {
                      const repoMeta = repositories.find((x) => x.full_name === r.fullName);
                      const branchData = branchesByRepo[r.fullName];
                      return (
                        <li
                          key={r.fullName}
                          className="flex flex-col gap-3 px-4 py-3 bg-surface-light border-2 border-border rounded-lg"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <span className="font-mono font-semibold text-text text-[0.95rem] block truncate">{r.fullName}</span>
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary text-[0.8rem] no-underline hover:underline truncate block"
                              >
                                {r.url}
                              </a>
                            </div>
                            {tier === 'pro' && selectedRepos.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={`${r.fullName} 제거`}
                                className="shrink-0 hover:bg-destructive/10 hover:border-destructive hover:text-destructive"
                                onClick={() => handleRemoveRepository(r.fullName)}
                              >
                                <X className="w-5 h-5" aria-hidden />
                              </Button>
                            )}
                            {tier === 'free' && repoMeta && (
                              <span className="text-[0.7rem] px-1.5 py-0.5 rounded bg-border text-text-body whitespace-nowrap shrink-0">{repoMeta.private ? 'Private' : 'Public'}</span>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 min-w-0">
                            <Label htmlFor={`branch-${r.fullName.replace('/', '-')}`} className="text-[0.85rem] text-text-light font-medium flex items-center gap-1.5">
                              <GitBranch className="w-4 h-4 shrink-0" aria-hidden />
                              브랜치 (선택사항)
                            </Label>
                            <Select
                              value={r.branch || '__default__'}
                              onValueChange={(v) => handleBranchChange(r.fullName, v)}
                              disabled={branchData?.loading || saving}
                            >
                              <SelectTrigger id={`branch-${r.fullName.replace('/', '-')}`} className="min-w-0 w-full max-w-[280px]">
                                <SelectValue placeholder="기본 브랜치 (main)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__default__">기본 브랜치 (main)</SelectItem>
                                {branchData?.list.map((b) => (
                                  <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {branchData?.loading && (
                              <span className="text-[0.75rem] text-text-muted">로딩 중...</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* 레포 선택 드롭다운: Free는 1개 선택, Pro는 "추가"로 여러 개 */}
                <div className="relative w-full" ref={dropdownRef}>
                  <button
                    type="button"
                    id="repository"
                    className={`w-full px-4 py-3 border-2 border-border rounded-lg bg-surface-light cursor-pointer flex items-center justify-between gap-3 transition-all duration-200 text-left text-base hover:border-border-medium disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-surface ${isDropdownOpen ? 'border-primary shadow-[0_0_0_3px_rgba(7,166,107,0.15)]' : ''} ${saving ? 'cursor-wait opacity-80' : ''}`}
                    onClick={() => !saving && (tier === 'free' ? selectedRepos.length < 1 : canAddMore) && setIsDropdownOpen(!isDropdownOpen)}
                    disabled={repositories.length === 0 || saving || (tier === 'free' && selectedRepos.length >= 1) || (tier === 'pro' && !canAddMore)}
                  >
                    {saving ? (
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-5 h-5 border-[3px] border-border border-t-primary rounded-full animate-spin shrink-0"></div>
                        <span className="font-mono font-medium text-text">저장 중...</span>
                      </div>
                    ) : tier === 'pro' ? (
                      <span className="text-text-muted">레포 추가 (최대 {MAX_REPOS_PRO}개)</span>
                    ) : (
                      <span className={selectedRepos.length ? 'font-mono font-medium text-text' : 'text-text-muted'}>
                        {selectedRepos.length ? selectedRepos[0].fullName : '리포지토리를 선택하세요'}
                      </span>
                    )}
                    {isDropdownOpen ? <ChevronUp className="w-4 h-4 text-text-light shrink-0" aria-hidden /> : <ChevronDown className="w-4 h-4 text-text-light shrink-0" aria-hidden />}
                  </button>

                  {isDropdownOpen && !saving && (
                    <div className="absolute top-[calc(100%+4px)] left-0 right-0 max-h-[300px] overflow-y-auto bg-surface border-2 border-primary rounded-lg shadow-[0_10px_25px_rgba(0,0,0,0.4)] z-[1000] animate-fade-in">
                      {(tier === 'free' ? repositories : availableReposForDropdown).map((repo) => (
                        <div
                          key={repo.id}
                          className="px-4 py-3 cursor-pointer transition-colors duration-150 border-b border-border last:border-b-0 hover:bg-surface-light"
                          onClick={() => (tier === 'free' ? handleRepositorySelect(repo) : handleAddRepository(repo))}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span className="font-mono font-semibold text-text text-[0.95rem]">{repo.full_name}</span>
                            <span className="text-[0.7rem] px-1.5 py-0.5 rounded bg-border text-text-body whitespace-nowrap">{repo.private ? 'Private' : 'Public'}</span>
                          </div>
                          {repo.description && (
                            <div className="text-[0.85rem] text-text-light leading-snug mt-1 pl-0.5">{repo.description}</div>
                          )}
                        </div>
                      ))}
                      {tier === 'pro' && availableReposForDropdown.length === 0 && (
                        <div className="px-4 py-3 text-text-muted text-[0.9rem]">추가할 레포가 없거나 이미 최대 개수입니다.</div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 알림: 매일 8시 PUSH 리마인더 켜기/끄기 */}
          <div className="flex flex-col gap-2">
            <h2 className="m-0 text-text-body text-base font-semibold max-[768px]:text-[0.95rem] flex items-center gap-2">
              <span className="inline-flex shrink-0" aria-hidden="true">
                <Bell className="w-5 h-5 text-text-light" aria-hidden />
              </span>
              알림
            </h2>
            <p className="m-0 mb-3 text-[0.85rem] text-text-light font-medium">
              {tier === 'pro' ? '원하는 시각에 복습 리마인더를 보내드려요.' : '매일 오전 8시에 복습 리마인더를 보내드려요.'}
            </p>
            {tier === 'pro' && (
              <div className="flex items-center justify-between gap-4 p-4 bg-muted border-2 border-border rounded-lg mb-3">
                <Label htmlFor="push-hour" className="font-semibold text-[0.95rem]">
                  알림 희망 시 (내 시간대)
                </Label>
                <Select
                  value={String(preferredPushHour)}
                  onValueChange={async (v) => {
                    const hour = Number(v);
                    setPreferredPushHour(hour);
                    const user = auth.currentUser;
                    if (!user) return;
                    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                    try {
                      await updateDoc(doc(store, 'users', user.uid), {
                        preferredPushHour: hour,
                        preferredPushTimezone: timeZone,
                        updatedAt: new Date().toISOString()
                      });
                    } catch (err) {
                      console.error('preferredPushHour 저장 실패:', err);
                      setMessage({ type: 'error', text: '알림 시간 저장에 실패했습니다.' });
                    }
                  }}
                >
                  <SelectTrigger id="push-hour" className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>{i}시</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 p-4 bg-muted border-2 border-border rounded-lg">
              <Label htmlFor="push-toggle" className="font-semibold text-[0.95rem] cursor-pointer flex-1">
                PUSH 알림
              </Label>
              <Switch
                id="push-toggle"
                checked={pushEnabled}
                disabled={pushUpdating}
                onCheckedChange={(checked) => handlePushToggle(checked)}
                aria-label={pushEnabled ? 'PUSH 알림 끄기' : 'PUSH 알림 켜기'}
              />
            </div>
          </div>

          {tier === 'pro' && (
            <div className="flex flex-col gap-2">
              <h2 className="m-0 text-text-body text-base font-semibold max-[768px]:text-[0.95rem]">플래시카드 재생성</h2>
              <p className="m-0 mb-3 text-[0.85rem] text-text-light font-medium">
                오늘 분 플래시카드를 다시 만들 수 있어요. (일 3회까지)
              </p>
              <div className="flex flex-wrap items-center gap-3 p-4 bg-muted border-2 border-border rounded-lg">
                <Button
                  type="button"
                  size="sm"
                  disabled={regenerating || !canRegenerate}
                  onClick={async () => {
                    setRegenerating(true);
                    setMessage(null);
                    try {
                      await regenerateTodayFlashcards();
                      setMessage({ type: 'success', text: '오늘 플래시카드를 삭제했습니다. 잠시 후 카드가 다시 생성됩니다.' });
                      setTimeout(() => window.location.reload(), 800);
                    } catch (e: unknown) {
                      const err = e as { response?: { data?: { error?: string }; status?: number } };
                      const msg = err.response?.status === 429
                        ? '오늘 재생성 한도(3회)를 모두 사용했습니다.'
                        : (err.response?.data?.error || '재생성에 실패했습니다.');
                      setMessage({ type: 'error', text: msg });
                    } finally {
                      setRegenerating(false);
                    }
                  }}
                >
                  {regenerating ? '처리 중...' : '지금 다시 만들기'}
                </Button>
                <span className="text-muted-foreground text-[0.85rem]">
                  오늘 {regenerateCount}/3회 사용
                </span>
              </div>
            </div>
          )}

          {tier === 'pro' && (
            <div className="flex flex-col gap-2">
              <h2 className="m-0 text-text-body text-base font-semibold max-[768px]:text-[0.95rem]">과거 날짜 복습</h2>
              <p className="m-0 mb-3 text-[0.85rem] text-text-light font-medium">
                저장된 날짜의 플래시카드를 다시 볼 수 있어요.
              </p>
              <div className="flex flex-wrap items-center gap-3 p-4 bg-muted border-2 border-border rounded-lg">
                <Popover open={pastDatePopoverOpen} onOpenChange={setPastDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[0.95rem] justify-start text-left font-normal min-w-[10rem]"
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {pastDateInput
                        ? format(new Date(pastDateInput + 'T12:00:00'), 'PPP', { locale: ko })
                        : '날짜 선택'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={pastDateInput ? new Date(pastDateInput + 'T12:00:00') : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setPastDateInput(format(date, 'yyyy-MM-dd'));
                          setPastDatePopoverOpen(false);
                        }
                      }}
                      disabled={(date) => date.toLocaleDateString('en-CA') > getCurrentDate()}
                      endMonth={new Date()}
                      className="rounded-lg border-0"
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  size="sm"
                  disabled={!pastDateInput}
                  onClick={() => {
                    if (pastDateInput) {
                      setSelectedPastDate(pastDateInput);
                      setCurrentPage('flashcard');
                    }
                  }}
                >
                  해당 날짜 카드 보기
                </Button>
              </div>
            </div>
          )}

          {message && (
            <Alert variant={message.type === 'success' ? 'success' : 'destructive'} className="my-4 animate-slide-up text-[0.95rem]">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {selectedRepos.length > 0 && (
            <Button
              type="button"
              className="w-full mt-5 mb-5 py-3 text-base"
              onClick={handleSaveSettings}
              disabled={saving}
            >
              {saving ? '저장 중...' : '설정 저장'}
            </Button>
          )}
        </div>
        <p className="m-0 mb-2 text-[0.85rem] text-text-light text-left leading-relaxed flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" aria-hidden />
          GitHub OAuth로 로그인하여 접근 가능한 모든 리포지토리가 표시됩니다.
        </p>
        <p className="m-0 text-[0.85rem] text-text-light text-left leading-relaxed flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1"><Lock className="w-4 h-4 shrink-0" aria-hidden /> = Private 리포지토리</span>, <span className="inline-flex items-center gap-1"><Globe className="w-4 h-4 shrink-0" aria-hidden /> = Public 리포지토리</span>
        </p>

        {/* 릴리즈 노트 */}
        <div className="border-t border-border text-left mt-8 pt-5 max-[768px]:pt-4">
          <h2 className="m-0 mb-2 text-text-body text-base font-semibold max-[768px]:text-[0.95rem] flex items-center gap-2"><FileText className="w-5 h-5 shrink-0" aria-hidden />릴리즈 노트</h2>
          <p className="m-0 mb-4 text-text-light text-[0.9rem] leading-relaxed max-[768px]:text-[0.85rem]">
            새로운 기능과 개선사항을 확인하세요
          </p>
          <Button asChild>
            <a
              href="https://www.notion.so/chucoding/RELEASE_NOTE-287fd64d44a080cd9564d2492b7de718"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 no-underline max-[768px]:text-[0.9rem] max-[768px]:px-5 max-[768px]:py-2.5"
            >
              <ClipboardList className="w-5 h-5 shrink-0" aria-hidden />
              릴리즈 노트 보기
            </a>
          </Button>
        </div>

        {/* 계정 관리 */}
        <div className="border-t border-border text-left mt-4 pt-5 max-[768px]:pt-4">
          <h2 className="m-0 mb-2 text-text-body text-base font-semibold max-[768px]:text-[0.95rem] flex items-center gap-2"><User className="w-5 h-5 shrink-0" aria-hidden />계정 관리</h2>
          <p className="m-0 mb-4 text-text-light text-[0.9rem] leading-relaxed max-[768px]:text-[0.85rem]">
            계정 로그아웃 또는 서비스 탈퇴를 진행할 수 있습니다.
          </p>
          <div className="flex gap-3 mt-4 max-[768px]:flex-col">
            <Button type="button" className="flex-1 max-[768px]:w-full" onClick={handleLogout}>
              <LogOut className="w-5 h-5 shrink-0 inline-block align-middle mr-1.5" aria-hidden />
              로그아웃
            </Button>
            <Button type="button" variant="outline" className="flex-1 max-[768px]:w-full" onClick={() => setShowDeleteDialog(true)}>
              서비스 탈퇴
            </Button>
          </div>
        </div>

        {/* 이용약관 링크 */}
        <div className="border-t border-border text-center mt-4 pt-4">
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-text-muted no-underline text-[0.8rem] transition-colors duration-200 hover:text-primary hover:underline">이용약관</a>
          {' · '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-text-muted no-underline text-[0.8rem] transition-colors duration-200 hover:text-primary hover:underline">개인정보처리방침</a>
        </div>
      </div>

      {/* 서비스 탈퇴 확인 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => { if (!open && !deleting) { setShowDeleteDialog(false); setDeleteConfirmText(''); setMessage(null); } }}>
        <DialogContent showClose={!deleting} className="max-w-[500px] max-h-[90vh] overflow-y-auto p-8 max-[768px]:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl max-[768px]:text-xl">
              <UserX className="w-7 h-7 shrink-0" aria-hidden />
              서비스 탈퇴
            </DialogTitle>
          </DialogHeader>
          <p className="m-0 mb-5 text-muted-foreground text-base leading-relaxed">
            정말 탈퇴하시겠어요? 걱정하지 마세요, 언제든 다시 돌아올 수 있습니다.
          </p>
          <div className="m-0 mb-6 p-4 bg-muted border border-border rounded-lg">
            <p className="m-0 mb-3 text-foreground text-[0.95rem] font-semibold flex items-center gap-2"><Sparkles className="w-5 h-5 shrink-0" aria-hidden />탈퇴 시 안내사항</p>
            <ul className="m-0 pl-5 text-muted-foreground">
              <li className="my-2 leading-relaxed text-[0.9rem]">저장된 모든 데이터가 삭제됩니다</li>
              <li className="my-2 leading-relaxed text-[0.9rem]">탈퇴 시 다음날부터 재가입할 수 있습니다</li>
              <li className="my-2 leading-relaxed text-[0.9rem] text-primary font-medium mt-3 pt-3 border-t border-dashed border-border flex items-center gap-2"><Lightbulb className="w-4 h-4 shrink-0" aria-hidden />보안을 위해 GitHub 재인증 팝업이 표시될 수 있습니다</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmText" className="text-[0.95rem]">
              확인을 위해 <strong>"회원탈퇴"</strong>를 입력해주세요:
            </Label>
            <Input
              id="confirmText"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="회원탈퇴"
              disabled={deleting}
              className="py-3"
            />
          </div>

          {message && message.type === 'error' && (
            <Alert variant="destructive" className="my-4">
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex gap-3 mt-6 justify-end max-[768px]:flex-col">
            <Button
              type="button"
              variant="outline"
              className="min-w-[100px] max-[768px]:w-full"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmText('');
                setMessage(null);
              }}
              disabled={deleting}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-w-[100px] max-[768px]:w-full bg-muted-foreground text-primary-foreground hover:bg-muted-foreground/90"
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== '회원탈퇴'}
            >
              {deleting ? '탈퇴 처리 중...' : '탈퇴하기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
