import React from 'react';

interface MainContentProps {
  workspacePanel: React.ReactNode;
  mapContainer: React.ReactNode;
  sidePanel: React.ReactNode;
}

export const MainContent: React.FC<MainContentProps> = ({
  workspacePanel,
  mapContainer,
  sidePanel,
}) => {
  return (
    <main className="flex-1 grid grid-cols-[auto_1fr_auto] overflow-hidden relative bg-[#07090e] h-full">
      {workspacePanel && <div className="col-start-1 h-full shrink-0">{workspacePanel}</div>}
      <div className="col-start-2 h-full w-full overflow-hidden relative">
        {mapContainer}
      </div>
      {sidePanel && <div className="col-start-3 h-full shrink-0">{sidePanel}</div>}
    </main>
  );
};
export default MainContent;
