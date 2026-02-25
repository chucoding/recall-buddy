import React from 'react';
import { useNavigationStore } from '../stores/navigationStore';
import Card from '../components/Card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Settings } from 'lucide-react';

const NoDataView: React.FC = () => {
  const { navigateToSettings } = useNavigationStore();
  return (
    <Card>
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted border border-border flex items-center justify-center" aria-hidden>
        <ClipboardList className="w-10 h-10 text-muted-foreground" aria-hidden />
      </div>
      <h2 className="text-xl mb-2 font-semibold text-foreground leading-tight">
        플래시카드가 없습니다
      </h2>
      <p className="text-[13px] mb-1.5 text-muted-foreground leading-snug">
        최근 커밋에서 학습할 내용을 찾지 못했습니다
      </p>
      <p className="text-[11px] mb-6 text-muted-foreground leading-snug">
        설정에서 다른 리포지토리나 브랜치를 시도해보세요
      </p>

      <Button
        onClick={() => navigateToSettings()}
        className="inline-flex items-center justify-center gap-2 rounded-xl"
      >
        <Settings className="w-4 h-4" aria-hidden />
        설정으로 이동
      </Button>
    </Card>
  );
};

export default NoDataView;
