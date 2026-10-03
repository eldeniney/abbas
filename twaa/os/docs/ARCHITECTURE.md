# Twaa Business OS — architecture & build contract

One operating platform with four faces — **Customer app, Merchant app, Rider app, Control Center** — all reading and writing **one central store**. Arabic-first, RTL, no build step, no network dependencies except Google Fonts. Open `twaa/os/index.html`.

Source of truth for the business logic: `docs/MASTER_PROMPT.md` (the design brief) and the operating blueprint in `twaa/ops-blueprint/` (exception codes `EX-…`, business rules `BR-…`, process ids `P01…P25`). Reuse those codes in UI copy where a rule or exception is applied.

## Files (load order = index.html)
| File | Owns |
|---|---|
| `js/util.js` | `TW.ic` icons, formatting (`money`, `num`, `pct`, `clock`, `ago`, `dur`, `esc`), atoms (`chip`, `sev`, `btn`, `kpi`, `table`, `meter`, `empty`, `tip`), charts (`spark`, `bars`, `lines`, `hbars`, `legend`), `norm`/`lev` for Arabic search, `store` (safe localStorage), `logo` |
| `js/data.js` | Master data `TW.D`: zones, hubs, 22 departments + categories, 185 master SKUs (`D.K` = stable keys), 25 merchants, menus, 12 riders, 12 customers, roles, users, permissions, rules, SLAs, segments, leads, waitlist |
| `js/store.js` | State `TW.S`, seed, **actions** (`TW.act`), simulation engine (1 s tick), selectors, ledger, alerts, KPIs |
| `js/shell.js` | Router, app instances, DOM morph, overlays, ecosystem home, live (synchronised) view, scenario director |
| `js/admin.js` | Control Center shell: nav (exact sections of the brief), role-based access, `TW.page()` registry, order 360 drawer/page, reason dialog, assignment dialog, refund dialog, mock map `A.map()` |
| `js/admin-*.js` | Control Center pages |
| `js/customer.js`, `js/merchant.js`, `js/rider.js` | The three external apps |
| `js/scenarios.js` | The 14 clickable end-to-end scenarios (`TW.scenarios`) |
| `css/os.css` | Tokens (light + dark) and all shared components. Module CSS files add only module-specific rules, **tokens only, no literal colours**. |

## Core model (see store.js for every field)
- `S.orders[]` **CustomerOrder** `TW-xxxx`: `lines[]` (each line has `sourceType` hub|merchant, `sourceId`, `foId`, `state` ok|sub_pending|substituted|removed|missing, optional `sub`), `fos[]`, `tasks[]`, `totals`, `pay.method` cod|card|wallet, **`status` (operational)** and **`fin` (financial)** — always shown separately, `events[]`, `decision` (combine/split rationale), `otp`, `caseIds`.
- `S.fos[]` **FulfillmentOrder** `FO-xxxx-n` per source: hub QUEUED→PICKING→PACKED→HANDED_OVER; merchant AWAITING_ACCEPT→PREPARING→READY→HANDED_OVER; REJECTED/TIMEOUT→REROUTED/CANCELLED. `acceptBy`, `prepBy`, `pickupCode`, `packages`, `items[]` (merchant checklist marks), `packCheck`.
- `S.tasks[]` **DeliveryTask** `DT-xxxx[-n]`: WAITING|SCHEDULED→OFFERED→ASSIGNED→AT_PICKUP→PICKED_UP→ARRIVED→DELIVERED | NO_RIDER | FAILED→RTO→RETURNED. `offer` (current offer with `until`), `offers[]` history, `pickups[]` (chain of custody: `scanned`, `at`), `drop`, `cod`, `collected`, `contact[]`, `unreachable`, `pod`, `earn`, `km`, `prog` (0..1 along current leg).
- Money: `S.payments`, `S.cod` (HELD→DEPOSITED→RECONCILED, `variance`), `S.deposits`, `S.refunds`, `S.msettle` (merchant statements with explainable `lines[]`), `S.rsettle`, `S.recon` (daily close steps).
- Ops: `S.inv.h1[skuId]` {onHand, reserved, incoming, damaged, expired, quarantine, bin, reorderPt, cost, velocity, expiryDays}, `S.moves` (stock movements w/ reason+user), `S.pos`, `S.returns`, `S.catReqs`.
- Growth/governance: `S.promos`, `S.campaigns`, `S.segments`, `S.leads`, `S.waitlist`, `S.expansion`, `S.demand`, `S.approvals`, `S.audit`, `S.notes` (notifications, `to` = "customer:c1" | "merchant:m1" | "rider:r1"), `S.users`, `S.rolePerms`, `S.rules`, `S.session` (current customer/merchant/rider/admin user), `S.sim` (auto simulation switches).
- `S.hist`: seeded analytics series (hourly, daily30, funnel, cohorts, activation, cac, catGmv, zoneStats, heat).

