import React, { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import shp from 'shpjs';

export const ShapeFile = ({ data, ...geoJSONProps }) => {
  const [geoJSONData, setGeoJSONData] = useState(null);

  useEffect(() => {
    async function fetchShapefile() {
      try {
        const response = await shp(data);
        setGeoJSONData(response);
        console.log("Shapefile successfully loaded:", response);
      } catch (error) {
        console.error("Error loading shapefile:", error);
      }
    }

    if (data) {
      fetchShapefile();
    }
  }, [data]);

  return geoJSONData ? <GeoJSON data={geoJSONData} {...geoJSONProps} /> : null;
};

export default ShapeFile;
