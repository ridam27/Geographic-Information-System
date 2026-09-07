import React from 'react';

interface TimelineLayoutProps {
  children: React.ReactNode;
}

export const TimelineLayout: React.FC<TimelineLayoutProps> = ({ children }) => {
  return (
    <div className="h-20 bg-slate-950/20 backdrop-blur-md border-t border-slate-800/30 px-4 py-3 flex items-center justify-center w-full overflow-hidden shrink-0 z-[70] pointer-events-auto">
      {children}
    </div>
  );
};
export default TimelineLayout;
