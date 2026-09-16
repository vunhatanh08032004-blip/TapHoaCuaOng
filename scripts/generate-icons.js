import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, getPixel) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // Deflate
  ihdrData.writeUInt8(0, 11); // Filter standard
  ihdrData.writeUInt8(0, 12); // No interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Scanlines with filter byte 0 (None)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const table = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Generate icon graphic: Golden Amber bee & film download badge on dark slate background
function getIconPixel(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxR = w / 2;

  // Background: Rich dark amber/slate gradient
  const bgGrad = Math.min(1, Math.max(0, (y / h) * 0.8 + (x / w) * 0.2));
  let r = Math.round(15 + bgGrad * 15);
  let g = Math.round(23 + bgGrad * 10);
  let b = Math.round(42 - bgGrad * 10);
  let a = 255;

  if (!isMaskable && dist > maxR * 0.94) {
    // Rounded smooth corners for standard icon
    const cornerR = w * 0.22;
    const innerX = Math.min(Math.max(x, cornerR), w - cornerR);
    const innerY = Math.min(Math.max(y, cornerR), h - cornerR);
    const cdist = Math.sqrt((x - innerX) ** 2 + (y - innerY) ** 2);
    if (cdist > cornerR) {
      return [0, 0, 0, 0];
    }
  }

  // Outer Golden Ring / Glow
  const ringRadius = maxR * (isMaskable ? 0.68 : 0.78);
  const ringThickness = w * 0.035;
  if (Math.abs(dist - ringRadius) < ringThickness) {
    return [245, 158, 11, 255]; // Amber 500
  }

  // Bee / Honeycomb / Film symbol in center
  // Center golden hexagon / shield
  const scale = isMaskable ? 0.5 : 0.6;
  const nx = dx / (w * scale);
  const ny = dy / (h * scale);

  // Hexagon shape
  const hexDist = Math.max(Math.abs(nx) * 0.866025 + Math.abs(ny) * 0.5, Math.abs(ny));
  if (hexDist < 0.65) {
    // Inside badge
    const innerGrad = (ny + 0.65) / 1.3;
    let br = Math.round(251 - innerGrad * 20); // Amber 400
    let bg = Math.round(191 - innerGrad * 60); // Amber 600
    let bb = Math.round(36 + innerGrad * 10);

    // Film download arrow in center of hexagon
    // Arrow stem: nx between -0.12 and 0.12, ny between -0.38 and 0.05
    if (Math.abs(nx) < 0.1 && ny > -0.35 && ny < 0.05) {
      return [15, 23, 42, 255]; // Dark slate
    }
    // Arrow head: triangular shape pointing down
    if (ny >= 0.05 && ny <= 0.28) {
      const headWidth = (0.28 - ny) * 1.5;
      if (Math.abs(nx) < headWidth) {
        return [15, 23, 42, 255]; // Dark slate
      }
    }
    // Download bar base at bottom: ny between 0.33 and 0.42, nx between -0.28 and 0.28
    if (ny >= 0.34 && ny <= 0.42 && Math.abs(nx) < 0.28) {
      return [15, 23, 42, 255];
    }

    return [br, bg, bb, 255];
  }

  return [r, g, b, a];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate Icons
console.log('Generating PWA icons...');

fs.writeFileSync(
  path.join(publicDir, 'pwa-192x192.png'),
  createPng(192, 192, (x, y, w, h) => getIconPixel(x, y, w, h, false))
);

fs.writeFileSync(
  path.join(publicDir, 'pwa-512x512.png'),
  createPng(512, 512, (x, y, w, h) => getIconPixel(x, y, w, h, false))
);

fs.writeFileSync(
  path.join(publicDir, 'pwa-maskable-512x512.png'),
  createPng(512, 512, (x, y, w, h) => getIconPixel(x, y, w, h, true))
);

fs.writeFileSync(
  path.join(publicDir, 'apple-touch-icon.png'),
  createPng(180, 180, (x, y, w, h) => getIconPixel(x, y, w, h, false))
);

// SVG Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="110" fill="url(#bgGrad)"/>
  <circle cx="256" cy="256" r="200" fill="none" stroke="url(#goldGrad)" stroke-width="14" opacity="0.4"/>
  <polygon points="256,120 376,190 376,322 256,392 136,322 136,190" fill="url(#goldGrad)"/>
  <!-- Download Arrow -->
  <path d="M236 180 H276 V260 H316 L256 325 L196 260 H236 Z" fill="#0f172a"/>
  <!-- Bottom Bar -->
  <rect x="190" y="340" width="132" height="18" rx="6" fill="#0f172a"/>
  <!-- Bee wing accent -->
  <circle cx="330" cy="180" r="24" fill="#ffffff" opacity="0.65"/>
  <circle cx="182" cy="180" r="24" fill="#ffffff" opacity="0.65"/>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf-8');

console.log('PWA icons created successfully!');
