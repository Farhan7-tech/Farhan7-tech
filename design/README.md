# Profile design generator

Every image on the profile README (hero, buttons, section headings, project cards, toolkit marquee, footer) and the banner and footer on every public repo's README are produced by [`build.js`](./build.js). Don't hand-edit the SVGs. Change `build.js` and rebuild.

## Rebuild

```bash
cd design
npm install
npm run build                      # profile images -> ../assets
node build.js --repos ./repos-out  # banner.svg + footer.svg for every public repo
node build.js --now ./now-out      # the "Now" card (needs GITHUB_TOKEN for higher rate limits)
node build.js --counter            # font subset for ../counter (the profile views Worker)
```

`npm run build` writes all 23 profile SVGs into `../assets`. Commit them, and the profile updates within a few minutes. GitHub caches images for about 5 minutes.

`--repos` writes `<repo>/banner.svg` and `<repo>/footer.svg`. Each repo keeps its copies in `.github/assets/`, so copy them there and commit in that repo.

The `Profile assets` workflow (`.github/workflows/profile-assets.yml`) runs every 6 hours. It rebuilds `now.svg` from your public events feed, plus the 3D contribution graph and the snake, and publishes them to the `output` branch. The events feed only covers public repos, so private work never appears.

## Common edits

| To change... | Look in `build.js` for... |
| --- | --- |
| Hero headline, subtitle, meta row | `function hero()` |
| The "598 tests" numbers | `function cardNumbers()` and the back card in `hero()` |
| A project card's copy or tags | `cardYusr()`, `cardSnapbuy()`, `cardSkylink()`, `cardEmail()` |
| The "Also in the lab" list | `rows` in `cardLab()` |
| Toolkit pills | `rowA` and `rowB` in `toolkit()` |
| Section headings | the `heading(...)` calls at the bottom |
| Buttons | the `button(...)` calls at the bottom (links live in `../README.md`) |
| A repo banner (title, tagline, tags, visual) | the `REPOS` list |
| A theme's colours | the `THEMES` object |

## Design system

- **Themes:** every project owns a theme in `THEMES`.
  - `personal` (emerald/violet): hero frame, headings, toolkit, footer, numbers.
  - `yusr` (terracotta `#D85A30`, cream `#F4EEE2`, base `#070605`): only YUSR AI content, meaning the YUSR card, the YUSR button, the CI cards in the hero and the YUSR-WEBSITE repo.
  - `snapbuy`: receipt paper with a lime marker.
  - `skylink`: night sky with stars.
  - `holo`: holographic, for the AI Email Assistant.
  - `phosphor`: CRT terminal, for the lab card.
  - `challenge`: cobalt.
  - `diary`: warm paper.
  - `java`: espresso with Java orange, for the Prodigy tasks.
- **Visuals:** `vis*` functions draw each project's animated illustration. Cards and repo banners both use them.
  - receipt printer with a PAID stamp
  - orbit transfer with a rolling code
  - request pipeline
  - self-typing email
  - CRT listing
  - month grid
  - notebook
  - thermometer
  - guessing pointer
  - contact stack
  - sudoku solve
- **Type:** Geist (sans), Geist Mono (labels), Instrument Serif italic (accent words). Subsets of each font are embedded in every SVG, so they render the same for every visitor.
- **Surfaces:** double-bezel cards (outer tray, inner core, top highlight), soft drifting glow orbs, film grain. Paper themes get a soft shadow instead of glow.
- **Motion:** staggered fade-up entries using `cubic-bezier(0.32, 0.72, 0, 1)`, odometer digits, and SMIL reveals that stay hidden until they start. Motion switches off when the visitor prefers reduced motion.
- **Page themes:** profile headings and buttons ship `-light` and `-dark` variants, chosen with `<picture>`. Cards, slabs and banners carry their own surface in both modes.
- **Grid:** bento cards share one height (452) and use widths in 12-column units (800/400, 500/700, 700/500), so the rows line up in the README.
