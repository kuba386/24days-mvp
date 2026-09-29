import { useEffect, useRef, useState } from 'react';

const DELAY_MS = 600;

// Локальное значение поля с отложенной записью: не дёргать CloudStorage на каждый символ,
// но не потерять ввод при уходе с экрана
export function useDeferredSave<T>(initial: T, onSave: (value: T) => void) {
  const [value, setValue] = useState(initial);
  const pending = useRef<T | null>(null);
  const timer = useRef<number>();
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const flush = () => {
    window.clearTimeout(timer.current);
    if (pending.current !== null) {
      onSaveRef.current(pending.current);
      pending.current = null;
    }
  };

  const update = (next: T) => {
    setValue(next);
    pending.current = next;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, DELAY_MS);
  };

  useEffect(() => flush, []);

  return [value, update, flush] as const;
}
