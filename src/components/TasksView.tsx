import { useState } from 'react';
import { TASK_TEXT_MAX, type Context, type Energy, type Task, type TaskList } from '../hooks/useTasks';
import { useReview } from '../hooks/useReview';
import { initData } from '../api';
import { todayKey } from '../dates';

type Props = {
  tasks: Task[];
  onAdd: (text: string, list?: TaskList, extra?: Partial<Task>) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
};

type Tab = TaskList | 'now' | 'review';

const TABS: { id: Tab; title: string; empty?: string }[] = [
  { id: 'inbox', title: 'Входящие', empty: 'Пусто. Всё разобрано — или запиши, что крутится в голове.' },
  { id: 'now', title: 'Сейчас' },
  { id: 'next', title: 'Шаги', empty: 'Здесь будут конкретные действия, которые можно сделать за раз.' },
  { id: 'project', title: 'Проекты', empty: 'Всё, что требует больше одного шага.' },
  { id: 'waiting', title: 'Жду', empty: 'То, что ждёшь от других людей.' },
  { id: 'someday', title: 'Когда-нибудь', empty: 'Идеи, которые не для этого месяца.' },
  { id: 'review', title: 'Обзор' },
];

const MOVES: { list: TaskList; label: string }[] = [
  { list: 'next', label: 'В шаги' },
  { list: 'project', label: 'Проект' },
  { list: 'waiting', label: 'Жду' },
  { list: 'someday', label: 'Когда-нибудь' },
];

export const CONTEXTS: { id: Context; label: string }[] = [
  { id: 'computer', label: 'Компьютер' },
  { id: 'phone', label: 'Телефон' },
  { id: 'home', label: 'Дом' },
  { id: 'errands', label: 'В городе' },
  { id: 'anywhere', label: 'Где угодно' },
];

const MINUTES = [5, 15, 30, 60];
const ENERGY: { id: Energy; label: string }[] = [
  { id: 'low', label: 'Мало сил' },
  { id: 'high', label: 'Много сил' },
];

const contextLabel = (c?: Context) => CONTEXTS.find((x) => x.id === c)?.label;

function Chips<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  label: string;
}) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          className={`chip ${value === o.id ? 'chip--on' : ''}`}
          aria-pressed={value === o.id}
          onClick={() => onChange(value === o.id ? undefined : o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StepRow({
  task,
  projects,
  onUpdate,
  onRemove,
  showProject = true,
}: {
  task: Task;
  projects: Task[];
  onUpdate: Props['onUpdate'];
  onRemove: Props['onRemove'];
  showProject?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const project = projects.find((p) => p.id === task.projectId);
  const meta = [
    contextLabel(task.context),
    task.minutes ? `${task.minutes} мин` : null,
    task.energy ? ENERGY.find((e) => e.id === task.energy)!.label.toLowerCase() : null,
    showProject && project ? `проект «${project.text}»` : null,
  ].filter(Boolean);

  return (
    <li className="task task--row">
      <div className="task__main">
        <label className="task-item">
          <input
            type="checkbox"
            className="task-item__input"
            checked={false}
            onChange={() => onUpdate(task.id, { doneAt: todayKey() })}
          />
          <span className="task-item__box" />
          <span>
            {task.text}
            {meta.length > 0 && <span className="task__meta">{meta.join(', ')}</span>}
          </span>
        </label>
        <div className="task__side">
          <button type="button" className="link-btn" aria-expanded={editing} onClick={() => setEditing(!editing)}>
            {editing ? 'Готово' : 'Метки'}
          </button>
          <button
            type="button"
            className="link-btn task__remove"
            aria-label={`Удалить: ${task.text}`}
            onClick={() => onRemove(task.id)}
          >
            Удалить
          </button>
        </div>
      </div>
      {editing && (
        <div className="task__editor">
          <span className="task__editor-label">Где</span>
          <Chips label="Где" options={CONTEXTS} value={task.context} onChange={(context) => onUpdate(task.id, { context })} />
          <span className="task__editor-label">Сколько минут</span>
          <Chips
            label="Сколько минут"
            options={MINUTES.map((m) => ({ id: m, label: `${m}` }))}
            value={task.minutes}
            onChange={(minutes) => onUpdate(task.id, { minutes })}
          />
          <span className="task__editor-label">Сколько сил</span>
          <Chips label="Сколько сил" options={ENERGY} value={task.energy} onChange={(energy) => onUpdate(task.id, { energy })} />
          {projects.length > 0 && (
            <>
              <span className="task__editor-label">Проект</span>
              <Chips
                label="Проект"
                options={projects.map((p) => ({ id: p.id, label: p.text }))}
                value={task.projectId}
                onChange={(projectId) => onUpdate(task.id, { projectId })}
              />
            </>
          )}
        </div>
      )}
    </li>
  );
}

function AddStep({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <form
      className="capture project__add"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text);
        setText('');
      }}
    >
      <input
        className="habit-form__input capture__input"
        value={text}
        maxLength={TASK_TEXT_MAX}
        placeholder="Следующий шаг"
        aria-label="Следующий шаг проекта"
        onChange={(e) => setText(e.target.value)}
      />
      <button type="submit" className="capture__btn" disabled={!text.trim()}>
        Добавить
      </button>
    </form>
  );
}

