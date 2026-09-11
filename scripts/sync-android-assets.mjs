import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const targets = [
  {
    name: 'nodus-home',
    distDir: path.join(rootDir, 'packages', 'nodus-home', 'dist'),
    assetsDir: path.join(rootDir, 'packages', 'nodus-home', 'android-shell', 'app', 'src', 'main', 'assets', 'frontend'),
  },
  {
    name: 'nodus-fleet',
    distDir: path.join(rootDir, 'packages', 'nodus-fleet', 'dist'),
    assetsDir: path.join(rootDir, 'packages', 'nodus-fleet', 'android-shell', 'app', 'src', 'main', 'assets', 'frontend'),
  },
];

console.log('[sync-android-assets] Starting cross-platform asset synchronization...');

for (const target of targets) {
  if (!fs.existsSync(target.distDir)) {
    console.warn(`[sync-android-assets] Dist directory not found for ${target.name}: ${target.distDir}`);
    continue;
  }

  // 1. Wipe destination folder cleanly using Node recursive rm
  if (fs.existsSync(target.assetsDir)) {
    console.log(`[sync-android-assets] Wiping stale assets in ${target.assetsDir}...`);
    fs.rmSync(target.assetsDir, { recursive: true, force: true });
  }

  // 2. Ensure target directory exists
  fs.mkdirSync(target.assetsDir, { recursive: true });

  // 3. Copy dist contents recursively
  fs.cpSync(target.distDir, target.assetsDir, { recursive: true });
  console.log(`[sync-android-assets] Successfully synced ${target.name} dist -> ${target.assetsDir}`);
}

console.log('[sync-android-assets] Synchronization complete.');
