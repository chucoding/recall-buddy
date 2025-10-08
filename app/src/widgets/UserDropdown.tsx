import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../firebase';

interface UserDropdownProps {
  user: User;
  onNavigateToSettings: () => void;
}

const UserDropdown: React.FC<UserDropdownProps> = ({ user, onNavigateToSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    onNavigateToSettings();
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(255, 255, 255, 0.95)',
          color: '#333',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.9rem',
          fontWeight: 600,
          transition: 'all 0.2s',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(10px)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        }}
      >
        <span>👤</span>
        <span>{user.displayName || user.email}</span>
        <span style={{
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          fontSize: '0.7rem',
        }}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(10px)',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            minWidth: '200px',
            overflow: 'hidden',
            zIndex: 1001,
          }}
        >
          <button
            onClick={handleSettingsClick}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '0.9rem',
              color: '#333',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span>⚙️</span>
            <span>설정</span>
          </button>

          <div style={{
            height: '1px',
            background: '#e0e0e0',
            margin: '0',
          }} />

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '0.9rem',
              color: '#d32f2f',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(211, 47, 47, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span>🚪</span>
            <span>로그아웃</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;

