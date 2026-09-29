import type { CSSProperties } from 'react';

export const BLOCK_COLORS: Record<string, string> = {
  Время: '#3B76F6',
  Энергия: '#E8962E',
  Внимание: '#B0559F',
  Дисциплина: '#2E9E6B',
};

export const blockStyle = (block: string) =>
  ({ '--block': BLOCK_COLORS[block] ?? 'var(--link)' }) as CSSProperties;
