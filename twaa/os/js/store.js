/* Twaa Business OS — central state, actions, simulation engine and selectors.
   ONE store feeds all four products (customer, merchant, rider, control center). Apps never mutate state directly:
   they call TW.act(name, payload, actor) and re-render on TW.on(change).

   Core rule from the operating blueprint: Customer Order ≠ Fulfillment Order.
     CustomerOrder (TW-xxxx) → FulfillmentOrders (FO-xxxx-n, one per hub/merchant) → DeliveryTask(s) (DT-xxxx[-n]) → COD / Payment → Settlement.
   Operational status and financial status are tracked separately on every order.
   Every material action writes an audit event; approvals gate money and integrity decisions. */
(function () {
const TW = window.TW, D = TW.D;
const { uid, clamp, sum, money, num } = TW;
const KEY = "twaa-os-state-v3";

/* ===================================================================== status vocabulary ===================== */
TW.ST = {
  order: {
    PAYMENT_PENDING: ["بانتظار تأكيد الدفع", "warn"], CONFIRMED: ["مؤكد", "info"], PREPARING: ["قيد التجهيز", "info"], AWAITING_CUSTOMER_DECISION: ["بانتظار قرار العميل (بديل)", "warn"],
    MERCHANT_ISSUE: ["مشكلة مع التاجر", "bad"], READY: ["جاهز للاستلام", "info"], RIDER_ASSIGNED: ["مندوب في الطريق للاستلام", "info"], IN_TRANSIT: ["في الطريق للعميل", "brand"],
    ARRIVED: ["المندوب وصل", "brand"], PARTIALLY_DELIVERED: ["تسليم جزئي", "warn"], DELIVERED: ["تم التسليم", "ok"], DELIVERY_FAILED: ["فشل التسليم", "bad"],
    RETURN_TO_ORIGIN: ["مرتجع للمصدر", "bad"], RETURNED: ["رجع للمصدر", "neutral"], CANCELLED: ["ملغي", "neutral"], SCHEDULED: ["مجدول على رحلة القرية", "info"],
  },
  fin: {
    UNPAID: ["غير مدفوع", "neutral"], PAYMENT_PENDING: ["دفع معلّق", "warn"], PAID: ["مدفوع أونلاين", "ok"], COD_PENDING: ["كاش عند الاستلام", "info"], COD_COLLECTED: ["كاش مع المندوب", "warn"],
    SETTLEMENT_PENDING: ["بانتظار التسوية", "info"], RECONCILED: ["تمت المطابقة", "ok"], FINANCIALLY_CLOSED: ["مقفل مالياً", "ok"], REFUNDED: ["مسترد", "neutral"], PARTIALLY_REFUNDED: ["مسترد جزئياً", "warn"], VOID: ["لا توجد قيمة مستحقة", "neutral"], RECON_REQUIRED: ["مطلوب مطابقة", "bad"],
  },
  fo: {
    QUEUED: ["في الطابور", "neutral"], PICKING: ["بيتجمع", "info"], PACKED: ["متغلف وجاهز", "ok"], AWAITING_ACCEPT: ["بانتظار قبول التاجر", "warn"], PREPARING: ["بيتجهز", "info"], READY: ["جاهز", "ok"],
    HANDED_OVER: ["اتسلّم للمندوب", "brand"], DELIVERED: ["اتسلّم للعميل", "ok"], REJECTED: ["رفضه التاجر", "bad"], TIMEOUT: ["التاجر لم يرد", "bad"], CANCELLED: ["ملغي", "neutral"], REROUTED: ["اتحوّل لمصدر آخر", "neutral"], RETURNED: ["رجع", "neutral"],
  },
  task: {
    WAITING: ["بانتظار الجاهزية", "neutral"], SCHEDULED: ["على رحلة مجدولة", "info"], OFFERED: ["معروض على مندوب", "warn"], NO_RIDER: ["لا يوجد مندوب", "bad"], ASSIGNED: ["في الطريق للاستلام", "info"], AT_PICKUP: ["عند نقطة الاستلام", "info"],
    PICKED_UP: ["في الطريق للعميل", "brand"], ARRIVED: ["عند العميل", "brand"], DELIVERED: ["تم التسليم", "ok"], FAILED: ["فشل التسليم", "bad"], RTO: ["راجع للمصدر", "bad"], RETURNED: ["رجع للمصدر", "neutral"], CANCELLED: ["ملغي", "neutral"],
  },
};
TW.stLabel = (kind, s) => (TW.ST[kind][s] || [s, "neutral"])[0];
TW.stChip = (kind, s) => { const [t, tone] = TW.ST[kind][s] || [s, "neutral"]; return TW.chip(t, tone); };
/* customer-facing journey — 6 simple steps */
TW.JOURNEY = ["اتأكدنا من طلبك", "بيتجهز", "المندوب في الطريق للاستلام", "طلبك خرج", "قربنا منك", "وصلنا"];
TW.REASONS = {
  merchantReject: ["الصنف مش موجود", "المحل زحمة", "قربنا نقفل", "المخزون مش مظبوط", "مشكلة تشغيلية", "سبب آخر"],
  riderReject: ["بعيد عن مكاني", "المركبة مش مناسبة", "خلصت الوردية", "مشكلة في المركبة", "سبب آخر"],
  deliveryFail: ["العميل مش بيرد", "العنوان غلط", "العميل رفض الطلب", "مش قادر أوصل للمكان", "المكان مش آمن", "مشكلة في الكاش", "سبب آخر"],
  cancel: ["العميل طلب الإلغاء", "تأخر شديد", "المنتج غير متاح", "اشتباه احتيال", "طلب مكرر", "قرار تشغيلي"],
  refund: ["صنف ناقص", "صنف غلط", "صنف تالف", "منتهي الصلاحية", "تأخير التوصيل", "تحصيل زيادة", "سبب آخر"],
  stockAdjust: ["جرد دوري", "تالف", "منتهي الصلاحية", "مفقود", "خطأ استلام", "مرتجع غير صالح", "تصحيح النظام"],
  pickupIssue: ["طرد ناقص", "طرد تالف", "الكود مش مطابق", "التاجر مش جاهز"],
  support: ["صنف ناقص", "صنف غلط", "صنف تالف", "التوصيل اتأخر", "شكوى من المندوب", "شكوى من التاجر", "فرق في الكاش", "استرداد", "إلغاء", "مش قادر أكلم المندوب", "سبب آخر"],
};
TW.PARTY = { hub: "الهب (التجميع/التغليف)", merchant: "التاجر", rider: "المندوب", twaa: "توّا", customer: "العميل", gateway: "بوابة الدفع" };

/* ===================================================================== helpers ===================== */
const now = () => Date.now();
const MIN = 60000;
const distKm = (a, b) => { const dx = (a.x - b.x) * 0.0245, dy = (a.y - b.y) * 0.0245; return Math.sqrt(dx * dx + dy * dy); };
TW.distKm = distKm;
const R = () => TW.S.rules;
const find = (arr, id) => arr.find((x) => x.id === id);
const COST_MARGIN = { grocery: 0.13, produce: 0.22, dairy: 0.12, meat: 0.12, bakery: 0.18, water: 0.16, snacks: 0.2, frozen: 0.18, cleaning: 0.18, care: 0.22, beauty: 0.28, pharmacy: 0.18, baby: 0.12, home: 0.25, electronics: 0.3, stationery: 0.3, pets: 0.2, gifts: 0.3, auto: 0.28, local: 0.15, deals: 0.11 };

/* ===================================================================== seed ===================== */
function seed() {
  const t0 = now();
  const rnd = TW.prng(20270926);
  const S = {
    v: 3, seededAt: t0, businessDate: new Date(t0).toDateString(),
    session: { admin: "u1", customer: "c1", merchant: "m1", rider: "r1" },
    sim: { auto: true, preferDemo: true, speed: 1 },
    seq: { order: 1043, case: 2201, refund: 501, approval: 801, po: 71, req: 41, promo: 21, camp: 11, dep: 301, mv: 9001, lead: 311, notif: 1 },
    rules: Object.fromEntries(D.rules.map((r) => [r.key, r.value])),
    zones: D.zones.map((z) => ({ ...z })), hubs: D.hubs.map((h) => ({ ...h })),
    skus: D.skus.map((s) => ({ ...s })),
    merchants: D.merchants.map((m) => ({ ...m, mode: m.status === "active" ? "open" : "closed", autopilot: !m.demo && m.id !== "m3", acceptRate: 0.9 + rnd() * 0.09, prepOnTime: 0.78 + rnd() * 0.2, cancelAfterAccept: rnd() * 0.04, availAcc: 0.88 + rnd() * 0.11, subRate: rnd() * 0.08, complaintRate: rnd() * 0.03, gmv30: Math.round(40000 + rnd() * 260000), orders30: Math.round(150 + rnd() * 900), acceptSec: Math.round(30 + rnd() * 90) })),
    msku: {}, menus: {},
    riders: D.riders.map((r) => ({ ...r, autopilot: !r.demo, task: null, earnToday: Math.round(80 + rnd() * 240), jobsToday: Math.round(3 + rnd() * 9), onTime: 0.85 + rnd() * 0.13, accept: 0.8 + rnd() * 0.18, fails: Math.round(rnd() * 2), codAcc: 0.97 + rnd() * 0.03, depositOnTime: 0.85 + rnd() * 0.15, km: Math.round(30 + rnd() * 50), incidents: rnd() < 0.15 ? 1 : 0, rescues: rnd() < 0.1 ? 1 : 0, hours: 5 + Math.round(rnd() * 4), suspended: false })),
    customers: D.customers.map((c) => ({ ...c, addresses: [{ id: `${c.id}-a1`, label: "البيت", zoneId: c.zoneId, landmark: c.landmark, street: c.street, ...jitter(D.zones.find((z) => z.id === c.zoneId), rnd) }], addr: `${c.id}-a1`, subPref: "call", favs: [], baskets: [], waitlist: [], codFails: c.codFails || 0, notifyMe: [] })),
    inv: { h1: {} }, carts: {},
    orders: [], fos: [], tasks: [], payments: [], cod: [], deposits: [], refunds: [], cases: [], returns: [],
    promos: [], campaigns: [], segments: D.segments.map((s) => ({ ...s })), approvals: [], audit: [], notes: [], pos: [], moves: [], catReqs: [],
    leads: D.leads.map((l) => ({ ...l, history: [] })), waitlist: JSON.parse(JSON.stringify(D.waitlist)), demand: { noResult: D.noResult.map(([q, n, dept]) => ({ q, n, dept })), notify: [], searches: 1840 },
    msettle: [], rsettle: [], recon: { online: false, cod: false, merchant: false, rider: false, exceptions: false, closedAt: null, closedBy: null },
    users: D.users.map((u) => ({ ...u, active: true })), rolePerms: JSON.parse(JSON.stringify(D.rolePerms)),
    expansion: Object.fromEntries(D.zones.map((z) => [z.id, z.active ? "live" : z.id === "wafaeya" ? "merchants_needed" : "not_ready"])),
    hist: {},
  };
  TW.S = S;
  /* hub inventory */
  S.skus.filter((s) => s.hub).forEach((s, i) => {
    const onHand = s.weightVar ? Math.round(20 + rnd() * 60) : Math.round(6 + rnd() * 70);
    S.inv.h1[s.id] = { onHand, reserved: 0, incoming: rnd() < 0.18 ? Math.round(12 + rnd() * 40) : 0, damaged: rnd() < 0.08 ? 1 + Math.round(rnd() * 2) : 0, expired: rnd() < 0.05 ? 1 : 0, quarantine: 0, bin: `${"ABCDEF"[i % 6]}-${String(1 + (i % 12)).padStart(2, "0")}-${1 + (i % 4)}`, reorderPt: Math.round(8 + rnd() * 12), cost: +(s.price * (1 - (COST_MARGIN[s.dept] || 0.15))).toFixed(2), velocity: +(0.5 + rnd() * 9).toFixed(1), expiryDays: Math.round(Math.min(s.shelfLife, 3 + rnd() * s.shelfLife)), shelfEmpty: false };
  });
  /* a few deliberately low / slow lines for procurement demo */
  ["SKU-10050", "SKU-10087", "SKU-10144", "SKU-10013"].forEach((id, k) => { if (S.inv.h1[id]) { S.inv.h1[id].onHand = [3, 4, 2, 5][k]; S.inv.h1[id].velocity = [11.5, 8.4, 3.1, 6.2][k]; } });
  ["SKU-10097", "SKU-10148"].forEach((id) => { if (S.inv.h1[id]) { S.inv.h1[id].onHand = 46; S.inv.h1[id].velocity = 0.3; } });
  /* merchant assortments from the master catalogue (merchant never creates SKUs) */
  S.merchants.forEach((m) => {
    if (D.menus[m.id]) {
      S.menus[m.id] = D.menus[m.id].flatMap(([cat, items], ci) => items.map(([name, price, desc, mods], ii) => ({ id: `${m.id}-i${ci}${ii}`, cat, name, price, desc, mods, available: true, prep: m.prep })));
      return;
    }
    const depts = D.typeDepts[m.type] || [];
    const pool = S.skus.filter((s) => depts.includes(s.dept) && (m.type !== "dairy" || s.dept === "local" || s.dept === "dairy") && (m.type !== "bakery" || s.dept === "bakery" || s.cat === "lbakery") && (m.type !== "seafood" || s.cat === "seafood") && (m.type !== "butcher" || s.cat !== "seafood"));
    const take = m.id === "m1" ? pool.filter((_, i) => i % 3 !== 0) : m.status === "pending" ? [] : pool.filter(() => rnd() < 0.85);
    S.msku[m.id] = {};
    take.forEach((s) => { const p = Math.round(s.refPrice * (0.95 + rnd() * 0.12)); S.msku[m.id][s.id] = { price: p, available: rnd() > 0.06, stock: rnd() < 0.5 ? Math.round(3 + rnd() * 40) : null, prep: m.prep, updatedAt: t0 - Math.round(rnd() * 72) * 3600000 }; });
  });
  const force = { m1: ["SKU-10107", "SKU-10117", "SKU-10025", "SKU-10050", "SKU-10056", "SKU-10063", "SKU-10013", "SKU-10001"], m3: ["SKU-10134", "SKU-10135", "SKU-10137", "SKU-10139"], m13: ["SKU-10134", "SKU-10135", "SKU-10137", "SKU-10139"], m26: ["SKU-10134", "SKU-10135", "SKU-10136", "SKU-10137", "SKU-10139", "SKU-10140"], m19: ["SKU-10175", "SKU-10176", "SKU-10177"], m4: ["SKU-10074", "SKU-10075", "SKU-10080", "SKU-10179"] };
  Object.entries(force).forEach(([mid, ids]) => ids.forEach((id) => { const s = find(S.skus, id); S.msku[mid][id] = S.msku[mid][id] || { price: s.refPrice, available: true, stock: null, prep: find(S.merchants, mid).prep, updatedAt: t0 - 7200000 }; S.msku[mid][id].available = true; }));
  /* m1 deliberately lacks some sellers' favourites → "products shops like yours sell" */
  ["SKU-10059", "SKU-10087", "SKU-10094", "SKU-10098", "SKU-10104", "SKU-10114", "SKU-10119", "SKU-10125", "SKU-10148"].forEach((id) => { delete S.msku.m1[id]; });
  if (S.msku.m6) S.msku.m6["SKU-10032"] = { price: 26, available: true, stock: 40, prep: 10, updatedAt: t0 - 3600000 }; /* outlier tomato price → anomaly */
  /* promotions */
  S.promos = [
    { id: "PR-11", name: "خصم 30% على أول طلب", code: "WELCOME30", type: "percent", value: 30, cap: 60, minBasket: 120, scope: "all", funding: "twaa", share: 1, budget: 60000, spent: 41250, redemptions: 1210, limitPerCustomer: 1, segment: "sg-new", zones: "all", start: t0 - 40 * 864e5, end: t0 + 50 * 864e5, status: "active", approval: null, incContribution: 6.2, goal: "first order" },
    { id: "PR-12", name: "20 ج.م خصم فوق 200", code: "TWAA20", type: "fixed", value: 20, minBasket: 200, scope: "all", funding: "twaa", share: 1, budget: 25000, spent: 9180, redemptions: 459, limitPerCustomer: 3, segment: "all", zones: "all", start: t0 - 10 * 864e5, end: t0 + 20 * 864e5, status: "active", incContribution: 9.8, goal: "basket increase" },
    { id: "PR-13", name: "10% على منتجات سوبر ماركت الحمد", code: "HAMD10", type: "percent", value: 10, cap: 40, minBasket: 100, scope: "merchant:m1", funding: "merchant", share: 0, budget: 15000, spent: 4220, redemptions: 312, limitPerCustomer: 5, segment: "all", zones: "center,gaish", start: t0 - 5 * 864e5, end: t0 + 9 * 864e5, status: "active", incContribution: 14.1, goal: "merchant launch" },
    { id: "PR-14", name: "توصيل مجاني فوق 150 للقرى", code: "FREEDEL", type: "freedelivery", value: 0, minBasket: 150, scope: "zones", funding: "shared", share: 0.5, budget: 18000, spent: 11640, redemptions: 776, limitPerCustomer: 4, segment: "sg-village", zones: "shokaf,zawya,tayreya,hadeen,boulin", start: t0 - 20 * 864e5, end: t0 + 10 * 864e5, status: "active", incContribution: 3.1, goal: "zone launch" },
    { id: "PR-15", name: "خصم 15% على المنظفات", code: "CLEAN15", type: "percent", value: 15, cap: 50, minBasket: 150, scope: "dept:cleaning", funding: "shared", share: 0.5, budget: 12000, spent: 12000, redemptions: 380, limitPerCustomer: 2, segment: "all", zones: "all", start: t0 - 30 * 864e5, end: t0 - 2 * 864e5, status: "ended", incContribution: 4.4, goal: "category adoption" },
  ];
  S.campaigns = [
    { id: "CP-8", name: "إعادة تفعيل المتوقفين", audience: "sg-lapsed", offer: "PR-12", channel: "push+whatsapp", schedule: "الخميس 6 م", budget: 8000, guard: true, goal: "winback", status: "running", sent: 930, opened: 402, ordered: 88, incContribution: 1730 },
    { id: "CP-9", name: "الطلب التاني خلال 7 أيام", audience: "sg-act", offer: "PR-12", channel: "push", schedule: "تلقائي بعد أول طلب بـ 3 أيام", budget: 6000, guard: true, goal: "second order", status: "running", sent: 286, opened: 190, ordered: 71, incContribution: 2410 },
    { id: "CP-10", name: "صيدلية توّا — أول طلب", audience: "sg-groc", offer: null, channel: "in-app", schedule: "من 1 إلى 15", budget: 3000, guard: true, goal: "category adoption", status: "draft", sent: 0, opened: 0, ordered: 0, incContribution: 0 },
  ];
  /* history for analytics */
  S.hist = buildHistory(rnd, t0);
  /* settlements */
  seedSettlements(S, rnd, t0);
  /* live operations: believable mid-day state with real exceptions */
  seedLive(S, rnd, t0);
  seedAdmin(S, rnd, t0);
  S.orders.forEach((o) => o.events.sort((a, b) => a.at - b.at));
  /* riders: "busy" only when they actually hold a task */
  S.riders.forEach((r) => { const t = S.tasks.find((x) => x.riderId === r.id && ["ASSIGNED", "AT_PICKUP", "PICKED_UP", "ARRIVED"].includes(x.status)); r.task = t ? t.id : null; if (r.status !== "offline") r.status = t ? "busy" : "online"; });
  recomputeAll();
  return S;
}
function jitter(z, rnd) { return { x: z.x + Math.round((rnd() - 0.5) * z.pr * 0.9), y: z.y + Math.round((rnd() - 0.5) * z.pr * 0.9) }; }

function buildHistory(rnd, t0) {
  const h = {};
  const curH = Math.min(22, Math.max(8, new Date(t0).getHours()));
  const shape = [0, 0, 0, 0, 0, 0, 0, 0.2, 0.6, 0.9, 1.1, 1.2, 1.4, 1.5, 1.3, 1.1, 1.0, 1.1, 1.4, 1.7, 1.8, 1.5, 1.0, 0.5];
  h.hourly = shape.map((s, hr) => (hr <= curH ? Math.round(s * (14 + rnd() * 4)) : null));
  h.hourlyY = shape.map((s) => Math.round(s * (13 + rnd() * 3)));
  h.daily = Array.from({ length: 30 }, (_, i) => { const d = 150 + i * 3.1 + (rnd() - 0.5) * 30 + ((i % 7) === 4 ? 35 : 0); const aov = 248 + rnd() * 30; const orders = Math.round(d); const gmv = Math.round(orders * aov); return { d: new Date(t0 - (29 - i) * 864e5).getDate(), orders, gmv, net: Math.round(gmv * 0.235), cm: Math.round(orders * (6 + i * 0.25 + (rnd() - 0.5) * 4)), onTime: 0.86 + rnd() * 0.08, cancel: 0.02 + rnd() * 0.025, newCust: Math.round(15 + rnd() * 25) }; });
  h.funnel = [["زيارات", 4820], ["أضاف للسلة", 1910], ["بدأ الدفع", 812], ["مؤكد/مدفوع", 241], ["اتسلّم", 229], ["طلب تاني (30 يوم)", 141]];
  h.cohorts = [["مايو", 1, 0.46, 0.38, 0.33], ["يونيو", 1, 0.49, 0.4, 0.35], ["يوليو", 1, 0.51, 0.42, null], ["أغسطس", 1, 0.53, null, null], ["سبتمبر", 1, null, null, null]].map(([m, ...v]) => ({ m, v, size: Math.round(260 + rnd() * 180) }));
  h.retention = { d7: 0.41, d30: 0.33, m2: 0.29, m3: 0.26 };
  h.activation = [["سجّل", 640], ["منطقته متاحة", 588], ["أول سلة", 402], ["بدأ الدفع", 318], ["أول طلب", 286], ["أول طلب اتسلّم", 279], ["طلب تاني", 151]];
  h.cac = [["إحالة صديق", 38, 112], ["واتساب وجروبات", 52, 140], ["فيسبوك محلي", 96, 88], ["فلاير في الشنطة", 21, 96], ["أكشاك السوق", 74, 41], ["مؤثرين", 140, 32]];
  h.catGmv = D.depts.filter((d) => !["deals"].includes(d.id)).map((d) => ({ dept: d.id, ar: d.ar, gmv: Math.round((d.id === "grocery" ? 220 : d.id === "food" ? 180 : d.id === "dairy" ? 120 : d.id === "produce" ? 90 : 20 + rnd() * 60) * 1000 * (0.9 + rnd() * 0.2)), margin: d.id === "food" ? 0.17 : (COST_MARGIN[d.id] || 0.15) * (0.9 + rnd() * 0.2), fill: 0.9 + rnd() * 0.09, oos: Math.round(rnd() * 9), subRate: rnd() * 0.07, turns: +(1.5 + rnd() * 5).toFixed(1), waste: rnd() * 0.02, priceIdx: +(0.95 + rnd() * 0.1).toFixed(2), coverage: Math.round(1 + rnd() * 6), search: Math.round(80 + rnd() * 900) }));
  h.zoneStats = Object.fromEntries(D.zones.map((z) => [z.id, z.active ? { orders: Math.round((z.type === "core" ? 95 : z.type === "near" ? 28 : 14) * (0.8 + rnd() * 0.4)), cm: z.type === "core" ? 11.2 : z.type === "near" ? 4.6 : -2.4 + rnd() * 3, cpo: z.type === "core" ? 24 : z.type === "near" ? 31 : 38, onTime: z.type === "core" ? 0.92 : 0.84, km: z.type === "core" ? 1.6 : z.type === "near" ? 4.8 : 8.2, opt: z.type === "outer" ? 3.4 : z.type === "near" ? 1.6 : 1.2, wait: z.type === "core" ? 3.1 : 4.4, dead: z.type === "outer" ? 4.1 : 1.3 } : null]));
  h.heat = Array.from({ length: 7 }, (_, d) => shape.slice(8, 24).map((s) => Math.round(s * (10 + rnd() * 8) * (d === 4 || d === 5 ? 1.25 : 1))));
  return h;
}

function seedSettlements(S, rnd, t0) {
  S.merchants.filter((m) => m.status === "active").forEach((m) => {
    [2, 1].forEach((wk, k) => {
      const sales = Math.round(m.gmv30 / 4.2 * (0.9 + rnd() * 0.2));
      const commission = Math.round(sales * m.commission);
      const refunds = Math.round(sales * 0.006 * rnd());
      const promo = m.id === "m1" ? 1180 : Math.round(rnd() < 0.3 ? sales * 0.01 : 0);
      const lines = [];
      if (m.id === "m1" && k === 1) lines.push({ id: "DL-1", kind: "responsibility", amount: -62, order: "TW-0996", event: "عميل أبلغ عن صنف ناقص (جبنة دومتي 500 جم)", evidence: "قائمة التجهيز: التاجر علّم الصنف «موجود» · مسح التغليف عند الاستلام: 4 طرود من 5 بنود · صورة الطرد عند العميل", policy: "سياسة المسؤولية §25: الصنف الناقص بعد تأكيد التاجر يتحمله التاجر", status: "final" });
      if (m.id === "m1") lines.push({ id: "DL-2", kind: "promo", amount: -promo, order: "عرض HAMD10", event: "عرض ممول من التاجر: 10% على منتجات سوبر ماركت الحمد", evidence: `${312 - k * 100} استخدام في الأسبوع`, policy: "اتفاق العرض الموقّع بتاريخ 3 من الشهر", status: "final" });
      if (m.id === "m9" && k === 1) lines.push({ id: "DL-3", kind: "penalty", amount: -75, order: "TW-1017", event: "تأخر تجهيز 23 دقيقة عن SLA", evidence: "سجل الوقت: قبول 2:05 م، جاهز 2:58 م (SLA 30 د)", policy: "BR-MER-002 — غرامة تأخير بعد التحذير الثالث (⚠ قرار D-13)", status: "disputed" });
      const net = sales - commission - refunds + sum(lines, (l) => l.amount);
      S.msettle.push({ id: `MS-${m.id}-${wk}`, merchantId: m.id, period: wk === 2 ? "الأسبوع قبل الماضي" : "الأسبوع الماضي", from: t0 - (wk * 7 + 7) * 864e5, to: t0 - wk * 7 * 864e5, sales, commission, refunds, promo: m.id === "m1" ? promo : 0, lines, net, status: k === 0 ? "PAID" : "DUE", paidAt: k === 0 ? t0 - 6 * 864e5 : null, ref: k === 0 ? `INSTA-${Math.round(rnd() * 1e6)}` : null });
    });
  });
  S.riders.forEach((r) => {
    const missions = r.jobsToday, fee = 27, inc = r.jobsToday > 8 ? 40 : 0;
    S.rsettle.push({ id: `RS-${r.id}`, riderId: r.id, period: "اليوم", missions, fees: missions * fee, incentives: inc, waiting: r.id === "r1" ? 10 : 0, deductions: r.id === "r10" ? -25 : 0, codVariance: r.id === "r2" ? -25 : 0, status: "OPEN" });
  });
}

/* a compact way to create backdated live orders that go through the real order builder */
function seedLive(S, rnd, t0) {
  const L = (cid, lines, o = {}) => { const res = buildOrder(S, { customerId: cid, lines, pay: o.pay || "cod", when: o.when || "now", window: o.window, promo: o.promo, idem: `seed-${cid}-${o.ago}-${rnd()}`, noAuto: true }, t0 - (o.ago || 0) * MIN); return res.order; };
  const sku = (id, q = 1, src = "h1") => ({ skuId: id, qty: q, sourceType: src === "h1" ? "hub" : "merchant", sourceId: src });
  const menu = (mid, idx, q = 1) => { const it = S.menus[mid][idx]; return { menuItemId: it.id, merchantId: mid, qty: q, mods: [] }; };
  const prog = (o, st, ago, opt) => advanceSeed(S, o, st, t0, ago, rnd, opt);

  /* previous days (history for customers, buy again, receipts) */
  S.seq.order = 951;
  const histSet = [["c1", [sku("SKU-10050", 2), sku("SKU-10063"), sku("SKU-10075"), sku("SKU-10056")], 2], ["c1", [sku("SKU-10001"), sku("SKU-10010"), sku("SKU-10013"), sku("SKU-10026")], 5], ["c1", [menu("m10", 3)], 8], ["c1", [sku("SKU-10110"), sku("SKU-10113"), sku("SKU-10115")], 12], ["c6", [sku("SKU-10050", 3), sku("SKU-10085", 6)], 1], ["c2", [menu("m8", 0, 2)], 1], ["c8", [sku("SKU-10144"), sku("SKU-10146")], 3]];
  histSet.forEach(([cid, lines, days], i) => { const o = L(cid, lines, { ago: days * 1440 + 200 + i * 7 }); prog(o, "CLOSED", days * 1440); });
  /* today — completed (temporary ids, renamed below) */
  S.seq.order = 900;
  const done = [["c6", [sku("SKU-10051"), sku("SKU-10081"), sku("SKU-10091", 2)], 190], ["c2", [menu("m10", 0, 3), menu("m10", 1, 2)], 160], ["c1", [sku("SKU-10050"), sku("SKU-10056"), sku("SKU-10075"), sku("SKU-10063"), sku("SKU-10022")], 75]];
  const dOrders = done.map(([cid, lines, ago]) => { const o = L(cid, lines, { ago }); prog(o, "DELIVERED", ago - 35); return o; });
  const refundCase = dOrders[2]; renameOrder(S, refundCase, "TW-1036"); renameOrder(S, dOrders[0], "TW-1012"); renameOrder(S, dOrders[1], "TW-1013");
  /* plant evidence for the refund investigation: packer confirmed 4 of 5 items */
  const fo36 = S.fos.find((f) => f.orderId === "TW-1036"); fo36.packCheck = { expected: 5, scanned: 4, override: "وليد فتحي (مجمّع) — «الصنف كان في الشنطة»", at: refundCase.createdAt + 7 * MIN };

  const o15 = L("c8", [sku("SKU-10013"), sku("SKU-10050", 2), sku("SKU-10063")], { ago: 9 }); renameOrder(S, o15, "TW-1015"); prog(o15, "PICKING_MISMATCH", 6);
  const o17 = L("c10", [menu("m9", 0), menu("m9", 2)], { ago: 46, pay: "card" }); renameOrder(S, o17, "TW-1017"); prog(o17, "MERCHANT_LATE", 40);
  const o20 = L("c6", [sku("SKU-10110"), sku("SKU-10123"), sku("SKU-10115")], { ago: 95 }); renameOrder(S, o20, "TW-1020"); prog(o20, "DELIVERED", 52, { riderId: "r2", collected: -25 });
  const o24 = L("c2", [sku("SKU-10155"), sku("SKU-10156")], { ago: 34, pay: "card" }); renameOrder(S, o24, "TW-1024"); prog(o24, "PAYMENT_PENDING", 34);
  const o26 = L("c8", [sku("SKU-10055"), sku("SKU-10061", 2), sku("SKU-10025"), sku("SKU-10023")], { ago: 130 }); renameOrder(S, o26, "TW-1026"); prog(o26, "DELIVERED", 85, { riderId: "r3" });
  const o29 = L("c4", [sku("SKU-10050", 2), sku("SKU-10082", 6), sku("SKU-10146")], { ago: 52 }); renameOrder(S, o29, "TW-1029"); prog(o29, "ARRIVED_UNREACHABLE", 7, { riderId: "r8" });
  const o30 = L("c3", [sku("SKU-10003"), sku("SKU-10010"), sku("SKU-10012")], { ago: 31 }); renameOrder(S, o30, "TW-1030"); prog(o30, "IN_TRANSIT", 6, { riderId: "r5" });
  const o33 = L("c2", [menu("m21", 0), menu("m21", 1)], { ago: 38 }); renameOrder(S, o33, "TW-1033"); prog(o33, "PICKUP_DELAY", 14, { riderId: "r10" });
  const o34 = L("c6", [sku("SKU-10107", 1, "m1"), sku("SKU-10117", 1, "m1"), sku("SKU-10025", 1, "m1")], { ago: 6 }); renameOrder(S, o34, "TW-1034"); prog(o34, "MERCHANT_PREPARING", 4);
  const o35 = L("c6", [sku("SKU-10085", 6), sku("SKU-10091", 2), sku("SKU-10095")], { ago: 21 }); renameOrder(S, o35, "TW-1035"); prog(o35, "NO_RIDER", 9);
  const o37 = L("c11", [sku("SKU-10001"), sku("SKU-10013"), sku("SKU-10026")], { ago: 70, when: "scheduled", window: "18:00 – 19:00" }); renameOrder(S, o37, "TW-1037"); prog(o37, "SCHEDULED_PACKED", 40);
  const o38 = L("c5", [sku("SKU-10134", 1, "m3"), sku("SKU-10137", 1, "m3")], { ago: 1 }); renameOrder(S, o38, "TW-1038"); prog(o38, "MERCHANT_AWAIT", 0.5, { acceptLeftSec: 75 });
  const o39 = L("c2", [sku("SKU-10085", 2), sku("SKU-10093"), sku("SKU-10096")], { ago: 3 }); renameOrder(S, o39, "TW-1039"); prog(o39, "PICKING", 2);
  const o40 = L("c6", [menu("m2", 0), menu("m2", 4), sku("SKU-10085", 2)], { ago: 8, pay: "card" }); renameOrder(S, o40, "TW-1040"); prog(o40, "SPLIT_PREP", 6);
  const o41 = L("c9", [sku("SKU-10001", 2), sku("SKU-10013"), sku("SKU-10050", 2)], { ago: 55, when: "scheduled", window: "15:00 – 16:00" }); renameOrder(S, o41, "TW-1041"); prog(o41, "SCHEDULED_PACKED", 30);
  const o42 = L("c4", [sku("SKU-10175", 1, "m19"), sku("SKU-10176", 1, "m19")], { ago: 16 }); renameOrder(S, o42, "TW-1042"); prog(o42, "MERCHANT_PREPARING", 12);
  S.seq.order = 1043;
  /* reservations = hub lines of orders not yet packed (available = onHand − reserved) */
  Object.values(S.inv.h1).forEach((iv) => (iv.reserved = 0));
  S.fos.filter((f) => f.sourceType === "hub" && ["QUEUED", "PICKING"].includes(f.status)).forEach((f) => { const o = find(S.orders, f.orderId); o.lines.filter((l) => l.foId === f.id && l.state === "ok").forEach((l) => { if (S.inv.h1[l.skuId]) S.inv.h1[l.skuId].reserved += l.qty; }); });
  /* cash already held by riders today */
  S.riders.forEach((r) => { const held = sum(S.cod.filter((c) => c.riderId === r.id && c.status === "HELD"), (c) => c.collected); if (r.cash > held) S.cod.push({ id: uid("COD"), orderId: "رصيد افتتاحي (اليوم)", taskId: null, riderId: r.id, expected: r.cash - held, collected: r.cash - held, variance: 0, at: t0 - 2 * 3600000, status: "HELD" }); else r.cash = held; });
}

function renameOrder(S, o, id) {
  const old = o.id; o.id = id; o.no = id;
  S.fos.filter((f) => f.orderId === old).forEach((f, i) => { f.orderId = id; f.id = `FO-${id.slice(3)}-${i + 1}`; });
  o.fos = S.fos.filter((f) => f.orderId === id).map((f) => f.id);
  o.lines.forEach((l) => { const f = S.fos.find((x) => x.orderId === id && x.sourceId === l.sourceId && x.status !== "REROUTED"); l.foId = f && f.id; });
  S.fos.filter((f) => f.orderId === id).forEach((f) => { f.lineKeys = o.lines.filter((l) => l.foId === f.id).map((l) => l.key); });
  S.tasks.filter((t) => t.orderId === old).forEach((t, i, arr) => { t.orderId = id; t.id = arr.length > 1 ? `DT-${id.slice(3)}-${i + 1}` : `DT-${id.slice(3)}`; t.foIds = t.pickups.map((p) => { const f = S.fos.find((x) => x.orderId === id && x.sourceId === p.sourceId); p.foId = f.id; return f.id; }); });
  o.tasks = S.tasks.filter((t) => t.orderId === id).map((t) => t.id);
  S.payments.filter((p) => p.orderId === old).forEach((p) => (p.orderId = id));
  S.cod.filter((c) => c.orderId === old).forEach((c) => (c.orderId = id));
}

/* drive a seeded order into a believable state (bypasses timers but uses the same data model) */
function advanceSeed(S, o, target, t0, agoMin, rnd, opt = {}) {
  const at = t0 - agoMin * MIN;
  const fos = S.fos.filter((f) => f.orderId === o.id), tasks = S.tasks.filter((t) => t.orderId === o.id);
  const ev = (code, text, t = at) => o.events.push({ at: t, code, text, who: "system" });
  const ready = (f, t) => { o.events.push({ at: t, code: f.sourceType === "hub" ? "PACKED" : "READY", text: `${f.name}: جاهز`, who: "system" }); if (f.sourceType === "hub") { f.status = "PACKED"; f.pickStart = t - 5 * MIN; f.lines = f.lines; o.lines.filter((l) => l.foId === f.id).forEach((l) => (l.picked = true)); } else { f.status = "READY"; f.acceptedAt = t - 12 * MIN; } f.readyAt = t; };
  const assign = (t, rid, when) => { const r = find(S.riders, rid); t.riderId = rid; t.status = "ASSIGNED"; t.assignedAt = when; t.offers.push({ riderId: rid, at: when - 20000, resp: "accept", rt: 18 }); r.status = "busy"; r.task = t.id; t.leg = "pickup"; t.prog = 0.4; o.events.push({ at: when, code: "RIDER_ASSIGNED", text: `${r.ar} قبل المهمة`, who: "rider" }); };
  const deliver = (t, when, rid) => { assign(t, rid, when - 25 * MIN); t.status = "DELIVERED"; t.pickedAt = when - 15 * MIN; t.deliveredAt = when; t.pod = { otp: o.otp, at: when, gps: true }; t.pickups.forEach((p) => { p.scanned = true; p.at = t.pickedAt; }); const r = find(S.riders, rid); r.status = r.demo || r.id === "r2" || r.id === "r3" ? "online" : r.status; r.task = null; r.x = o.address.x; r.y = o.address.y; };
  if (target === "CLOSED" || target === "DELIVERED") {
    const rid = opt.riderId || ["r2", "r3", "r7", "r1"][Math.floor(rnd() * 4)];
    fos.forEach((f) => { ready(f, at - 14 * MIN); f.status = "DELIVERED"; });
    tasks.forEach((t) => deliver(t, at, rid));
    o.lines.forEach((l) => (l.picked = true));
    const p = S.payments.find((x) => x.orderId === o.id);
    if (o.pay.method === "cod") {
      const collected = o.totals.total + (opt.collected || 0);
      const c = { id: uid("COD"), orderId: o.id, taskId: tasks[0].id, riderId: rid, expected: o.totals.total, collected, variance: collected - o.totals.total, at, status: target === "CLOSED" ? "RECONCILED" : "HELD", varReason: opt.collected ? "" : undefined };
      S.cod.push(c);
      if (target !== "CLOSED") { const r = find(S.riders, rid); r.cash += 0; }
      if (p) p.status = target === "CLOSED" ? "SUCCESS" : "COD_COLLECTED";
      o.fin = target === "CLOSED" ? "FINANCIALLY_CLOSED" : opt.collected ? "RECON_REQUIRED" : "COD_COLLECTED";
    } else { if (p) { p.status = "SUCCESS"; p.reconciled = target === "CLOSED"; } o.fin = target === "CLOSED" ? "FINANCIALLY_CLOSED" : "SETTLEMENT_PENDING"; }
    o.status = "DELIVERED"; o.deliveredAt = at;
    ev("DELIVERED", "تم التسليم للعميل", at);
    if (target === "CLOSED") o.rating = { order: 5, merchant: 5, rider: 5, tags: ["وصل بسرعة"] };
    return;
  }
  if (target === "PICKING" || target === "PICKING_MISMATCH") { ev("PICKING", "بدأ التجميع في الهب", at);
    const f = fos[0]; f.status = "PICKING"; f.pickStart = at; f.picker = "وليد فتحي";
    o.lines.forEach((l, i) => (l.picked = i < 1));
    if (target === "PICKING_MISMATCH") {
      const l = o.lines.find((x) => x.skuId === "SKU-10050"); l.picked = false; l.state = "missing"; l.issue = { code: "EX-INV-001", at, text: "الرف فاضي والنظام يقول متاح 3 — بانتظار إعادة العد" };
      S.inv.h1["SKU-10050"].shelfEmpty = true;
      f.exception = { code: "EX-INV-001", at, owner: "مدير الهب", text: "عدم تطابق مخزون — لبن جهينة كامل الدسم (الرف B-02-2)" };
    }
    return;
  }
  if (target === "MERCHANT_LATE") { const f = fos[0]; f.status = "PREPARING"; f.acceptedAt = at - 2 * MIN; f.prepBy = at + 20 * MIN; f.slaPrepMin = 30; ev("ACCEPTED", "التاجر قبل الطلب", f.acceptedAt); return; }
  if (target === "SCHEDULED_PACKED") { /* handled below */ }
  if (target === "MERCHANT_PREPARING") { const f = fos[0]; f.status = "PREPARING"; f.acceptedAt = at; const m = find(S.merchants, f.sourceId); f.prepBy = at + m.prep * MIN; f.items = o.lines.filter((l) => l.foId === f.id).map((l) => ({ key: l.key, mark: null })); ev("ACCEPTED", "التاجر قبل الطلب", at); return; }
  if (target === "MERCHANT_AWAIT") { const f = fos[0]; f.status = "AWAITING_ACCEPT"; f.acceptBy = t0 + (opt.acceptLeftSec || 90) * 1000; return; }
  if (target === "PAYMENT_PENDING") { const p = S.payments.find((x) => x.orderId === o.id); p.status = "PENDING"; p.gwState = "TIMEOUT"; p.at = at; o.status = "PAYMENT_PENDING"; o.fin = "PAYMENT_PENDING"; fos.forEach((f) => (f.status = "QUEUED")); tasks.forEach((t) => (t.status = "WAITING")); o.hold = true; ev("PAY_TIMEOUT", "مهلة بوابة الدفع — النتيجة معلّقة، لا خصم جديد", at); return; }
  if (target === "NO_RIDER") { fos.forEach((f) => ready(f, at)); const t = tasks[0]; t.status = "NO_RIDER"; t.attempts = 3; t.offers = [["r7", "timeout"], ["r3", "reject"], ["r2", "timeout"]].map(([rid, resp], i) => ({ riderId: rid, at: at + i * 50000, resp, rt: resp === "timeout" ? 45 : 12, reason: resp === "reject" ? "بعيد عن مكاني" : null })); t.readySince = at; ev("NO_RIDER", "3 محاولات عرض بدون قبول — تدخل الكنترول", at + 3 * MIN); return; }
  if (target === "SCHEDULED_PACKED") { fos.forEach((f) => ready(f, at)); tasks.forEach((t) => (t.status = "SCHEDULED")); return; }
  if (target === "SPLIT_PREP") { fos.forEach((f) => { if (f.sourceType === "hub") ready(f, at + 3 * MIN); else { f.status = "PREPARING"; f.acceptedAt = at; f.prepBy = at + 22 * MIN; } }); return; }
  const t = tasks[0];
  fos.forEach((f) => ready(f, at - 6 * MIN));
  if (target === "PICKUP_DELAY") { assign(t, opt.riderId, at); t.prog = 0.35; t.pickupBy = at + 8 * MIN; return; }
  if (target === "IN_TRANSIT") { ev("PICKED_UP", "المندوب استلم الطلب", at); assign(t, opt.riderId, at - 8 * MIN); t.status = "PICKED_UP"; t.leg = "drop"; t.pickedAt = at; t.prog = 0.45; t.pickups.forEach((p) => (p.scanned = true)); fos.forEach((f) => (f.status = "HANDED_OVER")); return; }
  if (target === "ARRIVED_UNREACHABLE") { ev("ARRIVED", "المندوب وصل للعنوان", at); assign(t, opt.riderId, at - 20 * MIN); t.status = "ARRIVED"; t.leg = "drop"; t.prog = 1; t.pickedAt = at - 12 * MIN; t.arrivedAt = at; t.pickups.forEach((p) => (p.scanned = true)); fos.forEach((f) => (f.status = "HANDED_OVER")); t.contact = [{ at: at + 1 * MIN, kind: "call", ok: false }, { at: at + 3 * MIN, kind: "call", ok: false }, { at: at + 4 * MIN, kind: "whatsapp", ok: false }]; t.unreachable = { since: at + 1 * MIN, waitUntil: at + 11 * MIN }; const r = find(S.riders, opt.riderId); r.x = o.address.x; r.y = o.address.y; return; }
}

function seedAdmin(S, rnd, t0) {
  const ap = (type, ref, requester, reason, amount, evidence, impact, level, ago) => S.approvals.push({ id: `AP-${S.seq.approval++}`, type, ref, requester, reason, amount, evidence, impact, level, status: "PENDING", createdAt: t0 - ago * MIN, decisions: [] });
  /* support case + refund pending approval for TW-1026 */
  const o26 = find(S.orders, "TW-1026");
  const cs = { id: `CS-${S.seq.case++}`, orderId: "TW-1026", customerId: "c8", type: "صنف تالف", status: "PENDING_APPROVAL", owner: "دينا كمال", channel: "whatsapp", createdAt: t0 - 40 * MIN, slaAt: t0 + 200 * MIN, priority: "high", notes: [{ at: t0 - 38 * MIN, who: "دينا كمال", text: "العميلة بعتت صورة: 2 علبة قشطة مفتوحين وسايحين في الشنطة." }], recommendation: { party: "hub", resolution: "استرداد قيمة القشطة + 20 ج.م تعويض", maxComp: 50, approval: "مشرف خدمة العملاء" } };
  S.cases.push(cs); o26.caseIds = [cs.id];
  const rf = { id: `RF-${S.seq.refund++}`, orderId: "TW-1026", caseId: cs.id, lines: [o26.lines[1].key], amount: 80, items: 60, comp: 20, reason: "صنف تالف", party: "hub", evidence: "صورة العميل + سجل التغليف (القشطة لم تُعزل في كيس بارد)", method: "wallet", status: "PENDING_APPROVAL", at: t0 - 36 * MIN, by: "دينا كمال" };
  S.refunds.push(rf);
  ap("refund", { kind: "refund", id: rf.id, orderId: "TW-1026" }, { name: "دينا كمال", role: "support" }, "استرداد 60 ج.م + تعويض 20 ج.م — قشطة تالفة (طلب TW-1026)", 80, "صورة العميل · سجل التغليف", "يتحمّله الهب · خسارة هالك 60 ج.م", "supsup", 35);
  rf.approvalId = S.approvals[S.approvals.length - 1].id;
  S.audit.push({ id: uid("AU"), at: t0 - 36 * MIN, who: "دينا كمال", role: "support", obj: rf.id, action: "طلب استرداد", old: "—", nw: money(80), reason: "صنف تالف · المسؤول: الهب — فوق حد الموظف ⇒ موافقة المشرف", src: "Control Center · ويب" });
  /* other cases */
  S.cases.push({ id: `CS-${S.seq.case++}`, orderId: "TW-1017", customerId: "c10", type: "التوصيل اتأخر", status: "OPEN", owner: "دينا كمال", channel: "app", createdAt: t0 - 12 * MIN, slaAt: t0 + 228 * MIN, priority: "medium", notes: [], recommendation: { party: "merchant", resolution: "متابعة التاجر + كوبون 20 ج.م لو تجاوز 60 دقيقة", maxComp: 20, approval: "لا يحتاج" } });
  S.cases.push({ id: `CS-${S.seq.case++}`, orderId: "TW-1020", customerId: "c6", type: "فرق في الكاش", status: "INVESTIGATING", owner: "نهى عبد الرازق", channel: "call", createdAt: t0 - 45 * MIN, slaAt: t0 + 24 * 60 * MIN, priority: "medium", notes: [{ at: t0 - 44 * MIN, who: "نظام", text: "المحصّل 300 والمتوقع 325 — المندوب سجّل: «العميلة قالت فيه خصم 25 من العرض»" }], recommendation: { party: "rider", resolution: "مراجعة العرض المطبّق — لا يوجد عرض على الطلب ⇒ فرق على المندوب بعد المراجعة", maxComp: 0, approval: "المالية" } });
  ap("merchant_activation", { kind: "merchant", id: "m25" }, { name: "رامي عزت", role: "sales" }, "تفعيل صيدلية النور — أبو الشقاف (أول صيدلية في القرية)", 0, "سجل تجاري · ترخيص الصيدلية 6033 · عقد العمولة 10%", "تغطية صيدلية لـ 21 ألف نسمة · 31 طلب صيدلية/يوم غير ملبّى", "merchops", 50);
  find(S.approvals, `AP-${S.seq.approval - 1}`).blockedBy = "lead stage";
  ap("price", { kind: "msku", merchantId: "m6", skuId: "SKU-10032" }, { name: "خضري أولاد عطية", role: "merchant" }, "سعر طماطم 26 ج.م/كجم (المرجعي 18 · وسيط السوق 19)", 8, "تغيّر من 19 إلى 26 خلال ساعة", "+44% عن المرجعي — يتجاوز سماحية 15%", "category", 22);
  ap("writeoff", { kind: "inventory", skuId: "SKU-10075" }, { name: "حمدي رزق", role: "hub" }, "إعدام 6 عبوات عيش فينو منتهية الصلاحية", 150, "صورة + تقرير الجرد الصباحي", "خسارة هالك 150 ج.م", "ops", 90);
  ap("rider_adjust", { kind: "rider", id: "r10" }, { name: "سارة مختار", role: "ops" }, "خصم 25 ج.م من مستحقات محمد عادل — تأخير متكرر في الاستلام", 25, "3 تأخيرات استلام هذا الأسبوع (سجل GPS)", "يؤثر على تسوية المندوب", "ops", 120);
  ap("po", { kind: "po", id: "PO-72" }, { name: "كمال عيسى", role: "procurement" }, "أمر شراء ألبان جهينة — 240 لتر", 9120, "توصية الشراء: تغطية 1.2 يوم فقط", "هامش متوقع 12%", "finance", 30);
  /* purchase orders */
  S.pos = [
    { id: "PO-71", supplier: "موزع جهينة — دمنهور", status: "RECEIVING", lines: [["SKU-10050", 120, 38.7], ["SKU-10053", 96, 7]], createdAt: t0 - 26 * 3600000, eta: t0 + 30 * MIN, approvedBy: "نهى عبد الرازق" },
    { id: "PO-72", supplier: "موزع جهينة — دمنهور", status: "PENDING_APPROVAL", lines: [["SKU-10050", 240, 38.0]], createdAt: t0 - 30 * MIN, eta: t0 + 20 * 3600000, approvedBy: null },
    { id: "PO-70", supplier: "شركة الضحى للأغذية", status: "RECEIVED", lines: [["SKU-10001", 80, 36.5], ["SKU-10011", 60, 26]], createdAt: t0 - 3 * 864e5, eta: t0 - 2 * 864e5, approvedBy: "نهى عبد الرازق", receivedLines: [["SKU-10001", 80], ["SKU-10011", 57]], discrepancy: "عجز 3 أكياس دقيق — مطالبة للمورد" },
  ];
  S.seq.po = 73;
  /* catalogue requests from merchants */
  S.catReqs = [{ id: `CR-${S.seq.req++}`, merchantId: "m14", name: "شاحن سامسونج 25 وات أصلي", barcode: "8806094523612", catGuess: "electronics/chargers", photo: true, status: "PENDING", at: t0 - 3 * 3600000 }];
  /* returns awaiting inspection */
  S.returns = [{ id: "RT-31", orderId: "TW-0989", source: "h1", lines: [["SKU-10111", 1]], reason: "العميل رفض الاستلام", status: "INSPECTION", at: t0 - 50 * MIN }];
  /* audit seed */
  const a = (ago, who, role, obj, action, old, nw, reason) => S.audit.push({ id: uid("AU"), at: t0 - ago * MIN, who, role, obj, action, old, nw, reason, src: "Control Center · ويب" });
  a(320, "نهى عبد الرازق", "finance", "PO-70", "استلام مع فرق", "60", "57", "عجز من المورد");
  a(210, "سارة مختار", "ops", "منطقة الحدين", "تعديل نافذة توصيل", "14:00 – 15:00", "15:00 – 16:00", "مواعيد صلاة الجمعة");
  a(180, "ليلى حسن", "category", "SKU-10013", "تعديل سعر", "79", "82", "زيادة سعر المورد");
  a(95, "حمدي رزق", "hub", "SKU-10097 (مخزون)", "تسوية مخزون", "48", "46", "تالف — كسر عبوتين");
  a(60, "باسم فاروق", "merchops", "فراخ كرسبي البلد", "تغيير التصنيف", "مراقبة", "مقيّد", "إلغاءات بعد القبول 9%");
  a(30, "عمر ناجي", "dispatcher", "DT-1030", "إسناد يدوي", "—", "عمرو حسن", "أقرب مندوب للقرية");
}

/* ===================================================================== order builder ===================== */
/* input: {customerId, lines:[{skuId, qty, sourceType, sourceId} | {menuItemId, merchantId, qty, mods}], pay, when, window, promo, idem, changeFor} */
function buildOrder(S, input, at = now()) {
  const c = find(S.customers, input.customerId);
  const addr = c.addresses.find((a) => a.id === (input.addressId || c.addr)) || c.addresses[0];
  const zone = find(S.zones, addr.zoneId);
  const id = `TW-${S.seq.order++}`;
  const lines = input.lines.map((l, i) => {
    if (l.menuItemId) {
      const it = S.menus[l.merchantId].find((x) => x.id === l.menuItemId);
      const modPrice = sum(l.mods || [], (m) => m.p);
      return { key: `${id}-L${i + 1}`, kind: "menu", menuItemId: it.id, name: it.name, size: (l.mods || []).map((m) => m.n).join("، "), qty: l.qty, unitPrice: it.price + modPrice, mods: l.mods || [], sourceType: "merchant", sourceId: l.merchantId, dept: "food", handling: "hot", state: "ok" };
    }
    const s = find(S.skus, l.skuId);
    const price = l.sourceType === "hub" ? s.price : (S.msku[l.sourceId][l.skuId] || {}).price || s.price;
    return { key: `${id}-L${i + 1}`, kind: "sku", skuId: s.id, name: s.ar, size: s.size, qty: l.qty, unitPrice: price, sourceType: l.sourceType, sourceId: l.sourceId, dept: s.dept, handling: s.handling, state: "ok", cost: l.sourceType === "hub" ? (S.inv.h1[s.id] || {}).cost : null };
  });
  /* fulfillment orders — one per source */
  const groups = TW.groupBy(lines, (l) => l.sourceId);
  const fos = Object.entries(groups).map(([sid, ls], gi) => {
    const isHub = sid === "h1";
    const m = !isHub && find(S.merchants, sid);
    const f = { id: `FO-${id.slice(3)}-${gi + 1}`, orderId: id, sourceType: isHub ? "hub" : "merchant", sourceId: sid, name: isHub ? "هب توّا" : m.ar, kind: isHub ? "hub" : m.type === "restaurant" ? "food" : m.type, status: isHub ? "QUEUED" : "AWAITING_ACCEPT", createdAt: at, acceptBy: isHub ? null : at + (input.acceptSec || S.rules.merchantAcceptSec) * 1000, prepMin: isHub ? S.rules.pickSlaMin : m.prep, lineKeys: ls.map((l) => l.key), pickupCode: String(1000 + Math.floor(Math.random() * 9000)), packages: [], items: ls.map((l) => ({ key: l.key, mark: null })), x: isHub ? find(S.hubs, "h1").x : m.x, y: isHub ? find(S.hubs, "h1").y : m.y };
    ls.forEach((l) => (l.foId = f.id));
    return f;
  });
  /* totals */
  const items = sum(lines, (l) => l.unitPrice * l.qty);
  let delivery = zone.fee; const freeOver = zone.type === "core" ? 300 : 400; if (items >= freeOver) delivery = 0;
  const service = 3;
  let discount = 0, promoFunding = { twaa: 0, merchant: 0 }, promo = null;
  if (input.promo) { const r = evalPromo(S, input.promo, lines, items, zone, c); if (r.ok) { discount = r.discount; promoFunding = r.funding; promo = r.promo.id; if (r.freeDelivery) { promoFunding.twaa += delivery * (r.promo.share || 1); promoFunding.merchant += delivery * (1 - (r.promo.share || 1)); discount += delivery; } } }
  const total = Math.max(0, items + delivery + service - discount);
  /* orchestration decision: combine or split */
  const readyIn = fos.map((f) => (f.sourceType === "hub" ? S.rules.pickSlaMin : f.prepMin));
  const spread = Math.max(...readyIn) - Math.min(...readyIn);
  const farApart = fos.length > 1 && distKm(fos[0], fos[fos.length - 1]) > 1.5;
  const split = fos.length > 1 && (spread > S.rules.splitDelayMin || farApart);
  const decision = fos.length === 1 ? { mode: "single", text: "مصدر واحد — مهمة توصيل واحدة" } : split ? { mode: "split", text: `تسليم مجزّأ: فرق الجاهزية ${spread} د > الحد ${S.rules.splitDelayMin} د${farApart ? " والمصادر متباعدة" : ""} (BR-DSP-002)` } : { mode: "combined", text: `مندوب واحد متعدد الاستلام: فرق الجاهزية ${spread} د ≤ ${S.rules.splitDelayMin} د والمصادر قريبة (BR-DSP-001)` };
  const otp = String(1000 + Math.floor(Math.random() * 9000));
  const cod = input.pay === "cod" ? total : 0;
  const mkTask = (tfos, suffix) => ({ id: `DT-${id.slice(3)}${suffix}`, orderId: id, foIds: tfos.map((f) => f.id), status: input.when === "scheduled" || zone.route === "scheduled" ? "SCHEDULED" : "WAITING", riderId: null, offers: [], attempts: 0, offer: null, pickups: tfos.map((f) => ({ foId: f.id, sourceType: f.sourceType, sourceId: f.sourceId, name: f.name, x: f.x, y: f.y, packages: 0, scanned: false, code: f.pickupCode })), drop: { x: addr.x, y: addr.y, name: c.ar, landmark: addr.landmark, street: addr.street, zoneId: zone.id }, cod: 0, handling: [...new Set(lines.filter((l) => tfos.some((f) => f.id === l.foId)).map((l) => l.handling))].filter((h) => h !== "normal"), leg: "pickup", prog: 0, contact: [], createdAt: at, window: input.window || (zone.route === "scheduled" ? zone.windows[0] : null), km: +(distKm(tfos[0], addr) + (tfos.length > 1 ? distKm(tfos[0], tfos[tfos.length - 1]) : 0)).toFixed(1) });
  const tasks = split ? fos.map((f, i) => mkTask([f], `-${i + 1}`)) : [mkTask(fos, "")];
  tasks[0].cod = cod; /* cash collected on the first drop */
  tasks.forEach((t) => (t.earn = Math.round(22 + t.km * 3 + (t.pickups.length - 1) * 6)));
  const etaMin = Math.max(zone.sla[0], Math.max(...readyIn) + 10);
  const order = {
    id, no: id, customerId: c.id, addressId: addr.id, address: { ...addr }, zoneId: zone.id, createdAt: at, status: "CONFIRMED", fin: input.pay === "cod" ? "COD_PENDING" : "PAID",
    pay: { method: input.pay, changeFor: input.changeFor || null }, lines, fos: fos.map((f) => f.id), tasks: tasks.map((t) => t.id), totals: { items, delivery, service, discount, total, promoFunding }, promo,
    mode: input.when || "now", window: input.window || null, etaAt: at + etaMin * MIN, etaRange: [etaMin, etaMin + 10], split, decision, otp, subPref: input.subPref || c.subPref, notes: input.notes || "", events: [{ at, code: "CREATED", text: "تم إنشاء الطلب وتأكيده", who: "customer" }], idem: input.idem, caseIds: [],
  };
  if (split) order.events.push({ at, code: "SPLIT", text: "طلبك هيوصل على مرتين عشان منأخركش", who: "system" });
  /* payment record (idempotent) */
  const pay = { id: `PAY-${id.slice(3)}`, orderId: id, method: input.pay, amount: total, status: input.pay === "cod" ? "COD_EXPECTED" : "SUCCESS", gw: input.pay === "card" ? "Paymob" : input.pay === "wallet" ? "محفظة توّا" : "كاش", ref: input.pay === "card" ? `PMB-${Math.round(Math.random() * 1e8)}` : null, idem: input.idem, at, fee: input.pay === "card" ? +(total * 0.022 + 2).toFixed(2) : 0, reconciled: false };
  S.orders.unshift(order); S.fos.push(...fos); S.tasks.push(...tasks); S.payments.push(pay);
  /* inventory reservation for hub lines (available = onHand − reserved) */
  lines.filter((l) => l.sourceType === "hub").forEach((l) => { const iv = S.inv.h1[l.skuId]; if (iv) iv.reserved += l.qty; });
  if (input.pay === "wallet") c.wallet = Math.max(0, c.wallet - total);
  if (promo) { const p = find(S.promos, promo); p.redemptions++; p.spent += discount; }
  c.orders++; c.last = 0;
  return { ok: true, order };
}

function evalPromo(S, code, lines, items, zone, c) {
  const p = S.promos.find((x) => x.code && x.code.toUpperCase() === String(code).toUpperCase());
  if (!p) return { ok: false, error: "الكود ده مش موجود" };
  if (p.status !== "active") return { ok: false, error: "العرض ده انتهى أو مش مفعّل" };
  if (items < (p.minBasket || 0)) return { ok: false, error: `العرض محتاج سلة ${money(p.minBasket)} على الأقل` };
  if (p.zones !== "all" && !p.zones.split(",").includes(zone.id)) return { ok: false, error: "العرض مش متاح في منطقتك" };
  if (p.segment === "sg-new" && c.orders > 0) return { ok: false, error: "العرض ده لأول طلب بس" };
  let base = items;
  if (p.scope.startsWith("merchant:")) base = sum(lines.filter((l) => l.sourceId === p.scope.split(":")[1]), (l) => l.unitPrice * l.qty);
  if (p.scope.startsWith("dept:")) base = sum(lines.filter((l) => l.dept === p.scope.split(":")[1]), (l) => l.unitPrice * l.qty);
  if (base <= 0) return { ok: false, error: "مفيش منتجات في السلة ينطبق عليها العرض" };
  let discount = 0;
  if (p.type === "percent") discount = Math.min(p.cap || Infinity, Math.round(base * p.value / 100));
  if (p.type === "fixed") discount = p.value;
  const tw = p.funding === "twaa" ? 1 : p.funding === "merchant" ? 0 : p.share;
  return { ok: true, promo: p, discount, freeDelivery: p.type === "freedelivery", funding: { twaa: +(discount * tw).toFixed(2), merchant: +(discount * (1 - tw)).toFixed(2) } };
}
TW.evalPromo = (code, lines, items, zoneId, customerId) => evalPromo(TW.S, code, lines, items, find(TW.S.zones, zoneId), find(TW.S.customers, customerId));

/* ===================================================================== recompute ===================== */
function recomputeOrder(o) {
  const S = TW.S;
  if (["CANCELLED", "RETURNED"].includes(o.status) && o.final) return;
  const fos = S.fos.filter((f) => f.orderId === o.id && !["REROUTED"].includes(f.status));
  const tasks = S.tasks.filter((t) => t.orderId === o.id && t.status !== "CANCELLED");
  let st;
  if (o.hold) st = "PAYMENT_PENDING";
  else if (o.lines.some((l) => l.state === "sub_pending")) st = "AWAITING_CUSTOMER_DECISION";
  else if (fos.some((f) => ["TIMEOUT", "REJECTED"].includes(f.status) && !f.resolved)) st = "MERCHANT_ISSUE";
  else if (tasks.length && tasks.every((t) => t.status === "DELIVERED")) st = "DELIVERED";
  else if (tasks.some((t) => t.status === "RTO")) st = "RETURN_TO_ORIGIN";
  else if (tasks.some((t) => t.status === "RETURNED") && !tasks.some((t) => t.status === "DELIVERED")) st = "RETURNED";
  else if (tasks.some((t) => t.status === "FAILED")) st = "DELIVERY_FAILED";
  else if (tasks.some((t) => t.status === "DELIVERED")) st = "PARTIALLY_DELIVERED";
  else if (tasks.some((t) => t.status === "ARRIVED")) st = "ARRIVED";
  else if (tasks.some((t) => t.status === "PICKED_UP")) st = "IN_TRANSIT";
  else if (tasks.some((t) => ["ASSIGNED", "AT_PICKUP"].includes(t.status))) st = "RIDER_ASSIGNED";
  else if (fos.length && fos.every((f) => ["PACKED", "READY", "HANDED_OVER"].includes(f.status))) st = tasks.some((t) => t.status === "SCHEDULED") ? "SCHEDULED" : "READY";
  else if (fos.some((f) => ["PICKING", "PREPARING", "PACKED", "READY"].includes(f.status))) st = "PREPARING";
  else st = "CONFIRMED";
  if (fos.length && fos.every((f) => f.status === "CANCELLED")) st = "CANCELLED";
  if (o.status !== st) { o.status = st; if (st === "DELIVERED") o.deliveredAt = o.deliveredAt || now(); }
}
function recomputeAll() { TW.S.orders.forEach(recomputeOrder); }
TW.recompute = recomputeAll;

/* ===================================================================== event plumbing ===================== */
const subs = new Set();
let dirty = false, saveT = null;
TW.on = (fn) => { subs.add(fn); return () => subs.delete(fn); };
function emit(reason) { dirty = false; subs.forEach((fn) => { try { fn(reason); } catch (e) { console.error(e); } }); clearTimeout(saveT); saveT = setTimeout(save, 400); }
function save() { try { TW.store.set(KEY, JSON.stringify(TW.S)); } catch (e) { /* storage full or blocked: keep running in memory */ } }
function load() { const raw = TW.store.get(KEY); if (!raw) return null; try { const s = JSON.parse(raw); if (s.v !== 3 || now() - s.seededAt > 8 * 3600000) return null; return s; } catch (e) { return null; } }
TW.reset = () => { TW.store.del(KEY); seed(); emit("reset"); };
TW.boot = () => { const s = load(); if (s) { TW.S = s; } else seed(); startEngine(); return TW.S; };

/* audit + notifications */
function audit(actor, obj, action, old, nw, reason) { TW.S.audit.unshift({ id: uid("AU"), at: now(), who: actor.name, role: actor.role || actor.kind, obj, action, old: old == null ? "—" : String(old), nw: nw == null ? "—" : String(nw), reason: reason || "—", src: actor.src || ({ customer: "تطبيق العميل", merchant: "تطبيق التاجر", rider: "تطبيق المندوب", admin: "Control Center · ويب", system: "النظام" }[actor.kind] || "النظام") }); }
function notify(to, title, body, extra = {}) { TW.S.notes.unshift({ id: `N-${TW.S.seq.notif++}`, to, title, body, at: now(), read: false, ...extra }); if (TW.S.notes.length > 300) TW.S.notes.length = 300; }
function ev(o, code, text, who = "system") { o.events.push({ at: now(), code, text, who }); }
TW.audit = audit; TW.notify = notify;

/* actors */
TW.actor = {
  customer: (id = TW.S.session.customer) => { const c = find(TW.S.customers, id); return { kind: "customer", id, name: c ? c.ar : id }; },
  merchant: (id = TW.S.session.merchant) => { const m = find(TW.S.merchants, id); return { kind: "merchant", id, name: m ? m.ar : id, role: "merchant" }; },
  rider: (id = TW.S.session.rider) => { const r = find(TW.S.riders, id); return { kind: "rider", id, name: r ? r.ar : id, role: "rider" }; },
  admin: () => { const u = find(TW.S.users, TW.S.session.admin); return { kind: "admin", id: u.id, name: u.ar, role: u.role }; },
  system: () => ({ kind: "system", id: "system", name: "النظام", role: "system" }),
};
TW.can = (perm, userId = TW.S.session.admin) => { const u = find(TW.S.users, userId); return !!u && (TW.S.rolePerms[u.role] || []).includes(perm); };
TW.roleOf = (userId = TW.S.session.admin) => { const u = find(TW.S.users, userId); return D.roles.find((r) => r.id === u.role); };

/* ===================================================================== actions ===================== */
const A = {};
TW.actions = A;
TW.act = (name, payload = {}, actor) => {
  const fn = A[name];
  if (!fn) { console.warn("unknown action", name); return { ok: false, error: `إجراء غير معروف: ${name}` }; }
  actor = actor || TW.actor.system();
  let res;
  try { res = fn(payload, actor) || { ok: true }; } catch (e) { console.error(e); res = { ok: false, error: e.message }; }
  if (res.ok !== false) { recomputeAll(); emit(name); }
  return res;
};
const fail = (error, extra) => ({ ok: false, error, ...extra });
const need = (perm, actor) => (actor.kind !== "admin" || TW.can(perm, actor.id) ? null : fail(`صلاحية «${D.perms[perm]}» غير متاحة لدورك (${TW.roleOf(actor.id).ar}).`, { denied: true }));
const needReason = (r) => (!r || !String(r).trim() ? fail("السبب إلزامي لهذا الإجراء") : null);

/* ---------------- customer: location, cart, checkout ---------------- */
A["cust.setAddress"] = ({ customerId, addressId }) => { find(TW.S.customers, customerId).addr = addressId; };
A["cust.addAddress"] = ({ customerId, zoneId, label, landmark, street, x, y }, actor) => {
  const c = find(TW.S.customers, customerId), z = find(TW.S.zones, zoneId);
  if (!landmark) return fail("اكتب علامة مميزة عشان المندوب يوصلك");
  const a = { id: uid(`${customerId}-a`), label: label || "عنوان", zoneId, landmark, street: street || "", x: x || z.x, y: y || z.y };
  c.addresses.push(a); c.addr = a.id; return { ok: true, address: a };
};
A["cust.waitlist"] = ({ customerId, zoneId }) => { const c = find(TW.S.customers, customerId); if (!c.waitlist.includes(zoneId)) { c.waitlist.push(zoneId); const w = TW.S.waitlist[zoneId]; if (w) w.users++; } };
A["cust.subPref"] = ({ customerId, pref }) => { find(TW.S.customers, customerId).subPref = pref; const ct = cart(customerId); ct.subPref = pref; };
A["cust.fav"] = ({ customerId, skuId }) => { const c = find(TW.S.customers, customerId); c.favs = c.favs.includes(skuId) ? c.favs.filter((x) => x !== skuId) : [...c.favs, skuId]; };
A["cust.saveBasket"] = ({ customerId, name, lines }) => { const c = find(TW.S.customers, customerId); c.baskets.push({ id: uid("BK"), name, lines }); };
A["search.log"] = ({ q, results, zoneId }) => { TW.S.demand.searches++; if (!results && q && q.trim().length > 1) { const e = TW.S.demand.noResult.find((x) => TW.norm(x.q) === TW.norm(q)); if (e) e.n++; else TW.S.demand.noResult.push({ q, n: 1, dept: null, zoneId }); } };
A["cust.notifyMe"] = ({ customerId, skuId }) => { const c = find(TW.S.customers, customerId); if (!c.notifyMe.includes(skuId)) c.notifyMe.push(skuId); TW.S.demand.notify.push({ skuId, customerId, at: now() }); };
function cart(customerId) { return (TW.S.carts[customerId] = TW.S.carts[customerId] || { lines: [], promo: null, subPref: find(TW.S.customers, customerId).subPref }); }
TW.cart = cart;
A["cart.add"] = ({ customerId, skuId, sourceType, sourceId, qty = 1 }) => {
  const s = find(TW.S.skus, skuId);
  if (s.regulated) return fail("المنتج ده محتاج روشتة وتحقق من صيدلي قبل البيع — مش متاح للإضافة المباشرة.", { regulated: true });
  const ct = cart(customerId);
  const ex = ct.lines.find((l) => l.skuId === skuId && l.sourceId === sourceId);
  const avail = sourceType === "hub" ? hubAvail(skuId) : merchantAvail(sourceId, skuId);
  const want = (ex ? ex.qty : 0) + qty;
  if (avail != null && want > avail) return fail(`المتاح ${avail} بس`, { max: avail });
  if (ex) ex.qty = want; else ct.lines.push({ key: uid("CL"), skuId, sourceType, sourceId, qty, priceSeen: priceAt(skuId, sourceType, sourceId) });
};
A["cart.addMenu"] = ({ customerId, merchantId, menuItemId, mods = [], qty = 1, note }) => {
  const m = find(TW.S.merchants, merchantId); if (m.mode === "closed") return fail("المطعم مقفول دلوقتي");
  const it = TW.S.menus[merchantId].find((x) => x.id === menuItemId); if (!it.available) return fail("الصنف ده خلص حالياً");
  for (const g of it.mods) if (g.req && !mods.some((x) => g.opts.some((o) => o.n === x.n))) return fail(`اختار ${g.name}`);
  const ct = cart(customerId); ct.lines.push({ key: uid("CL"), menuItemId, merchantId, sourceType: "merchant", sourceId: merchantId, qty, mods, note, priceSeen: it.price + sum(mods, (x) => x.p) });
};
A["cart.qty"] = ({ customerId, key, qty }) => { const ct = cart(customerId); const l = ct.lines.find((x) => x.key === key); if (!l) return; if (qty <= 0) ct.lines = ct.lines.filter((x) => x.key !== key); else { if (l.skuId) { const av = l.sourceType === "hub" ? hubAvail(l.skuId) : merchantAvail(l.sourceId, l.skuId); if (av != null && qty > av) return fail(`المتاح ${av} بس`); } l.qty = qty; } };
A["cart.remove"] = ({ customerId, key }) => { const ct = cart(customerId); ct.lines = ct.lines.filter((x) => x.key !== key); };
A["cart.clear"] = ({ customerId }) => { const ct = cart(customerId); ct.lines = []; ct.promo = null; };
A["cart.promo"] = ({ customerId, code }) => {
  const ct = cart(customerId); if (!code) { ct.promo = null; return; }
  const c = find(TW.S.customers, customerId), addr = c.addresses.find((a) => a.id === c.addr);
  const lines = cartLines(customerId); const items = sum(lines, (l) => l.unitPrice * l.qty);
  const r = evalPromo(TW.S, code, lines, items, find(TW.S.zones, addr.zoneId), c); if (!r.ok) return r; ct.promo = r.promo.code; return { ok: true, discount: r.discount };
};
A["cart.reorder"] = ({ customerId, orderId }) => { const o = find(TW.S.orders, orderId); let skipped = 0; o.lines.forEach((l) => { const r = l.kind === "menu" ? A["cart.addMenu"]({ customerId, merchantId: l.sourceId, menuItemId: l.menuItemId, mods: l.mods, qty: l.qty }) : A["cart.add"]({ customerId, skuId: l.skuId, sourceType: l.sourceType, sourceId: l.sourceId, qty: l.qty }); if (r && r.ok === false) skipped++; }); return { ok: true, skipped }; };
function cartLines(customerId) {
  return cart(customerId).lines.map((l) => {
    if (l.menuItemId) { const it = TW.S.menus[l.merchantId].find((x) => x.id === l.menuItemId); return { ...l, name: it.name, unitPrice: it.price + sum(l.mods || [], (x) => x.p), dept: "food" }; }
    const s = find(TW.S.skus, l.skuId); return { ...l, name: s.ar, unitPrice: priceAt(l.skuId, l.sourceType, l.sourceId), dept: s.dept };
  });
}
TW.cartLines = cartLines;
/* full pre-checkout validation (P04): location, serviceability, price, availability, qty, merchant status/capacity, delivery capacity, ETA, promo, min basket, restricted */
TW.validateCart = (customerId, opts = {}) => {
  const S = TW.S, c = find(S.customers, customerId), addr = c.addresses.find((a) => a.id === (opts.addressId || c.addr)), zone = find(S.zones, addr.zoneId), ct = cart(customerId);
  const issues = [], changes = [];
  if (!zone.active) issues.push({ level: "block", code: "EX-LOC-003", text: `لسه موصلناش ${zone.ar}. سجّل في قائمة الانتظار وهنبلغك.` });
  const lines = cartLines(customerId);
  lines.forEach((l) => {
    if (l.skuId) {
      const s = find(S.skus, l.skuId);
      if (s.regulated) issues.push({ level: "block", code: "BR-RX", text: `${s.ar} يحتاج روشتة — اتشال من السلة` });
      const av = l.sourceType === "hub" ? hubAvail(l.skuId) : merchantAvail(l.sourceId, l.skuId);
      if (av === 0) changes.push({ key: l.key, kind: "unavailable", text: `${s.ar} خلص حالياً`, code: "EX-CRT-002" });
      else if (av != null && l.qty > av) changes.push({ key: l.key, kind: "qty", text: `${s.ar}: المتاح ${av} بس — هنعدّل الكمية`, to: av, code: "EX-CRT-002" });
      if (l.priceSeen != null && Math.abs(l.priceSeen - l.unitPrice) > 0.01) changes.push({ key: l.key, kind: "price", text: `سعر ${s.ar} اتغيّر من ${money(l.priceSeen)} لـ ${money(l.unitPrice)}`, code: "EX-VAL-001" });
    }
    if (l.sourceType === "merchant") { const m = find(S.merchants, l.sourceId); if (m.mode === "closed" || m.status !== "active") changes.push({ key: l.key, kind: "closed", text: `${m.ar} مقفول دلوقتي`, code: "EX-VAL-004" }); }
  });
  const items = sum(lines, (l) => l.unitPrice * l.qty);
  if (items < zone.min) issues.push({ level: "block", code: "BR-CART-002", text: `الحد الأدنى للطلب في ${zone.ar} ${money(zone.min)} — ضيف ${money(zone.min - items)}` });
  const busy = S.tasks.filter((t) => ["WAITING", "OFFERED", "ASSIGNED", "AT_PICKUP", "PICKED_UP"].includes(t.status) && t.drop.zoneId === zone.id).length;
  if (zone.cap && busy >= zone.cap) issues.push({ level: "warn", code: "EX-VAL-003", text: "الضغط عالي في منطقتك — التوصيل ممكن ياخد وقت أطول" });
  let promo = null;
  if (ct.promo) { const r = evalPromo(S, ct.promo, lines, items, zone, c); if (!r.ok) changes.push({ kind: "promo", text: `الكود ${ct.promo}: ${r.error}`, code: "EX-VAL-002" }); else promo = r; }
  if (opts.pay === "cod") { const total = items + zone.fee + 3; if (total > S.rules.codOrderMax) issues.push({ level: "block", code: "BR-COD-001", text: `الكاش متاح للطلبات لحد ${money(S.rules.codOrderMax)} — ادفع أونلاين` }); if (c.codFails >= S.rules.codFailBlock) issues.push({ level: "block", code: "BR-COD-002", text: "الدفع كاش متوقف على حسابك مؤقتاً بسبب طلبات سابقة اترفضت — ادفع أونلاين" }); }
  const groups = Object.values(TW.groupBy(lines, (l) => l.sourceId)).map((ls) => { const sid = ls[0].sourceId; const isHub = sid === "h1"; const m = !isHub && find(S.merchants, sid); const prep = isHub ? S.rules.pickSlaMin : m.prep; return { sourceId: sid, sourceType: isHub ? "hub" : "merchant", name: isHub ? "توّا" : m.ar, lines: ls, subtotal: sum(ls, (l) => l.unitPrice * l.qty), eta: [Math.max(zone.sla[0], prep + 10), Math.max(zone.sla[1], prep + 20)] }; });
  let delivery = zone.fee; if (items >= (zone.type === "core" ? 300 : 400)) delivery = 0;
  let discount = promo ? promo.discount + (promo.freeDelivery ? delivery : 0) : 0;
  const service = lines.length ? 3 : 0;
  const total = Math.max(0, items + delivery + service - discount);
  const readyIn = groups.map((g) => (g.sourceType === "hub" ? S.rules.pickSlaMin : find(S.merchants, g.sourceId).prep));
  const split = groups.length > 1 && Math.max(...readyIn) - Math.min(...readyIn) > S.rules.splitDelayMin;
  return { ok: !issues.some((i) => i.level === "block") && lines.length > 0, issues, changes, lines, groups, zone, address: addr, totals: { items, delivery, service, discount, total }, promo, split, eta: zone.route === "scheduled" ? null : [Math.max(...groups.map((g) => g.eta[0]), 0), Math.max(...groups.map((g) => g.eta[1]), 0)], windows: zone.windows };
};
A["cart.applyChanges"] = ({ customerId }) => {
  const v = TW.validateCart(customerId), ct = cart(customerId);
  v.changes.forEach((ch) => { const l = ct.lines.find((x) => x.key === ch.key); if (!l && ch.kind !== "promo") return; if (ch.kind === "unavailable" || ch.kind === "closed") ct.lines = ct.lines.filter((x) => x.key !== ch.key); if (ch.kind === "qty") l.qty = ch.to; if (ch.kind === "price") l.priceSeen = priceAt(l.skuId, l.sourceType, l.sourceId); if (ch.kind === "promo") ct.promo = null; });
  ct.lines = ct.lines.filter((l) => !(l.skuId && find(TW.S.skus, l.skuId).regulated));
};
/* place order — idempotent on idemKey (BR-PAY-001) */
A["order.place"] = ({ customerId, pay, when, window, idem, changeFor, notes, addressId }, actor) => {
  const S = TW.S;
  const dup = S.orders.find((o) => o.idem && o.idem === idem);
  if (dup) { S.idemHits = (S.idemHits || 0) + 1; audit(actor, dup.id, "منع طلب مكرر (Idempotency)", null, idem, "نفس مفتاح الدفع خلال النافذة — نفس النتيجة بدون خصم جديد (BR-PAY-001)"); return { ok: true, order: dup, duplicate: true }; }
  const v = TW.validateCart(customerId, { pay, addressId });
  if (!v.ok) return fail(v.issues.filter((i) => i.level === "block").map((i) => i.text).join(" · ") || "السلة فاضية");
  if (v.changes.length) return fail("فيه تغييرات في السلة لازم توافق عليها الأول", { changes: v.changes });
  if (pay === "wallet" && find(S.customers, customerId).wallet < v.totals.total) return fail("رصيد المحفظة مش كفاية");
  const ct = cart(customerId);
  const lines = ct.lines.map((l) => (l.menuItemId ? { menuItemId: l.menuItemId, merchantId: l.merchantId, qty: l.qty, mods: l.mods } : { skuId: l.skuId, qty: l.qty, sourceType: l.sourceType, sourceId: l.sourceId }));
  const res = buildOrder(S, { customerId, lines, pay, when, window, promo: ct.promo, idem, changeFor, notes, addressId, subPref: ct.subPref }, now());
  const o = res.order;
  ct.lines = []; ct.promo = null;
  notify(`customer:${customerId}`, "اتأكدنا من طلبك", `طلب ${o.id} — ${o.split ? "هيوصل على مرتين عشان منأخركش" : `هيوصلك خلال ${o.etaRange[0]}–${o.etaRange[1]} دقيقة`}`, { orderId: o.id });
  S.fos.filter((f) => f.orderId === o.id && f.sourceType === "merchant").forEach((f) => notify(`merchant:${f.sourceId}`, "طلب جديد!", `طلب ${o.id} · ${f.lineKeys.length} أصناف · اقبله خلال ${Math.round((f.acceptBy - now()) / 1000)} ثانية`, { orderId: o.id, foId: f.id, alert: true }));
  audit(actor, o.id, "إنشاء طلب", null, `${money(o.totals.total)} · ${{ cod: "كاش", card: "بطاقة", wallet: "محفظة" }[pay]}`, null);
  return { ok: true, order: o };
};
A["order.cancel"] = ({ orderId, reason }, actor) => {
  const S = TW.S, o = find(S.orders, orderId);
  const started = S.fos.some((f) => f.orderId === orderId && !["QUEUED", "AWAITING_ACCEPT"].includes(f.status));
  if (actor.kind === "customer" && started) return fail("الطلب بدأ يتجهز — الإلغاء محتاج موافقة خدمة العملاء (BR-CAN-002)", { needSupport: true });
  if (actor.kind === "admin") { const d = need("orders.cancel", actor) || needReason(reason); if (d) return d; }
  cancelOrder(o, reason, actor);
};
function cancelOrder(o, reason, actor) {
  const S = TW.S;
  S.fos.filter((f) => f.orderId === o.id).forEach((f) => { if (!["DELIVERED", "HANDED_OVER"].includes(f.status)) f.status = "CANCELLED"; });
  S.tasks.filter((t) => t.orderId === o.id).forEach((t) => { if (t.riderId && !["DELIVERED"].includes(t.status)) { const r = find(S.riders, t.riderId); if (r.task === t.id) { r.task = null; r.status = "online"; } } t.status = "CANCELLED"; });
  o.lines.filter((l) => l.sourceType === "hub").forEach((l) => { const iv = S.inv.h1[l.skuId]; if (iv) iv.reserved = Math.max(0, iv.reserved - l.qty); });
  o.status = "CANCELLED"; o.final = true; o.hold = false;
  if (o.pay.method !== "cod" && o.fin !== "REFUNDED") { S.refunds.push({ id: `RF-${S.seq.refund++}`, orderId: o.id, lines: o.lines.map((l) => l.key), amount: o.totals.total, reason: "إلغاء الطلب", party: "twaa", method: o.pay.method === "wallet" ? "wallet" : "original", status: o.pay.method === "wallet" ? "COMPLETED" : "SUBMITTED", at: now(), by: actor.name }); if (o.pay.method === "wallet") find(S.customers, o.customerId).wallet += o.totals.total; o.fin = "REFUNDED"; }
  else o.fin = "VOID";
  ev(o, "CANCELLED", `تم الإلغاء — ${reason}`, actor.kind);
  notify(`customer:${o.customerId}`, "تم إلغاء الطلب", `${o.id} — ${reason}${o.pay.method !== "cod" ? " · المبلغ هيرجعلك" : ""}`, { orderId: o.id });
  audit(actor, o.id, "إلغاء طلب", o.status, "CANCELLED", reason);
}
A["order.subDecision"] = ({ orderId, key, choice, skuId }, actor) => {
  const o = find(TW.S.orders, orderId), l = o.lines.find((x) => x.key === key);
  if (!l || l.state !== "sub_pending") return fail("القرار ده اتاخد خلاص");
  applySub(o, l, choice, skuId, actor);
};
function applySub(o, l, choice, skuId, actor) {
  const S = TW.S;
  if (choice === "accept" || choice === "alt") {
    const s = find(S.skus, skuId || (l.sub && l.sub.skuId)); const newPrice = s.price;
    const diff = +(newPrice - l.unitPrice).toFixed(2);
    const tol = S.rules.subPriceTolerance / 100;
    /* BR-SUB-003/004: dearer within tolerance → Twaa absorbs; cheaper → reduce total */
    const absorb = diff > 0 && diff <= l.unitPrice * tol;
    l.sub = { skuId: s.id, name: s.ar, price: newPrice, diff, absorbed: absorb ? diff * l.qty : 0, from: { skuId: l.skuId, name: l.name, price: l.unitPrice } };
    l.state = "substituted"; l.picked = true;
    if (!absorb) { o.totals.items += diff * l.qty; o.totals.total += diff * l.qty; }
    const iv = S.inv.h1[s.id]; if (iv) iv.reserved += l.qty;
    ev(o, "SUBSTITUTED", `استبدال ${l.name} ← ${s.ar} (فرق ${diff > 0 ? "+" : ""}${num(diff, 2)} ج.م${absorb ? "، توّا تتحمله" : ""})`, actor.kind);
    if (o.pay.method === "cod") { const t = S.tasks.find((x) => x.id === o.tasks[0]); if (t) t.cod = o.totals.total; }
    if (diff < 0 && o.pay.method !== "cod") S.refunds.push({ id: `RF-${S.seq.refund++}`, orderId: o.id, lines: [l.key], amount: -diff * l.qty, reason: "فرق سعر بديل أرخص", party: "twaa", method: o.pay.method === "wallet" ? "wallet" : "original", status: "COMPLETED", at: now(), by: "النظام" });
  } else {
    l.state = "removed";
    o.totals.items -= l.unitPrice * l.qty; o.totals.total -= l.unitPrice * l.qty;
    if (o.pay.method === "cod") { const t = S.tasks.find((x) => x.id === o.tasks[0]); if (t) t.cod = o.totals.total; }
    else S.refunds.push({ id: `RF-${S.seq.refund++}`, orderId: o.id, lines: [l.key], amount: l.unitPrice * l.qty, reason: "صنف غير متاح — اتشال", party: "twaa", method: o.pay.method === "wallet" ? "wallet" : "original", status: o.pay.method === "wallet" ? "COMPLETED" : "SUBMITTED", at: now(), by: "النظام" });
    ev(o, "ITEM_REMOVED", `اتشال ${l.name} — المبلغ اتخصم من الإجمالي`, actor.kind);
  }
  notify(`customer:${o.customerId}`, "طلبك اتحدّث", l.state === "removed" ? `شيلنا ${l.name} والإجمالي بقى ${money(o.totals.total)}` : `بدّلنا ${l.sub.from.name} بـ ${l.sub.name}`, { orderId: o.id });
  /* resume picking */
  const f = find(S.fos, l.foId); if (f && f.sourceType === "hub" && !o.lines.some((x) => x.foId === f.id && x.state === "sub_pending")) f.blocked = false;
}
A["order.rate"] = ({ orderId, order, merchant, rider, tags = [], comment }, actor) => {
  const o = find(TW.S.orders, orderId); o.rating = { order, merchant, rider, tags, comment, at: now() };
  if (order <= 2) { const cs = openCase(o, tags[0] || "تقييم منخفض", "app", `تقييم ${order}/5 — ${tags.join("، ")} ${comment || ""}`, actor); ev(o, "LOW_RATING", "تقييم منخفض — اتفتحت حالة دعم تلقائياً (EX-SUP-001)"); return { ok: true, caseId: cs.id }; }
};
function openCase(o, type, channel, note, actor) {
  const S = TW.S;
  const rec = recommend(o, type);
  const cs = { id: `CS-${S.seq.case++}`, orderId: o.id, customerId: o.customerId, type, status: "OPEN", owner: null, channel, createdAt: now(), slaAt: now() + 4 * 3600000, priority: ["صنف ناقص", "صنف غلط", "صنف تالف", "فرق في الكاش"].includes(type) ? "high" : "medium", notes: note ? [{ at: now(), who: actor.name, text: note }] : [], recommendation: rec };
  S.cases.unshift(cs); o.caseIds = [...(o.caseIds || []), cs.id];
  return cs;
}
/* system recommendation from chain of custody (who scanned what, when) */
function recommend(o, type) {
  const S = TW.S;
  const fos = S.fos.filter((f) => f.orderId === o.id), tasks = S.tasks.filter((t) => t.orderId === o.id);
  let party = "twaa", why = [];
  if (["صنف ناقص", "صنف غلط"].includes(type)) {
    const packIssue = fos.find((f) => f.packCheck && f.packCheck.scanned < f.packCheck.expected);
    const merchFo = fos.find((f) => f.sourceType === "merchant");
    const pickupShort = tasks.some((t) => t.pickupIssue);
    if (packIssue) { party = "hub"; why.push(`محطة التغليف سجّلت ${packIssue.packCheck.scanned} من ${packIssue.packCheck.expected} بنود وتم تجاوز التحقق يدوياً`); }
    else if (pickupShort) { party = "rider"; why.push("المندوب سجّل استلام ناقص"); }
    else if (merchFo) { party = "merchant"; why.push("التاجر علّم كل البنود «موجود» واتسلّم الطرد مختوم"); }
    else { party = "hub"; why.push("لا يوجد سجل تحقق كامل للتغليف"); }
    tasks.forEach((t) => { if (t.pod) why.push(`إثبات التسليم: OTP ${t.pod.otp ? "صحيح" : "—"} · GPS ${t.pod.gps ? "داخل النطاق" : "خارج النطاق"}`); });
  }
  if (type === "صنف تالف") { party = fos.some((f) => f.sourceType === "hub") ? "hub" : "merchant"; why.push("التغليف هو آخر نقطة تحكم قبل الاستلام"); }
  if (type === "التوصيل اتأخر") { const late = fos.find((f) => f.readyAt && f.prepBy && f.readyAt > f.prepBy); party = late ? (late.sourceType === "hub" ? "hub" : "merchant") : "rider"; why.push(late ? "التجهيز تجاوز SLA" : "التأخير في مرحلة التوصيل"); }
  if (type === "فرق في الكاش") { party = "rider"; why.push("المحصّل لا يطابق المتوقع المسجّل على المهمة"); }
  const maxComp = type === "التوصيل اتأخر" ? 20 : ["صنف ناقص", "صنف غلط", "صنف تالف"].includes(type) ? 30 : 0;
  return { party, why, resolution: ["صنف ناقص", "صنف غلط", "صنف تالف"].includes(type) ? "استرداد قيمة الصنف في المحفظة" + (maxComp ? ` + تعويض حتى ${maxComp} ج.م` : "") : type === "التوصيل اتأخر" ? `كوبون حتى ${maxComp} ج.م` : "مراجعة", maxComp, approval: "حسب مبلغ الاسترداد (حدود التعويض)" };
}
TW.recommend = recommend;
A["support.report"] = ({ orderId, type, keys = [], note, photo }, actor) => {
  const o = find(TW.S.orders, orderId);
  const cs = openCase(o, type, actor.kind === "customer" ? "app" : "call", `${note || ""}${photo ? " · أرفق صورة" : ""}`.trim(), actor);
  cs.keys = keys;
  if (keys.length) { cs.claim = sum(o.lines.filter((l) => keys.includes(l.key)), (l) => (l.sub ? l.sub.price : l.unitPrice) * l.qty); }
  ev(o, "CASE_OPENED", `اتفتحت حالة دعم ${cs.id}: ${type}`, actor.kind);
  if (actor.kind !== "admin") notify(`customer:${o.customerId}`, "استلمنا مشكلتك", `حالة ${cs.id} — هنراجعها خلال دقايق`, { orderId: o.id });
  return { ok: true, caseId: cs.id };
};

/* ---------------- merchant ---------------- */
A["merchant.mode"] = ({ merchantId, mode, force }, actor) => {
  const m = find(TW.S.merchants, merchantId);
  const active = TW.S.fos.filter((f) => f.sourceId === merchantId && ["AWAITING_ACCEPT", "PREPARING", "READY"].includes(f.status));
  if (mode === "closed" && active.length && !force) return fail(`عندك ${active.length} طلبات شغالة — لازم تخلّصهم الأول أو تأكد القفل`, { activeCount: active.length });
  const old = m.mode; m.mode = mode;
  if (mode === "busy") m.busyExtra = 10; else m.busyExtra = 0;
  audit(actor, m.ar, "تغيير حالة المحل", old, mode, null);
};
A["fo.accept"] = ({ foId }, actor) => {
  const S = TW.S, f = find(S.fos, foId);
  if (f.status !== "AWAITING_ACCEPT") return fail("الطلب ده اتعامل معاه خلاص");
  const m = find(S.merchants, f.sourceId);
  f.status = "PREPARING"; f.acceptedAt = now(); f.prepBy = now() + (m.prep + (m.busyExtra || 0)) * MIN; f.acceptSec = Math.round((now() - f.createdAt) / 1000);
  const o = find(S.orders, f.orderId); ev(o, "ACCEPTED", `${m.ar} قبل الطلب`, actor.kind);
  notify(`customer:${o.customerId}`, "طلبك بيتجهز", `${m.type === "restaurant" ? "المطعم" : "المحل"} بدأ يجهّز طلبك`, { orderId: o.id });
};
A["fo.reject"] = ({ foId, reason }, actor) => {
  const S = TW.S, f = find(S.fos, foId); if (!reason) return fail("اختار سبب الرفض");
  f.status = "REJECTED"; f.rejectReason = reason; f.rejectedAt = now();
  const m = find(S.merchants, f.sourceId); m.acceptRate = Math.max(0.5, m.acceptRate - 0.01);
  const o = find(S.orders, f.orderId); ev(o, "MERCHANT_REJECTED", `${m.ar} رفض: ${reason} (EX-MER-002)`, actor.kind);
  audit(actor, f.id, "رفض طلب", "AWAITING_ACCEPT", "REJECTED", reason);
};
A["fo.mark"] = ({ foId, key, mark, subSkuId }) => { const f = find(TW.S.fos, foId); const it = f.items.find((x) => x.key === key); it.mark = mark; it.subSkuId = subSkuId || null; };
A["fo.ready"] = ({ foId }, actor) => {
  const S = TW.S, f = find(S.fos, foId), o = find(S.orders, f.orderId);
  if (f.status !== "PREPARING") return fail("الطلب مش في مرحلة التجهيز");
  const unmarked = f.items.filter((i) => !i.mark);
  if (o.lines.find((l) => l.kind === "sku" && l.foId === f.id) && unmarked.length) return fail("علّم كل الأصناف الأول (موجود / غير موجود / بديل)");
  f.items.forEach((i) => { const l = o.lines.find((x) => x.key === i.key); if (i.mark === "missing" && l.state === "ok") { l.state = "sub_pending"; l.subAsked = now(); l.sub = suggestSub(l); askSub(o, l, actor); } if (i.mark === "sub" && i.subSkuId) { l.sub = { skuId: i.subSkuId, name: find(S.skus, i.subSkuId).ar, price: (S.msku[f.sourceId][i.subSkuId] || {}).price || find(S.skus, i.subSkuId).price }; l.state = "sub_pending"; l.subAsked = now(); askSub(o, l, actor); } });
  f.status = "READY"; f.readyAt = now(); f.packages = [{ id: `${f.id}-P1`, code: f.pickupCode, handling: o.lines.filter((l) => l.foId === f.id)[0].handling }];
  ev(o, "READY", `${f.name}: جاهز للاستلام`, actor.kind);
};
A["fo.handover"] = ({ foId, code }, actor) => {
  const S = TW.S, f = find(S.fos, foId);
  if (code && String(code) !== String(f.pickupCode)) return fail("الكود مش مطابق — اطلب من المندوب يوريك كود الاستلام");
  const t = S.tasks.find((x) => x.foIds.includes(foId) && !["CANCELLED"].includes(x.status));
  if (!t || !t.riderId || !["AT_PICKUP", "ASSIGNED"].includes(t.status)) return fail("مفيش مندوب وصل للاستلام لسه");
  pickupScan(t, f.sourceId, { code: f.pickupCode, count: Math.max(1, f.packages.length) }, actor);
};
/* merchant catalogue: select from master catalogue, price, availability — never free-text product creation */
A["mcat.add"] = ({ merchantId, items }, actor) => {
  const S = TW.S, map = (S.msku[merchantId] = S.msku[merchantId] || {});
  const flagged = [];
  items.forEach(({ skuId, price, stock }) => { const s = find(S.skus, skuId); const p = Number(price) || s.refPrice; const out = Math.abs(p - s.refPrice) / s.refPrice > S.rules.priceTolerance / 100; map[skuId] = { price: out ? s.refPrice : p, available: !out, stock: stock === "" || stock == null ? null : Number(stock), prep: find(S.merchants, merchantId).prep, updatedAt: now(), pendingPrice: out ? p : null }; if (out) { flagged.push(s.ar); approval("price", { kind: "msku", merchantId, skuId }, actor, `سعر ${s.ar} ${money(p)} (المرجعي ${money(s.refPrice)})`, Math.abs(p - s.refPrice), "إضافة صنف جديد للمحل", `${p > s.refPrice ? "+" : ""}${Math.round(((p - s.refPrice) / s.refPrice) * 100)}% عن المرجعي`, "category"); } });
  audit(actor, find(S.merchants, merchantId).ar, "إضافة أصناف من الكتالوج", null, `${items.length} صنف`, null);
  return { ok: true, added: items.length, flagged };
};
A["mcat.update"] = ({ merchantId, skuId, price, available, stock }, actor) => {
  const S = TW.S, x = S.msku[merchantId][skuId], s = find(S.skus, skuId);
  if (available !== undefined) x.available = available;
  if (stock !== undefined) x.stock = stock === "" || stock == null ? null : Number(stock);
  if (price !== undefined && Number(price) !== x.price) {
    const p = Number(price), dev = (p - s.refPrice) / s.refPrice, jump = x.price ? (p - x.price) / x.price : 0;
    if (Math.abs(dev) > S.rules.priceTolerance / 100 || jump > 0.25) { x.pendingPrice = p; approval("price", { kind: "msku", merchantId, skuId }, actor, `${s.ar}: ${money(x.price)} ← ${money(p)}`, Math.abs(p - x.price), `المرجعي ${money(s.refPrice)}`, `${dev > 0 ? "+" : ""}${Math.round(dev * 100)}% عن المرجعي${jump > 0.25 ? " · زيادة مفاجئة" : ""}`, "category"); audit(actor, `${s.ar} @ ${find(S.merchants, merchantId).ar}`, "طلب تعديل سعر (مراجعة)", x.price, p, "خارج السماحية"); return { ok: true, review: true }; }
    audit(actor, `${s.ar} @ ${find(S.merchants, merchantId).ar}`, "تعديل سعر", x.price, p, null); x.price = p;
  }
  x.updatedAt = now();
};
A["mcat.bulk"] = ({ merchantId, op, skuIds }, actor) => { const map = TW.S.msku[merchantId]; (skuIds || Object.keys(map)).forEach((id) => { if (map[id]) map[id].available = op === "open"; }); audit(actor, find(TW.S.merchants, merchantId).ar, op === "open" ? "فتح كل الأصناف" : "إيقاف أصناف", null, `${(skuIds || Object.keys(map)).length} صنف`, null); };
A["menu.toggle"] = ({ merchantId, itemId }) => { const it = TW.S.menus[merchantId].find((x) => x.id === itemId); it.available = !it.available; };
A["mcat.request"] = ({ merchantId, name, barcode, catGuess, photo }, actor) => {
  if (!name) return fail("اكتب اسم المنتج");
  const r = { id: `CR-${TW.S.seq.req++}`, merchantId, name, barcode, catGuess, photo: !!photo, status: "PENDING", at: now() };
  TW.S.catReqs.unshift(r); approval("new_sku", { kind: "catreq", id: r.id }, actor, `طلب إضافة منتج: ${name}`, 0, `${barcode ? "باركود " + barcode : "بدون باركود"}${photo ? " · صورة مرفقة" : ""}`, "منع التكرار والتسمية العشوائية", "category");
  return { ok: true, id: r.id };
};
A["merchant.register"] = ({ name, type, zoneId, owner, phone, hours }, actor) => {
  const S = TW.S, id = `m${S.merchants.length + 1}`;
  const z = find(S.zones, zoneId);
  S.merchants.push({ id, ar: name, type, zoneId, owner, phone, commission: type === "restaurant" ? 0.17 : type === "pharmacy" ? 0.1 : 0.11, prep: 10, rating: 0, health: "new", status: "pending", mode: "closed", since: null, x: z.x + 6, y: z.y - 4, landmark: "", autopilot: true, acceptRate: 1, prepOnTime: 1, cancelAfterAccept: 0, availAcc: 1, subRate: 0, complaintRate: 0, gmv30: 0, orders30: 0, acceptSec: 0, hours });
  S.msku[id] = {};
  S.leads.unshift({ id: `L-${S.seq.lead++}`, ar: name, owner, type, zoneId, stage: 5, assortment: "—", opportunity: "تسجيل ذاتي من تطبيق التاجر", competitors: "—", commission: S.merchants[S.merchants.length - 1].commission, merchantId: id, history: [{ at: now(), stage: 5, by: "تسجيل ذاتي" }] });
  approval("merchant_activation", { kind: "merchant", id }, actor, `تفعيل تاجر جديد: ${name}`, 0, "مستندات مرفوعة من التطبيق", `${D.merchantTypes[type]} في ${z.ar}`, "merchops");
  return { ok: true, merchantId: id };
};
A["merchant.dispute"] = ({ merchantId, settlementId, lineId, note }, actor) => { const st = find(TW.S.msettle, settlementId); const l = st.lines.find((x) => x.id === lineId); l.status = "disputed"; l.dispute = { note, at: now() }; audit(actor, `${settlementId}/${lineId}`, "اعتراض على خصم", null, money(l.amount), note); };

/* ---------------- rider ---------------- */
A["rider.online"] = ({ riderId, online }, actor) => { const r = find(TW.S.riders, riderId); if (r.suspended) return fail("حسابك موقوف — كلّم مشرف العمليات"); if (!online && r.task) return fail("خلّص المهمة الحالية الأول"); r.status = online ? "online" : "offline"; audit(actor, r.ar, online ? "بدء وردية" : "إنهاء وردية", null, null, null); };
A["task.accept"] = ({ taskId, riderId }, actor) => {
  const S = TW.S, t = find(S.tasks, taskId), r = find(S.riders, riderId);
  if (!t.offer || t.offer.riderId !== riderId) return fail("العرض ده انتهى");
  t.offers.push({ riderId, at: t.offer.at, resp: "accept", rt: Math.round((now() - t.offer.at) / 1000) });
  t.offer = null; t.riderId = riderId; t.status = "ASSIGNED"; t.assignedAt = now(); t.leg = "pickup"; t.prog = 0; t.from = { x: r.x, y: r.y }; t.pickupBy = now() + 10 * MIN;
  r.status = "busy"; r.task = t.id;
  const o = find(S.orders, t.orderId); ev(o, "RIDER_ASSIGNED", `${r.ar} قبل المهمة (${D.vehicles[r.vehicle]})`, actor.kind);
  t.foIds.forEach((fid) => { const f = find(S.fos, fid); if (f.sourceType === "merchant") notify(`merchant:${f.sourceId}`, "المندوب جاي يستلم", `${r.ar} · ${D.vehicles[r.vehicle]} · كود ${f.pickupCode}`, { orderId: o.id, foId: f.id }); });
  notify(`customer:${o.customerId}`, "بندورلك على أقرب مندوب… لقيناه!", `${r.ar} في الطريق لاستلام طلبك`, { orderId: o.id });
};
A["task.reject"] = ({ taskId, riderId, reason }, actor) => { const t = find(TW.S.tasks, taskId); if (!t.offer || t.offer.riderId !== riderId) return fail("العرض ده انتهى"); t.offers.push({ riderId, at: t.offer.at, resp: "reject", rt: Math.round((now() - t.offer.at) / 1000), reason: reason || null }); t.offer = null; t.status = "WAITING"; const r = find(TW.S.riders, riderId); r.accept = Math.max(0.5, r.accept - 0.01); };
A["task.arrivePickup"] = ({ taskId }) => { const t = find(TW.S.tasks, taskId); if (t.status !== "ASSIGNED") return fail("مش في مرحلة الاستلام"); t.status = "AT_PICKUP"; t.prog = 1; t.atPickupAt = now(); };
A["task.scan"] = ({ taskId, sourceId, code, count, damaged }, actor) => { const t = find(TW.S.tasks, taskId); return pickupScan(t, sourceId, { code, count, damaged }, actor); };
function pickupScan(t, sourceId, { code, count, damaged }, actor) {
  const S = TW.S, p = t.pickups.find((x) => x.sourceId === sourceId && !x.scanned) || t.pickups.find((x) => x.sourceId === sourceId);
  if (!p) return fail("نقطة الاستلام دي مش في المهمة (BR-PKP-001)");
  const f = find(S.fos, p.foId);
  if (!["PACKED", "READY"].includes(f.status)) return fail(`${f.name} لسه مش جاهز`);
  if (String(code) !== String(f.pickupCode)) return fail("الكود مش مطابق للطرد (BR-PKP-001)");
  const expected = Math.max(1, f.packages.length || 1);
  if (count != null && Number(count) < expected) { t.pickupIssue = { type: "طرد ناقص", at: now(), expected, got: Number(count) }; const o = find(S.orders, t.orderId); ev(o, "PICKUP_BLOCKED", `طرد ناقص عند الاستلام (${count}/${expected}) — المغادرة ممنوعة (EX-PKP-001)`, actor.kind); return fail(`عدد الطرود ناقص (${count} من ${expected}) — مينفعش تمشي قبل ما المشكلة تتحل`, { blocked: true }); }
  if (damaged) { t.pickupIssue = { type: "طرد تالف", at: now() }; const o = find(S.orders, t.orderId); ev(o, "PICKUP_DAMAGED", "طرد تالف عند الاستلام — رجع لإعادة التغليف (EX-PKP-002)", actor.kind); f.status = f.sourceType === "hub" ? "PICKING" : "PREPARING"; f.repack = true; return fail("الطرد رجع لإعادة التغليف — استنى لحد ما يجهز تاني", { blocked: true }); }
  p.scanned = true; p.at = now(); p.packages = expected; f.status = "HANDED_OVER"; f.handedAt = now();
  /* chain of custody */
  const o = find(S.orders, t.orderId); ev(o, "CUSTODY", `حيازة: ${f.name} ← ${find(S.riders, t.riderId).ar} · ${expected} طرد · ${TW.clock(now())}`, actor.kind);
  if (t.pickups.every((x) => x.scanned)) { t.status = "PICKED_UP"; t.pickedAt = now(); t.leg = "drop"; t.prog = 0; const r = find(S.riders, t.riderId); t.from = { x: r.x, y: r.y }; notify(`customer:${o.customerId}`, "طلبك خرج", `المندوب في الطريق — كود الاستلام ${o.otp}`, { orderId: o.id }); }
  else { t.status = "ASSIGNED"; t.prog = 0; const r = find(S.riders, t.riderId); t.from = { x: r.x, y: r.y }; }
  return { ok: true };
}
A["task.pickupIssue"] = ({ taskId, sourceId, type }, actor) => { const t = find(TW.S.tasks, taskId); t.pickupIssue = { type, at: now(), sourceId }; const o = find(TW.S.orders, t.orderId); ev(o, "PICKUP_ISSUE", `مشكلة عند الاستلام: ${type}`, actor.kind); };
A["task.arrive"] = ({ taskId }, actor) => { const t = find(TW.S.tasks, taskId); if (t.status !== "PICKED_UP") return fail("لسه مستلمتش الطلب"); t.status = "ARRIVED"; t.arrivedAt = now(); t.prog = 1; const o = find(TW.S.orders, t.orderId); ev(o, "ARRIVED", "المندوب وصل للعنوان", actor.kind); notify(`customer:${o.customerId}`, "المندوب وصل!", `جهّز كود الاستلام ${o.otp}${t.cod ? ` و${money(t.cod)} كاش` : ""}`, { orderId: o.id }); };
A["task.contact"] = ({ taskId, kind, reached }, actor) => {
  const S = TW.S, t = find(S.tasks, taskId); t.contact.push({ at: now(), kind, ok: !!reached });
  if (!reached && !t.unreachable) t.unreachable = { since: now(), waitUntil: now() + S.rules.unreachableWaitSec * 1000 };
  if (reached) t.unreachable = null;
  const o = find(S.orders, t.orderId); ev(o, "CONTACT", `${kind === "call" ? "اتصال" : "واتساب"} بالعميل — ${reached ? "رد" : "لم يرد"}`, actor.kind);
};
A["task.collect"] = ({ taskId, amount, reason }, actor) => {
  const S = TW.S, t = find(S.tasks, taskId);
  const amt = Number(amount);
  if (isNaN(amt)) return fail("اكتب المبلغ اللي استلمته");
  if (Math.abs(amt - t.cod) > 0.01 && !reason) return fail("المبلغ مختلف عن المطلوب — لازم تختار سبب الفرق (BR-COD-005)", { variance: amt - t.cod });
  t.collected = amt; t.varReason = reason || null;
};
A["task.deliver"] = ({ taskId, otp }, actor) => {
  const S = TW.S, t = find(S.tasks, taskId), o = find(S.orders, t.orderId), r = find(S.riders, t.riderId);
  if (t.status !== "ARRIVED") return fail("سجّل الوصول الأول");
  if (String(otp) !== String(o.otp)) return fail("كود الاستلام غلط — اطلبه من العميل (EX-DLV-004)");
  if (t.cod > 0 && t.collected == null) return fail("لازم تسجّل الكاش اللي استلمته قبل التسليم (BR-COD-004)");
  t.status = "DELIVERED"; t.deliveredAt = now(); t.pod = { otp: true, at: now(), gps: true };
  t.foIds.forEach((fid) => (find(S.fos, fid).status = "DELIVERED"));
  r.task = null; r.status = "online"; r.jobsToday++; r.earnToday += t.earn;
  const rs = S.rsettle.find((x) => x.riderId === r.id); if (rs) { rs.missions++; rs.fees += t.earn; }
  if (t.cod > 0) {
    const c = { id: uid("COD"), orderId: o.id, taskId: t.id, riderId: r.id, expected: t.cod, collected: t.collected, variance: +(t.collected - t.cod).toFixed(2), at: now(), status: "HELD", varReason: t.varReason };
    S.cod.push(c); r.cash += t.collected; o.fin = c.variance ? "RECON_REQUIRED" : "COD_COLLECTED";
    const p = S.payments.find((x) => x.orderId === o.id); if (p) p.status = "COD_COLLECTED";
    if (c.variance) { audit(actor, o.id, "فرق كاش", money(t.cod), money(t.collected), t.varReason); }
    if (r.cash >= r.limit) { notify(`rider:${r.id}`, "وصلت لحد الكاش", `معاك ${money(r.cash)} من حد ${money(r.limit)} — مهام الكاش اتوقفت لحد ما تورّد`, { alert: true }); ev(o, "RIDER_CASH_LIMIT", `${r.ar} وصل لحد الكاش — اتوقفت عنه مهام الكاش (BR-RID-002)`); }
  } else if (o.pay.method !== "cod") o.fin = "SETTLEMENT_PENDING";
  ev(o, "DELIVERED", `تم التسليم — OTP صحيح · GPS داخل النطاق`, actor.kind);
  const allDone = S.tasks.filter((x) => x.orderId === o.id && x.status !== "CANCELLED").every((x) => x.status === "DELIVERED");
  notify(`customer:${o.customerId}`, allDone ? "وصلك! بالهنا والشفا" : "جزء من طلبك وصل", allDone ? "قيّم طلبك وقولنا رأيك" : "الجزء التاني في الطريق", { orderId: o.id, rate: allDone });
};
A["task.fail"] = ({ taskId, reason }, actor) => {
  const S = TW.S, t = find(S.tasks, taskId), o = find(S.orders, t.orderId);
  if (!reason) return fail("اختار سبب فشل التسليم");
  if (reason === "العميل مش بيرد") { const calls = t.contact.filter((c) => c.kind === "call" && !c.ok).length; const waited = t.unreachable && now() >= t.unreachable.waitUntil; if (calls < 2 || !t.contact.some((c) => c.kind === "whatsapp")) return fail("لازم تتصل مرتين وتبعت واتساب الأول (BR-ARR-001)"); if (!waited) return fail(`استنى لحد ما مهلة الانتظار تخلص (${TW.dur(t.unreachable.waitUntil - now())})`); }
  t.status = "FAILED"; t.failReason = reason; t.failedAt = now();
  ev(o, "DELIVERY_FAILED", `فشل التسليم: ${reason} — بانتظار قرار الدعم (إعادة محاولة / إرجاع)`, actor.kind);
  const cs = openCase(o, "فشل التسليم", "rider", `المندوب سجّل: ${reason} · ${t.contact.length} محاولات تواصل`, actor); cs.priority = "high"; cs.taskId = t.id;
  notify(`customer:${o.customerId}`, "مقدرناش نوصلك", "المندوب حاول يكلمك — هنكلمك نرتب ميعاد تاني", { orderId: o.id });
};
A["failed.decide"] = ({ taskId, decision, reason }, actor) => {
  const S = TW.S, t = find(S.tasks, taskId), o = find(S.orders, t.orderId), r = find(S.riders, t.riderId);
  const d = needReason(reason); if (d) return d;
  const c = find(S.customers, o.customerId);
  if (decision === "retry") { if (o.lines.some((l) => l.handling === "hot")) return fail("مينفعش إعادة محاولة لأكل سخن (BR-FAIL-002)"); t.status = "PICKED_UP"; t.leg = "drop"; t.prog = 0.6; t.contact = []; t.unreachable = null; t.failReason = null; ev(o, "RETRY", `إعادة محاولة التسليم — ${reason}`, actor.kind); }
  else { t.status = "RTO"; t.leg = "return"; t.prog = 0; t.from = { x: r.x, y: r.y }; c.codFails += o.pay.method === "cod" ? 1 : 0; ev(o, "RTO", `إرجاع للمصدر — ${reason} (P22)`, actor.kind); S.returns.unshift({ id: `RT-${S.returns.length + 32}`, orderId: o.id, source: t.pickups[0].sourceId, lines: o.lines.map((l) => [l.skuId || l.menuItemId, l.qty]), reason: t.failReason, status: "IN_TRANSIT", at: now(), hot: o.lines.some((l) => l.handling === "hot") }); o.fin = o.pay.method === "cod" ? "VOID" : o.fin; }
  (o.caseIds || []).forEach((id) => { const cs = find(S.cases, id); if (cs && cs.taskId === t.id) { cs.status = "RESOLVED"; cs.resolution = decision === "retry" ? "إعادة محاولة" : "إرجاع للمصدر"; cs.resolvedAt = now(); cs.owner = cs.owner || actor.name; } });
  audit(actor, t.id, "قرار فشل التسليم", "FAILED", decision === "retry" ? "إعادة محاولة" : "RTO", reason);
};
A["rider.deposit"] = ({ riderId, amount, at = "الهب" }, actor) => {
  const S = TW.S, r = find(S.riders, riderId); const amt = Number(amount || r.cash);
  if (amt <= 0) return fail("مفيش كاش للتوريد");
  const dep = { id: `DEP-${S.seq.dep++}`, riderId, amount: amt, at: now(), place: at, status: "PENDING_VERIFY", receiver: "أمين خزينة الهب" };
  S.deposits.unshift(dep);
  S.cod.filter((c) => c.riderId === riderId && c.status === "HELD").forEach((c) => { c.status = "DEPOSITED"; c.depositId = dep.id; const o = find(S.orders, c.orderId); if (o && o.fin !== "RECON_REQUIRED") o.fin = "SETTLEMENT_PENDING"; });
  r.cash = Math.max(0, r.cash - amt);
  audit(actor, r.ar, "توريد كاش", null, money(amt), at);
  notify(`rider:${riderId}`, "اتسجل التوريد", `${money(amt)} — بانتظار تأكيد المالية`, {});
  return { ok: true, depositId: dep.id };
};

/* ---------------- hub / picker / inventory ---------------- */
A["hub.start"] = ({ foId }, actor) => { const f = find(TW.S.fos, foId); if (f.status !== "QUEUED") return; f.status = "PICKING"; f.pickStart = now(); f.picker = actor.name; };
A["hub.pick"] = ({ foId, key, result, code }, actor) => {
  const S = TW.S, f = find(S.fos, foId), o = find(S.orders, f.orderId), l = o.lines.find((x) => x.key === key);
  if (result === "picked") { const s = find(S.skus, l.skuId); if (code && code !== s.barcode) return fail("الباركود مش مطابق (BR-PCK-001)"); if (S.inv.h1[l.skuId] && S.inv.h1[l.skuId].shelfEmpty) return fail("النظام بيقول الصنف ده رفّه فاضي — سجّل «الرف فاضي»"); l.picked = true; return; }
  if (result === "empty" || result === "damaged") {
    const iv = S.inv.h1[l.skuId];
    if (result === "empty") { const before = iv.onHand; S.moves.unshift({ id: `MV-${S.seq.mv++}`, at: now(), skuId: l.skuId, type: "تصحيح (رف فاضي)", qty: -before, before, after: 0, reason: "EX-INV-001 — الرف فاضي والنظام يقول متاح", user: actor.name, evidence: "إعادة عد المجمّع" }); iv.onHand = 0; iv.reserved = Math.max(0, iv.reserved - l.qty); iv.shelfEmpty = false; audit(actor, `${l.skuId} (مخزون)`, "تسوية مخزون تلقائية", before, 0, "الرف فاضي عند التجميع (EX-INV-001)"); }
    else { iv.damaged += 1; iv.onHand = Math.max(0, iv.onHand - 1); S.moves.unshift({ id: `MV-${S.seq.mv++}`, at: now(), skuId: l.skuId, type: "تالف", qty: -1, before: iv.onHand + 1, after: iv.onHand, reason: "EX-INV-002 — تالف عند التجميع", user: actor.name, evidence: "صورة" }); }
    if (iv.onHand - iv.reserved >= l.qty && result === "damaged") { l.picked = true; return { ok: true, replaced: true }; }
    l.state = "sub_pending"; l.subAsked = now(); l.sub = suggestSub(l); f.blocked = true; l.issue = null; f.exception = null;
    askSub(o, l, actor);
    return { ok: true, sub: l.sub };
  }
};
function suggestSub(l) {
  const S = TW.S, s = find(S.skus, l.skuId); if (!s || !s.subGroup) return null;
  const alt = S.skus.filter((x) => x.subGroup === s.subGroup && x.id !== s.id && (l.sourceType === "hub" ? hubAvail(x.id) > 0 : merchantAvail(l.sourceId, x.id) > 0)).sort((a, b) => Math.abs(a.price - s.price) - Math.abs(b.price - s.price))[0];
  return alt ? { skuId: alt.id, name: alt.ar, price: l.sourceType === "hub" ? alt.price : (S.msku[l.sourceId][alt.id] || {}).price || alt.price } : null;
}
function askSub(o, l, actor) {
  const S = TW.S, pref = o.subPref;
  ev(o, "SUB_NEEDED", `${l.name} غير متاح — ${l.sub ? `البديل المقترح: ${l.sub.name}` : "لا يوجد بديل معتمد"}`, actor.kind);
  if (pref === "remove" || !l.sub) return applySub(o, l, "remove", null, TW.actor.system());
  const diffPct = (l.sub.price - l.unitPrice) / l.unitPrice;
  if (pref === "auto" && diffPct <= S.rules.subPriceTolerance / 100) return applySub(o, l, "accept", l.sub.skuId, TW.actor.system());
  notify(`customer:${o.customerId}`, "منتج مش موجود — محتاجين رأيك", `${l.name} خلص. نبدّله بـ ${l.sub.name} (${money(l.sub.price)})؟`, { orderId: o.id, sub: l.key, alert: true });
}
A["hub.pack"] = ({ foId, count }, actor) => {
  const S = TW.S, f = find(S.fos, foId), o = find(S.orders, f.orderId);
  const ls = o.lines.filter((l) => l.foId === f.id && l.state !== "removed");
  if (ls.some((l) => l.state === "sub_pending")) return fail("فيه صنف بانتظار قرار العميل على البديل");
  if (ls.some((l) => !l.picked)) return fail("لسه فيه أصناف متجمعتش (EX-PCK-001)");
  const needSplit = ls.some((l) => l.handling === "frozen" || l.handling === "chilled") && ls.some((l) => l.handling === "separate");
  f.packages = [{ id: `${f.id}-P1`, code: f.pickupCode, handling: "normal" }];
  if (ls.some((l) => ["chilled", "frozen"].includes(l.handling))) f.packages.push({ id: `${f.id}-P2`, code: f.pickupCode, handling: "chilled" });
  if (needSplit) f.packages.push({ id: `${f.id}-P3`, code: f.pickupCode, handling: "separate" });
  f.packCheck = { expected: ls.length, scanned: ls.length, at: now() };
  f.status = "PACKED"; f.readyAt = now();
  ls.forEach((l) => { const iv = S.inv.h1[l.sub ? l.sub.skuId : l.skuId]; if (iv) { iv.onHand = Math.max(0, iv.onHand - l.qty); iv.reserved = Math.max(0, iv.reserved - l.qty); } });
  ev(o, "PACKED", `الهب: اتغلّف في ${f.packages.length} طرد${needSplit ? " (المنظفات منفصلة عن الأكل)" : ""}`, actor.kind);
};
A["inv.adjust"] = ({ skuId, field = "onHand", value, reason, evidence }, actor) => {
  const d = need("inventory.adjust", actor) || needReason(reason); if (d) return d;
  const S = TW.S, iv = S.inv.h1[skuId]; const before = iv[field]; iv[field] = Number(value);
  S.moves.unshift({ id: `MV-${S.seq.mv++}`, at: now(), skuId, type: `تسوية ${field}`, qty: Number(value) - before, before, after: Number(value), reason, user: actor.name, evidence: evidence || "—" });
  audit(actor, `${find(S.skus, skuId).ar} (مخزون)`, `تسوية ${field}`, before, value, reason);
  if (field === "onHand" && Number(value) < before && (before - Number(value)) * iv.cost > 300) approval("writeoff", { kind: "inventory", skuId }, actor, `شطب ${before - Number(value)} وحدة من ${find(S.skus, skuId).ar}`, Math.round((before - Number(value)) * iv.cost), evidence || "—", "خسارة هالك", "ops");
};
A["po.create"] = ({ lines, supplier }, actor) => { const S = TW.S; const po = { id: `PO-${S.seq.po++}`, supplier: supplier || "مورد معتمد", status: "PENDING_APPROVAL", lines, createdAt: now(), eta: now() + 20 * 3600000 }; S.pos.unshift(po); approval("po", { kind: "po", id: po.id }, actor, `أمر شراء ${po.id} — ${lines.length} أصناف`, Math.round(sum(lines, (l) => l[1] * l[2])), "توصية الشراء من الطلب الفعلي", "يربط كاش في المخزون", "finance"); return { ok: true, id: po.id }; };
A["po.receive"] = ({ poId, received }, actor) => {
  const S = TW.S, po = find(S.pos, poId); if (po.status !== "RECEIVING" && po.status !== "APPROVED") return fail("أمر الشراء مش جاهز للاستلام");
  po.receivedLines = po.lines.map(([id, q], i) => [id, Number(received[i])]);
  const short = po.receivedLines.filter(([id, q], i) => q < po.lines[i][1]);
  po.receivedLines.forEach(([id, q]) => { const iv = S.inv.h1[id]; const before = iv.onHand; iv.onHand += q; iv.incoming = Math.max(0, iv.incoming - q); S.moves.unshift({ id: `MV-${S.seq.mv++}`, at: now(), skuId: id, type: "استلام", qty: q, before, after: iv.onHand, reason: po.id, user: actor.name, evidence: "باركود + فاتورة المورد" }); });
  po.status = "RECEIVED"; po.discrepancy = short.length ? `عجز في ${short.length} صنف — مطالبة للمورد` : null;
  audit(actor, po.id, "استلام أمر شراء", null, po.discrepancy || "مطابق", null);
};
A["return.inspect"] = ({ returnId, outcome, reason }, actor) => {
  const S = TW.S, rt = find(S.returns, returnId); const d = needReason(reason); if (d) return d;
  rt.status = outcome === "restock" ? "RESTOCKED" : outcome === "quarantine" ? "QUARANTINED" : "WASTE"; rt.inspectedBy = actor.name; rt.inspectedAt = now(); rt.outcome = reason;
  rt.lines.forEach(([id, q]) => { const iv = S.inv.h1[id]; if (!iv) return; if (outcome === "restock") iv.onHand += q; else if (outcome === "quarantine") iv.quarantine += q; else iv.damaged += q; });
  audit(actor, rt.id, "فحص مرتجع", "INSPECTION", rt.status, reason);
};

/* ---------------- dispatch / control tower ---------------- */
A["dispatch.assign"] = ({ taskId, riderId, reason }, actor) => {
  const d = need("dispatch.assign", actor) || needReason(reason); if (d) return d;
  const S = TW.S, t = find(S.tasks, taskId), r = find(S.riders, riderId);
  const el = riderEligibility(r, t); if (!el.ok && !el.soft) return fail(`المندوب غير مؤهل: ${el.why}`);
  if (t.riderId && t.riderId !== riderId) { const old = find(S.riders, t.riderId); if (old.task === t.id) { old.task = null; old.status = "online"; } }
  const prev = t.riderId ? find(S.riders, t.riderId).ar : "—";
  t.offer = null; t.riderId = riderId; t.status = "ASSIGNED"; t.assignedAt = now(); t.leg = "pickup"; t.prog = 0; t.from = { x: r.x, y: r.y }; t.manual = { by: actor.name, reason, at: now() };
  r.status = "busy"; r.task = t.id;
  const o = find(S.orders, t.orderId); ev(o, "MANUAL_ASSIGN", `إسناد يدوي لـ ${r.ar} — ${reason}`, "admin");
  notify(`rider:${riderId}`, "مهمة جديدة اتسندت ليك", `${o.id} — ${t.pickups.map((p) => p.name).join(" + ")}`, { taskId, alert: true });
  audit(actor, t.id, "إسناد يدوي", prev, r.ar, reason);
};
A["dispatch.reoffer"] = ({ taskId }, actor) => { const t = find(TW.S.tasks, taskId); t.status = "WAITING"; t.attempts = 0; t.offer = null; audit(actor, t.id, "إعادة عرض على المناديب", "NO_RIDER", "WAITING", "تدخل الكنترول"); };
A["route.depart"] = ({ zoneId, riderId, reason }, actor) => {
  const S = TW.S, r = find(S.riders, riderId);
  const ts = S.tasks.filter((t) => t.status === "SCHEDULED" && t.drop.zoneId === zoneId);
  if (!ts.length) return fail("مفيش طلبات على الرحلة دي");
  if (!ts.every((t) => t.foIds.every((fid) => ["PACKED", "READY"].includes(find(S.fos, fid).status)))) return fail("فيه طلبات لسه مش جاهزة على الرحلة");
  ts.forEach((t, i) => { t.riderId = riderId; t.status = i === 0 ? "ASSIGNED" : "ASSIGNED"; t.route = { zoneId, seq: i + 1, of: ts.length }; t.assignedAt = now(); t.leg = "pickup"; t.prog = 0; t.from = { x: r.x, y: r.y }; ev(find(S.orders, t.orderId), "ROUTE", `اتحمّل على رحلة ${find(S.zones, zoneId).ar} (${i + 1}/${ts.length}) مع ${r.ar}`, "admin"); });
  r.status = "busy"; r.task = ts[0].id; r.route = ts.map((t) => t.id);
  audit(actor, `رحلة ${find(S.zones, zoneId).ar}`, "تحرك رحلة مجدولة", null, `${ts.length} طلبات · ${r.ar}`, reason || "موعد الرحلة");
};
A["fo.callMerchant"] = ({ foId }, actor) => { const f = find(TW.S.fos, foId); f.calls = (f.calls || 0) + 1; const o = find(TW.S.orders, f.orderId); ev(o, "CALL_MERCHANT", `اتصال من الكنترول بـ ${f.name} (محاولة ${f.calls})`, "admin"); audit(actor, f.id, "اتصال بالتاجر", null, `محاولة ${f.calls}`, "تأخر القبول"); };
A["fo.reroute"] = ({ foId, toMerchantId, reason }, actor) => {
  const d = needReason(reason); if (d) return d;
  const S = TW.S, f = find(S.fos, foId), o = find(S.orders, f.orderId), m2 = find(S.merchants, toMerchantId);
  const ls = o.lines.filter((l) => l.foId === f.id);
  const missing = ls.filter((l) => l.kind === "sku" && !(S.msku[toMerchantId] || {})[l.skuId]);
  if (missing.length) return fail(`${m2.ar} مش بيبيع: ${missing.map((l) => l.name).join("، ")}`);
  f.status = "REROUTED"; f.resolved = true;
  const nf = { ...JSON.parse(JSON.stringify(f)), id: `${f.id}R`, sourceId: m2.id, name: m2.ar, status: m2.autopilot ? "AWAITING_ACCEPT" : "AWAITING_ACCEPT", createdAt: now(), acceptBy: now() + S.rules.merchantAcceptSec * 1000, x: m2.x, y: m2.y, rerouteOf: f.id, resolved: false, calls: 0, pickupCode: String(1000 + Math.floor(Math.random() * 9000)) };
  S.fos.push(nf); o.fos.push(nf.id);
  let delta = 0; ls.forEach((l) => { const np = S.msku[m2.id][l.skuId].price; delta += (np - l.unitPrice) * l.qty; l.foId = nf.id; l.sourceId = m2.id; l.unitPrice = np; });
  if (Math.abs(delta) > 0.01) { o.totals.items += delta; o.totals.total += delta; }
  S.tasks.filter((t) => t.orderId === o.id).forEach((t) => { t.foIds = t.foIds.map((x) => (x === f.id ? nf.id : x)); t.pickups.forEach((p) => { if (p.foId === f.id) Object.assign(p, { foId: nf.id, sourceId: m2.id, name: m2.ar, x: m2.x, y: m2.y, code: nf.pickupCode }); }); if (t.cod) t.cod = o.totals.total; });
  ev(o, "REROUTED", `تحويل من ${f.name} إلى ${m2.ar} — ${reason}${delta ? ` (فرق ${num(delta, 2)} ج.م)` : ""}`, "admin");
  notify(`merchant:${m2.id}`, "طلب جديد!", `طلب ${o.id} محوّل ليك`, { orderId: o.id, foId: nf.id, alert: true });
  notify(`customer:${o.customerId}`, "طلبك اتحوّل لمحل تاني", `عشان منأخركش — ${m2.ar}${delta ? ` · الإجمالي ${money(o.totals.total)}` : ""}`, { orderId: o.id });
  const m1 = find(S.merchants, f.sourceId); m1.acceptRate = Math.max(0.5, m1.acceptRate - 0.02);
  audit(actor, f.id, "إعادة توجيه مكوّن", f.name, m2.ar, reason);
};
A["fo.cancel"] = ({ foId, reason }, actor) => {
  const d = needReason(reason); if (d) return d;
  const S = TW.S, f = find(S.fos, foId), o = find(S.orders, f.orderId);
  f.status = "CANCELLED"; f.resolved = true;
  const ls = o.lines.filter((l) => l.foId === f.id); const amt = sum(ls, (l) => l.unitPrice * l.qty);
  ls.forEach((l) => (l.state = "removed"));
  o.totals.items -= amt; o.totals.total -= amt;
  const remaining = S.fos.filter((x) => x.orderId === o.id && !["CANCELLED", "REROUTED"].includes(x.status));
  if (!remaining.length) { cancelOrder(o, reason, actor); return; }
  S.tasks.filter((t) => t.orderId === o.id).forEach((t) => { t.foIds = t.foIds.filter((x) => x !== f.id); t.pickups = t.pickups.filter((p) => p.foId !== f.id); if (!t.pickups.length) t.status = "CANCELLED"; if (t.cod) t.cod = o.totals.total; });
  if (o.pay.method !== "cod") S.refunds.push({ id: `RF-${S.seq.refund++}`, orderId: o.id, lines: ls.map((l) => l.key), amount: amt, reason, party: "merchant", method: o.pay.method === "wallet" ? "wallet" : "original", status: "SUBMITTED", at: now(), by: actor.name });
  ev(o, "COMPONENT_CANCELLED", `إلغاء مكوّن ${f.name} — ${reason}`, "admin");
  notify(`customer:${o.customerId}`, "جزء من طلبك اتلغى", `${f.name}: ${reason} · الإجمالي بقى ${money(o.totals.total)}`, { orderId: o.id });
  audit(actor, f.id, "إلغاء مكوّن", f.status, "CANCELLED", reason);
};
A["payment.reconcile"] = ({ paymentId, result }, actor) => {
  { const d = need("finance.close", actor); if (d) return d; }
  const S = TW.S, p = find(S.payments, paymentId), o = find(S.orders, p.orderId);
  if (result === "success") { p.status = "SUCCESS"; p.reconciled = true; p.gwState = "CAPTURED"; o.hold = false; o.fin = "PAID"; S.fos.filter((f) => f.orderId === o.id).forEach((f) => { if (f.status === "QUEUED" && f.sourceType === "merchant") f.status = "AWAITING_ACCEPT"; f.createdAt = now(); if (f.sourceType === "merchant") f.acceptBy = now() + S.rules.merchantAcceptSec * 1000; }); ev(o, "PAY_CONFIRMED", "البوابة أكدت الخصم — الطلب اتحرر للتجهيز", "admin"); notify(`customer:${o.customerId}`, "تم تأكيد الدفع", `طلب ${o.id} بيتجهز دلوقتي`, { orderId: o.id }); }
  else { p.status = "FAILED"; p.reconciled = true; o.hold = false; cancelOrder(o, "الدفع لم يكتمل — لم يتم خصم أي مبلغ", actor); o.fin = "VOID"; }
  audit(actor, p.id, "مطابقة دفع معلّق", "PENDING", p.status, result === "success" ? "تأكيد من البوابة" : "البوابة: لم يتم الخصم");
};
A["cod.resolve"] = ({ codId, party, reason }, actor) => {
  const d = need("finance.close", actor) || needReason(reason); if (d) return d;
  const S = TW.S, c = find(S.cod, codId), o = find(S.orders, c.orderId);
  c.varianceResolved = { party, reason, by: actor.name, at: now() }; if (o) o.fin = c.status === "HELD" ? "COD_COLLECTED" : c.status === "RECONCILED" ? "RECONCILED" : "SETTLEMENT_PENDING";
  if (party === "rider") { const rs = S.rsettle.find((x) => x.riderId === c.riderId); if (rs) rs.codVariance = (rs.codVariance || 0) + c.variance; }
  (S.cases.filter((x) => x.orderId === c.orderId && x.type === "فرق في الكاش")).forEach((cs) => { cs.status = "RESOLVED"; cs.resolution = `فرق الكاش على ${TW.PARTY[party]}`; cs.resolvedAt = now(); });
  audit(actor, `${c.orderId} (كاش)`, "تسوية فرق كاش", money(c.variance), TW.PARTY[party], reason);
};
A["deposit.verify"] = ({ depositId }, actor) => { { const d = need("finance.close", actor); if (d) return d; } const S = TW.S, dp = find(S.deposits, depositId); dp.status = "VERIFIED"; dp.verifiedBy = actor.name; dp.verifiedAt = now(); S.cod.filter((c) => c.depositId === depositId).forEach((c) => { c.status = "RECONCILED"; const o = find(S.orders, c.orderId); if (o && o.fin === "SETTLEMENT_PENDING") o.fin = "RECONCILED"; }); audit(actor, dp.id, "تأكيد استلام كاش", "PENDING_VERIFY", "VERIFIED", null); notify(`rider:${dp.riderId}`, "المالية أكدت التوريد", `${money(dp.amount)} اتطابقت`, {}); };

/* ---------------- support, refunds, compensation ---------------- */
A["case.assign"] = ({ caseId }, actor) => { const cs = find(TW.S.cases, caseId); cs.owner = actor.name; if (cs.status === "OPEN") cs.status = "INVESTIGATING"; };
A["case.note"] = ({ caseId, text }, actor) => { const cs = find(TW.S.cases, caseId); cs.notes.push({ at: now(), who: actor.name, text }); };
A["refund.create"] = ({ orderId, caseId, keys = [], amount, comp = 0, reason, party, evidence, method = "wallet" }, actor) => {
  const S = TW.S; const d = need("refund.create", actor); if (d) return d;
  if (!reason || !party || (!keys.length && !amount)) return fail("الاسترداد محتاج: طلب + بند + سبب + طرف مسؤول (Guardrail H)");
  const o = find(S.orders, orderId);
  const itemAmt = keys.length ? sum(o.lines.filter((l) => keys.includes(l.key)), (l) => (l.sub ? l.sub.price : l.unitPrice) * l.qty) : Number(amount);
  const total = itemAmt + Number(comp || 0);
  const already = sum(S.refunds.filter((r) => r.orderId === orderId && !["REJECTED", "FAILED"].includes(r.status)), (r) => r.amount);
  if (already + itemAmt > o.totals.total + 0.01) return fail(`إجمالي الاسترداد يتجاوز قيمة الطلب (${money(o.totals.total)})`);
  const rf = { id: `RF-${S.seq.refund++}`, orderId, caseId, lines: keys, amount: total, items: itemAmt, comp: Number(comp || 0), reason, party, evidence: evidence || "—", method, status: "REQUESTED", at: now(), by: actor.name };
  S.refunds.unshift(rf);
  const tier = total <= S.rules.compAgent ? "support" : total <= S.rules.compSupervisor ? "supsup" : "finance";
  const canSelf = tier === "support" || (tier === "supsup" && TW.can("refund.approve.medium", actor.id)) || (tier === "finance" && TW.can("refund.approve.large", actor.id));
  if (canSelf) { completeRefund(rf, actor); }
  else { rf.status = "PENDING_APPROVAL"; const ap = approval("refund", { kind: "refund", id: rf.id, orderId }, actor, `استرداد ${money(total)} — ${reason} (${orderId})`, total, evidence || "—", `يتحمّله ${TW.PARTY[party]}`, tier); rf.approvalId = ap.id; if (caseId) find(S.cases, caseId).status = "PENDING_APPROVAL"; }
  audit(actor, rf.id, "طلب استرداد", null, money(total), `${reason} · المسؤول: ${TW.PARTY[party]}`);
  return { ok: true, refund: rf, pending: rf.status === "PENDING_APPROVAL" };
};
function completeRefund(rf, actor) {
  const S = TW.S, o = find(S.orders, rf.orderId), c = find(S.customers, o.customerId);
  rf.status = rf.method === "wallet" ? "COMPLETED" : "SUBMITTED"; rf.doneAt = now(); rf.approvedBy = actor.name;
  if (rf.method === "wallet") c.wallet += rf.amount;
  const refunded = sum(S.refunds.filter((r) => r.orderId === o.id && ["COMPLETED", "SUBMITTED"].includes(r.status)), (r) => r.items != null ? r.items : r.amount);
  o.fin = refunded >= o.totals.total - 0.01 ? "REFUNDED" : "PARTIALLY_REFUNDED";
  if (rf.party === "merchant") { const f = S.fos.find((x) => x.orderId === o.id && x.sourceType === "merchant"); if (f) { const st = S.msettle.find((x) => x.merchantId === f.sourceId && x.status === "DUE"); if (st) { st.lines.push({ id: uid("DL"), kind: "responsibility", amount: -(rf.items || rf.amount), order: o.id, event: `${rf.reason} — حالة ${rf.caseId || "—"}`, evidence: rf.evidence, policy: "سياسة المسؤولية §25 (P21)", status: "final" }); st.net -= rf.items || rf.amount; } } }
  if (rf.party === "hub") S.moves.unshift({ id: `MV-${S.seq.mv++}`, at: now(), skuId: (o.lines.find((l) => rf.lines.includes(l.key)) || {}).skuId || "—", type: "فقد/هالك (استرداد)", qty: -1, before: "—", after: "—", reason: `${rf.id} — ${rf.reason}`, user: actor.name, evidence: rf.evidence });
  if (rf.caseId) { const cs = find(S.cases, rf.caseId); if (cs) { cs.status = "RESOLVED"; cs.resolution = `استرداد ${money(rf.amount)} ${rf.method === "wallet" ? "للمحفظة" : "لوسيلة الدفع"} — المسؤول ${TW.PARTY[rf.party]}`; cs.resolvedAt = now(); } }
  ev(o, "REFUNDED", `استرداد ${money(rf.amount)} ${rf.method === "wallet" ? "لمحفظة توّا" : "لوسيلة الدفع"} — ${rf.reason}`, actor.kind);
  notify(`customer:${o.customerId}`, "رجعنالك فلوسك", `${money(rf.amount)} ${rf.method === "wallet" ? "في محفظة توّا" : "هتوصل لوسيلة الدفع خلال 3–5 أيام"}`, { orderId: o.id });
}
A["refund.process"] = ({ refundId, result }, actor) => { { const d = need("finance.close", actor); if (d) return d; } const rf = find(TW.S.refunds, refundId); rf.status = result === "fail" ? "FAILED" : "COMPLETED"; rf.doneAt = now(); audit(actor, rf.id, "تنفيذ استرداد عبر البوابة", "SUBMITTED", rf.status, null); };
A["comp.issue"] = ({ caseId, amount, reason }, actor) => {
  const S = TW.S, cs = find(S.cases, caseId); const d = need("comp.issue", actor) || needReason(reason); if (d) return d;
  const amt = Number(amount);
  const lim = TW.roleOf(actor.id).id === "support" ? S.rules.compAgent : ["supsup", "ops"].includes(TW.roleOf(actor.id).id) ? S.rules.compSupervisor : Infinity;
  if (amt > cs.recommendation.maxComp && amt > lim) return fail(`التعويض أعلى من الحد المسموح لدورك (${money(lim)}) — اطلب موافقة`);
  if (amt > lim) { approval("compensation", { kind: "case", id: caseId }, actor, `تعويض ${money(amt)} — ${reason}`, amt, cs.type, "مصروف تعويض", amt <= S.rules.compSupervisor ? "supsup" : "finance"); return { ok: true, pending: true }; }
  find(S.customers, cs.customerId).wallet += amt; cs.comp = (cs.comp || 0) + amt;
  audit(actor, cs.id, "صرف تعويض", null, money(amt), reason);
  notify(`customer:${cs.customerId}`, "تعويض في محفظتك", `${money(amt)} — ${reason}`, {});
};
A["case.resolve"] = ({ caseId, resolution }, actor) => { const cs = find(TW.S.cases, caseId); if (!resolution) return fail("اكتب الحل"); cs.status = "RESOLVED"; cs.resolution = resolution; cs.resolvedAt = now(); cs.owner = cs.owner || actor.name; audit(actor, cs.id, "إغلاق حالة دعم", "OPEN", "RESOLVED", resolution); };

/* ---------------- approvals ---------------- */
function approval(type, ref, actor, reason, amount, evidence, impact, level) {
  const ap = { id: `AP-${TW.S.seq.approval++}`, type, ref, requester: { name: actor.name, role: actor.role || actor.kind }, reason, amount, evidence, impact, level, status: "PENDING", createdAt: now(), decisions: [] };
  TW.S.approvals.unshift(ap); return ap;
}
TW.APPROVAL_TYPES = { merchant_activation: "تفعيل تاجر", new_sku: "SKU جديد", price: "سعر تاجر غير طبيعي", promo: "عرض كبير / تحت حد الهامش", refund: "استرداد فوق الحد", compensation: "تعويض", writeoff: "شطب مخزون", rider_adjust: "تعديل مستحقات مندوب", settlement_adjust: "تعديل تسوية تاجر", close: "إقفال مالي يدوي", rule: "تجاوز قاعدة عمل", po: "أمر شراء" };
const LEVEL_PERM = { support: null, supsup: "refund.approve.medium", finance: "refund.approve.large", ops: "inventory.adjust", category: "catalog.approve", merchops: "merchant.activate", gm: "rules.edit" };
TW.canApprove = (ap, userId = TW.S.session.admin) => { const role = find(TW.S.users, userId).role; if (["founder", "gm"].includes(role)) return true; if (ap.type === "promo") return TW.can("promo.approve", userId); if (ap.type === "po") return TW.can("po.approve", userId); if (ap.type === "rule" || ap.type === "close") return TW.can("rules.edit", userId) || TW.can("finance.close", userId); if (ap.type === "settlement_adjust" || ap.type === "rider_adjust") return TW.can("settlement.adjust", userId) || role === "ops"; const p = LEVEL_PERM[ap.level]; return p ? TW.can(p, userId) : true; };
A["approval.decide"] = ({ approvalId, decision, note }, actor) => {
  const S = TW.S, ap = find(S.approvals, approvalId);
  if (ap.status !== "PENDING") return fail("القرار ده اتاخد قبل كده");
  if (!TW.canApprove(ap, actor.id)) return fail(`الموافقة دي محتاجة مستوى «${(D.roles.find((r) => r.id === ap.level) || {}).ar || ap.level}»`);
  if (decision === "reject" && !note) return fail("سبب الرفض إلزامي");
  if (ap.blockedBy === "lead stage") { const lead = S.leads.find((l) => l.merchantId === ap.ref.id); if (lead && lead.stage < 7 && decision === "approve") return fail(`مرحلة التاجر في خط المبيعات «${D.leadStages[lead.stage]}» — لازم يخلص المستندات والكتالوج والتدريب الأول`); }
  ap.status = decision === "approve" ? "APPROVED" : "REJECTED"; ap.approver = actor.name; ap.decidedAt = now(); ap.note = note || "";
  onDecision(ap, decision === "approve", actor);
  audit(actor, ap.id, `قرار موافقة: ${TW.APPROVAL_TYPES[ap.type]}`, "PENDING", ap.status, note || ap.reason);
};
function onDecision(ap, ok, actor) {
  const S = TW.S, r = ap.ref;
  if (ap.type === "refund") { const rf = find(S.refunds, r.id); if (ok) completeRefund(rf, actor); else { rf.status = "REJECTED"; if (rf.caseId) find(S.cases, rf.caseId).status = "INVESTIGATING"; } }
  if (ap.type === "price") { const x = (S.msku[r.merchantId] || {})[r.skuId]; if (x) { if (ok && x.pendingPrice) { x.price = x.pendingPrice; x.available = true; } x.pendingPrice = null; if (!ok) notify(`merchant:${r.merchantId}`, "السعر محتاج مراجعة", `${find(S.skus, r.skuId).ar}: السعر المقترح أعلى من سعر السوق — السعر الحالي ${money(x.price)}`, {}); } }
  if (ap.type === "merchant_activation" && ok) { const m = find(S.merchants, r.id); m.status = "active"; m.mode = "open"; m.since = new Date().toISOString().slice(0, 10); m.health = "new"; if (!Object.keys(S.msku[m.id] || {}).length) { S.msku[m.id] = {}; S.skus.filter((s) => (D.typeDepts[m.type] || []).includes(s.dept) && !s.regulated).slice(0, 24).forEach((s) => (S.msku[m.id][s.id] = { price: s.refPrice, available: true, stock: null, prep: m.prep, updatedAt: now() })); } const lead = S.leads.find((l) => l.merchantId === m.id); if (lead) { lead.stage = Math.max(lead.stage, 8); lead.history.push({ at: now(), stage: 8, by: actor.name }); } notify(`merchant:${m.id}`, "مبروك! محلك اتفعّل على توّا", "تقدر تستقبل طلبات دلوقتي", {}); }
  if (ap.type === "new_sku") { const cr = find(S.catReqs, r.id); cr.status = ok ? "APPROVED" : "REJECTED"; if (!ok) notify(`merchant:${cr.merchantId}`, "طلب المنتج اترفض", `${cr.name}: ${ap.note}`, {}); }
  if (ap.type === "writeoff" && ok) { /* already moved; approval documents the loss */ }
  if (ap.type === "rider_adjust" && ok) { const rs = S.rsettle.find((x) => x.riderId === r.id); if (rs) rs.deductions += r.amount != null ? r.amount : -ap.amount; }
  if (ap.type === "po") { const po = find(S.pos, r.id); po.status = ok ? "APPROVED" : "REJECTED"; po.approvedBy = ok ? actor.name : null; if (ok) po.lines.forEach(([id, q]) => { if (S.inv.h1[id]) S.inv.h1[id].incoming += q; }); }
  if (ap.type === "promo") { const p = find(S.promos, r.id); p.status = ok ? "active" : "rejected"; p.approval = { by: actor.name, at: now(), ok }; }
  if (ap.type === "compensation" && ok) { const cs = find(S.cases, r.id); find(S.customers, cs.customerId).wallet += ap.amount; cs.comp = (cs.comp || 0) + ap.amount; }
  if (ap.type === "settlement_adjust" && ok) { const st = find(S.msettle, r.id); st.lines.push({ id: uid("DL"), kind: "adjustment", amount: r.amount, order: "—", event: ap.reason, evidence: ap.evidence, policy: "تسوية معتمدة", status: "final" }); st.net += r.amount; }
}

/* ---------------- catalogue, merchants, riders admin ---------------- */
A["catalog.createFromRequest"] = ({ reqId, ar, en, brand, dept, cat, size, price, barcode }, actor) => {
  const S = TW.S; const d = need("catalog.approve", actor); if (d) return d;
  const cr = find(S.catReqs, reqId);
  const dup = S.skus.find((s) => TW.norm(s.ar) === TW.norm(ar) || (barcode && s.barcode === barcode));
  if (dup) return fail(`فيه SKU مطابق موجود: ${dup.ar} (${dup.id}) — اربط الطلب بيه بدل التكرار`, { dup: dup.id });
  const id = `SKU-${10001 + S.skus.length}`;
  const sku = { id, ar, en: en || ar, brand: brand || "—", dept, cat, sub: ar.split(" ")[0], family: ar, size, unit: "عبوة", pack: 1, barcode: barcode || `622${Date.now() % 1e10}`, aliases: [cr.name], temp: "a", fragile: false, regulated: false, ageR: 0, shelfLife: 30, subGroup: null, refPrice: Number(price), price: Number(price), oldPrice: null, weightVar: false, local: false, hub: false, handling: "normal", diet: [], tax: 0.14, weightKg: 0.5, active: true, desc: `${ar} — ${size}`, createdFrom: cr.id };
  S.skus.push(sku);
  S.msku[cr.merchantId] = S.msku[cr.merchantId] || {}; S.msku[cr.merchantId][id] = { price: Number(price), available: true, stock: null, prep: find(S.merchants, cr.merchantId).prep, updatedAt: now() };
  cr.status = "APPROVED"; cr.skuId = id;
  const ap = S.approvals.find((a) => a.ref.kind === "catreq" && a.ref.id === reqId && a.status === "PENDING"); if (ap) { ap.status = "APPROVED"; ap.approver = actor.name; ap.decidedAt = now(); }
  S.demand.noResult.forEach((n) => { if (TW.norm(ar).includes(TW.norm(n.q)) || TW.norm(n.q).includes(TW.norm(cr.name).split(" ")[0])) n.resolvedBy = id; });
  notify(`merchant:${cr.merchantId}`, "المنتج اتضاف للكتالوج", `${ar} — اتضاف لمحلك بسعر ${money(price)}`, {});
  audit(actor, id, "إنشاء SKU معتمد", null, ar, `من طلب ${cr.id}`);
  return { ok: true, skuId: id };
};
A["catalog.linkRequest"] = ({ reqId, skuId }, actor) => { const S = TW.S, cr = find(S.catReqs, reqId); cr.status = "LINKED"; cr.skuId = skuId; S.msku[cr.merchantId][skuId] = { price: find(S.skus, skuId).refPrice, available: true, stock: null, prep: 10, updatedAt: now() }; const ap = S.approvals.find((a) => a.ref.kind === "catreq" && a.ref.id === reqId && a.status === "PENDING"); if (ap) { ap.status = "APPROVED"; ap.approver = actor.name; ap.decidedAt = now(); ap.note = `ربط بـ ${skuId}`; } notify(`merchant:${cr.merchantId}`, "المنتج موجود في الكتالوج", `${find(S.skus, skuId).ar} اتضاف لمحلك`, {}); audit(actor, cr.id, "ربط طلب بمنتج موجود", null, skuId, "منع التكرار"); };
A["sku.update"] = ({ skuId, field, value, reason }, actor) => { const d = need(field === "price" || field === "refPrice" ? "price.override" : "catalog.edit", actor) || needReason(reason); if (d) return d; const s = find(TW.S.skus, skuId); const old = s[field]; s[field] = field === "price" || field === "refPrice" ? Number(value) : value; audit(actor, skuId, `تعديل ${field}`, old, value, reason); };
A["merchant.status"] = ({ merchantId, status, reason }, actor) => { const d = need("merchant.activate", actor) || needReason(reason); if (d) return d; const m = find(TW.S.merchants, merchantId); const old = m.health; m.health = status; if (status === "suspended") { m.mode = "closed"; } audit(actor, m.ar, "تغيير تصنيف التاجر", old, status, reason); notify(`merchant:${m.id}`, "تحديث حالة حسابك", `${{ watch: "تحت المراقبة", restricted: "مقيّد", suspended: "موقوف", healthy: "سليم" }[status] || status} — ${reason}`, {}); };
A["merchant.commission"] = ({ merchantId, pct, reason }, actor) => { const d = need("merchant.commission", actor) || needReason(reason); if (d) return d; const m = find(TW.S.merchants, merchantId); const old = m.commission; m.commission = Number(pct) / 100; audit(actor, m.ar, "تعديل عمولة", `${Math.round(old * 100)}%`, `${pct}%`, reason); };
A["rider.suspend"] = ({ riderId, reason, on = true }, actor) => { const d = need("rider.manage", actor) || needReason(reason); if (d) return d; const r = find(TW.S.riders, riderId); r.suspended = on; if (on) r.status = "offline"; audit(actor, r.ar, on ? "إيقاف مندوب" : "إعادة تفعيل مندوب", null, null, reason); };
A["rider.limit"] = ({ riderId, limit, reason }, actor) => { const d = need("rider.manage", actor) || needReason(reason); if (d) return d; const r = find(TW.S.riders, riderId); const old = r.limit; r.limit = Number(limit); audit(actor, r.ar, "تعديل حد الكاش", old, limit, reason); };
A["rider.adjust"] = ({ riderId, amount, reason }, actor) => { const d = (actor.kind === "admin" && !TW.can("settlement.adjust", actor.id) && TW.roleOf(actor.id).id !== "ops" ? fail("تعديل مستحقات المندوب للمالية أو مدير العمليات بس") : null) || needReason(reason); if (d) return d; if (!Number(amount)) return fail("المبلغ لازم يكون رقم غير صفر"); approval("rider_adjust", { kind: "rider", id: riderId, amount: Number(amount) }, actor, `${Number(amount) < 0 ? "خصم" : "إضافة"} ${money(Math.abs(amount))} — ${find(TW.S.riders, riderId).ar}: ${reason}`, Math.abs(Number(amount)), reason, "تسوية المندوب", "ops"); return { ok: true, pending: true }; };
A["settlement.pay"] = ({ settlementId }, actor) => { const d = need("settlement.adjust", actor); if (d) return d; const st = find(TW.S.msettle, settlementId); if (st.lines.some((l) => l.status === "disputed")) return fail("فيه بند متنازع عليه — لازم يتحل قبل الصرف (EX-SET-002)"); st.status = "PAID"; st.paidAt = now(); st.ref = `INSTA-${Math.round(Math.random() * 1e6)}`; audit(actor, st.id, "صرف تسوية تاجر", "DUE", money(st.net), st.ref); notify(`merchant:${st.merchantId}`, "اتحولت مستحقاتك", `${money(st.net)} — مرجع ${st.ref}`, {}); };
A["settlement.resolveLine"] = ({ settlementId, lineId, keep, reason }, actor) => { const d = need("settlement.adjust", actor) || needReason(reason); if (d) return d; const st = find(TW.S.msettle, settlementId), l = st.lines.find((x) => x.id === lineId); l.status = "final"; l.resolution = `${keep ? "الخصم ثابت" : "الخصم اتلغى"} — ${reason}`; if (!keep) { st.net -= l.amount; l.amount = 0; } audit(actor, `${st.id}/${l.id}`, "حسم نزاع تسوية", "disputed", keep ? "ثابت" : "ملغي", reason); notify(`merchant:${st.merchantId}`, "تم الرد على اعتراضك", l.resolution, {}); };
A["settlement.adjust"] = ({ settlementId, amount, reason }, actor) => { const d = need("settlement.adjust", actor) || needReason(reason); if (d) return d; if (!Number(amount)) return fail("المبلغ لازم يكون رقم غير صفر"); const st = find(TW.S.msettle, settlementId); approval("settlement_adjust", { kind: "msettle", id: settlementId, amount: Number(amount) }, actor, `تعديل تسوية ${find(TW.S.merchants, st.merchantId).ar}: ${money(amount)} — ${reason}`, Math.abs(Number(amount)), reason, "يغيّر صافي المستحق للتاجر", "finance"); return { ok: true, pending: true }; };
A["rsettle.pay"] = ({ id }, actor) => { const d = need("settlement.adjust", actor); if (d) return d; const rs = find(TW.S.rsettle, id); rs.status = "PAID"; rs.paidAt = now(); audit(actor, rs.id, "صرف مستحقات مندوب", "OPEN", "PAID", null); };

/* ---------------- growth: promotions, campaigns, segments, leads, expansion ---------------- */
TW.promoImpact = (p) => {
  /* expected incremental contribution per redeemed order (Guardrail A): base CM/order − Twaa-funded discount + uplift from incremental orders */
  /* contribution grows with basket size (take ≈ 16% of basket minus ~18 EGP fixed variable cost per drop), so a min-basket condition protects margin */
  const S = TW.S, basket = Math.max(265, (p.minBasket || 0) * 1.15), baseCm = 0.16 * basket - 18, uplift = { "first order": 0.55, "second order": 0.35, winback: 0.4, "basket increase": 0.2, "category adoption": 0.25, "merchant launch": 0.3, "zone launch": 0.45, acquisition: 0.5 }[p.goal] || 0.25;
  let disc = p.type === "percent" ? Math.min(p.cap || 9999, (basket * p.value) / 100) : p.type === "fixed" ? p.value : 20;
  const tw = p.funding === "twaa" ? 1 : p.funding === "merchant" ? 0 : p.share ?? 0.5;
  const cmPerOrder = baseCm - disc * tw;
  const inc = cmPerOrder * uplift - disc * tw * (1 - uplift) * 0.25;
  return { disc: +disc.toFixed(1), twaaCost: +(disc * tw).toFixed(1), basket: Math.round(basket), baseCm: +baseCm.toFixed(1), cmPerOrder: +cmPerOrder.toFixed(1), incremental: +inc.toFixed(1), belowGuard: cmPerOrder < S.rules.minContribution, uplift };
};
A["promo.create"] = (p, actor) => {
  const S = TW.S; const d = need("promo.create", actor); if (d) return d;
  if (!p.name || !p.funding) return fail("اسم العرض وجهة التمويل إلزاميين (Guardrail C)");
  const promo = { id: `PR-${S.seq.promo++}`, code: p.code || null, name: p.name, type: p.type, value: Number(p.value) || 0, cap: Number(p.cap) || null, minBasket: Number(p.minBasket) || 0, scope: p.scope || "all", funding: p.funding, share: p.funding === "shared" ? 0.5 : p.funding === "twaa" ? 1 : 0, budget: Number(p.budget) || 0, spent: 0, redemptions: 0, limitPerCustomer: Number(p.limit) || 1, segment: p.segment || "all", zones: p.zones || "all", start: now(), end: now() + (Number(p.days) || 7) * 864e5, goal: p.goal || "basket increase", status: "draft" };
  const imp = TW.promoImpact(promo); promo.incContribution = imp.incremental; promo.impact = imp;
  S.promos.unshift(promo);
  if (imp.belowGuard || promo.budget > 30000) { promo.status = "pending_approval"; approval("promo", { kind: "promo", id: promo.id }, actor, `${promo.name} — مساهمة متوقعة ${num(imp.cmPerOrder, 1)} ج.م/طلب${imp.belowGuard ? ` (تحت الحد ${S.rules.minContribution})` : ""}`, promo.budget, `تمويل: ${{ twaa: "توّا", merchant: "التاجر", shared: "مشترك" }[promo.funding]} · خصم متوقع ${num(imp.disc, 1)} ج.م`, `Expected incremental contribution ${num(imp.incremental, 1)} ج.م/طلب`, "gm"); }
  else promo.status = "active";
  audit(actor, promo.id, "إنشاء عرض", null, promo.status, promo.name);
  return { ok: true, promo };
};
A["promo.toggle"] = ({ promoId }, actor) => { const p = find(TW.S.promos, promoId); if (p.status === "pending_approval") return fail("العرض بانتظار الموافقة"); const old = p.status; p.status = p.status === "active" ? "paused" : "active"; audit(actor, p.id, "تغيير حالة عرض", old, p.status, null); };
A["campaign.create"] = (c, actor) => { const S = TW.S; const d = need("promo.create", actor); if (d) return d; const cp = { id: `CP-${S.seq.camp++}`, name: c.name, audience: c.audience, offer: c.offer || null, channel: c.channel, schedule: c.schedule, budget: Number(c.budget) || 0, guard: c.guard !== false, goal: c.goal, status: "scheduled", sent: 0, opened: 0, ordered: 0, incContribution: 0 }; const seg = find(S.segments, cp.audience); cp.size = seg ? seg.size : 0; S.campaigns.unshift(cp); audit(actor, cp.id, "إنشاء حملة", null, cp.name, null); return { ok: true, campaign: cp }; };
A["campaign.launch"] = ({ id }, actor) => { const cp = find(TW.S.campaigns, id); const p = cp.offer && find(TW.S.promos, cp.offer); if (cp.guard && p && p.status !== "active") return fail("العرض المرتبط مش مفعّل (بانتظار موافقة أو متوقف)"); cp.status = "running"; cp.sent = cp.size || 0; cp.opened = Math.round(cp.sent * 0.42); cp.ordered = Math.round(cp.sent * 0.08); cp.incContribution = Math.round(cp.ordered * (p ? p.incContribution : 8)); audit(actor, cp.id, "إطلاق حملة", "scheduled", "running", null); };
A["segment.create"] = ({ name, rule, size }, actor) => { TW.S.segments.push({ id: uid("sg"), ar: name, rule, size: Number(size) || 0 }); audit(actor, name, "إنشاء شريحة", null, rule, null); };
A["lead.move"] = ({ leadId, stage, note }, actor) => {
  const S = TW.S, l = find(S.leads, leadId); const old = l.stage; l.stage = clamp(stage, 0, D.leadStages.length - 1); l.history.push({ at: now(), stage: l.stage, by: actor.name, note });
  if (l.stage >= 6 && l.merchantId && find(S.merchants, l.merchantId) && !Object.keys(S.msku[l.merchantId] || {}).length) { const m = find(S.merchants, l.merchantId); S.msku[m.id] = {}; S.skus.filter((s) => (D.typeDepts[m.type] || []).includes(s.dept) && !s.regulated).slice(0, 24).forEach((s) => (S.msku[m.id][s.id] = { price: s.refPrice, available: true, stock: null, prep: m.prep, updatedAt: now() })); }
  audit(actor, l.ar, "تحريك في خط المبيعات", D.leadStages[old], D.leadStages[l.stage], note || null);
};
A["lead.create"] = (l, actor) => { const S = TW.S; const lead = { id: `L-${S.seq.lead++}`, ar: l.name, owner: l.owner || "—", type: l.type, zoneId: l.zoneId, stage: 0, assortment: "—", opportunity: l.opportunity || "—", competitors: "—", commission: l.type === "restaurant" ? 0.17 : 0.1, history: [{ at: now(), stage: 0, by: actor.name }] }; S.leads.unshift(lead); audit(actor, lead.ar, "عميل محتمل جديد", null, D.merchantTypes[l.type], l.opportunity); return { ok: true, lead }; };
A["zone.update"] = ({ zoneId, field, value, reason }, actor) => { const d = need("zones.edit", actor) || needReason(reason); if (d) return d; const z = find(TW.S.zones, zoneId); const old = z[field]; z[field] = ["fee", "min", "cap"].includes(field) ? Number(value) : value; audit(actor, `منطقة ${z.ar}`, `تعديل ${field}`, Array.isArray(old) ? old.join("–") : old, Array.isArray(value) ? value.join("–") : value, reason); };
A["zone.launch"] = ({ zoneId, reason }, actor) => {
  const S = TW.S; const d = need("zones.edit", actor) || needReason(reason); if (d) return d;
  const z = find(S.zones, zoneId); z.active = true; z.cap = 20; z.hours = "رحلات مجدولة"; S.expansion[zoneId] = "pilot";
  const w = S.waitlist[zoneId];
  const exLead = S.leads.find((l) => l.zoneId === zoneId && l.type === "pharmacy");
  if (exLead) { exLead.stage = Math.max(exLead.stage, 1); exLead.priority = true; exLead.history.push({ at: now(), stage: exLead.stage, by: actor.name, note: `أولوية: مرتبط بإطلاق منطقة ${z.ar}` }); }
  else S.leads.unshift({ id: `L-${S.seq.lead++}`, ar: `صيدلية مطلوبة — ${z.ar}`, owner: "—", type: "pharmacy", zoneId, stage: 0, assortment: "—", opportunity: `فجوة: طلب صيدلية في ${z.ar} بدون صيدلية مفعّلة`, competitors: "—", commission: 0.1, history: [{ at: now(), stage: 0, by: actor.name, note: "مهمة استقطاب من لوحة التوسع" }] });
  S.customers.filter((c) => c.waitlist.includes(zoneId)).forEach((c) => notify(`customer:${c.id}`, `توّا وصلت ${z.ar}!`, "اطلب دلوقتي على رحلات التوصيل المجدولة", {}));
  audit(actor, `منطقة ${z.ar}`, "إطلاق منطقة خدمة (تجريبي)", "غير مفعّلة", "Pilot", reason);
  return { ok: true, notified: w ? w.users : 0, leadId: (S.leads.find((l) => l.zoneId === zoneId && l.type === "pharmacy") || {}).id };
};
A["expansion.status"] = ({ zoneId, status }, actor) => { const old = TW.S.expansion[zoneId]; TW.S.expansion[zoneId] = status; audit(actor, zoneId, "تحديث جاهزية التوسع", old, status, null); };

/* ---------------- governance ---------------- */
A["session.set"] = ({ key, value }) => { TW.S.session[key] = value; };
A["rules.update"] = ({ key, value, reason }, actor) => { const d = need("rules.edit", actor) || needReason(reason); if (d) return d; const old = TW.S.rules[key]; TW.S.rules[key] = Number(value); audit(actor, `قاعدة ${key}`, "تعديل قاعدة عمل", old, value, reason); };
A["role.perm"] = ({ role, perm, on, reason }, actor) => { const d = need("users.manage", actor) || needReason(reason); if (d) return d; const list = TW.S.rolePerms[role]; if (on && !list.includes(perm)) list.push(perm); if (!on) TW.S.rolePerms[role] = list.filter((p) => p !== perm); audit(actor, `دور ${role}`, on ? "منح صلاحية" : "سحب صلاحية", null, perm, reason); };
A["user.role"] = ({ userId, role, reason }, actor) => { const d = need("users.manage", actor) || needReason(reason); if (d) return d; const u = find(TW.S.users, userId); const old = u.role; u.role = role; audit(actor, u.ar, "تغيير دور", old, role, reason); };
A["sim.set"] = ({ key, value }) => { TW.S.sim[key] = value; };
A["actor.autopilot"] = ({ kind, id, value }) => { const arr = kind === "merchant" ? TW.S.merchants : TW.S.riders; find(arr, id).autopilot = value; };

/* ---------------- finance: daily close ---------------- */
A["recon.step"] = ({ step }, actor) => {
  const S = TW.S; const d = need("finance.close", actor); if (d) return d;
  const v = TW.reconStatus();
  if (step === "online") { if (v.onlineOpen.length) return fail(`فيه ${v.onlineOpen.length} مدفوعات معلّقة لازم تتطابق الأول`); S.payments.filter((p) => p.status === "SUCCESS").forEach((p) => (p.reconciled = true)); }
  if (step === "cod") { if (v.codVar.length) return fail(`فيه ${v.codVar.length} فروق كاش من غير قرار`); if (v.depPending.length) return fail(`فيه ${v.depPending.length} توريدات بانتظار التأكيد`); }
  if (step === "merchant") { /* post merchant liabilities from delivered orders */ }
  if (step === "rider") { }
  if (step === "exceptions") { if (v.openCasesMoney.length) return fail(`فيه ${v.openCasesMoney.length} حالات دعم مالية مفتوحة (EX-SET-003)`); }
  S.recon[step] = { at: now(), by: actor.name };
  audit(actor, `إقفال اليوم: ${step}`, "اعتماد خطوة مطابقة", null, "تم", null);
};
A["recon.close"] = (_, actor) => {
  const S = TW.S; const d = need("finance.close", actor); if (d) return d;
  const steps = ["online", "cod", "merchant", "rider", "exceptions"];
  if (!steps.every((s) => S.recon[s])) return fail("اعتمد كل خطوات المطابقة الأول");
  S.recon.closedAt = now(); S.recon.closedBy = actor.name;
  S.orders.filter((o) => ["RECONCILED", "SETTLEMENT_PENDING"].includes(o.fin) && o.status === "DELIVERED" && !(o.caseIds || []).some((id) => (find(S.cases, id) || {}).status !== "RESOLVED")).forEach((o) => (o.fin = "FINANCIALLY_CLOSED"));
  audit(actor, `اليوم المالي ${new Date().toLocaleDateString("en-GB")}`, "إقفال اليوم المالي", "مفتوح", "مقفل", null);
};
TW.reconStatus = () => {
  const S = TW.S;
  const onlineOpen = S.payments.filter((p) => p.status === "PENDING" || (p.status === "SUCCESS" && !p.reconciled && p.method === "card" && false));
  const codVar = S.cod.filter((c) => c.variance && !c.varianceResolved);
  const depPending = S.deposits.filter((d) => d.status === "PENDING_VERIFY");
  const codHeld = S.cod.filter((c) => c.status === "HELD");
  const openCasesMoney = S.cases.filter((c) => c.status !== "RESOLVED" && ["صنف ناقص", "صنف غلط", "صنف تالف", "فرق في الكاش", "استرداد"].includes(c.type));
  const refundsPending = S.refunds.filter((r) => ["PENDING_APPROVAL", "REQUESTED", "SUBMITTED"].includes(r.status));
  const merchantPayable = sum(S.orders.filter((o) => o.status === "DELIVERED" && Date.now() - o.createdAt < 864e5), (o) => sum(o.lines.filter((l) => l.sourceType === "merchant" && l.state !== "removed"), (l) => l.unitPrice * l.qty * (1 - find(S.merchants, l.sourceId).commission)));
  const riderPayable = sum(S.rsettle.filter((r) => r.status === "OPEN"), (r) => r.fees + r.incentives + r.waiting + r.deductions + r.codVariance);
  const exposure = sum(codHeld, (c) => c.collected) + sum(onlineOpen, (p) => p.amount) + sum(codVar, (c) => Math.abs(c.variance)) + sum(refundsPending, (r) => r.amount) + sum(depPending, (d) => d.amount);
  return { onlineOpen, codVar, depPending, codHeld, openCasesMoney, refundsPending, merchantPayable, riderPayable, exposure };
};

/* ===================================================================== selectors ===================== */
function hubAvail(skuId) { const iv = TW.S.inv.h1[skuId]; return iv ? Math.max(0, iv.onHand - iv.reserved) : 0; }
function merchantAvail(mid, skuId) { const x = (TW.S.msku[mid] || {})[skuId]; if (!x || !x.available) return 0; return x.stock == null ? null : x.stock; }
function priceAt(skuId, sourceType, sourceId) { const s = find(TW.S.skus, skuId); return sourceType === "hub" ? s.price : ((TW.S.msku[sourceId] || {})[skuId] || {}).price || s.price; }
TW.hubAvail = hubAvail; TW.merchantAvail = merchantAvail; TW.priceAt = priceAt;
/* which merchants can serve a zone: same zone, or town-core merchants serving any active zone */
TW.merchantServes = (m, zoneId) => { if (m.status !== "active") return false; const z = find(TW.S.zones, zoneId); if (!z || !z.active) return false; const mz = find(TW.S.zones, m.zoneId); return m.zoneId === zoneId || mz.type === "core"; };
/* all offers for a SKU in a zone, ranked: availability → ETA → price → reliability (BR-RTE-001) */
TW.offers = (skuId, zoneId) => {
  const S = TW.S, s = find(S.skus, skuId), z = find(S.zones, zoneId); const out = [];
  if (!s || !s.active) return out;
  if (s.hub && S.inv.h1[skuId] && z.active) { const av = hubAvail(skuId); out.push({ sourceType: "hub", sourceId: "h1", name: "توّا", price: s.price, available: av > 0, stock: av, eta: z.route === "scheduled" ? null : [z.sla[0], z.sla[1]], reliability: 0.98, label: "توّا" }); }
  S.merchants.forEach((m) => { const x = (S.msku[m.id] || {})[skuId]; if (!x || !TW.merchantServes(m, zoneId)) return; const av = x.available && m.mode !== "closed" && (x.stock == null || x.stock > 0); out.push({ sourceType: "merchant", sourceId: m.id, name: m.ar, price: x.price, available: av, stock: x.stock, eta: z.route === "scheduled" ? null : [Math.max(z.sla[0], m.prep + 12 + (m.busyExtra || 0)), Math.max(z.sla[1], m.prep + 22 + (m.busyExtra || 0))], reliability: m.acceptRate * m.availAcc, label: `من ${m.ar}`, mode: m.mode }); });
  return out.sort((a, b) => (b.available - a.available) || ((a.eta ? a.eta[0] : 99) - (b.eta ? b.eta[0] : 99)) || (a.price - b.price) || (b.reliability - a.reliability));
};
TW.bestOffer = (skuId, zoneId) => TW.offers(skuId, zoneId).find((o) => o.available) || null;
/* customer search: Arabic normalisation, aliases, typo tolerance, brand/English, merchants */
TW.search = (q, zoneId) => {
  const S = TW.S, nq = TW.norm(q); if (!nq) return { skus: [], merchants: [], menu: [] };
  const terms = nq.split(" ").filter(Boolean);
  const score = (hay) => { const h = TW.norm(hay); let sc = 0; for (const t of terms) { if (h.includes(t)) sc += 3; else { const best = Math.min(...h.split(" ").map((w) => TW.lev(w, t))); if (t.length >= 4 && best <= 1) sc += 2; else if (t.length >= 6 && best <= 2) sc += 1; else return 0; } } return sc; };
  const skus = S.skus.filter((s) => s.active).map((s) => ({ s, sc: score([s.ar, s.en, s.brand, s.sub, ...s.aliases].join(" ")) })).filter((x) => x.sc > 0).map((x) => ({ ...x, offer: TW.bestOffer(x.s.id, zoneId) })).filter((x) => x.offer || x.s.regulated).sort((a, b) => b.sc - a.sc).map((x) => x.s);
  const merchants = S.merchants.filter((m) => TW.merchantServes(m, zoneId) && score([m.ar, D.merchantTypes[m.type], m.cuisine ? D.cuisine[m.cuisine] : ""].join(" ")) > 0);
  const menu = []; S.merchants.filter((m) => S.menus[m.id] && TW.merchantServes(m, zoneId)).forEach((m) => S.menus[m.id].forEach((it) => { if (it.available && score(it.name + " " + it.cat) > 0) menu.push({ m, it }); }));
  return { skus, merchants, menu };
};
TW.zoneOfCustomer = (cid) => { const c = find(TW.S.customers, cid); const a = c.addresses.find((x) => x.id === c.addr) || c.addresses[0]; return find(TW.S.zones, a.zoneId); };
/* customer-facing journey step (0-based index into TW.JOURNEY, -1 cancelled) */
TW.stage = (o) => {
  if (["CANCELLED", "RETURNED", "RETURN_TO_ORIGIN"].includes(o.status)) return -1;
  if (o.status === "DELIVERED") return 6;
  const ts = TW.S.tasks.filter((t) => t.orderId === o.id && t.status !== "CANCELLED");
  const t = ts.find((x) => x.status !== "DELIVERED") || ts[0];
  if (!t) return 0;
  if (t.status === "ARRIVED") return 5;
  if (t.status === "PICKED_UP") return t.prog > 0.6 ? 4 : 3;
  if (["ASSIGNED", "AT_PICKUP"].includes(t.status)) return 2;
  if (["PREPARING", "READY", "AWAITING_CUSTOMER_DECISION", "SCHEDULED"].includes(o.status) || TW.S.fos.some((f) => f.orderId === o.id && ["PICKING", "PREPARING", "PACKED", "READY"].includes(f.status))) return 1;
  return 0;
};
/* rider eligibility (BR-RID-001/002) */
function riderEligibility(r, t) {
  const S = TW.S, z = find(S.zones, t.drop.zoneId);
  if (r.suspended) return { ok: false, why: "موقوف" };
  if (r.status === "offline") return { ok: false, why: "أوفلاين" };
  if (r.task && r.task !== t.id) return { ok: false, soft: true, why: "في مهمة حالية" };
  if (!z.riderType.includes(r.vehicle)) return { ok: false, why: `المركبة (${D.vehicles[r.vehicle]}) غير مناسبة لـ ${z.ar}` };
  if (t.cod > 0 && r.cash + t.cod > r.limit) return { ok: false, why: `حد الكاش: معاه ${money(r.cash)} + ${money(t.cod)} > ${money(r.limit)}`, cash: true };
  if (t.handling.includes("frozen") && r.vehicle === "bicycle" && t.km > 3) return { ok: false, why: "مجمدات لمسافة طويلة على عجلة" };
  return { ok: true, why: "مؤهل" };
}
TW.riderEligibility = riderEligibility;
TW.riderCandidates = (t) => TW.S.riders.map((r) => { const el = riderEligibility(r, t); const p = t.pickups[0]; return { r, el, km: +distKm(r, p).toFixed(1) }; }).sort((a, b) => (b.el.ok - a.el.ok) || a.km - b.km);

/* per-order financial ledger (who earns, who pays) */
TW.ledger = (o) => {
  const S = TW.S, L = [];
  const live = o.lines.filter((l) => l.state !== "removed");
  const hubRev = sum(live.filter((l) => l.sourceType === "hub"), (l) => (l.sub ? l.sub.price : l.unitPrice) * l.qty);
  const hubCogs = sum(live.filter((l) => l.sourceType === "hub"), (l) => { const iv = S.inv.h1[l.sub ? l.sub.skuId : l.skuId]; return (iv ? iv.cost : l.unitPrice * 0.85) * l.qty; });
  const absorbed = sum(live, (l) => (l.sub && l.sub.absorbed) || 0);
  const commission = sum(live.filter((l) => l.sourceType === "merchant"), (l) => l.unitPrice * l.qty * find(S.merchants, l.sourceId).commission);
  const merchantGmv = sum(live.filter((l) => l.sourceType === "merchant"), (l) => l.unitPrice * l.qty);
  const tasks = S.tasks.filter((t) => t.orderId === o.id && t.status !== "CANCELLED");
  const riderCost = sum(tasks, (t) => t.earn || 27);
  const pf = o.totals.promoFunding || { twaa: 0, merchant: 0 };
  const payFee = o.pay.method === "card" ? +(o.totals.total * 0.022 + 2).toFixed(2) : o.pay.method === "cod" ? 1.5 : 0;
  const pick = live.some((l) => l.sourceType === "hub") ? 4 + 0.5 * live.filter((l) => l.sourceType === "hub").length : 0;
  const pack = 3;
  const refunds = S.refunds.filter((r) => r.orderId === o.id && ["COMPLETED", "SUBMITTED"].includes(r.status) && r.party !== "merchant");
  const refundCost = sum(refunds, (r) => r.amount);
  const merchRefund = sum(S.refunds.filter((r) => r.orderId === o.id && ["COMPLETED", "SUBMITTED"].includes(r.status) && r.party === "merchant"), (r) => r.items || r.amount);
  const comp = sum((o.caseIds || []).map((id) => find(S.cases, id)).filter(Boolean), (c) => c.comp || 0);
  L.push(["هامش منتجات توّا (مبيعات الهب − التكلفة)", hubRev - hubCogs, "rev"]);
  L.push(["عمولة التجار", commission, "rev"]);
  L.push(["رسوم التوصيل", o.totals.delivery, "rev"]);
  L.push(["رسوم الخدمة", o.totals.service, "rev"]);
  L.push(["خصم ممول من توّا", -pf.twaa, "cost"]);
  L.push(["تحمّل فرق البديل", -absorbed, "cost"]);
  L.push(["رسوم بوابة الدفع / تحصيل", -payFee, "cost"]);
  L.push(["تكلفة المندوب", -riderCost, "cost"]);
  L.push(["تجميع وتغليف", -(pick + pack), "cost"]);
  if (refundCost) L.push(["استرداد على توّا/الهب", -refundCost, "cost"]);
  if (comp) L.push(["تعويضات", -comp, "cost"]);
  const netRevenue = hubRev + commission + o.totals.delivery + o.totals.service - pf.twaa;
  const contribution = sum(L, (x) => x[1]);
  return { lines: L, gmv: sum(live, (l) => (l.sub ? l.sub.price : l.unitPrice) * l.qty), hubRev, hubCogs, commission, merchantGmv, merchantPayable: merchantGmv - commission - pf.merchant - merchRefund, netRevenue, contribution, riderCost, payFee, promoTwaa: pf.twaa, promoMerchant: pf.merchant };
};

/* executive KPIs = seeded history for the day so far + live orders */
TW.kpis = () => {
  const S = TW.S, todays = S.orders.filter((o) => now() - o.createdAt < 18 * 3600000 && new Date(o.createdAt).getDate() === new Date().getDate());
  const base = { orders: Math.max(0, sum(S.hist.hourly.filter((x) => x != null)) - S.orders.filter((o) => now() - o.createdAt < 4 * 3600000).length), aov: 262 };
  const live = todays.filter((o) => o.status !== "CANCELLED");
  const ledg = live.map((o) => TW.ledger(o));
  const liveGmv = sum(ledg, (l) => l.gmv);
  const orders = base.orders + live.length;
  const gmv = base.orders * base.aov + liveGmv;
  const netRev = base.orders * base.aov * 0.236 + sum(ledg, (l) => l.netRevenue);
  const cm = base.orders * 9.6 + sum(ledg, (l) => l.contribution);
  const delivered = Math.round(base.orders * 0.955) + live.filter((o) => o.status === "DELIVERED").length;
  const cancelled = Math.round(base.orders * 0.022) + todays.filter((o) => o.status === "CANCELLED").length;
  const ontime = 0.9;
  const activeCust = 2840 + S.customers.filter((c) => c.last != null && c.last < 30).length;
  const activeMerch = S.merchants.filter((m) => m.status === "active" && m.mode !== "closed").length;
  const activeRiders = S.riders.filter((r) => r.status !== "offline").length;
  const codExposure = sum(S.riders, (r) => r.cash);
  const refundPending = sum(S.refunds.filter((r) => ["PENDING_APPROVAL", "REQUESTED", "SUBMITTED"].includes(r.status)), (r) => r.amount);
  const cashDiscrepancy = sum(S.cod.filter((c) => c.variance && !c.varianceResolved), (c) => Math.abs(c.variance));
  return { orders, gmv, netRev, cm, aov: orders ? gmv / orders : 0, delivered, deliveredPct: orders ? Math.min(1, delivered / orders) : 0, ontime, cancelPct: orders ? cancelled / orders : 0, activeCust, activeMerch, activeRiders, codExposure, refundPending, cashDiscrepancy, live: live.length };
};

/* Control Tower: only items that need action. severity → closest SLA → money at risk */
TW.alerts = () => {
  const S = TW.S, out = [], t = now();
  const push = (a) => out.push({ id: `${a.code}-${a.ref}`, ...a });
  S.fos.forEach((f) => {
    const o = find(S.orders, f.orderId); if (!o || o.status === "CANCELLED") return;
    const money_ = sum(o.lines.filter((l) => l.foId === f.id), (l) => l.unitPrice * l.qty);
    if (f.status === "AWAITING_ACCEPT" && !o.hold) { const left = f.acceptBy - t; push({ code: "EX-MER-001", sev: left < 30000 ? "critical" : left < 60000 ? "high" : "medium", ref: f.id, orderId: o.id, problem: `التاجر لم يقبل بعد — ${f.name}`, since: f.createdAt, slaAt: f.acceptBy, owner: "الدعم / عمليات التجار", loc: find(S.zones, o.zoneId).ar, money: money_, action: "اتصل بالتاجر ثم أعد التوجيه", acts: ["call", "reroute", "cancelFo"] }); }
    if (["TIMEOUT", "REJECTED"].includes(f.status) && !f.resolved) push({ code: f.status === "TIMEOUT" ? "EX-MER-001" : "EX-MER-002", sev: "critical", ref: f.id, orderId: o.id, problem: f.status === "TIMEOUT" ? `انتهت مهلة القبول — ${f.name} لم يرد` : `${f.name} رفض: ${f.rejectReason}`, since: f.rejectedAt || f.acceptBy, slaAt: (f.rejectedAt || f.acceptBy) + 5 * MIN, owner: "مشرف الدعم", loc: find(S.zones, o.zoneId).ar, money: money_, action: "أعد التوجيه لتاجر بديل أو ألغِ المكوّن", acts: ["reroute", "cancelFo"] });
    if (f.status === "PREPARING" && f.prepBy && t > f.prepBy) push({ code: "EX-MER-004", sev: t - f.prepBy > 10 * MIN ? "high" : "medium", ref: f.id, orderId: o.id, problem: `تأخر تجهيز ${f.name}`, since: f.acceptedAt, slaAt: f.prepBy, owner: "التاجر / الدعم", loc: find(S.zones, o.zoneId).ar, money: money_, action: "اتصل بالتاجر وحدّث ETA للعميل", acts: ["call", "open"] });
    if (f.exception && f.status === "PICKING") push({ code: f.exception.code, sev: "high", ref: f.id, orderId: o.id, problem: f.exception.text, since: f.exception.at, slaAt: f.exception.at + 5 * MIN, owner: "مدير الهب", loc: "هب توّا", money: money_, action: "أعد العد وسجّل الرف فاضي ← يبدأ مسار البديل", acts: ["picker", "open"] });
    if (f.sourceType === "hub" && f.status === "PICKING" && f.pickStart && t - f.pickStart > S.rules.pickSlaMin * MIN && !f.exception && !f.blocked) push({ code: "EX-INV-003", sev: "medium", ref: f.id, orderId: o.id, problem: "التجميع متجاوز SLA", since: f.pickStart, slaAt: f.pickStart + S.rules.pickSlaMin * MIN, owner: "مدير الهب", loc: "هب توّا", money: money_, action: "أعد توزيع المجمّعين", acts: ["picker"] });
  });
  S.orders.forEach((o) => {
    const l = o.lines.find((x) => x.state === "sub_pending");
    if (l) push({ code: "EX-SUB-001", sev: "medium", ref: o.id, orderId: o.id, problem: `بانتظار قرار العميل على بديل ${l.name}`, since: l.subAsked, slaAt: l.subAsked + S.rules.subWaitSec * 1000, owner: "النظام → الدعم", loc: find(S.zones, o.zoneId).ar, money: l.unitPrice * l.qty, action: "انتظر أو طبّق التفضيل الاحتياطي", acts: ["open"] });
    if (!["DELIVERED", "CANCELLED", "RETURNED", "SCHEDULED", "PAYMENT_PENDING"].includes(o.status) && o.events.length) { const last = o.events[o.events.length - 1].at; if (t - last > S.rules.stuckMin * MIN) push({ code: "EX-SYS-001", sev: "high", ref: `stuck-${o.id}`, orderId: o.id, problem: `طلب عالق في «${TW.stLabel("order", o.status)}» من ${TW.mins(t - last)} د`, since: last, slaAt: last + S.rules.stuckMin * MIN, owner: "مدير العمليات", loc: find(S.zones, o.zoneId).ar, money: o.totals.total, action: "افتح الطلب وقرر: دفع / إلغاء / إغلاق", acts: ["open"] }); }
  });
  S.tasks.forEach((tk) => {
    const o = find(S.orders, tk.orderId); if (!o || o.status === "CANCELLED") return;
    const r = tk.riderId && find(S.riders, tk.riderId);
    if (tk.status === "NO_RIDER") push({ code: "EX-RID-002", sev: "critical", ref: tk.id, orderId: o.id, problem: `جاهز بدون مندوب — ${tk.attempts} محاولات عرض فشلت`, since: tk.readySince || o.createdAt, slaAt: (tk.readySince || o.createdAt) + 10 * MIN, owner: "الموزّع", loc: find(S.zones, o.zoneId).ar, money: o.totals.total, action: "إسناد يدوي لأقرب مندوب مؤهل", acts: ["assign", "reoffer"] });
    if (tk.status === "ASSIGNED" && tk.pickupBy && t > tk.pickupBy) push({ code: "EX-PKP-004", sev: "high", ref: tk.id, orderId: o.id, problem: `${r ? r.ar : "المندوب"} متأخر في الوصول للاستلام`, since: tk.assignedAt, slaAt: tk.pickupBy, owner: "الموزّع", loc: tk.pickups[0].name, money: o.totals.total, action: "اتصل بالمندوب أو أعد الإسناد", acts: ["assign", "open"] });
    if (tk.status === "ARRIVED" && tk.unreachable) push({ code: "EX-ARR-001", sev: t > tk.unreachable.waitUntil ? "critical" : "high", ref: tk.id, orderId: o.id, problem: `العميل لا يرد — ${r ? r.ar : ""} عند العنوان`, since: tk.unreachable.since, slaAt: tk.unreachable.waitUntil, owner: "الدعم", loc: find(S.zones, o.zoneId).ar, money: tk.cod || o.totals.total, action: "اتصل من الدعم بالرقم البديل", acts: ["open"] });
    if (tk.status === "FAILED") push({ code: "EX-ARR-001", sev: "critical", ref: `fail-${tk.id}`, orderId: o.id, problem: `فشل التسليم: ${tk.failReason}`, since: tk.failedAt, slaAt: tk.failedAt + 10 * MIN, owner: "الدعم", loc: find(S.zones, o.zoneId).ar, money: o.totals.total, action: "قرر: إعادة محاولة أو إرجاع للمصدر", acts: ["retry", "rto"] });
    if (tk.pickupIssue && !["PICKED_UP", "DELIVERED", "ARRIVED"].includes(tk.status)) push({ code: "EX-PKP-001", sev: "high", ref: `pk-${tk.id}`, orderId: o.id, problem: `${tk.pickupIssue.type} عند الاستلام`, since: tk.pickupIssue.at, slaAt: tk.pickupIssue.at + 5 * MIN, owner: "الهب / التاجر", loc: tk.pickups[0].name, money: o.totals.total, action: "إعادة تغليف أو بحث عن الطرد", acts: ["open"] });
  });
  S.payments.forEach((p) => { if (p.status === "PENDING") push({ code: "EX-PAY-002", sev: "high", ref: p.id, orderId: p.orderId, problem: `نتيجة دفع معلّقة (${p.gw}) — لا خصم جديد`, since: p.at, slaAt: p.at + 30 * MIN, owner: "المالية", loc: "بوابة الدفع", money: p.amount, action: "استعلم من البوابة وطابِق", acts: ["payok", "payfail"] }); });
  S.cod.forEach((c) => { if (c.variance && !c.varianceResolved) push({ code: "EX-COD-003", sev: "high", ref: c.id, orderId: c.orderId, problem: `فرق كاش ${money(c.variance)} — ${find(S.riders, c.riderId).ar}`, since: c.at, slaAt: c.at + 24 * 3600000, owner: "المالية", loc: "COD", money: Math.abs(c.variance), action: "حدد المسؤول وسجّل التسوية", acts: ["codfix"] }); });
  S.riders.forEach((r) => { if (r.cash >= r.limit && r.status !== "offline") push({ code: "EX-RID-003", sev: r.cash > r.limit ? "high" : "medium", ref: `cash-${r.id}`, orderId: null, riderId: r.id, problem: `${r.ar} فوق حد الكاش (${money(r.cash)} / ${money(r.limit)})`, since: t - 20 * MIN, slaAt: t + 40 * MIN, owner: "المالية", loc: find(S.zones, r.zoneId).ar, money: r.cash, action: "اطلب توريد فوري — مهام الكاش متوقفة", acts: ["rider"] }); });
  S.refunds.forEach((rf) => { if (rf.status === "PENDING_APPROVAL") push({ code: "EX-REF-001", sev: "medium", ref: rf.id, orderId: rf.orderId, problem: `استرداد ${money(rf.amount)} بانتظار موافقة`, since: rf.at, slaAt: rf.at + 60 * MIN, owner: "مشرف الدعم", loc: "الدعم", money: rf.amount, action: "راجع الأدلة واعتمد", acts: ["approvals"] }); });
  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  const specific = new Set(out.filter((a) => a.code !== "EX-SYS-001").map((a) => a.orderId));
  return out.filter((a) => a.code !== "EX-SYS-001" || !specific.has(a.orderId)).sort((a, b) => rank[a.sev] - rank[b.sev] || (a.slaAt - t) - (b.slaAt - t) || b.money - a.money);
};

/* finance views for merchant & rider apps */
TW.merchantToday = (mid) => {
  const S = TW.S, fos = S.fos.filter((f) => f.sourceId === mid && t0day(f.createdAt));
  const lines = (f) => { const o = find(S.orders, f.orderId); return o ? o.lines.filter((l) => l.foId === f.id && l.state !== "removed") : []; };
  const salesLive = sum(fos.filter((f) => ["READY", "HANDED_OVER", "DELIVERED"].includes(f.status)), (f) => sum(lines(f), (l) => l.unitPrice * l.qty));
  const m = find(S.merchants, mid);
  const base = Math.round(m.gmv30 / 30 * 0.55);
  return { newCount: fos.filter((f) => f.status === "AWAITING_ACCEPT").length, preparing: fos.filter((f) => f.status === "PREPARING").length, ready: fos.filter((f) => f.status === "READY").length, sales: base + salesLive, due: sum(S.msettle.filter((s) => s.merchantId === mid && s.status === "DUE"), (s) => s.net), rating: m.rating };
};
function t0day(ts) { return new Date(ts).toDateString() === new Date().toDateString(); }

/* ===================================================================== simulation engine ===================== */
let engineT = null;
function startEngine() { if (engineT) return; engineT = setInterval(tick, 1000); }
TW.tick = tick;
function tick() {
  const S = TW.S; if (!S) return; const t = now(); let changed = false;
  const sysA = TW.actor.system();
  /* merchants */
  S.fos.forEach((f) => {
    if (f.sourceType !== "merchant") return;
    const m = find(S.merchants, f.sourceId); const o = find(S.orders, f.orderId); if (!o || o.hold) return;
    if (f.status === "AWAITING_ACCEPT") {
      if (m.autopilot && S.sim.auto && t - f.createdAt > 5000) { A["fo.accept"]({ foId: f.id }, TW.actor.merchant(m.id)); changed = true; }
      else if (t > f.acceptBy) { f.status = "TIMEOUT"; f.timeoutAt = t; ev(o, "MERCHANT_TIMEOUT", `${m.ar} لم يقبل خلال المهلة (EX-MER-001) — تدخل الكنترول`); m.acceptRate = Math.max(0.5, m.acceptRate - 0.02); changed = true; }
    }
    if (f.status === "PREPARING" && m.autopilot && S.sim.auto && t - f.acceptedAt > 14000 && !f.slaPrepMin) { f.items.forEach((i) => (i.mark = i.mark || "ok")); A["fo.ready"]({ foId: f.id }, TW.actor.merchant(m.id)); changed = true; }
  });
  /* hub picking (auto picker when simulation is on) */
  S.fos.forEach((f) => {
    if (f.sourceType !== "hub") return; const o = find(S.orders, f.orderId); if (!o || o.hold || o.status === "CANCELLED") return;
    if (!S.sim.auto || f.manualPick) return;
    if (f.status === "QUEUED" && t - f.createdAt > 3000) { f.status = "PICKING"; f.pickStart = t; f.picker = "وليد فتحي"; changed = true; }
    if (f.status === "PICKING" && !f.blocked && !f.exception && t - f.pickStart > 4000) {
      const next = o.lines.find((l) => l.foId === f.id && !l.picked && l.state === "ok");
      if (next) { if (S.inv.h1[next.skuId] && S.inv.h1[next.skuId].shelfEmpty) A["hub.pick"]({ foId: f.id, key: next.key, result: "empty" }, { kind: "admin", name: "وليد فتحي", role: "picker", id: "u8" }); else next.picked = true; changed = true; }
      else if (!o.lines.some((l) => l.foId === f.id && l.state === "sub_pending")) { A["hub.pack"]({ foId: f.id }, { kind: "admin", name: "وليد فتحي", role: "picker", id: "u8" }); changed = true; }
    }
  });
  /* substitution timeout → fallback */
  S.orders.forEach((o) => o.lines.forEach((l) => { if (l.state === "sub_pending" && t - l.subAsked > S.rules.subWaitSec * 1000) { applySub(o, l, "remove", null, sysA); ev(o, "SUB_TIMEOUT", "العميل لم يرد على البديل — تطبيق الاحتياطي (حذف البند) (BR-SUB-002)"); changed = true; } }));
  /* dispatch */
  S.tasks.forEach((tk) => {
    const o = find(S.orders, tk.orderId); if (!o || o.hold || ["CANCELLED"].includes(o.status)) return;
    if (tk.status === "WAITING" || tk.status === "OFFERED") {
      const fos = tk.foIds.map((id) => find(S.fos, id));
      const readyish = fos.every((f) => ["PACKED", "READY"].includes(f.status) || (f.status === "PREPARING" && f.prepBy && f.prepBy - t < 4 * MIN && S.sim.auto) || (f.status === "PICKING" && S.sim.auto && f.sourceType === "hub" && !f.blocked && !f.exception));
      if (tk.status === "OFFERED" && tk.offer && t > tk.offer.until) { tk.offers.push({ riderId: tk.offer.riderId, at: tk.offer.at, resp: "timeout", rt: S.rules.riderOfferSec }); tk.offer = null; tk.status = "WAITING"; changed = true; }
      if (tk.status === "OFFERED" && tk.offer) { const r = find(S.riders, tk.offer.riderId); if (r.autopilot && S.sim.auto && t - tk.offer.at > 3000) { A["task.accept"]({ taskId: tk.id, riderId: r.id }, TW.actor.rider(r.id)); changed = true; } }
      if (tk.status === "WAITING" && readyish && S.sim.auto) {
        if (!tk.readySince) tk.readySince = t;
        if (tk.attempts >= S.rules.riderOfferRetries) { tk.status = "NO_RIDER"; ev(o, "NO_RIDER", `${tk.attempts} محاولات عرض بدون قبول — تدخل الكنترول (EX-RID-002)`); changed = true; return; }
        const tried = new Set(tk.offers.map((x) => x.riderId));
        let cands = TW.riderCandidates(tk).filter((c) => c.el.ok && !c.r.task && !tried.has(c.r.id));
        if (S.sim.preferDemo) { const demo = cands.find((c) => c.r.demo); const demoCust = find(S.customers, o.customerId).demo || o.demoRoute; if (demo && demoCust) cands = [demo, ...cands.filter((c) => c !== demo)]; }
        const c = cands[0];
        if (c) { tk.offer = { riderId: c.r.id, at: t, until: t + S.rules.riderOfferSec * 1000, km: c.km }; tk.status = "OFFERED"; tk.attempts++; notify(`rider:${c.r.id}`, "مهمة جديدة!", `${money(tk.earn)} · ${tk.pickups.length} استلام · ${tk.km} كم`, { taskId: tk.id, alert: true }); changed = true; }
      }
    }
    /* movement */
    if (["ASSIGNED", "PICKED_UP"].includes(tk.status) || tk.status === "RTO") {
      const r = find(S.riders, tk.riderId); if (!r) return;
      const target = tk.status === "PICKED_UP" ? tk.drop : tk.status === "RTO" ? tk.pickups[0] : tk.pickups.find((p) => !p.scanned) || tk.pickups[0];
      const from = tk.from || { x: r.x, y: r.y };
      const step = (r.vehicle === "bicycle" ? 0.045 : 0.06) * (S.sim.speed || 1);
      tk.prog = clamp((tk.prog || 0) + step, 0, 1);
      r.x = Math.round(from.x + (target.x - from.x) * tk.prog); r.y = Math.round(from.y + (target.y - from.y) * tk.prog);
      changed = true;
      if (tk.prog >= 1) {
        if (tk.status === "ASSIGNED") { tk.status = "AT_PICKUP"; tk.atPickupAt = t; }
        else if (tk.status === "PICKED_UP" && r.autopilot && S.sim.auto) { A["task.arrive"]({ taskId: tk.id }, TW.actor.rider(r.id)); }
        else if (tk.status === "RTO") { tk.status = "RETURNED"; tk.returnedAt = t; r.task = null; r.status = "online"; const rt = S.returns.find((x) => x.orderId === o.id); if (rt) rt.status = "INSPECTION"; ev(o, "RETURNED", "الطلب رجع للمصدر — بانتظار فحص المرتجع"); if (o.lines.some((l) => l.handling === "hot")) { if (rt) { rt.status = "WASTE"; rt.outcome = "أكل سخن — هالك (BR-RTO-001)"; } } }
      }
    }
    if (tk.status === "AT_PICKUP") { const r = find(S.riders, tk.riderId); if (r && r.autopilot && S.sim.auto && t - (tk.atPickupAt || t) > 2500) { const p = tk.pickups.find((x) => !x.scanned); if (p) { const f = find(S.fos, p.foId); if (["PACKED", "READY"].includes(f.status)) { pickupScan(tk, p.sourceId, { code: f.pickupCode, count: Math.max(1, f.packages.length) }, TW.actor.rider(r.id)); changed = true; } } } }
    if (tk.status === "ARRIVED") { const r = find(S.riders, tk.riderId); if (r && r.autopilot && S.sim.auto && !tk.unreachable && t - (tk.arrivedAt || t) > 3000) { if (tk.cod) tk.collected = tk.cod; A["task.deliver"]({ taskId: tk.id, otp: o.otp }, TW.actor.rider(r.id)); changed = true; } }
  });
  if (changed) { recomputeAll(); emit("tick"); }
  else subs.forEach((fn) => { try { fn("clock"); } catch (e) { /* ignore */ } });
}
})();
