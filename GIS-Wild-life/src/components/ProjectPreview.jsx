import { useState, useEffect } from 'react';
import axios from 'axios';
import { Player } from './Player';

const API_URL = 'http://localhost:4003/api/projects';
const BACKEND_URL = 'http://localhost:4003';

export function ProjectPreview({ projectId, onClose }) {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    async function loadProject() {
      if (!projectId) return;
      try {
        let targetId = projectId;
        if (targetId === 'auto') {
          const listRes = await axios.get(API_URL);
          if (listRes.data && listRes.data.length > 0) {
            targetId = listRes.data[0].id || listRes.data[0]._id;
          } else {
            return;
          }
        }

        const res = await axios.get(`${API_URL}/${targetId}`);
        const p = res.data;
        if (!p) return;

        const newCfg = {
          slug: p.slug,
          title: p.title,
          date: p.date,
          time: p.time,
          jsonData: p.jsonObj || null,
          gpxData: p.jsonObj ? null : (p.gpxText || null),
          video: null
        };

        if (p.videoPath) {
          newCfg.video = BACKEND_URL + p.videoPath;
        }

        setCfg(newCfg);
      } catch (err) {
        console.error('Failed to load project', err);
      }
    }
    loadProject();
  }, [projectId]);

  if (!cfg) return null; // loading

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--bg)' }}>
      <Player cfg={cfg} onClose={onClose} />
    </div>
  );
}
