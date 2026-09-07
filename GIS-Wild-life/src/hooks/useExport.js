import axios from 'axios';
import { fmtSize, escapeHtml } from '../utils/helpers';
import { zipStore, strU8 } from '../utils/zip';
import { download, blobToDataURL } from '../utils/storage';
import { PLAYER_CSS, PLAYER_BODY, PLAYER_JS, LEAFLET_CSS_URL, LEAFLET_JS_URL, SCRIPT_CLOSE } from '../utils/constants';

const API_URL = 'http://localhost:4003/api/projects';
const BACKEND_URL = 'http://localhost:4003';

function projCfg(proj, videoRef) {
  return {
    slug: proj.slug,
    title: proj.title,
    date: proj.date,
    time: proj.time,
    jsonData: proj.jsonObj || null,
    gpxData: proj.jsonObj ? null : (proj.gpxText || null),
    video: videoRef || null
  };
}

function buildProjectHTML(cfg) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    '<title>' + escapeHtml(cfg.title || 'VideoGIS') + ' — VideoGIS</title>' +
    '<link rel="stylesheet" href="' + LEAFLET_CSS_URL + '"/>' +
    '<style>' + PLAYER_CSS + '</style></head><body>' +
    PLAYER_BODY +
    '<script>window.VIDEOGIS_PROJECT=' + JSON.stringify(cfg) + ';' + SCRIPT_CLOSE +
    '<script src="' + LEAFLET_JS_URL + '">' + SCRIPT_CLOSE +
    '<script>' + PLAYER_JS + SCRIPT_CLOSE +
    '</body></html>';
}

export function useExport(showFlash) {
  const fetchProjectWithVideoBlob = async (id) => {
    const res = await axios.get(`${API_URL}/${id}`);
    const p = res.data;
    if (!p) return null;

    if (p.videoPath) {
      showFlash('Downloading video for export, please wait...', true);
      const videoRes = await axios.get(BACKEND_URL + p.videoPath, {
        responseType: 'blob'
      });
      p.videoBlob = videoRes.data;
    }
    return p;
  };

  const exportSingle = async (id) => {
    try {
      const p = await fetchProjectWithVideoBlob(id);
      if (!p) return;

      const done = (videoRef) => {
        const html = buildProjectHTML(projCfg(p, videoRef));
        download(new Blob([html], { type: 'text/html' }), p.slug + '.html');
        showFlash('Exported single file: ' + p.slug + '.html', true);
      };

      if (p.videoBlob) {
        if (p.videoBlob.size > 60 * 1048576 && !window.confirm('This video is ' + fmtSize(p.videoBlob.size) + '. Embedding it in one HTML file may be slow/large. Use "Export folder (.zip)" instead?\n\nOK = embed anyway, Cancel = stop')) {
          return;
        }
        const dataUrl = await blobToDataURL(p.videoBlob);
        done(dataUrl);
      } else {
        done(null);
      }
    } catch (e) {
      console.error(e);
      showFlash('Export Error: ' + (e.response?.data?.error || e.message), false);
    }
  };

  const exportZip = async (id) => {
    try {
      const p = await fetchProjectWithVideoBlob(id);
      if (!p) return;

      const indexHtml = buildProjectHTML(projCfg(p, p.videoBlob ? p.videoName : null));
      const files = [{ name: p.slug + '/index.html', u8: strU8(indexHtml) }];

      if (p.videoBlob) {
        const ab = await p.videoBlob.arrayBuffer();
        files.push({ name: p.slug + '/' + p.videoName, u8: new Uint8Array(ab) });
      }

      const zip = zipStore(files);
      download(zip, p.slug + '.zip');
      showFlash('Exported folder: ' + p.slug + '.zip (unzip & upload the folder)', true);
    } catch (e) {
      console.error(e);
      showFlash('Zip error: ' + (e.response?.data?.error || e.message), false);
    }
  };

  return { exportSingle, exportZip };
}
