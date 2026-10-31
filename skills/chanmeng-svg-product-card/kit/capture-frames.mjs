#!/usr/bin/env node
// Verify an animated SVG the way a README shows it: through <img>, at chosen
// seconds, on a light and a dark canvas, and with motion turned off.
//
//   node capture-frames.mjs output/project-card.svg --at=2,5.5,10 [--out=output/frames] [--width=1300]
//
// Writes <name>-<canvas>-<seconds>s.png for each time and canvas at exactly that
// point in the loop, and <name>-<canvas>-as-img.png through a real <img>. Then checks
// the reduced-motion still: the SVG is loaded as a top-level DOCUMENT with
// reduced motion emulated, captured twice three seconds apart, and the two
// captures must be identical. (Emulation does not reach an SVG inside <img>,
// so that route would report a moving picture as compliant.)
//
// Needs playwright-core and a browser:  npm i -D playwright-core
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const file = process.argv[2];
const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
if (!file || !fs.existsSync(file)) {
  console.error("Usage: node capture-frames.mjs <file.svg> --at=1,3,5 [--out=dir] [--width=px]");
  process.exit(1);
}
let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  console.error("capture-frames needs playwright-core:  npm i -D playwright-core");
  process.exit(1);
}

const svg = fs.readFileSync(file, "utf8");
const [, , vbW, vbH] = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 800 400").split(/\s+/).map(Number);
const width = Number(arg("width", vbW));
const height = Math.round((width * vbH) / vbW);
const times = arg("at", "1,3,5").split(",").map(Number).sort((a, b) => a - b);
const outDir = arg("out", "output/frames");
const name = path.basename(file, ".svg");
fs.mkdirSync(outDir, { recursive: true });
const url = pathToFileURL(path.resolve(file)).href;

// The installed browser if there is one, else Playwright's own Chromium.
async function launch() {
  for (const channel of ["chrome", "msedge", undefined]) {
    try {
      return await chromium.launch(channel ? { channel } : {});
    } catch {
      // try the next one
    }
  }
  console.error("capture-frames found no browser. Install Chrome or Edge, or run:  npx playwright-core install chromium");
  process.exit(1);
}

const browser = await launch();
let failed = false;
const inline = svg.replace(/^\s*<\?xml[^>]*>\s*/, "");
for (const [canvas, colour] of [["light", "#ffffff"], ["dark", "#0d1117"]]) {
  // It has to work as an image: that is how a README shows it.
  const host = path.join(outDir, `_${name}-${canvas}.html`);
  fs.writeFileSync(host, `<body style="margin:0;background:${colour}"><img id="i" src="${url}" style="width:${width}px;display:block"></body>`);
  const image = await browser.newPage({ viewport: { width, height } });
  await image.goto(pathToFileURL(path.resolve(host)).href);
  const decoded = await image.evaluate(() => {
    const i = document.getElementById("i");
    return i.complete && i.naturalWidth > 0;
  });
  if (!decoded) {
    console.error(`✗ ${canvas}: the image did not decode`);
    failed = true;
  }
  await image.waitForTimeout(1000);
  await image.screenshot({ path: path.join(outDir, `${name}-${canvas}-as-img.png`) });
  await image.close();
  fs.rmSync(host);

  // Scripts cannot reach inside <img>, so the timed frames use the same SVG inline
  // with its clock set. A frame labelled 5s is exactly second 5, however slow the
  // machine: waiting and then capturing drifted by more than half a second.
  const page = await browser.newPage({ viewport: { width, height } });
  await page.setContent(`<!doctype html><style>body{margin:0;background:${colour}}body>svg{display:block;width:${width}px;height:auto}</style>${inline}`);
  for (const t of times) {
    await page.evaluate((ms) => {
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = ms;
      }
    }, t * 1000);
    await page.screenshot({ path: path.join(outDir, `${name}-${canvas}-${t}s.png`) });
  }
  await page.close();
}

const still = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
await still.goto(url);
await still.waitForTimeout(500);
const a = await still.screenshot({ path: path.join(outDir, `${name}-reduced-motion.png`) });
await still.waitForTimeout(3000);
const b = await still.screenshot();
await browser.close();
if (Buffer.compare(a, b) !== 0) {
  console.error("✗ reduced motion: the picture is still moving");
  failed = true;
}

console.log(`${failed ? "✗" : "✓"} ${name}: ${times.length * 2} timed frames, 2 through <img>, reduced-motion still → ${outDir}`);
process.exit(failed ? 1 : 0);
