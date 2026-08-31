import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute() {
  const { usuario, carregando } = useAuth();

  if (carregando) {
    return (
      <div className="flex h-screen items-center justify-center text-ink-muted">
        Carregando...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
