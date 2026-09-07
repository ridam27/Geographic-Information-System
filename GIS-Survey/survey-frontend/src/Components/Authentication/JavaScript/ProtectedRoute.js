import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, authLoading } = useAuth();
  const location = useLocation();

  // ⛔ Do NOT render anything until auth state is known
  if (authLoading) {
    return null; // or a loader/spinner
  }

  // ⛔ Block unauthenticated access
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
