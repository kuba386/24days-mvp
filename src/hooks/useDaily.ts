import { useCallback, useEffect, useState } from 'react';
import { loadKeys, parseJson, saveKey } from '../storage';
import { shiftDateKey, todayKey } from '../dates';

export type Top3Item = { text: string; done: boolean };
type Top3 = { date: string; items: Top3Item[] };
// История трёх задач: дата → [сделано, запланировано]
type Top3History = Record<string, [number, number]>;

const TOP3_KEY = 'top3';
const TOP3_HIST_KEY = 'top3_hist';
const ENERGY_KEY = 'energy_log';
const HIST_DAYS = 60;
// Запись энергии: "YYYY-MM-DD HH v", ~15 символов — 200 штук влезают в 4096
const ENERGY_MAX = 200;

const emptyTop3 = (): Top3Item[] => [0, 1, 2].map(() => ({ text: '', done: false }));

export type EnergyEntry = { date: string; hour: number; value: number };

const parseEnergy = (raw: string): EnergyEntry | null => {
  const [date, hour, value] = raw.split(' ');
  const h = Number(hour);
  const v = Number(value);
  return date && Number.isInteger(h) && v >= 1 && v <= 10 ? { date, hour: h, value: v } : null;
};

export function useDaily() {
  const [top3, setTop3] = useState<Top3>({ date: todayKey(), items: emptyTop3() });
  const [history, setHistory] = useState<Top3History>({});
  const [energy, setEnergy] = useState<string[]>([]);

  useEffect(() => {
    loadKeys([TOP3_KEY, TOP3_HIST_KEY, ENERGY_KEY], (values) => {
      const stored = parseJson<Top3 | null>(values[TOP3_KEY], null);
      // Новый день — новые три задачи; вчерашние остаются в истории
      if (stored?.date === todayKey() && Array.isArray(stored.items)) setTop3(stored);
      setHistory(parseJson<Top3History>(values[TOP3_HIST_KEY], {}));
      const log = parseJson<unknown>(values[ENERGY_KEY], []);
      setEnergy(Array.isArray(log) ? log.filter((e) => typeof e === 'string') : []);
    });
  }, []);

  // Правка одной задачи поверх актуального состояния — чтобы текст и галочка не затирали друг друга
  const updateTop3 = useCallback((index: number, patch: Partial<Top3Item>) => {
    setTop3((prev) => {
      const date = todayKey();
      const base = prev.date === date ? prev.items : emptyTop3();
      const items = base.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        return next.text.trim() ? next : { ...next, done: false };
      });
      const next = { date, items };
      saveKey(TOP3_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // История считается от сохранённых задач дня
  useEffect(() => {
    const planned = top3.items.filter((i) => i.text.trim()).length;
    const done = top3.items.filter((i) => i.text.trim() && i.done).length;
    setHistory((prev) => {
      const current = prev[top3.date];
      if (planned === 0 && !current) return prev;
      if (current && current[0] === done && current[1] === planned) return prev;
      const cutoff = shiftDateKey(top3.date, -HIST_DAYS);
      const trimmed = Object.fromEntries(Object.entries(prev).filter(([d]) => d >= cutoff));
      const hist = { ...trimmed, [top3.date]: [done, planned] as [number, number] };
      saveKey(TOP3_HIST_KEY, JSON.stringify(hist));
      return hist;
    });
  }, [top3]);

  const addEnergy = useCallback((value: number) => {
    const entry = `${todayKey()} ${new Date().getHours()} ${value}`;
    setEnergy((prev) => {
      const next = [...prev, entry].slice(-ENERGY_MAX);
      saveKey(ENERGY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const items = top3.date === todayKey() ? top3.items : emptyTop3();
  const energyEntries = energy.map(parseEnergy).filter((e): e is EnergyEntry => e !== null);

  return { top3: items, top3History: history, updateTop3, energy: energyEntries, addEnergy };
}
