# Mega Deal Celebration Announcement — Send Kit

**File:** `mega-deal-celebration-email.html` — a self-contained, table-based HTML email.
No external images, no web fonts, no tracking. Safe to paste straight into Outlook.

---

## Subject lines (pick one)

| # | Subject | Tone |
|---|---------|------|
| 1 | **Major Digital Win — 233 NaaS Subscriptions Secured with Aldar Investment** | Factual, CXO default |
| 2 | **233 Subscriptions, One Order: Aldar Investment Goes NaaS with e&** | Momentum |
| 3 | **Mega Deal Closed — Aldar Investment | 233 NaaS Subscriptions** | Scannable in a busy inbox |

**Preheader (already embedded):** 233 NaaS subscriptions secured with Aldar Investment in a single order — Phase 1 across four malls, with a runway to 20+ locations.

---

## Sending from Outlook

1. Open `mega-deal-celebration-email.html` in a browser.
2. Select all (Ctrl+A) → copy (Ctrl+C).
3. Paste into a new Outlook message body.
4. Set sensitivity to **Confidential** so the classification banner matches the footer.
5. Attach the PO PDFs if this version replaces the original thread.

*Alternative (best fidelity):* in Outlook, **Insert → Attach File → Insert as Text**, then select the HTML file. This preserves the layout more faithfully than clipboard paste.

---

## Placeholders to fill before sending

- `[Sender Name]` and `[Title]` in the signature block.
- Confirm the recipient salutation — currently **"Dear Bu Omar,"**.

---

## Copy claims — verify before send

Every figure is taken verbatim from your original email. Two notes:

- **"a landmark close for our enterprise portfolio"** — deliberately worded to avoid an unverified superlative. If you have the data to say *largest NaaS order to date*, that line is the place to strengthen it.
- **"beginning at Al Jimi Mall"** — your original names Al Jimi Mall in the subject line; confirm it is in fact the Phase 1 starting site before stating it as such.

---

## Design system

Sourced from the attached brand palette. The e& site itself was unreachable from this
environment (blocked by the network proxy), so the identity cues come from the palette
plus the lowercase `e&` wordmark treatment.

| Role | Hex | Where it appears |
|------|-----|------------------|
| Brand red (primary) | `#E00700` | Wordmark, eyebrow labels, accent rules, hero numeral |
| Deep red | `#A10316` | Metric numerals |
| Success green | `#276A4B` | Recognition block accent, tail of the top bar |
| Ink | `#131010` | Headlines, footer band |
| Body | `#332D2D` | Paragraph text |
| Secondary | `#564C4C` / `#7B6E6E` | Descriptors, labels |
| Hairline | `#E5E3E3` | Dividers, card border |
| Tint | `#FAF8F8` | "Platform ahead" panel |
| Page | `#F2F0F0` | Canvas behind the card |

**Restraint rule:** red carries the win, green carries the people, everything else is
ink on white. One accent per idea — that is what keeps it reading as elegant rather
than as a sales blast.

**Typography:** Helvetica Neue → Helvetica → Arial. Hierarchy is built from size,
weight and letter-spacing rather than from decoration, so it degrades cleanly in
Outlook's rendering engine.

**Layout:** 620px card, 48px gutters, hairline dividers, no shadows, no rounded
corners, no images. Fully responsive — the metric strip and three pillars stack to a
single column below 620px.

---

## Plain-text fallback

```
MAJOR DIGITAL WIN — ALDAR INVESTMENT

Dear Bu Omar,

We are delighted to share a major Digital win. Aldar Investment has
committed to 233 Network as a Service subscriptions in a single order —
a landmark close for our enterprise portfolio and the foundation of a
long-term managed services relationship.

Phase 1 places end-to-end IT infrastructure management across four malls
in our hands, beginning at Al Jimi Mall. It also establishes the platform
from which the wider account will grow.

233   NaaS subscriptions in a single order
04    Malls under Phase 1 scope
20+   Locations in the expansion runway

WHAT THIS SECURES

- Phase 1 delivery — End-to-end IT infrastructure management across four
  Aldar malls.
- Strategic platform — Opens further Network Assessment, Security and
  Managed Connectivity opportunities.
- Growth potential — A defined expansion path to six additional malls and
  more than 20 locations.
- Team effort — Sustained collaboration across Sales and Product, from
  opportunity development and solution design through technical
  validation to closure.

THE PLATFORM AHEAD
Network Assessment · Managed Security · Multi-Site Connectivity

SPECIAL RECOGNITION
Fathima Zainab · Sajeed Khan · Hummad Anwer
For their ownership, persistence and teamwork in carrying this
opportunity all the way to closure.

Congratulations to everyone involved in accelerating our Digital growth
agenda.

[Sender Name]
[Title] · e& Enterprise

CONFIDENTIAL — Information the corporation and its employees have a
legal, regulatory or social obligation to protect.
```
