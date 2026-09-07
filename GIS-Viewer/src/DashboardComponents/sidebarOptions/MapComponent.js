import React, { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  FeatureGroup
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import omnivore from "leaflet-omnivore";
import tokml from "tokml";

const KmlLayer = ({ kmlData }) => {
  const map = useMap();

  useEffect(() => {
    if (kmlData) {
      try {
        const kmlLayer = omnivore.kml.parse(kmlData);
        if (kmlLayer) {
          kmlLayer.addTo(map);
          map.fitBounds(kmlLayer.getBounds());
        } else {
          console.warn("Invalid KML data.");
          map.setView([20.5937, 78.9629], 5);
          alert("The KML file does not contain valid data.");
        }
      } catch (error) {
        console.error("Error loading KML Layer:", error);
        alert("Error processing KML file.");
      }
    }
  }, [kmlData, map]);

  return null;
};

const MapComponent = ({ kmlData }) => {
  const drawnItemsRef = useRef(null);

  const handleDrawCreated = (e) => {
    const { layer } = e;
    drawnItemsRef.current.addLayer(layer);
  };

  const handleDownloadKML = () => {
    if (!drawnItemsRef.current) return;

    const allGeoJSON = drawnItemsRef.current.toGeoJSON();

    // ❗ Filter only LineString, Polygon (i.e., border-type shapes)
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
    <>
      <button
        onClick={handleDownloadKML}
        style={{
          padding: "10px 20px",
          backgroundColor: "#2196f3",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px",
          position: "fixed",
          top: "185px",
          left: "50vw"
        }}
      >
        Download KML
      </button>
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://mt.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          attribution="&copy; Google"
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
        />

        {kmlData && <KmlLayer kmlData={kmlData} />}

        <FeatureGroup ref={drawnItemsRef}>
          <EditControl
            position="topright"
            onCreated={handleDrawCreated}
            draw={{
              polygon: true,
              polyline: true,
              rectangle: true,
              circle: false,      // ❌ disable circle
              marker: false,      // ❌ disable marker
              circlemarker: false,
            }}
          />
        </FeatureGroup>
      </MapContainer>

      <div style={{ textAlign: "center", marginTop: "10px" }}>
      </div>
    </>
  );
};

export default MapComponent;
