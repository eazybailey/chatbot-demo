import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'images/icon-app.svg');
const svg = readFileSync(svgPath);

const sizes = [
  { size: 512, output: 'images/icon-512.png' },
  { size: 192, output: 'images/icon-192.png' },
  { size: 180, output: 'images/apple-touch-icon.png' },
];

for (const { size, output } of sizes) {
  const outPath = resolve(root, output);
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`Generated ${output} (${size}x${size})`);
}
