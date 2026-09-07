import React from 'react';

interface MapContainerProps {
  children: React.ReactNode; // The main WeatherMap component
  floatingToolbar: React.ReactNode;
  panelContainer: React.ReactNode;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  children,
  floatingToolbar,
  panelContainer,
}) => {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Core Map layer */}
      <div className="absolute inset-0 w-full h-full z-10">
        {children}
      </div>

      {/* Floating control toolbar and active panels container positioned above map */}
      <div
        className="absolute left-5 bottom-10 flex items-start gap-3 pointer-events-auto z-20"
      >
        {floatingToolbar}
        {panelContainer}
      </div>
    </div>
  );
};
export default MapContainer;
