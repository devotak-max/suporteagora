import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, staffOnly = false }) {
  const { isAuthenticated, isStaff } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (staffOnly && !isStaff) return <Navigate to="/" replace />;
  return children;
}
