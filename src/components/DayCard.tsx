import { useEffect, useRef, useState } from 'react';
import type { DayState } from '../hooks/useCloudStorage';
import { FOCUSES, type Focus } from '../focus';

export type Day = {
  day: number;
  block: string;
  title: string;
  focus: string;
  tasks: string[];
  actions: Record<Focus, string>;
  review: boolean;
};

type Props = {
  day: Day;
  focus: Focus;
  state: DayState;
  onToggleTask: (index: number) => void;
  onNoteChange: (note: string) => void;
  onToggleDone: () => void;
};

const NOTE_SAVE_DELAY_MS = 600;

export function DayCard({ day, focus, state, onToggleTask, onNoteChange, onToggleDone }: Props) {
  const actionLabel = FOCUSES.find((f) => f.id === focus)!.actionLabel;
  const [note, setNote] = useState(state.note);
  const pendingNote = useRef<string | null>(null);
  const timer = useRef<number>();
  const onNoteChangeRef = useRef(onNoteChange);
  onNoteChangeRef.current = onNoteChange;

  const flushNote = () => {
    window.clearTimeout(timer.current);
    if (pendingNote.current !== null) {
      onNoteChangeRef.current(pendingNote.current);
      pendingNote.current = null;
    }
  };

  const handleNoteChange = (value: string) => {
    setNote(value);
    pendingNote.current = value;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flushNote, NOTE_SAVE_DELAY_MS);
  };

  useEffect(() => flushNote, []);

  return (
    <div className={`card ${day.review ? 'card--review' : ''}`}>
      <div className="card__block">
        День {day.day} · {day.block}
        {day.review ? ' · Обзор блока' : ''}
      </div>
      <div className="card__title">{day.title}</div>
      <div className="card__focus">{day.focus}</div>

      <ul className="task-list">
        {day.tasks.map((task, i) => {
          const checked = !!state.tasks[i];
          return (
            <li key={i}>
              <label className={`task-item ${checked ? 'task-item--checked' : ''}`}>
                <input
                  type="checkbox"
                  className="task-item__input"
                  checked={checked}
                  onChange={() => onToggleTask(i)}
                />
                <span className="task-item__box" />
                <span>{task}</span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="product-action">
        <span className="product-action__label">{actionLabel}</span>
        {day.actions[focus]}
        <textarea
          className="product-action__note"
          placeholder="Запиши сюда, что получилось…"
          value={note}
          rows={3}
          onChange={(e) => handleNoteChange(e.target.value)}
          onBlur={flushNote}
        />
      </div>

      <button
        className={`btn ${state.done ? 'btn--undone' : 'btn--done'}`}
        onClick={onToggleDone}
      >
        {state.done ? '✓ День выполнен — отменить' : 'Отметить день выполненным'}
      </button>
    </div>
  );
}
