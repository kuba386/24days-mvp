import { FOCUSES, type Focus } from '../focus';

type Props = {
  current: Focus | null;
  onPick: (focus: Focus) => void;
};

export function FocusPicker({ current, onPick }: Props) {
  return (
    <div className="app">
      <header className="header">
        <div className="header__eyebrow">24 DAYS</div>
        <div className="header__title">На что направим 24 дня?</div>
        <div className="header__subtitle">
          Задачи по времени, энергии и вниманию одинаковые для всех. Отличается ежедневное
          действие — оно будет под твою цель.
        </div>
      </header>

      <div className="focus-list">
        {FOCUSES.map((f) => (
          <button
            key={f.id}
            className={`focus-option ${current === f.id ? 'focus-option--active' : ''}`}
            onClick={() => onPick(f.id)}
          >
            <span className="focus-option__title">{f.title}</span>
            <span className="focus-option__desc">{f.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
