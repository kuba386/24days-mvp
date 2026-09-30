import { useState } from 'react';

export type ScoreMark = '+' | '-' | '=';
export type ScoreItem = { text: string; mark: ScoreMark | null };

type Props = {
  items: ScoreItem[];
  disabled: boolean;
  onChange: (items: ScoreItem[]) => void;
};

const TYPICAL = [
  'Проснулся',
  'Телефон в кровати',
  'Душ',
  'Завтрак',
  'Кофе',
  'Дорога',
  'Почта и чаты',
  'Соцсети',
  'Обед',
  'Сладкое',
  'Прогулка',
  'Сериал',
  'Лёг спать',
];

const MARKS: { mark: ScoreMark; label: string; title: string }[] = [
  { mark: '+', label: '+', title: 'помогает' },
  { mark: '-', label: '−', title: 'мешает' },
  { mark: '=', label: '=', title: 'нейтрально' },
];

export function Scorecard({ items, disabled, onChange }: Props) {
  const [text, setText] = useState('');
  const has = new Set(items.map((i) => i.text));

  const add = (value: string) => {
    const clean = value.trim().slice(0, 80);
    if (!clean || has.has(clean) || items.length >= 40) return;
    onChange([...items, { text: clean, mark: null }]);
  };

  const count = (mark: ScoreMark) => items.filter((i) => i.mark === mark).length;

  return (
    <div className="scorecard">
      <div className="scorecard__head">
        <span className="action__label">Твой день по порядку</span>
        {items.length > 0 && (
          <span className="scorecard__totals">
            +{count('+')} −{count('-')} ={count('=')}
          </span>
        )}
      </div>

      <ul className="scorecard__list">
        {items.map((item, i) => (
          <li key={item.text} className="scorecard__row">
            <span className="scorecard__text">{item.text}</span>
            <span className="scorecard__marks" role="group" aria-label={`Оценка: ${item.text}`}>
              {MARKS.map((m) => (
                <button
                  key={m.mark}
                  type="button"
                  disabled={disabled}
                  title={m.title}
                  aria-label={m.title}
                  aria-pressed={item.mark === m.mark}
                  className={`mark mark--${m.mark === '-' ? 'minus' : m.mark === '+' ? 'plus' : 'eq'} ${item.mark === m.mark ? 'mark--on' : ''}`}
                  onClick={() =>
                    onChange(items.map((it, idx) => (idx === i ? { ...it, mark: it.mark === m.mark ? null : m.mark } : it)))
                  }
                >
                  {m.label}
                </button>
              ))}
              <button
                type="button"
                className="mark mark--remove"
                disabled={disabled}
                aria-label={`Убрать: ${item.text}`}
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              >
                ×
              </button>
            </span>
          </li>
        ))}
      </ul>

      {!disabled && (
        <>
          <form
            className="capture scorecard__add"
            onSubmit={(e) => {
              e.preventDefault();
              add(text);
              setText('');
            }}
          >
            <input
              className="habit-form__input capture__input"
              value={text}
              maxLength={80}
              placeholder="Следующее действие"
              aria-label="Добавить действие"
              onChange={(e) => setText(e.target.value)}
            />
            <button type="submit" className="capture__btn" disabled={!text.trim()}>
              Добавить
            </button>
          </form>
          <div className="chips">
            {TYPICAL.filter((t) => !has.has(t)).map((t) => (
              <button key={t} type="button" className="chip" onClick={() => add(t)}>
                {t}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
