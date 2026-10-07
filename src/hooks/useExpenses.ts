import { useCallback, useEffect, useState } from 'react';
import { loadByPrefix, parseJson, removeKey, saveKey } from '../storage';
import { shiftDateKey, todayKey } from '../dates';
import { CATEGORY_MAX, DEFAULT_CATEGORIES, type Expense, type ExpenseLog } from '../expenses';

// Один день — один ключ: ~40 символов на запись, 4096 хватает на сотню записей в день
const PREFIX = 'ex_';
const CATS_KEY = 'ex_cats';
const KEEP_DAYS = 120;
export const DAY_LIMIT = 90;
export const CUSTOM_CATEGORY_LIMIT = 6;

const dayKey = (date: string) => `${PREFIX}${date}`;
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export function useExpenses() {
  const [log, setLog] = useState<ExpenseLog>({});
  const [customCats, setCustomCats] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadByPrefix(PREFIX, (values) => {
      const cutoff = shiftDateKey(todayKey(), -KEEP_DAYS);
      const next: ExpenseLog = {};
      for (const [key, raw] of Object.entries(values)) {
        if (key === CATS_KEY) {
          const cats = parseJson<unknown>(raw, []);
          setCustomCats(Array.isArray(cats) ? cats.filter((c): c is string => typeof c === 'string') : []);
          continue;
        }
        const date = key.slice(PREFIX.length);
        if (date < cutoff) {
          removeKey(key);
          continue;
        }
        const list = parseJson<Expense[]>(raw, []);
        if (Array.isArray(list) && list.length) next[date] = list;
      }
      setLog(next);
      setLoaded(true);
    });
  }, []);

  const write = (date: string, list: Expense[]) => {
    if (list.length) saveKey(dayKey(date), JSON.stringify(list));
    else removeKey(dayKey(date));
  };

  const add = useCallback((entry: Omit<Expense, 'id'>, date = todayKey()) => {
    const item: Expense = { ...entry, id: newId() };
    setLog((prev) => {
      const list = prev[date] ?? [];
      if (list.length >= DAY_LIMIT) return prev;
      const next = [...list, item];
      write(date, next);
      return { ...prev, [date]: next };
    });
  }, []);

  const update = useCallback((date: string, id: string, patch: Partial<Expense>) => {
    setLog((prev) => {
      const list = prev[date];
      if (!list) return prev;
      const next = list.map((e) => (e.id === id ? { ...e, ...patch } : e));
      write(date, next);
      return { ...prev, [date]: next };
    });
  }, []);

  const remove = useCallback((date: string, id: string) => {
    setLog((prev) => {
      const next = (prev[date] ?? []).filter((e) => e.id !== id);
      write(date, next);
      return { ...prev, [date]: next };
    });
  }, []);

  const restore = useCallback((date: string, entry: Expense) => {
    setLog((prev) => {
      const list = prev[date] ?? [];
      if (list.some((e) => e.id === entry.id)) return prev;
      const next = [...list, entry];
      write(date, next);
      return { ...prev, [date]: next };
    });
  }, []);

  const addCategory = useCallback((name: string) => {
    const clean = name.trim().slice(0, CATEGORY_MAX);
    if (!clean) return null;
    setCustomCats((prev) => {
      const all = [...DEFAULT_CATEGORIES, ...prev];
      if (prev.length >= CUSTOM_CATEGORY_LIMIT || all.some((c) => c.toLowerCase() === clean.toLowerCase())) return prev;
      const next = [...prev, clean];
      saveKey(CATS_KEY, JSON.stringify(next));
      return next;
    });
    return clean;
  }, []);

  const categories = [...DEFAULT_CATEGORIES, ...customCats];
  return { log, loaded, categories, add, update, remove, restore, addCategory };
}

