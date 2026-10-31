// __CARD_ID__ card. Replace this comment with what the stage shows and where each
// thing on it comes from: compiled, quoted, asked, followed or redrawn.
//
//   node __CARD_ID__.mjs [out.svg]
//
// Once FONTS exist this runs as it is, so you start from a card that passes the
// gates. Replace THEME, COPY and the stage with the product's own: every value below is a
// placeholder, and a card left looking like this is a business card, not a demo.
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import kit from "./lib/index.cjs";

const { CARD, card, createGlyphSet, createTimeline, panel } = kit;

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || join(here, "__CARD_ID__.svg");

// Static instances, from the product's own font loader. panel() needs these four
// keys; add more for the stage. See SKILL.md for finding the files.
const FONTS = {
  display: join(here, "fonts", "display.ttf"),
  sans: join(here, "fonts", "sans.ttf"),
  sansBold: join(here, "fonts", "sansBold.ttf"),
  mono: join(here, "fonts", "mono.ttf"),
};
const absent = Object.values(FONTS).filter((f) => !existsSync(f));
if (absent.length) throw new Error(`Put the product's fonts in place first, or edit FONTS. Missing:\n  ${absent.join("\n  ")}`);
const glyphs = createGlyphSet(FONTS);

// Copied from the product's token file, never read off a screenshot.
const THEME = { panel: "#14161a", text: "#f4f4f1", muted: "#a2a4a8", soft: "#d6d7d9", accent: "#3f7cff", stage: "#eef0f3", surface: "#ffffff", line: "#d3d7dd", ink: "#14161a", dim: "#5f6670" };

// Cleared copy only: from the product's site, strings or film.
const COPY = {
  eyebrow: "OPEN SOURCE TOOL",
  name: "Product",
  headline: "What it does, in one line.",
  underline: "one line",
  sub: "An optional second line.",
  chips: ["MIT"],
  command: "product run --example",
  rows: ["First real result", "Second real result", "Third real result"],
  done: "3 results",
};

const T = 12;
const tl = createTimeline({ duration: T });
const stageX = CARD.panel;
const W = { x: stageX + 56, y: 44, w: 688, h: 272, head: 34, pad: 24 };

// ── The window: the product's own interface, redrawn ─────────────────────────
const mono = (s, x, y, fill, size = 15) => glyphs.text(s, { font: "mono", size, x, y, fill });
const window_ =
  `<rect x="${W.x}" y="${W.y}" width="${W.w}" height="${W.h}" rx="12" fill="${THEME.surface}" stroke="${THEME.line}"/>` +
  `<path d="M${W.x} ${W.y + W.head}h${W.w}" stroke="${THEME.line}"/>` +
  mono(COPY.name.toLowerCase(), W.x + W.pad, W.y + 22, THEME.dim, 12);

// ── Scene 1: the command types itself ────────────────────────────────────────
const lineY = W.y + W.head + 40;
const typed = tl.cover({ start: 0.6, chars: COPY.command.length + 2, width: W.w, cps: 24 });
const command =
  mono(`$ ${COPY.command}`, W.x + W.pad, lineY, THEME.ink) +
  `<g clip-path="url(#line)"><rect class="${typed}" x="${W.x + W.pad - 2}" y="${lineY - 18}" width="${W.w - W.pad * 2}" height="26" fill="${THEME.surface}"/></g>`;

// ── Scene 2: the results arrive, one beat each ───────────────────────────────
const beat = 2.6;
const rows = COPY.rows.map((row, i) => {
  const y = lineY + 46 + i * 44;
  const shown = tl.on(beat + i * 0.9);
  return (
    `<g ${shown.attrs}>` +
    `<rect x="${W.x + W.pad}" y="${y - 22}" width="${W.w - W.pad * 2}" height="34" rx="8" fill="${THEME.stage}"/>` +
    `<circle cx="${W.x + W.pad + 18}" cy="${y - 5}" r="5" fill="${THEME.accent}"/>` +
    glyphs.text(row, { font: "sans", size: 15, x: W.x + W.pad + 36, y, fill: THEME.ink }) +
    "</g>"
  );
});

// ── Scene 3: it finishes. This is the still frame ────────────────────────────
const done = tl.on(beat + COPY.rows.length * 0.9 + 0.3);
const doneChip = `<g ${done.attrs}>${glyphs.text(COPY.done, { font: "mono", size: 12, x: W.x + W.w - W.pad, y: W.y + 22, fill: THEME.accent, anchor: "end" })}</g>`;

// The stage dips for a moment to hide the jump when the loop restarts.
const dip = tl.dip();
const stageSvg =
  `<rect x="${stageX}" width="${CARD.w - stageX}" height="${CARD.h}" fill="${THEME.stage}"/>` +
  `<g class="${dip}">${window_}${command}${rows.join("")}${doneChip}</g>`;

const panelSvg = panel(glyphs, { theme: THEME, eyebrow: COPY.eyebrow, name: COPY.name, headline: COPY.headline, underline: COPY.underline, sub: COPY.sub, chips: COPY.chips });

const svg = card({
  title: `${COPY.name}: ${COPY.headline} The card shows ${COPY.command} running and returning ${COPY.done}.`,
  css: tl.css(),
  defs: `${glyphs.defs()}<clipPath id="line"><rect x="${W.x + W.pad - 2}" y="${lineY - 18}" width="${W.w - W.pad * 2}" height="26"/></clipPath>`,
  panelSvg,
  stageSvg,
  loop: T,
});

writeFileSync(out, svg);
console.log(`wrote ${out}  ${(svg.length / 1024).toFixed(1)} KB`);
