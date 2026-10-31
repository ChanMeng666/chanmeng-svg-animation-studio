// project-card — a 1300×360 README card: an identity panel on the left, and a
// stage on the right where the product does its job. The product here is the
// chanmeng-svg-product-card skill: a request is typed, the skill reads the
// product, builds and passes its gates, and the card lands in a README and plays.
//
// The method is that skill, and its guide is
// skills/chanmeng-svg-product-card/references/field-guide.md:
//   - text is shared glyph outlines (lib/text.js), so it survives <img>;
//   - everything is scheduled on one loop (lib/timeline.js);
//   - the finished stage is the base state, so reduced motion rests on it;
//   - the stage shows the work and says nothing about it: no closing frame.
// Fork it, then replace the copy, the palette and the stage. Draw a real product
// in that product's own fonts and colours, not in these.

const path = require('path');
const motion = require('../primitives/motion');
const shapes = require('../primitives/shapes');
const { composeSVG } = require('../composer');
const { composeScene, layer } = require('../scene');
const { getPalette } = require('../palettes');
const { createGlyphSet } = require('../text');
const { createTimeline } = require('../timeline');

const FONT_DIR = path.join(__dirname, '..', '..', 'assets', 'fonts');
const FONTS = {
  display: path.join(FONT_DIR, 'Anton-Regular.ttf'),
  sans: path.join(FONT_DIR, 'DMSans-Medium.ttf'),
  mono: path.join(FONT_DIR, 'JetBrainsMono-Regular.ttf'),
};

const W = 1300;
const H = 360;
const PANEL = 500;

const PROMPT = '> make a README card for my repo';
// The skill's own steps, in its own order (skills/chanmeng-svg-product-card/SKILL.md).
const STEPS = [
  'read tokens, fonts, wordmark',
  'stage: the product at work',
  'wrote cards/my-product.svg',
  'check-card passed',
  'capture-frames passed',
];

