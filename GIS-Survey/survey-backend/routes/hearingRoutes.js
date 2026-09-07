const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { uploadKmlToGridFS } = require("../utils/kmlHelper");
const { extractPolygonGeometry } = require("../utils/geometryHelper");

router.post("/hearing-notice", async (req, res) => {

  try {

    const db = mongoose.connection.db;

    const {
      ownerName,
      address,
      ward,
      zone,
      hearingDate,
      hearingTime,
      hearingLocation,
      latitude,
      longitude
    } = req.body;

    const hearingData = {
      ownerName,
      address,
      ward,
      zone,
      hearingDate,
      hearingTime,
      hearingLocation
    };

    if (latitude && longitude) {

      const lat = Number(latitude);
      const lng = Number(longitude);

      hearingData.latitude = lat;
      hearingData.longitude = lng;

      hearingData.location = {
        type: "Point",
        coordinates: [lng, lat]
      };

      hearingData.centroid = [lng, lat];

      hearingData.style = {
        color: "#ff9900",
        opacity: 0.5,
        markerType: "square"
      };

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

      const fileName = `hearing-${Date.now()}.kml`;

      const fileId = await uploadKmlToGridFS(fileName, kmlString);

      hearingData.kmlFileId = fileId;

      hearingData.kmlUrl =
        `${req.protocol}://${req.headers.host}/api/kml/public/${fileId}`;
    }

    // ----- Accept polygon geometry if sent from frontend form -----
    const geo = extractPolygonGeometry(req.body);
    console.log(`[hearing-notice] geometry received:`, geo ? geo.type : 'NONE — check frontend payload keys (geometry/polygon/polygons)');
    if (geo) {
      try {
        hearingData.geometry = geo; // store raw GeoJSON geometry

        // compute simple centroid from first ring
        const ring = Array.isArray(geo.coordinates[0][0]) ? geo.coordinates[0] : geo.coordinates;
        let sumLng = 0, sumLat = 0;
        ring.forEach(([lng, lat]) => { sumLng += lng; sumLat += lat; });
        const centroid = [sumLng / ring.length, sumLat / ring.length];

        hearingData.centroid = centroid;
        // ensure we have a location Point for legacy clients
        hearingData.location = { type: 'Point', coordinates: [centroid[0], centroid[1]] };

        // minimal style for polygons
        hearingData.style = { color: '#ff9900', opacity: 0.5, markerType: 'square' };

      } catch (err) {
        console.warn('Failed to process polygon geometry in hearing-notice save:', err);
      }
    }

    const result = await db
      .collection("hearingNotices")
      .insertOne(hearingData);

    // 🔔 Realtime emit — notify the 3D/Viewer platform immediately.
    try {
      const io = req.app.locals.io;
      if (io) {
        io.emit("3d:survey:new", {
          type: "Feature",
          geometry: hearingData.geometry || hearingData.location || null,
          properties: {
            type: "hearing",
            _id: result.insertedId,
            propertyNumber: String(result.insertedId),
            ownerName: hearingData.ownerName,
            propertyAddress: hearingData.address,
            style: hearingData.style || { color: "#ff9900", opacity: 0.5 },
            kmlUrl: hearingData.kmlUrl || null,
            createdAt: new Date()
          }
        });
      }
    } catch (emitErr) {
      console.warn("Socket emit failed for hearing-notice:", emitErr?.message || emitErr);
    }

    res.status(201).json({
      message: "Hearing notice saved",
      data: result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to save hearing notice"
    });

  }

});

module.exports = router;