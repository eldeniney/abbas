# abbas

Personal projects and prototypes.

## Projects

### `twaa/` — توّا Twaa quick-commerce customer app (design prototype)

Interactive, Arabic-first (RTL) design prototype of the Twaa hyperlocal quick-commerce customer app for **Abu El Matamir and its villages**, built from the BRD v1.1 and the brand direction (Aubergine `#3A1F3D` · Cream `#F9F2E7` · Mandarin `#F9732F`). Follows the noon Minutes pattern: big ETA header, prominent search, hero offers, dense category grid, outline quick-add buttons, sticky cart bar and cart in the tab bar. The location screen uses the device GPS and a draggable map with live village/zone detection (Leaflet + OpenStreetMap when online, built-in map otherwise).

- `twaa/index.html` — the prototype (17 screens incl. a ready-food section, working cart, promo codes, checkout, tracking, live location, AR/EN toggle)
- `twaa/assets/logo.svg`, `logo-cream.svg`, `logo-mark.svg` — vector logo traced from the official artwork (full and mark-only)
- `twaa/design-system.html` — tokens and components
- `twaa/DESIGN.md` — screen-by-screen design guideline mapped to the BRD

Open `twaa/index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000/twaa/
```

Fully responsive: fills a phone screen (PWA-ready), adapts grids on tablets, and becomes a desktop web layout with a side rail and multi-column cart, checkout, tracking and product pages. Preview modes: Fill window / Tablet / Phone.

No build step, no dependencies (Google Fonts and Leaflet loaded at runtime; falls back gracefully offline).

### `index.html` — Expense Calculator

A simple, dependency-free expense calculator that runs entirely in the browser. Add expenses with description, amount, category and date; see totals, this-month spend, per-category breakdown; data persists via `localStorage`.
