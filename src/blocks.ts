import type { CSSProperties } from 'react';

export const BLOCK_COLORS: Record<string, string> = {
  Время: '#3B76F6',
  Энергия: '#E8962E',
  Внимание: '#B0559F',
  Дисциплина: '#2E9E6B',
  Очевидно: '#3B76F6',
  Привлекательно: '#E8962E',
  Просто: '#B0559F',
  Приятно: '#2E9E6B',
  Собрать: '#3B76F6',
  Разобрать: '#E8962E',
  Организовать: '#B0559F',
  Делать: '#2E9E6B',
};

export const blockStyle = (block: string) =>
  ({ '--block': BLOCK_COLORS[block] ?? 'var(--link)' }) as CSSProperties;
