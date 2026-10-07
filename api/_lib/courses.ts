export const COURSES = ['year', 'habits', 'gtd', 'money'] as const;
export type CourseId = (typeof COURSES)[number];

export const parseCourse = (raw: unknown): CourseId | null =>
  COURSES.includes(raw as CourseId) ? (raw as CourseId) : null;

export const HABIT_MAX = 120;

export const parseHabit = (raw: unknown) =>
  typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, HABIT_MAX) : null;
