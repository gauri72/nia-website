import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function ProtectedAdminRoute({ children, requireRole }) {
  const { admin, loading } = useAdminAuth();

  if (loading) return null;
  if (!admin) return <Navigate to="/admin/login" replace />;
  if (requireRole && !requireRole.includes(admin.role)) return <Navigate to="/admin" replace />;

  return children;
}
