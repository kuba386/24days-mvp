import { useState } from 'react';
import { HABIT_EXAMPLES, HABIT_MAX } from '../courses';
import type { Focus } from '../focus';

type Props = {
  current: string;
  focus: Focus;
  onSave: (habit: string) => void;
  onCancel?: () => void;
};

export function HabitSetup({ current, focus, onSave, onCancel }: Props) {
  const [text, setText] = useState(current);
  const trimmed = text.trim();

  return (
    <div className="app">
      <header className="header">
        <h1 className="header__title">Твоя привычка</h1>
        <p className="picker__lead">
          Одна привычка на все 24 дня. Напиши конкретно: что, сколько и когда. Её текст будет в
          заданиях каждого дня.
        </p>
      </header>

      <form
        className="card habit-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) onSave(trimmed);
        }}
      >
        <label className="habit-form__label" htmlFor="habit">
          Привычка
        </label>
        <input
          id="habit"
          className="habit-form__input"
          value={text}
          maxLength={HABIT_MAX}
          placeholder={HABIT_EXAMPLES[focus]}
          autoFocus
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="button"
          className="link-btn habit-form__example"
          onClick={() => setText(HABIT_EXAMPLES[focus])}
        >
          Взять пример: {HABIT_EXAMPLES[focus]}
        </button>
        <button type="submit" className="btn btn--done" disabled={!trimmed}>
          Сохранить привычку
        </button>
        {onCancel && (
          <button type="button" className="btn btn--plain" onClick={onCancel}>
            Отмена
          </button>
        )}
      </form>
    </div>
  );
}
