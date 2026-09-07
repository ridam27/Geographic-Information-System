/* ============================ minimal ZIP (store, no compression) ============================ */
const CRCT = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = CRCT[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

export function strU8(s) {
  return new TextEncoder().encode(s);
}

export function zipStore(files) { // files:[{name,u8}]
  const chunks = [];
  const central = [];
  let offset = 0;

  function u16(v) { return new Uint8Array([v & 255, (v >> 8) & 255]); }
  function u32(v) { return new Uint8Array([v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]); }

  files.forEach((f) => {
    const name = strU8(f.name);
    const data = f.u8;
    const crc = crc32(data);
    
    const lh = [].concat(
      Array.from(u32(0x04034b50)),
      Array.from(u16(20)),
      Array.from(u16(0)),
      Array.from(u16(0)),
      Array.from(u16(0)),
      Array.from(u16(0)),
      Array.from(u32(crc)),
      Array.from(u32(data.length)),
      Array.from(u32(data.length)),
      Array.from(u16(name.length)),
      Array.from(u16(0))
    );
    
    const lhU = new Uint8Array(lh);
    chunks.push(lhU, name, data);
    
    const ch = [].concat(
      Array.from(u32(0x02014b50)),
      Array.from(u16(20)),
      Array.from(u16(20)),
      Array.from(u16(0)),
      Array.from(u16(0)),
      Array.from(u16(0)),
      Array.from(u16(0)),
      Array.from(u32(crc)),
      Array.from(u32(data.length)),
      Array.from(u32(data.length)),
      Array.from(u16(name.length)),
      Array.from(u16(0)),
      Array.from(u16(0)),
      Array.from(u16(0)),
      Array.from(u16(0)),
      Array.from(u32(0)),
      Array.from(u32(offset))
    );
    
    central.push({ head: new Uint8Array(ch), name: name });
    offset += lhU.length + name.length + data.length;
  });

  const cstart = offset;
  let csize = 0;
  const parts = [];
  
  central.forEach((c) => {
    parts.push(c.head, c.name);
    csize += c.head.length + c.name.length;
  });
  
  const end = [].concat(
    Array.from(u32(0x06054b50)),
    Array.from(u16(0)),
    Array.from(u16(0)),
    Array.from(u16(files.length)),
    Array.from(u16(files.length)),
    Array.from(u32(csize)),
    Array.from(u32(cstart)),
    Array.from(u16(0))
  );
  
  const all = chunks.concat(parts, [new Uint8Array(end)]);
  return new Blob(all, { type: 'application/zip' });
}
