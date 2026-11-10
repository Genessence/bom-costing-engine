import { useNavigate } from 'react-router-dom';
import { ROLES } from '../domain/seed';
import { useSession, useUser } from '../state/session';
import { Avatar } from './ui';

/* The "who" button: signs out to the role picker. */
export function RoleSwitch() {
  const u = useUser();
  const { signOut } = useSession();
  const nav = useNavigate();
  return (
    <button className="who" onClick={() => { nav('/home'); signOut(); }} aria-label={`Signed in as ${u.name}, ${ROLES[u.role].label}. Switch user`}>
      <Avatar id={u.id} size={30} />
      <span><span className="n">{u.name}</span><span className="r">{ROLES[u.role].label}</span></span>
      <span style={{ color: '#9DB8AC', paddingRight: 6 }} aria-hidden="true">⇄</span>
    </button>
  );
}
