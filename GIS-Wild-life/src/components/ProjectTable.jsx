import { ProjectRow } from './ProjectRow';
import { fmtSize } from '../utils/helpers';

export function ProjectTable({ projects, onPreview, onExportSingle, onExportZip, onToggle, onDelete }) {
  let tot = 0;
  projects.forEach(p => {
    if (p.videoBlob) tot += p.videoBlob.size || 0;
    if (p.jsonObj) tot += JSON.stringify(p.jsonObj).length;
    if (p.gpxText) tot += p.gpxText.length;
  });

  return (
    <div className="card">
      <h2>Projects &mdash; <span className="stat"><span>stored <b>{fmtSize(tot)}</b></span><span>count <b>{projects.length}</b></span></span></h2>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Project</th>
              <th>Date / Time</th>
              <th>Media</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!projects.length ? (
              <tr><td colSpan="5" className="empty">No projects yet.</td></tr>
            ) : (
              projects.map(p => (
                <ProjectRow 
                  key={p.id} 
                  p={p} 
                  onPreview={onPreview}
                  onExportSingle={onExportSingle}
                  onExportZip={onExportZip}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="hint" style={{ marginTop: '14px', lineHeight: 1.6 }}>
        <b style={{ color: 'var(--text)' }}>Publish:</b> use <b>Export folder (.zip)</b> for real videos — unzip and upload the folder to any static host
        (cPanel, GitHub Pages, Netlify); the folder&apos;s URL is your public link. <b>Export single file</b> bakes the video into one
        <code>.html</code> (best for short clips). <b>Preview</b> opens the console now. Deleting a project frees its browser storage.
      </div>
    </div>
  );
}
