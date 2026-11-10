/* Runs a loader on mount / when deps change, ignoring results from superseded runs
   (the POC's renderToken + stale() pattern). */
import { useEffect, useState, type DependencyList } from 'react';

export type LoadState = { status: 'loading' } | { status: 'ok' } | { status: 'error'; message: string };

export function useLoad(fn: () => Promise<unknown>, deps: DependencyList): LoadState {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    fn().then(
      () => { if (live) setState({ status: 'ok' }); },
      (e: unknown) => { if (live) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }); },
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
