import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/* Right-hand drawer over a scrim. Esc or a scrim click closes it; focus moves in and comes back. */
export function Drawer({ title, onClose, children, footer }: { title: string; onClose(): void; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);
  return createPortal(
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="drawer-h"><h3>{title}</h3><button className="btn sm ghost" onClick={onClose}>Close</button></div>
        <div className="drawer-b">{children}</div>
        {footer ? <div className="drawer-b" style={{ borderTop: '1px solid var(--line)' }}>{footer}</div> : null}
      </aside>
    </div>,
    document.body,
  );
}
