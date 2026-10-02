import { COURSES, type CourseId } from '../courses';
import type { Progress } from '../hooks/useCloudStorage';
import type { Task } from '../hooks/useTasks';
import type { EnergyEntry } from '../hooks/useDaily';
import {
  bestSoftChain,
  currentStreak,
  lastDateKeys,
  pluralDays,
  shiftDateKey,
  softChain,
  todayKey,
  weekdayOf,
} from '../dates';

const ON_WEEKDAY = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];

type Props = {
  progress: Record<CourseId, Progress>;
  habit: string | null;
  habitLog: string[];
  top3History: Record<string, [number, number]>;
  energy: EnergyEntry[];
  tasks: Task[];
  onClose: () => void;
};

const WEEKS = 6;
const DAY_HEAD = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const dayNum = (key: string) => Number(key.slice(8));
const monthShort = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1];

// Сетка на 6 недель, понедельник первый; хвост текущей недели — будущие дни
function calendarKeys(today: string) {
  const offset = (weekdayOf(today) + 6) % 7;
  const start = shiftDateKey(today, -(offset + (WEEKS - 1) * 7));
  return Array.from({ length: WEEKS * 7 }, (_, i) => shiftDateKey(start, i));
}

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="tile">
      <span className="tile__value">{value}</span>
      <span className="tile__label">{label}</span>
    </div>
  );
}

