import type { Day } from './DayCard';
import type { DayState } from '../hooks/useCloudStorage';
import { blockStyle } from '../blocks';

type Props = {
  days: Day[];
  reviewDay: Day;
  getDay: (day: number) => DayState;
};

// На обзорном дне — замеры и заметки своего блока; на последнем дне — замеры всего цикла
export function BlockSummary({ days, reviewDay, getDay }: Props) {
  const isFinal = reviewDay.day === days[days.length - 1].day;
  const measured = days.filter(
    (d) => d.metric && d.day !== reviewDay.day && (isFinal || d.block === reviewDay.block)
  );
  const blocks = [...new Set(measured.map((d) => d.block))];
  const filled = measured.filter((d) => getDay(d.day).value !== undefined).length;

  // Заметки блока до обзора; на финале добавляем день 1, чтобы было с чем сравнить
  const noted = days.filter(
    (d) =>
      d.day !== reviewDay.day &&
      ((d.block === reviewDay.block && d.day < reviewDay.day) || (isFinal && d.day === 1)) &&
      getDay(d.day).note.trim()
  );

  return (
    <section className="card card--summary" style={blockStyle(reviewDay.block)}>
      <h2 className="card__title">
        {isFinal ? 'Итоги всего пути' : `Итоги блока: ${reviewDay.block.toLowerCase()}`}
      </h2>
      <p className="card__lead">
        {measured.length > 0 && `Замеров заполнено: ${filled} из ${measured.length}. `}
        Это твои данные, а не советы из книги — смотри, что реально сработало.
      </p>

      {blocks.map((block) => (
        <div key={block} className="summary-block" style={blockStyle(block)}>
          {isFinal && <div className="summary-block__title">{block}</div>}
          {measured
            .filter((d) => d.block === block)
            .map((d) => {
              const value = getDay(d.day).value;
              return (
                <div key={d.day} className="summary-row">
                  <span className="summary-row__day">{d.day}</span>
                  <span className="summary-row__label">{d.metric!.label}</span>
                  <span className={`summary-row__value ${value === undefined ? 'summary-row__value--empty' : ''}`}>
                    {value === undefined ? '—' : `${value} ${d.metric!.unit}`}
                  </span>
                </div>
              );
            })}
        </div>
      ))}

      {noted.length > 0 && (
        <div className="summary-notes">
          <div className="summary-block__title">Твои заметки</div>
          {noted.map((d) => (
            <div key={d.day} className="summary-note" style={blockStyle(d.block)}>
              <span className="summary-row__day">{d.day}</span>
              <div>
                <div className="summary-note__title">{d.title}</div>
                <p className="summary-note__text">{getDay(d.day).note.trim()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
