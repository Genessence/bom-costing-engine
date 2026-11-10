import { useSession } from '../state/session';
import { useSwitchMode } from '../state/actions';

export function SourceSwitch() {
  const { mode } = useSession();
  const switchMode = useSwitchMode();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="source-label">Commodity rates</span>
      <div className="source-switch" role="group" aria-label="Commodity rate source">
        <button className={'aicm ' + (mode === 'aicm' ? 'on' : '')} aria-pressed={mode === 'aicm'} onClick={() => switchMode('aicm')}><span className="dot"></span>AICM linked</button>
        <button className={mode === 'manual' ? 'on' : ''} aria-pressed={mode === 'manual'} onClick={() => switchMode('manual')}><span className="dot"></span>Manual</button>
      </div>
    </div>
  );
}
