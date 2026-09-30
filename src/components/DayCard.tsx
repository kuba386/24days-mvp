import { useRef } from 'react';
import type { DayState } from '../hooks/useCloudStorage';
import { useDeferredSave } from '../hooks/useDeferredSave';
import { FOCUSES, type Focus } from '../focus';
import { blockStyle } from '../blocks';
import { fillHabit, type AutoMetric } from '../courses';

export type Metric = {
  label: string;
  unit: string;
  step: number;
  max: number;
  auto?: AutoMetric;
};

export type Day = {
  day: number;
  block: string;
  title: string;
  focus: string;
  tasks: string[];
  // «Продуктивный год»: своё действие под каждый фокус
  actions?: Record<Focus, string>;
  // «Атомные привычки»: одно действие с {привычка} и пример под фокус
  action?: string;
  examples?: Record<Focus, string>;
  // Заготовка заметки для дней, где нужно что-то записать
  template?: string;
  metric?: Metric;
  review: boolean;
};

type Props = {
  day: Day;
  focus: Focus;
  habit: string | null;
  // Значение автозамера, пока день открыт; после выполнения показываем сохранённое
  autoValue?: number;
  state: DayState;
  locked: string | null;
  onToggleTask: (index: number) => void;
  onNoteChange: (note: string) => void;
  onValueChange: (value: number | undefined) => void;
  onToggleDone: () => void;
};

export function DayCard({
  day,
  focus,
  habit,
  autoValue,
  state,
  locked,
  onToggleTask,
  onNoteChange,
  onValueChange,
  onToggleDone,
}: Props) {
  const actionLabel = day.action ? 'Действие дня' : FOCUSES.find((f) => f.id === focus)!.actionLabel;
  const actionText = fillHabit(day.action ?? day.actions?.[focus] ?? '', habit);
  const example = day.examples?.[focus];
  const [note, setNote, flushNote] = useDeferredSave(state.note, onNoteChange);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const fillTemplate = () => {
    const text = fillHabit(day.template!, habit);
    setNote(text);
    // Курсор на первое «…», чтобы сразу начать писать
    window.setTimeout(() => {
      const el = noteRef.current;
      if (!el) return;
      const gap = text.indexOf('…');
      el.focus();
      if (gap >= 0) el.setSelectionRange(gap, gap + 1);
    });
  };
  const [value, setValue, flushValue] = useDeferredSave(
    state.value === undefined ? '' : String(state.value),
    (raw) => onValueChange(raw === '' ? undefined : Number(raw))
  );

  return (
    <div className={`card card--day ${locked ? 'card--locked' : ''}`} style={blockStyle(day.block)}>
      <div className="card__head">
        <span className="card__num" aria-label={`День ${day.day}`}>
          {day.day}
        </span>
        <div>
          <div className="pills">
            <span className="pill">{day.block}</span>
            {day.review && <span className="pill pill--plain">обзор блока</span>}
          </div>
          <h2 className="card__title">{day.title}</h2>
        </div>
      </div>
      <p className="card__lead">{day.focus}</p>

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
                  disabled={!!locked}
                  onChange={() => onToggleTask(i)}
                />
                <span className="task-item__box" />
                <span>{fillHabit(task, habit)}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {day.metric?.auto && (
        <div className="metric">
          <span className="metric__label">
            <span className="metric__title">Замер дня, считается сам</span>
            {day.metric.label}
            <span className="metric__hint">По твоим отметкам «Сделал» над карточкой</span>
          </span>
          <span className="metric__row">
            <output className="metric__input metric__input--auto">
              {state.done ? state.value ?? 0 : autoValue ?? 0}
            </output>
            <span className="metric__unit">{day.metric.unit}</span>
          </span>
        </div>
      )}

      {day.metric && !day.metric.auto && (
        <label className="metric">
          <span className="metric__label">
            <span className="metric__title">Замер дня</span>
            {day.metric.label}
          </span>
          <span className="metric__row">
            <input
              className="metric__input"
              type="number"
              inputMode="decimal"
              min={0}
              max={day.metric.max}
              step={day.metric.step}
              placeholder="0"
              value={value}
              disabled={!!locked}
              onChange={(e) => setValue(e.target.value)}
              onBlur={flushValue}
            />
            <span className="metric__unit">{day.metric.unit}</span>
          </span>
        </label>
      )}

      <div className="action">
        <span className="action__label">{actionLabel}</span>
        <p className="action__text">{actionText}</p>
        {example && <p className="action__example">Пример: {example}</p>}
        {day.template && !locked && !note.trim() && (
          <button type="button" className="template-btn" onClick={fillTemplate}>
            Заполнить по шаблону
          </button>
        )}
        <textarea
          ref={noteRef}
          className="note"
          placeholder="Что получилось? Запиши здесь"
          value={note}
          rows={Math.max(3, note.split('\n').length + 1)}
          disabled={!!locked}
          onChange={(e) => setNote(e.target.value)}
          onBlur={flushNote}
        />
      </div>

      {locked ? (
        <div className="lock-notice">{locked}</div>
      ) : (
        <button
          className={`btn ${state.done ? 'btn--undone' : 'btn--done'}`}
          onClick={onToggleDone}
        >
          {state.done ? 'День выполнен. Отменить' : 'Отметить день выполненным'}
        </button>
      )}
    </div>
  );
}
