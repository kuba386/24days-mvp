import { useEffect, useMemo, useState } from 'react';
import daysData from './data/days.json';
import { DayCard, type Day } from './components/DayCard';
import { FocusPicker } from './components/FocusPicker';
import { EMPTY_DAY, useCloudStorage } from './hooks/useCloudStorage';
import { FOCUSES } from './focus';
import { currentStreak, pluralDays, todayKey } from './dates';

const days = daysData as Day[];
const dayNumbers = days.map((d) => d.day);

export default function App() {
  const { progress, focus, loaded, updateDay, setFocus, saveError } = useCloudStorage(dayNumbers);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [pickingFocus, setPickingFocus] = useState(false);
  const getDay = (day: number) => progress[String(day)] ?? EMPTY_DAY;

  // При загрузке приложения открываем первый ещё не выполненный день
  useEffect(() => {
    if (!loaded) return;
    const firstUnfinished = days.findIndex((d) => !getDay(d.day).done);
    setCurrentDayIndex(firstUnfinished === -1 ? days.length - 1 : firstUnfinished);
  }, [loaded]);

  // Настройка Telegram WebApp: ready() + expand() на весь экран
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (webApp) {
      webApp.ready();
      webApp.expand();
    }
  }, []);

  const completedCount = useMemo(
    () => days.filter((d) => getDay(d.day).done).length,
    [progress]
  );
  const percent = Math.round((completedCount / days.length) * 100);
  const streak = useMemo(
    () => currentStreak(days.flatMap((d) => getDay(d.day).doneAt ?? [])),
    [progress]
  );

  const currentDay = days[currentDayIndex];
  const currentState = getDay(currentDay.day);

  // Один день за раз: следующий открывается на следующий календарный день после предыдущего
  const lockReason = (() => {
    if (currentDayIndex === 0) return null;
    const prev = days[currentDayIndex - 1];
    const prevState = getDay(prev.day);
    if (!prevState.done) return `Сначала заверши день ${prev.day}`;
    if (prevState.doneAt === todayKey()) return 'Откроется завтра — один день за раз';
    return null;
  })();

  if (!loaded) {
    return (
      <div className="app">
        <p style={{ color: 'var(--text-dim)' }}>Загрузка…</p>
      </div>
    );
  }

  if (!focus || pickingFocus) {
    return (
      <FocusPicker
        current={focus}
        onPick={(f) => {
          setFocus(f);
          setPickingFocus(false);
        }}
      />
    );
  }

  const focusTitle = FOCUSES.find((f) => f.id === focus)!.title;

  return (
    <div className="app">
      <header className="header">
        <div className="header__eyebrow">24 DAYS</div>
        <div className="header__title">Твой продуктивный цикл</div>
        <div className="header__subtitle">
          День {currentDay.day} из {days.length} · {focusTitle}{' '}
          <button className="link-btn" onClick={() => setPickingFocus(true)}>
            изменить
          </button>
        </div>

        <div className="progress-bar">
          <div className="progress-bar__fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="progress-label">
          <span>{completedCount} из {days.length} дней</span>
          <span>{percent}%</span>
        </div>
        <div className={`streak ${streak > 0 ? 'streak--active' : ''}`}>
          {streak > 0
            ? `🔥 Серия: ${pluralDays(streak)} подряд`
            : 'Серия прервана — отметь сегодняшний день'}
        </div>
        {saveError && (
          <div className="save-error">
            Не удалось сохранить прогресс. Попробуй отметить день ещё раз.
          </div>
        )}
      </header>

      {completedCount === days.length && (
        <div className="card card--congrats">
          <div className="card__title">🎉 Цикл из 24 дней завершён</div>
          <div className="card__focus">
            Ты прошёл весь цикл. Загляни в свои заметки за каждый день — там твой готовый план
            следующего шага.
          </div>
        </div>
      )}

      <DayCard
        key={currentDay.day}
        day={currentDay}
        focus={focus}
        state={currentState}
        locked={lockReason}
        onToggleTask={(i) => {
          const tasks = currentDay.tasks.map((_, idx) => !!currentState.tasks[idx]);
          tasks[i] = !tasks[i];
          updateDay(currentDay.day, { tasks });
        }}
        onNoteChange={(note) => updateDay(currentDay.day, { note })}
        onToggleDone={() =>
          updateDay(currentDay.day, {
            done: !currentState.done,
            doneAt: currentState.done ? undefined : todayKey(),
          })
        }
      />

      <nav className="nav">
        <button
          className="nav__btn"
          disabled={currentDayIndex === 0}
          onClick={() => setCurrentDayIndex((i) => Math.max(0, i - 1))}
        >
          ← Предыдущий день
        </button>
        <button
          className="nav__btn"
          disabled={currentDayIndex === days.length - 1}
          onClick={() => setCurrentDayIndex((i) => Math.min(days.length - 1, i + 1))}
        >
          Следующий день →
        </button>
      </nav>
    </div>
  );
}
