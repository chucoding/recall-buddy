import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import './Settings.css';

interface RepositorySettings {
  githubUsername: string;
  repositoryName: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<RepositorySettings>({
    githubUsername: '',
    repositoryName: 'TIL',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 설정 불러오기
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
          setSettings({
            githubUsername: data.githubUsername || '',
            repositoryName: data.repositoryName || 'TIL',
          });
        }
      } catch (error) {
        console.error('설정 불러오기 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 설정 저장
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    
    if (!user) {
      setMessage({ type: 'error', text: '로그인이 필요합니다.' });
      return;
    }

    if (!settings.githubUsername.trim() || !settings.repositoryName.trim()) {
      setMessage({ type: 'error', text: '모든 필드를 입력해주세요.' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      // 기존 데이터 유지하면서 업데이트
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const existingData = userDoc.exists() ? userDoc.data() : {};

      await setDoc(doc(db, 'users', user.uid), {
        ...existingData,
        githubUsername: settings.githubUsername.trim(),
        repositoryName: settings.repositoryName.trim(),
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

  // 입력 변경 핸들러
  const handleChange = (field: keyof RepositorySettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
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
        <div className="settings-header">
          <h1>⚙️ 리포지토리 설정</h1>
          <p>학습 내용을 가져올 GitHub 리포지토리를 설정하세요</p>
        </div>

        <form onSubmit={handleSave} className="settings-form">
          <div className="form-group">
            <label htmlFor="githubUsername">
              GitHub 사용자명
              <span className="required">*</span>
            </label>
            <input
              id="githubUsername"
              type="text"
              value={settings.githubUsername}
              onChange={(e) => handleChange('githubUsername', e.target.value)}
              placeholder="예: hssuh"
              className="form-input"
              required
            />
            <p className="form-hint">
              GitHub 계정 사용자명 (https://github.com/<strong>사용자명</strong>)
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="repositoryName">
              리포지토리 이름
              <span className="required">*</span>
            </label>
            <input
              id="repositoryName"
              type="text"
              value={settings.repositoryName}
              onChange={(e) => handleChange('repositoryName', e.target.value)}
              placeholder="예: TIL"
              className="form-input"
              required
            />
            <p className="form-hint">
              학습 내용이 저장된 리포지토리 이름
            </p>
          </div>

          <div className="form-preview">
            <p className="preview-label">📂 리포지토리 경로:</p>
            <code className="preview-path">
              {settings.githubUsername && settings.repositoryName
                ? `https://github.com/${settings.githubUsername}/${settings.repositoryName}`
                : '설정을 입력해주세요'}
            </code>
          </div>

          {message && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            className="save-button"
            disabled={saving}
          >
            {saving ? '저장 중...' : '💾 설정 저장'}
          </button>
        </form>

        <div className="settings-footer">
          <p className="info-text">
            ℹ️ 리포지토리는 <strong>public</strong>이거나, 
            로그인한 계정이 <strong>접근 권한</strong>이 있어야 합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;

