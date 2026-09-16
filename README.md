# SwapFOSS

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-brightgreen.svg)](CONTRIBUTING.md)

Free, open-source alternatives to the apps everyone already uses — one swap at a time.

A static site (GitHub Pages, no build step) + a card generator for turning each
tool into a shareable LinkedIn/Instagram graphic.

## Structure

```
data/
  categories.json        category labels + colors
  tools/<id>.json         one file per tool — the source of truth
  posts/<id>.json         a "post" groups tools into a carousel (default: 3 + intro + outro)
  manifest.json           list of tool ids the site should load

index.html                main site — browse all tools by category
card.html                 export ONE tool as a single PNG card (client-side, html-to-image)
slide.html + js/slide.js  renders intro/tool/outro slides for the batch carousel script

scripts/generate-carousel.mjs   Playwright script — screenshots a full carousel (intro + N tools + outro)
```

## Adding a new tool

1. Copy `data/tools/jellyfin.json`, rename it, fill in the fields.
2. Add its `id` to `data/manifest.json`.
3. Drop a logo/screenshot into `assets/` (optional, referenced by path in the tool file).

That's it — no code changes needed. It shows up on the site automatically.

## Adding a new carousel post

1. Copy `data/posts/post-001.json`, rename it, pick 3 (or more) tool ids.
2. Run the carousel generator (see below) to get numbered PNGs ready to upload.

## Running locally

```bash
npm install
npm run serve        # serves the site at http://localhost:3000
```

Open `index.html` via that server (not `file://`) since the page fetches
JSON data files.

## Generating a carousel (batch, production quality)

```bash
npm install
npx playwright install chromium
npm run serve &                       # keep the server running
npm run carousel -- post-001          # screenshots data/posts/post-001.json
```

PNGs land in `output/post-001/` — `01-intro.png`, `02-jellyfin.png`,
`03-streamio.png`, `04-metrolist.png`, `05-outro.png` — ready to upload as a
LinkedIn or Instagram carousel, in order.

## Quick single-card export (no install needed)

Open `card.html?tool=jellyfin` in a browser (on the deployed site or local
server) and hit "Download PNG" — this is the fast path for a one-off card,
no Node/Playwright required.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the GNU General Public License v3.0 — see the [LICENSE](LICENSE) file for details.
