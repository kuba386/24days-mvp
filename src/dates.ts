const pad = (n: number) => String(n).padStart(2, '0');

// Даты хранятся как локальные YYYY-MM-DD: пользователь живёт в своём часовом поясе, не в UTC
export const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayKey = () => toDateKey(new Date());

export function shiftDateKey(key: string, delta: number) {
  const [y, m, d] = key.split('-').map(Number);
  return toDateKey(new Date(y, m - 1, d + delta));
}

export function currentStreak(doneDates: Iterable<string>, today = todayKey()) {
  const set = new Set(doneDates);
  let cursor = set.has(today) ? today : shiftDateKey(today, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

export function pluralDays(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} день`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} дня`;
  return `${n} дней`;
}
