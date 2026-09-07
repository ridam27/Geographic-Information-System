export function slugify(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function fmtSize(b) {
  if (b >= 1073741824) return (b / 1073741824).toFixed(2) + ' GB';
  if (b >= 1048576) return (b / 1048576).toFixed(1) + ' MB';
  if (b >= 1024) return (b / 1024).toFixed(0) + ' KB';
  return (b || 0) + ' B';
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

export function parseGpx(text) {
  let doc;
  try {
    doc = new DOMParser().parseFromString(text, "application/xml");
  } catch(e) {
    return [];
  }
  
  if (doc.querySelector("parsererror")) {
    return [];
  }

  const nodes = Array.prototype.slice.call(doc.getElementsByTagName("trkpt"));
  const raw = [];
  
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const lat = parseFloat(n.getAttribute("lat"));
    const lon = parseFloat(n.getAttribute("lon"));
    if (isNaN(lat) || isNaN(lon)) continue;
    
    const eleNode = n.getElementsByTagName("ele")[0];
    const timeNode = n.getElementsByTagName("time")[0];
    
    raw.push({
      lat: lat,
      lon: lon,
      alt: eleNode ? parseFloat(eleNode.textContent) : null,
      ms: timeNode ? Date.parse(timeNode.textContent) : null
    });
  }

  if (!raw.length) return [];

  const haveTime = raw[0].ms != null && !isNaN(raw[0].ms);
  const t0 = haveTime ? raw[0].ms : 0;
  
  return raw.map((p, i) => {
    return {
      t: (haveTime && p.ms != null) ? +(((p.ms - t0) / 1000).toFixed(3)) : i,
      lat: p.lat,
      lon: p.lon,
      alt: p.alt,
      acc: null,
      spd: null,
      head: null
    };
  });
}
