import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

interface Toast { id: number; msg: string; err: boolean }
type ToastFn = (msg: string, err?: boolean) => void;
const Ctx = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const seq = useRef(0);
  const toast = useCallback<ToastFn>((msg, err = false) => {
    const id = ++seq.current;
    setList((l) => [...l, { id, msg, err }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3600);
  }, []);
  const value = useMemo(() => toast, [toast]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div id="toasts" className="toasts" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className={'toast' + (t.err ? ' err' : '')}><i></i><span>{t.msg}</span></div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