export function TasksView({ tasks, onAdd, onUpdate, onRemove, onClose }: Props) {
  const [text, setText] = useState('');
  const [tab, setTab] = useState<Tab>('inbox');
  const [where, setWhere] = useState<Context | undefined>();
  const [time, setTime] = useState<number | undefined>();
  const [energy, setEnergy] = useState<Energy | undefined>();
  const review = useReview();

  const open = tasks.filter((t) => !t.doneAt);
  const inList = (list: TaskList) => open.filter((t) => t.list === list);
  const steps = inList('next');
  const projects = inList('project');
  const stepsOf = (projectId: string) => steps.filter((s) => s.projectId === projectId);
  const stuck = projects.filter((p) => stepsOf(p.id).length === 0);
  const doneToday = tasks.filter((t) => t.doneAt === todayKey()).length;

  // «Что сделать сейчас»: шаг подходит, если его метка не противоречит выбранному
  const nowSteps = steps.filter(
    (s) =>
      (!where || !s.context || s.context === where || s.context === 'anywhere') &&
      (!time || !s.minutes || s.minutes <= time) &&
      (energy !== 'low' || s.energy !== 'high')
  );

  const count = (t: Tab) => (t === 'now' || t === 'review' ? null : inList(t).length);

  const complete = (task: Task, quick = false) =>
    onUpdate(task.id, { doneAt: todayKey(), ...(quick ? { quick: true } : {}) });

  const reviewSteps = [
    { id: 'inbox', label: 'Разобрать «Входящие» до нуля', info: `сейчас ${inList('inbox').length}` },
    { id: 'head', label: 'Выписать всё, что ещё крутится в голове' },
    { id: 'calendar', label: 'Проверить календарь: прошлая неделя и две вперёд' },
    { id: 'steps', label: 'Пройтись по «Шагам»: закрыть сделанное, убрать неактуальное', info: `шагов ${steps.length}` },
    {
      id: 'projects',
      label: 'У каждого проекта есть следующий шаг',
      info: stuck.length ? `без шага: ${stuck.length}` : 'все с шагом',
    },
    { id: 'waiting', label: 'Пройтись по «Жду»: кому напомнить', info: `пунктов ${inList('waiting').length}` },
    { id: 'someday', label: 'Заглянуть в «Когда-нибудь»: что пора начать', info: `идей ${inList('someday').length}` },
  ];

  const current = TABS.find((t) => t.id === tab)!;
  const plain = tab === 'waiting' || tab === 'someday';

  return (
    <div className="app">
      <header className="header">
        <div className="header__top">
          <h1 className="header__title">Мои дела</h1>
          <button type="button" className="link-btn" onClick={onClose}>
            К курсу
          </button>
        </div>
        <p className="picker__lead">
          Сначала всё во «Входящие», потом разбор: по каждому пункту одно решение.
          {initData() && ' Можно просто написать боту — сообщение попадёт сюда.'}
        </p>
      </header>

      <form
        className="capture"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onAdd(text);
          setText('');
          setTab('inbox');
        }}
      >
        <input
          className="habit-form__input capture__input"
          value={text}
          maxLength={TASK_TEXT_MAX}
          placeholder="Что крутится в голове?"
          aria-label="Новое дело во входящие"
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="capture__btn" disabled={!text.trim()}>
          Записать
        </button>
      </form>

      <div className="tabs" role="tablist">
        {TABS.map((t) => {
          const n = count(t.id);
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`tab ${tab === t.id ? 'tab--on' : ''}`}
              onClick={(e) => {
                setTab(t.id);
                e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
              }}
            >
              {t.title}
              {n !== null && <span className="tab__count">{n}</span>}
              {t.id === 'project' && stuck.length > 0 && (
                <span className="tab__alert" aria-label={`без шага: ${stuck.length}`} />
              )}
            </button>
          );
        })}
      </div>

      <section className="card tasks">
        {tab === 'inbox' && (
          <>
            {inList('inbox').length === 0 && <p className="thread__hint">{current.empty}</p>}
            <ul className="tasks__list">
              {inList('inbox').map((task) => (
                <li key={task.id} className="task">
                  <p className="task__text">{task.text}</p>
                  <div className="task__actions">
                    <button type="button" className="chip" onClick={() => complete(task, true)}>
                      Сделал за 2 минуты
                    </button>
                    {MOVES.map((m) => (
                      <button key={m.list} type="button" className="chip" onClick={() => onUpdate(task.id, { list: m.list })}>
                        {m.label}
                      </button>
                    ))}
                    <button type="button" className="chip chip--danger" onClick={() => onRemove(task.id)}>
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'now' && (
          <>
            <p className="task__editor-label">Где ты</p>
            <Chips label="Где ты" options={CONTEXTS.filter((c) => c.id !== 'anywhere')} value={where} onChange={setWhere} />
            <p className="task__editor-label">Сколько есть времени, минут</p>
            <Chips label="Сколько времени" options={MINUTES.map((m) => ({ id: m, label: `до ${m}` }))} value={time} onChange={setTime} />
            <p className="task__editor-label">Сколько сил</p>
            <Chips label="Сколько сил" options={ENERGY} value={energy} onChange={setEnergy} />
            <div className="now__result">
              {steps.length === 0 ? (
                <p className="thread__hint">Шагов пока нет. Разбери «Входящие» — конкретные действия отправляй «В шаги».</p>
              ) : nowSteps.length === 0 ? (
                <p className="thread__hint">Под эти условия ничего не подходит. Сними один из фильтров.</p>
              ) : (
                <ul className="tasks__list">
                  {nowSteps.map((s) => (
                    <StepRow key={s.id} task={s} projects={projects} onUpdate={onUpdate} onRemove={onRemove} />
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {tab === 'project' && (
          <>
            {projects.length === 0 && <p className="thread__hint">{current.empty}</p>}
            {stuck.length > 0 && (
              <p className="tracker__warn">
                Без следующего шага: {stuck.length}. Проект без шага стоит на месте — допиши каждому одно действие.
              </p>
            )}
            <ul className="tasks__list">
              {projects.map((p) => {
                const own = stepsOf(p.id);
                return (
                  <li key={p.id} className="task project">
                    <div className="task__main">
                      <label className="task-item">
                        <input type="checkbox" className="task-item__input" checked={false} onChange={() => complete(p)} />
                        <span className="task-item__box" />
                        <span className="task__text">{p.text}</span>
                      </label>
                      <button
                        type="button"
                        className="link-btn task__remove"
                        aria-label={`Удалить проект: ${p.text}`}
                        onClick={() => onRemove(p.id)}
                      >
                        Удалить
                      </button>
                    </div>
                    {own.length === 0 && <p className="project__stuck">Нет следующего шага</p>}
                    <ul className="tasks__list project__steps">
                      {own.map((s) => (
                        <StepRow key={s.id} task={s} projects={projects} onUpdate={onUpdate} onRemove={onRemove} showProject={false} />
                      ))}
                    </ul>
                    <AddStep onAdd={(stepText) => onAdd(stepText, 'next', { projectId: p.id })} />
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {tab === 'next' && (
          <>
            {steps.length === 0 && <p className="thread__hint">{current.empty}</p>}
            <ul className="tasks__list">
              {steps.map((s) => (
                <StepRow key={s.id} task={s} projects={projects} onUpdate={onUpdate} onRemove={onRemove} />
              ))}
            </ul>
          </>
        )}

        {plain && (
          <>
            {inList(tab as TaskList).length === 0 && <p className="thread__hint">{current.empty}</p>}
            <ul className="tasks__list">
              {inList(tab as TaskList).map((task) => (
                <li key={task.id} className="task task--row">
                  <div className="task__main">
                    <label className="task-item">
                      <input type="checkbox" className="task-item__input" checked={false} onChange={() => complete(task)} />
                      <span className="task-item__box" />
                      <span>{task.text}</span>
                    </label>
                    <div className="task__side">
                      {tab === 'someday' && (
                        <button type="button" className="link-btn" onClick={() => onUpdate(task.id, { list: 'next' })}>
                          В шаги
                        </button>
                      )}
                      <button
                        type="button"
                        className="link-btn task__remove"
                        aria-label={`Удалить: ${task.text}`}
                        onClick={() => onRemove(task.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {tab === 'review' && (
          <>
            <p className="thread__hint">
              Раз в неделю система чистится, иначе ей перестаёшь доверять.
              {review.lastDone ? ` Последний обзор: ${review.lastDone.split('-').reverse().join('.')}.` : ''}
            </p>
            <ul className="tasks__list review">
              {reviewSteps.map((step) => {
                const checked = review.checked.includes(step.id);
                return (
                  <li key={step.id} className="task">
                    <label className={`task-item ${checked ? 'task-item--checked' : ''}`}>
                      <input
                        type="checkbox"
                        className="task-item__input"
                        checked={checked}
                        onChange={() => review.toggle(step.id)}
                      />
                      <span className="task-item__box" />
                      <span>
                        {step.label}
                        {step.info && <span className="task__meta">{step.info}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="btn btn--done"
              disabled={review.checked.length < reviewSteps.length}
              onClick={review.finish}
            >
              {review.lastDone === todayKey() ? 'Обзор проведён сегодня' : 'Обзор проведён'}
            </button>
          </>
        )}
      </section>

      {doneToday > 0 && <p className="tasks__done">Сегодня закрыто: {doneToday}</p>}
    </div>
  );
}
