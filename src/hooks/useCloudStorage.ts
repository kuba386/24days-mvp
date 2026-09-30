import { useCallback, useEffect, useRef, useState } from 'react';
import { isFocus, type Focus } from '../focus';
import { COURSES, isCourseId, type CourseId } from '../courses';
import type { ScoreItem } from '../components/Scorecard';

export type DayState = {
  done: boolean;
  doneAt?: string;
  tasks: boolean[];
  note: string;
  value?: number;
  // Карта привычек дня 2 «Атомных привычек»
  items?: ScoreItem[];
  // Выбранные варианты в дне с подсказками (например, причины прокрастинации)
  picks?: string[];
};

export type Progress = Record<string, DayState>;

export const EMPTY_DAY: DayState = { done: false, tasks: [], note: '' };

// CloudStorage ограничивает значение 4096 символами, поэтому каждый день хранится отдельным ключом
const dayKey = (course: CourseId, day: number) =>
  `${COURSES.find((c) => c.id === course)!.keyPrefix}day_${day}`;
const COURSE_KEY = 'course';
const FOCUS_KEY = 'focus';
const HABIT_KEY = 'habit';
const HABIT_LOG_KEY = 'habit_log';
// Ключ CloudStorage держит до 4096 символов: ~300 дат по 13 символов
const HABIT_LOG_MAX = 300;

const emptyProgress = () =>
  Object.fromEntries(COURSES.map((c) => [c.id, {}])) as Record<CourseId, Progress>;

function getWebApp() {
  return window.Telegram?.WebApp;
}

export function useCloudStorage() {
  const [progress, setProgress] = useState<Record<CourseId, Progress>>(emptyProgress);
  const [course, setCourseState] = useState<CourseId | null>(null);
  const [focus, setFocusState] = useState<Focus | null>(null);
  const [habit, setHabitState] = useState('');
  const [habitLog, setHabitLog] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);
  // Telegram-скрипт подставляет объект WebApp даже вне Telegram (и в старых клиентах),
  // а его CloudStorage может при вызове синхронно кидать WebAppMethodUnsupported —
  // это флаг "реально работает", а не просто "объект существует".
  const cloudAvailable = useRef(true);

  useEffect(() => {
    const webApp = getWebApp();
    const dayKeys = COURSES.flatMap((c) => c.days.map((d) => dayKey(c.id, d.day)));
    const keys = [COURSE_KEY, FOCUS_KEY, HABIT_KEY, HABIT_LOG_KEY, ...dayKeys];

    const apply = (values: Record<string, string | null | undefined>) => {
      const storedFocus = values[FOCUS_KEY];
      const storedCourse = values[COURSE_KEY];
      setFocusState(isFocus(storedFocus) ? storedFocus : null);
      setHabitState(values[HABIT_KEY] ?? '');
      try {
        const log = JSON.parse(values[HABIT_LOG_KEY] || '[]');
        setHabitLog(Array.isArray(log) ? log.filter((d) => typeof d === 'string') : []);
      } catch {
        setHabitLog([]);
      }
      // Кто начал до появления курсов, уже проходит «Продуктивный год»
      setCourseState(isCourseId(storedCourse) ? storedCourse : isFocus(storedFocus) ? 'year' : null);

      const next = emptyProgress();
      for (const c of COURSES) {
        for (const d of c.days) {
          const raw = values[dayKey(c.id, d.day)];
          if (!raw) continue;
          try {
            next[c.id][String(d.day)] = { ...EMPTY_DAY, ...JSON.parse(raw) };
          } catch {
            // битую запись просто пропускаем
          }
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

  const updateDay = useCallback((courseId: CourseId, day: number, patch: Partial<DayState>) => {
    setProgress((prev) => {
      const next = { ...(prev[courseId][String(day)] ?? EMPTY_DAY), ...patch };
      persist(dayKey(courseId, day), JSON.stringify(next));
      return { ...prev, [courseId]: { ...prev[courseId], [String(day)]: next } };
    });
  }, []);

  const toggleHabitDate = useCallback((date: string) => {
    setHabitLog((prev) => {
      const next = prev.includes(date)
        ? prev.filter((d) => d !== date)
        : [...prev, date].sort().slice(-HABIT_LOG_MAX);
      persist(HABIT_LOG_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Пустая строка при загрузке пропускается — это и есть «день не начат»
  const resetCourse = useCallback((courseId: CourseId) => {
    const course = COURSES.find((c) => c.id === courseId)!;
    for (const d of course.days) persist(dayKey(courseId, d.day), '');
    setProgress((prev) => ({ ...prev, [courseId]: {} }));
  }, []);

  const setCourse = useCallback((next: CourseId) => {
    setCourseState(next);
    persist(COURSE_KEY, next);
  }, []);

  const setFocus = useCallback((next: Focus) => {
    setFocusState(next);
    persist(FOCUS_KEY, next);
  }, []);

  const setHabit = useCallback((next: string) => {
    setHabitState(next);
    persist(HABIT_KEY, next);
  }, []);

  return {
    progress,
    course,
    focus,
    habit,
    habitLog,
    loaded,
    updateDay,
    toggleHabitDate,
    resetCourse,
    setCourse,
    setFocus,
    setHabit,
    saveError,
  };
}
