import fs from 'fs';
import path from 'path';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import pngToIco from 'png-to-ico';

async function main() {
  const imgDir = path.join(process.cwd(), 'src', 'assets', 'images');
  const files = fs.readdirSync(imgDir);
  const beeFile = files.find(f => f.startsWith('bee_exact_user_png'));

  if (!beeFile) {
    console.error('No bee_exact_user_png found');
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

  // Save as TapHoaCuaOng_Bee.png and app-icon.png
  fs.writeFileSync(path.join(publicDir, 'TapHoaCuaOng_Bee.png'), pngBuffer);
  fs.writeFileSync(path.join(publicDir, 'app-icon.png'), pngBuffer);

  // Generate ICO too
  const icoBuffer = await pngToIco(path.join(publicDir, 'app-icon.png'));
  fs.writeFileSync(path.join(publicDir, 'app.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);

  console.log('Successfully saved high quality PNG and ICO to public/TapHoaCuaOng_Bee.png');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
