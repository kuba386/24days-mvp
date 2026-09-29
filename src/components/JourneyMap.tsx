import type { Day } from './DayCard';
import type { DayState } from '../hooks/useCloudStorage';
import { blockStyle } from '../blocks';

type Props = {
  days: Day[];
  currentIndex: number;
  getDay: (day: number) => DayState;
  isLocked: (index: number) => boolean;
  onSelect: (index: number) => void;
};

export function JourneyMap({ days, currentIndex, getDay, isLocked, onSelect }: Props) {
  const rows = new Map<string, number[]>();
  days.forEach((d, i) => rows.set(d.block, [...(rows.get(d.block) ?? []), i]));

  return (
    <div className="map" role="navigation" aria-label="Карта 24 дней">
      {[...rows].map(([block, indexes]) => (
        <div className="map__row" key={block} style={blockStyle(block)}>
          <span className="map__block">{block}</span>
          <div className="map__cells">
            {indexes.map((i) => {
              const day = days[i];
              const done = getDay(day.day).done;
              const state = done ? 'done' : isLocked(i) ? 'locked' : 'open';
              return (
                <button
                  key={day.day}
                  type="button"
                  className={`cell cell--${state} ${i === currentIndex ? 'cell--current' : ''}`}
                  aria-label={`День ${day.day}, ${day.title}${done ? ', выполнен' : ''}`}
                  aria-current={i === currentIndex ? 'true' : undefined}
                  onClick={() => onSelect(i)}
                >
                  {day.day}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
