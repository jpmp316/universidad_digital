import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import type { Role } from "../api/types";
import { LoadingState } from "../components/LoadingState";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <LoadingState label="Verificando sesión" />;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}

export function RoleRoute({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user || !user.role_names.some((role) => roles.includes(role))) return <Navigate to="/denied" replace />;
  return <Outlet />;
}