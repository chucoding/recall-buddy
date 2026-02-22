const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 오늘 날짜를 KST 기준 YYYY-MM-DD로 반환.
 * 플래시카드 문서 키, 재생성 횟수 등 서버·클라이언트 일치를 위해 KST 고정.
 */
export function getCurrentDate(): string {
  const utcNow = Date.now();
  const kstNow = new Date(utcNow + KST_OFFSET_MS);
  return kstNow.toISOString().slice(0, 10);
}

/**
 * KST 기준 "며칠 전" 날짜 문자열 (YYYY-MM-DD).
 */
export function getKstDateStringDaysAgo(daysAgo: number): string {
  const todayKst = getCurrentDate();
  const atNoonKst = new Date(`${todayKst}T12:00:00+09:00`);
  const past = new Date(atNoonKst.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return past.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

/**
 * KST 기준 해당 날짜(YYYY-MM-DD)의 00:00 ~ 23:59:59.999 구간을
 * GitHub API용 UTC Date로 반환.
 */
export function getKstDayRange(dateStr: string): { since: Date; until: Date } {
  const since = new Date(`${dateStr}T00:00:00+09:00`);
  const until = new Date(`${dateStr}T23:59:59.999+09:00`);
  return { since, until };
}
