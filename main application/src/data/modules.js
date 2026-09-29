// Registry of the standalone GIS applications combined in this dashboard.
// Add / remove entries here — the sidebar and home grid render from this list.
//
// `appId` (when present) must match a key in the Master Auth Server's
// backend/config/apps.js registry — it's what enables the "open with no
// second login" SSO handoff for that module. Modules without an `appId`
// (e.g. Environment, which currently has no SSO endpoint) simply open
// directly via `url`, same as before.

const MODULES = [
  {
    id: "viewer",
    appId: "gis-viewer",
    code: "VWR-02",
    name: "Viewer",
    tagline: "Layered cartographic exploration",
    url: "http://localhost:3005",
    icon: "layers",
  },
  {
    id: "survey",
    appId: "gis-survey",
    code: "SVY-01",
    name: "Survey",
    tagline: "Field data capture & benchmark logging",
    url: "http://localhost:3002",
    icon: "survey",
  },
  {
    id: "3d",
    // No SSO callback implemented on the 3D backend yet — open directly.
    code: "3DT-03",
    name: "3D Terrain",
    tagline: "Volumetric elevation & model view",
    url: "http://localhost:3001",
    icon: "cube",
  },
  {
    id: "construction",
    // No auth of any kind on this app — pure image-processing tool.
    code: "CON-06",
    name: "Construction",
    tagline: "Engineering drawing digitization",
    url: "http://localhost:3004",
    icon: "cube",
  },
  {
    id: "environment",
    code: "ENV-04",
    name: "Environment",
    tagline: "Climate & ecological monitoring",
    url: "http://localhost:3008",
    icon: "leaf",
  },
  {
    id: "wildlife",
    // No SSO callback implemented on the Wildlife backend yet — open directly.
    code: "WLD-05",
    name: "Wild Life",
    tagline: "Species tracking & habitat mapping",
    url: "http://localhost:3003",
    icon: "paw",
  },
  {
    id: "iot",
    // No auth of any kind — a live ESP32 sensor dashboard (fire/sound/soil/
    // rain-gauge + pump control). Open directly.
    code: "IOT-07",
    name: "IoT Server",
    tagline: "Live sensor telemetry & pump control",
    url: "http://localhost:3006",
    icon: "chip",
  },
  {
    id: "dashboard",
    // No auth of any kind — GPS drone tracking dashboard (PHP/Ratchet
    // WebSocket relay). Open directly.
    code: "DRN-08",
    name: "Dashboard",
    tagline: "Real-time drone GPS command center",
    url: "http://localhost:3007",
    icon: "drone",
  },
];

export default MODULES;
