import { useEffect, useMemo, useState } from 'react';
import daysData from './data/days.json';
import { DayCard, type Day } from './components/DayCard';
import { useCloudStorage } from './hooks/useCloudStorage';

const days = daysData as Day[];

export default function App() {
  const { progress, loaded, markDayDone } = useCloudStorage();
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // При загрузке приложения открываем первый ещё не выполненный день
  useEffect(() => {
    if (!loaded) return;
    const firstUnfinished = days.findIndex((d) => !progress[String(d.day)]);
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
    () => days.filter((d) => progress[String(d.day)]).length,
    [progress]
  );
  const percent = Math.round((completedCount / days.length) * 100);

  const currentDay = days[currentDayIndex];
  const isDone = !!progress[String(currentDay.day)];

  if (!loaded) {
    return (
      <div className="app">
        <p style={{ color: 'var(--text-dim)' }}>Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__eyebrow">24 DAYS</div>
        <div className="header__title">Твой продуктивный цикл</div>
        <div className="header__subtitle">
          День {currentDay.day} из {days.length}
        </div>

        <div className="progress-bar">
          <div className="progress-bar__fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="progress-label">
          <span>{completedCount} из {days.length} дней</span>
          <span>{percent}%</span>
        </div>
      </header>

      <DayCard
        day={currentDay}
        done={isDone}
        onToggle={() => markDayDone(currentDay.day, !isDone)}
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
