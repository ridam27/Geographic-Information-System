const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { uploadKmlToGridFS } = require("../utils/kmlHelper");
const { extractPolygonGeometry } = require("../utils/geometryHelper");

router.post("/property-details", async (req, res) => {

  try {

    const db = mongoose.connection.db;

    const {
      ownerName,
      occupierName,
      address,
      mobile,
      ward,
      zone,
      newPropertyNo,
      oldPropertyNo,
      usageType,
      constructionType,
      constructionYear,
      area,
      rate,
      taxableValue,
      deduction,
      finalTaxableValue,
      propertyTax,
      educationTax,
      treeTax,
      fireTax,
      totalTax,
      latitude,
      longitude
    } = req.body;

    const propertyData = {
      ownerName,
      occupierName,
      address,
      mobile,
      ward,
      zone,
      newPropertyNo,
      oldPropertyNo,
      usageType,
      constructionType,
      constructionYear,
      area,
      rate,
      taxableValue,
      deduction,
      finalTaxableValue,
      propertyTax,
      educationTax,
      treeTax,
      fireTax,
      totalTax
    };

    if (latitude && longitude) {

      const lat = Number(latitude);
      const lng = Number(longitude);

      propertyData.latitude = lat;
      propertyData.longitude = lng;

      propertyData.location = {
        type: "Point",
        coordinates: [lng, lat]
      };

      propertyData.centroid = [lng, lat];

      propertyData.style = {
        color: "#009688",
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

      const fileName = `property-${Date.now()}.kml`;

      const fileId = await uploadKmlToGridFS(fileName, kmlString);

      propertyData.kmlFileId = fileId;

      propertyData.kmlUrl =
        `${req.protocol}://${req.headers.host}/api/kml/public/${fileId}`;
    }


      // ----- Accept polygon geometry if sent from frontend form -----
      const geo = extractPolygonGeometry(req.body);
    console.log(`[property-details] geometry received:`, geo ? geo.type : 'NONE — check frontend payload keys (geometry/polygon/polygons)');
      if (geo) {
        try {
          propertyData.geometry = geo; // store raw GeoJSON geometry

          // compute simple centroid from first ring
          const ring = Array.isArray(geo.coordinates[0][0]) ? geo.coordinates[0] : geo.coordinates;
          let sumLng = 0, sumLat = 0;
          ring.forEach(([lng, lat]) => { sumLng += lng; sumLat += lat; });
          const centroid = [sumLng / ring.length, sumLat / ring.length];

          propertyData.centroid = centroid;
          // ensure we have a location Point for legacy clients
          propertyData.location = { type: 'Point', coordinates: [centroid[0], centroid[1]] };

          // minimal style for polygons
          propertyData.style = { color: '#2975cc', opacity: 0.5, markerType: 'square' };

        } catch (err) {
          console.warn('Failed to process polygon geometry in property save:', err);
        }
      }
    const result = await db
      .collection("propertyDetails")
      .insertOne(propertyData);

    // 🔔 Realtime emit — notify the 3D/Viewer platform immediately.
    // Without this, newly saved properties only ever showed up after a
    // full page reload (via GET /api/3d/all-data), since insertOne here
    // never told connected sockets that anything changed.
    try {
      const io = req.app.locals.io;
      if (io) {
        io.emit("3d:survey:new", {
          type: "Feature",
          geometry: propertyData.geometry || propertyData.location || null,
          properties: {
            type: "property",
            _id: result.insertedId,
            propertyNumber: newPropertyNo || oldPropertyNo || String(result.insertedId),
            ownerName: ownerName,
            occupierName: occupierName,
            propertyAddress: address,
            mobileNumber: mobile,
            usageOfProperty: usageType,
            totalArea: area,
            style: propertyData.style || { color: "#009688", opacity: 0.5 },
            kmlUrl: propertyData.kmlUrl || null,
            createdAt: new Date()
          }
        });
      }
    } catch (emitErr) {
      console.warn("Socket emit failed for property-details:", emitErr?.message || emitErr);
    }

    res.status(201).json({
      message: "Property saved successfully",
      data: result
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to save property"
    });

  }

});

module.exports = router;