import { useCallback, useEffect, useRef, useState } from 'react';
import { isFocus, type Focus } from '../focus';

export type DayState = {
  done: boolean;
  tasks: boolean[];
  note: string;
};

export type Progress = Record<string, DayState>;

export const EMPTY_DAY: DayState = { done: false, tasks: [], note: '' };

// CloudStorage ограничивает значение 4096 символами, поэтому каждый день хранится отдельным ключом
const dayKey = (day: number) => `day_${day}`;
const FOCUS_KEY = 'focus';

function getWebApp() {
  return window.Telegram?.WebApp;
}

export function useCloudStorage(dayNumbers: number[]) {
  const [progress, setProgress] = useState<Progress>({});
  const [focus, setFocusState] = useState<Focus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // Telegram-скрипт подставляет объект WebApp даже вне Telegram (и в старых клиентах),
  // а его CloudStorage может при вызове синхронно кидать WebAppMethodUnsupported —
  // это флаг "реально работает", а не просто "объект существует".
  const cloudAvailable = useRef(true);

  useEffect(() => {
    const webApp = getWebApp();
    const keys = [FOCUS_KEY, ...dayNumbers.map(dayKey)];

    const apply = (values: Record<string, string | null | undefined>) => {
      const storedFocus = values[FOCUS_KEY];
      setFocusState(isFocus(storedFocus) ? storedFocus : null);

      const next: Progress = {};
      for (const day of dayNumbers) {
        const raw = values[dayKey(day)];
        if (!raw) continue;
        try {
          next[String(day)] = { ...EMPTY_DAY, ...JSON.parse(raw) };
        } catch {
          // битую запись просто пропускаем
        }
      }
      setProgress(next);
      setLoaded(true);
    };

    const loadFromLocalStorage = () =>
      apply(Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])));

    if (webApp?.CloudStorage) {
      try {
        webApp.CloudStorage.getItems(keys, (err, values) => apply(err ? {} : values));
      } catch {
        cloudAvailable.current = false;
        loadFromLocalStorage();
      }
    } else {
      cloudAvailable.current = false;
      loadFromLocalStorage();
    }
  }, []);

  const persist = (key: string, raw: string) => {
    const webApp = getWebApp();
    if (webApp?.CloudStorage && cloudAvailable.current) {
      try {
        webApp.CloudStorage.setItem(key, raw, (err, ok) => {
          setSaveError(!!err || ok === false);
        });
        return;
      } catch {
        cloudAvailable.current = false;
      }
    }
    localStorage.setItem(key, raw);
  };

  const updateDay = useCallback((day: number, patch: Partial<DayState>) => {
    setProgress((prev) => {
      const next = { ...(prev[String(day)] ?? EMPTY_DAY), ...patch };
      persist(dayKey(day), JSON.stringify(next));
      return { ...prev, [String(day)]: next };
    });
  }, []);

  const setFocus = useCallback((next: Focus) => {
    setFocusState(next);
    persist(FOCUS_KEY, next);
  }, []);

  return { progress, focus, loaded, updateDay, setFocus, saveError };
}
