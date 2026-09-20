# abbas

## Mr. Abb — AI Voice Command Center (WordPress theme)

The production WordPress theme for eldeniney.me lives in [`mr-abb/`](mr-abb/) and ships as the installable [`mr-abb.zip`](mr-abb.zip) (Appearance → Themes → Add New → Upload Theme). See [`mr-abb/README.md`](mr-abb/README.md) for installation, configuration, the backend API contract, ElevenLabs integration and security notes.

---

# Expense Calculator

A simple, dependency-free expense calculator that runs entirely in the browser.

## Features

- Add expenses with a description, amount, category, and date
- Summary stats: total spent, spending this month, entry count, and average expense
- Per-category breakdown with amounts and percentages
- Expense list sorted by date, with per-row delete and a clear-all option
- Data persists in your browser via `localStorage` — no server or account needed

## Usage

Open `index.html` in any modern browser. That's it — there is nothing to install or build.

```bash
# or serve it locally if you prefer:
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Tech

Single HTML file with vanilla JavaScript and CSS. No frameworks, no build step, no dependencies.
