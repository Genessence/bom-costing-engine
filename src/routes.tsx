import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LockedView } from './components/ui';
import { canOpen } from './domain/permissions';
import type { ModuleId } from './domain/types';
import { useUser } from './state/session';
import { Home } from './features/home/Home';
import { RequestList } from './features/requests/RequestList';
import { RequestDetail } from './features/requests/RequestDetail';
import { SpecList } from './features/spec/SpecList';
import { SpecSheet } from './features/spec/SpecSheet';
import { CostingList } from './features/costing/CostingList';
import { Workbench } from './features/costing/Workbench';
import { Commodities } from './features/commodities/Commodities';
import { Simulation } from './features/simulation/Simulation';
import { Bom } from './features/bom/Bom';
import { History } from './features/history/History';
import { CustomerSheet } from './features/customer/CustomerSheet';
import { Library } from './features/library/Library';
import { Admin } from './features/admin/Admin';

/** Locked modules render the "restricted" page instead of the screen (and make no API calls). */
function Guard({ mod, children }: { mod: ModuleId; children: ReactNode }) {
  const u = useUser();
  return canOpen(u.role, mod) ? <>{children}</> : <LockedView mod={mod} role={u.role} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/home" element={<Home />} />
      <Route path="/requests" element={<Guard mod="requests"><RequestList /></Guard>} />
      <Route path="/requests/:id" element={<Guard mod="requests"><RequestDetail /></Guard>} />
      <Route path="/spec" element={<Guard mod="spec"><SpecList /></Guard>} />
      <Route path="/spec/:id" element={<Guard mod="spec"><SpecSheet /></Guard>} />
      <Route path="/costing" element={<Guard mod="costing"><CostingList /></Guard>} />
      <Route path="/costing/:id" element={<Guard mod="costing"><Workbench /></Guard>} />
      <Route path="/commodities" element={<Guard mod="commodities"><Commodities /></Guard>} />
      <Route path="/simulation" element={<Guard mod="simulation"><Simulation /></Guard>} />
      <Route path="/bom" element={<Guard mod="bom"><Bom /></Guard>} />
      <Route path="/history" element={<Guard mod="history"><History /></Guard>} />
      <Route path="/history/:verId" element={<Guard mod="history"><History /></Guard>} />
      <Route path="/customer/:verId" element={<Guard mod="history"><CustomerSheet /></Guard>} />
      <Route path="/library" element={<Guard mod="library"><Library /></Guard>} />
      <Route path="/library/:modelId" element={<Guard mod="library"><Library /></Guard>} />
      <Route path="/admin" element={<Guard mod="admin"><Admin /></Guard>} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
