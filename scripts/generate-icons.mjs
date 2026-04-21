import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const sourcePath = resolve(root, 'images/logo-feel-understood.png');

const sizes = [
  { size: 512, output: 'images/icon-512.png' },
  { size: 192, output: 'images/icon-192.png' },
  { size: 180, output: 'images/apple-touch-icon.png' },
  { size: 64, output: 'images/favicon-64.png' },
];

for (const { size, output } of sizes) {
  const outPath = resolve(root, output);
  await sharp(sourcePath)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toFile(outPath);
  console.log(`Generated ${output} (${size}x${size})`);
}
