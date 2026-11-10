/* Session (user, rate-source mode) + a client-side cache of what the API returned.
   All data enters through `api`; screens never touch the mock DB. */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api, type CommodityState } from '../api';
import { snapshotFrom } from '../domain/engine';
import { COMMODITIES, QUARTER_BASIS } from '../domain/seed';
import type { AuditEvent, Person, RateMode, RateSnapshot, Request, Scenario, Version } from '../domain/types';

export interface Data {
  requests: Request[];
  versions: Version[];
  scenarios: Scenario[];
  audit: AuditEvent[];
  com: CommodityState | null;
}
const EMPTY: Data = { requests: [], versions: [], scenarios: [], audit: [], com: null };
export const SEED_MANUAL = Object.fromEntries(COMMODITIES.map((c) => [c.code, c.q3])) as RateSnapshot;

interface Session {
  user: Person | null;
  mode: RateMode;
  data: Data;
  /** Rates snapshot in force right now (AICM q3 or manual). */
  snap: RateSnapshot;
  manual: RateSnapshot;
  basisLabel: string;
  setMode(m: RateMode): void;
  login(uid: string): Promise<Person>;
  signOut(): void;
  refresh(...keys: (keyof Data)[]): Promise<void>;
  patch(p: Partial<Data>): void;
}
const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Person | null>(null);
  const [mode, setMode] = useState<RateMode>('aicm');
  const [data, setData] = useState<Data>(EMPTY);

  const patch = useCallback((p: Partial<Data>) => setData((d) => ({ ...d, ...p })), []);

  const refresh = useCallback(async (...keys: (keyof Data)[]) => {
    const jobs = keys.map(async (k): Promise<Partial<Data>> => {
      switch (k) {
        case 'requests': return { requests: await api.requests() };
        case 'versions': return { versions: await api.versions() };
        case 'scenarios': return { scenarios: await api.scenarios() };
        case 'audit': return { audit: await api.audit() };
        case 'com': return { com: await api.commodities(mode) };
      }
    });
    const parts = await Promise.all(jobs);
    setData((d) => Object.assign({ ...d }, ...parts));
  }, [mode]);

  const login = useCallback(async (uid: string) => {
    const r = await api.login(uid);
    const keys: (keyof Data)[] = ['requests', 'versions', 'audit'];
    if (r.user.role === 'costing') keys.push('com', 'scenarios');
    const parts = await Promise.all(keys.map(async (k) => {
      switch (k) {
        case 'requests': return { requests: await api.requests() };
        case 'versions': return { versions: await api.versions() };
        case 'scenarios': return { scenarios: await api.scenarios() };
        case 'audit': return { audit: await api.audit() };
        default: return { com: await api.commodities('aicm') };
      }
    }));
    setData(Object.assign({ ...EMPTY }, ...parts));
    setUser(r.user);
    return r.user;
  }, []);

  // UI memory (workbench draft, sliders…) survives a user switch, as in the POC.
  const signOut = useCallback(() => { setUser(null); }, []);

  const value = useMemo<Session>(() => {
    const manual = data.com?.manual ?? SEED_MANUAL;
    const basisLabel = mode === 'aicm'
      ? 'AICM, ' + QUARTER_BASIS.label
      : 'Manual rates' + (data.com?.manualFile ? ' from ' + data.com.manualFile : '');
    return { user, mode, data, manual, snap: snapshotFrom(mode, manual), basisLabel, setMode, login, signOut, refresh, patch };
  }, [user, mode, data, login, signOut, refresh, patch]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession outside SessionProvider');
  return s;
}
/** For screens behind the login gate. */
export function useUser(): Person {
  const { user } = useSession();
  if (!user) throw new Error('No signed-in user');
  return user;
}
