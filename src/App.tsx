import { useEffect, useMemo, useState } from 'react';
import { DayCard } from './components/DayCard';
import { FocusPicker } from './components/FocusPicker';
import { CoursePicker } from './components/CoursePicker';
import { HabitSetup } from './components/HabitSetup';
import { HabitTracker } from './components/HabitTracker';
import { CourseFinish } from './components/CourseFinish';
import { TasksView } from './components/TasksView';
import { StatsView } from './components/StatsView';
import { HabitsView } from './components/HabitsView';
import { useHabits } from './hooks/useHabits';
import { ExpensesView } from './components/ExpensesView';
import { useExpenses } from './hooks/useExpenses';
import { formatAmount, hasAnyRecords, spentOn } from './expenses';
import { useBackNav } from './hooks/useBackNav';
import { useTasks } from './hooks/useTasks';
import { useDaily } from './hooks/useDaily';
import { Top3Card } from './components/Top3Card';
import { EnergyCard } from './components/EnergyCard';
import { BlockSummary } from './components/BlockSummary';
import { JourneyMap } from './components/JourneyMap';
import { DayThread } from './components/DayThread';
import { EMPTY_DAY, useCloudStorage } from './hooks/useCloudStorage';
import { FOCUSES } from './focus';
import { currentStreak, pluralDays, todayKey } from './dates';
import { syncProgress } from './api';
import { autoMetricValue, courseById, COURSES } from './courses';

// «Я человек, который …» из заметки первого дня «Атомных привычек»
const identityPhrase = (note?: string) => {
  const line = note?.split('\n').find((l) => /^я человек, который/i.test(l.trim()))?.trim();
  return line && !line.includes('…') ? line.replace(/[.!]+$/, '') : null;
};

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
  const { tasks, add: addTask, update: updateTask, remove: removeTask, restore: restoreTask } = useTasks();
  const { top3, top3History, updateTop3, energy, addEnergy } = useDaily();
  const [showTasks, setShowTasks] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHabits, setShowHabits] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);
  const money = useExpenses();
  const myHabits = useHabits();
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [pickingCourse, setPickingCourse] = useState(false);
  const [pickingFocus, setPickingFocus] = useState(false);
  const [editingHabit, setEditingHabit] = useState(false);
  const closeScreens = () => {
    setShowTasks(false);
    setShowStats(false);
    setShowHabits(false);
    setShowExpenses(false);
    setPickingCourse(false);
    setPickingFocus(false);
    setEditingHabit(false);
  };
  useBackNav(showTasks || showStats || showHabits || showExpenses || pickingCourse || pickingFocus || editingHabit, closeScreens);
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
    if (!loaded || !courseId || (course.needsFocus && !focus)) return;
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

  const autoKind = currentDay.metric?.auto;
  const autoValue = autoKind
    ? autoMetricValue(autoKind, {
        expenses: money.log,
        hourRate: progress.money['2']?.value,
        habitLog: courseHabit ? habitLog : null,
        tasks,
        top3,
        energy,
        dayItems: currentState.items,
      })
    : undefined;

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

  if (course.needsFocus && (!focus || pickingFocus)) {
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
        focus={focus ?? 'product'}
        onSave={(h) => {
          setHabit(h);
          setEditingHabit(false);
        }}
        onCancel={habit ? () => setEditingHabit(false) : undefined}
      />
    );
  }

  if (showTasks) {
    return (
      <TasksView
        tasks={tasks}
        onAdd={addTask}
        onUpdate={updateTask}
        onRemove={removeTask}
        onRestore={restoreTask}
        onClose={() => setShowTasks(false)}
      />
    );
  }

  if (showExpenses) {
    return (
      <ExpensesView
        log={money.log}
        categories={money.categories}
        hourRate={progress.money['2']?.value}
        onAdd={money.add}
        onUpdate={money.update}
        onRemove={money.remove}
        onRestore={money.restore}
        onAddCategory={money.addCategory}
        onClose={() => setShowExpenses(false)}
      />
    );
  }

  if (showHabits) {
    return (
      <HabitsView
        habits={myHabits.habits}
        onAdd={myHabits.add}
        onToggle={myHabits.toggle}
        onRename={myHabits.rename}
        onRemove={myHabits.remove}
        onRestore={myHabits.restore}
        onClose={() => setShowHabits(false)}
      />
    );
  }

  if (showStats) {
    return (
      <StatsView
        progress={progress}
        habit={habit || null}
        habitLog={habitLog}
        top3History={top3History}
        energy={energy}
        tasks={tasks}
        onClose={() => setShowStats(false)}
      />
    );
  }

  const focusTitle = FOCUSES.find((f) => f.id === focus)?.title ?? '';
  const openTasks = tasks.filter((t) => !t.doneAt);
  const inboxCount = openTasks.filter((t) => t.list === 'inbox').length;

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
          {course.needsFocus && (
            <span>
              Фокус: {focusTitle.toLowerCase()}{' '}
              <button className="link-btn" onClick={() => setPickingFocus(true)}>
                изменить
              </button>
            </span>
          )}
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
            {' · '}
            <button type="button" className="link-btn" onClick={() => setShowStats(true)}>
              статистика
            </button>
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

      {course.id === 'year' && (
        <>
          <Top3Card items={top3} history={top3History} onUpdate={updateTop3} />
          <EnergyCard entries={energy} onRate={addEnergy} />
        </>
      )}

      {(course.id === 'money' || hasAnyRecords(money.log)) && (
        <button type="button" className="card tasks-entry" onClick={() => setShowExpenses(true)}>
          <span>
            <span className="tasks-entry__title">Мои траты</span>
            <span className="tasks-entry__desc">
              {hasAnyRecords(money.log)
                ? `Сегодня потрачено: ${formatAmount(spentOn(money.log, todayKey()))}`
                : 'Записывай траты и доходы, оценивай, радуют ли они'}
            </span>
          </span>
          <span className="tasks-entry__go">Открыть</span>
        </button>
      )}

      <button type="button" className="card tasks-entry" onClick={() => setShowHabits(true)}>
        <span>
          <span className="tasks-entry__title">Мои привычки</span>
          <span className="tasks-entry__desc">
            {myHabits.habits.length === 0
              ? 'Добавь привычки и отмечай их каждый день'
              : `Сегодня: ${myHabits.habits.filter((h) => h.log.includes(todayKey())).length} из ${myHabits.habits.length}`}
          </span>
        </span>
        <span className="tasks-entry__go">Открыть</span>
      </button>

      {(course.id === 'gtd' || openTasks.length > 0) && (
        <button type="button" className="card tasks-entry" onClick={() => setShowTasks(true)}>
          <span>
            <span className="tasks-entry__title">Мои дела</span>
            <span className="tasks-entry__desc">
              {openTasks.length === 0
                ? 'Входящие, шаги, проекты — вся система в одном месте'
                : `Во входящих: ${inboxCount}. Всего открыто: ${openTasks.length}`}
            </span>
          </span>
          <span className="tasks-entry__go">Открыть</span>
        </button>
      )}

      {courseHabit && (
        <HabitTracker
          habit={courseHabit}
          identity={identityPhrase(progress.habits['1']?.note)}
          log={habitLog}
          onToggle={toggleHabitDate}
        />
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
        focus={focus ?? 'product'}
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
        onItemsChange={(items) => updateDay(course.id, currentDay.day, { items })}
        onPicksChange={(picks) => updateDay(course.id, currentDay.day, { picks })}
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
