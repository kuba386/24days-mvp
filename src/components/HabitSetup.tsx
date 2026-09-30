import { useState } from 'react';
import { composeHabit, HABIT_AMOUNT, HABIT_MAX, HABIT_WHAT, HABIT_WHEN } from '../courses';
import type { Focus } from '../focus';

type Props = {
  current: string;
  focus: Focus;
  onSave: (habit: string) => void;
  onCancel?: () => void;
};

type FieldProps = {
  id: string;
  label: string;
  hint: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
};

function Field({ id, label, hint, value, options, placeholder, onChange }: FieldProps) {
  return (
    <div className="habit-field">
      <label className="habit-field__label" htmlFor={id}>
        {label}
        <span className="habit-field__hint">{hint}</span>
      </label>
      <input
        id={id}
        className="habit-form__input"
        value={value}
        maxLength={60}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="chips">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`chip ${value === option ? 'chip--on' : ''}`}
            aria-pressed={value === option}
            onClick={() => onChange(value === option ? '' : option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HabitSetup({ current, focus, onSave, onCancel }: Props) {
  // Сохранённую привычку не разбираем обратно на части: она целиком попадает в «Что»
  const [what, setWhat] = useState(current);
  const [amount, setAmount] = useState('');
  const [when, setWhen] = useState('');
  const habit = composeHabit(what, amount, when).slice(0, HABIT_MAX);

  return (
    <div className="app">
      <header className="header">
        <h1 className="header__title">Твоя привычка</h1>
        <p className="picker__lead">
          Одна привычка на все 24 дня. Выбери вариант или напиши свой — из трёх частей соберётся
          фраза для заданий каждого дня.
        </p>
      </header>

      <form
        className="card habit-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (what.trim()) onSave(habit);
        }}
      >
        <Field
          id="habit-what"
          label="Что"
          hint="одно конкретное действие"
          value={what}
          options={HABIT_WHAT[focus]}
          placeholder={HABIT_WHAT[focus][0]}
          onChange={setWhat}
        />
        <Field
          id="habit-amount"
          label="Сколько"
          hint="лучше меньше, но каждый день"
          value={amount}
          options={HABIT_AMOUNT}
          placeholder="10 минут"
          onChange={setAmount}
        />
        <Field
          id="habit-when"
          label="Когда"
          hint="после чего-то, что и так бывает каждый день"
          value={when}
          options={HABIT_WHEN}
          placeholder="после подъёма"
          onChange={setWhen}
        />

        <div className="habit-preview" aria-live="polite">
          <span className="habit-field__label">Получится</span>
          <p className={`habit-preview__text ${what.trim() ? '' : 'habit-preview__text--empty'}`}>
            {what.trim() ? habit : 'Выбери, что будешь делать'}
          </p>
        </div>

        <button type="submit" className="btn btn--done" disabled={!what.trim()}>
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
