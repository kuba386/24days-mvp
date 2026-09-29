import type { DayState } from '../hooks/useCloudStorage';
import { useDeferredSave } from '../hooks/useDeferredSave';
import { FOCUSES, type Focus } from '../focus';
import { blockStyle } from '../blocks';

export type Metric = {
  label: string;
  unit: string;
  step: number;
  max: number;
};

export type Day = {
  day: number;
  block: string;
  title: string;
  focus: string;
  tasks: string[];
  actions: Record<Focus, string>;
  metric?: Metric;
  review: boolean;
};

type Props = {
  day: Day;
  focus: Focus;
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
  state,
  locked,
  onToggleTask,
  onNoteChange,
  onValueChange,
  onToggleDone,
}: Props) {
  const actionLabel = FOCUSES.find((f) => f.id === focus)!.actionLabel;
  const [note, setNote, flushNote] = useDeferredSave(state.note, onNoteChange);
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
                <span>{task}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {day.metric && (
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
        <p className="action__text">{day.actions[focus]}</p>
        <textarea
          className="note"
          placeholder="Что получилось? Запиши здесь"
          value={note}
          rows={3}
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
