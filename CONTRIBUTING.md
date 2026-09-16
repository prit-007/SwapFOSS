# Contributing to SwapFOSS

Thanks for your interest in contributing to SwapFOSS! This document provides guidelines and instructions for contributing.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if applicable

### Suggesting Features

Feature suggestions are welcome! Open an issue with:

- A clear description of the feature
- Why it would be useful to users
- Any implementation ideas you have

### Adding a New Tool

This is the easiest way to contribute! Each tool is a single JSON file.

1. Fork the repository
2. Copy `data/tools/jellyfin.json` as a template
3. Fill in the fields for your tool:
   - `id`: URL-safe identifier (lowercase, no spaces)
   - `name`: Display name
   - `category`: One of `media`, `music`, `dev`, `home`, `messaging`
   - `insteadOf`: What proprietary app it replaces
   - `hook`: One-line pitch
   - `bullets`: Array of 3 key features
   - `details`: Full paragraph description for readers
   - `setup`: How to install/use it
   - `difficulty`: `easy`, `medium`, or `hard`
   - `link`: Project website
   - `repo`: GitHub/repository URL
4. Add the tool's `id` to `data/manifest.json`
5. Submit a pull request

### Adding a New Category

1. Add the category to `data/categories.json` with a label and hex color
2. Use the category key in your tool definitions

### Code Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Test locally (`npm install && npm run serve`)
5. Commit with a clear message
6. Push to your fork
7. Open a pull request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/swapfoss.git
cd swapfoss

# Install dependencies
npm install

# Start dev server
npm run serve
```

Open `http://localhost:3000` in your browser.

### Project Structure

```
data/
  tools/<id>.json      # One file per tool (source of truth)
  categories.json      # Category labels + colors
  manifest.json        # List of tool IDs to load
  posts/<id>.json      # Carousel post definitions

index.html             # Main site
card.html              # Single card PNG export
slide.html             # Carousel slide renderer

css/styles.css         # All styles
js/data-loader.js      # Main site logic
js/card-export.js      # Card export logic
js/slide.js            # Slide renderer logic

scripts/generate-carousel.mjs  # Playwright batch screenshot tool
```

## Code Style

- Vanilla JavaScript (no frameworks)
- CSS custom properties for theming
- Semantic HTML
- No build step required

## Pull Request Guidelines

- Keep PRs focused on one change
- Update documentation if needed
- Test your changes locally
- Write a clear PR description

## License

By contributing, you agree that your contributions will be licensed under the GPL-3.0 License.
