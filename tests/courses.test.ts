import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { autoMetricValue, COURSES, composeHabit, fillHabit } from '../src/courses';
import type { Task } from '../src/hooks/useTasks';

const task = (p: Partial<Task>): Task => ({ id: Math.random().toString(36), text: 't', list: 'inbox', createdAt: '2026-10-01', ...p });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 3, 12, 0));
});
afterEach(() => vi.useRealTimers());

describe('контент курсов', () => {
  it.each(COURSES.map((c) => [c.id, c]))('%s: 24 дня, 4 блока по 6, обзоры на 6/12/18/24', (_, course) => {
    const days = course.days;
    expect(days.map((d) => d.day)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(new Set(days.map((d) => d.block)).size).toBe(4);
    expect(days.filter((d) => d.review).map((d) => d.day)).toEqual([6, 12, 18, 24]);
    for (const d of days) {
      expect(d.tasks.length, `день ${d.day} без задач`).toBeGreaterThan(0);
      expect(d.action || d.actions, `день ${d.day} без действия`).toBeTruthy();
    }
  });

  it('у каждого курса свой префикс ключей', () => {
    expect(new Set(COURSES.map((c) => c.keyPrefix)).size).toBe(COURSES.length);
  });

  it('«{привычка}» не стоит сразу после глагола — только в кавычках или после двоеточия', () => {
    const habits = COURSES.find((c) => c.id === 'habits')!;
    const texts = habits.days.flatMap((d) => [...d.tasks, d.action ?? '', d.template ?? '']);
    for (const t of texts) {
      for (const m of t.matchAll(/(.)\{привычка\}/g)) {
        expect(['«', ' ', '\n'], t).toContain(m[1]);
        if (m[1] === ' ') expect(t.slice(0, m.index! + 1), t).toMatch(/[:«]\s$|после\s$/);
      }
    }
  });
});

describe('composeHabit и fillHabit', () => {
  it('собирает фразу с заглавной буквы и пропускает пустые части', () => {
    expect(composeHabit('растяжка', '10 минут', 'после подъёма')).toBe('Растяжка 10 минут после подъёма');
    expect(composeHabit(' чтение ', '', '')).toBe('Чтение');
  });
  it('подставляет привычку во все места и даёт запасной текст', () => {
    expect(fillHabit('«{привычка}» и {привычка}', 'Зарядка')).toBe('«Зарядка» и Зарядка');
    expect(fillHabit('«{привычка}»', null)).toBe('«твоя привычка»');
  });
});

describe('autoMetricValue', () => {
  const empty = { habitLog: null, tasks: [] as Task[] };

  it('замеры привычки: повторы, цепочка, пропуски', () => {
    const habitLog = ['2026-09-30', '2026-10-01', '2026-10-02'];
    expect(autoMetricValue('repeats', { ...empty, habitLog })).toBe(3);
    expect(autoMetricValue('chain', { ...empty, habitLog })).toBe(3);
    expect(autoMetricValue('misses7', { ...empty, habitLog })).toBe(0);
    expect(autoMetricValue('repeats', empty)).toBeUndefined();
  });

  it('замеры GTD: пустые списки — ручной ввод', () => {
    expect(autoMetricValue('inbox', empty)).toBeUndefined();
  });

  it('замеры GTD считаются из списков', () => {
    const project = task({ id: 'p', list: 'project' });
    const tasks = [
      task({ list: 'inbox' }),
      task({ list: 'inbox' }),
      project,
      task({ id: 'p2', list: 'project' }),
      task({ list: 'next', projectId: 'p' }),
      task({ list: 'waiting' }),
      task({ list: 'inbox', doneAt: '2026-10-03', quick: true }),
      task({ list: 'next', doneAt: '2026-10-03' }),
    ];
    const s = { habitLog: null, tasks };
    expect(autoMetricValue('captured', s)).toBe(8);
    expect(autoMetricValue('inbox', s)).toBe(2);
    expect(autoMetricValue('quick', s)).toBe(1);
    expect(autoMetricValue('projects', s)).toBe(2);
    expect(autoMetricValue('projectsNoStep', s)).toBe(1);
    expect(autoMetricValue('waiting', s)).toBe(1);
    expect(autoMetricValue('doneToday', s)).toBe(1);
    expect(autoMetricValue('open', s)).toBe(6);
  });

  it('три главных: считаются только заполненные задачи', () => {
    const top3 = [
      { text: 'a', done: true },
      { text: 'b', done: false },
      { text: '', done: false },
    ];
    expect(autoMetricValue('top3Done', { ...empty, top3 })).toBe(1);
    expect(autoMetricValue('top3Done', { ...empty, top3: [{ text: '', done: false }] })).toBeUndefined();
  });

  it('энергия: среднее за сегодня и за вторую половину дня', () => {
    const energy = [
      { date: '2026-10-03', hour: 9, value: 8 },
      { date: '2026-10-03', hour: 14, value: 4 },
      { date: '2026-10-03', hour: 17, value: 5 },
      { date: '2026-10-02', hour: 14, value: 10 },
    ];
    expect(autoMetricValue('energyToday', { ...empty, energy })).toBe(5.7);
    expect(autoMetricValue('energyAfternoon', { ...empty, energy })).toBe(4.5);
    expect(autoMetricValue('energyToday', { ...empty, energy: [] })).toBeUndefined();
  });

  it('карта привычек: число «−»', () => {
    const dayItems = [
      { text: 'a', mark: '-' as const },
      { text: 'b', mark: '+' as const },
      { text: 'c', mark: '-' as const },
    ];
    expect(autoMetricValue('scoreMinus', { ...empty, dayItems })).toBe(2);
    expect(autoMetricValue('scoreMinus', empty)).toBeUndefined();
  });
});
