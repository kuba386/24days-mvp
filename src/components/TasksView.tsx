import { useState } from 'react';
import { TASK_TEXT_MAX, type Task, type TaskList } from '../hooks/useTasks';
import { initData } from '../api';
import { todayKey } from '../dates';

type Props = {
  tasks: Task[];
  onAdd: (text: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
};

const LISTS: { id: TaskList; title: string; empty: string }[] = [
  { id: 'inbox', title: 'Входящие', empty: 'Пусто. Всё разобрано — или запиши, что крутится в голове.' },
  { id: 'next', title: 'Шаги', empty: 'Здесь будут конкретные действия, которые можно сделать за раз.' },
  { id: 'project', title: 'Проекты', empty: 'Всё, что требует больше одного шага.' },
  { id: 'waiting', title: 'Жду', empty: 'То, что ждёшь от других людей.' },
  { id: 'someday', title: 'Когда-нибудь', empty: 'Идеи, которые не для этого месяца.' },
];

// Куда можно отправить пункт при разборе входящих
const MOVES: { list: TaskList; label: string }[] = [
  { list: 'next', label: 'В шаги' },
  { list: 'project', label: 'Проект' },
  { list: 'waiting', label: 'Жду' },
  { list: 'someday', label: 'Когда-нибудь' },
];

export function TasksView({ tasks, onAdd, onUpdate, onRemove, onClose }: Props) {
  const [text, setText] = useState('');
  const [active, setActive] = useState<TaskList>('inbox');
  const open = tasks.filter((t) => !t.doneAt);
  const count = (list: TaskList) => open.filter((t) => t.list === list).length;
  const doneToday = tasks.filter((t) => t.doneAt === todayKey()).length;
  const shown = open.filter((t) => t.list === active);
  const current = LISTS.find((l) => l.id === active)!;

  const complete = (task: Task, quick = false) =>
    onUpdate(task.id, { doneAt: todayKey(), ...(quick ? { quick: true } : {}) });

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
          setActive('inbox');
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
        {LISTS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={active === l.id}
            className={`tab ${active === l.id ? 'tab--on' : ''}`}
            onClick={() => setActive(l.id)}
          >
            {l.title}
            <span className="tab__count">{count(l.id)}</span>
          </button>
        ))}
      </div>

      <section className="card tasks">
        {shown.length === 0 && <p className="thread__hint">{current.empty}</p>}
        <ul className="tasks__list">
          {shown.map((task) =>
            active === 'inbox' ? (
              <li key={task.id} className="task">
                <p className="task__text">{task.text}</p>
                <div className="task__actions">
                  <button type="button" className="chip" onClick={() => complete(task, true)}>
                    Сделал за 2 минуты
                  </button>
                  {MOVES.map((m) => (
                    <button
                      key={m.list}
                      type="button"
                      className="chip"
                      onClick={() => onUpdate(task.id, { list: m.list })}
                    >
                      {m.label}
                    </button>
                  ))}
                  <button type="button" className="chip chip--danger" onClick={() => onRemove(task.id)}>
                    Удалить
                  </button>
                </div>
              </li>
            ) : (
              <li key={task.id} className="task task--row">
                <label className="task-item">
                  <input
                    type="checkbox"
                    className="task-item__input"
                    checked={false}
                    onChange={() => complete(task)}
                  />
                  <span className="task-item__box" />
                  <span>{task.text}</span>
                </label>
                <div className="task__side">
                  {active === 'someday' && (
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
              </li>
            )
          )}
        </ul>
      </section>

      {doneToday > 0 && <p className="tasks__done">Сегодня закрыто: {doneToday}</p>}
    </div>
  );
}
