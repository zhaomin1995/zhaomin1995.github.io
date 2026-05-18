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
├── pages/                  # Sub-pages (linked from index.html via pages/)
│   ├── travel.html         # 3D globe — photos from Firebase Storage, clustered markers
│   ├── history.html        # Zoomable world history timeline (Canvas, 1971 events)
│   ├── reading.html        # Bookshelf — 1060+ books, sidebar categories, search
│   ├── reader.html         # In-browser book reader (iBooks-style, two-page spread)
│   ├── pets.html           # Pet photo gallery — loads from Firebase Storage /pet/
│   ├── visitors.html       # Visitor stats — IP geolocation, Leaflet map
│   └── space.html          # Internal space — login (test/test), desktop with shortcuts
│
├── assets/
│   ├── css/
│   │   └── apple.css       # Main stylesheet (light/dark mode via CSS custom properties)
│   ├── js/
│   │   ├── events.js       # World history events (1971 events, bilingual, continent/era tags)
│   │   ├── books.js        # Book data (1060+ books, 19 categories, free PDF links)
│   │   └── places.js       # [DEPRECATED] Was auto-generated, now reads from Firebase
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
- Miscellaneous grid: Travel, Pets, Reading, History — all clickable with expand animations
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
- Login required: username `test`, password `test` (session-based)
- Desktop-style page with app shortcut icons
- macOS-style dock at bottom
- Live clock in taskbar

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
