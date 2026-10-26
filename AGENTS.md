# AGENTS.md

Shared guidance and primer for AI coding agents and human developers working in this repository.

## Overview

**Horton's Creek League of Extraordinary Cocktails** ([hortonscreekcocktails.com](https://hortonscreekcocktails.com)) is a curated digital cocktail menu, interactive bartender reference, and historical club archive (founded August 2020) designed for private tasting events in the Horton's Creek neighborhood. It features both the active seasonal tasting progression (such as "The Coastal Garrison") and **The League Vault (2020–2025)** housing 48 historical recipes across 11 sessions, complete with photo provenance badges, club lore callouts, and interactive filtering.

The site is hosted as a static website on **GitHub Pages** with a custom domain (`CNAME`).

---

## Architecture & Project Structure

The project is intentionally dependency-free and build-free. There are no bundlers, transpilers, or node dependencies.

```text
.
├── AGENTS.md             # This guide
├── CNAME                 # GitHub Pages custom domain (hortonscreekcocktails.com)
├── index.html            # Complete single-page application (HTML, CSS, JS)
└── assets/               # Menu artwork, monument photo, and cocktail visuals
    ├── hero-coastal-garrison.jpg
    ├── hortons-creek-monument.jpg
    ├── casco-bay-crossing.jpg
    ├── granite-bastion.jpg
    ├── parapet-nightcap.jpg
    └── archive/          # 48 historical cocktail photos & spec plates (2020–2025)
```

### Key Technical Characteristics

- **Single-File Delivery**: All markup, styling, and client-side logic reside in [index.html](file:///Users/broconne/src/cocktails/index.html).
- **Design System & Typography**:
  - Dark-mode palette with maritime and stone-inspired CSS variables (`--bg-abyss`, `--bg-granite`, `--accent-lantern`, `--accent-seafoam`, etc.).
  - Fonts via Google Fonts: `Cormorant Garamond` (display serif), `Plus Jakarta Sans` (body sans-serif), and `JetBrains Mono` (spec/numerical monospace).
- **Modern Semantic HTML & Accessibility**:
  - Native `<dialog>` elements for modals (e.g., QR sharing).
  - ARIA attributes (`aria-pressed`, `aria-expanded`, semantic button states).
  - Responsive layout built with modern CSS Grid and Flexbox.

---

## Interactive Features & Data Model

The client-side JavaScript in `index.html` implements several key interactive features:

1. **Dual Viewing Modes (`Guest` vs. `Bartender`)**:
   - Controlled by the `data-mode` attribute on `<body>` (`guest` or `bartender`).
   - Guest mode presents an elegant presentation menu with narrative notes and hidden technical specs.
   - Bartender mode reveals full build steps, glassware, ice, prep steps, and scaling controls.
   - State is persisted to `localStorage` (`hcc_menu_mode`) and honors the `#bartender` URL hash.
2. **Individual Spec Accordions**:
   - In Guest mode, guests can selectively toggle technical specs for an individual drink via `.toggle-spec-btn` (modifying `data-expanded="true|false"` on `.cocktail-card`).
3. **Dynamic Batch Scaler**:
   - Bartender mode includes batch scaling buttons (1x, 2x, etc.).
   - Quantities are stored in data attributes on `.spec-measure`:
     - `data-oz="<amount>"`: Scaled mathematically and formatted (supports `data-barspoon="true"`).
     - `data-count="<number>"` with `data-unit="dash|drop|leaf|..."`: Scaled with automated pluralization.
4. **QR Code Sharing Modal**:
   - Uses native `<dialog id="qr-dialog">` with backdrop and close handlers.
5. **The League Vault / Archive (`#league-archive`)**:
   - Filterable by **Host** (`data-host`), **Base Spirit** (`data-spirit`), **Photo Provenance** (`data-provenance="original|doc|ai"`), and full-text search.
   - Uses `content-visibility: auto; contain-intrinsic-size: auto none auto 650px;` on `.archive-session` blocks to defer offscreen rendering.
   - Every cocktail card includes an explicit provenance badge (`.provenance-original` for authentic host kitchen photos, `.provenance-doc` for reference photos from the original Google Doc, and `.provenance-ai` for AI illustrations & architectural spec plates).
   - Includes a tongue-in-cheek **HTTP 404 Easter Egg (`#doug-quinn-404`)** when filtering or searching for `Doug` or `Quinn`, referencing the Google Doc lore before revealing their surviving recipes and `.vault-missing-card` cold cases.

---

## Recipe Specification Pattern

When adding or updating cocktail recipes in [index.html](file:///Users/broconne/src/cocktails/index.html), adhere strictly to the measurement data-attribute conventions so the scaling engine functions correctly:

```html
<!-- Fluid ounce ingredient -->
<li>
  <span class="spec-measure" data-oz="1.5">1.5 oz</span>
  <span class="spec-name">Rye Whiskey</span>
  <span class="spec-detail">(Rittenhouse 100 proof)</span>
</li>

<!-- Barspoon ingredient -->
<li>
  <span class="spec-measure" data-oz="0.125" data-barspoon="true">1 barspoon (0.125 oz)</span>
  <span class="spec-name">Benedictine</span>
</li>

<!-- Count / Dash ingredient -->
<li>
  <span class="spec-measure" data-count="2" data-unit="dash">2 dashes</span>
  <span class="spec-name">Aromatic Bitters</span>
</li>
```

---

## Local Development & Testing

No compilation or build step is necessary. Serve the directory locally using any static web server:

```bash
# Start a local static server
python3 -m http.server 8000
```

Then preview in your browser:
- **Guest View**: `http://localhost:8000`
- **Bartender View**: `http://localhost:8000/#bartender`

### Validation Checklist

Before committing changes:
- Verify both **Guest** and **Bartender** modes.
- Test the **batch scaler** across all recipes to confirm numbers and units update cleanly without `NaN` or layout breaking.
- Test the native `<dialog>` QR modal (open, close button, backdrop click, Escape key).
- Verify mobile responsiveness (ensure card layouts stack gracefully on narrow viewports).
- Ensure Open Graph meta tags and images point to valid URLs when adding new menus.

---

## Version Control & Workflow

- **VCS is Jujutsu (`jj`), backed by Git**:
  - Prefer `jj` commands over direct `git` commands:
    ```bash
    jj status
    jj diff
    jj describe -m "Your clear description"
    jj new
    ```
  - Do **not** run automatic git pushes unless explicitly directed by the user.
- **Assets**: Keep high-resolution menu artwork compressed appropriately for fast mobile loading over cellular/event Wi-Fi.
