/* Per-tab UI memory that survives navigation (the POC kept this on its global APP object):
   workbench edits, simulation sliders, history selection, filters, the SAP fetch progress.
   A tiny external store, so async work (e.g. the SAP fetch) keeps updating after a remount. */
import { useCallback, useSyncExternalStore } from 'react';

const mem = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

function subscribe(key: string, fn: () => void) {
  let set = listeners.get(key);
  if (!set) { set = new Set(); listeners.set(key, set); }
  set.add(fn);
  return () => { set!.delete(fn); };
}

export function setUi<T>(key: string, next: T | ((prev: T) => T)) {
  const prev = mem.get(key) as T;
  const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
  if (Object.is(v, prev)) return;
  mem.set(key, v);
  listeners.get(key)?.forEach((f) => f());
}

export function useUiState<T>(key: string, init: () => T): [T, (next: T | ((prev: T) => T)) => void] {
  if (!mem.has(key)) mem.set(key, init());
  const sub = useCallback((fn: () => void) => subscribe(key, fn), [key]);
  const val = useSyncExternalStore(sub, () => mem.get(key) as T);
  const set = useCallback((next: T | ((prev: T) => T)) => setUi(key, next), [key]);
  return [val, set];
}
