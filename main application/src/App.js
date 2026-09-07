import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Sidebar from "./components/Sidebar";
import FramePanel from "./components/FramePanel";
import LoginPage from "./components/LoginPage";
import AdminPanel from "./components/AdminPanel";
import HeroSection from "./components/HeroSection";
import MODULES from "./data/modules";
import { AuthProvider, useAuth } from "./context/AuthContext";

function Topbar() {
  const { user, logout } = useAuth();
  const initials = (user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="topbar">
      <div className="topbar__user">
        <span className="topbar__avatar" aria-hidden="true">{initials}</span>
        <span className="topbar__name">{user?.name}</span>
      </div>
      <button className="btn btn--ghost btn--sm" onClick={logout}>Logout</button>
    </div>
  );
}

function Console() {
  const { isAdmin, allowedModules, getSsoLaunchUrl } = useAuth();
  const [activeId, setActiveId] = useState(null);
  const [collapsed, setCollapsed] = useState(true);
  const [ssoSrc, setSsoSrc] = useState(null);
  const [ssoError, setSsoError] = useState(null);

  // Pick a sensible default view once we know what this account can see:
  // admins land on the first module, sub-users land on their own first
  // assigned module (never a module they don't have access to).
  useEffect(() => {
    if (activeId !== null) return;
    if (isAdmin) {
      setActiveId(MODULES[0]?.id || "admin");
    } else if (allowedModules.length) {
      setActiveId(allowedModules[0]);
    }
  }, [activeId, isAdmin, allowedModules]);

  const activeModule = useMemo(
    () => MODULES.find((m) => m.id === activeId) || null,
    [activeId]
  );

  // Defense in depth: even though the sidebar only ever offers modules a
  // user is allowed to see, never trust client-side state alone — a
  // sub-user is blocked here too if `activeId` somehow isn't in their
  // assigned set. Backend `/api/auth/authorize` enforces this
  // independently for the SSO-wired modules regardless.
  const isPermitted = activeModule && (isAdmin || allowedModules.includes(activeModule.id));

  useEffect(() => {
    let cancelled = false;
    setSsoSrc(null);
    setSsoError(null);

    if (!activeModule) return;

    if (!isPermitted) {
      setSsoError(`Your account does not have access to ${activeModule.name}. Contact an administrator to request it.`);
      return;
    }

    if (!activeModule.appId) return; // no SSO for this module — FramePanel falls back to module.url

    getSsoLaunchUrl(activeModule.appId)
      .then((url) => {
        if (!cancelled) setSsoSrc(url);
      })
      .catch((err) => {
        if (!cancelled) setSsoError(err.message || `Could not connect to ${activeModule.name}.`);
      });

    return () => { cancelled = true; };
  }, [activeModule, isPermitted, getSsoLaunchUrl]);

  return (
    <div className="app">
      <Sidebar
        activeId={activeId}
        onSelect={setActiveId}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <main className="main">
        <Topbar />
        {activeId === "admin" && isAdmin ? (
          <AdminPanel />
        ) : activeModule ? (
          <FramePanel module={activeModule} src={ssoSrc} ssoError={ssoError} />
        ) : (
          <div className="framepanel">
            <div className="framepanel__stage">
              <div className="framepanel__overlay">
                <p>No modules assigned yet.</p>
                <p className="muted">Ask an administrator to grant you access to a GIS module.</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function AppGate() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="app--loading">
        <span className="spinner" aria-label="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<HeroSection />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Console />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
