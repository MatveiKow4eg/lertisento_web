/**
 * Generate favicon assets from an existing source image.
 *
 * Requirements:
 *   - Node.js
 *   - npm i sharp
 *
 * Usage:
 *   node tools/generate-favicons.js
 *
 * Notes:
 *   - Reads:  assets/favicon.png
 *   - Writes: assets/favicon-16.png
 *            assets/favicon-32.png
 *            assets/apple-touch-icon.png (180x180)
 *            assets/favicon-192.png
 *            assets/favicon-512.png
 */

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Missing dependency: sharp');
  console.error('Install it with: npm i sharp');
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'assets');

const input = path.join(assetsDir, 'favicon.png');

const outputs = [
  { file: 'favicon-16.png', size: 16 },
  { file: 'favicon-32.png', size: 32 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon-192.png', size: 192 },
  { file: 'favicon-512.png', size: 512 },
];

async function main() {
  if (!fs.existsSync(input)) {
    console.error(`Input not found: ${input}`);
    process.exit(1);
  }

  // Ensure output directory exists
  fs.mkdirSync(assetsDir, { recursive: true });

  const image = sharp(input, { failOn: 'none' });
  const meta = await image.metadata();

  console.log(`Source: ${path.relative(rootDir, input)} (${meta.width}x${meta.height}${meta.format ? ', ' + meta.format : ''})`);

  // If the source is very small, warn user (it will upscale and may look blurry)
  const maxSize = Math.max(...outputs.map(o => o.size));
  if ((meta.width || 0) < maxSize || (meta.height || 0) < maxSize) {
    console.warn(
      `WARNING: source image is smaller than ${maxSize}x${maxSize}.\n` +
      `The script will upscale it and it may look blurry.\n` +
      `Best quality: replace assets/favicon.png with a >= ${maxSize}x${maxSize} image and re-run.`
    );
  }

  // Many logos come with lots of empty/transparent margins.
  // We trim that away first, then add a small padding, then resize.
  // This makes the visible mark larger inside the final favicon.
  const paddingRatio = 0.10; // 10% padding around the mark

  for (const o of outputs) {
    const outPath = path.join(assetsDir, o.file);
    const pad = Math.max(1, Math.round(o.size * paddingRatio));
    const inner = Math.max(1, o.size - pad * 2);

    await sharp(input, { failOn: 'none' })
      .trim() // auto-crop uniform borders (works for transparent/solid margins)
      .resize(inner, inner, {
        fit: 'contain',
        position: 'centre',
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: false,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .resize(o.size, o.size, { kernel: sharp.kernel.lanczos3 })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outPath);

    console.log(`Wrote: ${path.relative(rootDir, outPath)} (${o.size}x${o.size})`);
  }

  console.log('Done. Now update <head> links in index.html to use the generated files.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
