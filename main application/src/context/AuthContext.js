import { createContext, useCallback, useContext, useEffect, useState } from "react";

// Same-origin API base — the Main application's own backend. In dev, CRA's
// package.json "proxy" (or an explicit REACT_APP_API_URL) should point this
// at http://localhost:4100.
const API_BASE = process.env.REACT_APP_API_URL || "";

const AuthContext = createContext(null);

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // send the master session cookie
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body
  }
  if (!res.ok) {
    const message = body?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [allowedModules, setAllowedModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshSession = useCallback(async () => {
    try {
      const data = await apiFetch("/api/auth/session");
      if (data.authenticated) {
        setUser(data.user);
        setAllowedModules(data.allowedModules || []);
      } else {
        setUser(null);
        setAllowedModules([]);
      }
    } catch {
      // Master auth server unreachable — treat as unauthenticated rather
      // than blocking the UI forever.
      setUser(null);
      setAllowedModules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // login/register apply the response directly instead of doing a second
  // /api/auth/session round-trip afterwards — that extra round-trip used
  // to race the session store's write and could occasionally read back
  // "not authenticated" immediately after a successful sign-in, bouncing
  // the person straight back to the login screen.
  const login = useCallback(async (email, password) => {
    setError(null);
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    setAllowedModules(data.allowedModules || []);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    setError(null);
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setUser(data.user);
    setAllowedModules(data.allowedModules || []);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setAllowedModules([]);
    }
  }, []);

  // Requests a one-time SSO authorization code for the given app and
  // returns the fully-formed handoff URL to navigate/iframe to. Throws
  // (with a user-friendly message) if the user lacks permission.
  const getSsoLaunchUrl = useCallback(async (appId) => {
    const data = await apiFetch("/api/auth/authorize", {
      method: "POST",
      body: JSON.stringify({ appId }),
    });
    const separator = data.callbackUrl.includes("?") ? "&" : "?";
    return `${data.callbackUrl}${separator}code=${encodeURIComponent(data.code)}`;
  }, []);

  // ---- Admin Panel: sub-user + role management -----------------------
  const adminFetchModules = useCallback(async () => {
    const data = await apiFetch("/api/admin/modules");
    return data.modules || [];
  }, []);

  const adminFetchUsers = useCallback(async () => {
    const data = await apiFetch("/api/admin/users");
    return data.users || [];
  }, []);

  const adminCreateUser = useCallback(async ({ name, email, password, moduleIds }) => {
    const data = await apiFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ name, email, password, moduleIds }),
    });
    return data.user;
  }, []);

  const adminUpdateUserRole = useCallback(async (userId, moduleIds) => {
    const data = await apiFetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ moduleIds }),
    });
    return data;
  }, []);

  const adminUpdateUserStatus = useCallback(async (userId, status) => {
    const data = await apiFetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return data.user;
  }, []);

  const adminDeleteUser = useCallback(async (userId) => {
    await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
  }, []);

  // Lets the login screen know whether a master admin already exists, so
  // it can hide public self-registration once sub-users are meant to be
  // created from the Admin Panel instead.
  const checkBootstrapStatus = useCallback(async () => {
    const data = await apiFetch("/api/auth/bootstrap-status");
    return !!data.adminExists;
  }, []);

  const value = {
    user,
    allowedModules,
    loading,
    error,
    isAuthenticated: !!user,
    isAdmin: !!user?.isAdmin,
    login,
    register,
    logout,
    getSsoLaunchUrl,
    adminFetchModules,
    adminFetchUsers,
    adminCreateUser,
    adminUpdateUserRole,
    adminUpdateUserStatus,
    adminDeleteUser,
    checkBootstrapStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
