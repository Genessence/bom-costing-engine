import { HashRouter } from 'react-router-dom';
import { Shell } from './components/Shell';
import { TipLayer } from './components/charts/TipLayer';
import { Login } from './features/login/Login';
import { AppRoutes } from './routes';
import { SessionProvider, useSession } from './state/session';
import { ToastProvider } from './state/toasts';

function Gate() {
  const { user } = useSession();
  if (!user) return <Login />;
  return <Shell><AppRoutes /></Shell>;
}

export function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <SessionProvider>
          <Gate />
          <TipLayer />
        </SessionProvider>
      </ToastProvider>
    </HashRouter>
  );
}
