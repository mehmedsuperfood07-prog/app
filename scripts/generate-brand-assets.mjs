// Builds every logo-derived asset from the master logo in brand/logo.png: the
// in-app logo, the app and home-screen icons, the favicon, and the Android
// notification icons. To change the logo, replace brand/logo.png (a PNG with a
// transparent background, as large as you can get it) and run
//
//   node scripts/generate-brand-assets.mjs
//
// The Android app takes its icons from the live site, so after deploying, rebuild
// it too (see the README next to the APK).
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const SOURCE = "brand/logo.png";
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// Crops the master down to the artwork itself, so every size below is measured
// against the logo and not against the empty margin around it.
async function croppedLogo() {
  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 10) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return sharp(SOURCE)
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png()
    .toBuffer();
}

const logo = await croppedLogo();

// The logo is landscape, so every square icon is the logo centred on a tile.
async function squareIcon(size, widthFraction, { rounded = false, background = WHITE } = {}) {
  const logoWidth = Math.round(size * widthFraction);
  const resized = await sharp(logo).resize({ width: logoWidth, kernel: "lanczos3" }).toBuffer();
  const { height: logoHeight } = await sharp(resized).metadata();
  const tile = await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([
      { input: resized, left: Math.round((size - logoWidth) / 2), top: Math.round((size - logoHeight) / 2) },
    ])
    .png()
    .toBuffer();
  if (!rounded) return tile;

  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#fff"/></svg>`,
  );
  return sharp(tile).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

async function write(file, buffer) {
  await writeFile(file, buffer);
  console.log(`wrote ${file}`);
}

// In-app logo, with a hair of padding so anti-aliased edges are never clipped.
await write(
  "public/brand/logo.png",
  await sharp(logo).extend({ top: 2, bottom: 2, left: 2, right: 2, background: TRANSPARENT }).png().toBuffer(),
);

// App icons. The maskable one is full-bleed with the logo inside Android's safe
// zone (the middle ~66%), because launchers crop it to a circle or squircle.
await write("public/icons/icon-192.png", await squareIcon(192, 0.82, { rounded: true }));
await write("public/icons/icon-512.png", await squareIcon(512, 0.82, { rounded: true }));
await write("public/icons/icon-maskable-512.png", await squareIcon(512, 0.62));
await write("public/icons/apple-touch-icon.png", await squareIcon(180, 0.78));

// Browser-tab icon: no tile, so the logo gets all of the few pixels there are.
const faviconSizes = [16, 32, 48];
const faviconPngs = [];
for (const size of faviconSizes) {
  faviconPngs.push(await squareIcon(size, 0.96, { background: TRANSPARENT }));
}

function ico(sizes, pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map((png, i) => {
    const entry = Buffer.alloc(16);
    entry[0] = sizes[i];
    entry[1] = sizes[i];
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs]);
}

await write("app/favicon.ico", ico(faviconSizes, faviconPngs));

// Android draws status-bar and notification icons from the alpha channel alone,
// so a full-colour logo would show up as a solid white blob. This is a white
// oval (the logo's shape) with an "M" cut out of it.
const silhouette = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
      <rect width="512" height="512" fill="#fff"/>
      <path transform="translate(256 256) scale(0.72) translate(-256 -256)" fill="#000"
        d="M128 384V128h60l68 112 68-112h60v256h-54V222l-56 96h-36l-56-96v162z"/>
    </mask>
  </defs>
  <ellipse cx="256" cy="256" rx="242" ry="154" fill="#fff" mask="url(#cut)"/>
</svg>`);

await write("public/icons/icon-monochrome-512.png", await sharp(silhouette).resize(512, 512).png().toBuffer());
await write("public/icons/badge-96.png", await sharp(silhouette).resize(96, 96).png().toBuffer());
