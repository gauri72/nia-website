import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function ProtectedAdminRoute({ children, requireRole }) {
  const { admin, loading } = useAdminAuth();

  if (loading) return null;
  if (!admin) return <Navigate to="/admin/login" replace />;
  // door_staff logins can only reach the check-in app — never the admin panel.
  if (admin.role === 'door_staff') return <Navigate to="/checkin" replace />;
  if (requireRole && !requireRole.includes(admin.role)) return <Navigate to="/admin" replace />;

  return children;
}
