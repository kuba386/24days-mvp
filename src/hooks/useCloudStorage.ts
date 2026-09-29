import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Прогресс пользователя — какие дни отмечены выполненными.
 * Пример: { "1": true, "2": true, "3": false }
 */
export type Progress = Record<string, boolean>;

const STORAGE_KEY = 'progress';

function getWebApp() {
  return window.Telegram?.WebApp;
}

/**
 * Читает и пишет прогресс в Telegram CloudStorage.
 * Если приложение открыто не в Telegram (например, в обычном браузере при разработке),
 * используется localStorage — только для локальной отладки на компьютере.
 */
export function useCloudStorage() {
  const [progress, setProgress] = useState<Progress>({});
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // Telegram-скрипт подставляет объект WebApp даже вне Telegram (и в старых клиентах),
  // а его CloudStorage может при вызове синхронно кидать WebAppMethodUnsupported —
  // это флаг "реально работает", а не просто "объект существует".
  const cloudAvailable = useRef(true);

  useEffect(() => {
    const webApp = getWebApp();

    const loadFromLocalStorage = () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          setProgress(JSON.parse(raw));
        } catch {
          setProgress({});
        }
      }
      setLoaded(true);
    };

    if (webApp?.CloudStorage) {
      try {
        webApp.CloudStorage.getItem(STORAGE_KEY, (err, value) => {
          if (!err && value) {
            try {
              setProgress(JSON.parse(value));
            } catch {
              setProgress({});
            }
          }
          setLoaded(true);
        });
      } catch {
        cloudAvailable.current = false;
        loadFromLocalStorage();
      }
    } else {
      cloudAvailable.current = false;
      loadFromLocalStorage();
    }
  }, []);

  const markDayDone = useCallback((day: number, done: boolean) => {
    setProgress((prev) => {
      const next = { ...prev, [String(day)]: done };
      const webApp = getWebApp();
      const raw = JSON.stringify(next);

      if (webApp?.CloudStorage && cloudAvailable.current) {
        try {
          webApp.CloudStorage.setItem(STORAGE_KEY, raw, (err, ok) => {
            setSaveError(!!err || ok === false);
          });
        } catch {
          cloudAvailable.current = false;
          localStorage.setItem(STORAGE_KEY, raw);
        }
      } else {
        localStorage.setItem(STORAGE_KEY, raw);
      }

      return next;
    });
  }, []);

  return { progress, loaded, markDayDone, saveError };
}
