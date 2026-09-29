import React from 'react';
import { 
  Layers, 
  Map, 
  Briefcase, 
  Trees, 
  Code2, 
  Bot, 
  Bookmark, 
  Target,
  X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkspaceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: string) => void;
  leftOffset?: number;
}

export const WorkspaceDrawer: React.FC<WorkspaceDrawerProps> = ({
  isOpen,
  onClose,
  onSelectAction,
  leftOffset = 96,
}) => {
  const workspaceItems = [
    { id: 'layers', label: 'Weather Layers Catalog', icon: Layers, color: 'text-sky-400' },
    { id: 'basemap', label: 'Basemap & Satellite', icon: Map, color: 'text-emerald-400' },
    { id: 'environmental', label: 'Environmental Telemetry', icon: Trees, color: 'text-teal-400' },
    { id: 'copilot', label: 'GeoLith AI Earth Services', icon: Bot, color: 'text-amber-400' },
    { id: 'verification', label: 'Accuracy Verification', icon: Target, color: 'text-red-400' },
    { id: 'bookmarks', label: 'Saved Places & Bookmarks', icon: Bookmark, color: 'text-yellow-400' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -320, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="absolute top-0 bottom-0 w-72 bg-slate-950/95 border-r border-slate-800/80 shadow-2xl z-[850] flex flex-col backdrop-blur-xl text-slate-100 transition-all duration-200"
          style={{ left: leftOffset }}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60 font-mono text-xs">
            <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" /> Workspace Drawer
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Actions */}
          <div className="p-3 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
            {workspaceItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectAction(item.id);
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl font-medium text-xs text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800/40 hover:border-slate-700 transition-all text-left font-mono"
                >
                  <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
