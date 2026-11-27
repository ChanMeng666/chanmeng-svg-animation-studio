#!/usr/bin/env node
// Measure an animated SVG across one whole loop, with numbers instead of eyes, and
// lay the loop out on one contact sheet to look at.
//
//   node qa-loop.mjs <file.svg> [--fps=10] [--dur=seconds] [--width=480] [--bg=#ffffff] [--out=output/frames] [--tiles=8]
//
// It seeks the SVG's own clock (CSS animations and SMIL) to exact times, so the result
// does not depend on how fast the machine is. The loop length is read from the file:
// the longest animation that repeats forever. One-shot entrances are let finish first,
// so the loop measured is the one a visitor watches after the first seconds.
//
// FAIL usually means a real technical problem. WARN is often on purpose: keep it if you
// can say why.
//   FAIL loop seam      the jump from the last frame back to the first is far above a normal frame step
//   note other loops    repeating animations whose lengths do not divide the loop (staggered ambient
//                       motion, on purpose); the seam is measured on the longest
//   WARN first frame    the picture at 0 s holds a fraction of the detail it reaches later (it is the
//                       picture a visitor sees on load)
//   WARN hard cut       one frame changes far more than the frames around it
//   WARN dead stretch   seconds in which almost nothing on the picture changes
//   WARN nothing moves  the file animates, but no frame differs from the next
//
// Writes <name>-sheet.png (the loop in tiles; the last tile is the loop's start again, so
// the seam sits between the last two) and <name>-qa.json.
// Exit codes: 0 no FAIL, 1 a FAIL, 2 usage, 3 environment (no playwright-core or no browser;
// run doctor.mjs).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEAD_FRACTION = 0.0005;
const DEAD_SECONDS = 2;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

/**
 * Judge one loop from per-step measurements. Pure, so it is tested without a browser.
 * @param {object} m
 * @param {number[]} m.diffs    mean absolute grey difference (0-255) between frame i and i+1
 * @param {number[]} m.changed  fraction of pixels that changed visibly between frame i and i+1
 * @param {number[]} m.detail   edge energy of each frame
 * @param {number}   m.step     seconds between frames
 * @param {number}   m.start    time of the first measured frame, in seconds
 * @param {boolean}  m.loops    true when the last step is the seam back to the loop's start
 * @param {number}   [m.firstDetail]  edge energy of the frame at 0 s, when it is not the first measured
 * @returns {{level: 'PASS'|'WARN'|'FAIL', check: string, detail: string}[]}
 */
export function analyse({ diffs, changed, detail, step, start = 0, loops, firstDetail }) {
  const out = [];
  const add = (level, check, text) => out.push({ level, check, detail: text });
  const at = (i) => `${(start + i * step).toFixed(step < 0.1 ? 2 : 1)}s`;
  const body = loops ? diffs.slice(0, -1) : diffs;
  const moving = body.filter((d) => d > 0.05);
  const typical = median(moving.length ? moving : body);

  if (Math.max(0, ...diffs) < 0.05) {
    add("WARN", "nothing moves", "no frame differs from the next");
    return out;
  }

  if (loops) {
    // A fade into the seam is gradual: its last step is no bigger than the steps before it.
    const seam = diffs.at(-1);
    const before = Math.max(0, ...body.slice(-2));
    const fail = seam > 2 && seam > 4 * Math.max(typical, 0.25) && seam > 3 * before;
    add(fail ? "FAIL" : "PASS", "loop seam", `last → first ${seam.toFixed(2)}, typical step ${typical.toFixed(2)}${fail ? ": every loop snaps. Make the 100% keyframes equal the 0% ones, or fade both ends to the same frame" : ""}`);
  }

  const peak = Math.max(...detail, firstDetail ?? 0);
  const first = firstDetail ?? detail[0];
  if (peak > 0 && first < 0.25 * peak) add("WARN", "first frame", `the picture at 0 s holds ${Math.round((first / peak) * 100)}% of its peak detail; it is the one a visitor sees on load`);
  else add("PASS", "first frame", `${Math.round((first / (peak || 1)) * 100)}% of peak detail`);

  const cuts = [];
  for (let i = 0; i < body.length; i++) {
    const near = [body[i - 1], body[i + 1]].filter((d) => d !== undefined);
    if (body[i] > 4 && body[i] > 6 * Math.max(typical, 0.25) && near.every((d) => body[i] > 3 * d)) cuts.push(`${at(i)}→${at(i + 1)} (${body[i].toFixed(1)})`);
  }
  add(cuts.length ? "WARN" : "PASS", "hard cut", cuts.length ? cuts.slice(0, 6).join(", ") : "none");

  const dead = [];
  const still = loops ? changed.slice(0, -1) : changed;
  for (let i = 0; i < still.length; ) {
    if (still[i] >= DEAD_FRACTION) { i++; continue; }
    let j = i;
    while (j < still.length && still[j] < DEAD_FRACTION) j++;
    if ((j - i) * step >= DEAD_SECONDS) dead.push(`${at(i)}–${at(j)}`);
    i = j;
  }
  add(dead.length ? "WARN" : "PASS", "dead stretch", dead.length ? `${dead.join(", ")}: almost nothing changes` : "none");
  return out;
}

