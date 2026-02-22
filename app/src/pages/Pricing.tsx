import React, { useState } from 'react';
import { createCheckoutSession, type PriceId } from '../api/subscription-api';

const Pricing: React.FC = () => {
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (priceId: PriceId) => {
    setError(null);
    setLoading(priceId);
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const { url } = await createCheckoutSession(priceId, base);
      if (url) window.location.href = url;
      else setError('결제 URL을 받지 못했습니다.');
    } catch (e: unknown) {
      const message = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
        : (e instanceof Error ? e.message : '결제 시작에 실패했습니다.');
      setError(message || '결제 시작에 실패했습니다.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-start bg-bg pt-20 px-5 pb-5">
      <div className="bg-surface rounded-2xl p-10 max-w-[600px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.4)] max-[768px]:p-6">
        <h1 className="text-2xl font-bold text-text mb-2">요금제</h1>
        <p className="text-text-body text-[0.95rem] mb-8 leading-relaxed">Free로 충분히 사용하거나, Pro로 더 많은 기능을 쓰세요.</p>

        <div className="overflow-x-auto mb-8">
          <table className="w-full border-collapse text-left text-[0.9rem]">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 pr-4 font-semibold text-text">기능</th>
                <th className="py-3 px-4 font-semibold text-text">Free</th>
                <th className="py-3 pl-4 font-semibold text-primary">Pro</th>
              </tr>
            </thead>
            <tbody className="text-text-body">
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4">리포지토리</td>
                <td className="py-2.5 px-4">1개</td>
                <td className="py-2.5 pl-4">5개</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4">복습 기간</td>
                <td className="py-2.5 px-4">7일</td>
                <td className="py-2.5 pl-4">30일·90일</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4">수동 재생성</td>
                <td className="py-2.5 px-4">—</td>
                <td className="py-2.5 pl-4">3회/일</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4">알림 시간</td>
                <td className="py-2.5 px-4">08:00 고정</td>
                <td className="py-2.5 pl-4">사용자 지정</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-2.5 pr-4">과거 날짜 복습</td>
                <td className="py-2.5 px-4">—</td>
                <td className="py-2.5 pl-4">가능</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">내보내기</td>
                <td className="py-2.5 px-4">—</td>
                <td className="py-2.5 pl-4">가능</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 max-[480px]:grid-cols-1">
          <div className="border-2 border-border rounded-xl p-5 bg-surface-light transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            <p className="font-bold text-text text-lg mb-1">월간</p>
            <p className="text-text-light text-sm mb-4">$6/월 · ₩7,900/월</p>
            <button
              type="button"
              disabled={!!loading}
              onClick={() => handleCheckout('monthly')}
              className="w-full py-3 px-4 bg-primary text-bg font-semibold rounded-lg border-none cursor-pointer transition-colors duration-200 hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === 'monthly' ? '이동 중...' : '월간 구독'}
            </button>
          </div>
          <div className="border-2 border-primary rounded-xl p-5 bg-surface-light transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(7,166,107,0.2)]">
            <p className="font-bold text-primary text-lg mb-1">연간</p>
            <p className="text-text-light text-sm mb-4">$58/년 · ₩76,000/년</p>
            <button
              type="button"
              disabled={!!loading}
              onClick={() => handleCheckout('yearly')}
              className="w-full py-3 px-4 bg-primary text-bg font-semibold rounded-lg border-none cursor-pointer transition-colors duration-200 hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === 'yearly' ? '이동 중...' : '연간 구독'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-error-bg text-error-text border border-error/30 text-[0.9rem] mb-4" role="alert">
            {error}
          </div>
        )}

        <p className="text-text-muted text-[0.85rem] leading-relaxed">
          결제는 Stripe를 통해 안전하게 처리됩니다. 세금·부가세는 결제 수단에 따라 적용될 수 있습니다.
        </p>
      </div>
    </div>
  );
};

export default Pricing;
