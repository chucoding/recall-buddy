import React from 'react';
import { useNavigationStore } from '../stores/navigationStore';
import Card from '../components/Card';

const NoDataView: React.FC = () => {
  const { navigateToSettings } = useNavigationStore();
  return (
    <Card>
      <img 
        src="/nodata.png" 
        alt="데이터 없음" 
        className="w-[140px] h-auto mb-4 drop-shadow-[0_4px_8px_rgba(0,0,0,0.2)]"
      />
      <h2 className="text-xl mb-2 font-semibold leading-tight">
        📭 플래시카드가 없습니다
      </h2>
      <p className="text-[13px] mb-1.5 opacity-90 leading-snug">
        최근 커밋에서 학습할 내용을 찾지 못했습니다
      </p>
      <p className="text-[11px] mb-6 opacity-70 leading-snug">
        ⚙️ 설정 에서 다른 리포지토리나 브랜치를 시도해보세요
      </p>
      
      <button
        onClick={() => {
          navigateToSettings();
        }}
        className="bg-white/20 text-white border-2 border-white/30 rounded-[10px] px-5 py-2.5 text-sm font-semibold cursor-pointer transition-all duration-300 backdrop-blur-sm flex items-center gap-1.5 mx-auto hover:bg-white/30 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.2)]"
      >
        ⚙️ 설정으로 이동
      </button>
    </Card>
  );
};

export default NoDataView;
