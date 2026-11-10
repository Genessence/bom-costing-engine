import { FLOW, STATUS } from '../../domain/seed';
import type { Status } from '../../domain/types';

/* 7-step workflow stepper. */
export function Flow({ st }: { st: Status }) {
  const step = STATUS[st].step;
  return (
    <ol className="flow" aria-label="Workflow" style={{ listStyle: 'none', padding: 0 }}>
      {FLOW.map((f, i) => {
        const done = i < step || st === 'SENT', now = i === step && st !== 'SENT';
        return (
          <li key={f} className={'s ' + (done ? 'done' : now ? 'now' : '')} aria-current={now ? 'step' : undefined}>
            <b>{f}</b>{now ? 'Current step' : done ? 'Done' : ''}
          </li>
        );
      })}
    </ol>
  );
}
