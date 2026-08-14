import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function ProtectedCheckinRoute({ children }) {
  const { admin, loading } = useAdminAuth();

  if (loading) return null;
  if (!admin) return <Navigate to="/checkin/login" replace />;

  return children;
}
