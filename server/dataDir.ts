import fs from 'fs';
import path from 'path';

/**
 * Returns a guaranteed writable directory for app persistence (users.json, store.json, etc.).
 * On Windows, defaults to %APPDATA%/TapHoaCuaOngData to avoid Program Files permission errors in .exe.
 */
export function getWritableDataDir(): string {
  const appData =
    process.env.APPDATA ||
    (process.platform === 'darwin'
      ? path.join(process.env.HOME || '', 'Library', 'Application Support')
      : process.platform === 'linux'
      ? path.join(process.env.HOME || '', '.config')
      : null);

  if (appData) {
    const userDir = path.join(appData, 'TapHoaCuaOngData');
    try {
      fs.mkdirSync(userDir, { recursive: true });
      const testFile = path.join(userDir, '.write-test');
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      return userDir;
    } catch {}
  }

  const localDir = path.join(process.cwd(), 'data');
  try {
    fs.mkdirSync(localDir, { recursive: true });
  } catch {}
  return localDir;
}
