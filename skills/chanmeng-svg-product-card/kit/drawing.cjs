// Helpers for putting a compiler's or a renderer's SVG output on a card: split it
// into layers that can be revealed in beats, and measure what it covers.
// Method: references/field-guide.md §6.5 and §6.6.

/**
 * Split an SVG into its top-level layer groups. Every id is prefixed so several
 * drawings, or several frames of one, can share a file without colliding. Fails
 * on a nested group rather than splitting one wrongly.
 * @returns {{ defs: string, layers: { id: string|null, body: string, elements: string[] }[] }}
 */
function splitLayers(svg, prefix) {
  const scoped = svg.replace(/\bid="([^"]+)"/g, `id="${prefix}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`);
  const defs = (scoped.match(/<defs>([\s\S]*?)<\/defs>/) || [, ''])[1].trim();
  const layers = [...scoped.matchAll(/<g\b([^>]*)>([\s\S]*?)<\/g>/g)].map(([, attrs, body]) => {
    if (body.includes('<g')) throw new Error('drawing: nested group in the source SVG; flatten it or split it by hand');
    return {
      id: (attrs.match(new RegExp(`\\bid="${prefix}-([^"]+)"`)) || [])[1] || null,
      body,
      elements: [...body.matchAll(/<(\w+)\b[^>]*?(?:\/>|>[^<]*<\/\1>)/g)].map((m) => m[0]),
    };
  });
  return { defs, layers };
}

/** Extent of a drawing in its own units, from the straight geometry of `layers`. */
function extentOf(layers) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const grow = (x, y) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  };
  for (const l of layers) {
    for (const [, pts] of l.body.matchAll(/\bpoints="([^"]+)"/g)) for (const pt of pts.trim().split(/\s+/)) grow(...pt.split(',').map(Number));
    for (const [, d] of l.body.matchAll(/\bd="([^"]+)"/g)) for (const [, x, y] of d.matchAll(/[ML]\s*(-?[\d.]+)[ ,](-?[\d.]+)/g)) grow(Number(x), Number(y));
    for (const [, a, b, c, e] of l.body.matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/g)) {
      grow(Number(a), Number(b));
      grow(Number(c), Number(e));
    }
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

module.exports = { splitLayers, extentOf };
