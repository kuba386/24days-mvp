import yearDays from './data/days.json';
import habitsDays from './data/habits.json';
import gtdDays from './data/gtd.json';
import type { Day } from './components/DayCard';
import type { Focus } from './focus';

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

export const HABIT_EXAMPLES: Record<Focus, string> = {
  product: 'Час работы над проектом без телефона в 9:00',
  study: '20 минут английского после ужина',
  health: '10 минут растяжки после подъёма',
};

export const fillHabit = (text: string, habit: string | null) =>
  text.split('{привычка}').join(habit?.trim() || 'твоя привычка');
