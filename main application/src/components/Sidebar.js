import MODULES from "../data/modules";
import { ModuleIcon, IconShield } from "./Icons";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ activeId, onSelect, collapsed, onToggle }) {
  const { isAdmin, allowedModules } = useAuth();

  // A sub-user only ever sees the module(s) an admin assigned them —
  // nothing else appears in the sidebar, and nothing else can be opened.
  // Admins see every module, plus the Admin Panel entry.
  const visibleModules = isAdmin ? MODULES : MODULES.filter((m) => allowedModules.includes(m.id));

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sidebar__brand">
        <span className="sidebar__mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="12" cy="12" r="2.4" fill="currentColor" />
            <path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        <div className={`sidebar__brandtext ${collapsed ? "sidebar__brandtext--collapsed" : ""}`}>
          <span className="sidebar__title">GeoHub</span>
          <span className="sidebar__subtitle">Unified GIS Console</span>
        </div>
        <div className="sidebar__toggleDock">
          <button type="button" className="sidebar__toggle" onClick={onToggle} aria-label="Toggle sidebar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {collapsed ? <path d="M9 5l7 7-7 7" /> : <path d="M15 5l-7 7 7 7" />}
          </svg>
          </button>
        </div>
      </div>

      <nav className="sidebar__nav">
        <div className="sidebar__divider">
          <span className={collapsed ? "sidebar__dividerLabel sidebar__dividerLabel--collapsed" : "sidebar__dividerLabel"}>
            MODULES
          </span>
        </div>

        {visibleModules.map((m) => (
          <button
            key={m.id}
            className={`plate ${activeId === m.id ? "plate--active" : ""}`}
            onClick={() => onSelect(m.id)}
            title={collapsed ? `${m.name} (${m.code})` : m.name}
            type="button"
          >
            <span className="plate__icon"><ModuleIcon name={m.icon} width={16} height={16} /></span>
            <span className={`plate__body ${collapsed ? "plate__body--collapsed" : ""}`}>
              <span className="plate__name">{m.name}</span>
              <span className="plate__code">{m.code}</span>
            </span>
          </button>
        ))}

        {visibleModules.length === 0 && (
          <p className={`sidebar__empty ${collapsed ? "sidebar__empty--collapsed" : ""}`}>
            No modules assigned yet. Ask your administrator to grant you access.
          </p>
        )}

        {isAdmin && (
          <>
            <div className="sidebar__divider">
              <span className={collapsed ? "sidebar__dividerLabel sidebar__dividerLabel--collapsed" : "sidebar__dividerLabel"}>
                ADMIN
              </span>
            </div>
            <button
              className={`plate ${activeId === "admin" ? "plate--active" : ""}`}
              onClick={() => onSelect("admin")}
              title={collapsed ? "Admin Panel" : undefined}
              type="button"
            >
              <span className="plate__icon"><IconShield width={16} height={16} /></span>
              <span className={`plate__body ${collapsed ? "plate__body--collapsed" : ""}`}>
                <span className="plate__name">Admin Panel</span>
                <span className="plate__code">USERS</span>
              </span>
            </button>
          </>
        )}
      </nav>

      <div className={`sidebar__footer ${collapsed ? "sidebar__footer--collapsed" : ""}`}>
        <span className="sidebar__footerLabel">SYSTEM STATUS</span>
        <span className="sidebar__footerValue"><i className="pulse-dot" />{visibleModules.length} module{visibleModules.length === 1 ? "" : "s"} online</span>
      </div>
    </aside>
  );
}
