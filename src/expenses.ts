import { lastDateKeys, shiftDateKey, todayKey } from './dates';

export type Rating = '+' | '=' | '-';

export type Expense = {
  id: string;
  // Сумма; для дохода — тоже положительное число, отличает флаг inc
  a: number;
  // Категория (только у расходов)
  c: string;
  inc?: boolean;
  // Оценка по первому из трёх вопросов: радует / нейтрально / зря
  r?: Rating;
  // Не планировал: покупка по настроению
  u?: boolean;
};

export type ExpenseLog = Record<string, Expense[]>;

export const DEFAULT_CATEGORIES = [
  'Еда дома',
  'Кафе',
  'Транспорт',
  'Подписки',
  'Дом',
  'Здоровье',
  'Подарки',
  'Развлечения',
  'Разное',
];
export const OTHER_CATEGORY = 'Разное';
export const CATEGORY_MAX = 14;
export const AMOUNT_MAX = 1_000_000_000;

const spends = (list: Expense[] | undefined) => (list ?? []).filter((e) => !e.inc);
const incomes = (list: Expense[] | undefined) => (list ?? []).filter((e) => e.inc);
const sum = (list: Expense[]) => list.reduce((s, e) => s + e.a, 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

export const spentOn = (log: ExpenseLog, date: string) => sum(spends(log[date]));
export const earnedOn = (log: ExpenseLog, date: string) => sum(incomes(log[date]));

// Окно из n дней, заканчивающееся датой end (включительно)
export const windowKeys = (n: number, end = todayKey()) => lastDateKeys(n, end);

export const spentIn = (log: ExpenseLog, keys: string[]) => keys.reduce((s, k) => s + spentOn(log, k), 0);
export const earnedIn = (log: ExpenseLog, keys: string[]) => keys.reduce((s, k) => s + earnedOn(log, k), 0);

export const hasAnyRecords = (log: ExpenseLog) => Object.values(log).some((l) => l.length > 0);

export function byCategory(log: ExpenseLog, keys: string[]) {
  const totals = new Map<string, number>();
  for (const k of keys) for (const e of spends(log[k])) totals.set(e.c, (totals.get(e.c) ?? 0) + e.a);
  return [...totals.entries()].sort((a, b) => b[1] - a[1]);
}

// Дни подряд, в которые что-то записано (сегодняшний пустой день серию не рвёт)
export function recordingStreak(log: ExpenseLog, today = todayKey()) {
  const has = (k: string) => (log[k]?.length ?? 0) > 0;
  let cursor = has(today) ? today : shiftDateKey(today, -1);
  let n = 0;
  while (has(cursor)) {
    n++;
    cursor = shiftDateKey(cursor, -1);
  }
  return n;
}

export type MoneyMetric =
  | 'expCountToday'
  | 'expStreak'
  | 'lifeHoursMax'
  | 'weekBalance'
  | 'otherShare'
  | 'weekVsPrev'
  | 'unplannedToday'
  | 'wasteShare';

export const MONEY_METRICS: readonly MoneyMetric[] = [
  'expCountToday',
  'expStreak',
  'lifeHoursMax',
  'weekBalance',
  'otherShare',
  'weekVsPrev',
  'unplannedToday',
  'wasteShare',
];

// undefined — данных пока нет, тогда замер вводится вручную
export function moneyMetricValue(
  kind: MoneyMetric,
  log: ExpenseLog,
  hourRate?: number,
  today = todayKey()
): number | undefined {
  if (!hasAnyRecords(log)) return undefined;
  const week = windowKeys(7, today);

  switch (kind) {
    case 'expCountToday':
      return spends(log[today]).length;
    case 'expStreak':
      return recordingStreak(log, today);
    case 'lifeHoursMax': {
      const items = spends(log[today]);
      if (!hourRate || hourRate <= 0 || items.length === 0) return undefined;
      return round1(Math.max(...items.map((e) => e.a)) / hourRate);
    }
    case 'weekBalance':
      return earnedIn(log, week) === 0 && spentIn(log, week) === 0
        ? undefined
        : Math.round(earnedIn(log, week) - spentIn(log, week));
    case 'otherShare': {
      const keys = windowKeys(14, today);
      const total = spentIn(log, keys);
      if (total === 0) return undefined;
      const other = byCategory(log, keys).find(([c]) => c === OTHER_CATEGORY)?.[1] ?? 0;
      return Math.round((other / total) * 100);
    }
    case 'weekVsPrev': {
      const prev = spentIn(log, windowKeys(7, shiftDateKey(today, -7)));
      if (prev === 0) return undefined;
      return Math.round(((spentIn(log, week) - prev) / prev) * 100);
    }
    case 'unplannedToday':
      return spends(log[today]).filter((e) => e.u).length;
    case 'wasteShare': {
      const rated = week.flatMap((k) => spends(log[k])).filter((e) => e.r);
      const total = sum(rated);
      if (total === 0) return undefined;
      return Math.round((sum(rated.filter((e) => e.r === '-')) / total) * 100);
    }
  }
}

export const formatAmount = (n: number) =>
  new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);

export const parseAmount = (raw: string) => {
  const n = Number(raw.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= AMOUNT_MAX ? Math.round(n * 100) / 100 : null;
};
