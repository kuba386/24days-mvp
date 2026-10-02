import { useEffect, useState } from 'react';
import { HABIT_LIMIT, HABIT_NAME_MAX, type Habit } from '../hooks/useHabits';
import { lastDateKeys, pluralDays, softChain, todayKey, weekdayOf } from '../dates';

type Props = {
  habits: Habit[];
  onAdd: (name: string) => void;
  onToggle: (id: string, date: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  onRestore: (habit: Habit) => void;
  onClose: () => void;
};

const SUGGESTIONS = [
  'Выпить воды',
  'Зарядка',
  'Прогулка',
  'Чтение',
  'Медитация',
  'Английский',
  'Лечь до 23:00',
  'Без сахара',
  'План на день',
];
const LETTERS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const UNDO_MS = 5000;

function HabitRow({
  habit,
  onToggle,
  onRename,
  onRemove,
}: {
  habit: Habit;
  onToggle: Props['onToggle'];
  onRename: Props['onRename'];
  onRemove: Props['onRemove'];
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(habit.name);
  const today = todayKey();
  const done = new Set(habit.log);
  const doneToday = done.has(today);
  const chain = softChain(habit.log, today);

  const finishRename = () => {
    setEditing(false);
    if (name.trim() && name.trim() !== habit.name) onRename(habit.id, name);
    else setName(habit.name);
  };

  return (
    <li className="hb">
      <div className="hb__top">
        <button
          type="button"
          className={`hb__check ${doneToday ? 'hb__check--on' : ''}`}
          aria-pressed={doneToday}
          aria-label={`${habit.name}: ${doneToday ? 'отмена отметки за сегодня' : 'отметить за сегодня'}`}
          onClick={() => onToggle(habit.id, today)}
        >
          {doneToday ? '✓' : ''}
        </button>
        <div className="hb__main">
          {editing ? (
            <input
              className="hb__rename"
              value={name}
              maxLength={HABIT_NAME_MAX}
              aria-label="Название привычки"
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onBlur={finishRename}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          ) : (
            <button type="button" className="hb__name" onClick={() => setEditing(true)}>
              {habit.name}
            </button>
          )}
          <span className="hb__meta">
            {chain > 0 ? `Цепочка: ${pluralDays(chain)}` : 'Цепочки пока нет'} · всего {habit.log.length}
          </span>
        </div>
        <button
          type="button"
          className="link-btn task__remove"
          aria-label={`Удалить привычку: ${habit.name}`}
          onClick={() => onRemove(habit.id)}
        >
          Удалить
        </button>
      </div>

      <div className="hb__days" role="group" aria-label={`Последние 7 дней: ${habit.name}`}>
        {lastDateKeys(7, today).map((key) => (
          <button
            key={key}
            type="button"
            className={`hb__day ${done.has(key) ? 'hb__day--on' : ''} ${key === today ? 'hb__day--today' : ''}`}
            aria-pressed={done.has(key)}
            aria-label={key}
            onClick={() => onToggle(habit.id, key)}
          >
            <span>{LETTERS[weekdayOf(key)]}</span>
            <span className="hb__num">{Number(key.slice(8))}</span>
          </button>
        ))}
      </div>
    </li>
  );
}

export function HabitsView({ habits, onAdd, onToggle, onRename, onRemove: removeNow, onRestore, onClose }: Props) {
  const [text, setText] = useState('');
  const [removed, setRemoved] = useState<Habit | null>(null);
  useEffect(() => {
    if (!removed) return;
    const timer = window.setTimeout(() => setRemoved(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [removed]);

  const onRemove = (id: string) => {
    setRemoved(habits.find((h) => h.id === id) ?? null);
    removeNow(id);
  };

  const today = todayKey();
  const doneToday = habits.filter((h) => h.log.includes(today)).length;
  const taken = new Set(habits.map((h) => h.name.toLowerCase()));
  const full = habits.length >= HABIT_LIMIT;

  const add = (name: string) => {
    if (!name.trim() || full) return;
    onAdd(name);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header__top">
          <h1 className="header__title">Мои привычки</h1>
          <button type="button" className="link-btn" onClick={onClose}>
            К курсу
          </button>
        </div>
        <p className="picker__lead">
          Добавь привычки и отмечай их каждый день. Один пропуск цепочку не рвёт, два подряд рвут.
        </p>
      </header>

      {habits.length > 0 && (
        <p className="habits__today" aria-live="polite">
          Сегодня: {doneToday} из {habits.length}
          {doneToday === habits.length && ' — всё сделано'}
        </p>
      )}

      <section className="card habits">
        {habits.length === 0 && (
          <p className="thread__hint">Пока пусто. Выбери готовую привычку ниже или напиши свою.</p>
        )}
        <ul className="habits__list">
          {habits.map((h) => (
            <HabitRow key={h.id} habit={h} onToggle={onToggle} onRename={onRename} onRemove={onRemove} />
          ))}
        </ul>
      </section>

      <section className="card habits habits--new">
        <h2 className="top3__title">Новая привычка</h2>
        <form
          className="capture"
          onSubmit={(e) => {
            e.preventDefault();
            add(text);
            setText('');
          }}
        >
          <input
            className="habit-form__input capture__input"
            value={text}
            maxLength={HABIT_NAME_MAX}
            disabled={full}
            placeholder={full ? `Максимум ${HABIT_LIMIT} привычек` : 'Например, зарядка по утрам'}
            aria-label="Название новой привычки"
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="capture__btn" disabled={!text.trim() || full}>
            Добавить
          </button>
        </form>
        <div className="chips">
          {SUGGESTIONS.filter((s) => !taken.has(s.toLowerCase())).map((s) => (
            <button key={s} type="button" className="chip" disabled={full} onClick={() => add(s)}>
              {s}
            </button>
          ))}
        </div>
      </section>

      {removed && (
        <div className="undo" role="status">
          <span className="undo__text">Удалено: {removed.name}</span>
          <button
            type="button"
            className="undo__btn"
            onClick={() => {
              onRestore(removed);
              setRemoved(null);
            }}
          >
            Вернуть
          </button>
        </div>
      )}
    </div>
  );
}
