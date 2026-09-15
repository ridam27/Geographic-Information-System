import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Sidebar from "./components/Sidebar";
import FramePanel from "./components/FramePanel";
import LoginPage from "./components/LoginPage";
import AdminPanel from "./components/AdminPanel";
import HeroSection from "./components/HeroSection";
import MODULES from "./data/modules";
import { AuthProvider, useAuth } from "./context/AuthContext";

// GIS-3D ("3d") is the heaviest module by far (Cesium + multi-tens-of-MB
// GLB models), so once it's been opened once it stays mounted for the rest
// of the session and is never evicted — switching away and back is always
// instant, no re-fetching terrain/models. Every other module is
// "secondary": it still competes for the capped slots below via LRU
// eviction, same as before.
const PINNED_MODULE_IDS = ["3d"];

// How many SECONDARY module iframes to keep alive at once (most-recently-
// used first), on top of whatever's pinned above. Each module is a full
// app, so we cap this instead of keeping every module you've ever opened
// mounted forever — switching back to one of the last few stays instant,
// older ones give up their memory/GPU context and do a fresh load next time.
const MAX_MOUNTED_MODULES = 4;

function omit(obj, keys) {
  if (!keys.length) return obj;
  const copy = { ...obj };
  keys.forEach((key) => delete copy[key]);
  return copy;
}

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
  const [activeId, setActiveId] = useState(() => {
    try {
      const saved = localStorage.getItem("gis_active_module");
      if (saved && (saved === "admin" || MODULES.some((m) => m.id === saved))) {
        return saved;
      }
    } catch (e) {}
    return null;
  });
  const [collapsed, setCollapsed] = useState(true);

  // Modules currently kept mounted (most-recently-used first) so revisiting
  // one you've already opened just un-hides its existing <iframe> instead of
  // recreating it — no re-fetching the KMZ layers/3D models/map data, and no
  // re-running the one-time SSO handoff (see the fetch effect below).
  const [mountedIds, setMountedIds] = useState([]);
  const [ssoSrcById, setSsoSrcById] = useState({});
  const [ssoErrorById, setSsoErrorById] = useState({});
  const ssoRequestedRef = useRef(new Set());

  const handleSelectModule = (id) => {
    setActiveId(id);
    try {
      if (id) {
        localStorage.setItem("gis_active_module", id);
      }
    } catch (e) {}

    if (!id || id === "admin") return; // admin panel isn't an iframe module

    // Defense in depth: even though the sidebar only ever offers modules a
    // user is allowed to see, never trust client-side state alone. Backend
    // `/api/auth/authorize` enforces this independently for SSO-wired
    // modules regardless.
    const permitted = isAdmin || allowedModules.includes(id);
    if (!permitted) return; // don't mount/pre-warm a module the user can't open

    setMountedIds((prev) => {
      const without = prev.filter((existing) => existing !== id);
      const next = [id, ...without];

      // Pinned modules (GIS-3D) never count against the cap and are never
      // evicted. Only secondary modules get LRU-capped, most-recent first.
      let secondaryCount = 0;
      const evicted = [];
      const kept = next.filter((mid) => {
        if (PINNED_MODULE_IDS.includes(mid)) return true;
        secondaryCount += 1;
        if (secondaryCount <= MAX_MOUNTED_MODULES) return true;
        evicted.push(mid);
        return false;
      });

      if (evicted.length) {
        evicted.forEach((eid) => ssoRequestedRef.current.delete(eid));
        setSsoSrcById((s) => omit(s, evicted));
        setSsoErrorById((s) => omit(s, evicted));
      }

      return kept;
    });
  };

  // Seed the stack with whatever module was restored from localStorage on
  // load — Console only mounts once auth has resolved, so isAdmin/
  // allowedModules are already correct at this point.
  useEffect(() => {
    if (activeId && activeId !== "admin" && (isAdmin || allowedModules.includes(activeId))) {
      setMountedIds((prev) => (prev.includes(activeId) ? prev : [activeId, ...prev]));
    }
    // Run once: this only seeds the initial restore, later switches go
    // through handleSelectModule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeId !== null) {
      if (activeId === "admin" && !isAdmin) {
        const fallback = allowedModules[0] || MODULES[0]?.id;
        handleSelectModule(fallback);
      } else if (activeId !== "admin" && !isAdmin && allowedModules.length && !allowedModules.includes(activeId)) {
        handleSelectModule(allowedModules[0]);
      }
      return;
    }

    if (isAdmin) {
      handleSelectModule(MODULES[0]?.id || "admin");
    } else if (allowedModules.length) {
      handleSelectModule(allowedModules[0]);
    }
  }, [activeId, isAdmin, allowedModules]);

  const activeModule = useMemo(
    () => MODULES.find((m) => m.id === activeId) || null,
    [activeId]
  );

  const isPermitted = activeModule && (isAdmin || allowedModules.includes(activeModule.id));

  // Requests a fresh one-time launch URL for a module and stores it.
  // ssoRequestedRef guards against firing twice for the same module while a
  // request is already in flight or already satisfied.
  const fetchSsoForModule = useCallback((mod) => {
    if (!mod.appId || ssoRequestedRef.current.has(mod.id)) return;
    ssoRequestedRef.current.add(mod.id);

    getSsoLaunchUrl(mod.appId)
      .then((url) => {
        setSsoSrcById((prev) => ({ ...prev, [mod.id]: url }));
      })
      .catch((err) => {
        ssoRequestedRef.current.delete(mod.id); // allow a retry next time it's opened
        setSsoErrorById((prev) => ({ ...prev, [mod.id]: err.message || `Could not connect to ${mod.name}.` }));
      });
  }, [getSsoLaunchUrl]);

  // Fetch each SSO-enabled module's one-time launch URL only the first time
  // it's opened. The resulting <iframe> then stays mounted — just hidden —
  // when you switch away, so re-selecting it later reuses the same
  // authenticated session instead of burning another one-time code and
  // reloading the whole app from scratch.
  useEffect(() => {
    if (!activeModule || !isPermitted) return;
    fetchSsoForModule(activeModule);
  }, [activeModule, isPermitted, fetchSsoForModule]);

  // A module's cached src is a one-time code that's already been consumed
  // by the load FramePanel just gave up on (Render.com cold starts can take
  // longer than its timeout) — so retrying must mint a brand-new code
  // rather than replay the dead one, or it always fails with "Sign-in link
  // expired or already used."
  const handleRetryModule = (id) => {
    const mod = MODULES.find((m) => m.id === id);
    if (!mod) return;
    ssoRequestedRef.current.delete(id);
    setSsoSrcById((prev) => omit(prev, [id]));
    setSsoErrorById((prev) => omit(prev, [id]));
    fetchSsoForModule(mod);
  };

  return (
    <div className="app">
      <Sidebar
        activeId={activeId}
        onSelect={handleSelectModule}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />
      <main className="main">
        <Topbar />
        {activeId === "admin" && isAdmin ? (
          <AdminPanel />
        ) : activeModule && !isPermitted ? (
          <div className="framepanel">
            <div className="framepanel__stage">
              <div className="framepanel__overlay">
                <p>Can't open {activeModule.name}.</p>
                <p className="muted">
                  Your account does not have access to {activeModule.name}. Contact an administrator to request it.
                </p>
              </div>
            </div>
          </div>
        ) : mountedIds.length ? (
          <div className="framepanel-stack">
            {mountedIds.map((id) => {
              const mod = MODULES.find((m) => m.id === id);
              if (!mod) return null;
              return (
                <div key={id} className="framepanel-slot" hidden={id !== activeId}>
                  <FramePanel
                    module={mod}
                    src={ssoSrcById[id]}
                    ssoError={ssoErrorById[id]}
                    onRetry={() => handleRetryModule(id)}
                  />
                </div>
              );
            })}
          </div>
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
