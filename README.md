# abbas

Personal projects and prototypes.

## Projects

### `twaa/` — توّا Twaa quick-commerce customer app (design prototype)

Interactive, Arabic-first (RTL) design prototype of the Twaa hyperlocal quick-commerce customer app, built from the BRD v1.1 and the brand direction (Aubergine `#3A1F3D` · Cream `#F9F2E7` · Mandarin `#F9732F`). Follows the quick-commerce pattern of apps like noon Minutes: address + ETA header, prominent search, hero offers, category grid, quick-add product carousels, sticky cart bar and 5-tab navigation.

- `twaa/index.html` — the prototype (16 screens, working cart, promo codes, checkout, tracking, AR/EN toggle)
- `twaa/design-system.html` — tokens and components
- `twaa/DESIGN.md` — screen-by-screen design guideline mapped to the BRD

Open `twaa/index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000/twaa/
```

No build step, no dependencies (Google Fonts loaded at runtime; falls back to system fonts offline).

### `index.html` — Expense Calculator

A simple, dependency-free expense calculator that runs entirely in the browser. Add expenses with description, amount, category and date; see totals, this-month spend, per-category breakdown; data persists via `localStorage`.
