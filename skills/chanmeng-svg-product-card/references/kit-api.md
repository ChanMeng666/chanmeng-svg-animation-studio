# Kit API

The kit is CommonJS so it works in any project: `import kit from "./lib/index.cjs"`.
Every helper returns a string of SVG unless noted. Times are seconds.

## Text: `createGlyphSet(fonts, { prefix? })`

`fonts` maps a key to a font file path. The result:

| Call | Does |
|---|---|
| `text(str, { font, size, x, y, fill, anchor, tracking, fallback, attrs })` | One run with its baseline at (x, y). `anchor`: `start`, `middle`, `end`. `tracking` is in em |
| `measure(str, { font, size, tracking, fallback })` | Width in px |
| `wrap(str, style, maxWidth)` | Greedy word wrap, returns lines |
| `outlineTextElements(svg, { regular, bold, fallback })` | Rewrites the `<text>` of foreign SVG |
| `defs()` | The glyph paths. Call after every `text()` has run |

`fallback` must share the font's units-per-em. A missing glyph throws.

## Time: `createTimeline({ duration, prefix? })`

Every rule goes on one loop of `duration` seconds, and base states are the finished
frame.

| Call | Does |
|---|---|
| `on(t, { fade, name })` | Shown from `t`. Part of the still frame. Returns `{ className, attrs }` |
| `span(a, b, { fade, name })` | Shown between `a` and `b`. Absent from the still frame |
| `until(t, opts)` | Shown until `t`. Absent from the still frame |
| `swap(t, { fade })` | One value replaced by another. Returns `{ before, after }`, each as above; `after` is in the still frame |
| `dip({ seconds, name })` | Class for a stage that fades at the end of the loop, hiding the restart. Returns the class name |
| `keyframes(frames, { name, timing, base })` | A hand-written rule. `frames` may be `(pct) => string`. Returns the class name |
| `shift(start)` | Inline style running a rule written from t = 0 as if it began at `start`, by a negative delay |
| `cover({ start, chars, width, cps, end, name })` | Class for a rect sliding off a row of text: typing. Give `cps`, or `end` to finish at a set time. Returns the class name |
| `sequence(durations)` | Start times of consecutive scenes; throws past the loop |
| `pct(t)` | Seconds to a keyframe percentage |
| `css()` | All the rules. Call last |

To schedule text, pass the timeline's `attrs` through `text()`, or wrap anything in a
group:

```js
glyphs.text("Saved", { font: "sans", size: 15, x, y, fill, attrs: tl.on(4).attrs });
`<g ${tl.span(2, 6).attrs}>${scene}</g>`;

const { before, after } = tl.swap(7.2);
`<g ${before.attrs}>${light}</g><g ${after.attrs}>${dark}</g>`;
```

## Pictures

| Call | Does |
|---|---|
| `dataUri(fileOrBuffer, mime?)` | A data URI |
| `filmStrip({ id, frames, x, y, width, height, rx, start, seconds, timeline })` | Stepped frames resting on the last. Returns `{ defs, body }` |
| `crossfade({ id, stills, at, x, y, width, height, rx, fade, timeline })` | Stills fading over one another. Returns `{ defs, body }` |

## The frame

| Call | Does |
|---|---|
| `CARD` | `{ w: 1300, h: 360, panel: 500, radius: 20 }` |
| `panel(glyphs, { theme, eyebrow, wordmark, mark, name, nameSize, headline, underline, sub, chips, headlineSize, fonts })` | The identity panel. `theme` is `{ panel, text, muted, soft, accent }` from the product. `wordmark` is an SVG fragment in the box x 40–476, y 84–150; `mark` is a 58 px symbol at (40, 84) beside `name`. Throws past four eyebrow words or three chips, or when the name, headline or sub-line does not fit. Needs the font keys in `fonts` (default `display`, `sans`, `sansBold`, `mono`) |
| `card({ title, css, defs, panelSvg, stageSvg, body, loop, radius, width, height })` | The file. Pass `panelSvg` and `stageSvg`, or one `body` for a layout of its own. `loop` is required when the panel has an underline |

A product with a strong layout of its own should pass `body` and skip `panel()`, but
still hold to the five-things rule.

## Drawings

| Call | Does |
|---|---|
| `splitLayers(svg, prefix)` | Top-level groups of a compiled SVG with every id scoped. Returns `{ defs, layers }` |
| `extentOf(layers)` | `{ x, y, w, h }` of the straight geometry |

## Command line

| Script | Does |
|---|---|
| `check-card.mjs <file.svg> … [--max-kb=619]` | The static sandbox gate. Exit 1 on an error |
| `capture-frames.mjs <file.svg> --at=1,3,5 [--out=dir] [--width=px]` | On `#ffffff` and `#0d1117`: frames at exactly those seconds, plus one through a real `<img>` proving it decodes. Then proves the reduced-motion still does not move. Uses Chrome, Edge, or Playwright's Chromium |
| `film-stills.mjs --in=<video> (--at=t1,t2 \| --from=t --seconds=n --fps=n) [--crop=w:h:x:y] [--size=WxH] [--q=6] [--out=file]` | Stills or a strip as a JSON array of JPEG data URIs. Needs ffmpeg |
