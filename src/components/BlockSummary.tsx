import type { Day } from './DayCard';
import type { DayState } from '../hooks/useCloudStorage';

type Props = {
  days: Day[];
  reviewDay: Day;
  getDay: (day: number) => DayState;
};

// На обзорном дне показываем замеры своего блока; на последнем дне — всего цикла
export function BlockSummary({ days, reviewDay, getDay }: Props) {
  const isFinal = reviewDay.day === days[days.length - 1].day;
  const measured = days.filter(
    (d) => d.metric && (isFinal || d.block === reviewDay.block)
  );
  const blocks = [...new Set(measured.map((d) => d.block))];
  const filled = measured.filter((d) => getDay(d.day).value !== undefined).length;

  return (
    <div className="card card--summary">
      <div className="card__block">
        {isFinal ? 'Твои замеры за весь цикл' : `Твои замеры · ${reviewDay.block}`}
      </div>
      <div className="card__focus">
        Заполнено {filled} из {measured.length}. Это твои данные, а не советы из книги — смотри,
        что реально сработало.
      </div>

      {blocks.map((block) => (
        <div key={block} className="summary-block">
          {isFinal && <div className="summary-block__title">{block}</div>}
          {measured
            .filter((d) => d.block === block)
            .map((d) => {
              const value = getDay(d.day).value;
              return (
                <div key={d.day} className="summary-row">
                  <span className="summary-row__label">
                    День {d.day} · {d.metric!.label}
                  </span>
                  <span className={`summary-row__value ${value === undefined ? 'summary-row__value--empty' : ''}`}>
                    {value === undefined ? '—' : `${value} ${d.metric!.unit}`}
                  </span>
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