/** Loop length and lead-in from the animations a document declares. */
export function loopOf(timings, { dur } = {}) {
  const repeating = timings.filter((t) => t.iterations === Infinity && t.duration > 0);
  const once = timings.filter((t) => t.iterations !== Infinity);
  const leadIn = Math.max(0, ...once.map((t) => t.delay + t.duration * t.iterations));
  if (dur) return { period: dur, leadIn, uneven: [] };
  if (!repeating.length) return { period: 0, leadIn, uneven: [] };
  const period = Math.max(...repeating.map((t) => t.duration));
  const uneven = [...new Set(repeating.map((t) => t.duration))].filter((d) => Math.abs(period / d - Math.round(period / d)) > 0.02);
  return { period, leadIn, uneven };
}

export async function main() {
  const file = process.argv[2];
  const arg = (name, fallback) => {
    const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  if (!file || !fs.existsSync(file)) {
    console.error("Usage: node qa-loop.mjs <file.svg> [--fps=10] [--dur=s] [--width=480] [--bg=#ffffff] [--out=dir] [--tiles=8]");
    process.exit(2);
  }
  let chromium;
  try {
    ({ chromium } = await import("playwright-core"));
  } catch {
    console.error("qa-loop needs playwright-core:  npm i -D playwright-core   (node doctor.mjs checks everything)");
    process.exit(3);
  }

  const svg = fs.readFileSync(file, "utf8");
  const [, , vbW, vbH] = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 800 400").split(/\s+/).map(Number);
  const width = Number(arg("width", Math.min(480, vbW)));
  const height = Math.round((width * vbH) / vbW);
  const fps = Number(arg("fps", 10));
  const tiles = Number(arg("tiles", 8));
  const bg = arg("bg", "#ffffff");
  const outDir = arg("out", "output/frames");
  const name = path.basename(file, ".svg");
  fs.mkdirSync(outDir, { recursive: true });

  let browser;
  for (const channel of ["chrome", "msedge", undefined]) {
    try {
      browser = await chromium.launch(channel ? { channel } : {});
      break;
    } catch {
      // try the next one
    }
  }
  if (!browser) {
    console.error("qa-loop found no browser that starts. Install Chrome or Edge, or run:  npx playwright-core install chromium");
    process.exit(3);
  }

  const page = await browser.newPage({ viewport: { width, height } });
  const inline = svg.replace(/^\s*<\?xml[^>]*>\s*/, "");
  await page.setContent(`<!doctype html><style>body{margin:0;background:${bg}}body>svg{display:block;width:${width}px;height:auto}</style>${inline}`);

  const timings = await page.evaluate(() => {
    const css = document.getAnimations().map((a) => {
      const t = a.effect.getComputedTiming();
      return { duration: Number(t.duration) / 1000, delay: t.delay / 1000, iterations: t.iterations };
    });
    const seconds = (v) => (!v ? 0 : v.endsWith("ms") ? parseFloat(v) / 1000 : v.endsWith("min") ? parseFloat(v) * 60 : parseFloat(v));
    const smil = [...document.querySelectorAll("animate, animateTransform, animateMotion, set")].map((e) => ({
      duration: seconds(e.getAttribute("dur")),
      delay: seconds(e.getAttribute("begin")),
      iterations: e.getAttribute("repeatCount") === "indefinite" || e.getAttribute("repeatDur") === "indefinite" ? Infinity : Number(e.getAttribute("repeatCount") || 1),
    }));
    return [...css, ...smil].map((t) => ({ ...t, iterations: t.iterations === null ? Infinity : t.iterations }));
  });
  const dur = arg("dur") ? Number(arg("dur")) : undefined;
  const { period, leadIn, uneven } = loopOf(timings, { dur });

  if (!timings.length) {
    console.log(`– ${name}: no animation, a still picture. Nothing to measure.`);
    await browser.close();
    process.exit(0);
  }

  const seek = (s) =>
    page.evaluate((sec) => {
      for (const a of document.getAnimations()) {
        a.pause();
        a.currentTime = sec * 1000;
      }
      const root = document.querySelector("body > svg");
      if (root?.pauseAnimations) {
        root.pauseAnimations();
        root.setCurrentTime(sec);
      }
    }, s);
  const shot = async (s) => {
    await seek(s);
    return (await page.screenshot()).toString("base64");
  };

  const loops = period > 0;
  const span = loops ? period : leadIn;
  const start = loops && leadIn > 0 ? Math.ceil(leadIn / period - 1e-9) * period : 0;
  const steps = Math.max(24, Math.round(span * fps));
  const step = span / steps;
  // The first seek after load can paint the running state; one throwaway shot settles it.
  await shot(start + step);
  const frames = [];
  for (let i = 0; i <= steps; i++) frames.push(await shot(start + i * step));
  const first = start > 0 ? await shot(0) : null;

  // Measure in a page: the browser decodes PNG, Node does not without a dependency.
  const lab = await browser.newPage();
  const measured = await lab.evaluate(
    async ({ frames, first, w }) => {
      const load = (b64) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = `data:image/png;base64,${b64}`; });
      const grey = async (b64) => {
        const img = await load(b64);
        const h = Math.max(1, Math.round((w * img.height) / img.width));
        const c = new OffscreenCanvas(w, h);
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0, w, h);
        const d = g.getImageData(0, 0, w, h).data;
        const out = new Float32Array(w * h);
        for (let p = 0; p < out.length; p++) out[p] = 0.299 * d[p * 4] + 0.587 * d[p * 4 + 1] + 0.114 * d[p * 4 + 2];
        return { px: out, w, h };
      };
      const edge = ({ px, w, h }) => {
        let e = 0;
        for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const p = y * w + x; e += Math.abs(px[p + 1] - px[p]) + Math.abs(px[p + w] - px[p]); }
        return e / (w * h);
      };
      const g = [];
      for (const f of frames) g.push(await grey(f));
      const diffs = [], changed = [];
      for (let i = 0; i < g.length - 1; i++) {
        let sum = 0, n = 0;
        const a = g[i].px, b = g[i + 1].px;
        for (let p = 0; p < a.length; p++) { const d = Math.abs(a[p] - b[p]); sum += d; if (d > 8) n++; }
        diffs.push(sum / a.length);
        changed.push(n / a.length);
      }
      return { diffs, changed, detail: g.map(edge), firstDetail: first ? edge(await grey(first)) : undefined };
    },
    { frames, first, w: 240 },
  );

  const results = analyse({ ...measured, step, start, loops });
  if (uneven.length) results.unshift({ level: "PASS", check: "other loops", detail: `${uneven.length} repeating animation(s) of other lengths (${uneven.slice(0, 4).map((d) => `${d}s`).join(", ")}${uneven.length > 4 ? ", …" : ""}) never line up with the ${period}s loop; fine for ambient motion, not for the main action` });
  if (!loops) results.unshift({ level: "PASS", check: "plays once", detail: `no animation repeats; it plays for ${leadIn.toFixed(1)}s and holds, so there is no seam` });

  // The contact sheet: evenly spread tiles over the loop, then the loop's start again.
  const pick = Array.from({ length: tiles }, (_, k) => Math.round((k * (frames.length - 2)) / Math.max(1, tiles - 1)));
  if (loops) pick.push(frames.length - 1);
  const labels = pick.map((i) => (loops && i === frames.length - 1 ? `${(start + i * step).toFixed(1)}s = start` : `${(start + i * step).toFixed(1)}s`));
  const sheet = await lab.evaluate(
    async ({ shots, labels, bg }) => {
      const imgs = await Promise.all(shots.map((b64) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = `data:image/png;base64,${b64}`; })));
      const tw = imgs[0].width, th = imgs[0].height, cols = Math.min(3, imgs.length), rows = Math.ceil(imgs.length / cols), gap = 8, lab = 22;
      const c = document.createElement("canvas");
      c.width = cols * tw + (cols + 1) * gap;
      c.height = rows * (th + lab) + (rows + 1) * gap;
      const g = c.getContext("2d");
      g.fillStyle = "#888";
      g.fillRect(0, 0, c.width, c.height);
      imgs.forEach((img, k) => {
        const x = gap + (k % cols) * (tw + gap), y = gap + Math.floor(k / cols) * (th + lab + gap);
        g.fillStyle = bg;
        g.fillRect(x, y + lab, tw, th);
        g.drawImage(img, x, y + lab);
        g.fillStyle = "#fff";
        g.font = "14px sans-serif";
        g.fillText(labels[k], x + 2, y + 16);
      });
      return c.toDataURL("image/png").split(",")[1];
    },
    { shots: pick.map((i) => frames[i]), labels, bg },
  );
  await browser.close();

  const sheetPath = path.join(outDir, `${name}-sheet.png`);
  fs.writeFileSync(sheetPath, Buffer.from(sheet, "base64"));
  const round = (xs) => xs.map((x) => Number(x.toFixed(3)));
  const report = { file, period, leadIn, start, step, results, sheet: sheetPath, diffs: round(measured.diffs), changed: round(measured.changed) };
  fs.writeFileSync(path.join(outDir, `${name}-qa.json`), JSON.stringify(report, null, 2));

  const failed = results.some((r) => r.level === "FAIL");
  console.log(`${failed ? "✗" : "✓"} ${name}: ${loops ? `${period}s loop` : "one-shot"}${start ? ` measured from ${start}s` : ""}, ${frames.length} frames, ${step.toFixed(3)}s apart`);
  for (const r of results) console.log(`  ${r.level.padEnd(4)} ${r.check}: ${r.detail}`);
  console.log(`  sheet  ${sheetPath}`);
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? "")).href) await main();
