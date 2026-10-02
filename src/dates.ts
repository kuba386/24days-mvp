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

// Цепочка по правилу «не пропускать дважды»: один пропуск её не рвёт, два подряд — рвут.
// Сегодняшний день пропуском не считается, пока он не закончился.
export function softChain(doneDates: Iterable<string>, today = todayKey()) {
  const set = new Set(doneDates);
  let cursor = set.has(today) ? today : shiftDateKey(today, -1);
  let count = 0;
  let misses = 0;
  while (misses < 2) {
    if (set.has(cursor)) {
      count++;
      misses = 0;
    } else {
      misses++;
    }
    cursor = shiftDateKey(cursor, -1);
  }
  return count;
}

export const lastDateKeys = (n: number, today = todayKey()) =>
  Array.from({ length: n }, (_, i) => shiftDateKey(today, i - n + 1));

// Пропуски за последние n полных дней (сегодня не считается), но не раньше первой отметки
export function missesInLast(doneDates: string[], n: number, today = todayKey()) {
  if (doneDates.length === 0) return 0;
  const set = new Set(doneDates);
  const first = [...doneDates].sort()[0];
  return lastDateKeys(n, shiftDateKey(today, -1)).filter((key) => key >= first && !set.has(key))
    .length;
}

// Лучшая цепочка за всю историю по тому же правилу «не пропускать дважды»
export function bestSoftChain(doneDates: Iterable<string>, today = todayKey()) {
  const sorted = [...new Set(doneDates)].sort();
  if (sorted.length === 0) return 0;
  const set = new Set(sorted);
  let cursor = sorted[0];
  let count = 0;
  let misses = 0;
  let best = 0;
  while (cursor <= today) {
    if (set.has(cursor)) {
      count++;
      misses = 0;
    } else if (++misses >= 2) {
      count = 0;
    }
    best = Math.max(best, count);
    cursor = shiftDateKey(cursor, 1);
  }
  return best;
}

export function weekdayOf(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}
