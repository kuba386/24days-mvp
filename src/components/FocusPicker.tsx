import { FOCUSES, type Focus } from '../focus';

type Props = {
  current: Focus | null;
  onPick: (focus: Focus) => void;
};

export function FocusPicker({ current, onPick }: Props) {
  return (
    <div className="app">
      <header className="header">
        <h1 className="header__title">24 дня</h1>
        <p className="picker__lead">
          На что направим эти дни? Задачи по времени, энергии и вниманию у всех одинаковые, а
          ежедневное действие — под твою цель.
        </p>
      </header>

      <div className="focus-list">
        {FOCUSES.map((f) => (
          <button
            key={f.id}
            type="button"
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
