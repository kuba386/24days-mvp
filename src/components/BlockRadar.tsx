import type { Day } from './DayCard';
import type { DayState } from '../hooks/useCloudStorage';
import { BLOCK_COLORS } from '../blocks';

type Props = {
  days: Day[];
  getDay: (day: number) => DayState;
  // Блок обзорного дня: сравниваем только уже пройденные блоки
  reachedBlock: string;
};

// Насколько полно пройден день: отметка дня весит больше всего, остальное — задачи, замер и заметка
function dayScore(day: Day, state: DayState) {
  // Где у дня нет задач или замера, эта часть засчитывается только за выполненный день
  const done = state.done ? 1 : 0;
  const tasks = day.tasks.length ? day.tasks.filter((_, i) => state.tasks[i]).length / day.tasks.length : done;
  const metric = day.metric ? (state.value !== undefined ? 1 : 0) : done;
  const note = state.note.trim() || state.items?.length ? 1 : 0;
  return (state.done ? 0.5 : 0) + tasks * 0.25 + metric * 0.15 + note * 0.1;
}

// Холст шире, чем выше: подписи слева и справа длиннее, чем сверху и снизу
const WIDTH = 400;
const HEIGHT = 270;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const RADIUS = 90;

export function BlockRadar({ days, getDay, reachedBlock }: Props) {
  const blocks = [...new Set(days.map((d) => d.block))];
  const scores = blocks.map((block) => {
    const inBlock = days.filter((d) => d.block === block);
    return inBlock.reduce((sum, d) => sum + dayScore(d, getDay(d.day)), 0) / inBlock.length;
  });

  const point = (i: number, r: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / blocks.length;
    return [CX + Math.cos(angle) * r, CY + Math.sin(angle) * r] as const;
  };
  const polygon = (r: (i: number) => number) =>
    blocks.map((_, i) => point(i, r(i)).map((v) => v.toFixed(1)).join(',')).join(' ');

  const reached = blocks.slice(0, blocks.indexOf(reachedBlock) + 1);
  const weakest =
    reached.length > 1
      ? reached.reduce((a, b) => (scores[blocks.indexOf(b)] < scores[blocks.indexOf(a)] ? b : a))
      : null;

  return (
    <div className="radar">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="radar__svg"
        role="img"
        aria-label={blocks.map((b, i) => `${b}: ${Math.round(scores[i] * 100)}%`).join(', ')}
      >
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={polygon(() => RADIUS * f)} className="radar__ring" />
        ))}
        {blocks.map((_, i) => {
          const [x, y] = point(i, RADIUS);
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} className="radar__axis" />;
        })}
        <polygon points={polygon((i) => RADIUS * Math.max(scores[i], 0.02))} className="radar__shape" />
        {blocks.map((block, i) => {
          const [x, y] = point(i, RADIUS * Math.max(scores[i], 0.02));
          return <circle key={block} cx={x} cy={y} r={4} fill={BLOCK_COLORS[block] ?? 'currentColor'} />;
        })}
        {blocks.map((block, i) => {
          const [x, y] = point(i, RADIUS + 14);
          return (
            <text
              key={block}
              x={x}
              y={y}
              textAnchor={Math.abs(x - CX) < 2 ? 'middle' : x > CX ? 'start' : 'end'}
              dominantBaseline="middle"
              className="radar__label"
              style={{ fill: `color-mix(in srgb, ${BLOCK_COLORS[block] ?? 'currentColor'} 58%, var(--text))` }}
            >
              <tspan x={x} dy="-0.5em">{block}</tspan>
              <tspan x={x} dy="1.2em" className="radar__pct">
                {Math.round(scores[i] * 100)}%
              </tspan>
            </text>
          );
        })}
      </svg>
      <p className="radar__note">
        Насколько полно пройден каждый блок: отметки дней, задачи, замеры и заметки.
        {weakest && ` Слабее всего из пройденных: ${weakest.toLowerCase()}.`}
      </p>
    </div>
  );
}
