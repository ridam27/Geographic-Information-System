/**
 * Registry of the GIS applications that participate in SSO.
 * Each app authenticates itself to the Master server via a client_id +
 * client_secret pair (server-to-server only, never exposed to the browser).
 * Secrets come from environment variables — set matching values in both
 * the Main application backend's env AND the target app's own backend env.
 */
const APPS = {
  'gis-3d': {
    name: 'GIS-3D',
    clientSecretEnv: 'SSO_SECRET_GIS_3D',
    callbackUrl: process.env.GIS_3D_CALLBACK_URL || 'https://geo-3d-backend.onrender.com/sso/callback',
  },
  'gis-construction': {
    name: 'GIS-Construction',
    clientSecretEnv: 'SSO_SECRET_GIS_CONSTRUCTION',
    callbackUrl: process.env.GIS_CONSTRUCTION_CALLBACK_URL || 'https://geo-construction-backend.onrender.com/sso/callback',
  },
  'gis-survey': {
    name: 'GIS-Survey',
    clientSecretEnv: 'SSO_SECRET_GIS_SURVEY',
    callbackUrl: process.env.GIS_SURVEY_CALLBACK_URL || 'https://geo-survey-backend-2fy8.onrender.com/sso/callback',
  },
  'gis-viewer': {
    name: 'GIS-Viewer',
    clientSecretEnv: 'SSO_SECRET_GIS_VIEWER',
    callbackUrl: process.env.GIS_VIEWER_CALLBACK_URL || 'https://gis-view.onrender.com/sso/callback',
  },
  'gis-wildlife': {
    name: 'GIS-Wildlife',
    clientSecretEnv: 'SSO_SECRET_GIS_WILDLIFE',
    callbackUrl: process.env.GIS_WILDLIFE_CALLBACK_URL || 'https://geo-wild-life-backend.onrender.com/sso/callback',
  },
};

function getAppSecret(appId) {
  const app = APPS[appId];
  if (!app) return null;
  return process.env[app.clientSecretEnv] || null;
}

module.exports = { APPS, getAppSecret };
