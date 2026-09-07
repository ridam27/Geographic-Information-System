import React from 'react';
import { 
  LayoutDashboard, 
  Map, 
  CloudSun, 
  Brain, 
  FileText, 
  AlertTriangle, 
  Clock, 
  Briefcase, 
  Settings, 
  HelpCircle, 
  Code2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

export type PrimaryNavTab = 
  | 'dashboard' 
  | 'map' 
  | 'weather' 
  | 'analytics' 
  | 'reports' 
  | 'alerts' 
  | 'timeline' 
  | 'workspace' 
  | 'settings' 
  | 'support' 
  | 'developer';

interface PrimarySidebarProps {
  activeTab: PrimaryNavTab;
  onSelectTab: (tab: PrimaryNavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const PrimarySidebar: React.FC<PrimarySidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
}) => {
  const section1 = [
    { id: 'map' as const, label: 'GIS Map', icon: Map, color: 'text-sky-400' },
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, color: 'text-indigo-400' },
    { id: 'weather' as const, label: 'Weather Feed', icon: CloudSun, color: 'text-amber-400' },
    { id: 'analytics' as const, label: 'AI Analytics', icon: Brain, color: 'text-purple-400' },
  ];

  const section2 = [
    { id: 'reports' as const, label: 'Reports', icon: FileText, color: 'text-emerald-400' },
    { id: 'alerts' as const, label: 'Storm Alerts', icon: AlertTriangle, color: 'text-red-400' },
    { id: 'timeline' as const, label: 'Timeline', icon: Clock, color: 'text-cyan-400' },
  ];

  const section3 = [
    { id: 'workspace' as const, label: 'Workspace', icon: Briefcase, color: 'text-amber-300' },
  ];

  const section4 = [
    { id: 'settings' as const, label: 'Settings', icon: Settings, color: 'text-slate-400' },
    { id: 'support' as const, label: 'Support', icon: HelpCircle, color: 'text-teal-400' },
    { id: 'developer' as const, label: 'Developer', icon: Code2, color: 'text-sky-400' },
  ];

  interface NavItem {
    id: PrimaryNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }

  const renderSection = (items: NavItem[]) => (
    <div className="flex flex-col gap-1.5 w-full">
      {items.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
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
              <span className="truncate tracking-wide font-mono uppercase text-[11px]">
                {item.label}
              </span>
            )}
            {isActive && (
              <motion.span
                layoutId="primarySidebarActive"
                className="absolute left-0 top-2 bottom-2 w-1 bg-sky-400 rounded-r-full"
              />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? 96 : 280 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className="relative flex flex-col h-full bg-slate-950/85 backdrop-blur-xl border-r border-slate-800/80 shadow-2xl z-[900] pointer-events-auto select-none shrink-0"
    >
      {/* Collapse Toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-50"
        title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Nav Sections */}
      <div className="flex-1 py-4 flex flex-col gap-4 px-2 overflow-y-auto custom-scrollbar">
        {renderSection(section1)}
        <div className="w-full h-px bg-slate-800/60 my-0.5" />
        {renderSection(section2)}
        <div className="w-full h-px bg-slate-800/60 my-0.5" />
        {renderSection(section3)}
        <div className="w-full h-px bg-slate-800/60 my-0.5" />
        {renderSection(section4)}
      </div>
    </motion.aside>
  );
};
