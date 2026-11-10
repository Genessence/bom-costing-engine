import { useEffect } from 'react';

/* One hover layer for every [data-tip] mark on the page (charts.js IIFE). */
export function TipLayer() {
  useEffect(() => {
    let tip: HTMLDivElement | null = null;
    const hide = () => { if (tip) tip.style.display = 'none'; };
    const onMove = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const t = target && target.closest ? target.closest('[data-tip]') : null;
      if (!t) { hide(); return; }
      if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; document.body.appendChild(tip); }
      tip.innerHTML = t.getAttribute('data-tip') || '';
      tip.style.display = 'block';
      const x = Math.min(window.innerWidth - tip.offsetWidth - 12, e.clientX + 14);
      const y = Math.max(8, e.clientY - tip.offsetHeight - 10);
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('scroll', hide, true);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('scroll', hide, true); tip?.remove(); };
  }, []);
  return null;
}
