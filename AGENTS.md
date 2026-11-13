# AGENTS.md

Shared guidance and primer for AI coding agents and human developers working in this repository.

## Overview

**The League of Extraordinary Cocktails** ([hortonscreekcocktails.com](https://hortonscreekcocktails.com)) is a speakeasy-inspired digital cocktail archive, interactive tasting stage, and bartender reference (founded August 2020). It features an **Interactive Session Timeline Switcher** where any of the 12 tasting sessions can be elevated to the top **Active Session Tasting Stage** alongside **The Cellar Vault (2020–2026)** housing all 51 recipes across 12 sessions, complete with photo provenance badges, club lore callouts, and interactive filtering.

The site is hosted as a static website on **GitHub Pages** with a custom domain (`CNAME`).

---

## Architecture & Project Structure

The project is intentionally dependency-free and build-free. There are no bundlers, transpilers, or node dependencies.

```text
.
├── AGENTS.md              # This guide
├── CNAME                  # GitHub Pages custom domain (hortonscreekcocktails.com)
├── index.html             # Complete single-page application (HTML, CSS, JS)
└── assets/                # Menu artwork, icons, and static QR code
    ├── archive/           # 51 historical cocktail photos & AI illustrations (2020–2026)
    ├── favicon.svg        # Site favicon
    └── qr-hortons-creek.svg # Static offline-ready QR code for hortonscreekcocktails.com
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
   - State is persisted to `localStorage` (`hcc_menu_mode`) and honors `#bartender` or `&bartender` URL hash fragments (e.g., `#vault&bartender`, `#<session-id>&bartender`).
2. **Session-Focused View vs. Full Cellar Vault Layout**:
   - The top navigation features the **past 3 tasting sessions** (`Oct 2026: Alley 2.6`, `Oct 2025: Fall Festival`, `Sep 2025: Maligned Drinks Uplifted`) followed by **The Vault** button (whose cocktail count is computed dynamically from the DOM).
   - When viewing a session (`body[data-page-view="session"]`), the entire page is dedicated exclusively to that session: the session narrative, split tasting cards (`.stage-split-card`), the Bartender Prep & Batching Ledger table (`#prep-summary`), and batch scaler—removing the vault and other drinks from the view.
   - Clicking **The Vault** button (`body[data-page-view="vault"]`) or navigating to `#vault` reveals the fully scrollable Cellar Vault housing all 51 recipes across 12 sessions, complete with search, spirit/host/provenance filters, and the "I'm Feeling Lucky" selector.
   - Any historical session can be elevated from the Vault into the focused session view via `↑ Feature This Session`.
   - View transitions push browser history entries and synchronize on `popstate` and `hashchange` via `routeFromHash()`.
3. **Individual Spec Accordions**:
   - In Guest mode, guests can selectively toggle technical specs for an individual drink via `.toggle-spec-btn` (modifying `data-expanded="true|false"` on `.cocktail-card`).
4. **Dynamic Batch Scaler**:
   - Bartender mode includes batch scaling buttons (1x, 2x, 3x, 4x, 5x, 6x) positioned directly above the Bartender Prep & Batching Ledger table (formatting each ingredient on its own line for rapid service), while preserving the top stage cards as fixed single-serving reference specs.
   - Quantities are stored in data attributes on `.spec-measure`:
     - `data-oz="<amount>"`: Scaled mathematically and formatted (supports `data-barspoon="true"`).
     - `data-count="<number>"` with `data-unit="dash|drop|leaf|..."`: Scaled with automated pluralization.
5. **QR Code Sharing Modal**:
   - Uses native `<dialog id="qr-dialog">` displaying the local static SVG [assets/qr-hortons-creek.svg](file:///Users/broconne/src/cocktails/assets/qr-hortons-creek.svg) with close button and backdrop click handlers.
6. **The Cellar Vault (`#league-archive`)**:
   - Houses all 51 cocktails across 12 sessions (including *Oct 1, 2026: Alley 2.6*).
   - Filterable by **Host** (`data-host`), **Base Spirit** (`data-spirit`), **Photo Provenance** (`data-provenance="original|doc|ai"`), and full-text search over curated card fields (`cardSearchMap`: title, story, host, session title, spec item names/notes, and glassware).
   - Proportional SVG build diagrams are generated client-side by `buildCocktailSpecSvg` and lazily mounted via `IntersectionObserver`.
   - Uses `content-visibility: auto; contain-intrinsic-size: auto none auto 650px;` on `.archive-session` blocks to defer offscreen rendering.
   - Every cocktail card includes an explicit provenance badge (`.provenance-original` for authentic host kitchen photos, `.provenance-doc` for reference photos from the original Google Doc, and `.provenance-ai` for AI illustrations).
   - Includes a tongue-in-cheek **HTTP 404 Easter Egg (`#doug-quinn-404`)** when filtering or searching for `Doug` or `Quinn`, referencing the Google Doc lore before revealing their surviving recipes and `.vault-missing-card` cold cases.
7. **"I'm Feeling Lucky" Vault Selector (`#vault-lucky-btn`)**:
   - Randomly selects an authentic recipe from the Cellar Vault (honoring active filters; displays a prompt in `#archive-count` instead of resetting filters if no drinks match).
   - Smoothly scrolls to the chosen cocktail card using modern scroll completion promises, handles `content-visibility: auto` settling, activates an amber pulse highlight, reveals a `Tonight's Lucky Pour` badge, and automatically expands bartender specs in Guest mode.
8. **Minimalist Host Rotation Tracker (`#up-next-btn`, `#rotation-dropdown`)**:
   - Strictly tracks the 5-member continuous host rotation cycle: **Doug ➔ Brian ➔ Matt ➔ Jason ➔ Quinn**.
   - Positioned to the far left of the latest session in `.scrubber-inner` (`[ 🍸 UP NEXT: <HOST> ▾ ]`), matching the descending chronological flow.
   - Clicking reveals a floating speakeasy popover dropdown with full cycle visibility, highlighting the current host and upcoming host.
   - Dynamically synchronizes who is current and who is up next whenever the featured session changes on the tasting stage. Supports light-dismiss via click-outside and <kbd>Esc</kbd>.
9. **Privacy & Member Identity Convention**:
   - All host and member references across recipes, session headers, filter buttons, story callouts, and the 404 Easter egg use **first names only** (*Doug, Brian, Matt, Jason, Quinn, Ben*). Last names are strictly omitted.
10. **Progressive "What Can I Make?" Backbar Ingredient Matcher (`#vault-maker-btn`, `#backbar-drawer`)**:
    - Attached directly to **I'm Feeling Lucky** inside `.discovery-duo-capsule` in the Vault controls.
    - **Progressive Unfold**: Opens showing **only Step 1 (Base Spirits)**. Once a user selects one or more Base Spirits, **Step 2 (Matching Liqueurs, Vermouth & Amari)** and **Step 3 (Citrus, Syrups, Bitters & Mixers)** automatically expand, displaying only the modifiers and pantry/mixer items that pair with the selected spirit(s) alongside live `+X Ready!` / `+X drinks` badges.
    - **Explicit Pantry Selection & Optional Garnishes**: Pantry and mixer items (Lemon, Lime, Simple/Demerara/Ginger Syrup, Maple/Honey/Agave, Bitters, Club Soda/Ginger Beer, Cider/Juice/Coffee, Egg/Mint/Produce) are **not** assumed stocked on hand—users toggle what they actually have in Step 3 (collapsible via `Pantry & Mixers (X/Y)`). `.spec-garnish` items and theatrical techniques (smoke, mist) are always treated as optional.
    - **Live Card Ribbons & Lucky Synergy**: Filtered cards receive `.card-match-ribbon` badges (`🟢 READY TO POUR` or `🟡 MISSING 1 BOTTLE: <NAME>` with an inline `+ Have It` button), and the attached **I'm Feeling Lucky** button dynamically transforms into `Roll From My Shelf (X)` to pick a random ready-to-pour drink.
    - **Zero-Config Extensibility**: `indexVaultIngredients()` automatically scans `.vault-card .spec-list .spec-item` elements from the DOM on boot (exposed globally as `window.reindexVaultIngredients()`). `CANONICAL_INGREDIENT_RULES` is first-match-wins (specific rules above generic ones). Unknown items auto-discover onto `pantry` if their name contains `syrup`, `juice`, `soda`, `bitters`, or `cordial`, and `modifiers` otherwise (optional overrides: `data-optional="true"`, `data-ing="<id>"`, `data-shelf="spirits|modifiers|pantry"`).

---

## Recipe Specification Pattern

When adding or updating cocktail recipes in [index.html](file:///Users/broconne/src/cocktails/index.html), adhere strictly to the measurement data-attribute conventions so the scaling engine functions correctly. UI cocktail and session counts are computed dynamically from the DOM, but the static `<meta name="description">` and `<meta property="og:description">` tags in `index.html` must be updated manually when adding or removing cocktails:

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
