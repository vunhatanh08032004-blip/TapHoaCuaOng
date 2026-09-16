import fs from 'fs';
import path from 'path';

// Find the generated image in /src/assets/images
const imgDir = path.join(process.cwd(), 'src', 'assets', 'images');
const files = fs.readdirSync(imgDir);
const beeFile = files.find(f => f.startsWith('bee_app_icon'));

if (!beeFile) {
  console.error('No bee icon image found');
  process.exit(1);
}

const sourcePath = path.join(imgDir, beeFile);
const imageBuffer = fs.readFileSync(sourcePath);

// Ensure public dir exists
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write PNG / JPG copy to public/app-icon.png
fs.writeFileSync(path.join(publicDir, 'app-icon.png'), imageBuffer);

// Convert PNG/JPG image buffer into ICO format
// ICO header for 1 image (256x256)
function imageBufferToIco(imgBuf) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(1, 4); // Number of images

  header.writeUInt8(0, 6); // Width: 0 = 256px
  header.writeUInt8(0, 7); // Height: 0 = 256px
  header.writeUInt8(0, 8); // Color count: 0
  header.writeUInt8(0, 9); // Reserved: 0
  header.writeUInt16LE(1, 10); // Color planes
  header.writeUInt16LE(32, 12); // Bits per pixel
  header.writeUInt32LE(imgBuf.length, 14); // Image size
  header.writeUInt32LE(22, 18); // Offset

  return Buffer.concat([header, imgBuf]);
}

const icoBuffer = imageBufferToIco(imageBuffer);
fs.writeFileSync(path.join(publicDir, 'app.ico'), icoBuffer);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

console.log('Successfully created public/app.ico and public/app-icon.png');
