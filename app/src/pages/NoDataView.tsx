import React from 'react';
import { useNavigationStore } from '../stores/navigationStore';
import Card from '../components/Card';
import { ClipboardList, Settings } from 'lucide-react';

const NoDataView: React.FC = () => {
  const { navigateToSettings } = useNavigationStore();
  return (
    <Card>
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-surface-light border border-border flex items-center justify-center" aria-hidden>
        <ClipboardList className="w-10 h-10 text-text-muted" aria-hidden />
      </div>
      <h2 className="text-xl mb-2 font-semibold text-text leading-tight">
        플래시카드가 없습니다
      </h2>
      <p className="text-[13px] mb-1.5 text-text-light leading-snug">
        최근 커밋에서 학습할 내용을 찾지 못했습니다
      </p>
      <p className="text-[11px] mb-6 text-text-muted leading-snug">
        설정에서 다른 리포지토리나 브랜치를 시도해보세요
      </p>

      <button
        onClick={() => navigateToSettings()}
        className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-primary text-bg border-none rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 hover:bg-primary-dark hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(7,166,107,0.3)]"
      >
        <Settings className="w-4 h-4" aria-hidden />
        설정으로 이동
      </button>
    </Card>
  );
};

export default NoDataView;
