import { COURSES, type CourseId } from '../courses';

type Props = {
  current: CourseId | null;
  onPick: (course: CourseId) => void;
};

export function CoursePicker({ current, onPick }: Props) {
  return (
    <div className="app">
      <header className="header">
        <h1 className="header__title">24 дня</h1>
        <p className="picker__lead">
          Выбери курс. Прогресс у каждого свой, переключаться можно в любой момент.
        </p>
      </header>

      <div className="focus-list">
        {COURSES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`focus-option ${current === c.id ? 'focus-option--active' : ''}`}
            onClick={() => onPick(c.id)}
          >
            <span className="focus-option__title">{c.title}</span>
            <span className="focus-option__desc">{c.description}</span>
            <span className="focus-option__book">{c.book}</span>
            {c.note && <span className="focus-option__note">{c.note}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
