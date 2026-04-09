import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <div style={{ padding: "2rem" }}>Access Denied</div>;
  }

  return children;
}