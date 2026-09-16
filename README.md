# SwapFOSS

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-brightgreen.svg)](CONTRIBUTING.md)

**Free, open-source alternatives to the apps you already use — one swap at a time.**

A visual directory that helps you find FOSS (Free & Open Source Software) replacements for everyday apps. Browse by category, share cards to social media, or download full post-ready bundles.

---

## What is this?

SwapFOSS is a static website (no build step, runs on GitHub Pages) that:

- **Shows you** free alternatives to apps like Netflix, Spotify, Plex, and more
- **Lets you share** any tool as a beautiful 1080×1350 card (ready for LinkedIn, Instagram, or Twitter)
- **Bundles posts** into downloadable ZIPs with intro + tool cards + outro — ready to upload as a carousel

---

## For everyone

### Browse tools

Visit the [live site](https://prit-007.github.io/SwapFOSS/) and explore tools by category — Media, Music, Dev Tools, Home, and Messaging.

### Share a tool

Click the **Share** button on any card. A share menu pops up — pick WhatsApp, Twitter, LinkedIn, email, or just download the PNG directly.

### Download a full post

Go to the **Batch export** page. Each post bundles an intro card, all tool cards, and an outro card into a single ZIP file. Enter the PIN to download.

### Add a new tool

No coding needed. Just:

1. Copy `data/tools/jellyfin.json` → rename it to your tool name
2. Fill in the fields (name, category, hook, features, setup steps, etc.)
3. Add the tool id to `data/manifest.json`
4. Drop a logo and screenshot into `assets/`

That's it — the site picks it up automatically.

---

## For developers

### Tech stack

| Layer | What |
|-------|------|
| Frontend | Vanilla HTML, CSS, JS — no framework, no build step |
| Styling | CSS custom properties, glassmorphism, responsive grid |
| Fonts | Space Grotesk (display) + IBM Plex Sans (body) |
| Export | [html-to-image](https://github.com/bubkoo/html-to-image) (client-side PNG rendering) |
| ZIP | [JSZip](https://github.com/stuk/jszip) (client-side ZIP bundling) |
| Hosting | GitHub Pages (static, zero config) |

### Project structure

```
index.html                    Main site — browse all tools by category
batch.html                    Batch export — download post bundles with PIN
card.html                     Single card preview — card.html?tool=<id>
slide.html                    Slide preview — slide.html?post=<id>&type=intro|tool|outro

js/
  data-loader.js              Loads tools + categories, renders grid, wires filters + share
  share.js                    Share menu (Web Share API + custom fallback)
  batch-export.js             Batch engine — PIN gate, rendering, ZIP bundling
  card-export.js              Single card export (card.html)
  slide.js                    Slide renderer (slide.html)

css/
  styles.css                  All styles — design tokens, cards, export, batch, share menu

data/
  categories.json             Category labels + colors
  manifest.json               Tool ids the site should load
  posts-manifest.json         Post ids for the batch page
  tools/<id>.json             One file per tool (source of truth)
  posts/<id>.json             Post definitions (intro/outro text + tool list)

assets/
  logos/                      Tool logos (SVG/PNG)
  screenshots/                Tool screenshots (PNG)
```

### Running locally

```bash
# Serve the site (no install needed)
python3 -m http.server 3000
# or
npx serve .
# or
npm run serve

# Then open http://localhost:3000
```

The site fetches JSON data files, so you must open it via a server (not `file://`).

### Adding a tool

1. Create `data/tools/yourtool.json` — copy an existing tool file and fill in the schema:

```json
{
  "id": "yourtool",
  "name": "Your Tool",
  "category": "media",
  "insteadOf": "Netflix / Plex",
  "hook": "Short tagline for the card",
  "bullets": ["Bullet point 1", "Bullet point 2"],
  "features": ["Feature 1", "Feature 2"],
  "setupSteps": ["Step 1", "Step 2"],
  "details": "Longer description for the expandable section",
  "setup": "Self-hosted (needs a server)",
  "difficulty": "easy | medium | hard",
  "link": "https://yourtool.com",
  "repo": "https://github.com/you/yourtool",
  "logo": "assets/logos/yourtool.svg",
  "screenshot": "assets/screenshots/yourtool.png",
  "screenshotType": "landscape | portrait"
}
```

2. Add `"yourtool"` to `data/manifest.json`
3. Drop logo + screenshot into `assets/`

### Adding a carousel post

1. Copy `data/posts/post-001.json` → rename it
2. Set `intro.headline`, `intro.subhead`, `outro.headline`, etc.
3. List your tool ids in the `tools` array
4. The batch page picks it up automatically

### Batch export (PIN: `swapfoss2026`)

The batch page at `batch.html` renders all cards off-screen and bundles them as a ZIP:

- **Export presets:** LinkedIn (1080×1350), Instagram (1080×1080), Twitter/X (1200×675)
- **Light/dark theme toggle** for different platform aesthetics
- **Progress indicator** during rendering
- **Caption generator** auto-builds a post caption from the selected tools
- **Retina quality:** All PNGs captured at 2x pixelRatio

### Single card export

Open `card.html?tool=jellyfin` → click "Download PNG". Quick one-off export, no install needed.

---

## Developer's Paradise

Built by a team that believes in open source:

| Name | Role | GitHub |
|------|------|--------|
| **Prit Vasani** | Builder | [LinkedIn](https://www.linkedin.com/in/prit-vasani007) |
| **Nilay** | AI/ML | [GitHub](https://github.com/NILAY1556) |
| **Rajvi Adesara** | UX | [GitHub](https://github.com/RajviAdesara) |
| **Vivek Khunt** | Game Dev | [GitHub](https://github.com/VivekKhunt) |
| **Bhargav** | Animation | [GitHub](https://github.com/Bhargav-1001) |
| **Meet** | UI | [GitHub](https://github.com/meet2904) |

---

## Contributing

We welcome contributions! You can:

- **Add a tool** — just add a JSON file (see instructions above)
- **Fix a bug** — open an issue or submit a PR
- **Suggest a feature** — open an issue

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

---

## License

This project is licensed under the GNU General Public License v3.0 — see the [LICENSE](LICENSE) file for details.
