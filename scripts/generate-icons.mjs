/**
 * Generates icon-192.png and icon-512.png using only built-in Node.js modules.
 * Design: indigo→violet diagonal gradient with white "M" letterform.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length, 0);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([l, t, data, c]);
}

// ── Draw pixel ────────────────────────────────────────────────────────────────
function lerp(a, b, t) { return Math.round(a + t * (b - a)); }

function makePNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit depth, RGB

  // Gradient colours: indigo (#6366f1) → violet (#8b5cf6)
  const c0 = [99, 102, 241];
  const c1 = [139, 92, 246];
  // Padding (rounded look): 12% of size
  const pad = Math.round(size * 0.12);
  // "M" dimensions relative to size
  const mLeft  = Math.round(size * 0.20);
  const mRight = Math.round(size * 0.80);
  const mTop   = Math.round(size * 0.22);
  const mBot   = Math.round(size * 0.78);
  const mMid   = Math.round(size * 0.50);
  const mPeakY = Math.round(size * 0.44);
  const strokeW = Math.max(2, Math.round(size * 0.09));

  function isOnM(x, y) {
    // Left vertical bar
    if (x >= mLeft && x <= mLeft + strokeW && y >= mTop && y <= mBot) return true;
    // Right vertical bar
    if (x >= mRight - strokeW && x <= mRight && y >= mTop && y <= mBot) return true;
    // Left diagonal (top-left → centre-peak)
    const d1 = Math.abs((mPeakY - mTop) * x - (mMid - mLeft) * y + mMid * mTop - mPeakY * mLeft)
      / Math.sqrt((mPeakY - mTop) ** 2 + (mMid - mLeft) ** 2);
    if (d1 < strokeW / 2 && x >= mLeft && x <= mMid && y >= mTop && y <= mPeakY) return true;
    // Right diagonal (centre-peak → top-right)
    const d2 = Math.abs((mTop - mPeakY) * x - (mRight - mMid) * y + mRight * mPeakY - mTop * mMid)
      / Math.sqrt((mTop - mPeakY) ** 2 + (mRight - mMid) ** 2);
    if (d2 < strokeW / 2 && x >= mMid && x <= mRight && y >= mTop && y <= mPeakY) return true;
    return false;
  }

  const rows = [];
  for (let y = 0; y < size; y++) {
    const ty = y / (size - 1);
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // filter None
    for (let x = 0; x < size; x++) {
      const tx = x / (size - 1);
      const t = (tx + ty) / 2;  // diagonal gradient

      // Background: indigo→violet gradient
      let r = lerp(c0[0], c1[0], t);
      let g = lerp(c0[1], c1[1], t);
      let b = lerp(c0[2], c1[2], t);

      // Dark vignette near corners
      const dx = Math.abs(tx - 0.5) * 2;
      const dy = Math.abs(ty - 0.5) * 2;
      const vignette = Math.max(0, (dx * dx + dy * dy) / 2 - 0.3);
      r = Math.max(0, Math.round(r * (1 - vignette * 0.25)));
      g = Math.max(0, Math.round(g * (1 - vignette * 0.25)));
      b = Math.max(0, Math.round(b * (1 - vignette * 0.25)));

      // White "M" letterform
      if (isOnM(x, y)) { r = 255; g = 255; b = 255; }

      row[1 + x * 3]     = r;
      row[1 + x * 3 + 1] = g;
      row[1 + x * 3 + 2] = b;
    }
    rows.push(row);
  }

  const idat = deflateSync(Buffer.concat(rows), { level: 6 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

try { mkdirSync('public', { recursive: true }); } catch {}
writeFileSync('public/icon-192.png', makePNG(192));
writeFileSync('public/icon-512.png', makePNG(512));
console.log('✓ Generated public/icon-192.png (192×192)');
console.log('✓ Generated public/icon-512.png (512×512)');
