#!/usr/bin/env node
// Static gate for a card: does this file obey the sandbox GitHub renders it in?
// It reads the SVG and needs no browser. It cannot judge how the card looks, so it
// runs before capture-frames.mjs, not instead of it.
//
//   node check-card.mjs <file.svg> [more.svg ...] [--max-kb=619]
//
// Errors exit 1: something that fails inside <img>, or breaks the file.
// Warnings do not: something legal that usually means a mistake.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const count = (s, re) => (s.match(re) || []).length;

/** @returns {{ errors: string[], warnings: string[], stats: object }} */
export function checkSvg(svg, { maxKb = 619 } = {}) {
  const errors = [];
  const warnings = [];
  const kb = Buffer.byteLength(svg) / 1024;
  const images = count(svg, /<image\b/g);

  // Scan with embedded pictures removed: base64 is long and can look like anything.
  const src = svg.replace(/(["'(])data:[^"')]*(["')])/g, "$1data:$2");

  if (!/^\s*(<\?xml[^>]*>\s*)?<svg\b/.test(src)) errors.push("the file does not start with <svg>");
  if (!/<svg\b[^>]*\bxmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(src)) errors.push("the root has no xmlns: <img> will not render it");
  if (!/<svg\b[^>]*\bviewBox=/.test(src)) errors.push("the root has no viewBox");

  // What the <img> sandbox blocks.
  if (/<script\b/i.test(src)) errors.push("<script>: no JavaScript runs inside <img>");
  if (/<foreignObject\b/i.test(src)) errors.push("<foreignObject>: HTML does not render inside <img>");
  if (/\son[a-z]+\s*=\s*"/i.test(src)) errors.push("an event handler attribute: nothing is interactive inside <img>");
  if (/@import\b/i.test(src)) errors.push("@import: no stylesheet loads inside <img>");
  if (/@font-face\b/i.test(src)) errors.push("@font-face: no font loads inside <img>; outline the text");
  if (/<text\b/i.test(src)) errors.push("<text>: the reader's fallback font will show; outline it (outlineTextElements)");

  const refs = [
    ...[...src.matchAll(/\b(?:xlink:)?href="([^"]*)"/g)].map((m) => m[1]),
    ...[...src.matchAll(/url\(\s*['"]?([^'")]*)['"]?\s*\)/g)].map((m) => m[1]),
  ];
  const external = refs.filter((r) => r && !r.startsWith("#") && !r.startsWith("data:"));
  if (external.length) errors.push(`external reference, which will not load: ${[...new Set(external)].slice(0, 3).join(", ")}`);

  const ids = [...src.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const seen = new Set();
  const dupes = new Set(ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false))));
  if (dupes.size) errors.push(`duplicate id: ${[...dupes].slice(0, 3).join(", ")}`);
  const dangling = refs.filter((r) => r.startsWith("#") && !seen.has(r.slice(1)));
  if (dangling.length) errors.push(`reference to a missing id: ${[...new Set(dangling)].slice(0, 3).join(", ")}`);

  // Accessibility: outlined text cannot be read aloud, so the title has to carry it.
  const title = src.match(/<title\b[^>]*>([^<]*)<\/title>/);
  if (!title || !title[1].trim()) errors.push("no <title>: outlined text is silent to a screen reader, and the title is the alt text");
  if (!/\brole="img"/.test(src)) warnings.push('no role="img" on the root');

  // Motion.
  const defined = new Set([...src.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]));
  const shorthands = [...src.matchAll(/(?<![\w-])animation\s*:\s*([^;}]+)/g)].map((m) => m[1].trim()).filter((v) => !/^none\b/.test(v));
  const named = [...src.matchAll(/(?<![\w-])animation-name\s*:\s*([\w-]+)/g)].map((m) => m[1]);
  const used = [...named, ...shorthands.map((v) => v.split(/\s+/).find((w) => defined.has(w)))].filter(Boolean);
  // A shorthand may carry only the timing, with the names set by animation-name.
  const unnamed = named.length ? [] : shorthands.filter((v) => !v.split(/\s+/).some((w) => defined.has(w)));
  if (unnamed.length) errors.push(`animation with no matching @keyframes: ${unnamed.slice(0, 2).join(" | ")}`);
  const unknown = named.filter((n) => n !== "none" && !defined.has(n));
  if (unknown.length) errors.push(`animation-name with no matching @keyframes: ${[...new Set(unknown)].slice(0, 3).join(", ")}`);
  const unused = [...defined].filter((k) => !used.includes(k));
  if (unused.length) warnings.push(`@keyframes never used: ${unused.slice(0, 4).join(", ")}`);

  const animated = defined.size > 0;
  if (!animated) warnings.push("no @keyframes: this is a still picture");
  if (animated && !/@media[^{]*prefers-reduced-motion:\s*reduce[^{]*\{/.test(src)) errors.push("no prefers-reduced-motion rule");
  if (/<animate(Transform|Motion)?\b/.test(src)) warnings.push("SMIL animation: the reduced-motion rule does not stop it; use CSS keyframes");

  const durations = [...src.matchAll(/animation-duration\s*:\s*([\d.]+m?s)/g)].map((m) => m[1]);
  const loops = new Set([...durations, ...shorthands.map((v) => (v.match(/(?:^|\s)([\d.]+m?s)\b/) || [])[1]).filter(Boolean)]);
  // A caret or an equaliser has its own short cycle on purpose; two long loops drift.
  const seconds = (d) => (d.endsWith("ms") ? parseFloat(d) / 1000 : parseFloat(d));
  const long = [...loops].filter((d) => seconds(d) >= 3);
  if (long.length > 1) warnings.push(`${long.length} long loops (${long.slice(0, 4).join(", ")}) drift apart; put every scene on one`);
  const late = [...src.matchAll(/animation-delay\s*:\s*([\d.]+)s/g)].filter((m) => Number(m[1]) > 0);
  if (late.length) warnings.push("a positive animation-delay leaves a blank first cycle; use a negative delay (tl.shift)");

  if (kb > maxKb) warnings.push(`${kb.toFixed(0)} KB is above the ${maxKb} KB verified on GitHub; test it on the real host`);

  return {
    errors,
    warnings,
    stats: { kb: Number(kb.toFixed(1)), glyphs: count(src, /<path id=/g), uses: count(src, /<use\b/g), images, keyframes: defined.size, loop: [...loops].join("/") || null },
  };
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? "")).href) {
  const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const maxArg = process.argv.find((a) => a.startsWith("--max-kb="));
  if (!files.length) {
    console.error("Usage: node check-card.mjs <file.svg> [more.svg ...] [--max-kb=619]");
    process.exit(2);
  }
  let failed = false;
  for (const file of files) {
    const { errors, warnings, stats } = checkSvg(fs.readFileSync(file, "utf8"), maxArg ? { maxKb: Number(maxArg.slice(9)) } : {});
    if (errors.length) failed = true;
    console.log(`${errors.length ? "✗" : "✓"} ${path.basename(file)}  ${stats.kb} KB, ${stats.glyphs} glyphs, ${stats.uses} placed, ${stats.images} images, ${stats.keyframes} keyframes${stats.loop ? `, loop ${stats.loop}` : ""}`);
    for (const e of errors) console.log(`  error: ${e}`);
    for (const w of warnings) console.log(`  warning: ${w}`);
  }
  process.exit(failed ? 1 : 0);
}
