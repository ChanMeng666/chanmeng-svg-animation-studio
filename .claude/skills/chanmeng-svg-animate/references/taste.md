# Taste: what makes a piece good

Read this before planning, every time. The rest of the skill says how to build;
this says what good looks like. Every rule below came from something this studio
shipped, redid or caught, and says where. It is the bar, not the method: you decide
the plan.

Rules from the user's own verdicts go in the last section. They outrank the rest.

## 1. The motion carries something

- A piece earns its place when the motion means something: the mark acts out what
  it already is, the loader shows work happening, the card shows the product doing
  its job. "An animated name with drifting confetti is a business card."
  (product-card field guide, section 1)
- Primary and secondary actions tell **one** story (verify rubric, item 1). One cause
  travels through the piece and each element reacts when it arrives. Many unrelated
  small effects read as a pile, even when each is nice.
- Support stays quieter than the main line: lower amplitude, lower opacity, slower.

## 2. The signature move belongs to this piece

- State it in one sentence before building: the one move people remember.
- It grows from the subject's own nature: a ring is drawn by what orbits it, a stamp
  lands, a terminal types, a cloud puffs. Generic verbs on generic shapes (everything
  fades up from below; everything pulses) are the failure case.
- **Swap test.** Replace the subject with another of the same kind (another logo,
  another product). If the piece still works unchanged, it is too generic.
  (Adopted from lemo-wake's `taste.md`.)
- **Forking is a start, not a result.** Forking the closest preset is how this studio
  stays fast. If the finished piece is that preset recoloured, it is a variant: say
  so to the user, or push it until it passes the swap test.

## 3. Time

- **Stagger everything.** Identical durations on sibling elements are the clearest
  tell that something is machine-made. Sibling offsets of 0.05 to 0.15 s
  (animating-a-mark section 14; animation-principles, Staggering).
- Long-loop marks: an expression needs 6 to 10 s to be read; under about 4 s it is a
  flicker. Neutral gaps of 2.5 to 3 s let the mark reassert itself. A 40 s loop read as
  busy and became 100 s. (animating-a-mark section 14)
- Particles crossing the frame in 10 to 20 s read as atmosphere; faster reads as rain.
  Secondary motion of 1.5 to 5 s feels alive; under about 1 s feels jittery. (same)
- Cards: two or three things moving at once, 4 to 6 s a scene, entrances of 0.2 to
  0.45 s, nothing bounces. (product-card SKILL.md, Motion budget)
- Loaders and badges live on short loops; the same numbers do not apply. Their test is
  whether the loop reads as continuous work, not as a twitch.

## 4. The first frame, the still frame and the seam

- The finished frame is the base state. A positive `animation-delay` leaves a blank
  first cycle, and the reduced-motion still shows whatever the base state is.
  (check-card, field guide)
- Choose the still frame on purpose: the one picture you would keep if it could not
  move.
- A loop must not snap: the 100% keyframes equal the 0% ones, or both ends fade to the
  same frame. `scripts/qa-loop.mjs` measures this.
- One-shot entrances are fine on a README (they play once, then the loop runs), but the
  picture at 0 s is what a visitor sees on load. If `qa-loop` warns that it is nearly
  blank, make sure that is a choice.

## 5. Legibility and geometry

- Design shapes at their display size, not zoomed in an editor: maple leaves became
  orange asterisks and petals became eggs at logo scale. (animating-a-mark 12.4)
- Check geometry at the animation's extremes, not at rest: a brow with 2.1 px of
  clearance clipped once it rose 2.5 px. (12.3)
- Check clearance from every neighbour: a sweat drop 1.2 px from an eye fused them into
  one blob. (12.2)
- A prop crossing a silhouette leaves enough of the shape on both sides: earmuffs
  turned a hair curl into antlers. (12.6)
- Rigid things stay rigid: letterforms, logos and devices move whole (translate,
  rotate, scale), they do not wobble.

## 6. Truth to the subject

- Draw in the subject's own design system, not the studio's or the profile's: three
  cards were redone for using the profile's brand. Use the real wordmark file; a typed
  name in a similar font is not the wordmark. (field guide section 11)
- Nothing shown as a fact is invented: a chip made from memory shipped once and was
  removed on checking. (same)
- A piece is not a slide: no paragraph on it, no closing frame of figures. Twelve
  cards were redone for this. (same)

## 7. Variety

- Run `node scripts/history.mjs recent` before planning. If the signature move,
  arc and main motion match the last few pieces, ask whether this subject needs that
  or whether it is habit.

## 8. From the user's verdicts

Each line: the date, the piece, the verdict, and the rule it teaches, in a sentence.
Add one whenever `history.mjs verdict` records a `reject`, or a `keep` or `tweak`
whose reason generalises. When one contradicts a rule above, the verdict wins: rewrite
the rule.

<!-- e.g. - 2026-12-01 · orbit-badge · reject: "looks like every loader" → a badge's move must come from what it badges, not from the badge shape. -->
