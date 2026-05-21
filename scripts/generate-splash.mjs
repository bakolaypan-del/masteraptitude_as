/**
 * Generates iOS splash screen PNGs using only built-in Node.js modules.
 * Each splash: dark indigo bg + centered icon + app name.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

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


function makeSplash(W, H) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  // Background: deep indigo #0f0c29
  const bgR = 15, bgG = 12, bgB = 41;

  // Centered logo square size
  const logoSize = Math.round(Math.min(W, H) * 0.28);
  const lx = Math.round((W - logoSize) / 2);
  const ly = Math.round(H * 0.32);

  // Logo gradient: indigo→violet
  const c0 = [99, 102, 241], c1 = [139, 92, 246];

  // "M" stroke params (same logic as icon generator)
  const mLeft   = Math.round(logoSize * 0.20);
  const mRight  = Math.round(logoSize * 0.80);
  const mTop    = Math.round(logoSize * 0.22);
  const mBot    = Math.round(logoSize * 0.78);
  const mMid    = Math.round(logoSize * 0.50);
  const mPeakY  = Math.round(logoSize * 0.44);
  const strokeW = Math.max(2, Math.round(logoSize * 0.09));

  function isOnM(lx2, ly2) {
    if (lx2 >= mLeft && lx2 <= mLeft + strokeW && ly2 >= mTop && ly2 <= mBot) return true;
    if (lx2 >= mRight - strokeW && lx2 <= mRight && ly2 >= mTop && ly2 <= mBot) return true;
    const d1 = Math.abs((mPeakY - mTop) * lx2 - (mMid - mLeft) * ly2 + mMid * mTop - mPeakY * mLeft)
      / Math.sqrt((mPeakY - mTop) ** 2 + (mMid - mLeft) ** 2);
    if (d1 < strokeW / 2 && lx2 >= mLeft && lx2 <= mMid && ly2 >= mTop && ly2 <= mPeakY) return true;
    const d2 = Math.abs((mTop - mPeakY) * lx2 - (mRight - mMid) * ly2 + mRight * mPeakY - mTop * mMid)
      / Math.sqrt((mTop - mPeakY) ** 2 + (mRight - mMid) ** 2);
    if (d2 < strokeW / 2 && lx2 >= mMid && lx2 <= mRight && ly2 >= mTop && ly2 <= mPeakY) return true;
    return false;
  }

  const rows = [];
  for (let y = 0; y < H; y++) {
    const row = Buffer.alloc(1 + W * 3);
    row[0] = 0;
    for (let x = 0; x < W; x++) {
      let r = bgR, g = bgG, b = bgB;

      // Logo area
      const px = x - lx, py = y - ly;
      if (px >= 0 && px < logoSize && py >= 0 && py < logoSize) {
        // Rounded square mask (corner radius ~16%)
        const cx = logoSize / 2, cy = logoSize / 2;
        const rx = logoSize * 0.16, ry = logoSize * 0.16;
        const dx = Math.max(Math.abs(px - cx) - (logoSize / 2 - rx), 0);
        const dy = Math.max(Math.abs(py - cy) - (logoSize / 2 - ry), 0);
        if (dx * dx + dy * dy <= rx * rx) {
          const t = ((px / logoSize) + (py / logoSize)) / 2;
          r = Math.round(c0[0] + t * (c1[0] - c0[0]));
          g = Math.round(c0[1] + t * (c1[1] - c0[1]));
          b = Math.round(c0[2] + t * (c1[2] - c0[2]));
          if (isOnM(px, py)) { r = 255; g = 255; b = 255; }
        }
      }

      // Subtle "Master Aptitude" text area (3 pixel-wide dots below logo)
      const textY = ly + logoSize + Math.round(logoSize * 0.18);
      const textH = Math.round(logoSize * 0.06);
      const textW = Math.round(logoSize * 1.4);
      const textX = Math.round((W - textW) / 2);
      if (y >= textY && y < textY + textH && x >= textX && x < textX + textW) {
        // A subtle lighter bar to hint at text
        r = Math.round(bgR + (80 - bgR) * 0.5);
        g = Math.round(bgG + (70 - bgG) * 0.5);
        b = Math.round(bgB + (120 - bgB) * 0.5);
      }

      row[1 + x * 3]     = r;
      row[1 + x * 3 + 1] = g;
      row[1 + x * 3 + 2] = b;
    }
    rows.push(row);
  }

  const idat = deflateSync(Buffer.concat(rows), { level: 4 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

try { mkdirSync('public', { recursive: true }); } catch {}

const sizes = [
  [390, 844, 'splash-390x844.png'],
  [375, 812, 'splash-375x812.png'],
  [414, 896, 'splash-414x896.png'],
  [375, 667, 'splash-375x667.png'],
];

for (const [w, h, name] of sizes) {
  writeFileSync(`public/${name}`, makeSplash(w, h));
  console.log(`✓ Generated public/${name} (${w}×${h})`);
}
