/* Request log + busy counter that drives the API pill. Shared by mock and HTTP clients. */
export interface ApiLogEntry { id: number; method: string; path: string; status: number; ms: number; err?: string }
export interface InspectorState { log: ApiLogEntry[]; busy: number }

const MAX = 80;
let state: InspectorState = { log: [], busy: 0 };
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

export const inspector = {
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  getState: () => state,
  begin() { state = { ...state, busy: state.busy + 1 }; emit(); },
  end(entry: Omit<ApiLogEntry, 'id'>) {
    state = { busy: Math.max(0, state.busy - 1), log: [{ id: ++seq, ...entry }, ...state.log].slice(0, MAX) };
    emit();
  },
  clear() { state = { log: [], busy: 0 }; emit(); },
};

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Wrap a call so it shows in the log with its status and duration. */
export async function tracked<T>(method: string, path: string, run: () => Promise<T>): Promise<T> {
  inspector.begin();
  const t0 = now();
  try {
    const out = await run();
    inspector.end({ method, path, status: method === 'POST' ? 201 : 200, ms: Math.round(now() - t0) });
    return out;
  } catch (e) {
    const err = e as { status?: number; message?: string };
    inspector.end({ method, path, status: err.status || 400, ms: Math.round(now() - t0), err: err.message });
    throw e;
  }
}
