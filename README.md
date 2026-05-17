# Zhaomin Xiao — Personal Homepage

A static personal academic website hosted on GitHub Pages at [zhaomin1995.github.io](https://zhaomin1995.github.io).

## Folder Structure

```
zhaomin1995.github.io/
├── index.html              # Main homepage (About, Education, News, Experience, Misc)
├── zhaomin_cv.pdf          # CV / resume PDF
├── license.txt             # License file
├── README.md               # This file
│
├── pages/                  # Sub-pages (linked from index.html)
│   ├── travel.html         # 3D globe page — interactive travel map (Globe.gl)
│   ├── history.html        # Interactive zoomable world history timeline (Canvas)
│   ├── reading.html        # Bookshelf with 201 books across 21 categories
│   └── visitors.html       # Visitor stats page with IP geolocation and Leaflet map
│
├── assets/
│   ├── css/
│   │   └── apple.css       # Main stylesheet — shared by index.html & visitors.html
│   │                       #   Light/dark mode via CSS custom properties
│   │                       #   Language toggle (EN/中文) via .lang-en / .lang-zh classes
│   ├── js/
│   │   ├── events.js       # World history event data (314 events, bilingual)
│   │   │                   #   Used by history.html — ERAS, CONTINENTS, EVENTS arrays
│   │   └── books.js        # Book data (201 books, 21 categories)
│   │                       #   Used by reading.html — BOOK_CATEGORIES, BOOKS arrays
│   └── fontawesome/
│       └── js/all.min.js   # FontAwesome icon library
│
├── img/
│   ├── favicon.svg         # Site favicon — ZX monogram with gradient
│   ├── zhaomin_photo.jpeg  # Profile photo
│   └── UNT.png             # Legacy icon (unused)
│
└── files/
    └── posters/            # Conference poster PDFs
        ├── aacl_2023_poster.pdf
        └── coling_2022_poster.pdf
```

## Pages

### `index.html` — Main Homepage
- **Hero** section with name, tagline, and social links
- **About + Education** in a two-column layout
- **News** timeline with hover/click popovers showing publication details
- **Experience** cards for work and research history
- **Miscellaneous** grid: Travel and History cards have expand-to-page animations linking to their respective pages
- **Footer** with a live visitor counter (via counterapi.dev)
- Scroll-to-top button, dark mode toggle, language toggle (EN/中文)

### `travel.html` — 3D Travel Globe
- Full-screen interactive 3D globe using [Globe.gl](https://globe.gl/)
- Travel destinations plotted as markers with hover tooltips
- Auto-rotating globe with drag, zoom, and star field background
- To add destinations: edit the `places` array in the `<script>` section

### `history.html` — World History Timeline
- Full-screen canvas rendering a zoomable, pannable timeline of 314 world events
- Events are laid out in a snaking curved path with era-based gradient coloring
- **Zoom controls visibility**: zoom out = landmark events only, zoom in = all events
- **Continent filters**: Asia, Europe, Africa, N. America, S. America, Oceania, Global
- **Era filters**: from Early Civilizations (~3000 BC) to Information Age (present)
- Hover/tap shows tooltip with event details and a Wikipedia link
- Animated particles flow along the path
- Event data lives in `assets/js/events.js`

### `reading.html` — Interactive Bookshelf
- Warm-toned page with realistic wooden bookshelves
- Books displayed as colored spines organized by category (CS, Science, Fiction, Philosophy, History, Self-Improvement)
- Hover a book spine to pull it up and see a popup with title, author, description, and category tag
- Book data is defined in a JS object — easy to add/remove books
- To add a book: add an entry to the `books` object in the `<script>` section with title, author, desc, color, and height

### `visitors.html` — Visitor Statistics
- Summary cards showing total visits, visitor location, IP, and browser
- Interactive Leaflet.js map plotting visitor locations
- Detailed visitor info panel (IP, city, region, country, timezone, ISP, browser, OS)
- Recent visitors table (stored in localStorage, last 50 records)
- Uses [ipapi.co](https://ipapi.co/) for IP geolocation

## Features

### Dark Mode
- Toggle via moon/sun button in nav bar
- Persisted in `localStorage` across all pages
- CSS custom properties swap the entire color palette

### Language Toggle (EN / 中文)
- Toggle via "中/EN" button in nav bar
- All content has `<span class="lang-en">` and `<span class="lang-zh">` pairs
- `body.zh` CSS class hides English and shows Chinese
- Persisted in `localStorage`

### Card Expand Animation
- Travel and History misc cards have a click-to-expand animation
- A fixed overlay grows from the card's position to fill the viewport
- Travel card additionally fades from light to dark background

## Tech Stack
- Pure HTML / CSS / JavaScript (no build step, no framework)
- [Inter](https://fonts.google.com/specimen/Inter) + [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) fonts
- [FontAwesome](https://fontawesome.com/) icons
- [Globe.gl](https://globe.gl/) for the 3D travel globe
- [Leaflet.js](https://leafletjs.com/) + CARTO tiles for visitor map
- [counterapi.dev](https://counterapi.dev/) for visitor counting
- [ipapi.co](https://ipapi.co/) for IP geolocation

## Development
```bash
# Serve locally
cd zhaomin1995.github.io
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

## Deployment
Push to `master` branch — GitHub Pages auto-deploys from the root of the repo.
