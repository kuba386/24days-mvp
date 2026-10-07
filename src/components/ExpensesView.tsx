import { useEffect, useState } from 'react';
import {
  byCategory,
  earnedIn,
  earnedOn,
  formatAmount,
  parseAmount,
  spentIn,
  spentOn,
  windowKeys,
  type Expense,
  type ExpenseLog,
  type Rating,
} from '../expenses';
import { CUSTOM_CATEGORY_LIMIT } from '../hooks/useExpenses';
import { shiftDateKey, todayKey, weekdayOf } from '../dates';

type Props = {
  log: ExpenseLog;
  categories: string[];
  hourRate?: number;
  onAdd: (entry: Omit<Expense, 'id'>, date: string) => void;
  onUpdate: (date: string, id: string, patch: Partial<Expense>) => void;
  onRemove: (date: string, id: string) => void;
  onRestore: (date: string, entry: Expense) => void;
  onAddCategory: (name: string) => string | null;
  onClose: () => void;
};

const RATINGS: { id: Rating; label: string }[] = [
  { id: '+', label: 'Радует' },
  { id: '=', label: 'Нейтрально' },
  { id: '-', label: 'Зря' },
];
const DAY_NAMES = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const UNDO_MS = 5000;

export function ExpensesView({
  log,
  categories,
  hourRate,
  onAdd,
  onUpdate,
  onRemove,
  onRestore,
  onAddCategory,
  onClose,
}: Props) {
  const today = todayKey();
  const [income, setIncome] = useState(false);
  const [back, setBack] = useState(0);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('');
  const [rating, setRating] = useState<Rating | undefined>();
  const [unplanned, setUnplanned] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [removed, setRemoved] = useState<{ date: string; entry: Expense } | null>(null);

  useEffect(() => {
    if (!removed) return;
    const timer = window.setTimeout(() => setRemoved(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [removed]);

  const date = shiftDateKey(today, -back);
  const value = parseAmount(amount);
  const canSave = value !== null && (income || category !== '');
  const week = windowKeys(7, today);
  const spentToday = spentOn(log, today);
  const spentWeek = spentIn(log, week);
  const earnedWeek = earnedIn(log, week);
  const dayList = log[date] ?? [];
  const cats = byCategory(log, week);
  const maxDay = Math.max(1, ...week.map((k) => spentOn(log, k)));
  const customLeft = categories.length < 9 + CUSTOM_CATEGORY_LIMIT;

  const save = () => {
    if (!canSave || value === null) return;
    onAdd(income ? { a: value, c: '', inc: true } : { a: value, c: category, ...(rating ? { r: rating } : {}), ...(unplanned ? { u: true } : {}) }, date);
    setAmount('');
    setRating(undefined);
    setUnplanned(false);
  };

  const remove = (entry: Expense) => {
    setRemoved({ date, entry });
    onRemove(date, entry.id);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header__top">
          <h1 className="header__title">Мои траты</h1>
          <button type="button" className="link-btn" onClick={onClose}>
            К курсу
          </button>
        </div>
        <p className="picker__lead">
          Записывай каждую трату сразу после покупки и оценивай, радует ли она. Данные хранятся только у тебя в Telegram.
        </p>
      </header>

      <div className="tiles money__tiles">
        <div className="tile">
          <span className="tile__value">{formatAmount(spentToday)}</span>
          <span className="tile__label">
            потрачено сегодня
            {hourRate && spentToday > 0 ? `, ≈ ${Math.round((spentToday / hourRate) * 10) / 10} ч жизни` : ''}
          </span>
        </div>
        <div className="tile">
          <span className="tile__value">{formatAmount(spentWeek)}</span>
          <span className="tile__label">за 7 дней</span>
        </div>
        <div className="tile">
          <span className="tile__value">{formatAmount(earnedWeek)}</span>
          <span className="tile__label">доход за 7 дней</span>
        </div>
        <div className="tile">
          <span className="tile__value">{formatAmount(earnedWeek - spentWeek)}</span>
          <span className="tile__label">баланс за 7 дней</span>
        </div>
      </div>

      <section className="card money" aria-label="Новая запись">
        <div className="seg" role="group" aria-label="Тип записи">
          {[
            { v: false, label: 'Расход' },
            { v: true, label: 'Доход' },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              className={`seg__btn ${income === o.v ? 'seg__btn--on' : ''}`}
              aria-pressed={income === o.v}
              onClick={() => setIncome(o.v)}
            >
              {o.label}
            </button>
          ))}
        </div>

        <form
          className="capture"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <input
            className="habit-form__input capture__input money__amount"
            value={amount}
            inputMode="decimal"
            maxLength={13}
            placeholder="Сумма"
            aria-label="Сумма"
            onChange={(e) => setAmount(e.target.value)}
          />
          <button type="submit" className="capture__btn" disabled={!canSave}>
            Записать
          </button>
        </form>

        {!income && (
          <>
            <p className="task__editor-label">Категория</p>
            <div className="chips" role="group" aria-label="Категория">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip ${category === c ? 'chip--on' : ''}`}
                  aria-pressed={category === c}
                  onClick={() => setCategory(category === c ? '' : c)}
                >
                  {c}
                </button>
              ))}
            </div>
            {customLeft && (
              <form
                className="capture money__newcat"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = onAddCategory(newCat);
                  if (name) setCategory(name);
                  setNewCat('');
                }}
              >
                <input
                  className="habit-form__input capture__input"
                  value={newCat}
                  maxLength={14}
                  placeholder="Своя категория"
                  aria-label="Название своей категории"
                  onChange={(e) => setNewCat(e.target.value)}
                />
                <button type="submit" className="capture__btn" disabled={!newCat.trim()}>
                  Добавить
                </button>
              </form>
            )}

            <p className="task__editor-label">Радует ли эта трата</p>
            <div className="chips" role="group" aria-label="Оценка траты">
              {RATINGS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`chip ${rating === r.id ? 'chip--on' : ''}`}
                  aria-pressed={rating === r.id}
                  onClick={() => setRating(rating === r.id ? undefined : r.id)}
                >
                  {r.label}
                </button>
              ))}
              <button
                type="button"
                className={`chip ${unplanned ? 'chip--on' : ''}`}
                aria-pressed={unplanned}
                onClick={() => setUnplanned(!unplanned)}
              >
                Не планировал(а)
              </button>
            </div>
          </>
        )}

        <div className="chips money__when" role="group" aria-label="Когда">
          {[
            { v: 0, label: 'Сегодня' },
            { v: 1, label: 'Вчера' },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              className={`chip ${back === o.v ? 'chip--on' : ''}`}
              aria-pressed={back === o.v}
              onClick={() => setBack(o.v)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <section className="card money" aria-label={back === 0 ? 'Записи за сегодня' : 'Записи за вчера'}>
        <h2 className="top3__title">{back === 0 ? 'Сегодня' : 'Вчера'}</h2>
        {dayList.length === 0 && <p className="thread__hint">Записей пока нет. Первая трата — самая важная.</p>}
        <ul className="tasks__list">
          {dayList.map((e) => (
            <li key={e.id} className="task">
              <div className="task__main">
                <div>
                  <span className="money__sum">
                    {e.inc ? '+' : ''}
                    {formatAmount(e.a)}
                  </span>
                  <span className="task__meta">
                    {e.inc ? 'Доход' : e.c}
                    {e.u ? ', не планировал(а)' : ''}
                    {!e.inc && hourRate ? `, ≈ ${Math.round((e.a / hourRate) * 10) / 10} ч` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="link-btn task__remove"
                  aria-label={`Удалить запись: ${formatAmount(e.a)}`}
                  onClick={() => remove(e)}
                >
                  Удалить
                </button>
              </div>
              {!e.inc && (
                <div className="chips" role="group" aria-label={`Оценка траты ${formatAmount(e.a)}`}>
                  {RATINGS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`chip ${e.r === r.id ? 'chip--on' : ''}`}
                      aria-pressed={e.r === r.id}
                      onClick={() => onUpdate(date, e.id, { r: e.r === r.id ? undefined : r.id })}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
        {dayList.length > 0 && (
          <p className="tasks__done">
            За день: потрачено {formatAmount(spentOn(log, date))}
            {earnedOn(log, date) > 0 ? `, доход ${formatAmount(earnedOn(log, date))}` : ''}
          </p>
        )}
      </section>

      {spentWeek > 0 && (
        <section className="card money" aria-label="Траты за 7 дней">
          <h2 className="top3__title">Траты по дням</h2>
          <div className="week-bars" role="img" aria-label={`Траты по дням за неделю: ${week.map((k) => `${k.slice(8)}: ${formatAmount(spentOn(log, k))}`).join(', ')}`}>
            {week.map((k) => (
              <div key={k} className="week-bars__col">
                <div className="week-bars__track">
                  <div className="week-bars__bar" style={{ height: `${(spentOn(log, k) / maxDay) * 100}%` }} />
                </div>
                <span className="week-bars__day">{DAY_NAMES[weekdayOf(k)]}</span>
              </div>
            ))}
          </div>

          <h2 className="top3__title money__sub">По категориям</h2>
          <ul className="cat-bars">
            {cats.map(([c, total]) => (
              <li key={c} className="cat-bars__row">
                <div className="cat-bars__head">
                  <span>{c}</span>
                  <span className="cat-bars__sum">
                    {formatAmount(total)} · {Math.round((total / spentWeek) * 100)}%
                  </span>
                </div>
                <div className="bar" aria-hidden="true">
                  <div className="bar__fill" style={{ width: `${(total / spentWeek) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {removed && (
        <div className="undo" role="status">
          <span className="undo__text">Удалено: {formatAmount(removed.entry.a)}</span>
          <button
            type="button"
            className="undo__btn"
            onClick={() => {
              onRestore(removed.date, removed.entry);
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
