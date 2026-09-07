const express = require("express");
const router = express.Router();
const Appeal = require("../model/Appeal");

const { uploadKmlToGridFS } = require("../utils/kmlHelper");
const { extractPolygonGeometry } = require("../utils/geometryHelper");

router.post("/appeal", async (req, res) => {
  try {

    const {
      ownerName,
      ward,
      propertyNo,
      previousTax,
      revisedTax,
      appealReason,
      latitude,
      longitude
    } = req.body;

    const appealData = {
      ownerName,
      ward,
      propertyNo,
      previousTax: previousTax ? Number(previousTax) : null,
      revisedTax: revisedTax ? Number(revisedTax) : null,
      appealReason
    };

    if (latitude && longitude) {

      const lat = Number(latitude);
      const lng = Number(longitude);

      // Save coordinates
      appealData.latitude = lat;
      appealData.longitude = lng;

      // GeoJSON location
      appealData.location = {
        type: "Point",
        coordinates: [lng, lat]
      };

      // centroid
      appealData.centroid = [lng, lat];

      // style for map
      appealData.style = {
        color: "#2975cc",
        opacity: 0.5,
        markerType: "square"
      };

      // KML generation
      const kmlString = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>${ownerName}</name>
      <Point>
        <coordinates>${lng},${lat},0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;

      const fileName = `appeal-${Date.now()}.kml`;

      const fileId = await uploadKmlToGridFS(fileName, kmlString);

      appealData.kmlFileId = fileId;

      appealData.kmlUrl =
        `${req.protocol}://${req.headers.host}/api/kml/public/${fileId}`;
    }

    // ----- Accept polygon geometry if sent from frontend form -----
    // Accepts geometry under req.body.geometry, .polygon, .polygons
    // (FeatureCollection), .feature, or as a JSON string — not just the
    // exact req.body.geometry shape — since different form components may
    // send it differently.
    const geo = extractPolygonGeometry(req.body);
    console.log(`[appeal] geometry received:`, geo ? geo.type : 'NONE — check frontend payload keys (geometry/polygon/polygons)');
    if (geo) {
      try {
        appealData.geometry = geo; // store raw GeoJSON geometry

        // compute simple centroid from first ring
        const ring = Array.isArray(geo.coordinates[0][0]) ? geo.coordinates[0] : geo.coordinates;
        let sumLng = 0, sumLat = 0;
        ring.forEach(([lng, lat]) => { sumLng += lng; sumLat += lat; });
        const centroid = [sumLng / ring.length, sumLat / ring.length];

        appealData.centroid = centroid;
        // ensure we have a location Point for legacy clients
        appealData.location = { type: 'Point', coordinates: [centroid[0], centroid[1]] };

        // minimal style for polygons
        appealData.style = { color: '#2975cc', opacity: 0.5, markerType: 'square' };

      } catch (err) {
        console.warn('Failed to process polygon geometry in appeal save:', err);
      }
    }

    const appeal = new Appeal(appealData);

    const saved = await appeal.save();

    // 🔔 Realtime emit — notify the 3D/Viewer platform immediately.
    try {
      const io = req.app.locals.io;
      if (io) {
        io.emit("3d:survey:new", {
          type: "Feature",
          geometry: saved.geometry || saved.location || null,
          properties: {
            type: "appeal",
            _id: saved._id,
            propertyNumber: saved.propertyNo || String(saved._id),
            ownerName: saved.ownerName,
            style: saved.style || { color: "#2975cc", opacity: 0.5 },
            kmlUrl: saved.kmlUrl || null,
            createdAt: new Date()
          }
        });
      }
    } catch (emitErr) {
      console.warn("Socket emit failed for appeal:", emitErr?.message || emitErr);
    }

    res.status(201).json(saved);

  } catch (error) {

    console.error("Appeal save error:", error);

    res.status(500).json({ error: error.message });

  }
});

module.exports = router;