module.exports = {
  name: 'project-card',
  category: 'card',
  viewBox: `0 0 ${W} ${H}`,
  width: W,
  height: H,
  compose(opts = {}) {
    motion.resetIdCounter();
    const pal = getPalette(opts.palette || 'caldera');
    const copy = {
      eyebrow: 'AGENT SKILL · README CARDS',
      name: 'Animation Studio',
      headline: 'Your repo in. A moving card out.',
      sub: 'One SVG that plays inside a README.',
      chips: ['MIT', 'NO GIF', 'NO SCRIPT'],
      ...opts.copy,
    };
    const glyphs = createGlyphSet(FONTS);
    const tl = createTimeline({ duration: 14 });
    const STEP_AT = 2.4;
    const STEP_GAP = 0.95;
    const LAND_AT = STEP_AT + STEPS.length * STEP_GAP + 0.1;

    // ── identity panel ───────────────────────────────────────────────────────
    const onPanel = pal.dark ? pal.bg : pal.bgAlt;
    const identity = [
      `<rect width="${PANEL}" height="${H}" fill="${pal.ink}"/>`,
      glyphs.text(copy.eyebrow, { font: 'mono', size: 12.5, x: 40, y: 52, fill: onPanel, tracking: 0.16, attrs: 'opacity=".62"' }),
      shapes.createAccentSquare({ x: 40, y: 92, size: 44, fill: pal.accents[0] }),
      glyphs.text(copy.name, { font: 'display', size: 52, x: 100, y: 134, fill: onPanel }),
      glyphs.text(copy.headline, { font: 'sans', size: 24, x: 40, y: 192, fill: onPanel }),
      glyphs.text(copy.sub, { font: 'sans', size: 16.5, x: 40, y: 224, fill: onPanel, attrs: 'opacity=".72"' }),
    ];
    let chipX = 40;
    for (const chip of copy.chips) {
      const w = glyphs.measure(chip, { font: 'mono', size: 12, tracking: 0.1 }) + 26;
      identity.push(shapes.createPanel({ x: chipX, y: 295.5, w, h: 30, rx: 15, stroke: onPanel, strokeWidth: 1.2 }).replace('/>', ' stroke-opacity=".4"/>'));
      identity.push(glyphs.text(chip, { font: 'mono', size: 12, x: chipX + 13, y: 315, fill: onPanel, tracking: 0.1 }));
      chipX += w + 10;
    }

    // ── the agent's terminal: a request, then the skill's steps ──────────────
    const E = { x: PANEL + 24, y: 28, w: 340, h: 304, head: 30 };
    const SIZE = 12;
    const codeX = E.x + 20;
    const promptY = E.y + E.head + 34;
    const typed = tl.cover({ start: 0.5, chars: PROMPT.length, width: E.w, cps: 24 });
    const steps = STEPS.map((step, i) => {
      const y = promptY + 40 + i * 34;
      const check =
        `<circle cx="${codeX + 8}" cy="${y - 4}" r="8" fill="${pal.accents[0]}"/>` +
        `<path d="M${codeX + 4.4} ${y - 4}l2.7 2.7 4.7-5.4" fill="none" stroke="${pal.bgAlt}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
      return `<g ${tl.on(STEP_AT + i * STEP_GAP, { fade: 0.25 }).attrs}>${check}${glyphs.text(step, { font: 'mono', size: SIZE, x: codeX + 26, y, fill: pal.ink })}</g>`;
    });
    const terminal = [
      shapes.createPanel({ x: E.x, y: E.y, w: E.w, h: E.h, rx: 12, fill: pal.bgAlt, stroke: pal.line, strokeWidth: 1 }).replace('/>', ' stroke-opacity=".18"/>'),
      shapes.createAccentSquare({ x: E.x + 14, y: E.y + 11, size: 8, fill: pal.accents[1] }),
      glyphs.text('your agent', { font: 'mono', size: 11, x: E.x + 30, y: E.y + 19.5, fill: pal.muted }),
      `<g clip-path="url(#pc-editor)">`,
      glyphs.text(PROMPT, { font: 'mono', size: SIZE, x: codeX, y: promptY, fill: pal.accents[1] }),
      `<rect class="${typed}" x="${codeX - 1}" y="${promptY - 15}" width="${E.w}" height="22" fill="${pal.bgAlt}"/>`,
      steps.join(''),
      '</g>',
    ];

    // ── the README it lands in, and the small card playing there ─────────────
    const F = { x: E.x + E.w + 16, y: 28, w: W - (E.x + E.w + 16) - 24, h: 304, head: 30 };
    const bar = (x, y, w, h = 8, fill = pal.line, o = 0.12) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" fill-opacity="${o}"/>`;
    const M = { x: F.x + 18, y: F.y + F.head + 52, w: F.w - 36 };
    M.h = Math.round((M.w * H) / W);
    M.panel = Math.round((M.w * PANEL) / W);
    const jump = motion.createJump({ duration: '0.62s' });
    const shadow = motion.createShadowScale({ duration: '0.62s' });
    const hero = `${shapes.createGroundShadow({ cx: 50, cy: 82, rx: 22, ry: 5, applyClass: shadow.className })}${shapes.createPixelCharacter({ color: pal.accents[0], applyClasses: { body: jump.className } })}`;
    const heroScale = 0.74;
    const mini =
      `<g clip-path="url(#pc-mini)">` +
      `<rect x="${M.x}" y="${M.y}" width="${M.w}" height="${M.h}" fill="${pal.bg}"/>` +
      `<rect x="${M.x}" y="${M.y}" width="${M.panel}" height="${M.h}" fill="${pal.ink}"/>` +
      bar(M.x + 12, M.y + 18, M.panel - 40, 14, pal.bgAlt, 1) +
      bar(M.x + 12, M.y + 42, M.panel - 28, 6, pal.bgAlt, 0.7) +
      bar(M.x + 12, M.y + 54, M.panel - 46, 6, pal.bgAlt, 0.4) +
      bar(M.x + 12, M.y + M.h - 18, 34, 8, pal.accents[0], 1) +
      `<g transform="translate(${M.x + M.panel + (M.w - M.panel) / 2 - 50 * heroScale} ${M.y + (M.h - 100 * heroScale) / 2}) scale(${heroScale})">${hero}</g>` +
      `</g>`;
    const frame = [
      shapes.createPanel({ x: F.x, y: F.y, w: F.w, h: F.h, rx: 12, fill: pal.bgAlt, stroke: pal.line, strokeWidth: 1 }).replace('/>', ' stroke-opacity=".18"/>'),
      glyphs.text('README.md', { font: 'mono', size: 11, x: F.x + 16, y: F.y + 19.5, fill: pal.muted }),
      `<path d="M${F.x} ${F.y + F.head}h${F.w}" stroke="${pal.line}" stroke-opacity=".18"/>`,
      glyphs.text('my-product', { font: 'sans', size: 19, x: F.x + 18, y: F.y + F.head + 32, fill: pal.ink }),
      `<rect x="${M.x}" y="${M.y}" width="${M.w}" height="${M.h}" rx="5" fill="${pal.line}" fill-opacity=".06"/>`,
      `<g ${tl.on(LAND_AT, { fade: 0.35 }).attrs}>${mini}</g>`,
      bar(M.x, M.y + M.h + 18, M.w),
      bar(M.x, M.y + M.h + 34, M.w - 40),
      bar(M.x, M.y + M.h + 50, M.w - 90),
    ];

    const dip = tl.dip();
    const scene = composeScene({
      layers: [
        layer(`<rect x="${PANEL}" width="${W - PANEL}" height="${H}" fill="${pal.bg}"/>`),
        layer(`<g class="${dip}">${terminal.join('')}${frame.join('')}</g>`),
        layer(identity.join('')),
      ],
      defs: `${glyphs.defs()}\n<clipPath id="pc-editor"><rect x="${E.x + 1}" y="${E.y + E.head}" width="${E.w - 2}" height="${E.h - E.head - 1}"/></clipPath>\n<clipPath id="pc-mini"><rect x="${M.x}" y="${M.y}" width="${M.w}" height="${M.h}" rx="5"/></clipPath>\n<clipPath id="pc-card"><rect width="${W}" height="${H}" rx="20"/></clipPath>`,
      style: [jump.css, shadow.css, tl.css()].join('\n'),
    });

    return composeSVG({
      viewBox: this.viewBox, width: this.width, height: this.height,
      title: `${copy.name}: ${copy.headline} ${copy.sub} An agent is asked for a README card, reads the product, builds it and passes its checks, and the card lands in a README and plays.`,
      desc: 'A README project card. Left: an identity panel. Right: a request for a README card is typed to a coding agent, five steps tick off as the skill reads the product, writes the card and passes its two checks, and the finished card lands in a README and plays.',
      style: scene.style, defs: scene.defs,
      body: `<g clip-path="url(#pc-card)">\n${scene.body}\n</g>`,
    });
  },
};
