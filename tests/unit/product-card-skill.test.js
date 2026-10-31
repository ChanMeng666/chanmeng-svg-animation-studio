import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const skill = join(root, 'skills', 'chanmeng-svg-product-card');
const fonts = join(root, 'assets', 'fonts');
const kit = require(join(skill, 'kit', 'index.cjs'));
const node = (...args) => execFileSync(process.execPath, args, { encoding: 'utf8', stdio: 'pipe' });

const glyphs = () => kit.createGlyphSet({
  display: join(fonts, 'Anton-Regular.ttf'),
  sans: join(fonts, 'DMSans-Medium.ttf'),
  sansBold: join(fonts, 'DMSans-Medium.ttf'),
  mono: join(fonts, 'JetBrainsMono-Regular.ttf'),
});
const theme = { panel: '#111', text: '#fff', muted: '#999', accent: '#06f' };
const copy = { theme, eyebrow: 'ONE TWO', name: 'Name', headline: 'A short headline.' };

describe('packaging', () => {
  it('declares a plugin and a marketplace that point at the skills folder', () => {
    const plugin = JSON.parse(readFileSync(join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
    const market = JSON.parse(readFileSync(join(root, '.claude-plugin', 'marketplace.json'), 'utf8'));
    expect(plugin.name).toBe('chanmeng-svg-animation-studio');
    expect(plugin.skills).toBe('./skills/');
    expect(market.plugins[0].name).toBe(plugin.name);
    expect(plugin.version).toBe(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version);
  });

  it('names the skill after its folder, with a description within the limit', () => {
    const md = readFileSync(join(skill, 'SKILL.md'), 'utf8');
    expect(md).toMatch(/^---\nname: chanmeng-svg-product-card\n/);
    const description = md.match(/description: >-\n([\s\S]*?)\n---/)[1].replace(/\s+/g, ' ').trim();
    expect(description.length).toBeLessThanOrEqual(1024);
  });

  it('points only at files the skill ships', () => {
    const md = readFileSync(join(skill, 'SKILL.md'), 'utf8') + readFileSync(join(skill, 'references', 'field-guide.md'), 'utf8');
    for (const [, rel] of md.matchAll(/`((?:references|kit|scripts|assets)\/[\w.-]+\.\w+)`/g)) expect(existsSync(join(skill, rel)), rel).toBe(true);
  });

  it('carries no path from outside the skill into the kit', () => {
    for (const file of readdirSync(join(skill, 'kit'))) {
      const src = readFileSync(join(skill, 'kit', file), 'utf8');
      expect(src, file).not.toMatch(/\.\.\/\.\.\/|lib\/presets|D:[\\/]/);
    }
  });

  it('keeps the studio paths working through shims', () => {
    expect(require(join(root, 'lib', 'text.js')).createGlyphSet).toBe(kit.createGlyphSet);
    expect(require(join(root, 'lib', 'timeline.js')).createTimeline).toBe(kit.createTimeline);
    expect(require(join(root, 'lib', 'media.js')).filmStrip).toBe(kit.filmStrip);
  });
});

describe('panel refuses what a card must not carry', () => {
  it('more than four eyebrow words', () => {
    expect(() => kit.panel(glyphs(), { ...copy, eyebrow: 'ONE TWO THREE FOUR FIVE' })).toThrow(/four words/);
  });
  it('more than three chips', () => {
    expect(() => kit.panel(glyphs(), { ...copy, chips: ['A', 'B', 'C', 'D'] })).toThrow(/three chips/);
  });
  it('a sub-line that would need to wrap', () => {
    expect(() => kit.panel(glyphs(), { ...copy, sub: 'A sentence long enough that it is really a paragraph about the project and not a line.' })).toThrow(/paragraph/);
  });
  it('no identity at all, or no theme', () => {
    expect(() => kit.panel(glyphs(), { ...copy, name: undefined })).toThrow(/wordmark or a name/);
    expect(() => kit.panel(glyphs(), { ...copy, theme: undefined })).toThrow(/theme/);
  });
  it('uses the wordmark instead of a typed name', () => {
    const out = kit.panel(glyphs(), { ...copy, wordmark: '<path id="wm" d="M0 0"/>' });
    expect(out).toContain('id="wm"');
  });
  it('a card with no title, and an underline with no loop', () => {
    expect(() => kit.card({ body: '<g/>' })).toThrow(/title/);
    expect(() => kit.card({ title: 't', body: '<rect class="hl"/>' })).toThrow(/loop/);
  });
});

describe('kit additions from the first blind run', () => {
  it('refuses a name too long for the panel, and accepts it at a lower nameSize', () => {
    const long = { ...copy, name: 'A Rather Long Product Name Indeed' };
    expect(() => kit.panel(glyphs(), long)).toThrow(/does not fit/);
    expect(() => kit.panel(glyphs(), { ...long, nameSize: 24 })).not.toThrow();
  });
  it('swaps one value for another, leaving the new one in the still frame', () => {
    const { before, after } = kit.createTimeline({ duration: 10 }).swap(4);
    expect(before.attrs).toContain('opacity="0"');
    expect(after.attrs).not.toContain('opacity="0"');
  });
  it('dips at the end of the loop', () => {
    const tl = kit.createTimeline({ duration: 10 });
    tl.dip();
    expect(tl.css()).toMatch(/96\.000%\{opacity:1\}100%\{opacity:0\}/);
  });
  it('types to a set end time', () => {
    const tl = kit.createTimeline({ duration: 10 });
    tl.cover({ start: 1, end: 3, chars: 8, width: 100 });
    expect(tl.css()).toContain('30.000%,100%{transform:translateX(100px)}');
  });
  it('lays out a font when opentype.js cannot shape it', () => {
    const g = glyphs();
    const f = g.font('sans');
    f.stringToGlyphs = () => { throw new Error('substitutionType not supported'); };
    expect(g.text('abc', { font: 'sans', size: 10 }).match(/<use /g)).toHaveLength(3);
  });
});

describe('check-card', () => {
  let checkSvg;
  beforeAll(async () => {
    ({ checkSvg } = await import(pathToFileURL(join(skill, 'kit', 'check-card.mjs')).href));
  });
  const good = (over = {}) => kit.card({
    title: 'A card',
    css: '@keyframes a{0%{opacity:0}100%{opacity:1}}.a{animation:a 10s linear infinite}',
    defs: '<path id="p" d="M0 0"/>',
    body: '<use class="a" href="#p"/>',
    ...over,
  });
  const errors = (svg) => checkSvg(svg).errors.join(' | ');

  it('passes a clean card', () => expect(checkSvg(good()).errors).toEqual([]));
  it('accepts a shorthand whose names come from animation-name', () => {
    const svg = good({ css: '@keyframes a{0%{opacity:0}}[class]{animation:30s linear infinite}.a{animation-name:a}' });
    expect(checkSvg(svg).errors).toEqual([]);
  });
  it('ignores base64 that happens to look like markup', () => {
    const svg = good({ body: '<use class="a" href="#p"/><image href="data:image/jpeg;base64,PHNjcmlwdD4=<script"/>' });
    expect(errors(svg)).not.toMatch(/script/);
  });
  it.each([
    ['<script>', { body: '<script>1</script>' }, /script/],
    ['live text', { body: '<text>x</text>' }, /<text>/],
    ['foreignObject', { body: '<foreignObject/>' }, /foreignObject/],
    ['an external image', { body: '<image href="https://x.test/a.png"/>' }, /external/],
    ['a missing id', { body: '<use class="a" href="#nope"/>' }, /missing id/],
    ['a web font', { css: '@font-face{font-family:x}' }, /font/],
  ])('rejects %s', (_, over, re) => expect(errors(good(over))).toMatch(re));
  it('rejects a duplicate id', () => {
    expect(errors(good({ defs: '<path id="p" d="M0 0"/><path id="p" d="M1 1"/>' }))).toMatch(/duplicate/);
  });
  it('rejects a missing reduced-motion rule and a missing title', () => {
    expect(errors(good().replace(/@media[^}]*\}\}/, ''))).toMatch(/reduced/);
    expect(errors(good().replace(/<title[^>]*>[^<]*<\/title>/, ''))).toMatch(/title/);
  });
  it('warns on a positive delay and on two long loops, not on a short cycle', () => {
    const warn = (css) => checkSvg(good({ css })).warnings.join(' | ');
    expect(warn('@keyframes a{0%{opacity:0}}.a{animation:a 10s infinite;animation-delay:2s}')).toMatch(/blank first cycle/);
    expect(warn('@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}.a{animation:a 10s infinite}.b{animation:b 12s infinite}')).toMatch(/long loops/);
    expect(warn('@keyframes a{0%{opacity:0}}@keyframes b{0%{opacity:0}}.a{animation:a 10s infinite}.b{animation:b .7s infinite}')).not.toMatch(/loop/);
  });
});

