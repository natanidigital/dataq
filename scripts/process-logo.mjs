// One-off script: convert logo-icon.jpg (white background) into a
// transparent PNG, then derive app/icon.png (square favicon crop of just
// the mark) and public/logo.png (full logo incl. wordmark, for the header).
import sharp from "sharp";
import path from "path";

const SRC = path.resolve("logo-icon.jpg");

async function toTransparent(inputPath) {
  const image = sharp(inputPath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Near-white -> fully transparent. A soft falloff near the threshold
    // avoids a hard jagged edge around anti-aliased logo pixels.
    const whiteness = Math.min(r, g, b);
    if (whiteness > 250) {
      data[i + 3] = 0;
    } else if (whiteness > 235) {
      data[i + 3] = Math.round(((250 - whiteness) / 15) * 255);
    }
  }

  return sharp(data, { raw: { width, height, channels } });
}

async function main() {
  const transparent = await toTransparent(SRC);
  const meta = await transparent.clone().png().toBuffer({ resolveWithObject: true });

  // Full logo (mark + "dataq.space" wordmark) — for the app header/login.
  await sharp(meta.data).png().toFile(path.resolve("public/logo.png"));

  // Square favicon: crop just the mark (top ~58% of the image, before the
  // wordmark starts), trim the now-transparent margins down to the mark's
  // actual bounding box, then pad back to a square canvas so a 16-32px
  // browser tab icon isn't a speck in a sea of empty space.
  const { width, height } = meta.info;
  const markHeight = Math.round(height * 0.58);
  const cropped = await sharp(meta.data)
    .extract({ left: 0, top: 0, width, height: markHeight })
    .png()
    .toBuffer();
  const trimmed = await sharp(cropped).trim({ threshold: 10 }).png().toBuffer();
  const trimmedMeta = await sharp(trimmed).metadata();
  const side = Math.round(Math.max(trimmedMeta.width, trimmedMeta.height) * 1.08);
  const markSquare = await sharp(trimmed)
    .resize(side, side, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(512, 512)
    .png()
    .toBuffer();

  // app/icon.png is Next.js's App Router convention for the favicon/app
  // icon — not served as a plain static file, so a second copy lives under
  // public/ (logo-mark.png) for use as a regular <Image> in the UI itself.
  await sharp(markSquare).toFile(path.resolve("app/icon.png"));
  await sharp(markSquare).toFile(path.resolve("public/logo-mark.png"));

  console.log("Wrote public/logo.png and app/icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
