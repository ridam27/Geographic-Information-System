// Landing point for the Master Auth Server SSO handoff. The backend's
// /sso/callback redirects here with a token (+ user) in the query string,
// exactly like a normal login response would hand them to us — we just
// store them the same way UserLogin does and continue into the app.
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function SsoComplete() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const userRaw = searchParams.get("user");

    if (token) {
      let user = null;
      try {
        user = userRaw ? JSON.parse(userRaw) : null;
      } catch {
        user = null;
      }
      login(token, user);
      navigate("/map", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