describe('a project built from the skill', () => {
  const dir = join(root, 'output', '.init-test');
  const cards = join(dir, 'cards');
  beforeAll(() => {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    node(join(skill, 'scripts', 'init-kit.mjs'), `--dest=${cards}`, '--id=demo');
    const f = join(cards, 'fonts');
    copyFileSync(join(fonts, 'Anton-Regular.ttf'), join(f, 'display.ttf'));
    copyFileSync(join(fonts, 'DMSans-Medium.ttf'), join(f, 'sans.ttf'));
    copyFileSync(join(fonts, 'DMSans-Medium.ttf'), join(f, 'sansBold.ttf'));
    copyFileSync(join(fonts, 'JetBrainsMono-Regular.ttf'), join(f, 'mono.ttf'));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('builds a card from the template that passes the gate', () => {
    const out = join(cards, 'demo.svg');
    node(join(cards, 'demo.mjs'), out);
    expect(node(join(cards, 'lib', 'check-card.mjs'), out)).toMatch(/^✓ demo\.svg/);
  });

  it('builds byte-identical cards from the same source', () => {
    const a = join(cards, 'a.svg');
    const b = join(cards, 'b.svg');
    node(join(cards, 'demo.mjs'), a);
    node(join(cards, 'demo.mjs'), b);
    expect(readFileSync(a, 'utf8')).toBe(readFileSync(b, 'utf8'));
  });

  it('leaves an edited builder alone, and an edited kit file unless forced', () => {
    const builder = join(cards, 'demo.mjs');
    const kitFile = join(cards, 'lib', 'shell.cjs');
    const original = readFileSync(kitFile, 'utf8');
    writeFileSync(builder, '// edited');
    writeFileSync(kitFile, '// edited');
    expect(() => node(join(skill, 'scripts', 'init-kit.mjs'), `--dest=${cards}`, '--id=demo')).toThrow();
    expect(readFileSync(builder, 'utf8')).toBe('// edited');
    expect(readFileSync(kitFile, 'utf8')).toBe('// edited');
    node(join(skill, 'scripts', 'init-kit.mjs'), `--dest=${cards}`, '--force');
    expect(readFileSync(kitFile, 'utf8')).toBe(original);
  });
});
