# AGENTS.md

Shared guidance and primer for AI coding agents and human developers working in this repository.

## Overview

**The League of Extraordinary Cocktails** ([hortonscreekcocktails.com](https://hortonscreekcocktails.com)) is a subterranean speakeasy-inspired digital cocktail archive, interactive tasting stage, and bartender reference (founded August 2020). It features an **Interactive Session Timeline Switcher** where any of the 12 tasting sessions can be elevated to the top **Active Session Tasting Stage** alongside **The Cellar Vault (2020–2025)** housing all 51 recipes across 12 sessions, complete with photo provenance badges, club lore callouts, and interactive filtering.

The site is hosted as a static website on **GitHub Pages** with a custom domain (`CNAME`).

---

## Architecture & Project Structure

The project is intentionally dependency-free and build-free. There are no bundlers, transpilers, or node dependencies.

```text
.
├── AGENTS.md             # This guide
├── CNAME                 # GitHub Pages custom domain (hortonscreekcocktails.com)
├── index.html            # Complete single-page application (HTML, CSS, JS)
└── assets/               # Menu artwork and cocktail visuals
    └── archive/          # 51 historical cocktail photos & AI illustrations (2020–2025)
```

### Key Technical Characteristics

- **Single-File Delivery**: All markup, styling, and client-side logic reside in [index.html](file:///Users/broconne/src/cocktails/index.html).
- **Design System & Typography**:
  - **Midnight Bourbon Cellar & Moody Lounge** dark-mode palette with charred oak, smoked glass, and candlelit whiskey amber CSS variables (`--bg-abyss: #0b0807`, `--bg-granite: #14100e`, `--accent-lantern: #e8993a`, `--accent-lantern-glow: #f5b563`).
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
   - Bartender mode reveals full build steps, glassware, ice, prep steps, the Session Prep Ledger, and scaling controls.
   - State is persisted to `localStorage` (`hcc_menu_mode`) and honors the `#bartender` URL hash.
2. **Interactive Session Timeline Switcher & Active Tasting Stage**:
   - The horizontal `.scrubber-bar` lets users switch between all 12 club sessions (or click `↑ Feature This Session` on any session in the Vault).
   - Selecting a session dynamically populates `#active-tasting-stage` with split smoked-glass cocktail cards (`.stage-split-card`) and updates the `#prep-summary` Bartender Prep & Batching Ledger table.
3. **Individual Spec Accordions**:
   - In Guest mode, guests can selectively toggle technical specs for an individual drink via `.toggle-spec-btn` (modifying `data-expanded="true|false"` on `.cocktail-card`).
4. **Dynamic Batch Scaler**:
   - Bartender mode includes batch scaling buttons (1x, 2x, 4x, 8x) that scale both the Active Tasting Stage and all 51 cards in the Cellar Vault.
   - Quantities are stored in data attributes on `.spec-measure`:
     - `data-oz="<amount>"`: Scaled mathematically and formatted (supports `data-barspoon="true"`).
     - `data-count="<number>"` with `data-unit="dash|drop|leaf|..."`: Scaled with automated pluralization.
5. **QR Code Sharing Modal**:
   - Uses native `<dialog id="qr-dialog">` with backdrop and close handlers.
6. **The Cellar Vault (`#league-archive`)**:
   - Houses all 51 cocktails across 12 sessions (including *Oct 1, 2025: Alley 2.6*).
   - Filterable by **Host** (`data-host`), **Base Spirit** (`data-spirit`), **Photo Provenance** (`data-provenance="original|doc|ai"`), and full-text search.
   - Uses `content-visibility: auto; contain-intrinsic-size: auto none auto 650px;` on `.archive-session` blocks to defer offscreen rendering.
   - Every cocktail card includes an explicit provenance badge (`.provenance-original` for authentic host kitchen photos, `.provenance-doc` for reference photos from the original Google Doc, and `.provenance-ai` for AI illustrations).
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
