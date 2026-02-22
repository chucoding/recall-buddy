/**
 * 오늘 날짜를 사용자 디바이스(로컬) 타임존 기준 YYYY-MM-DD로 반환.
 * 해외 유저 포함해 각자 기준 "오늘"에 맞게 플래시카드·재생성·날짜 입력이 동작함.
 */
export function getCurrentDate(): string {
  return new Date().toLocaleDateString('en-CA');
}
