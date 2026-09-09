// One-off: derive PWA icon sizes from the already-processed square mark
// (public/logo-mark.png — transparent, tightly cropped). Android/Chrome
// installability wants at least 192 and 512px icons; iOS home-screen icons
// specifically look wrong with transparency (no background is applied, so
// it renders as if on a black tile), so apple-touch-icon gets flattened
// onto white instead.
import sharp from "sharp";
import path from "path";

const SRC = path.resolve("public/logo-mark.png");

async function main() {
  await sharp(SRC).resize(192, 192).png().toFile(path.resolve("public/icon-192.png"));
  await sharp(SRC).resize(512, 512).png().toFile(path.resolve("public/icon-512.png"));
  // Next.js's App Router convention: a file named exactly this in app/
  // (not public/) is auto-detected and wired up as the apple-touch-icon
  // link tag — no manual <link> or metadata.icons entry needed.
  await sharp(SRC)
    .resize(180, 180)
    .flatten({ background: "#ffffff" })
    .png()
    .toFile(path.resolve("app/apple-icon.png"));

  console.log("Wrote icon-192.png, icon-512.png, app/apple-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
