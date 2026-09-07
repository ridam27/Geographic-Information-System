const express = require("express");
const SewagePipeline = require("../models/SewagePipeline");
const Manhole = require("../models/Manhole");
const Pole = require("../models/Pole");

const router = express.Router();

// Ray casting point-in-polygon
function pointInPolygon(point, polygon) {
  const [px, py] = point;
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function normaliseRing(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = first[0] === last[0] && first[1] === last[1];
  return closed ? ring : [...ring, first];
}

// Bounding box nikalo polygon se — DB level pre-filter ke liye
function getBoundingBox(ring) {
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

router.post("/", async (req, res) => {
  try {
    const { polygon, layers = ["sewage", "manhole", "pole"] } = req.body;

    const ring = normaliseRing(polygon);
    if (!ring) {
      return res.status(400).json({
        success: false,
        message: "polygon must be an array of at least 3 [lng, lat] pairs",
      });
    }

    const { minLng, maxLng, minLat, maxLat } = getBoundingBox(ring);
    const results = {};

    // ── Sewage Pipelines
    if (layers.includes("sewage")) {
      // Bounding box se DB mein pre-filter — saara data fetch nahi hoga
      const candidates = await SewagePipeline.find({
        "points": {
          $elemMatch: {
            longitude: { $gte: minLng, $lte: maxLng },
            latitude:  { $gte: minLat, $lte: maxLat },
          },
        },
      }).lean();

      results.pipelines = candidates.filter((pipeline) => {
        if (!Array.isArray(pipeline.points)) return false;
        return pipeline.points.some((pt) =>
          pointInPolygon([pt.longitude, pt.latitude], ring)
        );
      });
    }

    // ── Manholes
    if (layers.includes("manhole")) {
      const candidates = await Manhole.find({
        $or: [
          {
            "position.longitude": { $gte: minLng, $lte: maxLng },
            "position.latitude":  { $gte: minLat, $lte: maxLat },
          },
          {
            x: { $gte: minLng, $lte: maxLng },
            y: { $gte: minLat, $lte: maxLat },
          },
        ],
      }).lean();

      results.manholes = candidates.filter((mh) => {
        const lng = mh.position?.longitude ?? mh.x ?? null;
        const lat = mh.position?.latitude  ?? mh.y ?? null;
        if (lng === null || lat === null) return false;
        return pointInPolygon([lng, lat], ring);
      });
    }

    // ── Poles
    if (layers.includes("pole")) {
      const candidates = await Pole.find({
        $or: [
          {
            "position.longitude": { $gte: minLng, $lte: maxLng },
            "position.latitude":  { $gte: minLat, $lte: maxLat },
          },
          {
            longitude: { $gte: minLng, $lte: maxLng },
            latitude:  { $gte: minLat, $lte: maxLat },
          },
        ],
      }).lean();

      results.poles = candidates.filter((pole) => {
        const lng = pole.position?.longitude ?? pole.longitude ?? null;
        const lat = pole.position?.latitude  ?? pole.latitude  ?? null;
        if (lng === null || lat === null) return false;
        return pointInPolygon([lng, lat], ring);
      });
    }

    return res.status(200).json({
      success: true,
      counts: {
        pipelines: results.pipelines?.length ?? 0,
        manholes:  results.manholes?.length  ?? 0,
        poles:     results.poles?.length     ?? 0,
      },
      ...results,
    });
  } catch (error) {
    console.error("Polygon query error:", error);
    return res.status(500).json({
      success: false,
      message: "Polygon query failed",
      error: error.message,
    });
  }
});

module.exports = router;