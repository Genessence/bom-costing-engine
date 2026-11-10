/* Cross-screen actions shared by the shell, palette and admin. */
import { useCallback } from 'react';
import { api } from '../api';
import type { RateMode } from '../domain/types';
import { useSession } from './session';
import { useToast } from './toasts';

export function useSwitchMode() {
  const { mode, setMode } = useSession();
  const toast = useToast();
  return useCallback((m: RateMode) => {
    if (m === mode) return;
    setMode(m);
    toast(m === 'aicm' ? 'Commodity rates now pulled from AICM (Q3 average)' : 'Manual mode: costing uses rates entered by the costing team');
  }, [mode, setMode, toast]);
}

export function useResetDemo() {
  const { user, refresh } = useSession();
  const toast = useToast();
  return useCallback(async () => {
    try {
      await api.resetDemo();
      const keys: Parameters<typeof refresh> = ['requests', 'versions', 'audit'];
      if (user?.role === 'costing') keys.push('com', 'scenarios');
      await refresh(...keys);
      toast('Demo data restored to the starting point');
    } catch (e) {
      toast((e as Error).message, true);
    }
  }, [user, refresh, toast]);
}
