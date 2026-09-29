import React from 'react';

interface InspectorPanelProps {
  isOpen: boolean;
  children: React.ReactNode;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  isOpen,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-full bg-slate-950/20 border-l border-slate-800/30 shadow-2xl flex flex-col backdrop-blur-md text-slate-100 h-full shrink-0 z-[80] overflow-y-auto custom-scrollbar">
      {children}
    </div>
  );
};
export default InspectorPanel;
