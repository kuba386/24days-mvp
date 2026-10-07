import { describe, expect, it } from 'vitest';
import {
  bestSoftChain,
  currentStreak,
  lastDateKeys,
  missesInLast,
  pluralDays,
  shiftDateKey,
  softChain,
} from '../src/dates';

const TODAY = '2026-10-03';
const ago = (n: number) => shiftDateKey(TODAY, -n);
const log = (...days: number[]) => days.map(ago);

describe('shiftDateKey', () => {
  it('переходит через границы месяца и года', () => {
    expect(shiftDateKey('2026-10-01', -1)).toBe('2026-09-30');
    expect(shiftDateKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDateKey('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('lastDateKeys', () => {
  it('возвращает n дней по возрастанию, заканчивая сегодня', () => {
    expect(lastDateKeys(3, TODAY)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
  });
});

describe('softChain — правило «не пропускать дважды»', () => {
  it('пустой лог — ноль', () => expect(softChain([], TODAY)).toBe(0));
  it('сегодня не отмечено — это ещё не пропуск', () => expect(softChain(log(1, 2, 3), TODAY)).toBe(3));
  it('один пропуск цепочку не рвёт', () => expect(softChain(log(0, 1, 3, 4), TODAY)).toBe(4));
  it('два пропуска подряд рвут', () => expect(softChain(log(0, 1, 4, 5), TODAY)).toBe(2));
  it('вчера и позавчера пропуск — цепочки нет', () => expect(softChain(log(3, 4, 5), TODAY)).toBe(0));
});

describe('bestSoftChain', () => {
  it('находит лучшую цепочку в истории, а не текущую', () => {
    const history = log(20, 19, 18, 17, 16, 15, 14, 11, 10, 8, 7, 6, 3, 2, 1);
    expect(bestSoftChain(history, TODAY)).toBe(7);
    expect(softChain(history, TODAY)).toBe(3);
  });
  it('пустой лог и один день', () => {
    expect(bestSoftChain([], TODAY)).toBe(0);
    expect(bestSoftChain([TODAY], TODAY)).toBe(1);
  });
  it('дубликаты дат не считаются дважды', () => expect(bestSoftChain([TODAY, TODAY], TODAY)).toBe(1));
});

describe('currentStreak — строгая серия выполненных дней курса', () => {
  it('любой пропуск рвёт', () => expect(currentStreak(log(0, 1, 3), TODAY)).toBe(2));
  it('сегодня не выполнено — считаем со вчера', () => expect(currentStreak(log(1, 2), TODAY)).toBe(2));
});

describe('missesInLast', () => {
  it('считает пропуски за 7 полных дней, сегодня не в счёт', () =>
    expect(missesInLast(log(1, 2, 4, 6, 8), 7, TODAY)).toBe(3));
  it('не считает дни до первой отметки', () => expect(missesInLast(log(2), 7, TODAY)).toBe(1));
  it('пустой лог — ноль', () => expect(missesInLast([], 7, TODAY)).toBe(0));
});

describe('pluralDays', () => {
  it.each([
    [1, '1 день'],
    [2, '2 дня'],
    [5, '5 дней'],
    [11, '11 дней'],
    [12, '12 дней'],
    [21, '21 день'],
    [22, '22 дня'],
    [111, '111 дней'],
  ])('%i → %s', (n, text) => expect(pluralDays(n)).toBe(text));
});
