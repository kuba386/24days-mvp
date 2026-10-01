import { useEffect, useRef, useState } from 'react';
import type { Top3Item } from '../hooks/useDaily';
import { shiftDateKey, todayKey } from '../dates';

type Props = {
  items: Top3Item[];
  history: Record<string, [number, number]>;
  onUpdate: (index: number, patch: Partial<Top3Item>) => void;
};

const SAVE_DELAY_MS = 600;

export function Top3Card({ items, history, onUpdate }: Props) {
  const [texts, setTexts] = useState(items.map((i) => i.text));
  const timers = useRef<Record<number, number>>({});
  const pending = useRef<Record<number, string>>({});

  // Новый день или загрузка из хранилища — подтягиваем тексты, если пользователь сейчас не печатает
  const stored = items.map((i) => i.text).join('\n');
  useEffect(() => {
    setTexts((prev) => items.map((item, i) => (i in pending.current ? prev[i] : item.text)));
  }, [stored]);

  const flush = (index: number) => {
    window.clearTimeout(timers.current[index]);
    if (!(index in pending.current)) return;
    const text = pending.current[index];
    delete pending.current[index];
    onUpdate(index, { text });
  };

  useEffect(() => () => Object.keys(pending.current).forEach((i) => flush(Number(i))), []);

  const change = (index: number, text: string) => {
    setTexts((prev) => prev.map((t, i) => (i === index ? text : t)));
    pending.current[index] = text;
    window.clearTimeout(timers.current[index]);
    timers.current[index] = window.setTimeout(() => flush(index), SAVE_DELAY_MS);
  };

  const yesterday = history[shiftDateKey(todayKey(), -1)];
  const done = items.filter((i) => i.text.trim() && i.done).length;
  const planned = items.filter((i) => i.text.trim()).length;

  return (
    <section className="card top3" aria-label="Три главные задачи на сегодня">
      <div className="top3__head">
        <h2 className="top3__title">Три главных на сегодня</h2>
        {planned > 0 && (
          <span className="top3__score">
            {done} из {planned}
          </span>
        )}
      </div>
      <ul className="top3__list">
        {items.map((item, i) => (
          <li key={i} className="top3__row">
            <label className={`top3__check ${item.done ? 'task-item--checked' : ''}`}>
              <input
                type="checkbox"
                className="task-item__input"
                checked={item.done}
                disabled={!texts[i].trim()}
                aria-label={`Сделано: ${texts[i] || `задача ${i + 1}`}`}
                onChange={() => {
                  flush(i);
                  onUpdate(i, { done: !item.done });
                }}
              />
              <span className="task-item__box" />
            </label>
            <input
              className={`top3__input ${item.done ? 'top3__input--done' : ''}`}
              value={texts[i]}
              maxLength={120}
              aria-label={`Главное дело ${i + 1}`}
              placeholder={i === 0 ? 'Самое важное дело дня' : `Главное дело ${i + 1}`}
              onChange={(e) => change(i, e.target.value)}
              onBlur={() => flush(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
          </li>
        ))}
      </ul>
      {yesterday && yesterday[1] > 0 && (
        <p className="top3__hint">
          Вчера: {yesterday[0]} из {yesterday[1]}
        </p>
      )}
    </section>
  );
}
