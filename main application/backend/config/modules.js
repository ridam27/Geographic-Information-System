/**
 * Canonical registry of every module shown in the GEOLITH PORTAL console
 * (mirrors `src/data/modules.js` on the frontend by `id`). This is the
 * single source of truth for role-based access control: every
 * `AppPermission` row is keyed by one of these `id`s.
 *
 * `ssoAppId` (when present) links a module to its entry in `./apps.js`,
 * which is a *different* registry used only for the SSO code/token
 * handoff to that module's own backend. Modules without SSO wiring are
 * still fully permission-gated here — the Main app simply won't render
 * or open their iframe for a user who lacks access.
 */
const MODULES = [
  { id: 'viewer', name: 'Viewer', ssoAppId: 'gis-viewer' },
  { id: 'survey', name: 'Survey', ssoAppId: 'gis-survey' },
  { id: '3d', name: '3D Terrain', ssoAppId: null },
  { id: 'construction', name: 'Construction', ssoAppId: null },
  { id: 'environment', name: 'Environment', ssoAppId: null },
  { id: 'wildlife', name: 'Wild Life', ssoAppId: null },
  { id: 'iot', name: 'IoT Server', ssoAppId: null },
  { id: 'dashboard', name: 'Dashboard', ssoAppId: null },
];

const MODULE_IDS = MODULES.map((m) => m.id);

const moduleById = MODULES.reduce((acc, m) => {
  acc[m.id] = m;
  return acc;
}, {});

const moduleIdBySsoAppId = MODULES.reduce((acc, m) => {
  if (m.ssoAppId) acc[m.ssoAppId] = m.id;
  return acc;
}, {});

function isValidModuleId(id) {
  return MODULE_IDS.includes(id);
}

function moduleIdForSsoApp(ssoAppId) {
  return moduleIdBySsoAppId[ssoAppId] || null;
}

module.exports = { MODULES, MODULE_IDS, moduleById, isValidModuleId, moduleIdForSsoApp };
