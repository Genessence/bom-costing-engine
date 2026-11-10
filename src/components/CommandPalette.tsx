import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { fmt } from '../domain/format';
import { canOpen } from '../domain/permissions';
import { MODELS, MODULES, STATUS } from '../domain/seed';
import { useResetDemo, useSwitchMode } from '../state/actions';
import { useSession, useUser } from '../state/session';

interface Item { t: string; k: string; to?: string; act?: 'mode' | 'reset' }
const model = (id: string) => MODELS.find((m) => m.id === id)!;

export function CommandPalette({ onClose }: { onClose(): void }) {
  const u = useUser();
  const { data, mode } = useSession();
  const nav = useNavigate();
  const switchMode = useSwitchMode();
  const reset = useResetDemo();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inp = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => [
    ...MODULES.filter((m) => canOpen(u.role, m.id)).map((m) => ({ t: m.label, k: 'Go to', to: m.id })),
    ...data.requests.map((r) => ({ t: r.id + '  ' + model(r.model).name, k: STATUS[r.status].label, to: 'requests/' + r.id })),
    ...(canOpen(u.role, 'history') ? data.versions.map((v) => ({ t: model(v.model).brand + ' ' + model(v.model).code + ' v' + v.v + ', ' + v.quarter, k: 'Quote ' + fmt.inr(v.total), to: 'history/' + v.id })) : []),
    { t: 'Switch commodity rates to ' + (mode === 'aicm' ? 'Manual' : 'AICM'), k: 'Action', act: 'mode' as const },
    { t: 'Reset demo data', k: 'Action', act: 'reset' as const },
  ], [u.role, data.requests, data.versions, mode]);

  const list = useMemo(() => { const s = q.toLowerCase(); return items.filter((i) => (i.t + ' ' + i.k).toLowerCase().includes(s)); }, [items, q]);
  const shown = list.slice(0, 12);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    inp.current?.focus();
    return () => prev?.focus?.();
  }, []);

  const pick = (i: number) => {
    const it = list[i];
    if (!it) return;
    onClose();
    if (it.act === 'mode') switchMode(mode === 'aicm' ? 'manual' : 'aicm');
    else if (it.act === 'reset') void reset();
    else if (it.to) nav('/' + it.to);
  };

  return createPortal(
    <div className="modal-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <input ref={inp} placeholder="Type a request ID, brand, model or page" aria-label="Search" value={q}
          role="combobox" aria-expanded="true" aria-controls="palette-res" aria-activedescendant={shown[sel] ? 'pal-' + sel : undefined}
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, list.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            if (e.key === 'Enter') pick(sel);
            if (e.key === 'Escape') onClose();
          }} />
        <div className="res" id="palette-res" role="listbox">
          {shown.length ? shown.map((it, i) => (
            <div key={i} id={'pal-' + i} role="option" aria-selected={i === sel} className={'it ' + (i === sel ? 'on' : '')} onClick={() => pick(i)}>
              {it.t}<span className="k">{it.k}</span>
            </div>
          )) : <div className="empty">No matches</div>}
        </div>
      </div>
    </div>,
    document.body,
  );
}
