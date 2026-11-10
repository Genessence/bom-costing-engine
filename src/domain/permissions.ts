/* Role → modules and actions. Module access comes straight from ROLES in the POC;
   action rules are the ones the POC enforces in the UI and in the mock API. */
import { ROLES } from './seed';
import type { ModuleId, Person, Request, RoleId } from './types';

export const canOpen = (role: RoleId, mod: ModuleId | 'customer'): boolean => {
  const m: ModuleId = mod === 'customer' ? 'history' : mod;
  return m === 'home' || ROLES[role].modules.includes(m);
};

export type Action =
  | 'request:create' | 'request:allocate' | 'spec:edit' | 'spec:submit' | 'spec:decide'
  | 'costing:read' | 'costing:write' | 'commodities:write' | 'sap:read' | 'simulation:write'
  | 'mail:send' | 'admin:read';

const ACTIONS: Record<Action, RoleId[]> = {
  'request:create': ['kam', 'costing', 'lead'],
  'request:allocate': ['lead'],
  'spec:edit': ['rnd'],
  'spec:submit': ['rnd'],
  'spec:decide': ['lead'],
  'costing:read': ['costing'],
  'costing:write': ['costing'],
  'commodities:write': ['costing'],
  'sap:read': ['costing'],
  'simulation:write': ['costing'],
  'mail:send': ['costing'],
  'admin:read': ['admin'],
};
export const can = (role: RoleId, action: Action): boolean => ACTIONS[action].includes(role);

export const SPEC_EDITABLE_STATUSES = ['RND', 'ALLOCATED', 'RETURNED'] as const;
export const COSTABLE_STATUSES = ['APPROVED', 'COSTING', 'COSTED', 'SENT'] as const;

export const canEditSpec = (user: Person, r: Request): boolean =>
  user.role === 'rnd' && r.assignee === user.id && (SPEC_EDITABLE_STATUSES as readonly string[]).includes(r.status);

/** "Needs your action" queue, per role (app1.js queueFor). */
export function queueFor(user: Person, r: Request): boolean {
  const role = user.role, me = user.id;
  if (role === 'lead') return r.status === 'NEW' || (r.status === 'SUBMITTED' && r.lead === me);
  if (role === 'rnd') return r.assignee === me && (SPEC_EDITABLE_STATUSES as readonly string[]).includes(r.status);
  if (role === 'costing') return ['APPROVED', 'COSTING', 'COSTED'].includes(r.status);
  if (role === 'kam') return r.status === 'SENT' || r.status === 'NEW';
  return false;
}
