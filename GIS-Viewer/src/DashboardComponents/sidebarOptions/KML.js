import React, { useState, useRef } from 'react';
import MapComponent from './MapComponent';
import FileUploader from './FileUploader';
import ErrorBoundary from './ErrorBoundary';
import { usePersistentState } from '../../hooks/usePersistentState';
import tokml from "tokml";
import './KML.css';

const KML = () => {
  // Text KML content is small, so it's safe to persist across refreshes.
  const [kmlData, setKmlData] = usePersistentState('kml-data', null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const drawnItemsRef = useRef(null);

  // Get file upload functionality from FileUploader
  const { handleFileChange: baseHandleFileChange } = FileUploader({
    onFileUpload: (data) => {
      setKmlData(data);
      setImageUrl(null); // Reset image URL if needed
      // Loading continues until MapComponent finishes parsing the KML.
    }
  });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setIsLoading(true);
    }
    baseHandleFileChange(e);
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleDownloadKML = () => {
    if (!drawnItemsRef.current) return;

    const allGeoJSON = drawnItemsRef.current.toGeoJSON();

    // Filter only LineString, Polygon (i.e., border-type shapes)
    const filtered = {
      type: "FeatureCollection",
      features: allGeoJSON.features.filter((f) =>
        ["Polygon", "LineString"].includes(f.geometry.type)
      ),
    };

    if (filtered.features.length === 0) {
      alert("No polygon or line drawn to export.");
      return;
    }

    const kml = tokml(filtered);

    const blob = new Blob([kml], {
      type: "application/vnd.google-earth.kml+xml",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "boundary.kml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <ErrorBoundary>
      <div style={{ marginTop: 0, padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'nowrap', gap: '16px', marginBottom: '20px' }}>
          <h1 style={{ margin: 0, whiteSpace: 'nowrap' }}>KML File Uploader and Map Viewer</h1>

          {/* Download button */}
          {drawnItemsRef.current && (
            <button
              onClick={handleDownloadKML}
              style={{
                flexShrink: 0,
                alignSelf: 'center',
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '5px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}
            >
              Download KML
            </button>
          )}
        </div>

        {/* Styled file upload area */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            accept=".kml"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div
            onClick={triggerFileInput}
            style={{
              border: '2px dashed #2196f3',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderRadius: '4px',
              width: '300px',
              height: '45px',
              color: '#2196f3',
              fontWeight: 'bold'
            }}
          >
            <span>Click here or drag file to upload</span>
          </div>
        </div>

        <div style={{ marginTop: '20px', height: '500px', position: 'relative' }}>
          {isLoading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                backgroundColor: 'rgba(255,255,255,0.75)',
              }}
            >
              <div className="kml-spinner" />
              <span style={{ color: '#2196f3', fontWeight: 'bold' }}>Loading KML…</span>
            </div>
          )}
          <MapComponent
            kmlData={kmlData}
            imageUrl={imageUrl}
            setDrawnItemsRef={(ref) => drawnItemsRef.current = ref}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default KML;