## Actions — `TW.act(name, payload, actor)` → `{ok:true,…}` or `{ok:false, error}`
Inside an app use **`inst.act(name, payload)`** (adds the right actor and shows the error toast). Never mutate `TW.S` from UI code.
- Customer: `cust.setAddress` `cust.addAddress` `cust.waitlist` `cust.subPref` `cust.fav` `cust.saveBasket` `cust.notifyMe` `search.log` `cart.add` `cart.addMenu` `cart.qty` `cart.remove` `cart.clear` `cart.promo` `cart.reorder` `cart.applyChanges` `order.place` (idempotent on `idem`) `order.cancel` `order.subDecision` `order.rate` `support.report`
- Merchant: `merchant.mode` (needs `force` when active orders) `fo.accept` `fo.reject` `fo.mark` `fo.ready` `fo.handover` `mcat.add` `mcat.update` `mcat.bulk` `menu.toggle` `mcat.request` `merchant.register` `merchant.dispute`
- Rider: `rider.online` `task.accept` `task.reject` `task.arrivePickup` `task.scan` `task.pickupIssue` `task.arrive` `task.contact` `task.collect` `task.deliver` `task.fail` `rider.deposit`
- Hub: `hub.start` `hub.pick` (picked|empty|damaged) `hub.pack` `inv.adjust` `po.create` `po.receive` `return.inspect`
- Control: `dispatch.assign` `dispatch.reoffer` `route.depart` `fo.callMerchant` `fo.reroute` `fo.cancel` `failed.decide` `payment.reconcile` `cod.resolve` `deposit.verify` `order.cancel`
- Care/finance: `case.assign` `case.note` `case.resolve` `refund.create` `refund.process` `comp.issue` `settlement.pay` `settlement.resolveLine` `settlement.adjust` `rsettle.pay` `recon.step` `recon.close`
- Catalogue/commercial: `catalog.createFromRequest` `catalog.linkRequest` `sku.update` `merchant.status` `merchant.commission` `rider.suspend` `rider.limit` `rider.adjust` `promo.create` `promo.toggle` `campaign.create` `campaign.launch` `segment.create` `lead.move` `lead.create` `zone.update` `zone.launch` `expansion.status`
- Governance: `approval.decide` `rules.update` `role.perm` `user.role` `session.set` `sim.set` `actor.autopilot`
Admin-side actions enforce permissions (`TW.can(perm)`) and mandatory reasons; failures come back as `{ok:false, error}`.

## Selectors
`TW.offers(skuId, zoneId)` ranked offers (availability→ETA→price→reliability) · `TW.bestOffer` · `TW.search(q, zoneId)` → {skus, merchants, menu} (Arabic normalisation, aliases, typo tolerance) · `TW.validateCart(cid, {pay})` → {ok, issues, changes, groups, totals, eta, split, windows} · `TW.cartLines(cid)` · `TW.cart(cid)` · `TW.stage(order)` index into `TW.JOURNEY` (6 customer steps; 6 = delivered; -1 cancelled) · `TW.ledger(order)` per-order P&L lines + contribution · `TW.kpis()` · `TW.alerts()` control-tower items (sev, code, orderId, problem, since, slaAt, owner, loc, money, action, acts) · `TW.reconStatus()` · `TW.riderCandidates(task)` / `TW.riderEligibility(r, t)` · `TW.merchantToday(mid)` · `TW.promoImpact(promo)` · `TW.recommend(order, type)` (chain-of-custody responsibility) · `TW.can(perm)` · `TW.canApprove(approval)` · `TW.roleOf()` · `TW.zoneOfCustomer(cid)` · `TW.hubAvail(sku)` · `TW.merchantAvail(mid, sku)` · `TW.priceAt(sku, type, src)` · `TW.merchantServes(m, zoneId)` · `TW.stChip(kind, status)` / `TW.stLabel` with kinds order|fin|fo|task · `TW.REASONS.*` controlled lists · `TW.PARTY`.

