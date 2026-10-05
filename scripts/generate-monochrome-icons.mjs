// Renders the white-on-transparent "M" used for Android notifications: the
// status-bar icon Bubblewrap derives for the APK, and the `badge` the service
// worker hands to showNotification. Android tints these by their alpha
// channel alone, so a full-colour icon would show up as a solid white square.
//
//   node scripts/generate-monochrome-icons.mjs
import sharp from "sharp";

// Same glyph as public/icons/icon.svg, enlarged to fill most of the canvas
// because a status-bar icon is only about 24dp.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <path transform="translate(256 256) scale(1.55) translate(-256 -256)" d="M128 384V128h60l68 112 68-112h60v256h-54V222l-56 96h-36l-56-96v162z" fill="#ffffff"/>
</svg>`;

for (const [file, size] of [
  ["icon-monochrome-512.png", 512],
  ["badge-96.png", 96],
]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/${file}`);
  console.log(`wrote public/icons/${file}`);
}
