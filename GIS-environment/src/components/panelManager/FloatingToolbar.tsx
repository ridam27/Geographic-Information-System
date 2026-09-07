import React from 'react';
import { FileText, Bell, Bot, Compass, Columns } from 'lucide-react';
import { ToolbarButton } from './ToolbarButton';

export interface FloatingToolbarProps {
  onOpenComparison: () => void;
  onOpenReportModal: () => void;
  onOpenAlerts: () => void;
  onOpenCopilot: () => void;
  onOpenGeospatial: () => void;
  alertCount?: number;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  onOpenComparison,
  onOpenReportModal,
  onOpenAlerts,
  onOpenCopilot,
  onOpenGeospatial,
  alertCount = 0,
}) => {
  return (
    <nav className="flex flex-col gap-1.5 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-xl shadow-2xl pointer-events-auto">
      {/* 1. Weather Comparison Modal Trigger */}
      <ToolbarButton
        id="comparison"
        label="Multi-Location Comparison"
        icon={<Columns className="w-5 h-5 text-amber-400" />}
        active={false}
        onClick={onOpenComparison}
      />

      {/* 2. PDF Report Generator */}
      <ToolbarButton
        id="reports"
        label="Generate Analytical Report"
        icon={<FileText className="w-5 h-5 text-sky-400" />}
        active={false}
        onClick={onOpenReportModal}
      />

      {/* 3. Severe Alerts Dashboard */}
      <ToolbarButton
        id="alerts"
        label="Severe Alerts Center"
        icon={<Bell className="w-5 h-5 text-red-400" />}
        active={false}
        onClick={onOpenAlerts}
        badge={alertCount > 0 ? alertCount : undefined}
      />

      <div className="w-full h-px bg-slate-800/80 my-0.5" />

      {/* 4. AI Weather Copilot Button */}
      <ToolbarButton
        id="copilot"
        label="AI Weather Copilot"
        icon={<Bot className="w-5 h-5 text-purple-400" />}
        active={false}
        onClick={onOpenCopilot}
        badge="v2.0"
      />

      {/* 5. Geospatial Buffer Analysis */}
      <ToolbarButton
        id="geospatial"
        label="Geospatial Analysis & Buffer Tools"
        icon={<Compass className="w-5 h-5 text-cyan-400" />}
        active={false}
        onClick={onOpenGeospatial}
      />
    </nav>
  );
};
export default FloatingToolbar;
