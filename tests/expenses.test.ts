import { describe, expect, it } from 'vitest';
import {
  byCategory,
  moneyMetricValue,
  parseAmount,
  recordingStreak,
  spentIn,
  windowKeys,
  type ExpenseLog,
} from '../src/expenses';
import { shiftDateKey } from '../src/dates';

const TODAY = '2026-10-07';
const d = (n: number) => shiftDateKey(TODAY, -n);
let id = 0;
const spend = (a: number, c = 'Кафе', extra: object = {}) => ({ id: String(++id), a, c, ...extra });
const earn = (a: number) => ({ id: String(++id), a, c: '', inc: true });

describe('parseAmount', () => {
  it.each([
    ['120', 120],
    ['1 250,50', 1250.5],
    ['0,3', 0.3],
  ])('%s → %s', (raw, n) => expect(parseAmount(raw)).toBe(n));
  it.each(['', 'abc', '0', '-5', '1e12'])('отклоняет %j', (raw) => expect(parseAmount(raw)).toBeNull());
});

describe('суммы и категории', () => {
  const log: ExpenseLog = {
    [d(0)]: [spend(100, 'Кафе'), spend(50, 'Транспорт'), earn(1000)],
    [d(1)]: [spend(300, 'Кафе')],
    [d(9)]: [spend(999, 'Дом')],
  };
  it('траты не включают доходы и берут только своё окно', () => {
    expect(spentIn(log, windowKeys(7, TODAY))).toBe(450);
  });
  it('категории по убыванию суммы', () => {
    expect(byCategory(log, windowKeys(7, TODAY))).toEqual([
      ['Кафе', 400],
      ['Транспорт', 50],
    ]);
  });
});

describe('recordingStreak', () => {
  const rec = (...days: number[]): ExpenseLog => Object.fromEntries(days.map((n) => [d(n), [spend(1)]]));
  it('считает дни подряд', () => expect(recordingStreak(rec(0, 1, 2), TODAY)).toBe(3));
  it('пустой сегодняшний день серию не рвёт', () => expect(recordingStreak(rec(1, 2), TODAY)).toBe(2));
  it('один пропуск рвёт', () => expect(recordingStreak(rec(0, 2, 3), TODAY)).toBe(1));
  it('пусто — ноль', () => expect(recordingStreak({}, TODAY)).toBe(0));
});

describe('moneyMetricValue', () => {
  const log: ExpenseLog = {
    [d(0)]: [spend(750, 'Одежда', { u: true, r: '-' }), spend(250, 'Кафе', { r: '+' }), spend(100, 'Разное')],
    [d(3)]: [spend(500, 'Еда дома', { r: '=' }), earn(5000)],
    [d(8)]: [spend(1000, 'Кафе'), spend(1000, 'Разное')],
  };
  const v = (kind: Parameters<typeof moneyMetricValue>[0], rate?: number) => moneyMetricValue(kind, log, rate, TODAY);

  it('число трат и незапланированных за сегодня', () => {
    expect(v('expCountToday')).toBe(3);
    expect(v('unplannedToday')).toBe(1);
  });
  it('часы жизни в самой крупной трате: сумма / цена часа', () => {
    expect(v('lifeHoursMax', 375)).toBe(2);
    expect(v('lifeHoursMax')).toBeUndefined();
  });
  it('баланс недели: доходы минус траты за 7 дней', () => expect(v('weekBalance')).toBe(5000 - 1600));
  it('доля «зря» считается по сумме среди оценённых трат', () => {
    // оценены: 750 (−), 250 (+), 500 (=) → зря 750 из 1500
    expect(v('wasteShare')).toBe(50);
  });
  it('доля «разного» за две недели', () => {
    // всего 750+250+100+500+1000+1000 = 3600, разное 1100
    expect(v('otherShare')).toBe(31);
  });
  it('сравнение с прошлой неделей в процентах', () => {
    // эта неделя 1600, прошлая (дни 7–13): 2000 → −20 %
    expect(v('weekVsPrev')).toBe(-20);
  });
  it('без записей замеры ручные', () => {
    expect(moneyMetricValue('expCountToday', {}, 375, TODAY)).toBeUndefined();
    expect(moneyMetricValue('weekBalance', { [d(20)]: [spend(5)] }, 375, TODAY)).toBeUndefined();
  });
});
