import { useEffect, useMemo, useState } from 'react';
import { DayCard } from './components/DayCard';
import { FocusPicker } from './components/FocusPicker';
import { CoursePicker } from './components/CoursePicker';
import { HabitSetup } from './components/HabitSetup';
import { HabitTracker } from './components/HabitTracker';
import { CourseFinish } from './components/CourseFinish';
import { BlockSummary } from './components/BlockSummary';
import { JourneyMap } from './components/JourneyMap';
import { DayThread } from './components/DayThread';
import { EMPTY_DAY, useCloudStorage } from './hooks/useCloudStorage';
import { FOCUSES } from './focus';
import { currentStreak, pluralDays, todayKey } from './dates';
import { syncProgress } from './api';
import { autoMetricValue, courseById, COURSES } from './courses';

export default function App() {
  const {
    progress,
    course: courseId,
    focus,
    habit,
    habitLog,
    loaded,
    updateDay,
    toggleHabitDate,
    resetCourse,
    setCourse,
    setFocus,
    setHabit,
    saveError,
  } = useCloudStorage();
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [pickingCourse, setPickingCourse] = useState(false);
  const [pickingFocus, setPickingFocus] = useState(false);
  const [editingHabit, setEditingHabit] = useState(false);
  const course = courseById(courseId ?? COURSES[0].id);
  const days = course.days;
  const courseHabit = course.needsHabit ? habit || null : null;
  const getDay = (day: number) => progress[course.id][String(day)] ?? EMPTY_DAY;

  // При загрузке и смене курса открываем первый ещё не выполненный день
  useEffect(() => {
    if (!loaded) return;
    const firstUnfinished = days.findIndex((d) => !getDay(d.day).done);
    setCurrentDayIndex(firstUnfinished === -1 ? days.length - 1 : firstUnfinished);
  }, [loaded, course.id]);

  // Сообщаем боту курс, текущий день и фокус — для утреннего напоминания по делу
  useEffect(() => {
    if (!loaded || !courseId || !focus) return;
    const firstUnfinished = days.find((d) => !getDay(d.day).done);
    const doneDates = days.flatMap((d) => getDay(d.day).doneAt ?? []).sort();
    const timer = window.setTimeout(
      () =>
        syncProgress({
          course: course.id,
          day: firstUnfinished?.day ?? days.length + 1,
          focus,
          habit: courseHabit,
          lastDoneAt: doneDates[doneDates.length - 1] ?? null,
        }),
      800
    );
    return () => window.clearTimeout(timer);
  }, [loaded, courseId, focus, courseHabit, progress]);

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
    [progress, course.id]
  );
  const streak = useMemo(
    () => currentStreak(days.flatMap((d) => getDay(d.day).doneAt ?? [])),
    [progress, course.id]
  );

  const currentDay = days[Math.min(currentDayIndex, days.length - 1)];
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

  const autoKind = courseHabit ? currentDay.metric?.auto : undefined;
  const autoValue = autoKind ? autoMetricValue(autoKind, habitLog) : undefined;

  // Автозамер пишем в день, пока он открыт: так он попадёт в итоги и замрёт после выполнения
  useEffect(() => {
    if (!loaded || autoValue === undefined || lockReason || currentState.done) return;
    if (currentState.value !== autoValue) updateDay(course.id, currentDay.day, { value: autoValue });
  }, [loaded, autoValue, lockReason, currentState.done, currentState.value, course.id, currentDay.day]);

  if (!loaded) {
    return (
      <div className="app">
        <p className="hint">Загрузка…</p>
      </div>
    );
  }

  if (!courseId || pickingCourse) {
    return (
      <CoursePicker
        current={courseId}
        onPick={(c) => {
          setCourse(c);
          setPickingCourse(false);
        }}
      />
    );
  }

  if (!focus || pickingFocus) {
    return (
      <FocusPicker
        current={focus}
        lead={course.focusLead}
        onPick={(f) => {
          setFocus(f);
          setPickingFocus(false);
        }}
      />
    );
  }

  if (course.needsHabit && (!habit || editingHabit)) {
    return (
      <HabitSetup
        current={habit}
        focus={focus}
        onSave={(h) => {
          setHabit(h);
          setEditingHabit(false);
        }}
        onCancel={habit ? () => setEditingHabit(false) : undefined}
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
            {course.title}{' '}
            <button className="link-btn" onClick={() => setPickingCourse(true)}>
              сменить
            </button>
          </span>
        </div>
        <div className="header__meta">
          <span>
            Фокус: {focusTitle.toLowerCase()}{' '}
            <button className="link-btn" onClick={() => setPickingFocus(true)}>
              изменить
            </button>
          </span>
          {courseHabit && (
            <span>
              Привычка: {courseHabit}{' '}
              <button className="link-btn" onClick={() => setEditingHabit(true)}>
                изменить
              </button>
            </span>
          )}
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

      {courseHabit && (
        <HabitTracker habit={courseHabit} log={habitLog} onToggle={toggleHabitDate} />
      )}

      {completedCount === days.length && (
        <CourseFinish
          course={course}
          completedOf={(id) =>
            courseById(id).days.filter((d) => progress[id][String(d.day)]?.done).length
          }
          onSwitch={setCourse}
          onRestart={() => {
            resetCourse(course.id);
            setCurrentDayIndex(0);
          }}
        />
      )}

      {currentDay.review && <BlockSummary days={days} reviewDay={currentDay} getDay={getDay} />}

      <DayCard
        key={`${course.id}-${currentDay.day}`}
        day={currentDay}
        focus={focus}
        habit={courseHabit}
        autoValue={autoValue}
        state={currentState}
        locked={lockReason}
        onToggleTask={(i) => {
          const tasks = currentDay.tasks.map((_, idx) => !!currentState.tasks[idx]);
          tasks[i] = !tasks[i];
          updateDay(course.id, currentDay.day, { tasks });
        }}
        onNoteChange={(note) => updateDay(course.id, currentDay.day, { note })}
        onValueChange={(value) => updateDay(course.id, currentDay.day, { value })}
        onToggleDone={() =>
          updateDay(course.id, currentDay.day, {
            done: !currentState.done,
            doneAt: currentState.done ? undefined : todayKey(),
          })
        }
      />

      {!lockReason && (
        <DayThread
          course={course.id}
          day={currentDay}
          focus={focus}
          habit={courseHabit}
          state={currentState}
        />
      )}

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
