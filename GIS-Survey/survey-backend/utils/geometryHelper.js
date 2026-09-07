  // utils/geometryHelper.js
//
// Different form components on the frontend have historically sent the
// drawn polygon under different keys — `geometry` (property form),
// `polygon` / `polygons` (survey form), or occasionally a JSON-stringified
// value (common when a payload is built as FormData instead of JSON).
// Any route that only checked `req.body.geometry` would silently drop a
// polygon sent under one of the other shapes.
//
// This helper checks every known shape so all form routes behave
// consistently, regardless of which convention the calling frontend uses.
// It never throws — on anything unexpected it just returns null and the
// caller falls back to its existing point/location behavior.
function extractPolygonGeometry(body) {
  if (!body) return null;

  const isPolygonType = (t) => t === "Polygon" || t === "MultiPolygon";

  // 1) Standard shape: { geometry: { type: 'Polygon', coordinates: [...] } }
  if (body.geometry && isPolygonType(body.geometry.type)) {
    return { type: body.geometry.type, coordinates: body.geometry.coordinates };
  }

  // 2) Some forms send it as { polygon: { type: 'Polygon', coordinates: [...] } }
  if (body.polygon && isPolygonType(body.polygon.type)) {
    return { type: body.polygon.type, coordinates: body.polygon.coordinates };
  }

  // 3) Some forms send a FeatureCollection: { polygons: { type: 'FeatureCollection', features: [...] } }
  if (
    body.polygons &&
    body.polygons.type === "FeatureCollection" &&
    Array.isArray(body.polygons.features) &&
    body.polygons.features.length > 0
  ) {
    const first = body.polygons.features[0];
    if (first && first.geometry && isPolygonType(first.geometry.type)) {
      return { type: first.geometry.type, coordinates: first.geometry.coordinates };
    }
  }

  // 4) A single GeoJSON Feature: { feature: { type: 'Feature', geometry: {...} } }
  if (body.feature && body.feature.geometry && isPolygonType(body.feature.geometry.type)) {
    return { type: body.feature.geometry.type, coordinates: body.feature.geometry.coordinates };
  }

  // 5) geometry sent as a JSON string (e.g. multipart/FormData payloads)
  if (typeof body.geometry === "string" && body.geometry.trim().length > 0) {
    try {
      const parsed = JSON.parse(body.geometry);
      if (parsed && isPolygonType(parsed.type)) {
        return { type: parsed.type, coordinates: parsed.coordinates };
      }
    } catch (e) {
      // not JSON — ignore and fall through
    }
  }

  return null;
}

module.exports = { extractPolygonGeometry };
