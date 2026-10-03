/* Twaa Business OS — Customer app (توّا). Arabic-first, phone app wired to the central store.
   Routes (inst.route): "" home · categories · dept/:id · shops/:type? · search · product/:sku · store/:mid · cart · checkout ·
   orders · order/:id · account · account/(addresses|wallet|favs|baskets|notes|subs|help|points)
   Per-instance UI state lives in inst.ui. Never mutates TW.S — everything goes through inst.act(). */
(function () {
const TW = window.TW, D = TW.D;
const { ic, esc, money, num } = TW;
const S = () => TW.S;
const find = (arr, id) => arr.find((x) => x.id === id);
const sum = TW.sum;

/* ===================================================================== customer-side helper actions ===================== */
/* masked call / quick chat to the rider — recorded on the order timeline and pushed to the rider app */
if (!TW.actions["cust.msg"]) TW.actions["cust.msg"] = ({ orderId, kind, text }) => {
  const o = find(TW.S.orders, orderId); if (!o) return { ok: false, error: "الطلب مش موجود" };
  const t = TW.S.tasks.find((x) => x.orderId === o.id && x.riderId && !["DELIVERED", "CANCELLED", "FAILED", "RETURNED"].includes(x.status));
  if (!t) return { ok: false, error: "لسه مفيش مندوب على الطلب — هنبلغك أول ما نلاقيه" };
  o.events.push({ at: Date.now(), code: kind === "call" ? "CUST_CALL" : "CUST_MSG", text: kind === "call" ? "العميل اتصل بالمندوب عبر رقم توّا الوسيط (الرقمين مخفيين)" : `رسالة من العميل للمندوب: «${text}»`, who: "customer" });
  TW.notify(`rider:${t.riderId}`, kind === "call" ? "العميل بيتصل بيك" : "رسالة من العميل", kind === "call" ? `${o.id} — مكالمة عبر الرقم الوسيط` : `${o.id}: ${text}`, { orderId: o.id, taskId: t.id });
  return { ok: true };
};
/* add a saved basket / suggested basket to the cart from the best source available in the customer's zone right now */
if (!TW.actions["cust.basketToCart"]) TW.actions["cust.basketToCart"] = ({ customerId, lines = [] }) => {
  const A = TW.actions, zid = TW.zoneOfCustomer(customerId).id; let added = 0, skipped = 0;
  lines.forEach((l) => {
    let r;
    if (l.menuItemId) r = A["cart.addMenu"]({ customerId, merchantId: l.merchantId, menuItemId: l.menuItemId, mods: l.mods || [], qty: l.qty || 1 });
    else { const o = TW.bestOffer(l.skuId, zid); r = o ? A["cart.add"]({ customerId, skuId: l.skuId, sourceType: o.sourceType, sourceId: o.sourceId, qty: l.qty || 1 }) : { ok: false }; }
    if (r && r.ok === false) skipped++; else added++;
  });
  if (!added) return { ok: false, error: "ولا منتج من دول متاح دلوقتي في منطقتك" };
  return { ok: true, added, skipped };
};

/* ===================================================================== per-render memo ===================== */
let M = null;
const memo = (k, f) => { if (!M) return f(); if (M.has(k)) return M.get(k); const v = f(); M.set(k, v); return v; };
const skuMap = () => memo("skus", () => new Map(S().skus.map((s) => [s.id, s])));
const sku = (id) => skuMap().get(id);
const DEPT = Object.fromEntries(D.depts.map((d) => [d.id, d]));
const catName = (dept, cat) => ((D.cats[dept] || []).find((c) => c[0] === cat) || [cat, cat])[1];
const best = (id, zid) => memo(`b|${id}|${zid}`, () => TW.bestOffer(id, zid));
const offersOf = (id, zid) => memo(`o|${id}|${zid}`, () => TW.offers(id, zid));
const m$ = (n) => money(n, Math.abs(n - Math.round(n)) < 0.005 ? 0 : 2);

/* ===================================================================== customer context ===================== */
function ctx(inst) {
  const cid = inst.actorId(); const c = find(S().customers, cid) || S().customers[0];
  const addr = c.addresses.find((a) => a.id === c.addr) || c.addresses[0];
  const z = find(S().zones, addr.zoneId);
  return { cid: c.id, c, addr, z };
}
const cartOf = (cid) => S().carts[cid] || null;
const cartLinesSafe = (cid) => (cartOf(cid) && cartOf(cid).lines.length ? memo(`cl|${cid}`, () => TW.cartLines(cid)) : []);
const lineFor = (cid, skuId, srcId) => { const ct = cartOf(cid); if (!ct) return null; return ct.lines.find((l) => l.skuId === skuId && l.sourceId === srcId) || (srcId ? null : ct.lines.find((l) => l.skuId === skuId)) || null; };
const anyLineFor = (cid, skuId, srcId) => lineFor(cid, skuId, srcId) || lineFor(cid, skuId, null);
const custOrders = (cid) => memo(`co|${cid}`, () => S().orders.filter((o) => o.customerId === cid).sort((a, b) => b.createdAt - a.createdAt));
const isLive = (o) => !["DELIVERED", "CANCELLED", "RETURNED"].includes(o.status);

/* ===================================================================== time / ETA ===================== */
function fmtWin(w) {
  if (!w) return ""; const [a, b] = String(w).split(/[–-]/).map((x) => parseInt(x, 10));
  if (isNaN(a) || isNaN(b)) return w;
  const h = (x) => `${x % 12 || 12}`, ap = (x) => (x >= 12 ? "م" : "ص");
  return ap(a) === ap(b) ? `${h(a)} – ${h(b)} ${ap(b)}` : `${h(a)} ${ap(a)} – ${h(b)} ${ap(b)}`;
}
function nextWindow(z) {
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
  for (const w of z.windows || []) { const s = parseInt(w, 10); if (s - 0.75 > h) return { w, today: true }; }
  return z.windows && z.windows[0] ? { w: z.windows[0], today: false } : null;
}
function zoneEta(z) {
  if (!z.active) return { t: "لسه موصلناش", short: "قريباً", tone: "warn", off: true };
  if (z.route === "scheduled") { const nw = nextWindow(z); return { t: nw ? `رحلة ${nw.today ? "النهارده" : "بكرة"} ${fmtWin(nw.w)}` : "رحلات مجدولة", short: nw ? fmtWin(nw.w) : "رحلة", sched: true, nw }; }
  return { t: `${z.sla[0]}–${z.sla[1]} دقيقة`, short: `${z.sla[0]}–${z.sla[1]} د`, fast: z.type === "core" };
}
const offerEta = (o, z) => (o && o.eta ? `${o.eta[0]}–${o.eta[1]} د` : zoneEta(z).short);
function merchantEta(m, z) { if (z.route === "scheduled") return zoneEta(z).short; const extra = m.busyExtra || 0; return `${Math.max(z.sla[0], m.prep + 12 + extra)}–${Math.max(z.sla[1], m.prep + 22 + extra)} د`; }
function slotsToday() {
  const d = new Date(); const out = []; let h = d.getHours() + 2;
  while (out.length < 4 && h < 24) { out.push(`${String(h).padStart(2, "0")}:00 – ${String((h + 1) % 24).padStart(2, "0")}:00`); h++; }
  return out;
}

/* ===================================================================== merchants ===================== */
const M_IC = { supermarket: "store", grocery: "bag", restaurant: "food", pharmacy: "pill", bakery: "bread", butcher: "meat", produce: "carrot", sweets: "candy", electronics: "mobile", stationery: "book", beauty: "beauty", home: "kitchen", pets: "paw", dairy: "milk", flowers: "flower", seafood: "fish" };
const M_TONE = { supermarket: 1, grocery: 1, restaurant: 4, pharmacy: 6, bakery: 5, butcher: 4, produce: 2, sweets: 5, electronics: 3, stationery: 2, beauty: 7, home: 1, pets: 5, dairy: 3, flowers: 8, seafood: 3 };
const M_LBL = { pharmacy: "صيدلية", bakery: "مخبز", butcher: "جزارة", produce: "خضري", sweets: "حلواني", electronics: "موبايلات", stationery: "مكتبة", supermarket: "سوبر ماركت", grocery: "بقالة", dairy: "ألبان", seafood: "أسماك", beauty: "تجميل", home: "أدوات منزلية", pets: "حيوانات أليفة", flowers: "ورد وهدايا" };
const SHOP_ORDER = ["pharmacy", "bakery", "butcher", "produce", "sweets", "electronics", "stationery", "supermarket", "grocery", "dairy", "seafood", "beauty", "home", "pets", "flowers"];
const mType = (m) => (m.type === "restaurant" ? (D.cuisine[m.cuisine] || "مطعم") : M_LBL[m.type] || D.merchantTypes[m.type] || m.type);
const servingMerchants = (zid) => memo(`sm|${zid}`, () => S().merchants.filter((m) => TW.merchantServes(m, zid)));
function mStatus(m) { if (m.mode === "closed") return TW.chip("مقفول دلوقتي", "neutral"); if (m.mode === "busy") return TW.chip("زحمة شوية", "warn"); return TW.chip("مفتوح", "ok"); }

/* ===================================================================== order wording for customers ===================== */
function custStatus(o) {
  if (o.status === "CANCELLED") return ["اتلغى", "neutral"];
  if (o.status === "DELIVERED") return ["وصل", "ok"];
  if (o.status === "AWAITING_CUSTOMER_DECISION") return ["محتاجين رأيك", "warn"];
  if (o.status === "PAYMENT_PENDING") return ["بنأكد الدفع", "warn"];
  if (o.status === "MERCHANT_ISSUE") return ["بنظبط مشكلة مع المحل", "warn"];
  if (o.status === "DELIVERY_FAILED") return ["مقدرناش نوصلك", "bad"];
  if (["RETURN_TO_ORIGIN", "RETURNED"].includes(o.status)) return ["رجع للمحل", "neutral"];
  if (o.status === "PARTIALLY_DELIVERED") return ["جزء وصل والباقي جاي", "info"];
  if (o.status === "SCHEDULED") return [`على رحلة ${fmtWin(orderWindow(o))}`, "info"];
  const st = TW.stage(o); return [TW.JOURNEY[Math.max(0, Math.min(5, st))], st >= 3 ? "brand" : "info"];
}
const FIN = { UNPAID: ["مش مدفوع", "neutral"], PAYMENT_PENDING: ["بنأكد الدفع", "warn"], PAID: ["مدفوع أونلاين", "ok"], COD_PENDING: ["كاش عند الاستلام", "info"], COD_COLLECTED: ["اتدفع كاش", "ok"], SETTLEMENT_PENDING: ["اتدفع", "ok"], RECONCILED: ["اتدفع", "ok"], FINANCIALLY_CLOSED: ["اتدفع", "ok"], REFUNDED: ["اترد المبلغ", "neutral"], PARTIALLY_REFUNDED: ["اترد جزء", "info"], VOID: ["مفيش مبلغ مستحق", "neutral"], RECON_REQUIRED: ["بنراجع الحساب", "warn"] };
const finChip = (o) => { const [t, tone] = FIN[o.fin] || [o.fin, "neutral"]; return TW.chip(t, tone, o.pay.method === "cod" ? "cash" : o.pay.method === "wallet" ? "wallet" : "card"); };
const PAY_LBL = { cod: "كاش عند الاستلام", card: "بطاقة", wallet: "محفظة توّا" };
const orderTasks = (o) => S().tasks.filter((t) => t.orderId === o.id && t.status !== "CANCELLED");
function orderWindow(o) { if (o.window) return o.window; const t = orderTasks(o).find((x) => x.window); return t ? t.window : null; }
function orderEta(o) {
  if (o.status === "DELIVERED") return o.deliveredAt ? `وصل ${TW.clock(o.deliveredAt)}` : "وصل";
  if (o.status === "CANCELLED") return "الطلب اتلغى";
  const w = orderWindow(o); if (o.status === "SCHEDULED" || (o.mode === "scheduled" && w)) return `هيوصل على رحلة ${fmtWin(w)}`;
  const rem = Math.round((o.etaAt - Date.now()) / 60000);
  if (TW.stage(o) === 5) return "المندوب عند الباب";
  return rem > 1 ? `هيوصلك خلال ~${rem} دقيقة` : "قرّب يوصل";
}
const itemsSummary = (o) => { const n = o.lines.map((l) => (l.sub ? l.sub.name : l.name)); return n.slice(0, 2).join("، ") + (n.length > 2 ? ` و${n.length - 2} كمان` : ""); };

/* ===================================================================== personalised lists ===================== */
const CYCLE = { dairy: 2, bakery: 1, produce: 3, water: 3, meat: 5, grocery: 7, snacks: 4, frozen: 7, cleaning: 14, care: 21, baby: 7, local: 3, beauty: 30, pharmacy: 20, pets: 10 };
function hist(cid) {
  return memo(`h|${cid}`, () => {
    const last = {}, cnt = {};
    custOrders(cid).filter((o) => o.status !== "CANCELLED").forEach((o) => o.lines.forEach((l) => { if (l.kind !== "sku" || l.state === "removed") return; const id = l.sub ? l.sub.skuId : l.skuId; cnt[id] = (cnt[id] || 0) + 1; last[id] = Math.max(last[id] || 0, o.createdAt); }));
    return { last, cnt };
  });
}
const availSkus = (zid) => memo(`as|${zid}`, () => S().skus.filter((s) => s.active && !s.regulated && best(s.id, zid)));
function boughtBefore(x) { const h = hist(x.cid); return Object.keys(h.last).sort((a, b) => h.last[b] - h.last[a]).map(sku).filter((s) => s && !s.regulated && best(s.id, x.z.id)); }
function needAgain(x) {
  const h = hist(x.cid), now = Date.now();
  return Object.keys(h.last).map((id) => { const s = sku(id); if (!s) return null; const days = (now - h.last[id]) / 864e5; const cyc = CYCLE[s.dept] || 10; return { s, days, r: days / cyc }; })
    .filter((e) => e && e.r >= 0.6 && best(e.s.id, x.z.id)).sort((a, b) => b.r - a.r);
}
function popularNear(x) {
  return memo(`pop|${x.z.id}`, () => {
    const cnt = {}; S().orders.filter((o) => o.zoneId === x.z.id).forEach((o) => o.lines.forEach((l) => { if (l.kind === "sku") cnt[l.skuId] = (cnt[l.skuId] || 0) + l.qty; }));
    const vel = (s) => ((S().inv.h1[s.id] || {}).velocity || 0);
    return availSkus(x.z.id).slice().sort((a, b) => (cnt[b.id] || 0) - (cnt[a.id] || 0) || vel(b) - vel(a)).slice(0, 12);
  });
}
const dealsNear = (x) => availSkus(x.z.id).filter((s) => s.oldPrice && best(s.id, x.z.id).price < s.oldPrice).sort((a, b) => (b.oldPrice - b.price) / b.oldPrice - (a.oldPrice - a.price) / a.oldPrice);
function newIn(x) {
  const out = [], seen = new Set();
  servingMerchants(x.z.id).filter((m) => S().msku[m.id]).flatMap((m) => Object.entries(S().msku[m.id]).map(([id, v]) => [id, v.updatedAt])).sort((a, b) => b[1] - a[1])
    .forEach(([id]) => { if (out.length >= 10 || seen.has(id)) return; seen.add(id); const s = sku(id); if (s && !s.regulated && best(id, x.z.id)) out.push(s); });
  return out;
}
const localNear = (x) => availSkus(x.z.id).filter((s) => s.local || s.dept === "local");
function promosFor(x) {
  return S().promos.filter((p) => p.status === "active" && p.code && (p.zones === "all" || p.zones.split(",").includes(x.z.id)) && (p.segment !== "sg-new" || x.c.orders === 0) && (p.segment !== "sg-village" || x.z.type !== "core"));
}

/* ===================================================================== atoms ===================== */
const tileIcon = (s, cls = "ic") => { const d = DEPT[s.dept] || DEPT.grocery; return { tone: d.tone, svg: ic(d.icon, cls) }; };
const offPct = (s, price) => (s.oldPrice && price < s.oldPrice ? Math.round(((s.oldPrice - price) / s.oldPrice) * 100) : 0);
const stepper = (key, q, lg) => `<div class="cu-step ${lg ? "lg" : ""}"><button type="button" data-act="qty" data-key="${esc(key)}" data-q="${q - 1}" aria-label="${q === 1 ? "شيل من السلة" : "قلّل"}">${ic(q === 1 ? "trash" : "minus", "ic xs")}</button><span class="num" aria-live="polite">${q}</span><button type="button" data-act="qty" data-key="${esc(key)}" data-q="${q + 1}" aria-label="زوّد">${ic("plus", "ic xs")}</button></div>`;
const addBtn = (s, o) => `<button type="button" class="cu-add" data-act="add" data-sku="${s.id}" data-type="${o.sourceType}" data-src="${o.sourceId}" aria-label="ضيف ${esc(s.ar)} للسلة">${ic("plus", "ic sm")}</button>`;
function qtyCtl(x, s, o) {
  if (s.regulated) return `<button type="button" class="cu-add lock" data-act="go" data-to="/customer/product/${s.id}" aria-label="محتاج روشتة">${ic("rx", "ic sm")}</button>`;
  if (!o) return "";
  const l = anyLineFor(x.cid, s.id, o.sourceId);
  return l ? stepper(l.key, l.qty) : addBtn(s, o);
}
/* product card — tile, price, name, size, one meta line (source or ETA). opts.src forces a specific offer (store page). */
function pcard(x, s, opts = {}) {
  const o = opts.offer !== undefined ? opts.offer : best(s.id, x.z.id);
  const price = o ? o.price : s.price, off = offPct(s, price), t = tileIcon(s);
  const meta = s.regulated ? `<span class="cu-mt warn">${ic("rx", "ic xs")}بروشتة</span>` : !o ? `<span class="cu-mt bad">المنتج خلص حالياً</span>` : opts.noMeta ? "" : o.sourceType === "merchant" ? `<span class="cu-mt">${ic("store", "ic xs")}<span class="cu-ell">${esc(o.label)}</span></span>` : `<span class="cu-mt">${ic(x.z.route === "scheduled" ? "calendar" : "bolt", "ic xs")}<span class="cu-ell">${esc(offerEta(o, x.z))}</span></span>`;
  return `<article class="cu-card ${o || s.regulated ? "" : "off"}">
    <div class="cu-iw"><button type="button" class="cu-img tone-${t.tone}" data-act="go" data-to="/customer/product/${s.id}" aria-label="${esc(s.ar)}">${t.svg}${off ? `<span class="cu-off num">خصم ${off}%</span>` : ""}${s.local ? `<span class="cu-loc">بلدي</span>` : ""}</button><div class="cu-qa">${qtyCtl(x, s, o)}</div></div>
    <div class="cu-pr"><b class="num">${m$(price)}</b>${off ? `<s class="num">${num(s.oldPrice)}</s>` : ""}</div>
    <div class="cu-nm">${esc(s.ar)}</div><div class="cu-sz">${esc(s.size)}</div>${meta}</article>`;
}
const strip = (x, list, opts) => (list.length ? `<div class="cu-hs">${list.map((s) => pcard(x, s, opts)).join("")}</div>` : "");
const grid = (x, list, opts) => `<div class="cu-grid">${list.map((s) => pcard(x, s, opts)).join("")}</div>`;
const sec = (title, sub, more, icn) => `<div class="cu-sec"><div class="grow"><h3>${icn ? ic(icn, "ic sm") : ""}${title}</h3>${sub ? `<p>${sub}</p>` : ""}</div>${more ? `<button type="button" class="cu-more" data-act="go" data-to="${more}">الكل ${ic("chevE", "ic xs")}</button>` : ""}</div>`;
function shopCard(x, m, compact) {
  const closed = m.mode === "closed";
  return `<button type="button" class="cu-shop ${closed ? "off" : ""} ${compact ? "mini" : ""}" data-act="go" data-to="/customer/store/${m.id}">
    <span class="tile tone-${M_TONE[m.type] || 1} cu-shop-ic">${ic(M_IC[m.type] || "store", compact ? "ic" : "ic lg")}</span>
    <span class="grow cu-shop-b"><b class="cu-ell">${esc(m.ar)}</b><small class="cu-ell">${esc(mType(m))}${m.rating ? ` · ${ic("star", "ic xs")} ${num(m.rating, 1)}` : ""}</small>${compact ? `<small class="num">${closed ? "مقفول دلوقتي" : esc(merchantEta(m, x.z))}</small>` : `<small class="num">${ic("clock", "ic xs")} ${esc(merchantEta(m, x.z))} · توصيل ${money(x.z.fee)}</small>`}</span>
    ${compact ? "" : mStatus(m)}</button>`;
}
function top(x, title, opts = {}) {
  return `<div class="app-top cu-top">${opts.noBack ? "" : `<button type="button" class="btn icon ghost cu-back" data-act="back" aria-label="رجوع">${ic("chevS")}</button>`}<div class="grow cu-tt"><h2 class="cu-ell">${title}</h2>${opts.noLoc ? "" : locLine(x)}</div>${opts.right || ""}</div>`;
}
function locLine(x) { const e = zoneEta(x.z); return `<button type="button" class="cu-locline" data-act="loc" data-hl="cust-location" aria-label="غيّر عنوان التوصيل">${ic("pin", "ic xs")}<span class="cu-ell">${esc(x.addr.label)} · ${esc(x.z.ar)}</span><b class="cu-eta ${e.sched ? "sched" : ""} ${e.off ? "off" : ""}">${ic(e.sched ? "calendar" : "bolt", "ic xs")}<span class="num">${esc(e.short)}</span></b>${ic("chevD", "ic xs")}</button>`; }
const cartIconBtn = (x) => { const n = sum(cartOf(x.cid) ? cartOf(x.cid).lines : [], (l) => l.qty); return `<button type="button" class="btn icon ghost cu-cartic" data-act="go" data-to="/customer/cart" aria-label="السلة">${ic("cart")}${n ? `<span class="cu-badge num">${n}</span>` : ""}</button>`; };

/* ===================================================================== HOME ===================== */
function vHome(inst, x) {
  const e = zoneEta(x.z);
  const live = custOrders(x.cid).filter(isLive).slice(0, 2);
  const head = `<div class="app-top cu-hhead">
    <div class="cu-hrow"><span class="cu-logo">${TW.logo("currentColor", "var(--logo-spark)")}</span>
      <button type="button" class="cu-addr grow" data-act="loc" data-hl="cust-location" aria-label="غيّر عنوان التوصيل">
        <span class="cu-addr-l">${ic("pin", "ic xs")} التوصيل لـ <b class="cu-ell">${esc(x.addr.label)} · ${esc(x.z.ar)}</b>${ic("chevD", "ic xs")}</span>
        <span class="cu-addr-e ${e.sched ? "sched" : ""} ${e.off ? "off" : ""}">${ic(e.sched ? "calendar" : e.off ? "info" : "bolt", "ic xs")}<span class="num">${e.sched ? esc(e.t) : e.off ? "لسه موصلناش منطقتك" : `هيوصلك خلال ${esc(e.t)}`}</span></span></button>
      <button type="button" class="btn icon ghost cu-bell" data-act="go" data-to="/customer/account/notes" aria-label="الإشعارات">${ic("bell")}${unread(x) ? `<span class="cu-badge num">${unread(x)}</span>` : ""}</button></div>
    <button type="button" class="cu-search" data-act="tab-search" data-hl="cust-search">${ic("search")}<span>عايز إيه؟ دور على المنتج أو المحل</span></button></div>`;
  if (!x.z.active) {
    return { top: head, body: `<div class="cu-pad"><div class="banner warn">${ic("info", "ic sm")}<div><b>لسه موصلناش ${esc(x.z.ar)}.</b> سجّل في قائمة الانتظار وهنبلغك أول ما نبدأ. ممكن كمان تختار عنوان تاني.</div></div><div class="row wrap" style="margin-top:10px">${x.c.waitlist.includes(x.z.id) ? TW.chip("أنت في قائمة الانتظار", "ok", "check") : `<button type="button" class="btn accent" data-act="waitlist" data-zone="${x.z.id}">${ic("bell", "ic sm")}سجّلني في قائمة الانتظار</button>`}<button type="button" class="btn" data-act="loc">غيّر العنوان</button></div></div>` };
  }
  const liveCards = live.map((o) => {
    const st = TW.stage(o), [lbl, tone] = custStatus(o);
    return `<button type="button" class="cu-live ${tone === "warn" ? "attn" : ""}" data-act="go" data-to="/customer/order/${o.id}"><span class="cu-live-ic">${ic(st >= 2 ? "bike" : o.status === "AWAITING_CUSTOMER_DECISION" ? "alert" : "box", "ic")}</span>
      <span class="grow"><small>طلبك الحالي · <span class="mono">${o.id}</span></small><b>${esc(lbl)}</b><small class="num">${esc(orderEta(o))}</small><span class="cu-live-bar">${TW.JOURNEY.map((_, i) => `<i class="${i <= st ? "on" : ""}"></i>`).join("")}</span></span><span class="cu-live-go">تابع ${ic("chevE", "ic xs")}</span></button>`;
  }).join("");
  const modes = `<div class="cu-modes">
    <button type="button" class="cu-mode tone-2" data-act="go" data-to="/customer/categories"><span class="cu-mode-ic">${ic("bag", "ic lg")}</span><b>احتياجات البيت</b><small>بقالة وألبان وخضار ومنظفات</small></button>
    <button type="button" class="cu-mode tone-4" data-act="go" data-to="/customer/dept/food"><span class="cu-mode-ic">${ic("food", "ic lg")}</span><b>أكل ومطاعم</b><small>${servingMerchants(x.z.id).filter((m) => m.type === "restaurant" && m.mode !== "closed").length} مطعم فاتح دلوقتي</small></button>
    <button type="button" class="cu-mode tone-6" data-act="go" data-to="/customer/shops"><span class="cu-mode-ic">${ic("store", "ic lg")}</span><b>محلات حواليك</b><small>صيدلية، مخبز، جزارة…</small></button></div>`;
  const types = SHOP_ORDER.filter((t) => servingMerchants(x.z.id).some((m) => m.type === t)).slice(0, 8);
  const shopChips = types.length ? `<div class="cu-chips cu-hs-chips">${types.map((t) => `<button type="button" class="cu-tchip" data-act="go" data-to="/customer/shops/${t}"><span class="tile tone-${M_TONE[t]}">${ic(M_IC[t], "ic sm")}</span>${esc(M_LBL[t])}</button>`).join("")}</div>` : "";
  const promos = promosFor(x).slice(0, 4);
  const promoRow = promos.length ? `<div class="cu-hs cu-promos">${promos.map((p, i) => `<button type="button" class="cu-promo p${i % 3}" data-act="promo-use" data-code="${esc(p.code)}"><b>${esc(p.name)}</b><small>${p.minBasket ? `على طلب من ${money(p.minBasket)}` : "على أي طلب"}</small><span class="cu-code mono">${esc(p.code)}</span></button>`).join("")}</div>` : "";
  const bb = boughtBefore(x).slice(0, 10), na = needAgain(x).slice(0, 8);
  const fast = servingMerchants(x.z.id).filter((m) => m.mode !== "closed").sort((a, b) => a.prep + (a.busyExtra || 0) - b.prep - (b.busyExtra || 0)).slice(0, 6);
  const deals = dealsNear(x).slice(0, 10), loc = localNear(x).slice(0, 10), ni = newIn(x);
  const depts = `<div class="cu-depts">${D.depts.map((d) => `<button type="button" class="cu-dept" data-act="go" data-to="/customer/dept/${d.id}"><span class="tile tone-${d.tone}">${ic(d.icon)}</span><span>${esc(d.ar)}</span></button>`).join("")}</div>`;
  const body = `${liveCards ? `<div class="cu-pad cu-pad-t">${liveCards}</div>` : ""}
    <div class="cu-pad cu-pad-t">${modes}</div>${shopChips}${promoRow}
    ${bb.length ? sec("اشتريتهم قبل كده", "اطلبهم تاني بضغطة", "/customer/account/baskets", "history") + strip(x, bb) : ""}
    ${na.length ? sec("محتاجهم تاني؟", `${esc(na[0].s.ar)} اشتريته من ${num(Math.max(1, Math.round(na[0].days)))} يوم`, null, "refresh") + strip(x, na.map((e) => e.s)) : ""}
    ${sec("الأكثر طلباً حواليك", `في ${esc(x.z.ar)}`, null, "trend")}${strip(x, popularNear(x))}
    ${deals.length ? sec("عروض قريبة منك", "أسعار أقل من المعتاد", "/customer/dept/deals", "tag") + strip(x, deals) : ""}
    ${ni.length ? sec("وصل جديد", "منتجات نزلت في المحلات اللي حواليك", null, "sparkle") + strip(x, ni) : ""}
    ${fast.length ? sec("جاهز بسرعة", "محلات ومطاعم تجهيزها سريع", "/customer/shops", "bolt") + `<div class="cu-hs cu-hs-shops">${fast.map((m) => shopCard(x, m, true)).join("")}</div>` : ""}
    ${loc.length ? sec("منتجات من بلدنا", "من مزارع ومخابز البحيرة", "/customer/dept/local", "leaf") + strip(x, loc) : ""}
    ${sec("كل الأقسام", `${D.depts.length} قسم`, "/customer/categories", "grid")}<div class="cu-pad">${depts}</div>
    <p class="cu-foot-note">${ic("shield", "ic xs")} بنعرضلك بس المنتجات المتاحة فعلاً في ${esc(x.z.ar)} دلوقتي.</p>`;
  return { top: head, body };
}
const unread = (x) => memo(`un|${x.cid}`, () => S().notes.filter((n) => n.to === `customer:${x.cid}` && Date.now() - n.at < 30 * 60000).length);

/* ===================================================================== CATEGORIES / DEPT / SHOPS ===================== */
function deptCount(x, id) { return memo(`dc|${id}|${x.z.id}`, () => (id === "food" ? servingMerchants(x.z.id).filter((m) => m.type === "restaurant").length : availSkus(x.z.id).filter((s) => s.dept === id).length)); }
function vCategories(inst, x) {
  const home = D.depts.filter((d) => d.id !== "food");
  const types = SHOP_ORDER.filter((t) => servingMerchants(x.z.id).some((m) => m.type === t));
  const body = `<div class="cu-pad cu-pad-t"><button type="button" class="cu-foodban" data-act="go" data-to="/customer/dept/food"><span class="tile tone-4">${ic("food", "ic lg")}</span><span class="grow"><b>أكل ومطاعم</b><small>${deptCount(x, "food")} مطعم بيوصل لـ ${esc(x.z.ar)}</small></span>${ic("chevE", "ic sm")}</button></div>
    ${sec("احتياجات البيت", "اختار القسم", null, "bag")}<div class="cu-pad"><div class="cu-catlist">${home.map((d) => { const n = deptCount(x, d.id); return `<button type="button" class="cu-catrow ${n ? "" : "dim"}" data-act="go" data-to="/customer/dept/${d.id}"><span class="tile tone-${d.tone}">${ic(d.icon)}</span><span class="grow"><b>${esc(d.ar)}</b><small>${n ? `${num(n)} منتج متاح` : "مش متاح في منطقتك دلوقتي"}</small></span>${ic("chevE", "ic xs")}</button>`; }).join("")}</div></div>
    ${types.length ? sec("محلات حواليك", "اطلب من المحل اللي بتحبه", "/customer/shops", "store") + `<div class="cu-chips cu-pad cu-wrap">${types.map((t) => `<button type="button" class="cu-tchip" data-act="go" data-to="/customer/shops/${t}"><span class="tile tone-${M_TONE[t]}">${ic(M_IC[t], "ic sm")}</span>${esc(M_LBL[t])}</button>`).join("")}</div>` : ""}`;
  return { top: top(x, "الأقسام", { noBack: true, right: cartIconBtn(x) }), body };
}
function vDept(inst, x, id) {
  const d = DEPT[id]; if (!d) return notFound(x, "القسم ده مش موجود");
  if (id === "food") return vFood(inst, x);
  const key = `cat_${id}`, cur = inst.ui[key] || "all";
  const all = S().skus.filter((s) => s.active && s.dept === id);
  const av = all.filter((s) => s.regulated || best(s.id, x.z.id));
  const cats = (D.cats[id] || []).map(([c, ar]) => [c, ar, av.filter((s) => s.cat === c).length]).filter((c) => c[2] > 0);
  const list = av.filter((s) => cur === "all" || s.cat === cur).sort((a, b) => !!best(b.id, x.z.id) - !!best(a.id, x.z.id) || (a.regulated - b.regulated));
  const hidden = all.length - av.length;
  const shops = servingMerchants(x.z.id).filter((m) => (D.typeDepts[m.type] || []).includes(id) && m.type !== "supermarket").slice(0, 6);
  const chips = `<div class="cu-chips cu-sticky" role="tablist">${[["all", "الكل", av.length], ...cats].map(([c, ar, n]) => `<button type="button" role="tab" aria-selected="${cur === c}" class="cu-chip ${cur === c ? "on" : ""}" data-act="ui" data-k="${key}" data-v="${c}">${esc(ar)} <span class="num">${n}</span></button>`).join("")}</div>`;
  const body = `${chips}<div class="cu-pad cu-pad-t">${list.length ? grid(x, list) : `<div class="card">${TW.empty("مفيش منتجات متاحة هنا دلوقتي", `المحلات اللي بتوصل لـ ${x.z.ar} مش عارضة القسم ده حالياً.`, d.icon)}</div>`}
    ${hidden > 0 ? `<p class="cu-foot-note">${ic("info", "ic xs")} ${num(hidden)} منتج تاني في القسم ده مش متاح في ${esc(x.z.ar)} دلوقتي — مش بنعرضهم عشان منحيرّكش.</p>` : ""}</div>
    ${shops.length ? sec("محلات بتبيع القسم ده", null, null, "store") + `<div class="cu-pad col">${shops.map((m) => shopCard(x, m)).join("")}</div>` : ""}`;
  return { top: top(x, esc(d.ar), { right: cartIconBtn(x) }), body };
}
function vFood(inst, x) {
  const all = servingMerchants(x.z.id).filter((m) => m.type === "restaurant");
  const cur = inst.ui.cuisine || "all";
  const cuis = [...new Set(all.map((m) => m.cuisine))];
  const list = all.filter((m) => cur === "all" || m.cuisine === cur).sort((a, b) => (a.mode === "closed") - (b.mode === "closed") || b.rating - a.rating);
  const chips = `<div class="cu-chips cu-sticky">${[["all", "الكل"], ...cuis.map((c) => [c, D.cuisine[c] || c])].map(([c, l]) => `<button type="button" class="cu-chip ${cur === c ? "on" : ""}" data-act="ui" data-k="cuisine" data-v="${c}">${esc(l)}</button>`).join("")}</div>`;
  const dishes = []; all.filter((m) => m.mode !== "closed").forEach((m) => (S().menus[m.id] || []).slice(0, 2).forEach((it) => it.available && dishes.push({ m, it })));
  const body = `${chips}${cur === "all" && dishes.length ? sec("الأكثر طلباً النهارده", null, null, "fire") + `<div class="cu-hs cu-hs-dish">${dishes.slice(0, 8).map(({ m, it }) => dishCard(x, m, it)).join("")}</div>` : ""}
    ${sec("المطاعم", `${list.length} مطعم بيوصل لـ ${esc(x.z.ar)}`, null, "food")}<div class="cu-pad col">${list.length ? list.map((m) => shopCard(x, m)).join("") : `<div class="card">${TW.empty("مفيش مطاعم بتوصل لمنطقتك دلوقتي", "بنضيف مطاعم جديدة كل أسبوع", "food")}</div>`}</div>`;
  return { top: top(x, "أكل ومطاعم", { right: cartIconBtn(x) }), body };
}
const dishCard = (x, m, it) => `<button type="button" class="cu-dish" data-act="menu-open" data-mid="${m.id}" data-item="${it.id}"><span class="tile tone-4">${ic("food", "ic lg")}</span><b class="cu-ell2">${esc(it.name)}</b><small class="cu-ell">${esc(m.ar)}</small><span class="num cu-dish-p">${m$(it.price)}</span></button>`;
function vShops(inst, x, type) {
  const all = servingMerchants(x.z.id).filter((m) => m.type !== "restaurant");
  const types = SHOP_ORDER.filter((t) => all.some((m) => m.type === t));
  const cur = type && types.includes(type) ? type : "all";
  const list = all.filter((m) => cur === "all" || m.type === cur).sort((a, b) => (a.mode === "closed") - (b.mode === "closed") || b.rating - a.rating);
  const chips = `<div class="cu-chips cu-sticky">${[["all", "الكل"], ...types.map((t) => [t, M_LBL[t]])].map(([t, l]) => `<button type="button" class="cu-chip ${cur === t ? "on" : ""}" data-act="go" data-to="/customer/shops${t === "all" ? "" : "/" + t}">${esc(l)}</button>`).join("")}</div>`;
  const body = `${chips}<div class="cu-pad cu-pad-t col">${list.length ? list.map((m) => shopCard(x, m)).join("") : `<div class="card">${TW.empty("مفيش محلات من النوع ده بتوصل لمنطقتك", "جرّب نوع تاني أو ابحث عن المنتج", "store")}</div>`}</div>`;
  return { top: top(x, cur === "all" ? "محلات حواليك" : esc(M_LBL[cur]), { right: cartIconBtn(x) }), body };
}

/* ===================================================================== SEARCH ===================== */
const TRENDING = ["لبن", "عيش", "بانادول", "كشري", "بيبسي", "رز", "شيبسي", "بامبرز"];
function vSearch(inst, x) {
  const q = inst.ui.q || "";
  const input = `<div class="app-top cu-top cu-stop"><button type="button" class="btn icon ghost cu-back" data-act="back" aria-label="رجوع">${ic("chevS")}</button><label class="cu-sfield grow">${ic("search", "ic sm")}<input class="cu-sinput" type="search" data-model="q" data-live data-enter="search-go" data-hl="cust-search" value="${esc(q)}" placeholder="عايز إيه؟ دور على المنتج أو المحل" aria-label="بحث" autocomplete="off" enterkeyhint="search">${q ? `<button type="button" class="cu-sclear" data-act="search-clear" aria-label="امسح">${ic("x", "ic xs")}</button>` : ""}</label></div>`;
  if (!q.trim()) {
    const recent = inst.ui.recent || [];
    const body = `<div class="cu-pad cu-pad-t col gap12">${recent.length ? `<div><div class="cu-lbl">${ic("history", "ic xs")} آخر حاجات دوّرت عليها</div><div class="cu-chips cu-wrap">${recent.map((r) => `<button type="button" class="cu-chip" data-act="search-term" data-q="${esc(r)}">${esc(r)}</button>`).join("")}</div></div>` : ""}
      <div><div class="cu-lbl">${ic("trend", "ic xs")} الناس بتدور على</div><div class="cu-chips cu-wrap">${TRENDING.map((r) => `<button type="button" class="cu-chip" data-act="search-term" data-q="${esc(r)}">${esc(r)}</button>`).join("")}</div></div>
      <div class="banner brand">${ic("sparkle", "ic sm")}<div>اكتب بالعربي أو الإنجليزي، حتى لو فيه غلطة إملائية — <b>«لبن»</b>، <b>«juhayna»</b>، <b>«بانادول»</b> أو اسم المحل.</div></div>
      <div><div class="cu-lbl">${ic("grid", "ic xs")} أو اختار قسم</div><div class="cu-depts">${D.depts.slice(0, 8).map((d) => `<button type="button" class="cu-dept" data-act="go" data-to="/customer/dept/${d.id}"><span class="tile tone-${d.tone}">${ic(d.icon)}</span><span>${esc(d.ar)}</span></button>`).join("")}</div></div></div>`;
    return { top: input, body };
  }
  const r = memo(`s|${q}|${x.z.id}`, () => TW.search(q, x.z.id));
  const nq = TW.norm(q);
  const unavailable = S().skus.filter((s) => s.active && !s.regulated && !r.skus.includes(s) && nq.length >= 2 && [s.ar, s.en, s.brand, ...s.aliases].some((h) => TW.norm(h).includes(nq))).slice(0, 4);
  const n = r.skus.length + r.merchants.length + r.menu.length;
  scheduleLog(inst, q, n, x.z.id);
  let body;
  if (!n) {
    const sugg = suggestDepts(q);
    const done = (inst.ui.notified || []).includes(TW.norm(q));
    body = `<div class="cu-pad cu-pad-t col gap12"><div class="card c cu-nores">${ic("search", "ic xl")}<b>ملقيناش «${esc(q)}» في ${esc(x.z.ar)}</b><p class="muted">ممكن يكون مكتوب بطريقة تانية، أو لسه مش متاح عندنا.</p>${done ? TW.chip("هنبلغك أول ما يتوفر", "ok", "check") : `<button type="button" class="btn accent lg" data-act="search-notify">${ic("bell", "ic sm")}بلّغني لما يتوفر</button>`}</div>
      ${unavailable.length ? unavailBlock(x, unavailable) : ""}
      <div><div class="cu-lbl">جرّب الأقسام دي</div><div class="cu-catlist">${sugg.map((d) => `<button type="button" class="cu-catrow" data-act="go" data-to="/customer/dept/${d.id}"><span class="tile tone-${d.tone}">${ic(d.icon)}</span><span class="grow"><b>${esc(d.ar)}</b><small>${num(deptCount(x, d.id))} ${d.id === "food" ? "مطعم" : "منتج متاح"}</small></span>${ic("chevE", "ic xs")}</button>`).join("")}</div></div></div>`;
  } else {
    body = `<div class="cu-pad cu-pad-t col gap12"><p class="muted cu-rescount">${num(n)} نتيجة لـ «${esc(q)}» في ${esc(x.z.ar)}</p>
      ${r.merchants.length ? `<div><div class="cu-lbl">${ic("store", "ic xs")} محلات ومطاعم</div><div class="col">${r.merchants.slice(0, 4).map((m) => shopCard(x, m)).join("")}</div></div>` : ""}
      ${r.skus.length ? `<div><div class="cu-lbl">${ic("bag", "ic xs")} منتجات</div>${grid(x, r.skus.slice(0, 30))}</div>` : ""}
      ${r.menu.length ? `<div><div class="cu-lbl">${ic("food", "ic xs")} أطباق من المطاعم</div><div class="card cu-menu-card">${r.menu.slice(0, 8).map(({ m, it }) => menuRow(x, m, it, true)).join("")}</div></div>` : ""}
      ${unavailable.length ? unavailBlock(x, unavailable) : ""}</div>`;
  }
  return { top: input, body };
}
function unavailBlock(x, list) {
  return `<div><div class="cu-lbl">${ic("info", "ic xs")} موجودين بس مش متاحين في ${esc(x.z.ar)} دلوقتي</div><div class="card cu-menu-card">${list.map((s) => { const on = x.c.notifyMe.includes(s.id); const t = tileIcon(s, "ic sm"); return `<div class="cu-mrow"><span class="tile tone-${t.tone} cu-mrow-t">${t.svg}</span><span class="grow"><b class="cu-ell">${esc(s.ar)}</b><small>${esc(s.size)} · المنتج خلص حالياً</small></span>${on ? TW.chip("هنبلغك", "ok", "check") : `<button type="button" class="btn sm" data-act="notify" data-sku="${s.id}">${ic("bell", "ic xs")}بلّغني</button>`}</div>`; }).join("")}</div></div>`;
}
function suggestDepts(q) {
  const nq = TW.norm(q); const terms = nq.split(" ").filter(Boolean);
  const hit = D.depts.filter((d) => terms.some((t) => TW.norm(d.ar).includes(t) || (D.cats[d.id] || []).some((c) => TW.norm(c[1]).includes(t))));
  const nr = (S().demand.noResult || []).find((e) => e.dept && TW.norm(e.q).split(" ").some((w) => terms.includes(w)));
  const out = [...hit]; if (nr && DEPT[nr.dept] && !out.includes(DEPT[nr.dept])) out.push(DEPT[nr.dept]);
  ["grocery", "dairy", "pharmacy", "food", "snacks", "cleaning"].forEach((id) => { if (out.length < 5 && !out.includes(DEPT[id])) out.push(DEPT[id]); });
  return out.slice(0, 5);
}
/* debounced logging of searches that return nothing → demand intelligence (search.log) */
function scheduleLog(inst, q, n, zid) {
  const key = TW.norm(q); if (n || key.length < 2) return;
  inst._logged = inst._logged || new Set(); if (inst._logged.has(key)) return;
  clearTimeout(inst._slt);
  inst._slt = setTimeout(() => { if (TW.norm(inst.ui.q || "") !== key || inst._logged.has(key)) return; inst._logged.add(key); TW.act("search.log", { q: q.trim(), results: 0, zoneId: zid }, TW.actor.customer(inst.actorId())); }, 1500);
}

/* ===================================================================== PRODUCT ===================== */
function vProduct(inst, x, id) {
  const s = sku(id); if (!s) return notFound(x, "المنتج ده مش موجود");
  const offs = offersOf(id, x.z.id), avail = offs.filter((o) => o.available);
  const selId = (inst.ui.pdpSrc || {})[id]; const sel = avail.find((o) => o.sourceId === selId) || avail[0] || null;
  const line = sel ? lineFor(x.cid, id, sel.sourceId) : null;
  const pq = inst.ui.pq && inst.ui.pq.id === id ? inst.ui.pq.n : 1;
  const price = sel ? sel.price : s.price, off = offPct(s, price), t = tileIcon(s, "ic xl");
  const fav = x.c.favs.includes(id);
  const d = DEPT[s.dept];
  let stock;
  if (s.regulated) stock = TW.chip("يتطلب روشتة وتحقق صيدلي", "warn", "rx");
  else if (!sel) stock = TW.chip("المنتج خلص حالياً", "bad");
  else if (sel.stock != null && sel.stock <= 5) stock = TW.chip(`فاضل ${num(sel.stock)} بس`, "warn");
  else stock = TW.chip("متاح", "ok", "check");
  const minEta = Math.min(...avail.map((o) => (o.eta ? o.eta[0] : 99))), minPrice = Math.min(...avail.map((o) => o.price));
  const why = sel && avail.length > 1 ? ["متاح", sel.eta && sel.eta[0] <= minEta ? "أسرع" : null, sel.price <= minPrice ? "أرخص" : null].filter(Boolean) : [];
  const offersBlock = avail.length > 1 || offs.length > 1 ? `<div class="card cu-offers"><h3>${ic("store", "ic sm")} متاح من ${num(avail.length)} ${avail.length === 1 ? "مكان" : "أماكن"}</h3>
    ${avail[0] && avail.length > 1 ? `<p class="cu-why">${ic("sparkle", "ic xs")} رشّحنالك <b>${esc(avail[0].name)}</b>: ${["متاح", avail[0].eta && avail[0].eta[0] <= minEta ? "أسرع" : null, avail[0].price <= minPrice ? "أرخص" : null].filter(Boolean).join(" · ")}</p>` : ""}
    <div class="cu-olist" role="radiogroup" aria-label="اختار المصدر">${offs.map((o, i) => { const on = sel && o.sourceId === sel.sourceId; const dp = sel ? o.price - sel.price : 0; return `<button type="button" role="radio" aria-checked="${on}" class="cu-orow ${on ? "on" : ""} ${o.available ? "" : "off"}" ${o.available ? `data-act="pdp-src" data-sku="${id}" data-src="${o.sourceId}"` : `aria-disabled="true"`}><span class="cu-radio"></span><span class="grow"><b>${esc(o.name)}</b>${i === 0 && o.available && avail.length > 1 ? ` ${TW.chip("الأنسب", "brand")}` : ""}<small class="num">${o.available ? `${esc(offerEta(o, x.z))}${o.stock != null && o.stock <= 5 ? ` · فاضل ${o.stock}` : ""}${!on && dp ? ` · ${dp > 0 ? "أغلى" : "أرخص"} بـ ${m$(Math.abs(dp))}` : ""}` : o.mode === "closed" ? "المحل مقفول دلوقتي" : "خلص عندهم"}</small></span><b class="num">${m$(o.price)}</b></button>`; }).join("")}</div></div>` : "";
  const subs = s.subGroup ? availSkus(x.z.id).filter((y) => y.subGroup === s.subGroup && y.id !== id) : [];
  const same = availSkus(x.z.id).filter((y) => y.cat === s.cat && y.id !== id && !subs.includes(y)).slice(0, 8);
  const body = `<div class="cu-pdp-hero tone-${t.tone}">${t.svg}${off ? `<span class="cu-off lg num">خصم ${off}%</span>` : ""}${s.local ? `<span class="cu-loc lg">منتج بلدي</span>` : ""}</div>
    <div class="cu-pad col gap12 cu-pdp">
      <div><div class="cu-crumb">${esc(d ? d.ar : "")} · ${esc(catName(s.dept, s.cat))}</div><h1 class="cu-pdp-t">${esc(s.ar)}</h1><div class="cu-pdp-sub">${esc(s.brand)} · ${esc(s.size)}</div></div>
      <div class="row between wrap"><div class="cu-pdp-pr"><b class="num">${m$(price)}</b>${off ? `<s class="num">${m$(s.oldPrice)}</s><span class="cu-save num">وفّرت ${m$(s.oldPrice - price)}</span>` : ""}</div>${stock}</div>
      ${s.regulated ? `<div class="banner warn">${ic("rx", "ic sm")}<div><b>يتطلب روشتة وتحقق صيدلي.</b> المنتج ده مش بيتباع من غير ما الصيدلي يراجع الروشتة، عشان كده مش هتقدر تضيفه للسلة من هنا. كلّم الصيدلية اللي حواليك أو خدمة العملاء.</div></div>` : ""}
      ${sel ? `<div class="cu-facts"><div>${ic(x.z.route === "scheduled" ? "calendar" : "bolt", "ic sm")}<span><small>هيوصلك</small><b class="num">${esc(x.z.route === "scheduled" ? zoneEta(x.z).t : offerEta(sel, x.z))}</b></span></div><div>${ic(sel.sourceType === "hub" ? "building" : "store", "ic sm")}<span><small>هيتجهز من</small><b>${esc(sel.sourceType === "hub" ? "مخزن توّا" : sel.name)}</b></span></div></div>` : !s.regulated ? `<div class="banner bad">${ic("info", "ic sm")}<div><b>المنتج خلص حالياً</b> في ${esc(x.z.ar)}. نبلغك أول ما يرجع؟</div></div>${x.c.notifyMe.includes(id) ? TW.chip("هنبلغك أول ما يتوفر", "ok", "check") : `<button type="button" class="btn lg block" data-act="notify" data-sku="${id}">${ic("bell", "ic sm")}بلّغني لما يتوفر</button>`}` : ""}
      ${why.length && sel !== avail[0] ? "" : ""}
      ${offersBlock}
      ${subs.length ? `<div>${sec("بدائل معتمدة", "لو خلص، دول أقرب حاجة ليه", null, "refresh").replace('class="cu-sec"', 'class="cu-sec flush"')}${strip(x, subs).replace('class="cu-hs"', 'class="cu-hs flush"')}</div>` : ""}
      <p class="cu-desc">${esc(s.desc)}${s.handling === "chilled" ? " بيتنقل في شنطة مبردة." : s.handling === "frozen" ? " بيتنقل مجمد." : ""}</p>
      ${same.length ? `<div>${sec("من نفس القسم", null, `/customer/dept/${s.dept}`, null).replace('class="cu-sec"', 'class="cu-sec flush"')}${strip(x, same).replace('class="cu-hs"', 'class="cu-hs flush"')}</div>` : ""}
    </div>`;
  let foot;
  if (s.regulated) foot = `<div class="cu-foot"><button type="button" class="btn lg block" disabled>${ic("lock", "ic sm")}يتطلب روشتة وتحقق صيدلي</button></div>`;
  else if (!sel) foot = "";
  else if (line) foot = `<div class="cu-foot">${stepper(line.key, line.qty, true)}<button type="button" class="btn primary lg grow" data-act="go" data-to="/customer/cart">${ic("cart", "ic sm")}في السلة · كمّل</button></div>`;
  else foot = `<div class="cu-foot"><div class="cu-step lg"><button type="button" data-act="pq" data-sku="${id}" data-q="${pq - 1}" ${pq <= 1 ? "disabled" : ""} aria-label="قلّل">${ic("minus", "ic xs")}</button><span class="num">${pq}</span><button type="button" data-act="pq" data-sku="${id}" data-q="${pq + 1}" aria-label="زوّد">${ic("plus", "ic xs")}</button></div><button type="button" class="btn accent lg grow" data-act="pdp-add" data-sku="${id}" data-type="${sel.sourceType}" data-src="${sel.sourceId}">${ic("plus", "ic sm")}ضيف للسلة · <span class="num">${m$(price * pq)}</span></button></div>`;
  const favBtn = `<button type="button" class="btn icon ghost cu-fav ${fav ? "on" : ""}" data-act="fav" data-sku="${id}" aria-pressed="${fav}" aria-label="${fav ? "شيل من المفضلة" : "ضيف للمفضلة"}">${ic("heart")}</button>`;
  return { top: top(x, esc(d ? d.ar : "المنتج"), { right: favBtn + cartIconBtn(x) }), body, foot, noTabs: true };
}

/* ===================================================================== STORE ===================== */
function menuRow(x, m, it, showShop) {
  const l = cartOf(x.cid) ? cartOf(x.cid).lines.filter((y) => y.menuItemId === it.id) : [];
  const q = sum(l, (y) => y.qty);
  return `<div class="cu-mrow ${it.available ? "" : "off"}"><span class="tile tone-4 cu-mrow-t">${ic("food", "ic sm")}</span><button type="button" class="grow cu-mrow-b" ${it.available && m.mode !== "closed" ? `data-act="menu-open" data-mid="${m.id}" data-item="${it.id}"` : `aria-disabled="true"`}><b>${esc(it.name)}</b><small class="cu-ell2">${showShop ? esc(m.ar) + (it.desc ? " · " : "") : ""}${esc(it.desc || "")}${it.mods.some((g) => g.req) ? `${it.desc || showShop ? " · " : ""}فيه اختيارات` : ""}</small><span class="num cu-mrow-p">${m$(it.price)}</span></button>${!it.available ? TW.chip("خلص", "neutral") : m.mode === "closed" ? "" : `<button type="button" class="cu-add" data-act="menu-open" data-mid="${m.id}" data-item="${it.id}" aria-label="ضيف ${esc(it.name)}">${ic("plus", "ic sm")}${q ? `<span class="cu-badge num">${q}</span>` : ""}</button>`}</div>`;
}
function vStore(inst, x, mid) {
  const m = find(S().merchants, mid); if (!m) return notFound(x, "المحل ده مش موجود");
  const serves = TW.merchantServes(m, x.z.id);
  const head = `<div class="cu-pad cu-pad-t"><div class="card cu-store-h"><div class="row top"><span class="tile tone-${M_TONE[m.type] || 1} cu-store-ic">${ic(M_IC[m.type] || "store", "ic xl")}</span><div class="grow"><h2 class="cu-store-t">${esc(m.ar)}</h2><div class="muted cu-store-s">${esc(mType(m))}${m.landmark ? ` · ${esc(m.landmark)}` : ""}</div><div class="row wrap gap4" style="margin-top:6px">${mStatus(m)}${m.rating ? TW.chip(`${num(m.rating, 1)} تقييم`, "neutral", "star") : ""}${m.local ? TW.chip("من بلدنا", "ok", "leaf") : ""}</div></div></div>
    <div class="cu-facts three"><div>${ic("clock", "ic sm")}<span><small>التجهيز</small><b class="num">~${m.prep + (m.busyExtra || 0)} د</b></span></div><div>${ic(x.z.route === "scheduled" ? "calendar" : "bolt", "ic sm")}<span><small>يوصلك</small><b class="num">${esc(merchantEta(m, x.z))}</b></span></div><div>${ic("truck", "ic sm")}<span><small>التوصيل</small><b class="num">${money(x.z.fee)}</b></span></div></div>
    ${!serves ? `<div class="banner warn" style="margin-top:10px">${ic("info", "ic sm")}<div>المحل ده مش بيوصل لـ ${esc(x.z.ar)} دلوقتي.</div></div>` : m.mode === "closed" ? `<div class="banner" style="margin-top:10px">${ic("clock", "ic sm")}<div>المحل مقفول دلوقتي — تقدر تتفرج وتطلب لما يفتح.</div></div>` : m.mode === "busy" ? `<div class="banner warn" style="margin-top:10px">${ic("clock", "ic sm")}<div>المحل زحمة شوية — التجهيز ممكن ياخد 10 دقايق زيادة.</div></div>` : ""}</div></div>`;
  let body;
  if (S().menus[mid]) {
    const cats = [...new Set(S().menus[mid].map((it) => it.cat))];
    body = head + cats.map((c) => `${sec(esc(c), null, null, null)}<div class="cu-pad"><div class="card cu-menu-card">${S().menus[mid].filter((it) => it.cat === c).map((it) => menuRow(x, m, it)).join("")}</div></div>`).join("");
  } else {
    const items = Object.entries(S().msku[mid] || {}).map(([id, v]) => ({ s: sku(id), v })).filter((e) => e.s && e.s.active);
    const offerFor = (e) => { const av = serves && e.v.available && m.mode !== "closed" && (e.v.stock == null || e.v.stock > 0); return av ? { sourceType: "merchant", sourceId: mid, name: m.ar, label: `من ${m.ar}`, price: e.v.price, available: true, stock: e.v.stock, eta: null } : null; };
    const cats = [...new Set(items.map((e) => `${e.s.dept}:${e.s.cat}`))];
    const key = `scat_${mid}`, cur = inst.ui[key] || "all";
    const chips = cats.length > 1 ? `<div class="cu-chips cu-sticky">${[["all", "الكل"], ...cats.map((k) => [k, catName(...k.split(":"))])].map(([k, l]) => `<button type="button" class="cu-chip ${cur === k ? "on" : ""}" data-act="ui" data-k="${key}" data-v="${k}">${esc(l)}</button>`).join("")}</div>` : "";
    const shown = cats.filter((k) => cur === "all" || k === cur);
    body = head + chips + (items.length ? shown.map((k) => { const list = items.filter((e) => `${e.s.dept}:${e.s.cat}` === k).sort((a, b) => !!offerFor(b) - !!offerFor(a)); return `${sec(esc(catName(...k.split(":"))), `${list.length} منتج`, null, null)}<div class="cu-pad">${`<div class="cu-grid">${list.map((e) => pcard(x, e.s, { offer: offerFor(e), noMeta: true })).join("")}</div>`}</div>`; }).join("") : `<div class="cu-pad"><div class="card">${TW.empty("المحل لسه بيجهّز منتجاته على توّا", "هنبلغك أول ما يبدأ", "store")}</div></div>`);
  }
  return { top: top(x, esc(m.ar), { right: cartIconBtn(x) }), body };
}

/* ===================================================================== CART ===================== */
function lineRow(x, l, chg) {
  const s = l.skuId ? sku(l.skuId) : null, t = s ? tileIcon(s, "ic sm") : { tone: 4, svg: ic("food", "ic sm") };
  return `<div class="cu-cline ${chg && (chg.kind === "unavailable" || chg.kind === "closed") ? "off" : ""}"><span class="tile tone-${t.tone} cu-cline-t">${t.svg}</span><div class="grow cu-cline-b"><b class="cu-ell2">${esc(l.name)}</b><small class="cu-ell">${esc(s ? s.size : (l.mods || []).map((m) => m.n).join("، ") || "عادي")}</small>${chg ? `<span class="cu-chg">${ic("alert", "ic xs")}${esc(chg.text)}</span>` : ""}<span class="num cu-cline-p">${m$(l.unitPrice * l.qty)}${l.qty > 1 ? ` <small>(${m$(l.unitPrice)} للواحدة)</small>` : ""}</span></div>${stepper(l.key, l.qty)}</div>`;
}
function vCart(inst, x) {
  const ct = cartOf(x.cid);
  if (!ct || !ct.lines.length) {
    const bb = boughtBefore(x).slice(0, 8);
    return { top: top(x, "السلة"), body: `<div class="cu-pad cu-pad-t"><div class="card">${TW.empty("سلتك فاضية", "ابدأ من الأقسام أو اطلب حاجة اشتريتها قبل كده", "cart")}<button type="button" class="btn primary lg block" data-act="go" data-to="/customer">ابدأ التسوق</button></div></div>${bb.length ? sec("اشتريتهم قبل كده", null, null, "history") + strip(x, bb) : ""}`, noTabs: false };
  }
  const v = TW.validateCart(x.cid);
  const chg = Object.fromEntries(v.changes.filter((c) => c.key).map((c) => [c.key, c]));
  const e = zoneEta(x.z), sched = x.z.route === "scheduled";
  const groups = v.groups.map((g) => `<div class="cu-group"><div class="cu-group-h"><span class="tile tone-${g.sourceType === "hub" ? 1 : M_TONE[(find(S().merchants, g.sourceId) || {}).type] || 4} cu-group-ic">${ic(g.sourceType === "hub" ? "bolt" : M_IC[(find(S().merchants, g.sourceId) || {}).type] || "store", "ic sm")}</span><div class="grow"><b>${g.sourceType === "hub" ? "من توّا" : esc(g.name)}</b><small class="num">${sched ? esc(e.t) : `يوصل خلال ${g.eta[0]}–${g.eta[1]} د`}</small></div><b class="num">${m$(g.subtotal)}</b></div>${g.lines.map((l) => lineRow(x, l, chg[l.key])).join("")}</div>`).join("");
  const T = v.totals, freeOver = x.z.type === "core" ? 300 : 400;
  const minLeft = x.z.min - T.items;
  const pref = ct.subPref || x.c.subPref || "call";
  const promoIn = inst.ui.promo != null ? inst.ui.promo : "";
  const body = `<div class="cu-pad cu-pad-t col gap12">
    ${v.groups.length > 1 ? `<div class="banner ${v.split ? "warn" : "brand"}">${ic(v.split ? "truck" : "layers", "ic sm")}<div>${v.split ? "<b>طلبك هيوصل على مرتين عشان منأخركش.</b> كل جزء هيوصلك أول ما يجهز." : `<b>سلة واحدة من ${v.groups.length} أماكن.</b> هنجمعهم ويوصلولك مع بعض.`}</div></div>` : ""}
    <div class="col gap12" data-hl="cart-groups">${groups}</div>
    ${v.changes.length ? `<div class="banner warn">${ic("alert", "ic sm")}<div>فيه ${v.changes.length} تغيير في السلة (سعر أو كمية أو منتج خلص) — هتراجعهم وتوافق عليهم في الخطوة الجاية.</div></div>` : ""}
    <div class="card cu-minb"><div class="row between"><span>${minLeft > 0 ? `ضيف <b class="num">${m$(minLeft)}</b> كمان للحد الأدنى` : T.delivery > 0 ? `فاضل <b class="num">${m$(freeOver - T.items)}</b> على التوصيل المجاني` : `<b>التوصيل عليك مجاني</b>`}</span><small class="muted num">${minLeft > 0 ? `الحد الأدنى ${money(x.z.min)}` : `مجاني فوق ${money(freeOver)}`}</small></div>${TW.meter(T.items, minLeft > 0 ? x.z.min : freeOver, minLeft > 0 ? "warn" : "ok")}</div>
    <div class="card"><h3>${ic("tag", "ic sm")} كود خصم</h3>${ct.promo ? `<div class="row between"><span>${TW.chip(ct.promo, "ok", "check")} ${v.promo ? `<span class="num">وفّرت ${m$(T.discount)}</span>` : ""}</span><button type="button" class="btn sm ghost" data-act="promo-clear">شيل الكود</button></div>` : `<div class="row"><input class="input grow mono" data-model="promo" data-enter="promo-apply" value="${esc(promoIn)}" placeholder="مثلاً TWAA20" aria-label="كود الخصم" autocapitalize="characters"><button type="button" class="btn" data-act="promo-apply">طبّق</button></div>${promosFor(x).length ? `<div class="cu-chips cu-wrap" style="margin-top:8px">${promosFor(x).map((p) => `<button type="button" class="cu-chip sm" data-act="promo-pick" data-code="${esc(p.code)}"><span class="mono">${esc(p.code)}</span> · ${esc(p.name)}</button>`).join("")}</div>` : ""}`}</div>
    <div class="card"><h3>${ic("refresh", "ic sm")} لو منتج خلص وإحنا بنجهّز</h3><div class="cu-opts">${[["call", "اسألني الأول", "هنبعتلك البديل وتختار"], ["auto", "بدّل بأقرب بديل", `لو الفرق مش أكتر من ${S().rules.subPriceTolerance}%`], ["remove", "شيل الصنف", "والفلوس متتحسبش"]].map(([k, l, sb]) => `<button type="button" class="cu-opt ${pref === k ? "on" : ""}" data-act="subpref" data-v="${k}" role="radio" aria-checked="${pref === k}"><span class="cu-radio"></span><span class="grow"><b>${l}</b><small>${sb}</small></span></button>`).join("")}</div></div>
    ${totalsCard(T)}
    <div class="row"><button type="button" class="btn grow" data-act="basket-open">${ic("list", "ic sm")}احفظ السلة</button><button type="button" class="btn ghost" data-act="cart-clear">${ic("trash", "ic sm")}فضّي السلة</button></div>
  </div>`;
  const blocked = v.issues.filter((i) => i.level === "block");
  const foot = `<div class="cu-foot col">${blocked.length ? `<div class="cu-foot-why">${ic("info", "ic xs")}${esc(blocked[0].text)}</div>` : ""}<button type="button" class="btn accent lg block" data-act="go-checkout" ${blocked.length ? "disabled" : ""}><span class="grow">كمّل الطلب</span><b class="num">${m$(T.total)}</b>${ic("chevE", "ic sm")}</button></div>`;
  return { top: top(x, "السلة"), body, foot, noTabs: true };
}
function totalsCard(T, opts = {}) {
  return `<div class="card cu-tot"><div class="row between"><span>المنتجات</span><span class="num">${m$(T.items)}</span></div><div class="row between"><span>التوصيل</span><span class="num">${T.delivery ? m$(T.delivery) : "مجاني"}</span></div><div class="row between"><span>رسوم الخدمة</span><span class="num">${m$(T.service)}</span></div>${T.discount ? `<div class="row between ok"><span>الخصم</span><span class="num">− ${m$(T.discount)}</span></div>` : ""}${opts.extra || ""}<div class="row between cu-tot-t"><b>الإجمالي</b><b class="num">${m$(T.total)}</b></div></div>`;
}

/* ===================================================================== CHECKOUT ===================== */
function vCheckout(inst, x) {
  const ct = cartOf(x.cid);
  if (!ct || !ct.lines.length) {
    const p = inst.ui.placed && find(S().orders, inst.ui.placed.orderId);
    return { top: top(x, "تأكيد الطلب"), body: `<div class="cu-pad cu-pad-t"><div class="card">${p ? TW.empty(`طلبك ${p.id} اتأكد`, "مش هنكرره لو دوست تاني", "check") + `<button type="button" class="btn primary lg block" data-act="go" data-to="/customer/order/${p.id}">تابع الطلب</button>` : TW.empty("السلة فاضية", "ضيف منتجات الأول", "cart") + `<button type="button" class="btn primary lg block" data-act="go" data-to="/customer">ابدأ التسوق</button>`}</div></div>`, noTabs: true };
  }
  const pay = inst.ui.pay || "cod";
  const v = TW.validateCart(x.cid, { pay });
  const T = v.totals, sched = x.z.route === "scheduled";
  const when = sched ? "scheduled" : inst.ui.when || "now";
  const wins = sched ? x.z.windows : slotsToday();
  const win = inst.ui.win && wins.includes(inst.ui.win) ? inst.ui.win : sched ? (nextWindow(x.z) || {}).w : null;
  const blocked = v.issues.filter((i) => i.level === "block"), warns = v.issues.filter((i) => i.level !== "block");
  const wallet = x.c.wallet || 0;
  const cashOpts = [Math.ceil(T.total / 50) * 50, Math.ceil(T.total / 100) * 100, 500, 1000].filter((a, i, arr) => a > T.total && arr.indexOf(a) === i).slice(0, 3);
  const changeFor = inst.ui.change != null ? Number(inst.ui.change) : 0;
  const changes = v.changes.length ? `<div class="card cu-changes"><h3>${ic("alert", "ic sm")} حصلت تغييرات من ساعة ما ضفت للسلة</h3><ul>${v.changes.map((c) => `<li><span class="tile ${c.kind === "price" ? "tone-5" : c.kind === "promo" ? "tone-7" : "tone-4"}">${ic(c.kind === "price" ? "tag" : c.kind === "qty" ? "minus" : c.kind === "promo" ? "percent" : c.kind === "closed" ? "store" : "x", "ic xs")}</span><span class="grow">${esc(c.text)}<small class="mono muted"> ${esc(c.code || "")}</small></span></li>`).join("")}</ul><p class="muted cu-small">عشان تبقى عارف هتدفع كام بالظبط، لازم توافق على التغييرات دي قبل ما نأكد الطلب.</p><button type="button" class="btn primary lg block" data-act="apply-changes">${ic("check", "ic sm")}وافق على التغييرات</button></div>` : "";
  const reason = !v.ok ? (blocked[0] ? blocked[0].text : "السلة فاضية") : v.changes.length ? "وافق على التغييرات الأول" : when === "scheduled" && !win ? "اختار ميعاد التوصيل" : pay === "wallet" && wallet < T.total ? "رصيد المحفظة مش كفاية" : "";
  const body = `<div class="cu-pad cu-pad-t col gap12">
    ${changes}
    ${blocked.map((i) => `<div class="banner bad">${ic("alert", "ic sm")}<div><b>${esc(i.text)}</b> <span class="mono muted cu-small">${esc(i.code)}</span>${i.code === "BR-CART-002" ? `<div style="margin-top:6px"><button type="button" class="btn sm" data-act="go" data-to="/customer">كمّل تسوق</button></div>` : i.code === "EX-LOC-003" ? `<div style="margin-top:6px"><button type="button" class="btn sm" data-act="loc">غيّر العنوان</button></div>` : ""}</div></div>`).join("")}
    ${warns.map((i) => `<div class="banner warn">${ic("clock", "ic sm")}<div>${esc(i.text)}</div></div>`).join("")}
    <div class="card"><div class="hd"><h3>${ic("pin", "ic sm")} هنوصل الطلب فين؟</h3><button type="button" class="btn sm ghost" data-act="loc">غيّر</button></div><div class="cu-addrcard"><b>${esc(x.addr.label)} · ${esc(x.z.ar)}</b><span>${esc(x.addr.landmark)}${x.addr.street ? ` — ${esc(x.addr.street)}` : ""}</span><small class="muted num">توصيل ${money(x.z.fee)} · حد أدنى ${money(x.z.min)}</small></div></div>
    <div class="card"><h3>${ic("clock", "ic sm")} امتى؟</h3>${sched ? `<p class="muted cu-small">${esc(x.z.ar)} بنوصلها على رحلات مجمّعة في مواعيد ثابتة عشان التوصيل يفضل رخيص.</p>` : `<div class="cu-opts two">${[["now", "دلوقتي", `${v.eta ? `${v.eta[0]}–${v.eta[1]} دقيقة` : ""}`], ["scheduled", "حدد ميعاد", "النهارده"]].map(([k, l, sb]) => `<button type="button" class="cu-opt ${when === k ? "on" : ""}" data-act="ui" data-k="when" data-v="${k}" role="radio" aria-checked="${when === k}"><span class="cu-radio"></span><span class="grow"><b>${l}</b><small class="num">${sb}</small></span></button>`).join("")}</div>`}
      ${when === "scheduled" ? `<div class="cu-chips cu-wrap" style="margin-top:8px">${wins.map((w) => `<button type="button" class="cu-chip ${win === w ? "on" : ""}" data-act="ui" data-k="win" data-v="${esc(w)}"><span class="num">${esc(fmtWin(w))}</span>${sched && nextWindow(x.z) && w === nextWindow(x.z).w && !nextWindow(x.z).today ? " بكرة" : ""}</button>`).join("")}</div>` : ""}</div>
    <div class="card"><h3>${ic("wallet", "ic sm")} هتدفع إزاي؟</h3><div class="cu-opts">
      <button type="button" class="cu-opt ${pay === "cod" ? "on" : ""}" data-act="ui" data-k="pay" data-v="cod" role="radio" aria-checked="${pay === "cod"}"><span class="cu-radio"></span>${ic("cash", "ic")}<span class="grow"><b>كاش عند الاستلام</b><small>ادفع للمندوب لما الطلب يوصل</small></span></button>
      ${pay === "cod" ? `<div class="cu-change"><small>معاك فكة؟ عشان المندوب يجهّزلك الباقي</small><div class="cu-chips cu-wrap">${[[0, "المبلغ مظبوط"], ...cashOpts.map((a) => [a, `معايا ${a}`])].map(([a, l]) => `<button type="button" class="cu-chip sm ${changeFor === a ? "on" : ""}" data-act="ui" data-k="change" data-v="${a}"><span class="num">${l}</span></button>`).join("")}</div></div>` : ""}
      <button type="button" class="cu-opt ${pay === "card" ? "on" : ""}" data-act="ui" data-k="pay" data-v="card" role="radio" aria-checked="${pay === "card"}"><span class="cu-radio"></span>${ic("card", "ic")}<span class="grow"><b>بطاقة</b><small>فيزا أو ميزة — دفع آمن</small></span></button>
      <button type="button" class="cu-opt ${pay === "wallet" ? "on" : ""} ${wallet < T.total ? "dim" : ""}" data-act="ui" data-k="pay" data-v="wallet" role="radio" aria-checked="${pay === "wallet"}"><span class="cu-radio"></span>${ic("wallet", "ic")}<span class="grow"><b>محفظة توّا</b><small class="num">رصيدك ${m$(wallet)}${wallet < T.total ? " — مش كفاية للطلب ده" : ""}</small></span></button></div></div>
    <div class="card"><h3>${ic("receipt", "ic sm")} ملخص الطلب</h3><div class="cu-small muted">${v.groups.map((g) => `${g.sourceType === "hub" ? "توّا" : esc(g.name)} (${g.lines.length})`).join(" · ")}${v.split ? " — هيوصل على مرتين عشان منأخركش" : ""}</div></div>
    ${totalsCard(T, { extra: pay === "cod" ? `<div class="row between muted cu-small"><span>هتدفع للمندوب</span><span class="num">${m$(T.total)}${changeFor ? ` (معاك ${changeFor})` : ""}</span></div>` : "" })}
    <p class="cu-foot-note">${ic("shield", "ic xs")} مش هنخصم ولا جنيه زيادة عن المكتوب هنا. لو منتج خلص هنتصرف حسب اختيارك: <b>${esc({ call: "اسألني الأول", auto: "بدّل بأقرب بديل", remove: "شيل الصنف" }[ct.subPref || x.c.subPref || "call"])}</b>.</p>
  </div>`;
  const foot = `<div class="cu-foot col">${reason ? `<div class="cu-foot-why">${ic("info", "ic xs")}${esc(reason)}</div>` : ""}<button type="button" class="btn accent xl block" data-act="place" data-hl="cust-checkout" ${reason ? "disabled" : ""}><span class="grow">${pay === "cod" ? "أكّد الطلب" : "ادفع وأكّد"}</span><b class="num">${m$(T.total)}</b></button></div>`;
  return { top: top(x, "تأكيد الطلب"), body, foot, noTabs: true };
}

/* ===================================================================== TRACKING ===================== */
const ROADS = `<path class="water" d="M0 520 C 200 500, 380 560, 560 540 S 860 470, 1000 500 L1000 640 L0 640Z"/><path class="road" vector-effect="non-scaling-stroke" d="M120 586 L 212 362 L 400 262 L 422 238 L 604 339 L 924 202"/><path class="road" vector-effect="non-scaling-stroke" d="M240 93 L 422 238 L 524 486"/><path class="road sm" vector-effect="non-scaling-stroke" d="M422 238 L 672 134"/><path class="road sm" vector-effect="non-scaling-stroke" d="M400 262 L 212 362"/>`;
function trackMap(o, t) {
  const r = t && t.riderId ? find(S().riders, t.riderId) : null;
  const drop = o.address;
  const pk = t ? t.pickups : S().fos.filter((f) => f.orderId === o.id).map((f) => ({ x: f.x, y: f.y, name: f.name, sourceType: f.sourceType, scanned: false }));
  const pts = [drop, ...pk]; if (r) pts.push(r);
  let x0 = Math.min(...pts.map((p) => p.x)), x1 = Math.max(...pts.map((p) => p.x)), y0 = Math.min(...pts.map((p) => p.y)), y1 = Math.max(...pts.map((p) => p.y));
  let w = Math.max(90, x1 - x0) * 1.5, h = Math.max(56, y1 - y0) * 1.5; const AR = 1.7;
  if (w / h < AR) w = h * AR; else h = w / AR;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; const vx = cx - w / 2, vy = cy - h / 2;
  const k = w / 360; const R = (n) => (n * k).toFixed(2);
  const z = find(S().zones, o.zoneId);
  const leg = t && ["PICKED_UP", "ARRIVED"].includes(t.status) ? "drop" : "pickup";
  let route = "";
  if (r && t && !["DELIVERED"].includes(t.status)) { const way = leg === "drop" ? [r, drop] : [r, ...pk.filter((p) => !p.scanned), drop]; route = `<path class="route" vector-effect="non-scaling-stroke" d="M${way.map((p) => `${p.x} ${p.y}`).join(" L ")}"/>`; }
  else if (!r) route = `<path class="route" vector-effect="non-scaling-stroke" style="opacity:.4" d="M${pk.map((p) => `${p.x} ${p.y}`).join(" L ")} L ${drop.x} ${drop.y}"/>`;
  const glyph = (name, x, y, s) => `<g class="cu-mk-g" transform="translate(${(x - s / 2).toFixed(2)} ${(y - s / 2).toFixed(2)}) scale(${(s / 24).toFixed(4)})">${TW.I[name]}</g>`;
  const lbl = (txt, x, y) => `<text class="mlbl" x="${x}" y="${(y + 4 * k).toFixed(2)}" text-anchor="middle" style="font-size:${R(11)}px;stroke-width:${R(3)}px">${esc(txt)}</text>`;
  const pins = pk.map((p) => `<g class="cu-mk-src ${p.scanned ? "done" : ""}"><circle cx="${p.x}" cy="${p.y}" r="${R(11)}"/>${glyph(p.sourceType === "hub" ? "bolt" : "store", p.x, p.y, 13 * k)}${lbl(p.sourceType === "hub" ? "توّا" : p.name, p.x, p.y + 22 * k)}</g>`).join("");
  const home = `<g class="cu-mk-home"><circle cx="${drop.x}" cy="${drop.y}" r="${R(12)}"/>${glyph("home", drop.x, drop.y, 14 * k)}${lbl("بيتك", drop.x, drop.y + 24 * k)}</g>`;
  const rider = r && t && t.status !== "DELIVERED" ? `<g class="cu-mk-rider"><circle class="halo" cx="${r.x}" cy="${r.y}" r="${R(19)}"/><circle cx="${r.x}" cy="${r.y}" r="${R(12)}"/>${glyph("bike", r.x, r.y, 15 * k)}</g>` : "";
  return `<div class="map cu-map"><svg viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="خريطة تتبع الطلب"><rect x="${vx}" y="${vy}" width="${w}" height="${h}" fill="var(--map-land)"/>${ROADS}${z ? `<circle class="zone" vector-effect="non-scaling-stroke" cx="${z.x}" cy="${z.y}" r="${z.pr + 26}"/>` : ""}${route}${pins}${home}${rider}</svg></div>`;
}
function vOrder(inst, x, id) {
  const o = find(S().orders, id); if (!o) return notFound(x, "الطلب ده مش موجود");
  const st = TW.stage(o), [lbl, tone] = custStatus(o);
  const tasks = orderTasks(o); const curT = tasks.find((t) => !["DELIVERED", "FAILED", "RETURNED", "RTO"].includes(t.status)) || tasks[0];
  const r = curT && curT.riderId ? find(S().riders, curT.riderId) : null;
  const delivered = o.status === "DELIVERED", cancelled = o.status === "CANCELLED";
  const other = o.customerId !== x.cid ? find(S().customers, o.customerId) : null;
  const just = Date.now() - o.createdAt < 90000 && !other && !delivered && !cancelled;
  const subs = o.lines.filter((l) => l.state === "sub_pending");
  const codDue = o.pay.method === "cod" && !delivered && !cancelled ? (tasks[0] ? tasks[0].cod : o.totals.total) : 0;
  const showOtp = !delivered && !cancelled && st >= 3;
  const subCard = subs.map((l) => { const s = l.sub; const diff = s ? +(s.price - l.unitPrice).toFixed(2) : 0; const absorb = s && diff > 0 && diff <= l.unitPrice * S().rules.subPriceTolerance / 100; const until = (l.subAsked || o.createdAt) + S().rules.subWaitSec * 1000; const ts = l.skuId ? tileIcon(sku(l.skuId) || { dept: l.dept }, "ic sm") : { tone: 4, svg: ic("food", "ic sm") }; const tn = s && sku(s.skuId) ? tileIcon(sku(s.skuId), "ic sm") : ts;
    return `<div class="card cu-sub" data-hl="cust-sub"><div class="cu-sub-h">${ic("alert", "ic sm")}<b>منتج خلص — محتاجين رأيك</b><span class="cu-small muted">باقي <span class="timer" data-until="${until}" data-soon="60000"></span></span></div>
      <div class="cu-sub-row"><span class="tile tone-${ts.tone}">${ts.svg}</span><div class="grow"><s>${esc(l.name)}</s><small>${esc(l.size || "")} · ${l.qty} × ${m$(l.unitPrice)}</small></div>${TW.chip("خلص", "bad")}</div>
      ${s ? `<div class="cu-sub-arrow">${ic("arrowL", "ic sm")} البديل المقترح</div><div class="cu-sub-row on"><span class="tile tone-${tn.tone}">${tn.svg}</span><div class="grow"><b>${esc(s.name)}</b><small class="num">${l.qty} × ${m$(s.price)}</small></div><b class="num ${diff > 0 && !absorb ? "warn" : diff < 0 ? "ok" : ""}">${diff === 0 ? "نفس السعر" : absorb ? "توّا هتتحمل الفرق" : diff > 0 ? `+${m$(diff * l.qty)}` : `وفّرت ${m$(-diff * l.qty)}`}</b></div>` : `<p class="muted">مفيش بديل قريب متاح دلوقتي.</p>`}
      <div class="row">${s ? `<button type="button" class="btn primary lg grow" data-act="sub" data-order="${o.id}" data-key="${l.key}" data-v="accept">${ic("check", "ic sm")}وافق على البديل</button>` : ""}<button type="button" class="btn lg grow" data-act="sub" data-order="${o.id}" data-key="${l.key}" data-v="remove">${ic("x", "ic sm")}شيل الصنف</button></div>
      <p class="cu-small muted">لو مردتش في الوقت ده هنشيل الصنف ومش هتدفع تمنه.</p></div>`; }).join("");
  const journey = cancelled ? "" : delivered ? `<div class="card cu-done" data-hl="cust-journey"><span class="tile tone-2">${ic("check", "ic")}</span><div class="grow"><b>طلبك وصل — بالهنا والشفا</b><small class="num">${o.deliveredAt ? `الساعة ${TW.clock(o.deliveredAt)} · ` : ""}${TW.JOURNEY.length} خطوات خلصت</small></div><span class="cu-done-dots">${TW.JOURNEY.map(() => "<i></i>").join("")}</span></div>` : `<div class="card"><div class="cu-steps" data-hl="cust-journey" role="list">${TW.JOURNEY.map((j, i) => { const done = i < st || st === 6, now = i === st; return `<div class="cu-st ${done ? "done" : ""} ${now ? "now" : ""}" role="listitem" aria-current="${now ? "step" : "false"}"><span class="cu-st-b">${done ? ic("check", "ic xs") : `<i class="num">${i + 1}</i>`}</span><span class="grow">${esc(j)}${now && i === 1 && o.status === "AWAITING_CUSTOMER_DECISION" ? ` <small>— مستنيين ردك على البديل</small>` : now && i === 1 ? ` <small>— ${esc(prepText(o))}</small>` : now && i === 2 && r ? ` <small>— ${esc(r.ar)}</small>` : now && i === 0 && curT && ["WAITING", "OFFERED"].includes(curT.status) && S().fos.filter((f) => f.orderId === o.id).every((f) => ["PACKED", "READY"].includes(f.status)) ? ` <small>— بندورلك على أقرب مندوب</small>` : ""}</span></div>`; }).join("")}</div></div>`;
  const splitBox = o.split && tasks.length > 1 ? `<div class="card"><div class="banner warn" style="margin-bottom:10px">${ic("truck", "ic sm")}<div><b>طلبك هيوصل على مرتين عشان منأخركش.</b></div></div>${tasks.map((t, i) => { const nm = t.pickups.map((p) => (p.sourceType === "hub" ? "توّا" : p.name)).join(" + "); return `<div class="row between cu-small" style="padding:4px 0"><span>${ic("box", "ic xs")} الجزء ${i + 1}: ${esc(nm)}</span>${TW.chip(t.status === "DELIVERED" ? "وصل" : t.status === "PICKED_UP" || t.status === "ARRIVED" ? "في الطريق" : t.riderId ? "المندوب رايح يستلم" : "بيتجهز", t.status === "DELIVERED" ? "ok" : "info")}</div>`; }).join("")}</div>` : "";
  const riderCard = r && !delivered && !cancelled ? `<div class="card cu-rider"><div class="avatar">${esc(r.ar.slice(0, 1))}</div><div class="grow"><b>${esc(r.ar)}</b><small>${esc(D.vehicles[r.vehicle])}${r.plate && r.plate !== "—" ? ` · <span class="num">${esc(r.plate)}</span>` : ""} · ${ic("star", "ic xs")} ${num(r.rating, 1)}</small></div><button type="button" class="btn icon cu-round" data-act="sheet" data-v="chat" aria-label="رسالة للمندوب">${ic("chat", "ic sm")}</button><button type="button" class="btn icon cu-round ok" data-act="sheet" data-v="call" aria-label="اتصل بالمندوب">${ic("phone", "ic sm")}</button></div>` : "";
  const otp = showOtp ? `<div class="card cu-otp"><div><small>كود الاستلام</small><b class="mono">${esc(o.otp)}</b></div><p>قوله للمندوب بس لما تستلم الطلب في إيدك.</p></div>` : "";
  const cod = codDue ? `<div class="banner brand">${ic("cash", "ic sm")}<div>جهّز <b class="num">${m$(codDue)}</b> كاش للمندوب${o.pay.changeFor ? ` — قلتلنا معاك <b class="num">${num(o.pay.changeFor)}</b> والمندوب هيجهّز الباقي <b class="num">${m$(o.pay.changeFor - codDue)}</b>` : ""}.</div></div>` : "";
  const fosById = Object.fromEntries(S().fos.filter((f) => f.orderId === o.id).map((f) => [f.id, f]));
  const groups = TW.groupBy(o.lines, (l) => l.sourceId);
  const items = `<div class="card"><h3>${ic("receipt", "ic sm")} ${delivered ? "الإيصال" : "طلبك"} <span class="mono muted cu-small">${o.id}</span></h3>${Object.entries(groups).map(([sid, ls]) => `<div class="cu-rgroup"><div class="cu-lbl">${sid === "h1" ? "من توّا" : `من ${esc((fosById[ls[0].foId] || {}).name || (find(S().merchants, sid) || {}).ar || "")}`}</div>${ls.map((l) => `<div class="cu-rline ${l.state === "removed" ? "off" : ""}"><span class="num cu-q">${l.qty}×</span><span class="grow">${l.sub ? `<s class="muted">${esc(l.name)}</s> ${ic("arrowL", "ic xs")} <b>${esc(l.sub.name)}</b> <small class="muted num">(${l.sub.diff > 0 ? "+" : ""}${m$(l.sub.diff)}${l.sub.absorbed ? " — توّا اتحملت الفرق" : ""})</small>` : esc(l.name)}${l.size ? ` <small class="muted">${esc(l.size)}</small>` : ""}${l.state === "removed" ? ` ${TW.chip("اتشال", "neutral")}` : l.state === "sub_pending" ? ` ${TW.chip("مستني رأيك", "warn")}` : l.state === "missing" ? ` ${TW.chip("بنتأكد منه", "warn")}` : ""}</span><span class="num">${l.state === "removed" ? "—" : m$((l.sub && !l.sub.absorbed ? l.sub.price : l.unitPrice) * l.qty)}</span></div>`).join("")}</div>`).join("")}
    <hr class="sep">${[["المنتجات", o.totals.items], ["التوصيل", o.totals.delivery], ["رسوم الخدمة", o.totals.service]].map(([k, v]) => `<div class="row between cu-small"><span>${k}</span><span class="num">${v ? m$(v) : "مجاني"}</span></div>`).join("")}${o.totals.discount ? `<div class="row between cu-small ok"><span>الخصم</span><span class="num">− ${m$(o.totals.discount)}</span></div>` : ""}<div class="row between cu-tot-t"><b>الإجمالي</b><b class="num">${m$(o.totals.total)}</b></div>
    <div class="row between wrap cu-small" style="margin-top:6px"><span class="muted">${PAY_LBL[o.pay.method]} · ${TW.clock(o.createdAt)} ${TW.dateAr(o.createdAt)}</span>${finChip(o)}</div></div>`;
  const cases = (o.caseIds || []).map((cid) => find(S().cases, cid)).filter(Boolean);
  const refunds = S().refunds.filter((rf) => rf.orderId === o.id);
  const caseBox = cases.length || refunds.length ? `<div class="card"><h3>${ic("help", "ic sm")} الدعم والاسترداد</h3>${cases.map((cs) => `<div class="cu-case"><div class="row between"><b>${esc(cs.type)} <span class="mono muted cu-small">${cs.id}</span></b>${TW.chip(cs.status === "RESOLVED" ? "اتحلّت" : cs.status === "PENDING_APPROVAL" ? "بانتظار موافقة الاسترداد" : "بنراجعها", cs.status === "RESOLVED" ? "ok" : "warn")}</div><small class="muted">${cs.status === "RESOLVED" ? esc(cs.resolution || "") : `اتفتحت ${Date.now() - cs.createdAt < 60000 ? "دلوقتي" : TW.ago(cs.createdAt)} — هنرد عليك خلال ساعة${cs.claim ? ` · قيمة الأصناف ${m$(cs.claim)}` : ""}`}</small></div>`).join("")}
    ${refunds.map((rf) => `<div class="cu-case"><div class="row between"><b class="num">استرداد ${m$(rf.amount)}</b>${TW.chip(rf.status === "COMPLETED" ? (rf.method === "wallet" ? "في محفظتك" : "اترد") : rf.status === "SUBMITTED" ? "في الطريق لبطاقتك" : rf.status === "FAILED" || rf.status === "REJECTED" ? "اترفض" : "بنراجعه", rf.status === "COMPLETED" ? "ok" : rf.status === "FAILED" || rf.status === "REJECTED" ? "bad" : "info")}</div><small class="muted">${esc(rf.reason)} · ${rf.method === "wallet" ? "محفظة توّا" : "نفس وسيلة الدفع (3–5 أيام)"}</small></div>`).join("")}</div>` : "";
  const rated = o.rating ? `<div class="card row between"><span>قيّمت الطلب</span><span class="cu-stars ro">${[1, 2, 3, 4, 5].map((i) => `<span class="${i <= o.rating.order ? "on" : ""}">${ic("star", "ic sm")}</span>`).join("")}</span></div>` : "";
  const after = delivered ? `${o.rating ? rated : `<button type="button" class="card cu-rate-cta" data-act="sheet" data-v="rate"><span class="tile tone-5">${ic("star", "ic")}</span><span class="grow"><b>إيه رأيك في الطلب؟</b><small>قيّم الطلب والمحل والمندوب</small></span>${ic("chevE", "ic sm")}</button>`}
    <div class="row"><button type="button" class="btn lg grow" data-act="reorder" data-id="${o.id}">${ic("refresh", "ic sm")}اطلبه تاني</button><button type="button" class="btn lg grow" data-act="sheet" data-v="report" data-hl="cust-report">${ic("help", "ic sm")}عندك مشكلة؟</button></div>` : "";
  const mapBlock = !delivered && !cancelled && curT ? `<div class="cu-mapwrap">${trackMap(o, curT)}<div class="cu-map-eta">${r ? `<small>${esc(r.ar)} · ${esc(D.vehicles[r.vehicle])}</small>` : `<small>${st >= 1 && S().fos.filter((f) => f.orderId === o.id).every((f) => ["PACKED", "READY"].includes(f.status)) ? "بندورلك على أقرب مندوب" : "لسه بيتجهز"}</small>`}<b class="num">${o.status === "SCHEDULED" || (o.mode === "scheduled" && orderWindow(o)) ? `رحلة ${esc(fmtWin(orderWindow(o)))}` : `الوصول حوالي ${TW.clock(Math.max(o.etaAt, Date.now() + 60000))}`}</b></div></div>` : "";
  const body = `<div class="cu-pad cu-pad-t col gap12">
    ${other ? `<div class="banner">${ic("info", "ic sm")}<div>الطلب ده باسم ${esc(other.ar)} — بتشوفه للعرض بس.</div></div>` : ""}
    ${just ? `<div class="banner ok cu-just">${ic("check", "ic sm")}<div><b>اتأكدنا من طلبك!</b> ${o.split ? "طلبك هيوصل على مرتين عشان منأخركش." : esc(orderEta(o))}.</div></div>` : ""}
    ${cancelled ? `<div class="banner">${ic("x", "ic sm")}<div><b>الطلب اتلغى.</b> ${o.pay.method !== "cod" ? "المبلغ هيرجعلك بنفس طريقة الدفع." : "مش هتدفع حاجة."}</div></div>` : ""}
    ${o.status === "DELIVERY_FAILED" ? `<div class="banner bad">${ic("phone", "ic sm")}<div><b>مقدرناش نوصلك.</b> المندوب حاول يكلمك — خدمة العملاء هتكلمك ترتب ميعاد تاني.</div></div>` : ""}
    ${subCard}${mapBlock}
    <div class="row between wrap"><div><div class="cu-o-lbl">${esc(lbl)}</div><div class="muted cu-small num">${esc(orderEta(o))}</div></div><div class="row gap4 wrap">${finChip(o)}</div></div>
    ${otp}${cod}${riderCard}${journey}${splitBox}${after}${caseBox}${items}
    ${!delivered && !cancelled ? `<div class="row"><button type="button" class="btn grow" data-act="sheet" data-v="report" ${delivered ? "" : ""}>${ic("help", "ic sm")}محتاج مساعدة</button>${st <= 1 ? `<button type="button" class="btn ghost grow cu-danger" data-act="sheet" data-v="cancel">${ic("x", "ic sm")}إلغاء الطلب</button>` : ""}</div>` : ""}
  </div>`;
  return { top: top(x, `طلب <span class="mono">${esc(o.id)}</span>`, { noLoc: true, right: delivered || cancelled ? "" : `<span class="cu-livedot">${TW.chip("مباشر", "ok")}</span>` }), body, order: o };
}
function prepText(o) { const fos = S().fos.filter((f) => f.orderId === o.id); if (fos.some((f) => f.status === "AWAITING_ACCEPT")) return "المحل بيأكد الطلب"; if (fos.some((f) => f.sourceType === "hub" && f.status === "PICKING")) return "بنجمّع طلبك"; if (fos.some((f) => f.status === "PREPARING")) return "المحل بيجهّز"; if (o.status === "SCHEDULED") return `جاهز ومستني رحلة ${fmtWin(orderWindow(o))}`; return "جاهز"; }

/* ===================================================================== ORDERS ===================== */
function orderCard(x, o) {
  const [lbl, tone] = custStatus(o);
  return `<div class="card cu-ocard"><button type="button" class="cu-ocard-b" data-act="go" data-to="/customer/order/${o.id}"><div class="row between"><b class="mono">${o.id}</b><span class="muted cu-small">${TW.dateAr(o.createdAt)} · ${TW.clock(o.createdAt)}</span></div><div class="cu-ell2 cu-small">${esc(itemsSummary(o))}</div><div class="row between wrap"><span class="row gap4 wrap">${TW.chip(lbl, tone)}${finChip(o)}</span><b class="num">${m$(o.totals.total)}</b></div></button>${isLive(o) ? `<button type="button" class="btn sm primary block" data-act="go" data-to="/customer/order/${o.id}">${ic("nav", "ic xs")}تابع الطلب</button>` : `<div class="row"><button type="button" class="btn sm grow" data-act="reorder" data-id="${o.id}">${ic("refresh", "ic xs")}اطلبه تاني</button><button type="button" class="btn sm ghost grow" data-act="go" data-to="/customer/order/${o.id}">التفاصيل</button></div>`}</div>`;
}
function vOrders(inst, x) {
  const os = custOrders(x.cid), live = os.filter(isLive), past = os.filter((o) => !isLive(o));
  const body = `<div class="cu-pad cu-pad-t col gap12">${!os.length ? `<div class="card">${TW.empty("لسه مطلبتش حاجة", "أول طلب ليك هيظهر هنا", "receipt")}<button type="button" class="btn primary lg block" data-act="go" data-to="/customer">ابدأ التسوق</button></div>` : ""}
    ${live.length ? `<div class="cu-lbl">${ic("zap", "ic xs")} شغالة دلوقتي</div>${live.map((o) => orderCard(x, o)).join("")}` : ""}
    ${past.length ? `<div class="cu-lbl">${ic("history", "ic xs")} طلبات قبل كده</div>${past.map((o) => orderCard(x, o)).join("")}` : ""}</div>`;
  return { top: top(x, "طلباتي", { noBack: true }), body };
}

/* ===================================================================== ACCOUNT ===================== */
const TIERS = [["برونزي", 0], ["فضي", 300], ["ذهبي", 1000]];
function vAccount(inst, x, sub) {
  const c = x.c;
  if (sub) return vAccountSub(inst, x, sub);
  const rows = [["addresses", "pin", "عناويني", `${c.addresses.length} عنوان`], ["wallet", "wallet", "محفظة توّا", m$(c.wallet || 0)], ["favs", "heart", "المفضلة", `${c.favs.length} منتج`], ["baskets", "list", "سلال محفوظة واطلب تاني", `${c.baskets.length} سلة`], ["notes", "bell", "الإشعارات", ""], ["subs", "refresh", "لو منتج خلص", { call: "اسألني الأول", auto: "بدّل بأقرب بديل", remove: "شيل الصنف" }[c.subPref] || ""], ["points", "crown", "نقاطي ومستوايا", `${num(c.points || 0)} نقطة`], ["help", "help", "المساعدة والدعم", "واتساب"]];
  const body = `<div class="cu-pad cu-pad-t col gap12"><div class="card cu-prof"><div class="avatar lg">${esc(c.ar.slice(0, 1))}</div><div class="grow"><b>${esc(c.ar)}</b><small class="num ltr">${esc(c.phone)}</small><div class="row gap4 wrap" style="margin-top:4px">${TW.chip(`عميل ${c.tier || "برونزي"}`, "brand", "crown")}${TW.chip(`${num(c.orders)} طلب`, "neutral", "receipt")}</div></div></div>
    <button type="button" class="card cu-wallet" data-act="go" data-to="/customer/account/wallet"><span>${ic("wallet", "ic")} رصيد محفظة توّا</span><b class="num">${m$(c.wallet || 0)}</b><small>الاسترداد والتعويضات بتنزل هنا فوراً</small></button>
    <div class="card cu-menu">${rows.map(([k, i, l, v]) => `<button type="button" class="cu-mi" data-act="go" data-to="/customer/account/${k}"><span class="tile tone-1">${ic(i, "ic sm")}</span><span class="grow">${l}</span><small class="muted num">${esc(v)}</small>${ic("chevE", "ic xs")}</button>`).join("")}</div>
    <p class="cu-foot-note">${ic("pin", "ic xs")} ${esc(D.geo.markaz.ar)} · ${esc(D.geo.governorate.ar)}</p></div>`;
  return { top: top(x, "حسابي", { noBack: true }), body };
}
function vAccountSub(inst, x, sub) {
  const c = x.c; let title = "", body = "";
  if (sub === "addresses") {
    title = "عناويني";
    body = `<div class="cu-pad cu-pad-t col gap12">${c.addresses.map((a) => { const z = find(S().zones, a.zoneId); const on = a.id === c.addr; return `<button type="button" class="card cu-arow ${on ? "on" : ""}" data-act="addr-set" data-id="${a.id}" role="radio" aria-checked="${on}"><span class="cu-radio"></span><span class="grow"><b>${esc(a.label)} · ${esc(z.ar)}</b><small>${esc(a.landmark)}${a.street ? ` — ${esc(a.street)}` : ""}</small><small class="muted num">${esc(zoneEta(z).t)} · توصيل ${money(z.fee)}</small></span>${on ? TW.chip("الحالي", "ok") : ""}</button>`; }).join("")}<button type="button" class="btn lg block" data-act="loc-new">${ic("plus", "ic sm")}ضيف عنوان جديد</button>
      ${c.waitlist.length ? `<div class="banner">${ic("bell", "ic sm")}<div>أنت في قائمة الانتظار لـ: <b>${c.waitlist.map((zid) => esc((find(S().zones, zid) || {}).ar || zid)).join("، ")}</b> — هنبلغك أول ما نوصل.</div></div>` : ""}</div>`;
  } else if (sub === "wallet") {
    title = "محفظة توّا";
    const mine = new Set(custOrders(x.cid).map((o) => o.id));
    const rfs = S().refunds.filter((r) => mine.has(r.orderId)).sort((a, b) => b.at - a.at);
    const comps = S().cases.filter((cs) => cs.customerId === x.cid && cs.comp);
    const paid = custOrders(x.cid).filter((o) => o.pay.method === "wallet");
    body = `<div class="cu-pad cu-pad-t col gap12"><div class="card cu-wallet big"><span>${ic("wallet", "ic")} رصيدك دلوقتي</span><b class="num">${m$(c.wallet || 0)}</b><small>تقدر تدفع بيه أي طلب من صفحة التأكيد</small></div>
      <div class="card"><h3>${ic("history", "ic sm")} الحركات</h3>${rfs.length || comps.length || paid.length ? `<div class="list">${rfs.map((r) => `<div class="li"><span class="tile tone-2 cu-li-t">${ic("undo", "ic sm")}</span><div class="grow"><b class="cu-small">${esc(r.reason)}</b><small class="muted"><span class="mono">${r.orderId}</span> · ${TW.ago(r.at)} · ${r.method === "wallet" ? "للمحفظة" : "لوسيلة الدفع"}</small></div><div class="c"><b class="num ok">+${m$(r.amount)}</b>${TW.chip(r.status === "COMPLETED" ? "تم" : r.status === "SUBMITTED" ? "في الطريق" : r.status === "PENDING_APPROVAL" || r.status === "REQUESTED" ? "بنراجعه" : "اترفض", r.status === "COMPLETED" ? "ok" : r.status === "FAILED" || r.status === "REJECTED" ? "bad" : "info")}</div></div>`).join("")}${comps.map((cs) => `<div class="li"><span class="tile tone-5 cu-li-t">${ic("gift", "ic sm")}</span><div class="grow"><b class="cu-small">تعويض — ${esc(cs.type)}</b><small class="muted mono">${cs.id}</small></div><b class="num ok">+${m$(cs.comp)}</b></div>`).join("")}${paid.map((o) => `<div class="li"><span class="tile tone-4 cu-li-t">${ic("bag", "ic sm")}</span><div class="grow"><b class="cu-small">دفع طلب</b><small class="muted mono">${o.id}</small></div><b class="num">−${m$(o.totals.total)}</b></div>`).join("")}</div>` : `<p class="muted cu-small">لسه مفيش حركات. أي استرداد أو تعويض هيظهر هنا.</p>`}</div></div>`;
  } else if (sub === "favs") {
    title = "المفضلة";
    const list = c.favs.map(sku).filter(Boolean);
    body = `<div class="cu-pad cu-pad-t">${list.length ? grid(x, list) : `<div class="card">${TW.empty("لسه مفيش مفضلة", "دوس على القلب في صفحة أي منتج", "heart")}</div>`}</div>`;
  } else if (sub === "baskets") {
    title = "اطلب تاني";
    const na = needAgain(x).slice(0, 8).map((e) => e.s); const weekly = na.length ? na : boughtBefore(x).slice(0, 6);
    const recent = custOrders(x.cid).filter((o) => o.status === "DELIVERED").slice(0, 4);
    body = `<div class="cu-pad cu-pad-t col gap12">
      ${weekly.length ? `<div class="card"><div class="hd"><h3>${ic("sparkle", "ic sm")} طلبات الأسبوع المقترحة</h3></div><p class="muted cu-small">من اللي بتشتريه كل أسبوع وقرّب يخلص.</p><div class="cu-chips cu-wrap" style="margin:8px 0">${weekly.map((s) => `<span class="cu-chip sm static">${esc(s.ar)}</span>`).join("")}</div><button type="button" class="btn accent block" data-act="basket-add" data-weekly="1">${ic("plus", "ic sm")}ضيفهم كلهم للسلة</button></div>` : ""}
      ${c.baskets.map((b) => `<div class="card"><div class="hd"><h3>${ic("list", "ic sm")} ${esc(b.name)}</h3><small class="muted">${b.lines.length} صنف</small></div><div class="cu-small muted cu-ell2">${b.lines.map((l) => esc(l.skuId ? (sku(l.skuId) || {}).ar : ((S().menus[l.merchantId] || []).find((i) => i.id === l.menuItemId) || {}).name)).join("، ")}</div><button type="button" class="btn block" style="margin-top:8px" data-act="basket-add" data-id="${b.id}">${ic("cart", "ic sm")}ضيف السلة دي</button></div>`).join("")}
      ${!c.baskets.length ? `<div class="banner">${ic("info", "ic sm")}<div>تقدر تحفظ أي سلة من صفحة السلة («احفظ السلة») وتطلبها بضغطة بعد كده.</div></div>` : ""}
      ${recent.length ? `<div class="cu-lbl">${ic("history", "ic xs")} آخر طلبات وصلتك</div>${recent.map((o) => orderCard(x, o)).join("")}` : ""}
      ${boughtBefore(x).length ? `<div class="cu-lbl">${ic("bag", "ic xs")} منتجات اشتريتها قبل كده</div>${grid(x, boughtBefore(x).slice(0, 12))}` : ""}</div>`;
  } else if (sub === "notes") {
    title = "الإشعارات";
    const ns = S().notes.filter((n) => n.to === `customer:${x.cid}`).slice(0, 40);
    body = `<div class="cu-pad cu-pad-t">${ns.length ? `<div class="card cu-menu">${ns.map((n) => `<${n.orderId ? "button" : "div"} ${n.orderId ? `type="button" data-act="go" data-to="/customer/order/${n.orderId}"` : ""} class="cu-mi tall"><span class="tile ${n.alert ? "tone-4" : "tone-1"}">${ic(n.alert ? "bell" : "info", "ic sm")}</span><span class="grow"><b>${esc(n.title)}</b><small>${esc(n.body)}</small></span><time class="muted cu-small" data-ago="${n.at}">${TW.ago(n.at)}</time></${n.orderId ? "button" : "div"}>`).join("")}</div>` : `<div class="card">${TW.empty("مفيش إشعارات", "هنبلغك هنا بكل جديد في طلباتك", "bell")}</div>`}</div>`;
  } else if (sub === "subs") {
    title = "لو منتج خلص";
    body = `<div class="cu-pad cu-pad-t col gap12"><p class="muted">اختار نعمل إيه لو منتج طلبته خلص وإحنا بنجهّز. ده هيبقى اختيارك في كل طلب، وتقدر تغيّره من السلة.</p><div class="cu-opts">${[["call", "اسألني الأول", "هنبعتلك البديل في التطبيق وتختار — لو مردتش خلال 5 دقايق هنشيله"], ["auto", "بدّل بأقرب بديل", `لو الفرق مش أكتر من ${S().rules.subPriceTolerance}% — ولو أغلى شوية توّا بتتحمل الفرق`], ["remove", "شيل الصنف", "ومش هتدفع تمنه"]].map(([k, l, sb]) => `<button type="button" class="cu-opt ${c.subPref === k ? "on" : ""}" data-act="subpref" data-v="${k}" role="radio" aria-checked="${c.subPref === k}"><span class="cu-radio"></span><span class="grow"><b>${l}</b><small>${sb}</small></span></button>`).join("")}</div></div>`;
  } else if (sub === "points") {
    title = "نقاطي";
    const p = c.points || 0, nxt = TIERS.find((t) => t[1] > p);
    body = `<div class="cu-pad cu-pad-t col gap12"><div class="card cu-wallet big"><span>${ic("crown", "ic")} مستواك: ${esc(c.tier || "برونزي")}</span><b class="num">${num(p)} نقطة</b><small>${nxt ? `فاضل ${num(nxt[1] - p)} نقطة وتبقى ${nxt[0]}` : "أنت في أعلى مستوى — شكراً إنك معانا"}</small></div>${nxt ? TW.meter(p, nxt[1], "brand") : ""}
      <div class="card"><h3>${ic("gift", "ic sm")} مميزات المستويات</h3><div class="list">${[["برونزي", "عروض أول طلب ورسائل العروض القريبة"], ["فضي", "توصيل مجاني مرة في الشهر + أولوية في الدعم"], ["ذهبي", "خصومات حصرية وأولوية في رحلات القرى"]].map(([t, d]) => `<div class="li"><span class="tile ${t === c.tier ? "tone-5" : "tone-1"} cu-li-t">${ic("crown", "ic sm")}</span><div class="grow"><b>${t}</b><small class="muted">${d}</small></div>${t === c.tier ? TW.chip("مستواك", "ok") : ""}</div>`).join("")}</div></div>
      <div class="lock">${ic("lock", "ic xs")} استبدال النقاط بخصم هيتفعّل قريباً — النقاط بتتحسب على كل طلب بيوصلك.</div></div>`;
  } else if (sub === "help") {
    title = "المساعدة والدعم";
    const faq = [["الطلب هيوصل امتى؟", "في قلب المدينة الطلب بيوصل عادة خلال 20–40 دقيقة. القرى القريبة 35–55 دقيقة. القرى البعيدة بنوصلها على رحلات في مواعيد ثابتة بتظهرلك قبل ما تأكد."], ["لو منتج خلص؟", "حسب اختيارك: نسألك الأول، أو نبدّله بأقرب بديل في حدود فرق سعر صغير، أو نشيله ومتدفعش تمنه."], ["الدفع كاش إزاي؟", "بتدفع للمندوب لما الطلب يوصل. قولنا معاك فكة لكام عشان المندوب يجهّز الباقي. الكاش متاح لحد 1,500 ج.م للطلب."], ["لو فيه صنف ناقص أو تالف؟", "افتح الطلب ودوس «عندك مشكلة؟» واختار الصنف. بنراجع خلال ساعة، والاسترداد بينزل في محفظة توّا."], ["كود الاستلام ده إيه؟", "رقم سري من 4 أرقام بيظهرلك لما الطلب يخرج. قوله للمندوب بس لما تستلم في إيدك — ده بيحمي فلوسك."]];
    body = `<div class="cu-pad cu-pad-t col gap12"><div class="card cu-wa"><span class="tile tone-2">${ic("chat", "ic")}</span><div class="grow"><b>كلّمنا على واتساب</b><small>من 8 الصبح لـ 12 بالليل</small><span class="cu-wa-n num ltr" tabindex="0">0100 882 9292</span></div></div>
      <button type="button" class="btn lg block" data-act="go" data-to="/customer/orders">${ic("receipt", "ic sm")}عندي مشكلة في طلب</button>
      <div class="card cu-faq">${faq.map(([q, a], i) => `<div class="cu-fq ${inst.ui["faq" + i] ? "open" : ""}"><button type="button" data-act="ui-toggle" data-k="faq${i}" aria-expanded="${!!inst.ui["faq" + i]}"><span class="grow">${q}</span>${ic("chevD", "ic xs")}</button>${inst.ui["faq" + i] ? `<p>${a}</p>` : ""}</div>`).join("")}</div></div>`;
  } else return notFound(x, "الصفحة دي مش موجودة");
  return { top: top(x, title), body };
}
function notFound(x, msg) { return { top: top(x, "مش موجود"), body: `<div class="cu-pad cu-pad-t"><div class="card">${TW.empty(msg, "ارجع للرئيسية وجرّب تاني", "search")}<button type="button" class="btn primary block" data-act="go" data-to="/customer">الرئيسية</button></div></div>` }; }

/* ===================================================================== SHEETS ===================== */
function zoneInfo(z) { if (!z.active) return "لسه موصلناش"; if (z.route === "scheduled") return `رحلات: ${z.windows.map(fmtWin).join("، ")}`; return `${z.sla[0]}–${z.sla[1]} دقيقة`; }
function sheetLoc(inst, x) {
  const c = x.c, zsel = inst.ui.locZone ? find(S().zones, inst.ui.locZone) : null;
  const newMode = inst.ui.locNew || !c.addresses.length;
  if (!newMode) {
    const body = `${c.addresses.map((a) => { const z = find(S().zones, a.zoneId); const on = a.id === c.addr; return `<button type="button" class="cu-arow ${on ? "on" : ""}" data-act="addr-set" data-id="${a.id}" role="radio" aria-checked="${on}"><span class="cu-radio"></span><span class="grow"><b>${esc(a.label)} · ${esc(z.ar)}</b><small>${esc(a.landmark)}</small><small class="muted num">${esc(zoneInfo(z))} · توصيل ${money(z.fee)}</small></span></button>`; }).join("")}`;
    return TW.sheet("هنوصل الطلب فين؟", body, `<button type="button" class="btn lg block" data-act="loc-new">${ic("plus", "ic sm")}عنوان جديد</button>`);
  }
  const groups = [["core", "قلب المدينة"], ["near", "قرى قريبة"], ["outer", "قرى بعيدة"]];
  const zlist = groups.map(([t, l]) => `<div class="cu-lbl">${l}</div>${S().zones.filter((z) => z.type === t).map((z) => { const on = zsel && zsel.id === z.id; const wl = c.waitlist.includes(z.id); return `<div class="cu-zrow ${on ? "on" : ""} ${z.active ? "" : "off"}">${z.active ? `<button type="button" class="cu-zrow-b" data-act="loc-zone" data-id="${z.id}" role="radio" aria-checked="${on}"><span class="cu-radio"></span><span class="grow"><b>${esc(z.ar)}</b><small class="num">${esc(zoneInfo(z))}</small><small class="num muted">توصيل ${money(z.fee)} · حد أدنى ${money(z.min)}</small></span></button>` : `<div class="cu-zrow-b"><span class="cu-radio off"></span><span class="grow"><b>${esc(z.ar)}</b><small class="warn-t">لسه موصلناش — سجّل في قائمة الانتظار</small></span>${wl ? TW.chip("اتسجلت", "ok", "check") : `<button type="button" class="btn sm" data-act="waitlist" data-zone="${z.id}">${ic("bell", "ic xs")}سجّلني</button>`}</div>`}</div>`; }).join("")}`).join("");
  let form = "";
  if (zsel) {
    const pin = inst.ui.locPin; const pr = (zsel.pr + 30) * 1.5; const vb = `${zsel.x - pr} ${zsel.y - pr * 0.5625} ${pr * 2} ${pr * 1.125}`; const pk = pr / 180;
    form = `<div class="cu-locform col gap12"><div class="cu-lbl">${ic("pin", "ic xs")} العنوان في ${esc(zsel.ar)}</div>
      <label class="field"><span>علامة مميزة (مطلوب) — المندوب بيوصل بيها</span><input class="input" data-model="locLandmark" value="${esc(inst.ui.locLandmark || "")}" placeholder="مثلاً: جنب الجامع الكبير، البيت اللي بابه أخضر"></label>
      <label class="field"><span>الشارع (لو تعرفه)</span><input class="input" data-model="locStreet" value="${esc(inst.ui.locStreet || "")}" placeholder="اختياري"></label>
      <div><div class="cu-lbl">اسم العنوان</div><div class="cu-chips cu-wrap">${["البيت", "الشغل", "بيت العيلة", "عنوان تاني"].map((l) => `<button type="button" class="cu-chip ${(inst.ui.locLabel || "البيت") === l ? "on" : ""}" data-act="ui" data-k="locLabel" data-v="${l}">${l}</button>`).join("")}</div></div>
      <div><div class="cu-lbl">${ic("map", "ic xs")} حدد مكانك على الخريطة (اختياري)</div><div class="map cu-pinmap"><svg viewBox="${vb}" preserveAspectRatio="xMidYMid slice" data-act="loc-pin" role="button" aria-label="دوس على مكانك في الخريطة">${ROADS}<circle class="zone sel" vector-effect="non-scaling-stroke" cx="${zsel.x}" cy="${zsel.y}" r="${zsel.pr + 26}"/><text class="zl" x="${zsel.x}" y="${zsel.y - zsel.pr - 34}" text-anchor="middle" style="font-size:${(13 * pk).toFixed(1)}px">${esc(zsel.ar)}</text>${pin ? `<g class="cu-mk-home"><circle cx="${pin.x}" cy="${pin.y}" r="${(12 * pk).toFixed(1)}"/><g class="cu-mk-g" transform="translate(${(pin.x - 7 * pk).toFixed(1)} ${(pin.y - 7 * pk).toFixed(1)}) scale(${(14 * pk / 24).toFixed(3)})">${TW.I.home}</g></g>` : ""}</svg><span class="cu-pinhint">${pin ? "اتحدد مكانك ✓ — دوس تاني لو عايز تغيّره" : "دوس على مكانك"}</span></div></div></div>`;
  }
  const body = `${c.addresses.length ? `<button type="button" class="btn sm ghost" style="align-self:flex-start" data-act="ui" data-k="locNew" data-v="null">${ic("chevS", "ic xs")}العناوين المحفوظة</button>` : ""}<div class="cu-lbl">اختار القرية أو المنطقة</div>${zsel ? `<div class="cu-zrow on"><div class="cu-zrow-b"><span class="cu-radio"></span><span class="grow"><b>${esc(zsel.ar)}</b><small class="num">${esc(zoneInfo(zsel))} · توصيل ${money(zsel.fee)} · حد أدنى ${money(zsel.min)}</small></span><button type="button" class="btn sm ghost" data-act="ui" data-k="locZone" data-v="null">غيّر</button></div></div>${form}` : zlist}`;
  const foot = zsel ? `<button type="button" class="btn primary lg block" data-act="loc-save" ${(inst.ui.locLandmark || "").trim() ? "" : "disabled"}>${ic("check", "ic sm")}احفظ ووصّل هنا</button>` : "";
  return TW.sheet("هنوصل الطلب فين؟", body, foot);
}
function sheetMenu(inst, x) {
  const st = inst.ui.mod; const m = st && find(S().merchants, st.mid); const it = m && (S().menus[m.id] || []).find((i) => i.id === st.itemId); if (!it) return "";
  const sel = st.sel || {}; const q = st.qty || 1;
  const chosen = it.mods.flatMap((g, gi) => (sel[gi] || []).map((n) => g.opts.find((o) => o.n === n)).filter(Boolean));
  const missing = it.mods.filter((g, gi) => g.req && !(sel[gi] || []).length);
  const total = (it.price + sum(chosen, (o) => o.p)) * q;
  const body = `<div class="row top cu-mhead"><span class="tile tone-4 cu-mhero">${ic("food", "ic xl")}</span><div class="grow"><b>${esc(it.name)}</b><small class="muted">${esc(m.ar)}</small>${it.desc ? `<p class="cu-small">${esc(it.desc)}</p>` : ""}<b class="num cu-mhead-p">${m$(it.price)}</b></div></div>
    ${it.mods.map((g, gi) => `<div class="cu-modg"><div class="row between"><b>${esc(g.name)}</b>${g.req ? TW.chip((sel[gi] || []).length ? "تمام" : "مطلوب", (sel[gi] || []).length ? "ok" : "warn") : `<small class="muted">اختياري${g.max > 1 ? ` · لحد ${g.max}` : ""}</small>`}</div>${g.opts.map((o) => { const on = (sel[gi] || []).includes(o.n); return `<button type="button" class="cu-opt sm ${on ? "on" : ""}" data-act="mod-pick" data-g="${gi}" data-o="${esc(o.n)}" role="${g.max > 1 ? "checkbox" : "radio"}" aria-checked="${on}"><span class="cu-radio ${g.max > 1 ? "sq" : ""}"></span><span class="grow">${esc(o.n)}</span><small class="num">${o.p ? `+${m$(o.p)}` : ""}</small></button>`; }).join("")}</div>`).join("")}`;
  const foot = `<div class="cu-step lg"><button type="button" data-act="mod-qty" data-q="${q - 1}" ${q <= 1 ? "disabled" : ""} aria-label="قلّل">${ic("minus", "ic xs")}</button><span class="num">${q}</span><button type="button" data-act="mod-qty" data-q="${q + 1}" aria-label="زوّد">${ic("plus", "ic xs")}</button></div><button type="button" class="btn accent lg grow" data-act="menu-add" ${missing.length ? "disabled" : ""}>${missing.length ? `اختار ${esc(missing[0].name)}` : `ضيف للسلة · <span class="num">${m$(total)}</span>`}</button>`;
  return TW.sheet("اختار طلبك", body, foot);
}
function sheetFor(inst, x) {
  const k = inst.ui.sheet; if (!k) return "";
  if (k === "loc") return sheetLoc(inst, x);
  if (k === "menu") return sheetMenu(inst, x);
  if (k === "basket") {
    const nm = inst.ui.bname || "طلبات الأسبوع";
    return TW.sheet("احفظ السلة", `<p class="muted cu-small">هتلاقيها في «حسابي ← اطلب تاني» وتطلبها بضغطة.</p><div class="cu-chips cu-wrap">${["طلبات الأسبوع", "فطار العيلة", "طلبات الشهر", "حاجات البيبي"].map((l) => `<button type="button" class="cu-chip ${nm === l ? "on" : ""}" data-act="ui" data-k="bname" data-v="${l}">${l}</button>`).join("")}</div><label class="field"><span>أو سمّيها بنفسك</span><input class="input" data-model="bname" value="${esc(nm)}"></label>`, `<button type="button" class="btn primary lg block" data-act="basket-save" ${nm.trim() ? "" : "disabled"}>${ic("check", "ic sm")}احفظ</button>`);
  }
  const o = inst.route[0] === "order" && find(S().orders, inst.route[1]); if (!o) return "";
  const t = orderTasks(o).find((y) => y.riderId && !["DELIVERED"].includes(y.status)); const r = t && find(S().riders, t.riderId);
  if (k === "call") return TW.sheet("اتصال بالمندوب", `<div class="cu-mask"><span class="tile tone-6">${ic("shield", "ic lg")}</span><p><b>رقمك ورقم المندوب متخفيين.</b> المكالمة بتعدّي على رقم توّا الوسيط، فمحدش بيشوف رقم التاني — وبيتقفل بعد ما الطلب يوصل.</p></div>${r ? `<div class="row between card flat"><span>${esc(r.ar)} · ${esc(D.vehicles[r.vehicle])}</span><span class="mono">0155 000 1188 · تحويلة ${o.id.slice(3)}</span></div>` : `<div class="banner warn">${ic("info", "ic sm")}<div>لسه مفيش مندوب على الطلب.</div></div>`}`, `<button type="button" class="btn ok-btn lg block" data-act="call-now" ${r ? "" : "disabled"}>${ic("phone", "ic sm")}اتصل دلوقتي</button>`);
  if (k === "chat") return TW.sheet("رسالة للمندوب", `<p class="muted cu-small">اختار رسالة جاهزة — بتوصل للمندوب في التطبيق على طول.</p><div class="cu-opts">${["أنا نازل أستلم", "اتصل بيا لما توصل", "سيب الطلب مع البواب", "الجرس بايظ — كلّمني", "العمارة ورا الجامع"].map((mm) => `<button type="button" class="cu-opt" data-act="chat-send" data-msg="${esc(mm)}"><span class="grow">${esc(mm)}</span>${ic("chevE", "ic xs")}</button>`).join("")}</div>`);
  if (k === "cancel") {
    const rs = ["غيّرت رأيي", "طلبت حاجة غلط", "الوقت طويل عليا", "هطلب من مكان تاني", "سبب آخر"]; const cr = inst.ui.cReason || rs[0];
    const started = S().fos.some((f) => f.orderId === o.id && !["QUEUED", "AWAITING_ACCEPT"].includes(f.status));
    return TW.sheet("إلغاء الطلب", `${started ? `<div class="banner warn">${ic("info", "ic sm")}<div><b>طلبك بدأ يتجهز.</b> الإلغاء دلوقتي محتاج موافقة خدمة العملاء (BR-CAN-002) — هنبعتلهم طلبك وهيردوا عليك بسرعة.</div></div>` : `<div class="banner ok">${ic("check", "ic sm")}<div>الإلغاء مجاني دلوقتي لأن الطلب لسه متجهزش.</div></div>`}<div class="cu-lbl">ليه عايز تلغي؟</div><div class="cu-opts">${rs.map((x2) => `<button type="button" class="cu-opt sm ${cr === x2 ? "on" : ""}" data-act="ui" data-k="cReason" data-v="${x2}" role="radio" aria-checked="${cr === x2}"><span class="cu-radio"></span><span class="grow">${x2}</span></button>`).join("")}</div>`, `<button type="button" class="btn danger lg grow" data-act="cancel-confirm">${started ? "ابعت طلب الإلغاء" : "ألغي الطلب"}</button><button type="button" class="btn lg" data-act="sheet-close">رجوع</button>`);
  }
  if (k === "rate") {
    const rt = inst.ui.rate || {}; const hasM = S().fos.some((f) => f.orderId === o.id && f.sourceType === "merchant"); const hasR = orderTasks(o).some((y) => y.riderId);
    const stars = (key, label) => `<div class="cu-rrow"><span>${label}</span><span class="cu-stars">${[1, 2, 3, 4, 5].map((i) => `<button type="button" class="${i <= (rt[key] || 0) ? "on" : ""}" data-act="rate-star" data-k2="${key}" data-v="${i}" aria-label="${i} من 5">${ic("star", "ic")}</button>`).join("")}</span></div>`;
    const tags = (rt.order || 5) >= 4 ? ["وصل بسرعة", "المندوب محترم", "التغليف كويس", "المنتجات فريش", "الأكل وصل سخن"] : ["اتأخر", "صنف ناقص", "التغليف وحش", "المندوب مش متعاون", "المنتج مش فريش"];
    return TW.sheet("قيّم طلبك", `${stars("order", "الطلب كله")}${hasM ? stars("merchant", "المحل") : ""}${hasR ? stars("rider", "المندوب") : ""}<div class="cu-lbl">إيه اللي عجبك أو مضايقك؟</div><div class="cu-chips cu-wrap">${tags.map((tg) => `<button type="button" class="cu-chip ${(rt.tags || []).includes(tg) ? "on" : ""}" data-act="rate-tag" data-v="${tg}">${tg}</button>`).join("")}</div>${(rt.order || 5) <= 2 ? `<div class="banner warn">${ic("help", "ic sm")}<div>آسفين جداً. هنفتحلك حالة دعم تلقائياً ونكلمك.</div></div>` : ""}`, `<button type="button" class="btn primary lg block" data-act="rate-send" ${rt.order ? "" : "disabled"}>${ic("check", "ic sm")}ابعت التقييم</button>`);
  }
  if (k === "report") {
    const rp = inst.ui.rep || {}; const keys = rp.keys || []; const type = rp.type || (o.status === "DELIVERED" ? "صنف ناقص" : "التوصيل اتأخر");
    const itemTypes = ["صنف ناقص", "صنف غلط", "صنف تالف"].includes(type);
    return TW.sheet("عندك مشكلة؟", `<div class="cu-lbl">إيه المشكلة؟</div><div class="cu-chips cu-wrap">${TW.REASONS.support.map((tp) => `<button type="button" class="cu-chip ${type === tp ? "on" : ""}" data-act="rep-type" data-v="${tp}">${tp}</button>`).join("")}</div>
      ${itemTypes ? `<div class="cu-lbl">أنهي صنف؟</div><div class="cu-opts">${o.lines.filter((l) => l.state !== "removed").map((l) => { const on = keys.includes(l.key); return `<button type="button" class="cu-opt sm ${on ? "on" : ""}" data-act="rep-key" data-key="${l.key}" role="checkbox" aria-checked="${on}"><span class="cu-radio sq"></span><span class="grow">${esc(l.sub ? l.sub.name : l.name)} <small class="muted">× ${l.qty}</small></span><small class="num">${m$((l.sub ? l.sub.price : l.unitPrice) * l.qty)}</small></button>`; }).join("")}</div>` : ""}
      <button type="button" class="cu-opt sm ${rp.photo ? "on" : ""}" data-act="rep-photo" role="checkbox" aria-checked="${!!rp.photo}"><span class="cu-radio sq"></span>${ic("camera", "ic sm")}<span class="grow">أرفق صورة (بتسرّع المراجعة)</span></button>
      <label class="field"><span>تفاصيل (اختياري)</span><textarea class="input" data-model="repNote" rows="2" placeholder="مثلاً: علبة الجبنة مش في الشنطة">${esc(inst.ui.repNote || "")}</textarea></label>
      <p class="muted cu-small">${ic("shield", "ic xs")} بنراجع سجل تجهيز وتسليم الطلب خطوة بخطوة، والاسترداد بينزل في محفظة توّا.</p>`, `<button type="button" class="btn primary lg block" data-act="rep-send" ${itemTypes && !keys.length ? "disabled" : ""}>${itemTypes && !keys.length ? "اختار الصنف" : "ابعت المشكلة"}</button>`);
  }
  return "";
}

/* ===================================================================== APP ===================== */
TW.apps.customer = {
  kind: "phone", actorKind: "customer", title: "توّا — العميل",
  render(inst) {
    M = new Map();
    try {
      const x = ctx(inst), [p, a, b] = inst.route;
      let v, tab = "home";
      if (!p) v = vHome(inst, x);
      else if (p === "categories") { v = vCategories(inst, x); tab = "cats"; }
      else if (p === "dept") { v = vDept(inst, x, a); tab = "cats"; }
      else if (p === "shops") { v = vShops(inst, x, a); tab = "cats"; }
      else if (p === "store") { v = vStore(inst, x, a); tab = "cats"; }
      else if (p === "search") { v = vSearch(inst, x); tab = "search"; }
      else if (p === "product") { v = vProduct(inst, x, a); tab = null; }
      else if (p === "cart") { v = vCart(inst, x); tab = null; }
      else if (p === "checkout") { v = vCheckout(inst, x); tab = null; }
      else if (p === "orders") { v = vOrders(inst, x); tab = "orders"; }
      else if (p === "order") { v = vOrder(inst, x, a); tab = "orders"; }
      else if (p === "account") { v = vAccount(inst, x, a); tab = "account"; }
      else v = notFound(x, "الصفحة دي مش موجودة");
      const showPill = !["cart", "checkout", "product"].includes(p) && cartOf(x.cid) && cartOf(x.cid).lines.length;
      const pill = showPill ? (() => { const ls = cartLinesSafe(x.cid); const n = sum(ls, (l) => l.qty), tot = sum(ls, (l) => l.unitPrice * l.qty); const min = x.z.min; return `<button type="button" class="cu-pill" data-act="go" data-to="/customer/cart" data-hl="cust-cart-btn"><span class="cu-pill-n num">${n}</span><span class="grow"><b>عرض السلة</b><small>${tot < min ? `ضيف ${m$(min - tot)} للحد الأدنى` : esc(zoneEta(x.z).t)}</small></span><b class="num">${m$(tot)}</b>${ic("chevE", "ic sm")}</button>`; })() : "";
      const live = custOrders(x.cid).filter(isLive).length;
      const tabs = v.noTabs ? "" : `<nav class="tabbar cu-tabs" aria-label="التنقل الرئيسي">${[["home", "/customer", "home", "الرئيسية"], ["cats", "/customer/categories", "grid", "الأقسام"], ["search", "/customer/search", "search", "البحث"], ["orders", "/customer/orders", "receipt", "طلباتي"], ["account", "/customer/account", "user", "حسابي"]].map(([k, to, i, l]) => `<button type="button" class="${tab === k ? "on" : ""}" data-act="${k === "search" ? "tab-search" : "go"}" data-to="${to}" aria-current="${tab === k ? "page" : "false"}">${ic(i)}<span>${l}</span>${k === "orders" && live ? `<span class="badge num">${live}</span>` : ""}</button>`).join("")}</nav>`;
      return `<div class="app cu" data-route="${esc(p || "home")}">${v.top}<div class="app-scroll cu-scroll ${pill ? "has-pill" : ""}">${v.body}</div>${v.foot || ""}${pill || tabs ? `<div class="cu-nav">${pill}${tabs}</div>` : ""}${sheetFor(inst, x)}${TW.inappToast(inst)}</div>`;
    } finally { M = null; }
  },
  on: {
    loc(inst) { inst.ui.sheet = "loc"; inst.ui.locNew = false; inst.ui.locZone = null; inst.ui.locPin = null; inst.render(); },
    "loc-new"(inst) { inst.ui.sheet = "loc"; inst.ui.locNew = true; inst.ui.locZone = null; inst.ui.locPin = null; inst.ui.locLandmark = ""; inst.ui.locStreet = ""; inst.render(); },
    "loc-zone"(inst, d) { inst.ui.locZone = d.id; inst.ui.locPin = null; inst.render(); },
    "loc-pin"(inst, d, el, ev) {
      const svg = el.closest("svg") || el; const vb = svg.viewBox.baseVal; const rc = svg.getBoundingClientRect(); if (!rc.width) return;
      const sc = Math.max(rc.width / vb.width, rc.height / vb.height); const ox = (rc.width - vb.width * sc) / 2, oy = (rc.height - vb.height * sc) / 2;
      inst.ui.locPin = { x: Math.round(vb.x + (ev.clientX - rc.left - ox) / sc), y: Math.round(vb.y + (ev.clientY - rc.top - oy) / sc) }; inst.render();
    },
    "loc-save"(inst) {
      const z = inst.ui.locZone; if (!z) return; const pin = inst.ui.locPin;
      const r = inst.act("cust.addAddress", { customerId: inst.actorId(), zoneId: z, label: inst.ui.locLabel || "البيت", landmark: (inst.ui.locLandmark || "").trim(), street: (inst.ui.locStreet || "").trim(), x: pin && pin.x, y: pin && pin.y });
      if (r.ok !== false) { inst.ui.sheet = null; inst.ui.locNew = false; inst.ui.locZone = null; inst.ui.locLandmark = ""; inst.ui.locStreet = ""; inst.ui.locPin = null; inst.toast(`هنوصلك في ${find(TW.S.zones, z).ar}`, "ok"); }
    },
    "addr-set"(inst, d) { const r = inst.act("cust.setAddress", { customerId: inst.actorId(), addressId: d.id }); if (r.ok !== false) { inst.ui.sheet = null; const a = find(TW.S.customers, inst.actorId()).addresses.find((y) => y.id === d.id); inst.toast(`التوصيل لـ ${a.label} · ${find(TW.S.zones, a.zoneId).ar}`, "ok"); } },
    waitlist(inst, d) { const r = inst.act("cust.waitlist", { customerId: inst.actorId(), zoneId: d.zone }); if (r.ok !== false) inst.toast(`سجّلناك — هنبلغك أول ما نوصل ${find(TW.S.zones, d.zone).ar}`, "ok"); },
    add(inst, d) { inst.act("cart.add", { customerId: inst.actorId(), skuId: d.sku, sourceType: d.type, sourceId: d.src, qty: 1 }); },
    qty(inst, d) { inst.act("cart.qty", { customerId: inst.actorId(), key: d.key, qty: Number(d.q) }); },
    pq(inst, d) { inst.ui.pq = { id: d.sku, n: Math.max(1, Number(d.q)) }; inst.render(); },
    "pdp-src"(inst, d) { inst.ui.pdpSrc = { ...(inst.ui.pdpSrc || {}), [d.sku]: d.src }; inst.render(); },
    "pdp-add"(inst, d) { const n = inst.ui.pq && inst.ui.pq.id === d.sku ? inst.ui.pq.n : 1; const r = inst.act("cart.add", { customerId: inst.actorId(), skuId: d.sku, sourceType: d.type, sourceId: d.src, qty: n }); if (r.ok !== false) { inst.ui.pq = null; inst.toast("اتضاف للسلة", "ok"); } },
    fav(inst, d) { const on = find(TW.S.customers, inst.actorId()).favs.includes(d.sku); const r = inst.act("cust.fav", { customerId: inst.actorId(), skuId: d.sku }); if (r.ok !== false) inst.toast(on ? "اتشال من المفضلة" : "اتضاف للمفضلة", "ok"); },
    notify(inst, d) { const r = inst.act("cust.notifyMe", { customerId: inst.actorId(), skuId: d.sku }); if (r.ok !== false) inst.toast("هنبلغك أول ما يتوفر", "ok"); },
    "menu-open"(inst, d) {
      const it = (TW.S.menus[d.mid] || []).find((i) => i.id === d.item); if (!it) return;
      if (!it.mods.length) { const r = inst.act("cart.addMenu", { customerId: inst.actorId(), merchantId: d.mid, menuItemId: d.item, mods: [], qty: 1 }); if (r.ok !== false) inst.toast(`${it.name} اتضاف للسلة`, "ok"); return; }
      inst.ui.mod = { mid: d.mid, itemId: d.item, sel: {}, qty: 1 }; it.mods.forEach((g, gi) => { if (g.req && g.opts[0]) inst.ui.mod.sel[gi] = [g.opts[0].n]; });
      inst.ui.sheet = "menu"; inst.render();
    },
    "mod-pick"(inst, d) {
      const st = inst.ui.mod; if (!st) return; const it = TW.S.menus[st.mid].find((i) => i.id === st.itemId); const g = it.mods[Number(d.g)]; const cur = st.sel[d.g] || [];
      if (g.max > 1) st.sel[d.g] = cur.includes(d.o) ? cur.filter((n) => n !== d.o) : cur.length >= g.max ? cur : [...cur, d.o];
      else st.sel[d.g] = cur.includes(d.o) && !g.req ? [] : [d.o];
      inst.render();
    },
    "mod-qty"(inst, d) { if (inst.ui.mod) { inst.ui.mod.qty = Math.max(1, Number(d.q)); inst.render(); } },
    "menu-add"(inst) {
      const st = inst.ui.mod; if (!st) return; const it = TW.S.menus[st.mid].find((i) => i.id === st.itemId);
      const mods = it.mods.flatMap((g, gi) => (st.sel[gi] || []).map((n) => g.opts.find((o) => o.n === n)).filter(Boolean));
      const r = inst.act("cart.addMenu", { customerId: inst.actorId(), merchantId: st.mid, menuItemId: st.itemId, mods, qty: st.qty || 1 });
      if (r.ok !== false) { inst.ui.sheet = null; inst.ui.mod = null; inst.toast(`${it.name} اتضاف للسلة`, "ok"); }
    },
    "tab-search"(inst) { inst.go("/customer/search"); setTimeout(() => { const i = inst.el.querySelector(".cu-sinput"); if (i) i.focus(); }, 60); },
    "search-term"(inst, d) { inst.ui.q = d.q; remember(inst, d.q); inst.render(); },
    "search-clear"(inst) { inst.ui.q = ""; inst.render(); const i = inst.el.querySelector(".cu-sinput"); if (i) { i.value = ""; i.focus(); } },
    "search-go"(inst) {
      const q = (inst.ui.q || "").trim(); if (!q) return; remember(inst, q);
      const zid = TW.zoneOfCustomer(inst.actorId()).id, r = TW.search(q, zid), n = r.skus.length + r.merchants.length + r.menu.length;
      inst._logged = inst._logged || new Set(); const key = TW.norm(q);
      if (!n && !inst._logged.has(key)) { inst._logged.add(key); clearTimeout(inst._slt); TW.act("search.log", { q, results: 0, zoneId: zid }, TW.actor.customer(inst.actorId())); }
      else inst.render();
    },
    "search-notify"(inst) {
      const q = (inst.ui.q || "").trim(); if (!q) return; const zid = TW.zoneOfCustomer(inst.actorId()).id; const key = TW.norm(q);
      inst._logged = inst._logged || new Set(); if (!inst._logged.has(key)) { inst._logged.add(key); clearTimeout(inst._slt); TW.act("search.log", { q, results: 0, zoneId: zid }, TW.actor.customer(inst.actorId())); }
      inst.ui.notified = [...(inst.ui.notified || []), key]; inst.toast(`هنبلغك أول ما «${q}» يتوفر حواليك`, "ok");
    },
    "promo-use"(inst, d) { inst.ui.promo = d.code; inst.toast(`الكود ${d.code} جاهز — هيتطبق في السلة`, "ok"); },
    "promo-pick"(inst, d) { inst.ui.promo = d.code; TW.apps.customer.on["promo-apply"](inst); },
    "promo-apply"(inst) { const code = (inst.ui.promo || "").trim().toUpperCase(); if (!code) return inst.toast("اكتب الكود الأول", "bad"); const r = inst.act("cart.promo", { customerId: inst.actorId(), code }); if (r.ok !== false) { inst.ui.promo = ""; inst.toast(`الكود اتطبق — وفّرت ${m$(r.discount || 0)}`, "ok"); } },
    "promo-clear"(inst) { inst.act("cart.promo", { customerId: inst.actorId(), code: null }); },
    subpref(inst, d) { const r = inst.act("cust.subPref", { customerId: inst.actorId(), pref: d.v }); if (r.ok !== false) inst.toast("اتحفظ اختيارك", "ok"); },
    "cart-clear"(inst) { inst.act("cart.clear", { customerId: inst.actorId() }); },
    "basket-open"(inst) { inst.ui.sheet = "basket"; inst.render(); },
    "basket-save"(inst) {
      const ct = TW.S.carts[inst.actorId()]; if (!ct || !ct.lines.length) return; const name = (inst.ui.bname || "طلبات الأسبوع").trim();
      const lines = ct.lines.map((l) => (l.menuItemId ? { menuItemId: l.menuItemId, merchantId: l.merchantId, qty: l.qty, mods: l.mods } : { skuId: l.skuId, sourceType: l.sourceType, sourceId: l.sourceId, qty: l.qty }));
      const r = inst.act("cust.saveBasket", { customerId: inst.actorId(), name, lines }); if (r.ok !== false) { inst.ui.sheet = null; inst.toast(`اتحفظت «${name}»`, "ok"); }
    },
    "basket-add"(inst, d) {
      const c = find(TW.S.customers, inst.actorId()); let lines;
      if (d.weekly) { M = null; const x = { cid: c.id, c, z: TW.zoneOfCustomer(c.id) }; const na = needAgain(x).slice(0, 8).map((e) => e.s); lines = (na.length ? na : boughtBefore(x).slice(0, 6)).map((s) => ({ skuId: s.id, qty: 1 })); }
      else { const b = c.baskets.find((y) => y.id === d.id); lines = b ? b.lines : []; }
      const r = inst.act("cust.basketToCart", { customerId: c.id, lines }); if (r.ok !== false) { inst.toast(`اتضاف ${r.added} صنف${r.skipped ? ` · ${r.skipped} مش متاح دلوقتي` : ""}`, "ok"); }
    },
    reorder(inst, d) { const r = inst.act("cart.reorder", { customerId: inst.actorId(), orderId: d.id }); if (r.ok !== false) { inst.go("/customer/cart"); inst.toast(r.skipped ? `ضفنا اللي متاح — ${r.skipped} صنف مش متاح دلوقتي` : "ضفنا الطلب للسلة", r.skipped ? "" : "ok"); } },
    "go-checkout"(inst) { inst.ui.idem = TW.uid("idem"); inst.ui.placed = null; inst.go("/customer/checkout"); },
    "apply-changes"(inst) { const r = inst.act("cart.applyChanges", { customerId: inst.actorId() }); if (r.ok !== false) inst.toast("اتحدثت السلة — راجع الإجمالي", "ok"); },
    place(inst) {
      const cid = inst.actorId(), z = TW.zoneOfCustomer(cid), sched = z.route === "scheduled";
      inst.ui.idem = inst.ui.idem || TW.uid("idem");
      const pay = inst.ui.pay || "cod", when = sched ? "scheduled" : inst.ui.when || "now";
      const wins = sched ? z.windows : slotsToday();
      const window = when === "scheduled" ? (inst.ui.win && wins.includes(inst.ui.win) ? inst.ui.win : sched ? (nextWindow(z) || {}).w : null) : null;
      if (when === "scheduled" && !window) return inst.toast("اختار ميعاد التوصيل", "bad");
      const r = inst.act("order.place", { customerId: cid, pay, when, window, idem: inst.ui.idem, changeFor: pay === "cod" && Number(inst.ui.change) ? Number(inst.ui.change) : null });
      if (r.ok === false) return;
      inst.ui.placed = { idem: inst.ui.idem, orderId: r.order.id, n: ((inst.ui.placed && inst.ui.placed.orderId === r.order.id && inst.ui.placed.n) || 0) + 1 };
      if (r.duplicate) { inst.toast(`طلبك ${r.order.id} اتسجل مرة واحدة بس — مش هنكرره`, "ok"); if (inst.route[0] !== "order") inst.go(`/customer/order/${r.order.id}`); return; }
      inst.ui.change = null; inst.ui.win = null; inst.ui.when = null;
      inst.go(`/customer/order/${r.order.id}`);
    },
    sub(inst, d) { const r = inst.act("order.subDecision", { orderId: d.order, key: d.key, choice: d.v }); if (r.ok !== false) inst.toast(d.v === "accept" ? "تمام — هنبعتلك البديل" : "شيلنا الصنف ومش هتدفع تمنه", "ok"); },
    sheet(inst, d) { inst.ui.sheet = d.v; if (d.v === "rate") inst.ui.rate = {}; if (d.v === "report") { inst.ui.rep = {}; inst.ui.repNote = ""; } if (d.v === "cancel") inst.ui.cReason = null; inst.render(); },
    "call-now"(inst) { const r = inst.act("cust.msg", { orderId: inst.route[1], kind: "call" }); if (r.ok !== false) { inst.ui.sheet = null; inst.toast("بنوصلك بالمندوب على الرقم الوسيط…", "ok"); } },
    "chat-send"(inst, d) { const r = inst.act("cust.msg", { orderId: inst.route[1], kind: "msg", text: d.msg }); if (r.ok !== false) { inst.ui.sheet = null; inst.toast("الرسالة وصلت للمندوب", "ok"); } },
    "cancel-confirm"(inst) {
      const o = find(TW.S.orders, inst.route[1]); if (!o) return; const why = inst.ui.cReason || "غيّرت رأيي";
      const r = TW.act("order.cancel", { orderId: o.id, reason: `العميل طلب الإلغاء — ${why}` }, TW.actor.customer(inst.actorId()));
      if (r.ok !== false) { inst.ui.sheet = null; inst.toast("الطلب اتلغى", "ok"); return; }
      if (r.needSupport) { const r2 = inst.act("support.report", { orderId: o.id, type: "إلغاء", keys: [], note: `طلب إلغاء بعد بدء التجهيز — ${why}` }); if (r2.ok !== false) { inst.ui.sheet = null; inst.toast(`الطلب بدأ يتجهز، فبعتنا طلب الإلغاء لخدمة العملاء (${r2.caseId})`, ""); } return; }
      inst.toast(r.error, "bad");
    },
    "rate-star"(inst, d) { inst.ui.rate = { ...(inst.ui.rate || {}), [d.k2]: Number(d.v) }; if (d.k2 === "order") inst.ui.rate.tags = []; inst.render(); },
    "rate-tag"(inst, d) { const rt = inst.ui.rate || {}; const tg = rt.tags || []; rt.tags = tg.includes(d.v) ? tg.filter((x) => x !== d.v) : [...tg, d.v]; inst.ui.rate = rt; inst.render(); },
    "rate-send"(inst) { const rt = inst.ui.rate || {}; if (!rt.order) return; const r = inst.act("order.rate", { orderId: inst.route[1], order: rt.order, merchant: rt.merchant || rt.order, rider: rt.rider || rt.order, tags: rt.tags || [] }); if (r.ok !== false) { inst.ui.sheet = null; inst.toast(r.caseId ? `آسفين — فتحنالك حالة دعم ${r.caseId} وهنكلمك` : "شكراً على تقييمك!", "ok"); } },
    "rep-type"(inst, d) { inst.ui.rep = { ...(inst.ui.rep || {}), type: d.v }; inst.render(); },
    "rep-key"(inst, d) { const rp = inst.ui.rep || {}; const k = rp.keys || []; rp.keys = k.includes(d.key) ? k.filter((x) => x !== d.key) : [...k, d.key]; inst.ui.rep = rp; inst.render(); },
    "rep-photo"(inst) { const rp = inst.ui.rep || {}; rp.photo = !rp.photo; inst.ui.rep = rp; inst.render(); },
    "rep-send"(inst) {
      const o = find(TW.S.orders, inst.route[1]); if (!o) return; const rp = inst.ui.rep || {}; const type = rp.type || (o.status === "DELIVERED" ? "صنف ناقص" : "التوصيل اتأخر");
      const r = inst.act("support.report", { orderId: o.id, type, keys: ["صنف ناقص", "صنف غلط", "صنف تالف"].includes(type) ? rp.keys || [] : [], note: (inst.ui.repNote || "").trim(), photo: !!rp.photo });
      if (r.ok !== false) { inst.ui.sheet = null; inst.ui.rep = null; inst.toast(`استلمنا مشكلتك — حالة ${r.caseId}`, "ok"); }
    },
  },
};
function remember(inst, q) { const r = (inst.ui.recent || []).filter((x) => TW.norm(x) !== TW.norm(q)); r.unshift(q); inst.ui.recent = r.slice(0, 6); }
})();
