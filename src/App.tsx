import { useEffect, useMemo, useState } from 'react';
import daysData from './data/days.json';
import { DayCard, type Day } from './components/DayCard';
import { FocusPicker } from './components/FocusPicker';
import { BlockSummary } from './components/BlockSummary';
import { JourneyMap } from './components/JourneyMap';
import { DayThread } from './components/DayThread';
import { EMPTY_DAY, useCloudStorage } from './hooks/useCloudStorage';
import { FOCUSES } from './focus';
import { currentStreak, pluralDays, todayKey } from './dates';
import { syncProgress } from './api';

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

  // Сообщаем боту текущий день и фокус — для утреннего напоминания по делу
  useEffect(() => {
    if (!loaded || !focus) return;
    const firstUnfinished = days.find((d) => !getDay(d.day).done);
    const doneDates = days.flatMap((d) => getDay(d.day).doneAt ?? []).sort();
    const timer = window.setTimeout(
      () =>
        syncProgress({
          day: firstUnfinished?.day ?? days.length + 1,
          focus,
          lastDoneAt: doneDates[doneDates.length - 1] ?? null,
        }),
      800
    );
    return () => window.clearTimeout(timer);
  }, [loaded, focus, progress]);

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
  const streak = useMemo(
    () => currentStreak(days.flatMap((d) => getDay(d.day).doneAt ?? [])),
    [progress]
  );

  const currentDay = days[currentDayIndex];
  const currentState = getDay(currentDay.day);

  // Один день за раз: следующий открывается на следующий календарный день после предыдущего
  const lockReasonFor = (index: number) => {
    if (index === 0) return null;
    const prev = days[index - 1];
    const prevState = getDay(prev.day);
    if (!prevState.done) return `Сначала заверши день ${prev.day}`;
    if (prevState.doneAt === todayKey()) return 'Откроется завтра. Один день за раз.';
    return null;
  };
  const lockReason = lockReasonFor(currentDayIndex);

  if (!loaded) {
    return (
      <div className="app">
        <p className="hint">Загрузка…</p>
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
        <div className="header__top">
          <h1 className="header__title">24 дня</h1>
          <span className="header__focus">
            Фокус: {focusTitle.toLowerCase()}{' '}
            <button className="link-btn" onClick={() => setPickingFocus(true)}>
              изменить
            </button>
          </span>
        </div>

        <JourneyMap
          days={days}
          currentIndex={currentDayIndex}
          getDay={getDay}
          isLocked={(i) => lockReasonFor(i) !== null}
          onSelect={setCurrentDayIndex}
        />

        <div className="header__stats">
          <span>
            {completedCount === 0
              ? 'Пока ни одного дня'
              : `${completedCount} из ${days.length} позади`}
          </span>
          <span className={streak > 0 ? 'header__streak' : undefined}>
            {streak > 0 ? `Серия: ${pluralDays(streak)}` : 'Серии пока нет'}
          </span>
        </div>
        {saveError && (
          <div className="save-error">
            Не удалось сохранить прогресс. Попробуй отметить день ещё раз.
          </div>
        )}
      </header>

      {completedCount === days.length && (
        <div className="card card--congrats">
          <div className="card__title">Цикл из 24 дней завершён</div>
          <p className="card__lead">
            Ты прошёл весь путь. Загляни в свои заметки за каждый день — там твой готовый план
            следующего шага.
          </p>
        </div>
      )}

      {currentDay.review && <BlockSummary days={days} reviewDay={currentDay} getDay={getDay} />}

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
        onValueChange={(value) => updateDay(currentDay.day, { value })}
        onToggleDone={() =>
          updateDay(currentDay.day, {
            done: !currentState.done,
            doneAt: currentState.done ? undefined : todayKey(),
          })
        }
      />

      {!lockReason && <DayThread day={currentDay} focus={focus} state={currentState} />}

      <nav className="nav">
        <button
          className="nav__btn"
          disabled={currentDayIndex === 0}
          onClick={() => setCurrentDayIndex((i) => Math.max(0, i - 1))}
        >
          Предыдущий день
        </button>
        <button
          className="nav__btn"
          disabled={currentDayIndex === days.length - 1}
          onClick={() => setCurrentDayIndex((i) => Math.min(days.length - 1, i + 1))}
        >
          Следующий день
        </button>
      </nav>
    </div>
  );
}
