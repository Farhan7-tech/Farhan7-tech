# Profile design generator

Every image on the profile README (hero, buttons, section headings, project cards, toolkit marquee, footer) is produced by [`build.js`](./build.js). Don't hand-edit the SVGs in `../assets`. Change `build.js` and rebuild.

## Rebuild

```bash
cd design
npm install
npm run build
```

This writes all 23 SVGs into `../assets`. Commit the changed files and the profile updates within a few minutes. GitHub caches images for about 5 minutes.

## Common edits

| To change... | Look in `build.js` for... |
| --- | --- |
| Hero headline, subtitle, meta row | `function hero()` |
| The "598 tests" numbers | `function cardNumbers()` and the back card in `hero()` |
| A project's title, tagline, description or tags | `cardYusr()`, `cardSnapbuy()`, `cardSkylink()`, `cardEmail()` |
| The "Also in the lab" list | `const rows` in `cardLab()` |
| Toolkit pills | `rowA` and `rowB` in `toolkit()` |
| Section headings | the `heading(...)` calls at the bottom |
| Buttons | the `button(...)` calls at the bottom (links live in `../README.md`) |

## Design system

- **Palette:** YUSR AI brand. Terracotta `#D85A30` accent, cream `#F4EEE2` ink, `#070605` base.
- **Type:** Geist (sans), Geist Mono (labels), Instrument Serif italic (accent words). Subsets of each font are embedded in every SVG, so they render the same for every visitor.
- **Surfaces:** double-bezel glass cards (outer tray, inner core, top highlight), soft drifting glow orbs, film grain.
- **Motion:** staggered fade-up entries using `cubic-bezier(0.32, 0.72, 0, 1)`. Motion switches off when the visitor prefers reduced motion.
- **Themes:** headings and buttons ship `-light` and `-dark` variants, chosen with `<picture>`. Cards and slabs are dark in both themes.
- **Grid:** bento cards share one height (452) and use widths in 12-column units (800/400, 500/700, 700/500), so the rows line up in the README.
