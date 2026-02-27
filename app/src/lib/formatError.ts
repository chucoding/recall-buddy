/**
 * 기술적 에러 메시지를 유저 친화적 한글로 변환
 * 네트워크, API 오류 등 사용자 노출용 메시지 정규화
 */
export function formatFileErrorForUser(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('network') || lower.includes('network error')) return '인터넷 연결을 확인해주세요.';
  if (lower.includes('timeout') || lower.includes('time out')) return '요청이 너무 오래 걸렸어요. 잠시 후 다시 시도해주세요.';
  if (lower.includes('404') || lower.includes('not found')) return '파일을 찾을 수 없어요.';
  if (lower.includes('403') || lower.includes('forbidden')) return '접근 권한이 없어요.';
  if (lower.includes('500') || lower.includes('server')) return '서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해주세요.';
  return '파일을 불러오지 못했어요. 다시 시도해주세요.';
}
