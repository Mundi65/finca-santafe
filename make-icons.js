'use strict';
// Genera todos los iconos PNG para la PWA de Finca SantaFe.
// Sin dependencias externas — solo módulos built-in de Node.js.
// Uso: node make-icons.js
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── Colores ──────────────────────────────────────────────────────────────────
const BG   = [0x1B, 0x43, 0x32, 255]; // #1B4332 verde
const GOLD = [0xC8, 0x92, 0x2A, 255]; // #C8922A dorado

// ── Geometría ────────────────────────────────────────────────────────────────
function inRoundRect(x, y, w, h, r) {
  if (x < 0 || x > w || y < 0 || y > h) return false;
  if (x < r     && y < r)     return Math.hypot(x - r,     y - r)     <= r;
  if (x > w - r && y < r)     return Math.hypot(x - (w-r), y - r)     <= r;
  if (x < r     && y > h - r) return Math.hypot(x - r,     y - (h-r)) <= r;
  if (x > w - r && y > h - r) return Math.hypot(x - (w-r), y - (h-r)) <= r;
  return true;
}

function side(px, py, ax, ay, bx, by) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

function inTri(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = side(px, py, ax, ay, bx, by);
  const d2 = side(px, py, bx, by, cx, cy);
  const d3 = side(px, py, cx, cy, ax, ay);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

// ── Render ───────────────────────────────────────────────────────────────────
function renderIcon(sz) {
  const buf = Buffer.alloc(sz * sz * 4);
  const cx = sz / 2, cy = sz / 2;
  const r  = sz * 0.34;
  const cr = sz * 0.22;
  const s  = Math.sqrt(3) / 2; // sin 60°

  // Triángulo arriba (↑)
  const u1x = cx,       u1y = cy - r;
  const u2x = cx + r*s, u2y = cy + r*0.5;
  const u3x = cx - r*s, u3y = cy + r*0.5;
  // Triángulo abajo (↓)
  const d1x = cx,       d1y = cy + r;
  const d2x = cx + r*s, d2y = cy - r*0.5;
  const d3x = cx - r*s, d3y = cy - r*0.5;

  for (let y = 0; y < sz; y++) {
    for (let x = 0; x < sz; x++) {
      const i = (y * sz + x) * 4;
      const px = x + 0.5, py = y + 0.5;

      if (!inRoundRect(px, py, sz, sz, cr)) {
        buf[i] = buf[i+1] = buf[i+2] = buf[i+3] = 0; // transparente
        continue;
      }
      const star = inTri(px, py, u1x, u1y, u2x, u2y, u3x, u3y)
                || inTri(px, py, d1x, d1y, d2x, d2y, d3x, d3y);
      const c = star ? GOLD : BG;
      buf[i] = c[0]; buf[i+1] = c[1]; buf[i+2] = c[2]; buf[i+3] = c[3];
    }
  }
  return buf;
}

// ── CRC32 (RFC 1952) ─────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── Codificador PNG ───────────────────────────────────────────────────────────
function makePNG(w, h, rgba) {
  const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const t   = Buffer.from(type, 'ascii');
    const len = Buffer.allocUnsafe(4);
    len.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.allocUnsafe(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crcBuf]);
  }

  // IHDR: width, height, 8-bit, RGBA (type 6)
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Datos sin comprimir: byte de filtro (0=None) + píxeles por scanline
  const raw = Buffer.allocUnsafe(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }

  return Buffer.concat([
    SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ── Main ─────────────────────────────────────────────────────────────────────
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUT   = path.join(__dirname, 'icons');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

console.log('\n Finca SantaFe — Generando iconos PWA\n');
for (const sz of SIZES) {
  const png  = makePNG(sz, sz, renderIcon(sz));
  fs.writeFileSync(path.join(OUT, `icon-${sz}.png`), png);
  process.stdout.write(`  ✓ icon-${sz}.png  (${(png.length / 1024).toFixed(1)} KB)\n`);
}
process.stdout.write('\n  ✅ Todos los iconos guardados en /icons/\n\n');
