/**
 * useDebounce — return a value that only updates after `delay` ms of
 * stillness. Used by search-as-you-type inputs to avoid firing a fetch
 * on every keystroke.
 */
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
