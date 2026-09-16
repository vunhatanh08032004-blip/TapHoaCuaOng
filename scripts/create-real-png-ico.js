import fs from 'fs';
import path from 'path';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import pngToIco from 'png-to-ico';

async function main() {
  const imgDir = path.join(process.cwd(), 'src', 'assets', 'images');
  const files = fs.readdirSync(imgDir);
  const beeFile = files.find(f => f.startsWith('bee_shortcut_icon'));

  if (!beeFile) {
    console.error('No bee_shortcut_icon found');
    process.exit(1);
  }

  const sourcePath = path.join(imgDir, beeFile);
  const jpegData = fs.readFileSync(sourcePath);
  const rawImageData = jpeg.decode(jpegData, { useTArray: true });

  const png = new PNG({
    width: rawImageData.width,
    height: rawImageData.height,
  });
  png.data = Buffer.from(rawImageData.data);

  const pngBuffer = PNG.sync.write(png);

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Save 100% valid PNG
  const pngPath = path.join(publicDir, 'app-icon.png');
  fs.writeFileSync(pngPath, pngBuffer);
  console.log('Saved 100% valid PNG to:', pngPath);

  // Save 100% valid Windows ICO
  const icoBuffer = await pngToIco(pngPath);
  const icoPath = path.join(publicDir, 'app.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('Saved 100% valid Windows ICO to:', icoPath);
}

main().catch(err => {
  console.error('Error generating PNG and ICO:', err);
  process.exit(1);
});
