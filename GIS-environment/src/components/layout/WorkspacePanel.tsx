import React from 'react';
import { Layers, Image, Radio, Globe, Heart, Briefcase, Code, Brain, X } from 'lucide-react';

interface WorkspacePanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onChangeTab: (tab: any) => void;
  weatherContent: React.ReactNode;
  satelliteContent: React.ReactNode;
  radarContent: React.ReactNode;
  terrainContent: React.ReactNode;
  environmentContent: React.ReactNode;
  enterpriseContent: React.ReactNode;
  developerContent: React.ReactNode;
  aiContent: React.ReactNode;
}

export const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  isOpen,
  onClose,
  activeTab,
  onChangeTab,
  weatherContent,
  satelliteContent,
  radarContent,
  terrainContent,
  environmentContent,
  enterpriseContent,
  developerContent,
  aiContent,
}) => {
  if (!isOpen) return null;

  const tabs = [
    { id: 'weather' as const, label: 'Weather', icon: Layers },
    { id: 'satellite' as const, label: 'Satellite', icon: Image },
    { id: 'radar' as const, label: 'Radar', icon: Radio },
    { id: 'terrain' as const, label: 'Terrain', icon: Globe },
    { id: 'environment' as const, label: 'Environment', icon: Heart },
    { id: 'enterprise' as const, label: 'Enterprise', icon: Briefcase },
    { id: 'developer' as const, label: 'Developer', icon: Code },
    { id: 'ai' as const, label: 'AI Analytics', icon: Brain },
  ];

  return (
    <div className="w-full bg-slate-950/20 border-r border-slate-800/30 shadow-2xl flex flex-col backdrop-blur-md text-slate-100 h-full shrink-0">
      {/* Workspace Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/30 bg-slate-900/20 font-mono text-xs shrink-0">
        <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
          <Briefcase className="w-4 h-4" /> Workspace Catalog
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs list at the top */}
      <div className="flex items-center gap-1 p-2 bg-slate-950/20 border-b border-slate-800/30 overflow-x-auto custom-scrollbar shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all font-mono whitespace-nowrap min-w-[64px] border ${
                isActive
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Panel Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar">
        {activeTab === 'weather' && weatherContent}
        {activeTab === 'satellite' && satelliteContent}
        {activeTab === 'radar' && radarContent}
        {activeTab === 'terrain' && terrainContent}
        {activeTab === 'environment' && environmentContent}
        {activeTab === 'enterprise' && enterpriseContent}
        {activeTab === 'developer' && developerContent}
        {activeTab === 'ai' && aiContent}
      </div>
    </div>
  );
};
export default WorkspacePanel;
