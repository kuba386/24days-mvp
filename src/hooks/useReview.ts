import { useCallback, useEffect, useState } from 'react';
import { loadKeys, parseJson, saveKey } from '../storage';
import { shiftDateKey, todayKey } from '../dates';

type ReviewState = { week: string; checked: string[]; lastDone?: string };

const KEY = 'gtd_review';

// Неделя начинается с понедельника: отметки чек-листа живут до следующего понедельника
export function weekKey(today = todayKey()) {
  const [y, m, d] = today.split('-').map(Number);
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return shiftDateKey(today, -weekday);
}

export function useReview() {
  const [state, setState] = useState<ReviewState>({ week: weekKey(), checked: [] });

  useEffect(() => {
    loadKeys([KEY], (values) => {
      const stored = parseJson<ReviewState | null>(values[KEY], null);
      if (!stored) return;
      setState(stored.week === weekKey() ? stored : { week: weekKey(), checked: [], lastDone: stored.lastDone });
    });
  }, []);

  const update = (fn: (prev: ReviewState) => ReviewState) =>
    setState((prev) => {
      const base = prev.week === weekKey() ? prev : { week: weekKey(), checked: [], lastDone: prev.lastDone };
      const next = fn(base);
      saveKey(KEY, JSON.stringify(next));
      return next;
    });

  const toggle = useCallback(
    (step: string) =>
      update((prev) => ({
        ...prev,
        checked: prev.checked.includes(step) ? prev.checked.filter((s) => s !== step) : [...prev.checked, step],
      })),
    []
  );

  const finish = useCallback(() => update((prev) => ({ ...prev, lastDone: todayKey() })), []);

  return { checked: state.week === weekKey() ? state.checked : [], lastDone: state.lastDone, toggle, finish };
}
