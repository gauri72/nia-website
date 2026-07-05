import { Navigate } from 'react-router-dom';
import { useMemberAuth } from '../context/MemberAuthContext';

export default function ProtectedMemberRoute({ children }) {
  const { member, loading } = useMemberAuth();

  if (loading) return null;
  if (!member) return <Navigate to="/dashboard/login" replace />;

  return children;
}
