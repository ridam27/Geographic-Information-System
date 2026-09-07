const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { uploadKmlToGridFS } = require("../utils/kmlHelper");
const { extractPolygonGeometry } = require("../utils/geometryHelper");

router.post("/namuna43", async (req, res) => {
  try {

    const db = mongoose.connection.db;

    const {
      ownerName,
      ward,
      zone,
      propertyNo,
      noticeReason,
      noticeDate,
      latitude,
      longitude
    } = req.body;

    const noticeData = {
      ownerName,
      ward,
      zone,
      propertyNo,
      noticeReason,
      noticeDate
    };

    if (latitude && longitude) {

      const lat = Number(latitude);
      const lng = Number(longitude);

      noticeData.latitude = lat;
      noticeData.longitude = lng;

      noticeData.location = {
        type: "Point",
        coordinates: [lng, lat]
      };

      noticeData.centroid = [lng, lat];

      noticeData.style = {
        color: "#00a65a",
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

      const fileName = `namuna43-${Date.now()}.kml`;

      const fileId = await uploadKmlToGridFS(fileName, kmlString);

      noticeData.kmlFileId = fileId;

      noticeData.kmlUrl =
        `${req.protocol}://${req.headers.host}/api/kml/public/${fileId}`;
    }

    // ----- Accept polygon geometry if sent from frontend form -----
    const geo = extractPolygonGeometry(req.body);
    console.log(`[namuna43] geometry received:`, geo ? geo.type : 'NONE — check frontend payload keys (geometry/polygon/polygons)');
    if (geo) {
      try {
        noticeData.geometry = geo; // store raw GeoJSON geometry

        // compute simple centroid from first ring
        const ring = Array.isArray(geo.coordinates[0][0]) ? geo.coordinates[0] : geo.coordinates;
        let sumLng = 0, sumLat = 0;
        ring.forEach(([lng, lat]) => { sumLng += lng; sumLat += lat; });
        const centroid = [sumLng / ring.length, sumLat / ring.length];

        noticeData.centroid = centroid;
        // ensure we have a location Point for legacy clients
        noticeData.location = { type: 'Point', coordinates: [centroid[0], centroid[1]] };

        // minimal style for polygons
        noticeData.style = { color: '#00a65a', opacity: 0.5, markerType: 'square' };

      } catch (err) {
        console.warn('Failed to process polygon geometry in namuna43 save:', err);
      }
    }

    const result = await db
      .collection("namuna43Notices")
      .insertOne(noticeData);

    // 🔔 Realtime emit — notify the 3D/Viewer platform immediately.
    try {
      const io = req.app.locals.io;
      if (io) {
        io.emit("3d:survey:new", {
          type: "Feature",
          geometry: noticeData.geometry || noticeData.location || null,
          properties: {
            type: "namuna43",
            _id: result.insertedId,
            propertyNumber: propertyNo || String(result.insertedId),
            ownerName: noticeData.ownerName,
            style: noticeData.style || { color: "#00a65a", opacity: 0.5 },
            kmlUrl: noticeData.kmlUrl || null,
            createdAt: new Date()
          }
        });
      }
    } catch (emitErr) {
      console.warn("Socket emit failed for namuna43:", emitErr?.message || emitErr);
    }

    res.status(201).json({
      message: "Namuna 43 notice saved",
      data: result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to save notice"
    });

  }
});

module.exports = router;