export function StatsView({ progress, habit, habitLog, top3History, energy, tasks, onClose }: Props) {
  const today = todayKey();
  const done = new Set(habitLog);
  const first = [...habitLog].sort()[0];

  const window30 = first ? lastDateKeys(30, today).filter((k) => k >= first) : [];
  const rate30 = window30.length ? Math.round((window30.filter((k) => done.has(k)).length / window30.length) * 100) : 0;

  const byWeekday = Array(7).fill(0) as number[];
  habitLog.forEach((k) => byWeekday[weekdayOf(k)]++);
  const bestWeekday = habitLog.length >= 7 ? byWeekday.indexOf(Math.max(...byWeekday)) : -1;
  const weakWeekday = habitLog.length >= 7 ? byWeekday.indexOf(Math.min(...byWeekday)) : -1;

  const calendar = calendarKeys(today);
  const months = [...new Set(calendar.filter((k) => k <= today).map(monthShort))];

  const top3Days = lastDateKeys(14, today).map((k) => ({ key: k, stat: top3History[k] }));
  const top3Totals = Object.values(top3History).reduce(
    (acc, [d, p]) => [acc[0] + d, acc[1] + p] as [number, number],
    [0, 0] as [number, number]
  );

  const energyWeek = energy.filter((e) => e.date >= shiftDateKey(today, -6));
  const energyAvg = energyWeek.length
    ? (energyWeek.reduce((s, e) => s + e.value, 0) / energyWeek.length).toFixed(1)
    : null;

  const weekAgo = shiftDateKey(today, -6);
  const closedWeek = tasks.filter((t) => t.doneAt && t.doneAt >= weekAgo).length;
  const openTasks = tasks.filter((t) => !t.doneAt);

  return (
    <div className="app">
      <header className="header">
        <div className="header__top">
          <h1 className="header__title">Статистика</h1>
          <button type="button" className="link-btn" onClick={onClose}>
            К курсу
          </button>
        </div>
        <p className="picker__lead">Только твои данные: отметки, цепочки и прогресс по курсам.</p>
      </header>

      {habit && (
        <section className="card stats" aria-label="Статистика привычки">
          <span className="tracker__label">Привычка</span>
          <h2 className="top3__title">{habit}</h2>

          <div className="tiles">
            <Tile value={softChain(habitLog, today)} label="цепочка сейчас" />
            <Tile value={bestSoftChain(habitLog, today)} label="лучшая цепочка" />
            <Tile value={habitLog.length} label="голосов за себя" />
            <Tile value={first ? `${rate30}%` : '—'} label="выполнение за 30 дней" />
          </div>

          <div className="heat" role="img" aria-label={`Календарь привычки за ${WEEKS} недель: отмечено ${calendar.filter((k) => done.has(k)).length} дней`}>
            <div className="heat__months">{months.join(' · ')}</div>
            <div className="heat__grid">
              {DAY_HEAD.map((d) => (
                <span key={d} className="heat__head">
                  {d}
                </span>
              ))}
              {calendar.map((key) => {
                const future = key > today;
                const cls = future ? 'heat__cell--future' : done.has(key) ? 'heat__cell--on' : key === today ? 'heat__cell--today' : '';
                return (
                  <span key={key} className={`heat__cell ${cls}`} title={key}>
                    {dayNum(key)}
                  </span>
                );
              })}
            </div>
          </div>

          {bestWeekday >= 0 ? (
            <p className="stats__note">
              Чаще всего получается {ON_WEEKDAY[bestWeekday]}
              {weakWeekday !== bestWeekday && byWeekday[weakWeekday] < byWeekday[bestWeekday]
                ? `, реже всего — ${ON_WEEKDAY[weakWeekday]}. Поставь на этот день версию на две минуты.`
                : '.'}
            </p>
          ) : (
            <p className="stats__note">Через неделю отметок здесь появится твой лучший и худший день недели.</p>
          )}
        </section>
      )}

      <section className="card stats" aria-label="Прогресс по курсам">
        <h2 className="top3__title">Курсы</h2>
        <ul className="course-stats">
          {COURSES.map((c) => {
            const states = c.days.map((d) => progress[c.id][String(d.day)]);
            const doneCount = states.filter((s) => s?.done).length;
            const streak = currentStreak(states.flatMap((s) => s?.doneAt ?? []), today);
            const notes = states.filter((s) => s?.note.trim()).length;
            return (
              <li key={c.id} className="course-stat">
                <div className="course-stat__head">
                  <span className="course-stat__title">{c.title}</span>
                  <span className="course-stat__count">
                    {doneCount} из {c.days.length}
                  </span>
                </div>
                <div className="bar" aria-hidden="true">
                  <div className="bar__fill" style={{ width: `${(doneCount / c.days.length) * 100}%` }} />
                </div>
                <span className="course-stat__meta">
                  {doneCount === 0
                    ? 'Не начат'
                    : [streak > 0 ? `серия ${pluralDays(streak)}` : null, notes > 0 ? `заметок: ${notes}` : null]
                        .filter(Boolean)
                        .join(', ') || 'В процессе'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {top3Totals[1] > 0 && (
        <section className="card stats" aria-label="Три главных за две недели">
          <div className="top3__head">
            <h2 className="top3__title">Три главных</h2>
            <span className="top3__score">
              {top3Totals[0]} из {top3Totals[1]} за всё время
            </span>
          </div>
          <div className="top3-chart" aria-hidden="true">
            {top3Days.map(({ key, stat }) => (
              <div key={key} className="top3-chart__col">
                <div className="top3-chart__stack">
                  {[0, 1, 2].map((i) => {
                    const planned = stat ? i < stat[1] : false;
                    const isDone = stat ? i < stat[0] : false;
                    return (
                      <span
                        key={i}
                        className={`top3-chart__dot ${isDone ? 'top3-chart__dot--done' : planned ? 'top3-chart__dot--planned' : ''}`}
                      />
                    );
                  })}
                </div>
                <span className="top3-chart__day">{dayNum(key)}</span>
              </div>
            ))}
          </div>
          <p className="stats__note">Точки — задачи дня за две недели: тёмные сделаны, светлые остались.</p>
        </section>
      )}

      {(energyAvg || tasks.length > 0) && (
        <section className="card stats" aria-label="Энергия и дела за неделю">
          <h2 className="top3__title">Неделя</h2>
          <div className="tiles">
            {energyAvg && <Tile value={energyAvg} label="энергия в среднем" />}
            {energyAvg && <Tile value={energyWeek.length} label="отметок энергии" />}
            {tasks.length > 0 && <Tile value={closedWeek} label="дел закрыто" />}
            {tasks.length > 0 && <Tile value={openTasks.length} label="дел открыто" />}
          </div>
        </section>
      )}
    </div>
  );
}
