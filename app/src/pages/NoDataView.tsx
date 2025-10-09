import React from 'react';
import { useNavigationStore } from '../stores/navigationStore';
import './NoDataView.css';

const NoDataView: React.FC = () => {
  const { navigateToSettings } = useNavigationStore();
  return (
    <div className="nodata-container">
      <div className="nodata-card">
        <img 
          src="/nodata.png" 
          alt="데이터 없음" 
          className="nodata-image"
        />
        <h2 className="nodata-title">
          📭 플래시카드가 없습니다
        </h2>
        <p className="nodata-description">
          최근 커밋에서 학습할 내용을 찾지 못했습니다
        </p>
        <p className="nodata-hint">
          ⚙️ 설정 에서 다른 리포지토리나 브랜치를 시도해보세요
        </p>
        
        <button
          onClick={() => {
            navigateToSettings();
          }}
          className="nodata-settings-button"
        >
          ⚙️ 설정으로 이동
        </button>
      </div>
    </div>
  );
};

export default NoDataView;
