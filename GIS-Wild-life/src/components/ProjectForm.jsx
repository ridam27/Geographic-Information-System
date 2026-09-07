
import { useState } from 'react';
import { slugify } from '../utils/helpers';

export function ProjectForm({ onAddProject }) {
  const [title, setTitle] = useState('');
  const [linkname, setLinkname] = useState('');
  const [sdate, setSdate] = useState('');
  const [stime, setStime] = useState('');
  const [desc, setDesc] = useState('');
  const [fVid, setFVid] = useState(null);
  const [fJson, setFJson] = useState(null);
  const [fGpx, setFGpx] = useState(null);

  const handleLinknameChange = (e) => {
    const s = slugify(e.target.value);
    setLinkname(s);
  };

  const handleCreate = async () => {
    const success = await onAddProject(title, linkname, sdate, stime, desc, fVid, fJson, fGpx);
    if (success) {
      setTitle('');
      setLinkname('');
      setSdate('');
      setStime('');
      setDesc('');
      setFVid(null);
      setFJson(null);
      setFGpx(null);
      
      // Reset file input values
      document.getElementById("fVidInput").value = "";
      document.getElementById("fJsonInput").value = "";
      document.getElementById("fGpxInput").value = "";
    }
  };

  const linkPreview = linkname ? `/${linkname}/` : '';

  return (
    <div className="card">
      <h2>Create a survey project</h2>
      <div className="form-grid">
        <div className="field">
          <label>Project title</label>
          <input type="text" placeholder="Surjagad Track — 01 (26 Jun 2026)" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>Link name (folder-safe)</label>
          <input type="text" placeholder="surjagadtrack0126thjune2026" value={linkname} onChange={handleLinknameChange} />
          <div className="preview">{linkPreview}</div>
        </div>
        <div className="field"><label>Survey date</label><input type="date" value={sdate} onChange={e => setSdate(e.target.value)} /></div>
        <div className="field"><label>Survey time</label><input type="time" value={stime} onChange={e => setStime(e.target.value)} /></div>
        <div className="field full">
          <label>Description (optional)</label>
          <textarea rows="2" placeholder="Sample collection walk, block GAD_SECOND_02…" value={desc} onChange={e => setDesc(e.target.value)}></textarea>
        </div>
        <div className="field">
          <label>Video (.mp4 / .webm)</label>
          <div className="file">
            <span>{fVid ? <b>{fVid.name}</b> : 'Choose video…'}</span>
            <input type="file" id="fVidInput" accept="video/*" onChange={e => setFVid(e.target.files[0])} />
          </div>
        </div>
        <div className="field">
          <label>Track .json</label>
          <div className="file">
            <span>{fJson ? <b>{fJson.name}</b> : 'Choose .json…'}</span>
            <input type="file" id="fJsonInput" accept=".json" onChange={e => setFJson(e.target.files[0])} />
          </div>
        </div>
        <div className="field">
          <label>Track .gpx</label>
          <div className="file">
            <span>{fGpx ? <b>{fGpx.name}</b> : 'Choose .gpx…'}</span>
            <input type="file" id="fGpxInput" accept=".gpx,.xml" onChange={e => setFGpx(e.target.files[0])} />
          </div>
          <div className="hint">At least one track (.json or .gpx) is required. Video is optional.</div>
        </div>
        <div className="field" style={{ justifyContent: 'flex-end' }}>
          <button className="btn p" type="button" onClick={handleCreate}>Add project</button>
        </div>
      </div>
    </div>
  );
}
