import React from 'react';
import { Map as MapIcon } from 'lucide-react';

const Header = () => {
  return (
    <header className="app-header glass-panel">
      <MapIcon className="header-icon" size={24} />
      <h1>Gorewada Zoo Geospatial Dashboard</h1>
    </header>
  );
};

export default Header;

