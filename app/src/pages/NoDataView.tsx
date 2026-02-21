import React from 'react';
import { useNavigationStore } from '../stores/navigationStore';
import Card from '../components/Card';

const NoDataView: React.FC = () => {
  const { navigateToSettings } = useNavigationStore();
  return (
    <Card>
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-surface-light border border-border flex items-center justify-center" aria-hidden>
        <svg className="w-10 h-10 text-text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
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
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
        설정으로 이동
      </button>
    </Card>
  );
};

export default NoDataView;
