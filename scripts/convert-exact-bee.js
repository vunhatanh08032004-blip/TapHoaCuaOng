import fs from 'fs';
import path from 'path';

const imgDir = path.join(process.cwd(), 'src', 'assets', 'images');
const files = fs.readdirSync(imgDir);
const beeFile = files.find(f => f.startsWith('bee_shortcut_icon'));

if (!beeFile) {
  console.error('No bee_shortcut_icon found');
  process.exit(1);
}

const sourcePath = path.join(imgDir, beeFile);
const imageBuffer = fs.readFileSync(sourcePath);

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'app-icon.png'), imageBuffer);

// Helper to wrap buffer in Windows ICO header
function bufferToIco(imgBuf) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(1, 4); // Count = 1

  header.writeUInt8(0, 6); // Width (0 = 256)
  header.writeUInt8(0, 7); // Height (0 = 256)
  header.writeUInt8(0, 8); // Color count
  header.writeUInt8(0, 9); // Reserved
  header.writeUInt16LE(1, 10); // Color planes
  header.writeUInt16LE(32, 12); // Bits per pixel
  header.writeUInt32LE(imgBuf.length, 14); // Image size
  header.writeUInt32LE(22, 18); // Offset

  return Buffer.concat([header, imgBuf]);
}

const icoBuf = bufferToIco(imageBuffer);
fs.writeFileSync(path.join(publicDir, 'app.ico'), icoBuf);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);

console.log('Successfully updated public/app.ico and public/app-icon.png with exact bee icon!');
