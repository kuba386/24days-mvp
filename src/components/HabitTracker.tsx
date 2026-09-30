import { lastDateKeys, pluralDays, shiftDateKey, softChain, todayKey } from '../dates';

type Props = {
  habit: string;
  log: string[];
  onToggle: (date: string) => void;
};

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

const weekday = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
};

export function HabitTracker({ habit, log, onToggle }: Props) {
  const today = todayKey();
  const yesterday = shiftDateKey(today, -1);
  const done = new Set(log);
  const doneToday = done.has(today);
  const chain = softChain(log, today);
  const missedYesterday = !doneToday && !done.has(yesterday) && chain > 0;

  return (
    <section className="card tracker" aria-label="Отметка привычки">
      <div className="tracker__top">
        <div>
          <span className="tracker__label">Привычка сегодня</span>
          <p className="tracker__habit">{habit}</p>
        </div>
        <button
          type="button"
          className={`tracker__btn ${doneToday ? 'tracker__btn--on' : ''}`}
          aria-pressed={doneToday}
          onClick={() => onToggle(today)}
        >
          {doneToday ? 'Сделано' : 'Сделал'}
        </button>
      </div>

      <div className="tracker__days">
        {lastDateKeys(14, today).map((key) => (
          <button
            key={key}
            type="button"
            className={`tracker__day ${done.has(key) ? 'tracker__day--on' : ''} ${
              key === today ? 'tracker__day--today' : ''
            }`}
            aria-label={`${key}${done.has(key) ? ', сделано' : ''}`}
            aria-pressed={done.has(key)}
            onClick={() => onToggle(key)}
          >
            <span>{weekday(key)}</span>
          </button>
        ))}
      </div>

      <div className="tracker__stats">
        <span>{chain > 0 ? `Цепочка: ${pluralDays(chain)}` : 'Цепочки пока нет'}</span>
        <span>Всего: {pluralDays(log.length)}</span>
      </div>
      {missedYesterday && (
        <p className="tracker__warn">
          Вчера был пропуск. Один не страшен, главное — не пропустить второй раз подряд.
        </p>
      )}
    </section>
  );
}
