import { useCallback, useEffect, useState } from 'react';
import { loadByPrefix, parseJson, removeKey, saveKey } from '../storage';

export type Habit = { id: string; name: string; createdAt: string; log: string[] };

// Одна привычка — один ключ; в значение влезает ~280 дат по 13 символов (лимит 4096)
const PREFIX = 'hb_';
export const HABIT_LIMIT = 12;
export const HABIT_NAME_MAX = 60;
const LOG_MAX = 280;

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadByPrefix(PREFIX, (values) => {
      const list = Object.values(values)
        .map((raw) => parseJson<Habit | null>(raw, null))
        .filter((h): h is Habit => !!h && typeof h.id === 'string' && Array.isArray(h.log));
      list.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      setHabits(list);
      setLoaded(true);
    });
  }, []);

  const save = (habit: Habit) => saveKey(PREFIX + habit.id, JSON.stringify(habit));

  const add = useCallback((name: string) => {
    const clean = name.trim().slice(0, HABIT_NAME_MAX);
    if (!clean) return;
    // id создаём вне функции обновления: React может вызвать её дважды, а запись должна быть одна
    const habit: Habit = { id: newId(), name: clean, createdAt: new Date().toISOString(), log: [] };
    setHabits((prev) => {
      if (prev.length >= HABIT_LIMIT || prev.some((h) => h.name.toLowerCase() === clean.toLowerCase())) return prev;
      save(habit);
      return [...prev, habit];
    });
  }, []);

  const toggle = useCallback((id: string, date: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const log = h.log.includes(date) ? h.log.filter((d) => d !== date) : [...h.log, date].sort().slice(-LOG_MAX);
        const next = { ...h, log };
        save(next);
        return next;
      })
    );
  }, []);

  const rename = useCallback((id: string, name: string) => {
    const clean = name.trim().slice(0, HABIT_NAME_MAX);
    if (!clean) return;
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const next = { ...h, name: clean };
        save(next);
        return next;
      })
    );
  }, []);

  const remove = useCallback((id: string) => {
    removeKey(PREFIX + id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const restore = useCallback((habit: Habit) => {
    save(habit);
    setHabits((prev) =>
      prev.some((h) => h.id === habit.id)
        ? prev
        : [...prev, habit].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    );
  }, []);

  return { habits, loaded, add, toggle, rename, remove, restore };
}
