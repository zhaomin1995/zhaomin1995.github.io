# Zhaomin Xiao — Personal Homepage

A static personal website hosted on GitHub Pages at [zhaomin1995.github.io](https://zhaomin1995.github.io).

## Development Guidelines

**IMPORTANT: Follow these rules for every change.**

1. **Comment coverage**: Every change must have good comment coverage. Add concise comments to explain non-obvious logic, data structures, and key decisions. Use `/* block */` for section headers and `//` for inline notes.

2. **Update this file**: If a change affects the folder structure, adds/removes pages, changes architecture, updates Firebase config, or modifies the tech stack, update this CLAUDE.md to reflect the current state.

3. **Test before committing**: Verify changes work in the browser before reporting as done.

4. **No frameworks**: This is a pure HTML/CSS/JS site. Do not introduce React, Vue, or other frameworks.

5. **Bilingual**: All user-facing text must have both `<span class="lang-en">` and `<span class="lang-zh">` versions.

## Folder Structure

```
zhaomin1995.github.io/
├── index.html              # Main homepage (About, Education, News, Experience, Misc)
├── README.md               # Placeholder README
├── firebase.json           # Firebase deployment config (must stay in root)
├── .gitignore              # Ignores: node_modules/, .idea/, img/travel/, .travel-cache.json
│
├── .llm/agents/
│   └── CLAUDE.md           # THIS FILE — repo context for LLM agents
│
├── .github/workflows/
│   └── update-i140.yml     # Daily refresh of assets/data/i140/ (runs scripts/fetch_i140.py)
│
├── .claude/
│   └── launch.json         # Local preview server config (python -m http.server 4173)
│
├── scripts/
│   └── fetch_i140.py       # Scrapes the public I-140 Power BI report into static JSON (stdlib only)
│
├── pages/                  # Sub-pages (linked from index.html via pages/)
│   ├── travel.html         # 3D globe — photos from Firebase Storage, clustered markers
│   ├── history.html        # Zoomable world history timeline (Canvas, 1971 events)
│   ├── reading.html        # Bookshelf — 1060+ books, sidebar categories, search
│   ├── reader.html         # In-browser book reader (iBooks-style, two-page spread)
│   ├── pets.html           # Pet photo gallery — loads from Firebase Storage /pet/
│   ├── visitors.html       # Visitor stats — IP geolocation, Leaflet map
│   ├── space.html          # Internal space — login (test/test), desktop with shortcuts
│   ├── i140.html           # I-140 block dashboard (static data, 87 blocks)
│   └── i140-case.html      # I-140 single-case tracker (live queries)
│
├── assets/
│   ├── css/
│   │   └── apple.css       # Main stylesheet (light/dark mode via CSS custom properties)
│   ├── js/
│   │   ├── events.js       # World history events (1971 events, bilingual, continent/era tags)
│   │   ├── books.js        # Book data (1060+ books, 19 categories, free PDF links)
│   │   ├── i140.js         # Shared data layer for the two I-140 pages
│   │   └── places.js       # [DEPRECATED] Was auto-generated, now reads from Firebase
│   ├── data/
│   │   └── i140/           # Per-block case JSON + index.json (generated; do not hand-edit)
│   ├── fontawesome/
│   │   └── js/all.min.js   # FontAwesome icons
│   ├── img/
│   │   ├── favicon.svg     # ZX monogram favicon
│   │   ├── zhaomin_photo.jpeg  # Profile photo
│   │   └── UNT.png         # Legacy icon (unused)
│   └── files/
│       ├── zhaomin_cv.pdf  # CV / resume PDF
│       └── posters/        # Conference poster PDFs
│
├── firebase/               # Firebase configuration and Cloud Functions
│   ├── database.rules.json # Realtime Database security rules
│   └── functions/
│       ├── index.js        # processTravelPhoto (onFinalize) + deleteTravelPhoto (onDelete)
│       └── package.json    # Dependencies: firebase-functions, exif-parser, node-fetch
```

## Firebase Setup

- **Project**: `zhaomin-homepage` (Blaze plan)
- **Realtime Database**: `https://zhaomin-homepage-default-rtdb.firebaseio.com`
  - `/travel-photos/` — written by Cloud Function, read by travel.html
  - `/travel-cache/` — legacy cache (may be removed)
- **Storage bucket**: `zhaomin-homepage.firebasestorage.app`
  - `/travel/` — travel photos (auto-processed by Cloud Function on upload)
  - `/pet/` — pet photos (listed directly by pets.html)
- **Cloud Functions**:
  - `processTravelPhoto` — triggers on Storage upload to `/travel/`, reads EXIF GPS, reverse-geocodes via Nominatim, writes to Realtime DB
  - `deleteTravelPhoto` — triggers on Storage delete, removes DB entry

## Pages

### `index.html` — Main Homepage
- Hero with name, tagline, social links (Email, CV, GitHub, LinkedIn)
- About + Education in two-column layout (2.5:1 ratio)
- News timeline with hover popovers showing publication details
- Experience cards (On-Device LLM, Ads Signal Anonymizer, Meta internship, UNT research)
- Miscellaneous grid: Travel, Pets — all clickable with expand animations
- Links grid: shortcuts I open often (I-140 case tracker, block stats). Plain anchors —
  no expand animation
- Footer: visitor counter (counterapi.dev) + Internal Space button
- Scroll-to-top, dark mode toggle, language toggle (EN/中文)

### `pages/travel.html` — 3D Travel Globe
- Globe.gl 3D globe with Firebase Storage photos as clustered markers
- Photos loaded from Firebase Realtime DB `/travel-photos/` (written by Cloud Function)
- Apple Photos-style clustering: nearby photos group, split on zoom
- Hover shows 2x2 photo grid tooltip with location name
- Click marker opens gallery overlay (globe stays in background)
- Gallery has lightbox with full-size view
- Static globe (no auto-rotation), drag to rotate, scroll to zoom

### `pages/history.html` — World History Timeline
- Canvas-rendered zoomable/pannable timeline, 1971 events
- Snaking curved path with era-based gradient colors + animated particles
- Default zoom shows ~20 major events; zoom in for more
- Continent filters (Asia 561, Europe 595, Africa 551, N. America 156, S. America 74)
- Era filters (Early Civilizations to Information Age)
- Tooltip fixed near mark, persists 1.5s for Wikipedia link clicking
- Smooth zoom via lerp interpolation
- Event data in `assets/js/events.js`

### `pages/reading.html` — Bookshelf
- Left sidebar with 19 categories sorted alphabetically
- 4-shelf wooden bookshelf layout per category
- 1060+ books with free/open-access PDF links
- Search: inline expanding search box in nav
- Click book → iBooks-style overlay (cover + description page)
- "Read" button → reader.html or redirects to source for non-Gutenberg books
- Animated transition from book info to reader page
- Book data in `assets/js/books.js`

### `pages/reader.html` — Book Reader
- Two-page spread on wide screens, single page on mobile
- Fetches book text via CORS proxy chain (corsproxy.io → allorigins → codetabs)
- Caches in IndexedDB (session-based, clears on browser close)
- Page-turn animation, font size controls, progress bar
- Keyboard: arrows, space, Home/End
- Non-Gutenberg books redirect to source website

### `pages/pets.html` — Pet Gallery
- Loads photos from Firebase Storage `/pet/` folder via REST API
- Staggered fade-in animation (top-to-bottom, left-to-right)
- "Load more cute pictures" button for lazy loading (6 per batch)
- Lightbox with prev/next navigation buttons + keyboard arrows
- Photos sorted by upload date (newest first)

### `pages/visitors.html` — Visitor Stats
- Summary cards (total visits, location, IP, browser)
- Leaflet.js map with visitor location markers
- Visitor detail panel (IP, city, region, country, timezone, ISP, browser, OS)
- Recent visitors table (localStorage, last 50 records)

### `pages/space.html` — Internal Space
- Login checks Firebase DB `/auth/users/` first, falls back to hardcoded test/test
- To manage allowlist: edit `/auth/users/` in Firebase Console, format: `{ "username": { "password": "pass", "role": "admin" } }`
- macOS-style desktop with app shortcut icons and dock
- **File Manager** (Finder-style): browse Firebase Storage folders, upload (button or drag-and-drop), delete, download files
- Sidebar with folder shortcuts (Root, Travel, Pets)
- File thumbnails for images, icon view for other files
- Right-click context menu (Download, Delete)
- Keyboard: Delete/Backspace to delete, Escape to close

### `pages/i140.html` — I-140 Block Dashboard
- A trimmed clone of the public "I-140 Application Tracker" Power BI report by anto58
- Block picker (87 blocks, remembered in `localStorage`, overridable with `?block=IOE09229`)
- KPI tiles by status bucket, status distribution bars, summary rates
- "Cases by week and status" stacked bar chart — hand-rolled SVG, no charting library
- Searchable / sortable case table; clicking a row opens that receipt in `i140-case.html`
- Reads **static** JSON from `assets/data/i140/` (fast, and independent of upstream uptime)

### `pages/i140-case.html` — Single Case Tracker
- Receipt number in, current status + full USCIS notice text out
- Update history timeline, built from the upstream `new_case_history` table
- Estimated decision time: the official USCIS 80% figure side by side with the
  80th-percentile decision time computed from the case's own block
- Queue position within the block, plus block-wide progress and approval rate
- Recent receipts kept in `localStorage`; deep-linkable with `?case=IOE0929646056`
- Queries the Power BI endpoint **live** (it sends CORS headers for our origin), so a
  single case is always current; falls back to nothing rather than showing stale data

## I-140 Data Pipeline

- **Source**: the Power BI report is "published to web", which exposes an unauthenticated
  query endpoint at `wabi-south-central-us-c-primary-api.analysis.windows.net`.
  `scripts/fetch_i140.py` issues one semantic query per block and decodes Power BI's DSR
  wire format (value dictionaries + an `R` repeat bitmask + a U+00D8 null bitmask).
- **Model**: one fact table `db_API` (`caseId`, `status`, `date`, `updated_at`, `Grupo`,
  `actionCodeText`, `actionCodeDesc`, `formTitle`, …) plus `new_case_history`
  (`caseId`, `status`, `date`, `created_at`) for per-case history.
- **Output**: `assets/data/i140/<BLOCK>.json`, one case per line as
  `[idSuffix, statusIdx, dateDays, seenDays]`. Status strings live once in `index.json`;
  dates are day offsets from 2000-01-01. One-case-per-line keeps the daily git diff small.
- **Refresh**: `.github/workflows/update-i140.yml`, daily at 09:20 UTC, commits only when a
  block file actually changed. Run it by hand with `python scripts/fetch_i140.py`.
- **Scale**: 87 blocks / ~317k cases / ~6.8 MB on disk; one block is a single request.
- **Gotcha**: block names are not a fixed width — 78 are 8 characters (`IOE09229`) and 9 are
  9 characters (`LIN239026`, `SRC239009`). A receipt number is always 13 characters, so the
  stored id suffix is 5 digits for the former and 4 for the latter. Never slice a fixed 8.
- **STALE SINCE 2025-06-16**: the upstream author stopped refreshing the dataset. The
  report still answers queries, but the data has not advanced in over a year. The daily
  job therefore never commits, and both pages show "Data as of <date>" plus a warning
  banner. `index.json` carries `data_as_of` / `data_age_days`; never display
  `generated_at` as if it were the data's date.
- **No official processing times**: deliberately not shown. USCIS publishes no API for
  them (the developer portal offers only Case Status and FOIA) and the egov page sits
  behind a Cloudflare bot challenge, so the figure could only be kept current by hand.
  That was judged not worth the upkeep and removed. The case page instead derives an
  80th-percentile decision time from the block's own decided cases, which needs no
  maintenance. Do not reintroduce a hand-maintained figure without being asked.

## USCIS Official API (Case Status)

- `scripts/uscis_case_status.py` - OAuth2 client-credentials client for the official
  Torch API. `scripts/poll_uscis.py` is the daily driver, run by
  `.github/workflows/poll-uscis.yml` on weekdays at 16:00 UTC.
- **Sandbox keeps business hours**: Mon-Fri 07:00-20:00 US Eastern. Outside them the case
  endpoint returns 503 with an explanatory message; the scripts exit 2 and the workflow
  treats that as skipped, not failed. The OAuth token endpoint answers 24/7.
- Sandbox resolves only USCIS's staging receipts (`EAC9999103403`), never real ones, so
  `poll_uscis.py` writes nothing to the site while `USCIS_ENV=sandbox` - fictional case
  data must never reach a page about a real case.
- Production access needs 5 consecutive days of API traffic plus a demo; flip the
  `USCIS_ENV` and `USCIS_RECEIPTS` repository *variables* (not secrets) when granted.
- Credentials live in `.env` locally (gitignored) and in the `USCIS_CLIENT_ID` /
  `USCIS_CLIENT_SECRET` repository secrets. Never in code, never in a front end.

## Features

### Dark Mode
- `body.dark-mode` class swaps all CSS custom properties
- Persisted in `localStorage`, synced across all pages

### Language Toggle (EN / 中文)
- `body.zh` hides `.lang-en`, shows `.lang-zh`
- Persisted in `localStorage`

### Card Expand Animations
- Travel: light → dark background fade (1.2s ease-in)
- Reading: same color, no fade
- History: same color
- Pets: same color
- All use `requestAnimationFrame` double-RAF for smooth start

## Tech Stack
- Pure HTML / CSS / JavaScript (no build step)
- [Inter](https://fonts.google.com/specimen/Inter) + [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) + [Merriweather](https://fonts.google.com/specimen/Merriweather) fonts
- [FontAwesome](https://fontawesome.com/) icons
- [Globe.gl](https://globe.gl/) — 3D travel globe
- [Leaflet.js](https://leafletjs.com/) + CARTO tiles — visitor map
- [Firebase](https://firebase.google.com/) — Storage (photos), Realtime Database (metadata), Cloud Functions (EXIF processing)
- [counterapi.dev](https://counterapi.dev/) — visitor counting
- [ipapi.co](https://ipapi.co/) — IP geolocation
- [Nominatim/OSM](https://nominatim.openstreetmap.org/) — reverse geocoding

## Deployment
- Push to `master` → GitHub Pages auto-deploys
- Cloud Functions: `npx firebase deploy --only functions --project zhaomin-homepage`
- DB rules: `npx firebase deploy --only database --project zhaomin-homepage`
