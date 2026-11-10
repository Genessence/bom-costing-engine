/* Per-tab UI memory that survives navigation (the POC kept this on its global APP object):
   workbench edits, simulation sliders, history selection, filters. Not persisted, not shared. */
import { useCallback, useState } from 'react';

const mem = new Map<string, unknown>();

export function useUiState<T>(key: string, init: () => T): [T, (next: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => (mem.has(key) ? (mem.get(key) as T) : init()));
  const set = useCallback((next: T | ((prev: T) => T)) => {
    setVal((prev) => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      mem.set(key, v);
      return v;
    });
  }, [key]);
  return [val, set];
}
export const peekUi = <T,>(key: string): T | undefined => mem.get(key) as T | undefined;
export const clearUi = () => mem.clear();