## App contract (shell.js)
```js
TW.apps.customer = { kind: "phone", actorKind: "customer", title, init(inst) {}, render(inst) { return html; }, on: { act(inst, data, el, ev) {} } };
TW.page("control-tower", { render(inst, params) { return html; }, on: { … } });   // Control Center pages
```
- `inst.route` = path segments after the app name (`/customer/order/TW-1043` → `["order","TW-1043"]`); `inst.go(path)`, `inst.back()`, `inst.render()`, `inst.ui` (per-instance UI state), `inst.actorId()` (current customer/merchant/rider id from `S.session`), `inst.toast(text, tone)` (in-app), `TW.toast` (global).
- Re-render is a full template render patched into the DOM (focus, scroll and open selects survive). Render must be pure and fast.
- Built-in `data-act`: `go` (`data-to`), `back`, `ui` (`data-k`,`data-v`), `ui-toggle`, `sheet-close`, `modal-close`, `drawer-close`. Sheets/modals: `TW.sheet(title, body, foot)` (phone apps, rendered inside the app) · `TW.modalWrap` · `TW.drawerWrap` (admin). Inputs: `data-model="key"` (+ `data-live`), selects can use `data-change="act"`. Enter key: `data-enter="act"`.
- Live timers without re-render: `<span class="timer" data-until="${ms}">`, `data-since`, `data-ago`.
- Phone apps must end their render with `TW.inappToast(inst)` and must work in the phone frame (420×860), in the live view (360×760) and full-screen on a real phone (≥360 px wide). Layout: `.app` > `.app-top` + `.app-scroll` + `.tabbar`.
- Control Center pages: use `A.head(title, sub, tools)`, `A.answer({what, attention, owner, risk})` where useful, `A.orderLink(id)`, `A.openOrder(inst,id)`, `A.ask(inst, {title, action, payload, reasons, extra, confirm, danger, note})` for any action needing a reason, `A.permBtn(perm, label, act, opts)` for permission-gated buttons, `A.map(opts)` for the mock map, `A.st(kind,status)`.

## Non-negotiables
1. Arabic-first, natural Egyptian Arabic for customer/merchant/rider copy; admin may use technical terms (keep codes like EX-MER-001 visible where a rule fires).
2. Operational status and financial status are separate everywhere an order appears.
3. Every money/integrity action needs: reason from a controlled list (+ optional note), a visible financial effect, an approval tier when above limits, and lands in `S.audit` (store actions do the audit — just call them).
4. No free text where a controlled list exists (reasons, categories, merchant types, vehicle types, handling).
5. Colours only via CSS tokens; light and dark both work. No emoji as icons (use `TW.ic`). No `alert/confirm/prompt`, no `<a download>`, no network calls.
6. No dead buttons: every visible control does something meaningful in the demo state, or is visibly locked with the reason.
7. Mobile: page never scrolls horizontally; tables sit in `.tw` containers.

## Scenario hooks (`data-hl="…"`) used by scenarios.js
Customer: `cust-location` `cust-search` `cust-cart-btn` `cart-groups` `cust-checkout` `cust-journey` `cust-sub` `cust-report` · Merchant: `merch-mode` `merch-new` `merch-accept` `merch-prep` `merch-ready` `merch-handover` `merch-add` `merch-missing` `merch-why` · Rider: `rider-online` `rider-offer` `rider-scan` `rider-deliver` `rider-contact` `rider-cash-meter` `rider-deposit` · Admin: `ct-table` `dispatch-map` `pick-queue` `cod-deposits` `case-custody` `approvals-list` `lead-<leadId>` `catreq` `exp-<zoneId>` `promo-builder` `recon-steps` `route-<zoneId>` `ops-kanban` `exec-flags`

## Testing
`NODE_PATH=/opt/node22/lib/node_modules node twaa/os/tools/smoke.js [--shots --out DIR] [--dark] [--w 390 --h 844] hash…` — fails on page errors, console errors, render errors or horizontal overflow.
