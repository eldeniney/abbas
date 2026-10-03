# توّا Business OS

A clickable, Arabic-first (RTL) demo of the whole Twaa operating platform for Abu El Matamir, Beheira: the **customer app**, the **merchant app**, the **rider app** and the internal **Control Center**. All four run on one shared store, so whatever happens in one (a merchant marks an order ready) is immediately visible in the others (rider offer, customer tracking, Control Tower).

Built from the design brief in `docs/MASTER_PROMPT.md` and the operating blueprint in `../ops-blueprint/`. Exception and rule codes (`EX-…`, `BR-…`) shown in the UI come from that blueprint.

## Open it
- `twaa/os/index.html` in any modern browser (no build step, works from `file://`), or
- the single-file build `twaa/os/dist/twaa-business-os.html`.

Start on the ecosystem page, then try **عرض متزامن** (all three phones plus the Control Tower side by side) and **السيناريوهات** (the scenario director).

## What's inside
| Area | Highlights |
|---|---|
| Customer | Location-first home with the three shopping modes, 22-department taxonomy over a 185-SKU master catalogue, Arabic search with aliases and typo tolerance, one canonical product page with ranked merchant offers, multi-source cart, full pre-checkout validation, idempotent order placement, 6-step tracking with live map, substitution decisions, rating and issue reporting |
| Merchant | Open/busy/closed, accept-with-countdown, prep checklist, pickup-code handover, catalogue **selection** (never free-text product creation), missing-SKU requests, explainable deductions with disputes, onboarding wizard |
| Rider | Online/offline, offers with countdown, cash-exposure meter that blocks COD jobs at the limit, scan-based chain of custody, OTP delivery, controlled failure flow, deposits, earnings separated from cash |
| Control Center | 53 sections plus 6 detail views (order, customer, merchant, rider, case, SKU) across Command, Commerce, Supply, Delivery, Finance, Customer Care, Growth, Intelligence and Governance, with role-based access (switch role in the sidebar), approval center, audit log, reason-required actions and per-order ledgers |

Core rule throughout: **Customer Order ≠ Fulfillment Order**, and operational status is always shown separately from financial status.

## 14 scenarios
1 simple hub order · 2 multi-source order · 3 out-of-stock substitution · 4 merchant order · 5 merchant timeout and reroute · 6 rider COD limit · 7 failed delivery and RTO · 8 missing item refund · 9 new merchant onboarding · 10 merchant adds 20 products · 11 missing product request · 12 village expansion · 13 promotion economics · 14 end-of-day finance close.

Each step can be done by hand in the apps or executed by the director, through the same store actions.

## Files
See `docs/ARCHITECTURE.md` for the build contract (state model, actions, selectors, app contract, hooks).

## Tools
```bash
NODE_PATH=/opt/node22/lib/node_modules node twaa/os/tools/smoke.js [--dark] [--w 390 --h 844]   # every route renders, no errors, no overflow
NODE_PATH=/opt/node22/lib/node_modules node twaa/os/tools/scenarios-e2e.js                      # all 14 scenarios through the director
node twaa/os/tools/bundle.js                                                                     # rebuild dist/twaa-business-os.html
```

Demo data (people, merchants, prices, volumes) is illustrative. State lives in the browser (localStorage) and resets from the home page or automatically after 8 hours.
