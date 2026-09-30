import type { EnergyEntry } from '../hooks/useDaily';
import { shiftDateKey, todayKey } from '../dates';

type Props = {
  entries: EnergyEntry[];
  onRate: (value: number) => void;
};

const FIRST_HOUR = 6;
const LAST_HOUR = 23;
const WINDOW_DAYS = 14;
const MIN_FOR_CHART = 5;

// Средняя энергия по часам за последние две недели
function byHour(entries: EnergyEntry[]) {
  const from = shiftDateKey(todayKey(), -WINDOW_DAYS);
  const sums = new Map<number, [number, number]>();
  for (const e of entries) {
    if (e.date < from) continue;
    const [sum, n] = sums.get(e.hour) ?? [0, 0];
    sums.set(e.hour, [sum + e.value, n + 1]);
  }
  return Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => {
    const hour = FIRST_HOUR + i;
    const s = sums.get(hour);
    return { hour, avg: s ? s[0] / s[1] : null };
  });
}

// Лучшее окно из двух соседних часов, где есть данные
function bestWindow(hours: { hour: number; avg: number | null }[]) {
  let best: { from: number; avg: number } | null = null;
  for (let i = 0; i < hours.length - 1; i++) {
    const a = hours[i].avg;
    const b = hours[i + 1].avg;
    if (a === null || b === null) continue;
    const avg = (a + b) / 2;
    if (!best || avg > best.avg) best = { from: hours[i].hour, avg };
  }
  return best;
}

export function EnergyCard({ entries, onRate }: Props) {
  const today = entries.filter((e) => e.date === todayKey());
  const last = today[today.length - 1];
  const recent = entries.filter((e) => e.date >= shiftDateKey(todayKey(), -WINDOW_DAYS));
  const hours = byHour(entries);
  const best = bestWindow(hours);

  return (
    <section className="card energy" aria-label="Энергия">
      <h2 className="top3__title">Энергия сейчас</h2>
      <div className="energy__scale" role="group" aria-label="Оценка энергии от 1 до 10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
          <button
            key={v}
            type="button"
            className={`energy__btn ${last?.value === v && last.hour === new Date().getHours() ? 'energy__btn--on' : ''}`}
            onClick={() => onRate(v)}
          >
            {v}
          </button>
        ))}
      </div>
      <p className="top3__hint">
        {last
          ? `Последняя отметка: ${last.value} в ${last.hour}:00. Сегодня отметок: ${today.length}`
          : 'Отмечай 3–4 раза в день — через несколько дней увидишь свои лучшие часы.'}
      </p>

      {recent.length >= MIN_FOR_CHART && (
        <>
          <div className="energy__chart" aria-hidden="true">
            {hours.map(({ hour, avg }) => (
              <div key={hour} className="energy__col">
                <div
                  className={`energy__bar ${best && (hour === best.from || hour === best.from + 1) ? 'energy__bar--best' : ''}`}
                  style={{ height: `${avg === null ? 0 : (avg / 10) * 100}%` }}
                />
                <span className="energy__hour">{hour % 3 === 0 ? hour : ''}</span>
              </div>
            ))}
          </div>
          {best && (
            <p className="energy__best">
              Лучшее время: {best.from}:00–{best.from + 2}:00, в среднем {best.avg.toFixed(1)}. Ставь сюда
              самое важное дело.
            </p>
          )}
        </>
      )}
    </section>
  );
}
