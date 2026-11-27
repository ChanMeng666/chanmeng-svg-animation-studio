# Case cards: pieces that shipped, and what was hard

One card per finished piece worth learning from, grouped by type. Read the cards for
the type you are making before planning; `preset-cookbook.md` says which preset to
fork, these say what made a piece good and what nearly broke it.

**Add a card** when a piece gets a `keep` verdict (`node scripts/history.mjs verdict`),
or when a piece taught something the hard way. The **Hard part** is the point of the
card: what went wrong in a version that looked fine, and the fix. A card with nothing
in Hard part is a catalogue entry; leave it out.

Template:

```markdown
### <slug>: <the signature move in a few words>
- **Signature:** the one move, in a sentence.
- **Structure:** the beats with rough times (setup → action → payoff → return).
- **Technique:** primitives, presets forked, anything built for it.
- **Loop:** how the end joins the start; what the still frame is.
- **Hard part:** what failed in a version that looked fine, and what fixed it.
- **Source:** file or repo, and the verdict (user `keep`, or verifier only).
```

## Covers and banners

### chan-cover: the name catches the light
- **Signature:** a glare gleam sweeps across "Chan Meng" while brand pixel-squares
  drift in the margins and the monkey floats, sways and blinks.
- **Structure:** the copy reveals once, staggered; then everything loops on its own
  clock: gleam sweep, drifting squares, monkey idle, the orange rule's shimmer.
- **Technique:** Caldera tokens; Anton and DM Sans outlined to paths
  (`chanCoverText.js`) so it renders the same inside `<img>`; the monkey + CHAN
  lockup as its own module. Its recipes became `createParticleStagger`,
  `createTextGleamClip`, `createSweep`, `createShimmer` and the `brand-cover` preset.
- **Loop:** no seam to hide: the reveals hold and the ambient loops never line up,
  which is intended (`qa-loop` notes them as other loops). Reduced motion shows the
  finished still: every base state is final.
- **Hard part:** the staggered drift used a `--i` custom property for its delays,
  which does not survive `<img>`. The delays are now baked per class at build time
  (`createParticleStagger`). Rule: verify in `<img>` mode, not only inline.
- **Source:** `lib/presets/chanCover.js`, the frozen reference (fork `brand-cover`).
  In use as the profile README hero.

## Logos and marks

### chan-monkey-live: a frozen mark that changes expression through the seasons
- **Signature:** the monkey mark runs eight emoji-style expressions across four
  seasons, without one byte of the logo's geometry changing.
- **Structure:** a 100 s master clock; 25 s per season, 8.5 s per expression, neutral
  gaps of 2.5 to 3 s; seasonal particles crossing in 10 to 21 s.
- **Technique:** the mark frozen, an overlay layer on top; gate keyframes on one clock
  (the same idea as `lib/timeline.js`); measured geometry, never assumed.
- **Loop:** season gates hand off across the seam; the neutral mark is the base state.
- **Hard part:** six failures, each invisible in the source and caught only when
  rendered (`docs/animating-a-mark.md` section 12). The ones that generalise: the
  first build at 40 s read as busy and became 100 s; a raised brow clipped through the
  face once animated, though it cleared at rest; leaves and petals drawn in an editor
  became asterisks and eggs at logo size.
- **Source:** [chan-meng-logo](https://github.com/ChanMeng666/chan-meng-logo),
  `chan-monkey-live.svg`; playbook in `docs/animating-a-mark.md`. Shipped.

## Product cards

Cards are made with the `chanmeng-svg-product-card` skill; its field guide holds the
thirteen cards and their lessons. The one that changed the studio:

### project-card: the stage types, renders and runs
- **Signature:** an agent is asked for a README card; the checklist fills, and the
  card it describes appears and runs on the stage.
- **Structure:** identity panel fixed; the stage types the request, ticks the steps
  one by one, then renders the card; a 0.4 s dip back to the empty stage closes the
  14 s loop.
- **Technique:** `createGlyphSet` outlined text, `createTimeline` on one loop,
  reuses `createJump`, `createShadowScale`, `createPixelCharacter`, `createPanel`.
- **Loop:** the dip fades the stage to the start state, so the seam is a fade, not a
  cut (`qa-loop` passes it).
- **Hard part:** it used to end on a frame about what ships. Twelve cards were redone
  for carrying prose and closing frames of figures; the stage now ends on its own
  finished state, which is also the still frame.
- **Source:** `lib/presets/projectCard.js`; field guide section 11.

## Loaders, badges, mascots

No cards yet. The presets exist (`dot-loader`, `ripple-loader`, `orbit-spinner`,
`spin-badge`, `bounce-char`, the `claude-*` and `codex-*` mascots) but nothing has
been recorded about what made them work or what failed. The first piece of each type
that earns a `keep` gets the first card.
