import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './Tif.css';

import GeoRasterLayer from 'georaster-layer-for-leaflet';
import parseGeoraster from 'georaster';

const position = [21.1458, 79.0882]; // Centered on India
const zoom = 5;

const GeoTiffLayer = ({ file }) => {
  const map = useMap();

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = async function () {
        const arrayBuffer = reader.result;
        const georaster = await parseGeoraster(arrayBuffer);

        const layer = new GeoRasterLayer({
          georaster,
          opacity: 0.7,
          resolution: 256, // or adjust for quality/performance
        });

        layer.addTo(map);
        map.fitBounds(layer.getBounds());
      };
      reader.readAsArrayBuffer(file);
    }
  }, [file, map]);

  return null;
};

const FileUploadArea = ({ onFileChange, selectedFile }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.tif') || file.name.endsWith('.tiff')) {
        onFileChange({ target: { files: [file] } });
      }
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h3>Upload file</h3>
      </div>
      
      <p className="upload-description">
        Upload your <strong>TIF file</strong> to Visualise
        the detailed information of the location.
      </p>
      
      <div 
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          id="file-upload"
          type="file"
          accept=".tif,.tiff"
          onChange={onFileChange}
          className="file-input"
        />
        <label htmlFor="file-upload" className="upload-label">
          Click here or drag file to upload
        </label>
      </div>
      
      {selectedFile && (
        <div className="selected-file">
          <div className="file-icon">
            <span className="file-type">TIF</span>
          </div>
          <span className="file-name">{selectedFile.name}</span>
        </div>
      )}
      
      <div className="upload-instructions">
        <p>Note: Only .tif files are allowed</p>
      </div>
    </div>
  );
};

const MapUI = () => {
  const [orthophotoFile, setOrthophotoFile] = useState(null);

  const handleFileChange = (event) => {
    setOrthophotoFile(event.target.files[0]);
  };

  return (
    <div className="map-ui-container">
      <div className="sidebar">
        <FileUploadArea 
          onFileChange={handleFileChange} 
          selectedFile={orthophotoFile} 
        />
      </div>

      <div className="map-container">
        <MapContainer center={position} zoom={zoom} style={{ height: '100%', width: '100%', marginTop: '9vh' }}>
          {/* Satellite imagery layer */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            maxZoom={18}
          />
          {/* Labels layer for hybrid effect */}
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution='© <a href="https://www.esri.com/">Esri</a> | Labels'
            maxZoom={18}
            opacity={0.8} // Slightly transparent to let satellite imagery show through
          />
          {orthophotoFile && <GeoTiffLayer file={orthophotoFile} />}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapUI;