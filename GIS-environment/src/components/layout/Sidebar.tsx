import React from 'react';
import { 
  LayoutDashboard, 
  Map, 
  CloudSun, 
  Brain, 
  FileText, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Columns,
  Bell,
  Bot,
  Compass,
  Globe2
} from 'lucide-react';
import { motion } from 'framer-motion';

export type PrimaryNavTab = 
  | 'dashboard' 
  | 'map' 
  | 'weather' 
  | 'earth'
  | 'analytics' 
  | 'comparison'
  | 'reports' 
  | 'alerts'
  | 'copilot'
  | 'geospatial'
  | 'settings'
  | 'workspace';

interface SidebarProps {
  activeTab: PrimaryNavTab;
  onSelectTab: (tab: PrimaryNavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  alertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  alertCount = 0,
}) => {
  const sidebarItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, color: 'text-indigo-400' },
    { id: 'map' as const, label: 'GIS Map', icon: Map, color: 'text-sky-400' },
    { id: 'earth' as const, label: 'Earth Services', icon: Globe2, color: 'text-teal-400', badge: 'LIVE' },
    { id: 'analytics' as const, label: 'AI Analytics', icon: Brain, color: 'text-purple-400' },
    { id: 'comparison' as const, label: 'Comparison', icon: Columns, color: 'text-amber-400' },
    { id: 'reports' as const, label: 'Reports', icon: FileText, color: 'text-emerald-400' },
    { id: 'alerts' as const, label: 'Storm Alerts', icon: Bell, color: 'text-red-400', showBadge: true },
    { id: 'copilot' as const, label: 'Geolith AI', icon: Bot, color: 'text-purple-400', badge: 'v2.0' },
    { id: 'settings' as const, label: 'Settings', icon: Settings, color: 'text-slate-400' },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className="relative flex flex-col h-full bg-slate-950/20 backdrop-blur-md border-r border-slate-800/30 shadow-2xl z-[90] pointer-events-auto select-none shrink-0"
    >
      {/* Collapse Toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-50"
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Nav List */}
      <div className="flex-1 py-4 flex flex-col gap-2 px-2 overflow-y-auto custom-scrollbar">
        {sidebarItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const hasBadge = item.showBadge && alertCount > 0;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-3 w-full py-2.5 rounded-xl font-semibold text-xs transition-all text-left relative ${
                collapsed ? 'justify-center px-0' : 'justify-start px-3'
              } ${
                isActive
                  ? 'bg-sky-500/15 text-white border border-sky-500/40 shadow-lg shadow-sky-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? item.color : 'text-slate-400'}`} />
              
              {!collapsed && (
                <span className="truncate tracking-wide font-mono uppercase text-[11px] flex-1">
                  {item.label}
                </span>
              )}

              {/* Version Badge or Alert count Badge */}
              {hasBadge && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-slate-950 font-bold text-[9px] flex items-center justify-center animate-pulse">
                  {alertCount}
                </span>
              )}

              {item.badge && !collapsed && (
                <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[8px] font-bold font-mono uppercase">
                  {item.badge}
                </span>
              )}

              {item.badge && collapsed && (
                <span className="absolute top-1 right-1 px-1 py-0.2 rounded bg-purple-500 text-slate-950 text-[7px] font-extrabold uppercase scale-90">
                  {item.badge}
                </span>
              )}

              {isActive && (
                <motion.span
                  layoutId="sidebarActiveIndicator"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-sky-400 rounded-r-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.aside>
  );
};
export default Sidebar;
