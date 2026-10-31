// The frame a product card shares: 1300×360, a 500 px identity panel on the left
// and an 800 px stage on the right where the product itself performs. The card
// carries its own plate, so it holds on both GitHub canvases. Base states are the
// FINISHED frame: with animations off, what remains is a complete still picture.
// Method: references/field-guide.md.

const CARD = Object.freeze({ w: 1300, h: 360, panel: 500, radius: 20 });

const DEFAULT_FONTS = Object.freeze({ display: 'display', sans: 'sans', sansBold: 'sansBold', mono: 'mono' });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const wordCount = (s) => String(s).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

function fail(message) {
  throw new Error(`card: ${message}`);
}

/**
 * The identity panel. It holds at most five things and no prose, and it refuses
 * more, because a card that repeats the page around it is the commonest failure.
 *
 * @param {object} glyphs  a glyph set from createGlyphSet
 * @param {object} o
 * @param {{ panel: string, text: string, muted: string, soft?: string, accent: string }} o.theme  the PRODUCT's tokens
 * @param {string} o.eyebrow     up to four words
 * @param {string} [o.wordmark]  the real wordmark as an SVG fragment, in the box x 40-476, y 84-150. Prefer this.
 * @param {string} [o.mark]      a symbol in a 58 px box at (40, 84), set beside `name`
 * @param {string} [o.name]      the name as text, for a product with no wordmark file
 * @param {number} [o.nameSize]  56 by default; lower it for a long name
 * @param {string} o.headline    one line
 * @param {string} [o.underline] a part of the headline to underline in the accent
 * @param {string} [o.sub]       one optional line
 * @param {string[]} [o.chips]   up to three
 * @param {number} [o.headlineSize]
 * @param {typeof DEFAULT_FONTS} [o.fonts]  which font keys of the glyph set to use
 */
function panel(glyphs, { theme, eyebrow, wordmark, mark, name, nameSize = 56, headline, underline, sub, chips = [], headlineSize = 25, fonts = DEFAULT_FONTS }) {
  if (!theme) fail('panel needs a theme: the product\'s own tokens');
  if (!wordmark && !name) fail('panel needs a wordmark or a name');
  if (wordCount(eyebrow) > 4) fail(`eyebrow "${eyebrow}" is more than four words`);
  if (chips.length > 3) fail(`panel takes at most three chips, got ${chips.length}`);

  const right = CARD.panel - 24;
  const hl = { font: fonts.sansBold, size: headlineSize };
  if (40 + glyphs.measure(headline, hl) > right) fail(`headline "${headline}" does not fit the panel at ${headlineSize}px`);

  const out = [`<rect width="${CARD.panel}" height="${CARD.h}" fill="${theme.panel}"/>`];
  out.push(glyphs.text(eyebrow, { font: fonts.mono, size: 12.5, x: 40, y: 52, fill: theme.muted, tracking: 0.16 }));

  if (wordmark) out.push(`<g transform="translate(40 84)">${wordmark}</g>`);
  else {
    const x = mark ? 114 : 40;
    const nameStyle = { font: fonts.display, size: nameSize };
    if (x + glyphs.measure(name, nameStyle) > right) fail(`name "${name}" does not fit the panel at ${nameSize}px: lower nameSize, or draw it yourself as a wordmark in the box x 40-476, y 84-150`);
    if (mark) out.push(`<g transform="translate(40 84)">${mark}</g>`);
    out.push(glyphs.text(name, { ...nameStyle, x, y: 137, fill: theme.text }));
  }

  if (underline) {
    const at = headline.indexOf(underline);
    if (at < 0) fail(`underline "${underline}" is not in the headline`);
    const x = 40 + glyphs.measure(headline.slice(0, at), hl);
    const w = glyphs.measure(underline, hl);
    out.push(`<rect class="hl" x="${x.toFixed(1)}" y="198" width="${w.toFixed(1)}" height="5" rx="2.5" fill="${theme.accent}"/>`);
  }
  out.push(glyphs.text(headline, { ...hl, x: 40, y: 192, fill: theme.text }));

  if (sub) {
    const style = { font: fonts.sans, size: 17.5 };
    if (40 + glyphs.measure(sub, style) > right) fail(`sub-line "${sub}" does not fit the panel on one line: a card carries no paragraph`);
    out.push(glyphs.text(sub, { ...style, x: 40, y: 234, fill: theme.soft || theme.muted }));
  }

  let cx = 40;
  for (const chip of chips) {
    const w = glyphs.measure(chip, { font: fonts.mono, size: 12, tracking: 0.1 }) + 26;
    out.push(`<rect x="${cx.toFixed(1)}" y="295.5" width="${w.toFixed(1)}" height="30" rx="15" fill="none" stroke="${theme.text}" stroke-opacity=".38" stroke-width="1.2"/>`);
    out.push(glyphs.text(chip, { font: fonts.mono, size: 12, x: cx + 13, y: 315, fill: theme.text, tracking: 0.1 }));
    cx += w + 10;
  }
  if (cx - 10 > right) fail('the chips do not fit the panel');
  return out.join('');
}

// The underline draws itself once per loop.
const underlineCss = (loop) =>
  `@keyframes hl{0%,6%{transform:scaleX(0)}18%,90%{transform:scaleX(1)}100%{transform:scaleX(0)}}` +
  `.hl{transform-box:fill-box;transform-origin:left center;animation:hl ${loop}s cubic-bezier(.6,0,.2,1) infinite}`;

/**
 * Assemble the file. A card in the shared frame passes `panelSvg` + `stageSvg`; a
 * card with its own layout passes one `body`. `title` is read aloud and doubles as
 * the image's alt text, so it is the full sentence the outlined text cannot give a
 * screen reader. `width`/`height` allow a strip of another size.
 */
function card({ title, css = '', defs = '', panelSvg, stageSvg, body, loop, radius = CARD.radius, width = CARD.w, height = CARD.h }) {
  if (!title) fail('a card needs a title: it is the alt text of the image');
  const content = body || `${stageSvg}${panelSvg}`;
  const hl = content.includes('class="hl"');
  if (hl && !(loop > 0)) fail('pass `loop` (seconds) so the underline shares the card\'s loop');
  const r = radius;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="t">` +
    `<title id="t">${esc(title)}</title>` +
    `<style>${hl ? underlineCss(loop) : ''}${css}@media (prefers-reduced-motion: reduce){*{animation:none!important}}</style>` +
    `<defs>${defs}<clipPath id="card"><rect width="${width}" height="${height}" rx="${r}"/></clipPath></defs>` +
    `<g clip-path="url(#card)">${content}</g>` +
    `<rect x=".5" y=".5" width="${width - 1}" height="${height - 1}" rx="${r - 0.5}" fill="none" stroke="rgba(128,128,128,.35)"/>` +
    '</svg>\n'
  );
}

module.exports = { CARD, panel, card };
