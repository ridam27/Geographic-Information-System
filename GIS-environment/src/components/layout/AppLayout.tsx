import React from 'react';

interface AppLayoutProps {
  header: React.ReactNode;
  sidebar: React.ReactNode;
  workspacePanel: React.ReactNode;
  mapContainer: React.ReactNode;
  inspectorPanel: React.ReactNode;
  timeline: React.ReactNode;
  statusBar: React.ReactNode;
  sidebarCollapsed: boolean;
  workspaceOpen: boolean;
  inspectorOpen: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  header,
  sidebar,
  workspacePanel,
  mapContainer,
  inspectorPanel,
  timeline,
  statusBar,
  sidebarCollapsed,
  workspaceOpen,
  inspectorOpen,
}) => {
  void sidebarCollapsed;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07090e] select-none text-slate-100 font-sans">
      {/* Map Container - absolute, filling screen */}
      <div className="absolute inset-0 z-10">
        {mapContainer}
      </div>

      {/* Header - fixed at top */}
      <div className="absolute top-0 left-0 right-0 h-[72px] z-[100] pointer-events-auto">
        {header}
      </div>

      {/* Left Panel Group (Sidebar & Workspace Panel) */}
      <div className="absolute left-0 top-[72px] bottom-[28px] z-[95] flex pointer-events-none group/left">
        {/* Sidebar */}
        <div className="pointer-events-auto transition-all duration-300 ease-in-out -translate-x-[calc(100%-12px)] group-hover/left:translate-x-0 shadow-2xl h-full">
          {sidebar}
        </div>

        {/* Workspace Panel */}
        {workspaceOpen && (
          <div className="pointer-events-auto transition-all duration-300 ease-in-out -translate-x-[calc(100%-12px)] group-hover/left:translate-x-0 shadow-2xl ml-[-12px] h-full w-[340px]">
            {workspacePanel}
          </div>
        )}
      </div>

      {/* Inspector Panel - always fully visible on the right if inspectorOpen is true */}
      {inspectorOpen && (
        <div className="absolute right-0 top-[72px] bottom-[28px] w-[360px] z-[90] pointer-events-auto shadow-2xl">
          {inspectorPanel}
        </div>
      )}

      {/* Timeline - auto-hide at bottom */}
      <div className="absolute left-[80px] right-[80px] bottom-[28px] h-20 z-[85] pointer-events-auto transition-all duration-300 ease-in-out translate-y-[calc(100%-12px)] hover:translate-y-0 shadow-2xl">
        {timeline}
      </div>

      {/* Status Bar - fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[28px] z-[100] pointer-events-auto">
        {statusBar}
      </div>
    </div>
  );
};
export default AppLayout;
