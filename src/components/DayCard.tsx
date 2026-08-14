export type Day = {
  day: number;
  block: string;
  title: string;
  focus: string;
  tasks: string[];
  product_action: string;
  review: boolean;
};

type Props = {
  day: Day;
  done: boolean;
  onToggle: () => void;
};

export function DayCard({ day, done, onToggle }: Props) {
  return (
    <div className={`card ${day.review ? 'card--review' : ''}`}>
      <div className="card__block">
        День {day.day} · {day.block}
        {day.review ? ' · Обзор блока' : ''}
      </div>
      <div className="card__title">{day.title}</div>
      <div className="card__focus">{day.focus}</div>

      <ul className="task-list">
        {day.tasks.map((task, i) => (
          <li className="task-item" key={i}>
            <span className="task-item__box" />
            {task}
          </li>
        ))}
      </ul>

      <div className="product-action">
        <span className="product-action__label">Действие для продукта</span>
        {day.product_action}
      </div>

      <button
        className={`btn ${done ? 'btn--undone' : 'btn--done'}`}
        onClick={onToggle}
      >
        {done ? '✓ День выполнен — отменить' : 'Отметить день выполненным'}
      </button>
    </div>
  );
}
