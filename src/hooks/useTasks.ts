import { useCallback, useEffect, useRef, useState } from 'react';
import { ackBotInbox, fetchBotInbox, initData } from '../api';
import { shiftDateKey, todayKey } from '../dates';

export type TaskList = 'inbox' | 'next' | 'project' | 'waiting' | 'someday';
export type Context = 'computer' | 'phone' | 'home' | 'errands' | 'anywhere';
export type Energy = 'low' | 'high';

export type Task = {
  id: string;
  text: string;
  list: TaskList;
  createdAt: string;
  doneAt?: string;
  // Закрыто прямо при разборе входящих по правилу двух минут
  quick?: boolean;
  // Для шагов: где, сколько минут и сколько сил нужно, к какому проекту относится
  context?: Context;
  minutes?: number;
  energy?: Energy;
  projectId?: string;
};

// Одна задача — один ключ CloudStorage: значение ограничено 4096 символами, а ключей до 1024
const PREFIX = 't_';
export const TASK_MAX = 500;
export const TASK_TEXT_MAX = 300;
// Сделанные задачи храним месяц — для счётчиков и замеров, потом чистим
const DONE_KEEP_DAYS = 30;

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function cloud() {
  return window.Telegram?.WebApp?.CloudStorage;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const cloudAvailable = useRef(true);

  const write = (key: string, value: string | null) => {
    const storage = cloud();
    if (storage && cloudAvailable.current) {
      try {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
        return;
      } catch {
        cloudAvailable.current = false;
      }
    }
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  };

  const save = (task: Task) => write(PREFIX + task.id, JSON.stringify(task));

  useEffect(() => {
    const apply = (values: Record<string, string | null | undefined>) => {
      const cutoff = shiftDateKey(todayKey(), -DONE_KEEP_DAYS);
      const next: Task[] = [];
      for (const [key, raw] of Object.entries(values)) {
        if (!raw) continue;
        try {
          const task = JSON.parse(raw) as Task;
          if (task.doneAt && task.doneAt < cutoff) write(key, null);
          else next.push(task);
        } catch {
          // битую запись пропускаем
        }
      }
      next.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
      setTasks(next);
      setLoaded(true);
    };

    const fromLocal = () => {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
      apply(Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])));
    };

    const storage = cloud();
    if (!storage) {
      cloudAvailable.current = false;
      fromLocal();
      return;
    }
    try {
      storage.getKeys((err, keys) => {
        const own = err ? [] : keys.filter((k) => k.startsWith(PREFIX));
        if (own.length === 0) return apply({});
        storage.getItems(own, (e, values) => apply(e ? {} : values));
      });
    } catch {
      cloudAvailable.current = false;
      fromLocal();
    }
  }, []);

  const add = useCallback((text: string, list: TaskList = 'inbox', extra: Partial<Task> = {}, id = newId()) => {
    const clean = text.trim().slice(0, TASK_TEXT_MAX);
    if (!clean) return;
    setTasks((prev) => {
      if (prev.length >= TASK_MAX || prev.some((t) => t.id === id)) return prev;
      const task: Task = { ...extra, id, text: clean, list, createdAt: new Date().toISOString() };
      save(task);
      return [...prev, task];
    });
  }, []);

  const update = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch };
        save(next);
        return next;
      })
    );
  }, []);

  // У удалённого проекта шаги остаются, но теряют ссылку на него
  const remove = useCallback((id: string) => {
    write(PREFIX + id, null);
    setTasks((prev) =>
      prev
        .filter((t) => t.id !== id)
        .map((t) => {
          if (t.projectId !== id) return t;
          const next = { ...t, projectId: undefined };
          save(next);
          return next;
        })
    );
  }, []);

  // Отмена удаления: возвращаем задачу как была, со своим id и метками
  const restore = useCallback((task: Task) => {
    save(task);
    setTasks((prev) =>
      prev.some((t) => t.id === task.id)
        ? prev
        : [...prev, task].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    );
  }, []);

  // Сообщения, отправленные боту, лежат в очереди на сервере — забираем их во «Входящие»
  useEffect(() => {
    if (!loaded || !initData()) return;
    fetchBotInbox()
      .then((items) => {
        if (items.length === 0) return;
        items.forEach((item) => add(item.text, 'inbox', {}, `b${item.id}`));
        return ackBotInbox(items.map((i) => i.id));
      })
      .catch(() => {});
  }, [loaded]);

  return { tasks, loaded, add, update, remove, restore };
}
