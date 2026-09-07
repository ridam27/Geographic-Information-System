export function ProjectRow({ p, onPreview, onExportSingle, onExportZip, onToggle, onDelete }) {
  const media = [];
  if (p.videoBlob) media.push('video');
  if (p.jsonObj) media.push('json');
  if (p.gpxText) media.push('gpx');

  const on = p.status === 'active';

  return (
    <tr>
      <td>
        <div>{p.title}</div>
        <div className="slug">{p.slug}</div>
      </td>
      <td>
        {p.date || '—'}{p.time ? ' · ' + p.time : ''}
      </td>
      <td className="slug">
        {media.join(' + ')}
      </td>
      <td>
        <span className={`badge ${on ? 'on' : 'off'}`}>
          {on ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </td>
      <td>
        <div className="rowbtns">
          <button className="btn sm" onClick={() => onPreview(p.id)}>Preview</button>
          <button className="btn sm" onClick={() => onExportSingle(p.id)}>Single file</button>
          <button className="btn sm" onClick={() => onExportZip(p.id)}>Folder .zip</button>
          <button className="btn sm" onClick={() => onToggle(p.id)}>
            {on ? 'Deactivate' : 'Activate'}
          </button>
          <button className="btn sm d" onClick={() => onDelete(p.id, p.slug)}>Delete</button>
        </div>
      </td>
    </tr>
  );
}
