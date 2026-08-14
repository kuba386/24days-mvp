import { useCallback, useEffect, useState } from 'react';

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

  useEffect(() => {
    const webApp = getWebApp();

    if (webApp?.CloudStorage) {
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
    } else {
      // Режим разработки вне Telegram — берём из localStorage
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          setProgress(JSON.parse(raw));
        } catch {
          setProgress({});
        }
      }
      setLoaded(true);
    }
  }, []);

  const markDayDone = useCallback((day: number, done: boolean) => {
    setProgress((prev) => {
      const next = { ...prev, [String(day)]: done };
      const webApp = getWebApp();
      const raw = JSON.stringify(next);

      if (webApp?.CloudStorage) {
        webApp.CloudStorage.setItem(STORAGE_KEY, raw);
      } else {
        localStorage.setItem(STORAGE_KEY, raw);
      }

      return next;
    });
  }, []);

  return { progress, loaded, markDayDone };
}
