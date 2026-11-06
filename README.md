<a href="https://chanmeng666.github.io/chanmeng-svg-animation-studio/"><img src="./docs/preview/project-card.svg" width="100%" alt="Animation Studio: your repo in, a moving card out. A coding agent is asked for a README card, reads the product, builds it and passes its checks, and the card lands in a README and plays."></a>

**An agent skill that turns your project into an animated promo card for your README.** Not a GIF and not a screen recording: one SVG file where your product's real interface runs, sharp at any width.

<p>
<a href="https://chanmeng666.github.io/chanmeng-svg-animation-studio/"><img src="./docs/pills/pill-see-the-cards.svg" height="40" alt="See the cards"></a> <a href="#install"><img src="./docs/pills/pill-install.svg" height="40" alt="Install"></a>
</p>

## Cards it makes

Each of these is live on [a real GitHub profile](https://github.com/ChanMeng666), made with the method and kit this skill ships.

<a href="https://github.com/ChanMeng666/archlang"><img src="https://chanmeng666.github.io/ChanMeng666/public/cards/archlang.svg" width="100%" alt="ArchLang: source is typed and a floor plan compiles beside it."></a>

<a href="https://github.com/ChanMeng666/echook"><img src="https://chanmeng666.github.io/ChanMeng666/public/cards/echook.svg" width="100%" alt="echook: a terminal session whose events raise a sound, a desktop toast and a phone notification."></a>

<a href="https://github.com/ChanMeng666/a11y-loop"><img src="https://chanmeng666.github.io/ChanMeng666/public/cards/a11y-loop.svg" width="100%" alt="a11y-loop: a coding agent writes a page, audits it across five passes, fixes it and audits again."></a>

## Install

**Any agent** (Claude Code, Cursor, Codex, GitHub Copilot and more), with the skills CLI. Listed on [skills.sh](https://skills.sh/chanmeng666):

```bash
npx skills add ChanMeng666/chanmeng-svg-animation-studio
```

**Claude Code plugin:**

```
/plugin marketplace add ChanMeng666/chanmeng-svg-animation-studio
/plugin install chanmeng-svg-animation-studio@chanmeng-svg-animation-studio
```

Then, in your project:

```
Make an animated README card for this repo.
```

Using another coding agent? Point it at [`SKILL.md`](./skills/chanmeng-svg-product-card/SKILL.md): the kit is plain Node.

## What the skill does

```mermaid
flowchart LR
  A["Reads your product:<br/>tokens, fonts, logo, copy"] --> B["Picks what to show<br/>happening on the card"]
  B --> C["Builds the card<br/>from your real source"]
  C --> D["Checks it against<br/>GitHub's image sandbox"]
  D --> E["Captures every scene,<br/>light and dark"]
```

The builder is committed beside the card, so it rebuilds without the skill, and it fails when your product stops matching the picture.

More: [the field guide](./skills/chanmeng-svg-product-card/references/field-guide.md) · [the rest of the studio](./docs/overview.md), including the library behind mascots, logos and loaders.

---

<p>
<a href="https://github.com/ChanMeng666"><img src="./docs/pills/pill-chan-meng.svg" height="40" alt="Chan Meng"></a>
</p>

<sub>[MIT](./LICENSE). Made by Chan Meng. Need a custom build? <a href="mailto:chanmeng.dev@gmail.com">chanmeng.dev@gmail.com</a>.</sub>
