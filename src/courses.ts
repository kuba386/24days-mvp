import yearDays from './data/days.json';
import habitsDays from './data/habits.json';
import gtdDays from './data/gtd.json';
import type { Day } from './components/DayCard';
import type { Focus } from './focus';
import { missesInLast, softChain, todayKey } from './dates';
import type { Task } from './hooks/useTasks';
import type { EnergyEntry, Top3Item } from './hooks/useDaily';
import type { ScoreItem } from './components/Scorecard';

export type CourseId = 'year' | 'habits' | 'gtd';

export type Course = {
  id: CourseId;
  title: string;
  book: string;
  description: string;
  focusLead: string;
  // Префикс ключей в CloudStorage; у первого курса пустой, чтобы не потерять старый прогресс
  keyPrefix: string;
  needsHabit: boolean;
  days: Day[];
};

export const COURSES: Course[] = [
  {
    id: 'year',
    title: 'Продуктивный год',
    book: 'По книге Криса Бейли «Мой продуктивный год»',
    description: 'Время, энергия, внимание и дисциплина: разобраться, куда уходят силы, и направить их на главное',
    focusLead:
      'На что направим эти дни? Задачи по времени, энергии и вниманию у всех одинаковые, а ежедневное действие — под твою цель.',
    keyPrefix: '',
    needsHabit: false,
    days: yearDays as Day[],
  },
  {
    id: 'habits',
    title: 'Атомные привычки',
    book: 'По книге Джеймса Клира «Атомные привычки»',
    description: 'Одна привычка, которую ты выбираешь сам, и 24 дня, чтобы она закрепилась',
    focusLead:
      'В какой сфере будет твоя привычка? Это нужно для примеров-подсказок, саму привычку сформулируешь дальше.',
    keyPrefix: 'habits_',
    needsHabit: true,
    days: habitsDays as Day[],
  },
  {
    id: 'gtd',
    title: 'Дела в порядке',
    book: 'По книге Дэвида Аллена «Как привести дела в порядок»',
    description: 'Собрать все дела из головы, разобрать, разложить по спискам и держать систему в чистоте',
    focusLead:
      'Где у тебя больше всего незакрытых дел? Шаги у всех одинаковые, а примеры будут под твою сферу.',
    keyPrefix: 'gtd_',
    needsHabit: false,
    days: gtdDays as Day[],
  },
];

export const isCourseId = (value: unknown): value is CourseId =>
  COURSES.some((c) => c.id === value);

export const courseById = (id: CourseId) => COURSES.find((c) => c.id === id)!;

export const HABIT_MAX = 120;

// Подсказки для конструктора привычки: фраза собирается как «Что + Сколько + Когда»
export const HABIT_WHAT: Record<Focus, string[]> = {
  product: ['Работа над проектом', 'План дня', 'Разбор почты', 'Пост о проекте', 'Звонок клиенту'],
  study: ['Английский', 'Чтение', 'Карточки', 'Конспект', 'Задачи по теме'],
  health: ['Растяжка', 'Прогулка', 'Зарядка', 'Медитация', 'Отжимания'],
};

export const HABIT_AMOUNT = ['2 минуты', '10 минут', '20 минут', '30 минут', '1 час'];

export const HABIT_WHEN = [
  'после подъёма',
  'после утреннего кофе',
  'в обед',
  'после работы',
  'после ужина',
  'перед сном',
];

export const composeHabit = (what: string, amount: string, when: string) => {
  const text = [what, amount, when].map((p) => p.trim()).filter(Boolean).join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const HABIT_METRICS = ['repeats', 'chain', 'misses7'] as const;
const TASK_METRICS = ['captured', 'inbox', 'quick', 'projects', 'projectsNoStep', 'waiting', 'someday', 'doneToday', 'open'] as const;
const DAILY_METRICS = ['top3Done', 'energyAfternoon', 'energyToday', 'scoreMinus'] as const;
export type AutoMetric =
  | (typeof HABIT_METRICS)[number]
  | (typeof TASK_METRICS)[number]
  | (typeof DAILY_METRICS)[number];

export const isHabitMetric = (kind: AutoMetric) => (HABIT_METRICS as readonly string[]).includes(kind);

export const AUTO_HINTS: Record<'habit' | 'task' | 'top3' | 'energy' | 'score', string> = {
  habit: 'По твоим отметкам «Сделал» над карточкой',
  task: 'По твоим спискам в «Мои дела»',
  top3: 'По «Трём главным на сегодня» над карточкой',
  energy: 'По твоим отметкам энергии за сегодня',
  score: 'По карте дня ниже',
};

export const autoHint = (kind: AutoMetric) =>
  isHabitMetric(kind)
    ? AUTO_HINTS.habit
    : kind === 'top3Done'
      ? AUTO_HINTS.top3
      : kind === 'energyAfternoon' || kind === 'energyToday'
        ? AUTO_HINTS.energy
        : kind === 'scoreMinus'
          ? AUTO_HINTS.score
          : AUTO_HINTS.task;

const avg1 = (values: number[]) =>
  values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : undefined;

// Замеры, которые считаются из отметок привычки или списков дел, а не вводятся руками.
// undefined — источника нет (например, дела ведутся на бумаге), тогда замер вводится вручную.
export function autoMetricValue(
  kind: AutoMetric,
  source: {
    habitLog: string[] | null;
    tasks: Task[];
    top3?: Top3Item[];
    energy?: EnergyEntry[];
    dayItems?: ScoreItem[];
  }
): number | undefined {
  if (kind === 'scoreMinus') {
    const items = source.dayItems ?? [];
    return items.length ? items.filter((i) => i.mark === '-').length : undefined;
  }
  if (kind === 'top3Done') {
    const planned = (source.top3 ?? []).filter((i) => i.text.trim());
    return planned.length ? planned.filter((i) => i.done).length : undefined;
  }
  if (kind === 'energyAfternoon' || kind === 'energyToday') {
    const today = (source.energy ?? []).filter((e) => e.date === todayKey());
    const picked = kind === 'energyAfternoon' ? today.filter((e) => e.hour >= 13 && e.hour <= 18) : today;
    return avg1(picked.map((e) => e.value));
  }
  if (isHabitMetric(kind)) {
    const log = source.habitLog;
    if (!log) return undefined;
    if (kind === 'repeats') return log.length;
    if (kind === 'chain') return softChain(log);
    return missesInLast(log, 7);
  }
  const { tasks } = source;
  if (tasks.length === 0) return undefined;
  const open = tasks.filter((t) => !t.doneAt);
  const inList = (list: Task['list']) => open.filter((t) => t.list === list).length;
  switch (kind) {
    case 'captured':
      return tasks.length;
    case 'inbox':
      return inList('inbox');
    case 'quick':
      return tasks.filter((t) => t.quick).length;
    case 'projects':
      return inList('project');
    case 'projectsNoStep':
      return open.filter(
        (p) => p.list === 'project' && !open.some((s) => s.list === 'next' && s.projectId === p.id)
      ).length;
    case 'waiting':
      return inList('waiting');
    case 'someday':
      return inList('someday');
    case 'doneToday':
      return tasks.filter((t) => t.doneAt === todayKey() && !t.quick).length;
    default:
      return open.length;
  }
}

export const fillHabit = (text: string, habit: string | null) =>
  text.split('{привычка}').join(habit?.trim() || 'твоя привычка');
