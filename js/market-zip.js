// 最小可用的 ZIP 產生器（store 模式、不壓縮）＋ CSV 工具。純前端，無任何外部套件。
// 結構：每個檔案 local file header + 資料，最後 central directory + end of central directory record。
// 檔名以 UTF-8 編碼並設定 general purpose bit 11（0x0800），中文檔名在各解壓縮工具可正確顯示。

const enc = new TextEncoder();

let CRC_TABLE = null;
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE;
  CRC_TABLE = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    CRC_TABLE[n] = c >>> 0;
  }
  return CRC_TABLE;
}
export function crc32(bytes) {
  const t = crcTable();
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function dosTime(d) {
  const year = Math.max(1980, d.getFullYear());
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

const toBytes = (data) => typeof data === 'string' ? enc.encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);

/**
 * files: [{ name: '資料夾/檔名.csv', data: string | Uint8Array | ArrayBuffer, date?: Date }]
 * 回傳 Uint8Array（完整 ZIP 檔內容）
 */
export function zipBytes(files) {
  const now = new Date();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const f of files) {
    const nameBytes = enc.encode(f.name.replace(/\\/g, '/'));
    const data = toBytes(f.data);
    const crc = crc32(data);
    const { time, date } = dosTime(f.date || now);

    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);   // local file header signature
    lh.setUint16(4, 20, true);           // version needed to extract (2.0)
    lh.setUint16(6, 0x0800, true);       // general purpose flag：UTF-8 檔名
    lh.setUint16(8, 0, true);            // compression method：0 = store
    lh.setUint16(10, time, true);
    lh.setUint16(12, date, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true); // compressed size
    lh.setUint32(22, data.length, true); // uncompressed size
    lh.setUint16(26, nameBytes.length, true);
    lh.setUint16(28, 0, true);           // extra field length
    locals.push(new Uint8Array(lh.buffer), nameBytes, data);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);   // central directory header signature
    ch.setUint16(4, 20, true);           // version made by
    ch.setUint16(6, 20, true);           // version needed
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, time, true);
    ch.setUint16(14, date, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true);
    ch.setUint32(24, data.length, true);
    ch.setUint16(28, nameBytes.length, true);
    ch.setUint16(30, 0, true);           // extra length
    ch.setUint16(32, 0, true);           // comment length
    ch.setUint16(34, 0, true);           // disk number start
    ch.setUint16(36, 0, true);           // internal attrs
    ch.setUint32(38, 0, true);           // external attrs
    ch.setUint32(42, offset, true);      // relative offset of local header
    centrals.push(new Uint8Array(ch.buffer), nameBytes);

    offset += 30 + nameBytes.length + data.length;
  }
  const cdSize = centrals.reduce((s, b) => s + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);    // end of central directory signature
  end.setUint16(4, 0, true);
  end.setUint16(6, 0, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  end.setUint16(20, 0, true);

  const parts = [...locals, ...centrals, new Uint8Array(end.buffer)];
  const total = parts.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const b of parts) { out.set(b, p); p += b.length; }
  return out;
}

export const zipBlob = (files) => new Blob([zipBytes(files)], { type: 'application/zip' });

// ---- CSV（UTF-8 含 BOM、CRLF、處理逗號／引號／換行） ----
export function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function toCSV(rows) {
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

// ---- 觸發瀏覽器下載 ----
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 15000);
}

export function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
