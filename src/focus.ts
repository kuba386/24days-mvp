export type Focus = 'product' | 'study' | 'health';

export const FOCUSES: { id: Focus; title: string; description: string; actionLabel: string }[] = [
  {
    id: 'product',
    title: 'Продукт или проект',
    description: 'Стартап, side-project, бизнес — всё, что нужно довести до пользователей',
    actionLabel: 'Действие для продукта',
  },
  {
    id: 'study',
    title: 'Учёба или навык',
    description: 'Язык, программирование, экзамен — то, в чём хочешь расти',
    actionLabel: 'Действие для учёбы',
  },
  {
    id: 'health',
    title: 'Здоровье и спорт',
    description: 'Сон, движение, питание — чтобы было больше сил на всё остальное',
    actionLabel: 'Действие для здоровья',
  },
];

export const isFocus = (value: unknown): value is Focus =>
  FOCUSES.some((f) => f.id === value);
