/* Twaa Control Center — Growth (campaigns, segments, offers, referral, merchant acquisition, location expansion)
   and Intelligence (business analytics, unit economics, demand, merchant & rider performance, cohorts, heatmaps).
   Brief §12, §36–§42, §50 (scenarios 9, 12, 13), §51, §58.
   Rules: never mutate TW.S — every change goes through inst.act(). UI state lives in inst.ui under keys prefixed "g"
   (the admin instance is shared with other modules). Charts use the shared TW chart helpers + a few local SVG/HTML
   charts (waterfall, diverging bars, paired bars, heat grid) that follow the same tokens. */
(function () {
const TW = window.TW, D = TW.D, A = TW.A;
const { ic, esc, num, money, kmoney, pct, chip, table, kpi, meter, tip, sum, clamp } = TW;
const S = () => TW.S;
const byId = (arr, id) => arr.find((x) => x.id === id);
const DAY = 864e5;

/* ======================================================================= shared bits ===================== */
const uiv = (inst, k, d) => { const v = inst.ui["g" + k]; return v == null || v === "" ? d : v; };
const seg = (k, cur, opts, label) => `<div class="seg g-seg" role="tablist"${label ? ` aria-label="${esc(label)}"` : ""}>${opts.map(([v, l]) => `<button type="button" class="${String(cur) === String(v) ? "on" : ""}" data-act="ui" data-k="g${k}" data-v="${esc(v)}" role="tab" aria-selected="${String(cur) === String(v)}">${esc(l)}</button>`).join("")}</div>`;
const sel = (k, cur, opts, attrs = "") => `<select class="input" data-model="g${k}" ${attrs}>${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(cur) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
const field = (label, inner, cls = "") => `<label class="field ${cls}"><span>${esc(label)}</span>${inner}</label>`;
const banner = (html, tone = "brand", icon = "sparkle") => `<div class="banner ${tone}">${ic(icon, "ic sm")}<div>${html}</div></div>`;
const src = (t) => `<span class="g-src">${esc(t)}</span>`;
const signed = (v, d = 1) => { const z = Math.abs(v) < 0.5 * Math.pow(10, -d); return `\u2066${z ? "" : v > 0 ? "+" : "−"}${num(z ? 0 : Math.abs(v), d)}\u2069`; };
const smoney = (v, d = 1) => `${signed(v, d)} ج.م`;
/* card with a chart ⇄ table switch (every important chart has a table view) */
function viz(inst, id, title, sub, chart, tbl, opts = {}) {
  const t = !!inst.ui["gT" + id];
  return `<div class="card g-viz ${opts.cls || ""}"${opts.hl ? ` data-hl="${opts.hl}"` : ""}><div class="hd"><div class="grow"><h3>${title}</h3>${sub ? `<p class="g-sub">${sub}</p>` : ""}</div>${tbl ? `<button type="button" class="btn sm ghost" data-act="ui-toggle" data-k="gT${id}" aria-pressed="${t}">${ic(t ? "chart" : "list", "ic xs")}<span>${t ? "الرسم" : "الجدول"}</span></button>` : ""}</div>${opts.top || ""}${t ? tbl : chart}${opts.foot || ""}</div>`;
}
const niceStep = (range, n) => { const raw = range / n || 1; const p = Math.pow(10, Math.floor(Math.log10(raw))); return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= raw) || raw; };

/* waterfall: items = [{label, short, value, kind:'rev'|'cost'|'total'}] — revenue (c3) up, costs (c2) down, totals (c1) from zero */
function waterfall(items, o = {}) {
  const W = o.w || 680, H = o.h || 250, pl = 42, pr = 8, pt = 22, pb = 44;
  let run = 0;
  const bars = items.map((it) => { if (it.kind === "total") { run = it.value; return { ...it, y0: 0, y1: it.value }; } const y0 = run; run += it.value; return { ...it, y0, y1: run }; });
  const vals = bars.flatMap((b) => [b.y0, b.y1]);
  const mx = Math.max(1, ...vals) * 1.12, mn = Math.min(0, ...vals) * 1.12;
  const sy = (v) => pt + ((H - pt - pb) * (mx - v)) / (mx - mn || 1);
  const bw = (W - pl - pr) / bars.length, st = niceStep(mx - mn, 5);
  let g = "";
  for (let t = Math.ceil(mn / st) * st; t <= mx + 1e-9; t += st) g += `<line x1="${pl}" x2="${W - pr}" y1="${sy(t).toFixed(1)}" y2="${sy(t).toFixed(1)}" class="grid"/><text x="${pl - 6}" y="${(sy(t) + 4).toFixed(1)}" class="ax" text-anchor="end">${num(t, st % 1 ? 1 : 0)}</text>`;
  g += `<line x1="${pl}" x2="${W - pr}" y1="${sy(0).toFixed(1)}" y2="${sy(0).toFixed(1)}" class="g-zero"/>`;
  bars.forEach((b, i) => {
    const x = pl + i * bw + bw * 0.14, w = bw * 0.72, top = sy(Math.max(b.y0, b.y1)), h = Math.max(1.5, Math.abs(sy(b.y0) - sy(b.y1)));
    const tone = b.kind === "total" ? (b.value < 0 ? "bad" : "brand") : b.value >= 0 ? "teal" : "accent";
    g += `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="3" class="bar b-${tone}"${tip(`${b.label}: ${smoney(b.value, 1)}${b.kind === "total" ? "" : ` · التراكمي ${money(b.y1, 1)}`}`)} tabindex="0"/>`;
    if (i < bars.length - 1) g += `<line class="g-conn" x1="${(x + w).toFixed(1)}" x2="${(x + bw).toFixed(1)}" y1="${sy(b.y1).toFixed(1)}" y2="${sy(b.y1).toFixed(1)}"/>`;
    const ly = b.value >= 0 ? top - 6 : top + h + 13;
    g += `<text class="g-vl" x="${(x + w / 2).toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${b.kind === "total" ? num(b.value, 1) : signed(b.value, 1)}</text>`;
    const parts = String(b.short || b.label).split("\n");
    parts.forEach((p, k) => (g += `<text x="${(x + w / 2).toFixed(1)}" y="${H - pb + 16 + k * 13}" class="ax" text-anchor="middle">${esc(p)}</text>`));
  });
  return `<svg class="chart g-wf" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || "")}" style="direction:ltr">${g}</svg>`;
}
/* diverging horizontal bars around zero (positive c3 / negative c2) */
function divBars(rows, o = {}) {
  const mx = Math.max(1e-9, ...rows.map((r) => Math.abs(r.value))); const f = o.fmt || ((v) => signed(v, 1));
  return `<div class="g-div">${rows.map((r) => { const w = (Math.abs(r.value) / mx) * 50; const neg = r.value < 0; return `<div class="g-dr"${tip(`${r.label}: ${f(r.value)}${r.sub ? " · " + r.sub : ""}`)}><span class="g-dl">${esc(r.label)}</span><span class="g-dt"><i class="${neg ? "b-accent neg" : "b-teal pos"}" style="width:${w.toFixed(1)}%"></i><b class="g-d0"></b></span><span class="g-dv num">${f(r.value)}</span></div>`; }).join("")}</div>`;
}
/* two series per row (c1 = first series, c2 = second) */
function pairBars(rows, names, o = {}) {
  const mx = Math.max(1, ...rows.flatMap((r) => [r.a, r.b])); const f = o.fmt || ((v) => num(v));
  return `${TW.legend([[names[0], "brand"], [names[1], "accent"]])}<div class="g-pair">${rows.map((r) => `<div class="g-pr"${tip(`${r.label} · ${names[0]}: ${f(r.a)} · ${names[1]}: ${f(r.b)}`)}><span class="g-pl">${esc(r.label)}</span><span class="g-pt"><i class="b-brand" style="width:${((r.a / mx) * 100).toFixed(1)}%"></i><i class="b-accent" style="width:${((r.b / mx) * 100).toFixed(1)}%"></i></span><span class="g-pv num">${f(r.a)}<small> / ${f(r.b)}</small></span></div>`).join("")}</div>`;
}
/* sequential single-hue scale: 6 steps of --c1 mixed into the surface */
const qStep = (v, max) => (v == null || !max ? -1 : clamp(Math.floor((v / max) * 6), 0, 5));
const qLegend = (max, fmt = (v) => num(v)) => `<div class="g-qleg" aria-label="مفتاح الألوان">${[0, 1, 2, 3, 4, 5].map((i) => `<span><i class="g-q${i}"></i>${fmt((max * i) / 6)}–${fmt((max * (i + 1)) / 6)}</span>`).join("")}</div>`;

/* ======================================================================= vocabularies ===================== */
const CH = { push: ["إشعار التطبيق", 0.62, 0], whatsapp: ["واتساب", 0.85, 0.35], sms: ["SMS", 0.97, 0.22], "in-app": ["داخل التطبيق", 0.45, 0] };
const chList = (s) => String(s || "").split("+").filter(Boolean);
const chAr = (s) => chList(s).map((c) => (CH[c] || [c])[0]).join(" + ") || "—";
const GOALS = [["acquisition", "استقطاب عملاء جدد", 0.03], ["first order", "أول طلب", 0.09], ["second order", "الطلب التاني", 0.14], ["category adoption", "تجربة قسم جديد", 0.06], ["winback", "استرجاع المتوقفين", 0.07], ["merchant launch", "إطلاق تاجر", 0.05], ["zone launch", "إطلاق منطقة", 0.08], ["basket increase", "تكبير السلة", 0.06]];
const goalAr = (g) => (GOALS.find((x) => x[0] === g) || [g, g])[1];
const SCHED = ["فوراً بعد الإنشاء", "الخميس 6 م", "الجمعة 11 ص", "يومياً 7 م لمدة أسبوع", "تلقائي بعد أول طلب بـ 3 أيام", "عند فتح المنطقة"];
const PROMO_ST = { active: ["مفعّل", "ok"], paused: ["موقوف", "neutral"], pending_approval: ["بانتظار موافقة", "warn"], ended: ["منتهي", "neutral"], rejected: ["مرفوض", "bad"], draft: ["مسودة", "neutral"] };
const promoChip = (p) => { const [l, t] = PROMO_ST[p.status] || [p.status, "neutral"]; return chip(l, t); };
const CP_ST = { running: ["شغالة", "ok"], scheduled: ["جاهزة للإطلاق", "info"], draft: ["مسودة", "neutral"], done: ["انتهت", "neutral"] };
const FUND = { twaa: ["توّا", "brand"], merchant: ["التاجر", "info"], shared: ["مشترك 50/50", "accent"] };
const EXP = { not_ready: ["غير جاهزة", "neutral", "Not Ready"], merchants_needed: ["تحتاج استقطاب تجار", "warn", "Merchant Acquisition Needed"], riders_needed: ["تحتاج سعة مناديب", "warn", "Rider Capacity Needed"], pilot_ready: ["جاهزة للتجربة", "info", "Pilot Ready"], pilot: ["تجريبية مفعّلة", "accent", "Live · Pilot"], live: ["تعمل", "ok", "Live"] };
const expChip = (s) => { const [l, t] = EXP[s] || [s, "neutral"]; return chip(l, t); };
const MCLASS = { new: ["جديد", "info"], healthy: ["سليم", "ok"], watch: ["مراقبة", "warn"], restricted: ["مقيّد", "bad"], suspended: ["موقوف", "bad"] };
const mClassChip = (m) => (m.status === "pending" ? chip("قيد التفعيل", "neutral") : chip(...(MCLASS[m.health] || [m.health, "neutral"])));
const OFFER_TPL = [
  { id: "t4", name: "10% على التاجر الجديد (ممول من التاجر)", type: "percent", value: 10, cap: 30, minBasket: 100, funding: "merchant", goal: "merchant launch", budget: 8000, limit: 3, days: 14 },
  { id: "t3", name: "توصيل مجاني فوق 150 للقرى (مشترك)", type: "freedelivery", value: 0, minBasket: 150, funding: "shared", goal: "zone launch", budget: 10000, limit: 3, days: 14 },
  { id: "t1", name: "خصم 25% على أول طلب (توّا)", type: "percent", value: 25, cap: 80, minBasket: 120, funding: "twaa", goal: "first order", budget: 20000, limit: 1, days: 21, segment: "sg-new" },
  { id: "t2", name: "40 ج.م خصم فوق 250 للمتوقفين (توّا)", type: "fixed", value: 40, minBasket: 250, funding: "twaa", goal: "winback", budget: 15000, limit: 1, days: 10, segment: "sg-lapsed" },
];
const BASE_CUSTOMERS = 5200; /* registered customer base used for segment estimates */
const GAP_TYPES = [["supermarket", "سوبر ماركت", false, 0.38, ["supermarket", "grocery"]], ["pharmacy", "صيدلية", true, 0.09, ["pharmacy"]], ["bakery", "مخبز", false, 0.1, ["bakery"]], ["butcher", "جزارة", true, 0.09, ["butcher"]], ["produce", "خضري", false, 0.12, ["produce"]], ["restaurant", "مطعم", false, 0.22, ["restaurant"]]];
const LEAD_REASONS_FWD = ["المرحلة اكتملت", "زيارة ميدانية تمت", "اتفاق على العمولة والشروط", "المستندات اكتملت ومراجعة", "الكتالوج اتجهز من الكتالوج الرئيسي", "التدريب الأول اتعمل على التطبيق", "متابعة تليفونية"];
const LEAD_REASONS_BACK = ["مستند ناقص أو غير صالح", "التاجر طلب تأجيل", "إعادة تفاوض على العمولة", "تصحيح خطأ في التسجيل"];

/* ======================================================================= shared derived data ===================== */
function zoneMetrics(z) {
  const s = S(), w = s.waitlist[z.id] || null, zs = s.hist.zoneStats[z.id];
  const local = s.merchants.filter((m) => m.status === "active" && m.zoneId === z.id);
  const localPh = local.filter((m) => m.type === "pharmacy").length;
  const corePh = s.merchants.some((m) => m.type === "pharmacy" && m.status === "active" && (byId(s.zones, m.zoneId) || {}).type === "core");
  const pipeline = s.leads.filter((l) => l.zoneId === z.id && l.stage < 8);
  const demand = zs && z.active && !(w && w.users) ? zs.orders : w ? w.demandDay : zs ? zs.orders : 0;
  const cpo = w && w.costPerOrder ? w.costPerOrder : zs ? zs.cpo : 30;
  const be = w ? w.beOrders : null;
  const trips = z.route === "scheduled" ? Math.max(1, (z.windows || []).length) : null;
  const density = trips ? demand / trips / 2 : zs ? zs.opt : 1; /* scheduled: 2 riders per window */
  const riders = s.riders.filter((r) => !r.suspended && (z.riderType || []).includes(r.vehicle)).length;
  const ridersNeeded = Math.ceil(demand / 14);
  const nearby = w ? w.merchants : local.length;
  const pharmacy = localPh ? `صيدلية محلية (${localPh})` : z.active && corePh ? "من المدينة فقط" : w && w.pharmacy ? `${w.pharmacy} قريبة (غير مسجلة)` : "لا توجد";
  const phOk = localPh > 0 || (w && w.pharmacy > 0);
  const cmOrder = zs && z.active ? zs.cm : +(11.4 - (cpo - 24)).toFixed(1);
  let suggest;
  if (z.active) suggest = s.expansion[z.id] === "pilot" ? "pilot" : "live";
  else if (be && demand < be * 0.6) suggest = "not_ready";
  else if (nearby < 3 || !phOk) suggest = "merchants_needed";
  else if (riders < ridersNeeded) suggest = "riders_needed";
  else suggest = "pilot_ready";
  return { w, zs, local, localPh, pipeline, demand, cpo, be, trips, density, riders, ridersNeeded, nearby, pharmacy, phOk, cmOrder, suggest, users: w ? w.users : 0, searches: w ? w.searches : 0, attempts: w ? w.attempts : 0 };
}
function campaignEcon(cp) {
  const p = cp.offer && byId(S().promos, cp.offer); const imp = p ? TW.promoImpact(p) : null;
  const msg = (cp.sent || 0) * sum(chList(cp.channel), (c) => (CH[c] || [0, 0, 0])[2]);
  const promo = (cp.ordered || 0) * (imp ? imp.twaaCost : 0);
  const cost = msg + promo;
  return { p, imp, msg, promo, cost, roi: cost > 0 ? cp.incContribution / cost : null };
}
function ueModel(aov, rider, promoShare) {
  const items = [
    { label: "هامش منتجات توّا (الهب)", short: "هامش\nالهب", value: aov * 0.098, kind: "rev" },
    { label: "عمولة التجار", short: "عمولة\nالتجار", value: aov * 0.042, kind: "rev" },
    { label: "رسوم التوصيل", short: "رسوم\nالتوصيل", value: 14, kind: "rev" },
    { label: "رسوم الخدمة", short: "رسوم\nالخدمة", value: 5, kind: "rev" },
    { label: "تكلفة العروض الممولة من توّا", short: "العروض", value: -promoShare * 22, kind: "cost" },
    { label: "رسوم الدفع والتحصيل", short: "رسوم\nالدفع", value: -1.8, kind: "cost" },
    { label: "تكلفة المندوب", short: "المندوب", value: -rider, kind: "cost" },
    { label: "تجميع وتغليف", short: "تجميع\nوتغليف", value: -7, kind: "cost" },
    { label: "استرداد وتعويضات", short: "استرداد\nوتعويض", value: -aov * 0.006, kind: "cost" },
    { label: "تشغيل متغير (دعم، أكياس، مرتجعات)", short: "تشغيل\nمتغير", value: -2, kind: "cost" },
  ];
  const cm = sum(items, (x) => x.value);
  const beAov = Math.max(0, -(14 + 5 - promoShare * 22 - 1.8 - rider - 7 - 2) / (0.14 - 0.006));
  return { items, cm, beAov };
}
const liveOrders = () => S().orders.filter((o) => o.status !== "CANCELLED");
function liveLedger() {
  const os = liveOrders(); const ls = os.map((o) => ({ o, L: TW.ledger(o) }));
  const avg = (f) => (ls.length ? sum(ls, f) / ls.length : 0);
  const pick = (L, re) => sum(L.lines.filter(([l]) => re.test(l)), (x) => x[1]);
  const items = [
    { label: "هامش منتجات توّا (الهب)", short: "هامش\nالهب", value: avg((x) => pick(x.L, /هامش منتجات/)), kind: "rev" },
    { label: "عمولة التجار", short: "عمولة\nالتجار", value: avg((x) => pick(x.L, /عمولة/)), kind: "rev" },
    { label: "رسوم التوصيل", short: "رسوم\nالتوصيل", value: avg((x) => pick(x.L, /رسوم التوصيل/)), kind: "rev" },
    { label: "رسوم الخدمة", short: "رسوم\nالخدمة", value: avg((x) => pick(x.L, /رسوم الخدمة/)), kind: "rev" },
    { label: "خصم ممول من توّا", short: "العروض", value: avg((x) => pick(x.L, /خصم ممول/)), kind: "cost" },
    { label: "رسوم بوابة الدفع / تحصيل", short: "رسوم\nالدفع", value: avg((x) => pick(x.L, /رسوم بوابة/)), kind: "cost" },
    { label: "تكلفة المندوب", short: "المندوب", value: avg((x) => pick(x.L, /تكلفة المندوب/)), kind: "cost" },
    { label: "تجميع وتغليف", short: "تجميع\nوتغليف", value: avg((x) => pick(x.L, /تجميع/)), kind: "cost" },
    { label: "استرداد وتعويضات وفروق بدائل", short: "استرداد\nوتعويض", value: avg((x) => pick(x.L, /استرداد|تعويضات|فرق البديل/)), kind: "cost" },
    { label: "تشغيل متغير (مخصص ثابت 2 ج.م/طلب)", short: "تشغيل\nمتغير", value: ls.length ? -2 : 0, kind: "cost" },
  ];
  return { n: ls.length, items, cm: sum(items, (x) => x.value), aov: avg((x) => x.L.gmv), rows: ls };
}

/* ======================================================================= shared handlers ===================== */
const ON = {
  "g-go"(inst, d) { inst.go(d.to); },
  /* campaigns */
  "g-ch"(inst, d) { const cur = chList(inst.ui.gCpCh != null ? inst.ui.gCpCh : "push+whatsapp"); const nx = cur.includes(d.v) ? cur.filter((c) => c !== d.v) : [...cur, d.v]; inst.ui.gCpCh = nx.join("+"); inst.render(); },
  "g-guard"(inst) { const on = uiv(inst, "CpGuard", "1") === "1"; if (on && !TW.can("promo.approve")) return TW.toast("إيقاف حارس الهامش يحتاج صلاحية «اعتماد عرض تحت حد الهامش»", "bad"); inst.ui.gCpGuard = on ? "0" : "1"; inst.render(); },
  "g-offer-quick"(inst) {
    const t = OFFER_TPL.find((x) => x.id === uiv(inst, "CpTpl", "t4")); if (!t) return;
    const r = inst.act("promo.create", { name: t.name, type: t.type, value: t.value, cap: t.cap, minBasket: t.minBasket, funding: t.funding, goal: t.goal, budget: t.budget, limit: t.limit, days: t.days, segment: t.segment });
    if (r && r.ok !== false) { inst.ui.gCpOffer = r.promo.id; inst.ui.gCpGoal = t.goal; TW.toast(r.promo.status === "pending_approval" ? `العرض ${r.promo.id} تحت حد الهامش — اتبعت لمركز الموافقات` : `العرض ${r.promo.id} اتفعّل واتربط بالحملة`, r.promo.status === "pending_approval" ? "" : "ok"); inst.render(); }
  },
  "g-cp-create"(inst) {
    const P = cpPreview(inst);
    if (!P.seg) return TW.toast("اختار الجمهور", "bad");
    if (!chList(P.ch).length) return TW.toast("اختار قناة واحدة على الأقل", "bad");
    const name = (inst.ui.gCpName || "").trim() || `${goalAr(P.goal)} — ${P.seg.ar}`;
    const r = inst.act("campaign.create", { name, audience: P.seg.id, offer: P.p ? P.p.id : null, channel: P.ch, schedule: P.sched, budget: P.budget, guard: P.guard, goal: P.goal });
    if (r && r.ok !== false) { inst.ui.gCpName = ""; inst.ui.gCpLast = r.campaign.id; TW.toast(`اتعملت الحملة ${r.campaign.id} — ${P.block ? "مستنية اعتماد العرض قبل الإطلاق" : "جاهزة للإطلاق"}`, "ok"); inst.render(); }
  },
  "g-cp-launch"(inst, d) { const r = inst.act("campaign.launch", { id: d.id }); if (r && r.ok !== false) { const cp = byId(S().campaigns, d.id); TW.toast(`الحملة انطلقت: ${num(cp.sent)} رسالة بعد حد التكرار`, "ok"); } },
  /* segments */
  "g-seg-create"(inst) { const P = segPreview(inst); const name = (inst.ui.gSgName || "").trim() || P.autoName; const r = inst.act("segment.create", { name, rule: P.rule, size: P.size }); if (r && r.ok !== false) { inst.ui.gSgName = ""; TW.toast(`اتعملت الشريحة «${name}» — ${num(P.size)} عميل تقريباً`, "ok"); } },
  "g-seg-use"(inst, d) { inst.ui.gCpAud = d.id; inst.go("/admin/campaigns"); },
  "g-seg-reset"(inst) { Object.keys(inst.ui).filter((k) => k.startsWith("gSd_")).forEach((k) => delete inst.ui[k]); inst.render(); },
  /* offers */
  "g-promo-toggle"(inst, d) { const p = byId(S().promos, d.id); const r = inst.act("promo.toggle", { promoId: d.id }); if (r && r.ok !== false) TW.toast(p.status === "active" ? `${p.code || p.id} اتفعّل تاني` : `${p.code || p.id} اتوقف — مفيش استخدامات جديدة`, "ok"); },
  /* acquisition */
  "g-lead"(inst, d) { inst.ui.gLead = d.id; inst.render(); },
  "g-lead-move"(inst, d) {
    const l = byId(S().leads, d.id); const dir = Number(d.dir); const to = clamp(l.stage + dir, 0, D.leadStages.length - 1); if (to === l.stage) return;
    inst.ui.gLead = l.id;
    A.ask(inst, { title: `${l.ar}: «${D.leadStages[l.stage]}» ← «${D.leadStages[to]}»`, action: "lead.move", payload: { leadId: l.id, stage: to }, field: "note", reasons: dir > 0 ? LEAD_REASONS_FWD : LEAD_REASONS_BACK, confirm: dir > 0 ? "انقل للمرحلة التالية" : "رجّع مرحلة", note: leadMoveNote(l, to), done: `${l.id} بقى في «${D.leadStages[to]}»` });
  },
  "g-lead-jump"(inst, d) {
    const l = byId(S().leads, d.id); inst.ui.gLead = l.id;
    A.ask(inst, { title: `نقل ${l.ar} لمرحلة محددة`, action: "lead.move", payload: { leadId: l.id }, field: "note", extra: [{ k: "stage", label: "المرحلة الجديدة", type: "select", options: D.leadStages.map((s, i) => [i, `${i + 1}. ${s}`]), value: Math.min(l.stage + 1, 10) }], reasons: [...LEAD_REASONS_FWD, ...LEAD_REASONS_BACK], confirm: "انقل", note: "النقل بيتسجّل في تاريخ العميل المحتمل وسجل التدقيق. من «تجهيز الكتالوج» بيتجهّز كتالوج مبدئي من الكتالوج الرئيسي تلقائياً." });
  },
  "g-lead-create"(inst) {
    const name = (inst.ui.gLdName || "").trim(); if (name.length < 3) return TW.toast("اكتب اسم المحل (3 حروف على الأقل)", "bad");
    const type = uiv(inst, "LdType", "pharmacy"), zoneId = uiv(inst, "LdZone", "wafaeya");
    const r = inst.act("lead.create", { name, owner: (inst.ui.gLdOwner || "").trim() || "—", type, zoneId, opportunity: (inst.ui.gLdOpp || "").trim() || `${D.merchantTypes[type]} في ${A.zone(zoneId)}` });
    if (r && r.ok !== false) { inst.ui.gLdName = ""; inst.ui.gLdOwner = ""; inst.ui.gLdOpp = ""; inst.ui.gLead = r.lead.id; inst.ui.gNewLead = false; TW.toast(`اتضاف ${r.lead.id} في «${D.leadStages[0]}»`, "ok"); inst.render(); }
  },
  "g-gap"(inst, d) {
    const gt = GAP_TYPES.find((x) => x[0] === d.t); const z = byId(S().zones, d.z);
    const r = inst.act("lead.create", { name: `${gt[1]} مطلوب${gt[2] ? "ة" : ""} — ${z.ar}`, type: gt[0], zoneId: z.id, opportunity: gapSentence(z, gt) });
    if (r && r.ok !== false) { inst.ui.gLead = r.lead.id; TW.toast(`اتعملت فرصة ${r.lead.id}: ${gapSentence(z, gt)}`, "ok"); inst.render(); }
  },
  /* expansion */
  "g-exp-zone"(inst, d) { inst.ui.gExpZone = d.id; inst.render(); },
  "g-exp-status"(inst, d, el) { const z = byId(S().zones, d.z); const r = inst.act("expansion.status", { zoneId: d.z, status: el.value }); if (r && r.ok !== false) TW.toast(`جاهزية ${z.ar}: ${EXP[el.value][0]}`, "ok"); },
  "g-launch"(inst, d) { inst.ui.modal = { kind: "g-launch", zoneId: d.id }; inst.ui.gLnReason = LAUNCH_REASONS[0]; inst.ui.gLnNote = ""; inst.render(); },
  "g-launch-submit"(inst) {
    const m = inst.ui.modal; const z = byId(S().zones, m.zoneId);
    const before = new Set(S().leads.map((l) => l.id));
    const note = (inst.ui.gLnNote || "").trim();
    const r = inst.act("zone.launch", { zoneId: z.id, reason: `${uiv(inst, "LnReason", LAUNCH_REASONS[0])}${note ? " — " + note : ""}` });
    if (r && r.ok !== false) {
      const ph = S().leads.filter((l) => l.zoneId === z.id && l.type === "pharmacy").sort((x, y) => (before.has(x.id) ? 0 : -1) - (before.has(y.id) ? 0 : -1) || y.stage - x.stage)[0];
      inst.ui.gLaunch = { zoneId: z.id, notified: r.notified || 0, leadId: ph ? ph.id : null, created: ph ? !before.has(ph.id) : false, at: Date.now(), by: TW.actor.admin().name };
      inst.ui.modal = null; TW.toast(`${z.ar} بقت منطقة خدمة تجريبية — ${num(r.notified || 0)} عميل في قائمة الانتظار هيتبلغوا`, "ok"); inst.render();
    }
  },
  "g-exp-lead"(inst, d) { const z = byId(S().zones, d.id); const m = zoneMetrics(z); inst.ui.modal = { kind: "g-exp-lead", zoneId: z.id }; inst.ui.gElType = !m.phOk ? "pharmacy" : m.nearby < 3 ? "supermarket" : "grocery"; inst.ui.gElName = ""; inst.render(); },
  "g-exp-lead-submit"(inst) {
    const m = inst.ui.modal; const z = byId(S().zones, m.zoneId); const type = uiv(inst, "ElType", "pharmacy"); const tAr = D.merchantTypes[type];
    const name = (inst.ui.gElName || "").trim() || `${tAr} مطلوب — ${z.ar}`;
    const r = inst.act("lead.create", { name, type, zoneId: z.id, opportunity: `مهمة استقطاب من لوحة التوسع: ${z.ar} محتاجة ${tAr}` });
    if (r && r.ok !== false) { inst.ui.modal = null; inst.ui.gLead = r.lead.id; TW.toast(`اتعملت مهمة استقطاب ${r.lead.id} — تابعها في خط المبيعات`, "ok"); inst.render(); }
  },
};
const LAUNCH_REASONS = ["قائمة انتظار وطلب فوق نقطة التعادل", "طلب تجريبي من الشركاء", "تاجر رئيسي جاهز في القرية", "موسم (رمضان / مدارس / حصاد)"];
const page = (key, render, extra = {}) => TW.page(key, { render, on: { ...ON, ...(extra.on || {}) } });

/* ======================================================================= GROWTH · Campaigns ===================== */
function cpPreview(inst) {
  const s = S();
  const seg_ = byId(s.segments, uiv(inst, "CpAud", "sg-lapsed")) || s.segments[0];
  const offerId = uiv(inst, "CpOffer", "PR-12"); const p = offerId === "none" ? null : byId(s.promos, offerId);
  const ch = inst.ui.gCpCh != null ? inst.ui.gCpCh : "push+whatsapp";
  const goal = uiv(inst, "CpGoal", "winback"), sched = uiv(inst, "CpSched", SCHED[1]);
  const budget = Math.max(0, Number(uiv(inst, "CpBudget", 6000)) || 0);
  const guard = uiv(inst, "CpGuard", "1") === "1";
  const size = seg_ ? seg_.size : 0;
  const running = s.campaigns.filter((c) => c.status === "running");
  const capRate = clamp(running.length * 0.08, 0, 0.35);
  const capped = Math.round(size * capRate), eligible = size - capped;
  const chs = chList(ch);
  const reachRate = 1 - chs.reduce((a, c) => a * (1 - (CH[c] || [0, 0])[1]), 1);
  const reach = Math.round(eligible * reachRate);
  const conv = (GOALS.find((g) => g[0] === goal) || [0, 0, 0.06])[2] * (p ? 1.35 : 1);
  let orders = Math.round(reach * conv);
  const imp = p ? TW.promoImpact(p) : null;
  const msgCost = eligible * sum(chs, (c) => (CH[c] || [0, 0, 0])[2]);
  const per = imp ? imp.twaaCost : 0;
  let promoCost = orders * per, cost = msgCost + promoCost, budgetCapped = false;
  if (cost > budget && per > 0) { const o2 = Math.max(0, Math.floor((budget - msgCost) / per)); if (o2 < orders) { orders = o2; budgetCapped = true; } promoCost = orders * per; cost = msgCost + promoCost; }
  const incPer = p ? p.incContribution || (imp && imp.incremental) || 0 : 8.5;
  const inc = orders * incPer - msgCost;
  let gs;
  if (!p) gs = ["ok", "بدون خصم — الحملة رسالة بس ومفيش أثر على هامش الطلب."];
  else if (p.status === "pending_approval") gs = ["block", `العرض ${esc(p.code || p.id)} بانتظار موافقة (مساهمة الطلب بعد الخصم ${num(imp.cmPerOrder, 1)} ج.م أقل من الحد ${num(s.rules.minContribution)} ج.م). الحملة هتتعمل لكن <b>مش هتنطلق</b> قبل الاعتماد.`];
  else if (p.status !== "active") gs = ["block", `العرض ${esc(p.code || p.id)} ${PROMO_ST[p.status] ? PROMO_ST[p.status][0] : p.status} — فعّله الأول أو اختار عرض تاني.`];
  else if (imp.belowGuard) gs = ["warn", `مساهمة الطلب بعد الخصم ${num(imp.cmPerOrder, 1)} ج.م تحت الحد ${num(s.rules.minContribution)} ج.م — العرض معتمد استثنائياً لهدف «${goalAr(p.goal)}». راقب العائد الإضافي.`];
  else gs = ["ok", `مساهمة الطلب بعد الخصم ${num(imp.cmPerOrder, 1)} ج.م ≥ الحد ${num(s.rules.minContribution)} ج.م.`];
  return { seg: seg_, p, imp, ch, goal, sched, budget, guard, size, capped, eligible, reach, reachRate, orders, msgCost, promoCost, cost, inc, incPer, roi: cost > 0 ? inc / cost : null, gs, block: gs[0] === "block", budgetCapped, running };
}
page("campaigns", (inst) => {
  const s = S(), cps = s.campaigns;
  const run = cps.filter((c) => c.status === "running");
  const sent = sum(cps, (c) => c.sent), opened = sum(cps, (c) => c.opened), ordered = sum(cps, (c) => c.ordered), inc = sum(cps, (c) => c.incContribution);
  const econ = cps.map((c) => ({ c, e: campaignEcon(c) }));
  const totalCost = sum(econ, (x) => x.e.cost);
  const blocked = econ.filter(({ c, e }) => ["draft", "scheduled"].includes(c.status) && c.guard && e.p && e.p.status !== "active");
  const best = econ.filter((x) => x.e.roi != null).sort((a, b) => b.e.roi - a.e.roi)[0];
  const rows = econ.map(({ c, e }) => {
    const sg = byId(s.segments, c.audience); const isBlocked = blocked.some((b) => b.c.id === c.id);
    const [stl, stt] = CP_ST[c.status] || [c.status, "neutral"];
    const actCell = ["draft", "scheduled"].includes(c.status) ? `<div class="col gap4">${A.permBtn("promo.create", "أطلق", "g-cp-launch", { cls: "sm primary", icon: "play", data: { id: c.id } })}${isBlocked ? `<span class="g-why">${ic("lock", "ic xs")} العرض ${esc(e.p.code || e.p.id)} ${esc(PROMO_ST[e.p.status][0])} — <button class="btn sm ghost g-link" data-act="g-go" data-to="/admin/approvals">مركز الموافقات</button></span>` : ""}</div>` : `<span class="muted">—</span>`;
    return `<tr class="${c.id === inst.ui.gCpLast ? "g-new" : ""}"><td><b>${esc(c.name)}</b><span class="sub"><span class="mono">${esc(c.id)}</span> · ${esc(goalAr(c.goal))} · ${esc(c.schedule)}</span></td><td>${esc(sg ? sg.ar : c.audience)}<span class="sub num">${num(c.size || (sg && sg.size))} عميل</span></td><td>${e.p ? `<span class="mono">${esc(e.p.code || e.p.id)}</span> ${promoChip(e.p)}` : `<span class="muted">بدون خصم</span>`}</td><td>${esc(chAr(c.channel))}</td><td>${chip(stl, stt)}${c.guard ? ` <span class="g-ico"${tip("حارس الهامش مفعّل")}>${ic("shield", "ic xs")}</span>` : ""}</td><td class="n num">${num(c.sent)}</td><td class="n num">${num(c.opened)}<span class="sub">${c.sent ? pct(c.opened / c.sent) : "—"}</span></td><td class="n num">${num(c.ordered)}<span class="sub">${c.sent ? pct(c.ordered / c.sent, 1) : "—"}</span></td><td class="n num">${money(c.incContribution)}<span class="sub">تكلفة ${money(e.cost)}</span></td><td class="n num">${e.roi == null ? "—" : `${num(e.roi, 1)}×`}</td><td>${actCell}</td></tr>`;
  }).join("");
  const P = cpPreview(inst);
  const segOpts = s.segments.map((x) => [x.id, `${x.ar} — ${num(x.size)}`]);
  const offerOpts = [["none", "بدون خصم (رسالة فقط)"], ...s.promos.filter((p) => !["ended", "rejected"].includes(p.status)).map((p) => [p.id, `${p.code || p.id} — ${p.name} (${(PROMO_ST[p.status] || [p.status])[0]})`])];
  const tpl = OFFER_TPL.find((x) => x.id === uiv(inst, "CpTpl", "t4"));
  const tImp = TW.promoImpact({ ...tpl, share: tpl.funding === "shared" ? 0.5 : tpl.funding === "twaa" ? 1 : 0 });
  const chBtns = Object.entries(CH).map(([k, [l, r, c]]) => `<button type="button" class="g-tog ${chList(P.ch).includes(k) ? "on" : ""}" data-act="g-ch" data-v="${k}" aria-pressed="${chList(P.ch).includes(k)}">${ic(k === "whatsapp" ? "chat" : k === "sms" ? "mobile" : k === "push" ? "bell" : "sparkle", "ic xs")}${esc(l)}<small>${pct(r)} وصول${c ? ` · ${num(c, 2)} ج.م` : ""}</small></button>`).join("");
  const form = `<div class="card" data-hl="campaign-builder"><h3>${ic("sparkle", "ic sm")} منشئ الحملات</h3>
    <div class="grid g2">
      ${field("1. الجمهور (شريحة)", sel("CpAud", P.seg.id, segOpts))}
      ${field("7. الهدف", sel("CpGoal", P.goal, GOALS.map(([k, l]) => [k, l])))}
      ${field("2. العرض", sel("CpOffer", P.p ? P.p.id : "none", offerOpts))}
      ${field("4. الموعد", sel("CpSched", P.sched, SCHED.map((x) => [x, x])))}
    </div>
    <details class="g-quick"${inst.ui.gQuickOpen ? " open" : ""}><summary data-act="ui-toggle" data-k="gQuickOpen">${ic("plus", "ic xs")} عرض سريع من قالب معتمد</summary>
      <div class="row wrap" style="margin-top:8px">${sel("CpTpl", tpl.id, OFFER_TPL.map((t) => [t.id, t.name]), 'style="flex:1;min-width:200px"')}${A.permBtn("promo.create", "أنشئ العرض واربطه", "g-offer-quick", { cls: "sm" })}</div>
      <p class="g-sub" style="margin-top:6px">خصم متوقع ${num(tImp.disc, 1)} ج.م · على توّا ${num(tImp.twaaCost, 1)} ج.م · مساهمة الطلب بعد الخصم <b class="${tImp.belowGuard ? "g-bad" : "g-ok"}">${num(tImp.cmPerOrder, 1)} ج.م</b> ${tImp.belowGuard ? "← تحت الحد، هيروح للموافقة (سيناريو 13)" : "← فوق الحد، يتفعّل فوراً"}</p>
    </details>
    <div class="field"><span>3. القنوات</span><div class="g-togs">${chBtns}</div></div>
    <div class="grid g2">
      ${field("5. الميزانية (ج.م)", `<input class="input" type="number" min="0" step="500" data-model="gCpBudget" data-live value="${esc(inst.ui.gCpBudget != null ? inst.ui.gCpBudget : 6000)}">`)}
      ${field("اسم الحملة (اختياري)", `<input class="input" data-model="gCpName" value="${esc(inst.ui.gCpName || "")}" placeholder="${esc(`${goalAr(P.goal)} — ${P.seg.ar}`)}">`)}
    </div>
    <div class="row between g-guardrow"><div><b>6. حارس الهامش (Margin Guard)</b><p class="g-sub">يمنع إطلاق الحملة لو العرض مش معتمد أو المساهمة تحت ${num(s.rules.minContribution)} ج.م/طلب (Guardrail A).</p></div><button type="button" class="toggle ${P.guard ? "on" : ""}" data-act="g-guard" aria-pressed="${P.guard}" aria-label="حارس الهامش"></button></div>
    <div class="row wrap" style="margin-top:10px">${A.permBtn("promo.create", "أنشئ الحملة", "g-cp-create", { cls: "primary", icon: "plus" })}<span class="g-sub" style="margin:0">الإطلاق خطوة منفصلة من جدول الحملات — مسجّلة في التدقيق.</span></div></div>`;
  const gTone = P.gs[0] === "block" ? "bad" : P.gs[0] === "warn" ? "warn" : "ok";
  const preview = `<div class="card g-preview"><h3>${ic("target", "ic sm")} قبل ما تطلق: الأثر المتوقع</h3>
    ${banner(`<b>حارس الهامش:</b> ${P.gs[1]}${!P.guard ? " <b>(الحارس متوقف — مسؤوليتك)</b>" : ""}`, gTone, gTone === "ok" ? "shield" : "alert")}
    <div class="g-funnel">${TW.hbars([{ label: "حجم الشريحة", value: P.size }, { label: "بعد حد التكرار", value: P.eligible, sub: `استبعاد ${num(P.capped)}` }, { label: "الوصول بالقنوات", value: P.reach, sub: pct(P.reachRate) }, { label: "طلبات متوقعة", value: P.orders, tone: "accent", sub: P.budgetCapped ? "حد الميزانية" : "" }])}</div>
    <dl class="kv g-kv" style="margin-top:10px"><dt>تكلفة الرسائل</dt><dd class="num">${money(P.msgCost)}</dd><dt>تكلفة الخصم على توّا</dt><dd class="num">${money(P.promoCost)} <span class="muted">(${P.imp ? `${num(P.imp.twaaCost, 1)} ج.م × ${num(P.orders)} طلب` : "مفيش"})</span></dd><dt>إجمالي التكلفة / الميزانية</dt><dd class="num">${money(P.cost)} / ${money(P.budget)} ${meter(P.cost, P.budget || 1)}</dd><dt>المساهمة الإضافية المتوقعة</dt><dd class="num"><b class="${P.inc < 0 ? "g-bad" : "g-ok"}">${money(P.inc)}</b> <span class="muted">(${num(P.incPer, 1)} ج.م/طلب إضافي − الرسائل)</span></dd><dt>العائد على التكلفة</dt><dd class="num">${P.roi == null ? "—" : `${num(P.roi, 1)}×`}</dd></dl>
    ${P.budgetCapped ? banner(`الميزانية تغطي ${num(P.orders)} طلب بس — الحملة بتقف تلقائياً عند استهلاكها.`, "warn", "alert") : ""}
    <p class="g-sub" style="margin-top:8px">${ic("info", "ic xs")} تقديرات: معدل تحويل الهدف «${esc(goalAr(P.goal))}» × وصول القنوات، والمساهمة الإضافية من TW.promoImpact للعرض المختار.</p></div>`;
  const autos = [["سلة متروكة", "ساعة بعد ترك السلة", "إشعار", "مرة/يوم"], ["تحويل أول طلب", "سجّل ولم يطلب خلال 48 س", "إشعار + واتساب", "مرتين/أسبوع"], ["تفعيل الطلب التاني", "3 أيام بعد أول تسليم", "إشعار", "مرة"], ["تذكير إعادة الطلب", "حسب دورة شراء القسم", "إشعار", "مرة/أسبوع"], ["توقّع النفاد (لبن، عيش، مياه)", "قبل نهاية الدورة بيوم", "داخل التطبيق", "مرة/دورة"], ["عميل متوقف", "30 يوم بدون طلب", "واتساب", "مرة/شهر"], ["إطلاق منطقة", "منطقة في قائمة انتظاره اتفعّلت", "SMS + إشعار", "مرة"], ["رجوع المنتج للمخزون", "طلب «بلّغني»", "إشعار", "مرة/صنف"], ["تاجر جديد قريب", "تاجر اتفعّل في منطقته", "داخل التطبيق", "مرة"], ["عرض حد السلة", "السلة أقل من الحد بـ 30 ج.م", "داخل التطبيق", "داخل الجلسة"]];
  return `${A.head("الحملات", "الجمهور + العرض + القناة + الموعد + الميزانية + حارس الهامش + الهدف", `<button class="btn sm" data-act="g-go" data-to="/admin/segments">${ic("users", "ic xs")}الشرائح</button><button class="btn sm" data-act="g-go" data-to="/admin/promotions">${ic("percent", "ic xs")}منشئ العروض</button>`)}
  ${A.answer({ what: `${run.length} حملات شغالة · ${num(sent)} رسالة · ${num(ordered)} طلب`, attention: blocked.length ? `${blocked.length} حملة محجوبة: العرض مش معتمد` : "مفيش حملات محجوبة", owner: "التسويق · منة الله يسري", risk: `تكلفة الحملات ${money(totalCost)} مقابل مساهمة إضافية ${money(inc)}` })}
  ${best ? banner(`أعلى عائد: <b>${esc(best.c.name)}</b> — ${num(best.e.roi, 1)}× على التكلفة (${money(best.c.incContribution)} مساهمة إضافية). ${blocked.length ? `<b>${esc(blocked[0].c.name)}</b> محجوبة لحد اعتماد العرض.` : ""}`, "brand", "trend") : ""}
  <div class="grid g5">${kpi("حملات شغالة", num(run.length), `${cps.length} إجمالي`)}${kpi("رسائل مرسلة", num(sent), "بعد حد التكرار")}${kpi("معدل الفتح", sent ? pct(opened / sent) : "—", `${num(opened)} فتح`)}${kpi("تحويل لطلب", sent ? pct(ordered / sent, 1) : "—", `${num(ordered)} طلب`)}${kpi("مساهمة إضافية", money(inc), `العائد ${totalCost ? num(inc / totalCost, 1) + "×" : "—"} على التكلفة`, { tone: inc > 0 ? "ok" : "bad" })}</div>
  <div class="card"><div class="hd"><h3>${ic("list", "ic sm")} نتائج الحملات</h3><span class="g-sub" style="margin:0">المساهمة الإضافية = طلبات إضافية × مساهمة العرض − تكلفة الرسائل · مش GMV</span></div>
    <div class="tw"><table class="tbl"><thead><tr><th>الحملة</th><th>الجمهور</th><th>العرض</th><th>القناة</th><th>الحالة</th><th class="n">مرسلة</th><th class="n">فتح</th><th class="n">طلبات</th><th class="n">مساهمة إضافية</th><th class="n">العائد</th><th>إجراء</th></tr></thead><tbody>${rows}</tbody></table></div></div>
  <div class="g-cols">${form}${preview}</div>
  <div class="g-cols"><div class="card"><h3>${ic("refresh", "ic sm")} أتمتة دورة حياة العميل</h3>${table([{ k: 0, label: "الأتمتة", render: (r) => `<b>${esc(r[0])}</b>` }, { k: 1, label: "المُشغّل", render: (r) => esc(r[1]) }, { k: 2, label: "القناة", render: (r) => esc(r[2]) }, { k: 3, label: "الحد", render: (r) => esc(r[3]) }], autos)}</div>
  <div class="card"><h3>${ic("shield", "ic sm")} سياسة منع الإزعاج (§12)</h3><ul class="g-list">
    <li><b>حد التكرار:</b> رسالتين تسويقيتين بالكتير لكل عميل في الأسبوع على كل الحملات مجتمعة — اللي اتبعتله خلال 72 ساعة بيتشال تلقائياً (${num(P.capped)} من الشريحة الحالية).</li>
    <li><b>ساعات هادية:</b> مفيش رسائل تسويقية من 10 م لـ 9 ص، ولا وقت صلاة الجمعة.</li>
    <li><b>واتساب و SMS</b> للي وافقوا بس، وإلغاء الاشتراك بضغطة واحدة من أي رسالة.</li>
    <li><b>الرسائل التشغيلية</b> (حالة الطلب، البدائل) منفصلة ومش بتتحسب من الحد.</li>
    <li><b>استبعاد تلقائي:</b> العملاء اللي عندهم شكوى مفتوحة، أو المتوقف عنهم الكاش (BR-COD-002)، أو المعتمدين على العروض في حملات الخصم.</li></ul></div></div>`;
});

/* ======================================================================= GROWTH · Segments ===================== */
function segDims() {
  const s = S();
  const act = s.zones.filter((z) => z.active); const zTot = sum(act, (z) => (s.hist.zoneStats[z.id] || { orders: 1 }).orders) || 1;
  const topM = s.merchants.filter((m) => m.status === "active").sort((a, b) => b.orders30 - a.orders30).slice(0, 8); const mTot = sum(s.merchants, (m) => m.orders30) || 1;
  return [
    ["zone", "الجغرافيا (المنطقة)", [["all", "كل المناطق", 1], ...act.map((z) => [z.id, z.ar, (s.hist.zoneStats[z.id] || { orders: 1 }).orders / zTot]), ["villages", "قرى الرحلات المجدولة", 0.11]]],
    ["cat", "تفضيل القسم", [["all", "أي قسم", 1], ["grocery", "بقالة ومؤن", 0.42], ["food", "مطاعم وأكل جاهز", 0.28], ["dairy", "ألبان وبيض", 0.2], ["produce", "خضار وفاكهة", 0.15], ["pharmacy", "صيدلية وصحة", 0.09], ["baby", "الأم والطفل", 0.07]]],
    ["aov", "متوسط السلة", [["all", "أي قيمة", 1], ["lt150", "أقل من 150 ج.م", 0.22], ["150-300", "150–300 ج.م", 0.41], ["300-500", "300–500 ج.م", 0.25], ["gt500", "أكثر من 500 ج.م", 0.12]]],
    ["freq", "التكرار (طلبات/شهر)", [["all", "أي تكرار", 1], ["1", "طلب واحد", 0.34], ["2-4", "2–4", 0.38], ["5-8", "5–8", 0.18], ["8+", "أكثر من 8", 0.1]]],
    ["rec", "آخر طلب (الحداثة)", [["all", "أي وقت", 1], ["7", "خلال 7 أيام", 0.36], ["30", "8–30 يوم", 0.3], ["60", "31–60 يوم", 0.17], ["60+", "أكتر من 60 يوم", 0.17]]],
    ["price", "الحساسية للسعر", [["all", "أي", 1], ["low", "منخفضة (نادراً بكوبون)", 0.45], ["mid", "متوسطة", 0.38], ["high", "عالية (≥ 70% بكوبون)", 0.17]]],
    ["cod", "طريقة الدفع", [["all", "أي طريقة", 1], ["cod80", "كاش ≥ 80%", 0.5], ["mixed", "مختلط", 0.3], ["digital", "إلكتروني غالباً", 0.2]]],
    ["merchant", "التاجر المفضل", [["all", "أي تاجر", 1], ...topM.map((m) => [m.id, m.ar, clamp((m.orders30 / mTot) * 2.2, 0.02, 0.4)])]],
    ["time", "وقت التوصيل المفضل", [["all", "أي وقت", 1], ["morning", "صباحي 8–12", 0.24], ["afternoon", "الظهر 12–5", 0.33], ["evening", "مسائي 5–12", 0.43]]],
    ["weekly", "سلوك تسوّق أسبوعي للأسرة (مستنتج من الطلبات)", [["all", "أي", 1], ["yes", "سلة أسبوعية متكررة ≥ 350 ج.م", 0.21], ["no", "طلبات صغيرة متفرقة", 0.79]]],
  ];
}
function segMatch(c, k, v) {
  if (v === "all") return true;
  const aov = c.orders ? c.ltv / c.orders : 0, perMonth = c.orders / Math.max(1, (c.since || 30) / 30);
  if (k === "zone") return v === "villages" ? ["hadeen", "boulin"].includes(c.zoneId) : c.zoneId === v;
  if (k === "aov") return v === "lt150" ? aov < 150 : v === "150-300" ? aov >= 150 && aov < 300 : v === "300-500" ? aov >= 300 && aov < 500 : aov >= 500;
  if (k === "freq") return v === "1" ? perMonth <= 1.5 : v === "2-4" ? perMonth > 1.5 && perMonth <= 4 : v === "5-8" ? perMonth > 4 && perMonth <= 8 : perMonth > 8;
  if (k === "rec") return c.last == null ? false : v === "7" ? c.last <= 7 : v === "30" ? c.last > 7 && c.last <= 30 : v === "60" ? c.last > 30 && c.last <= 60 : c.last > 60;
  if (k === "price") return v === "high" ? !!c.promoHeavy : v === "low" ? !c.promoHeavy : !c.promoHeavy;
  if (k === "cod") return v === "cod80" ? c.cod >= 0.8 : v === "mixed" ? c.cod >= 0.3 && c.cod < 0.8 : c.cod < 0.3;
  if (k === "weekly") return v === "yes" ? c.cluster === "family" && aov >= 250 : !(c.cluster === "family" && aov >= 250);
  return true; /* category / merchant / delivery time need order history: the estimate uses the seeded shares */
}
function segPreview(inst) {
  const dims = segDims(); let f = 1; const parts = [];
  const picks = dims.map(([k, label, opts]) => { const v = uiv(inst, "Sd_" + k, "all"); const o = opts.find((x) => x[0] === v) || opts[0]; f *= o[2]; if (v !== "all") parts.push(`${label}: ${o[1]}`); return [k, v, o]; });
  const size = Math.round(BASE_CUSTOMERS * f);
  const sample = S().customers.filter((c) => picks.every(([k, v]) => segMatch(c, k, v)));
  return { dims, picks, size, rule: parts.join(" · ") || "كل العملاء المسجلين", autoName: parts.length ? picks.filter((p) => p[1] !== "all").slice(0, 2).map((p) => p[2][1]).join(" + ") : "كل العملاء", sample, parts };
}
page("segments", (inst) => {
  const s = S(), P = segPreview(inst);
  const used = (id) => s.campaigns.filter((c) => c.audience === id);
  const big = [...s.segments].sort((a, b) => b.size - a.size)[0];
  const rows = s.segments.map((x) => ({ ...x, used: used(x.id) }));
  const dimsHtml = P.dims.map(([k, label, opts]) => field(label, sel("Sd_" + k, uiv(inst, "Sd_" + k, "all"), opts.map(([v, l, sh]) => [v, v === "all" ? l : `${l} · ${pct(sh)}`])))).join("");
  return `${A.head("الشرائح", "تقسيم سلوكي فقط — من الطلبات والتفاعل، بدون أي بيانات شخصية حساسة", `<button class="btn sm" data-act="g-go" data-to="/admin/campaigns">${ic("sparkle", "ic xs")}الحملات</button>`)}
  ${banner(`<b>خصوصية:</b> الشرائح مبنية على السلوك بس (المنطقة، الأقسام، قيمة السلة، التكرار، الحداثة، الحساسية للسعر، طريقة الدفع، التاجر المفضل، وقت التوصيل، نمط التسوق الأسبوعي المستنتج). <b>ممنوع</b> استخدام الدين، الصحة أو مشتريات الصيدلية الحساسة، النوع، السن، الدخل المفترض أو الحالة الاجتماعية في الاستهداف (§39).`, "brand", "shield")}
  <div class="grid g4">${kpi("الشرائح", num(s.segments.length), "محفوظة وجاهزة للحملات")}${kpi("قاعدة العملاء", num(BASE_CUSTOMERS), "مسجلين · أساس التقدير")}${kpi("أكبر شريحة", esc(big.ar), `${num(big.size)} عميل`)}${kpi("سمات حساسة مستخدمة", "0", "سياسة ثابتة", { tone: "ok" })}</div>
  <div class="g-cols"><div class="card"><div class="hd"><h3>${ic("filter", "ic sm")} منشئ الشريحة</h3><button class="btn sm ghost" data-act="g-seg-reset">${ic("undo", "ic xs")}مسح الاختيارات</button></div>
    <div class="grid g2">${dimsHtml}</div></div>
    <div class="card g-preview"><h3>${ic("users", "ic sm")} الحجم المتوقع</h3>
      <div class="g-big num">${num(P.size)}<small> عميل</small></div><p class="g-sub">${pct(P.size / BASE_CUSTOMERS, 1)} من ${num(BASE_CUSTOMERS)} · تقدير بضرب نسب الأبعاد (بافتراض استقلالها)</p>
      ${meter(P.size, BASE_CUSTOMERS, "brand")}
      <dl class="kv g-kv" style="margin-top:10px"><dt>القاعدة</dt><dd>${esc(P.rule)}</dd><dt>عينة مطابقة</dt><dd>${P.sample.length ? P.sample.slice(0, 6).map((c) => `<button class="btn sm ghost g-link" data-act="open-customer" data-id="${c.id}">${esc(c.ar)}</button>`).join(" ") : `<span class="muted">مفيش من العملاء التجريبيين</span>`} <span class="muted">(${P.sample.length}/${s.customers.length} من العملاء التجريبيين)</span></dd></dl>
      ${P.size < 50 ? banner("الشريحة صغيرة جداً (أقل من 50) — النتائج مش هتبقى دالة إحصائياً، وسّع بُعد.", "warn", "alert") : ""}
      ${field("اسم الشريحة", `<input class="input" data-model="gSgName" value="${esc(inst.ui.gSgName || "")}" placeholder="${esc(P.autoName)}">`)}
      <div class="row wrap" style="margin-top:10px">${TW.btn("احفظ الشريحة", "g-seg-create", { cls: "primary", icon: "plus" })}</div></div></div>
  <div class="card"><h3>${ic("list", "ic sm")} الشرائح المحفوظة</h3>${table([
    { k: "ar", label: "الشريحة", render: (r) => `<b>${esc(r.ar)}</b>${r.id.startsWith("sg-") && r.id.length < 12 ? "" : ` ${chip("جديدة", "accent")}`}` },
    { k: "rule", label: "القاعدة السلوكية", render: (r) => `<span class="ink2">${esc(r.rule)}</span>` },
    { k: "size", label: "الحجم", num: true, render: (r) => `${num(r.size)}<span class="sub">${pct(r.size / BASE_CUSTOMERS, 1)}</span>` },
    { k: "share", label: "", render: (r) => `<div style="min-width:80px">${meter(r.size, big.size, "brand")}</div>` },
    { k: "used", label: "مستخدمة في", render: (r) => (r.used.length ? r.used.map((c) => chip(c.id, c.status === "running" ? "ok" : "neutral")).join(" ") : `<span class="muted">—</span>`) },
    { k: "act", label: "", render: (r) => TW.btn("استخدم في حملة", "g-seg-use", { cls: "sm", data: { id: r.id } }) },
  ], rows)}</div>`;
});

/* ======================================================================= GROWTH · Offers & coupons ===================== */
function promoHealth(p) {
  const now = Date.now(), elapsed = Math.max(1, (now - p.start) / DAY), left = Math.max(0, (p.end - now) / DAY);
  const burn = p.budget ? p.spent / p.budget : 0, perDay = p.spent / elapsed, runway = perDay ? (p.budget - p.spent) / perDay : Infinity;
  const imp = TW.promoImpact(p);
  const flags = [];
  if (burn >= 1) flags.push(["الميزانية خلصت", "bad"]); else if (p.status === "active" && runway < left) flags.push([`الميزانية تخلص قبل النهاية بـ ${num(left - runway, 0)} يوم`, "warn"]);
  if ((p.incContribution || 0) < 5) flags.push(["مساهمة إضافية ضعيفة", "warn"]);
  if (p.limitPerCustomer >= 4) flags.push([`${p.limitPerCustomer} استخدامات/عميل`, "info"]);
  if (p.code === "WELCOME30") flags.push(["3 حسابات جديدة على نفس الجهاز", "bad"]);
  if (p.code === "TWAA20") flags.push(["تقسيم سلة لتكرار الكود", "warn"]);
  return { burn, left, perDay, runway, imp, flags, elapsed };
}
page("offers", (inst) => {
  const s = S(), list = s.promos;
  const act = list.filter((p) => p.status === "active");
  const H = Object.fromEntries(list.map((p) => [p.id, promoHealth(p)]));
  const budget = sum(act, (p) => p.budget), spent = sum(act, (p) => p.spent), red = sum(list, (p) => p.redemptions);
  const incTotal = sum(list, (p) => (p.incContribution || 0) * p.redemptions);
  const flagged = list.filter((p) => H[p.id].flags.some((f) => f[1] === "bad" || f[1] === "warn"));
  const promoDep = s.customers.filter((c) => c.promoHeavy);
  const filt = uiv(inst, "OfF", "all");
  const shown = list.filter((p) => filt === "all" || (filt === "active" ? p.status === "active" : filt === "flag" ? flagged.includes(p) : !["active"].includes(p.status)));
  const rows = shown.map((p) => {
    const h = H[p.id]; const [fl, ft] = FUND[p.funding] || [p.funding, "neutral"];
    const canToggle = ["active", "paused"].includes(p.status);
    const togg = canToggle ? A.permBtn("promo.create", p.status === "active" ? "إيقاف" : "تشغيل", "g-promo-toggle", { cls: "sm", icon: p.status === "active" ? "pause" : "play", data: { id: p.id } }) : p.status === "pending_approval" ? `<button class="btn sm ghost g-link" data-act="g-go" data-to="/admin/approvals">${ic("check", "ic xs")}الموافقات</button>` : `<span class="lock">${ic("lock", "ic xs")}${p.status === "ended" ? "انتهى" : "غير قابل"}</span>`;
    return `<tr><td class="g-code"><span class="mono"><b>${esc(p.code || "—")}</b></span><span class="sub">${esc(p.name)}</span></td><td>${promoChip(p)}</td><td>${chip(fl, ft)}</td><td class="g-bud"><div class="row between" style="font-size:12px"><span class="num">${num(p.spent)}</span><span class="muted num">من ${num(p.budget)} ج.م</span></div>${meter(p.spent, p.budget)}<span class="sub">${p.status === "active" ? `${num(h.perDay, 0)} ج.م/يوم · باقي ${num(h.left, 0)} يوم` : ""}</span></td><td class="n num">${num(p.redemptions)}</td><td class="n num">${num(p.limitPerCustomer)}×</td><td class="n num"><span class="${h.imp.cmPerOrder < s.rules.minContribution ? "g-bad" : ""}">${signed(h.imp.cmPerOrder, 1)}</span></td><td class="n num"><b class="${(p.incContribution || 0) < 0 ? "g-bad" : ""}">${signed(p.incContribution || 0, 1)}</b><span class="sub">${money((p.incContribution || 0) * p.redemptions)} إجمالي</span></td><td class="g-flags">${h.flags.length ? h.flags.map(([t, tn]) => chip(t, tn)).join(" ") : chip("سليم", "ok")}</td><td>${togg}</td></tr>`;
  }).join("");
  const burnRows = act.map((p) => ({ label: p.code || p.id, value: H[p.id].burn * 100, tone: H[p.id].burn >= 0.9 ? "warn" : "brand", sub: money(p.budget - p.spent) + " متبقي" }));
  return `${A.head("العروض والكوبونات", "صحة الاستخدام، حرق الميزانية، والمساهمة الإضافية المتوقعة — مش GMV بس", `${A.permBtn("promo.create", "ابني عرض جديد", "g-go", { cls: "sm primary", icon: "plus", data: { to: "/admin/promotions" } })}`)}
  ${A.answer({ what: `${act.length} عروض مفعّلة · ${num(red)} استخدام`, attention: flagged.length ? `${flagged.length} عروض عليها إشارات` : "مفيش", owner: "التسويق + المالية (تمويل)", risk: `متبقي ${money(budget - spent)} من ميزانية العروض المفعّلة` })}
  <div class="grid g5">${kpi("عروض مفعّلة", num(act.length), `${list.length} إجمالي`)}${kpi("حرق الميزانية", budget ? pct(spent / budget) : "—", `${money(spent)} من ${money(budget)}`, { tone: budget && spent / budget > 0.8 ? "warn" : "" })}${kpi("استخدامات", num(red), "كل العروض")}${kpi("مساهمة إضافية متوقعة", kmoney(incTotal), "Σ مساهمة/طلب × استخدام", { tone: incTotal > 0 ? "ok" : "bad" })}${kpi("عملاء معتمدين على العروض", num((byId(s.segments, "sg-promo") || { size: 0 }).size), "شريحة sg-promo", { tone: "warn" })}</div>
  <div class="card"><div class="hd"><h3>${ic("tag", "ic sm")} الأكواد والعروض</h3>${seg("OfF", filt, [["all", "الكل"], ["active", "مفعّلة"], ["flag", "عليها إشارات"], ["other", "غير مفعّلة"]], "فلترة العروض")}</div>
    <div class="tw"><table class="tbl"><thead><tr><th>الكود</th><th>الحالة</th><th>الممول</th><th>الميزانية</th><th class="n">استخدام</th><th class="n">حد/عميل</th><th class="n"${tip("مساهمة الطلب بعد الخصم (TW.promoImpact، سلة 265)")}>مساهمة الطلب</th><th class="n"${tip("المساهمة الإضافية المتوقعة لكل استخدام، شاملة الطلبات الإضافية اللي العرض بيجيبها")}>المساهمة الإضافية/استخدام</th><th>إشارات حماية العروض</th><th>إجراء</th></tr></thead><tbody>${rows || `<tr><td colspan="10" class="muted c">مفيش عروض في الفلتر ده</td></tr>`}</tbody></table></div></div>
  <div class="g-cols">${viz(inst, "burn", `${ic("fire", "ic sm")} حرق الميزانية (% المصروف)`, "العروض المفعّلة · كل عرض لوحده", TW.hbars(burnRows, { fmt: (v) => `${num(v, 0)}%` }), table([{ k: "label", label: "الكود" }, { k: "value", label: "% مصروف", num: true, render: (r) => `${num(r.value, 0)}%` }, { k: "sub", label: "المتبقي" }], burnRows))}
  <div class="card"><h3>${ic("shield", "ic sm")} حماية العروض — إشارات للمراجعة</h3><div class="list g-l">
    <div class="li"><span class="grow"><b>WELCOME30 — نفس الجهاز</b><span class="sub">3 حسابات جديدة من نفس معرف الجهاز خلال 24 ساعة. الكود اتطبق للأول بس؛ التانيين اتمنعوا تلقائياً.</span></span>${chip("اتمنع تلقائياً", "ok")}</div>
    <div class="li"><span class="grow"><b>TWAA20 — تقسيم السلة</b><span class="sub">عميل قسّم سلة 620 ج.م على 3 طلبات لتكرار الخصم في يوم واحد. القاعدة المقترحة: استخدام واحد/يوم.</span></span>${chip("قيد المراجعة", "warn")}</div>
    ${promoDep.map((c) => `<div class="li"><span class="grow"><b>عميل معتمد على العروض — <button class="btn sm ghost g-link" data-act="open-customer" data-id="${c.id}">${esc(c.ar)}</button></b><span class="sub">${num(c.orders)} طلب، أغلبها (≥ 70%) بكوبون · آخر طلب من ${num(c.last)} يوم. متستهدفهاش بخصم إضافي — جرّب النقاط/الولاء بدل الخصم.</span></span>${chip("مستبعد من حملات الخصم", "info")}</div>`).join("")}
    <div class="li"><span class="grow"><b>FREEDEL — عائد ضعيف</b><span class="sub">مساهمة إضافية 3.1 ج.م/استخدام؛ الرحلات المجدولة بتغطي التوصيل أصلاً. راجع الحد الأدنى للسلة.</span></span>${chip("مراجعة الشروط", "warn")}</div>
  </div></div></div>`;
});

/* ======================================================================= GROWTH · Referral ===================== */
page("referral", (inst) => {
  const s = S(), cac = s.hist.cac;
  const ref = cac.find((x) => /إحالة/.test(x[0])) || cac[0];
  const funnel = [["دعوات اتبعتت", 1240], ["سجّلوا", 318], ["أول طلب", ref[2] + 9], ["أول طلب اتسلّم", ref[2]]];
  const totCust = sum(cac, (x) => x[2]), totSpend = sum(cac, (x) => x[1] * x[2]);
  const blended = totSpend / (totCust || 1);
  const cacSorted = [...cac].sort((a, b) => a[1] - b[1]);
  const topRef = [["c6", 9, 4], ["c2", 7, 3], ["c8", 5, 2], ["c1", 4, 2]].map(([id, inv, conv]) => ({ c: byId(s.customers, id), inv, conv })).filter((x) => x.c);
  const view = uiv(inst, "RfM", "cac");
  const cacChart = view === "cac" ? TW.hbars(cacSorted.map(([l, v, n]) => ({ label: l, value: v, tone: /إحالة/.test(l) ? "accent" : "brand", sub: `${num(n)} عميل` })), { fmt: (v) => money(v) }) : TW.hbars([...cac].sort((a, b) => b[2] - a[2]).map(([l, v, n]) => ({ label: l, value: n, tone: /إحالة/.test(l) ? "accent" : "brand" })), { fmt: (v) => `${num(v)} عميل` });
  return `${A.head("برنامج الإحالة", "ادّي 50 وخد 50 — المكافأة بعد تسليم أول طلب لصاحبك", "")}
  ${banner(`الإحالة تاني أرخص مصدر استقطاب: <b>${money(ref[1])}</b> للعميل مقابل متوسط ${money(blended)} لكل المصادر، وجابت <b>${num(ref[2])}</b> عميل (${pct(ref[2] / totCust)} من العملاء الجدد).`, "brand", "share")}
  <div class="grid g4">${kpi("تكلفة استقطاب الإحالة", money(ref[1]), `المتوسط المرجّح ${money(blended)}`, { tone: "ok" })}${kpi("دعوة ← تسليم أول طلب", pct(ref[2] / funnel[0][1], 1), `${num(funnel[0][1])} دعوة`)}${kpi("عملاء من الإحالة", num(ref[2]), "آخر 30 يوم")}${kpi("مكافآت مصروفة", money(ref[2] * 100), "50 للداعي + 50 للمدعو")}</div>
  <div class="g-cols">${viz(inst, "rffun", `${ic("filter", "ic sm")} قمع الإحالة`, "آخر 30 يوم · كل خطوة بنسبة التحويل من اللي قبلها", TW.hbars(funnel.map(([l, v], i) => ({ label: l, value: v, tone: i === funnel.length - 1 ? "accent" : "brand", sub: i ? pct(v / funnel[i - 1][1]) : "" }))), table([{ k: 0, label: "الخطوة" }, { k: 1, label: "العدد", num: true, render: (r) => num(r[1]) }, { k: 2, label: "التحويل", num: true, render: (r, i) => (i ? pct(r[1] / funnel[i - 1][1], 1) : "—") }], funnel))}
  ${viz(inst, "rfcac", `${ic("coins", "ic sm")} الاستقطاب حسب المصدر`, view === "cac" ? "تكلفة اكتساب العميل (CAC) — الأقل أفضل" : "عدد العملاء الجدد من كل مصدر", cacChart, table([{ k: 0, label: "المصدر" }, { k: 1, label: "CAC", num: true, render: (r) => money(r[1]) }, { k: 2, label: "عملاء", num: true, render: (r) => num(r[2]) }, { k: 3, label: "الإنفاق", num: true, render: (r) => money(r[1] * r[2]) }, { k: 4, label: "الحصة", num: true, render: (r) => pct(r[2] / totCust) }], cac), { top: `<div class="row" style="margin-bottom:8px">${seg("RfM", view, [["cac", "التكلفة/عميل"], ["n", "عدد العملاء"]], "المقياس")}</div>` })}</div>
  <div class="g-cols"><div class="card"><h3>${ic("doc", "ic sm")} قواعد البرنامج</h3><ul class="g-list">
    <li>المدعو بياخد <b>50 ج.م</b> على أول طلب (حد أدنى للسلة 150 ج.م)، والداعي بياخد <b>50 ج.م</b> في محفظته بعد التسليم + 7 أيام بدون استرداد.</li>
    <li>حد أقصى 10 إحالات ناجحة للعميل في الشهر.</li>
    <li>الرصيد صالح 30 يوم ومش بيتحوّل لكاش.</li>
    <li>المنطقة لازم تكون مفعّلة — الدعوات للمناطق غير المفعّلة بتروح لقائمة الانتظار (${num(sum(Object.values(s.waitlist), (w) => w.users))} في القائمة).</li></ul>
    <h3 style="margin-top:12px">${ic("crown", "ic sm")} أكتر الداعين</h3>${table([{ k: "c", label: "العميل", render: (r) => `<button class="btn sm ghost g-link" data-act="open-customer" data-id="${r.c.id}">${esc(r.c.ar)}</button>` }, { k: "z", label: "المنطقة", render: (r) => esc(A.zone(r.c.zoneId)) }, { k: "inv", label: "دعوات", num: true }, { k: "conv", label: "اتسلّم", num: true }, { k: "earn", label: "مكافأة", num: true, render: (r) => money(r.conv * 50) }], topRef)}</div>
  <div class="card"><h3>${ic("shield", "ic sm")} فحوص إساءة الاستخدام — للمراجعة</h3><p class="g-sub">بلاغات للمراجعة البشرية، مش عقوبة تلقائية. المكافأة بتتعلّق لحد القرار.</p><div class="list g-l">
    <div class="li"><span class="grow"><b>نفس الجهاز</b><span class="sub">الداعي والمدعو سجّلوا من نفس معرف الجهاز (حالتين هذا الأسبوع).</span></span>${chip("المكافأة متعلّقة", "warn")}</div>
    <div class="li"><span class="grow"><b>نفس العنوان</b><span class="sub">3 حسابات مدعوة بنفس العلامة المميزة «عمارة النيل، الدور الخامس» — ممكن أسرة واحدة.</span></span>${chip("قيد المراجعة", "warn")}</div>
    <div class="li"><span class="grow"><b>إحالة ذاتية برقم تاني</b><span class="sub">رقم المدعو مسجّل كرقم بديل في حساب الداعي.</span></span>${chip("اتمنعت المكافأة", "bad")}</div>
    <div class="li"><span class="grow"><b>استرداد بعد المكافأة</b><span class="sub">أول طلب اتعمله استرداد كامل خلال 7 أيام ← المكافأة بتتلغي تلقائياً.</span></span>${chip("قاعدة تلقائية", "ok")}</div>
  </div></div></div>`;
});

/* ======================================================================= GROWTH · Merchant acquisition ===================== */
function gapSentence(z, gt) { return `${z.ar} فيها طلب ${gt[1]} ومفيش ${gt[1]} ${gt[2] ? "مفعّلة" : "مفعّل"}`; }
function leadMoveNote(l, to) {
  const ap = S().approvals.find((a) => a.type === "merchant_activation" && a.ref && a.ref.id === l.merchantId);
  let n = `من «${esc(D.leadStages[l.stage])}» إلى «${esc(D.leadStages[to])}». بيتسجّل في تاريخ العميل المحتمل وسجل التدقيق.`;
  if (to === 6 && l.merchantId) n += " عند «تجهيز الكتالوج» بيتجهّز كتالوج مبدئي من الكتالوج الرئيسي تلقائياً.";
  if (ap && ap.status === "PENDING") n += to >= 7 ? ` <b>بعد النقل ده طلب التفعيل ${esc(ap.id)} يقدر يتعتمد.</b>` : ` طلب التفعيل ${esc(ap.id)} محتاج «تدريب» على الأقل.`;
  return n;
}
function gapMatrix() {
  const s = S();
  return s.zones.map((z) => {
    const m = zoneMetrics(z);
    const cells = GAP_TYPES.map((gt) => {
      const local = s.merchants.filter((x) => x.status === "active" && gt[4].includes(x.type) && (x.zoneId === z.id || (z.type === "core" && (byId(s.zones, x.zoneId) || {}).type === "core"))).length;
      const lead = s.leads.find((l) => l.zoneId === z.id && gt[4].includes(l.type) && l.stage < 9);
      const demand = m.demand * gt[3];
      return { gt, local, lead, demand, gap: !local && demand >= 3 };
    });
    return { z, m, cells };
  });
}
page("acquisition", (inst) => {
  const s = S(), leads = s.leads;
  const L301 = byId(leads, "L-301");
  const ap = L301 && s.approvals.find((a) => a.type === "merchant_activation" && a.ref && a.ref.id === L301.merchantId);
  const selL = byId(leads, uiv(inst, "Lead", "L-301")) || leads[0];
  const gm = gapMatrix();
  const openGaps = gm.flatMap((r) => r.cells.filter((c) => c.gap && !c.lead).map((c) => ({ z: r.z, ...c })));
  const workedGaps = gm.flatMap((r) => r.cells.filter((c) => c.gap && c.lead).map((c) => ({ z: r.z, ...c })));
  const allGaps = [...gm.flatMap((r) => r.cells.filter((c) => c.gap).map((c) => ({ z: r.z, ...c })))].sort((a, b) => (b.gt[0] === "pharmacy") - (a.gt[0] === "pharmacy") || (!b.z.active) - (!a.z.active) || b.demand - a.demand);
  const near = leads.filter((l) => l.stage >= 5 && l.stage <= 8).length;
  const stageCount = D.leadStages.map((_, i) => leads.filter((l) => l.stage === i).length);
  const actBanner = !L301 ? "" : ap && ap.status !== "PENDING" ? banner(`طلب تفعيل <b>صيدلية النور</b> (${esc(ap.id)}) اتقفل: ${ap.status === "APPROVED" ? "اتعتمد والتاجر بقى مفعّل" : "اترفض"} — ${esc(ap.approver || "")}.`, ap.status === "APPROVED" ? "ok" : "warn", "check")
    : L301.stage < 7 ? banner(`<b>تفعيل صيدلية النور (m25) محجوب:</b> طلب الموافقة ${ap ? `<span class="mono">${esc(ap.id)}</span>` : ""} مش هيتعتمد إلا لما <span class="mono">L-301</span> يوصل مرحلة <b>«${esc(D.leadStages[7])}»</b> (8 من 11). المرحلة الحالية «${esc(D.leadStages[L301.stage])}» — فاضل ${7 - L301.stage} ${7 - L301.stage === 1 ? "مرحلة" : "مراحل"}. <span class="row wrap" style="margin-top:6px"><button class="btn sm" data-act="g-lead" data-id="L-301">${ic("eye", "ic xs")}افتح L-301</button><button class="btn sm ghost" data-act="g-go" data-to="/admin/approvals">${ic("check", "ic xs")}مركز الموافقات</button></span>`, "warn", "lock")
    : banner(`<b>L-301 وصل «${esc(D.leadStages[L301.stage])}»</b> — طلب تفعيل صيدلية النور ${ap ? `<span class="mono">${esc(ap.id)}</span>` : ""} جاهز للاعتماد في مركز الموافقات. <button class="btn sm primary" data-act="g-go" data-to="/admin/approvals" style="margin-inline-start:6px">${ic("check", "ic xs")}اعتمد من مركز الموافقات</button>`, "ok", "check");
  const card = (l) => {
    const isSel = l.id === selL.id;
    return `<div class="kcard g-lead ${isSel ? "on" : ""}" data-hl="lead-${l.id}" data-act="g-lead" data-id="${l.id}" role="button" tabindex="0" aria-pressed="${isSel}">
      <div class="row between top"><b class="g-ln">${esc(l.ar)}</b><span class="mono muted g-id">${esc(l.id)}</span></div>
      <div class="row wrap gap4" style="margin:4px 0">${chip(D.merchantTypes[l.type] || l.type, l.type === "pharmacy" ? "accent" : "neutral")}<span class="muted" style="font-size:12px">${ic("pin", "ic xs")}${esc(A.zone(l.zoneId))}</span></div>
      <div class="g-lo">${esc(l.opportunity)}</div>
      <div class="g-lm">منافسين: ${esc(l.competitors)} · عمولة مقترحة <b class="num">${pct(l.commission)}</b></div>
      <div class="row between g-lmv"><button type="button" class="btn sm ghost" data-act="g-lead-move" data-id="${l.id}" data-dir="-1" ${l.stage === 0 ? "disabled" : ""} aria-label="رجّع ${esc(l.ar)} مرحلة">${ic("chevR", "ic xs")}رجوع</button><span class="muted num">${l.stage + 1}/11</span><button type="button" class="btn sm" data-act="g-lead-move" data-id="${l.id}" data-dir="1" ${l.stage >= 10 ? "disabled" : ""} aria-label="قدّم ${esc(l.ar)} مرحلة">تقدّم${ic("chevL", "ic xs")}</button></div></div>`;
  };
  const kan = `<div class="kanban g-kan">${D.leadStages.map((st, i) => `<div class="kc"><b><span>${i + 1}. ${esc(st)}</span><span class="muted num">${stageCount[i]}</span></b>${leads.filter((l) => l.stage === i).map(card).join("") || `<span class="g-sub">—</span>`}</div>`).join("")}</div>`;
  const m = selL.merchantId && byId(s.merchants, selL.merchantId);
  const sap = selL.merchantId && s.approvals.find((a) => a.type === "merchant_activation" && a.ref && a.ref.id === selL.merchantId);
  const detail = `<div class="card"><div class="hd"><h3>${ic("store", "ic sm")} ${esc(selL.ar)} <span class="mono muted">${esc(selL.id)}</span></h3><div class="row gap4">${TW.btn("انقل لمرحلة…", "g-lead-jump", { cls: "sm", icon: "route", data: { id: selL.id } })}</div></div>
    <div class="g-steps">${D.leadStages.map((st, i) => `<span class="${i < selL.stage ? "done" : i === selL.stage ? "now" : ""}"${tip(st)}></span>`).join("")}</div>
    <p class="g-sub" style="margin:6px 0 10px">المرحلة ${selL.stage + 1} من 11: <b>${esc(D.leadStages[selL.stage])}</b></p>
    <dl class="kv"><dt>المالك</dt><dd>${esc(selL.owner)}</dd><dt>النوع</dt><dd>${esc(D.merchantTypes[selL.type])}</dd><dt>الموقع</dt><dd>${esc(A.zone(selL.zoneId))}</dd><dt>التشكيلة المتوقعة</dt><dd>${esc(selL.assortment)}</dd><dt>فرصة الطلب</dt><dd>${esc(selL.opportunity)}</dd><dt>المنافسين</dt><dd>${esc(selL.competitors)}</dd><dt>العمولة المقترحة</dt><dd class="num">${pct(selL.commission)}</dd><dt>حالة الانضمام</dt><dd>${m ? `<button class="btn sm ghost g-link" data-act="open-merchant" data-id="${m.id}">${esc(m.ar)} · ${m.id}</button> ${mClassChip(m)}` : "لسه مفيش حساب تاجر"}${sap ? ` · موافقة <span class="mono">${esc(sap.id)}</span> ${chip(sap.status === "PENDING" ? (selL.stage >= 7 ? "جاهزة للاعتماد" : "محجوبة بالمرحلة") : sap.status === "APPROVED" ? "اتعتمدت" : "اترفضت", sap.status === "PENDING" ? (selL.stage >= 7 ? "ok" : "warn") : sap.status === "APPROVED" ? "ok" : "bad")}` : ""}</dd></dl>
    <h3 style="margin-top:12px;font-size:13.5px">${ic("history", "ic xs")} التاريخ</h3>${(selL.history || []).length ? `<div class="steps">${[...selL.history].reverse().slice(0, 6).map((h) => `<div class="st done"><span class="bul">${ic("check", "ic xs")}</span><div style="font-size:12.5px"><b>${esc(D.leadStages[h.stage])}</b> · ${esc(h.by)} · ${TW.clock(h.at)}${h.note ? `<div class="muted">${esc(h.note)}</div>` : ""}</div></div>`).join("")}</div>` : `<p class="g-sub">مفيش حركة مسجّلة في الجلسة دي.</p>`}</div>`;
  const newLead = `<div class="card"><div class="hd"><h3>${ic("plus", "ic sm")} عميل محتمل جديد</h3><button class="btn sm ghost" data-act="ui-toggle" data-k="gNewLead">${inst.ui.gNewLead ? "إخفاء" : "فتح النموذج"}</button></div>
    ${inst.ui.gNewLead ? `<div class="grid g2">${field("اسم المحل", `<input class="input" data-model="gLdName" value="${esc(inst.ui.gLdName || "")}" placeholder="مثال: صيدلية الأمل">`)}${field("المالك", `<input class="input" data-model="gLdOwner" value="${esc(inst.ui.gLdOwner || "")}" placeholder="اسم صاحب المحل">`)}${field("النوع (قائمة محكومة)", sel("LdType", uiv(inst, "LdType", "pharmacy"), Object.entries(D.merchantTypes)))}${field("المنطقة", sel("LdZone", uiv(inst, "LdZone", "wafaeya"), s.zones.map((z) => [z.id, `${z.ar}${z.active ? "" : " (غير مفعّلة)"}`])))}</div>${field("فرصة الطلب", `<input class="input" data-model="gLdOpp" value="${esc(inst.ui.gLdOpp || "")}" placeholder="${esc(`${D.merchantTypes[uiv(inst, "LdType", "pharmacy")]} في ${A.zone(uiv(inst, "LdZone", "wafaeya"))}`)}">`)}<div class="row" style="margin-top:10px">${TW.btn("أضف للخط", "g-lead-create", { cls: "primary", icon: "plus" })}</div>` : `<p class="g-sub">العمولة الافتراضية: 17% للمطاعم و 10% للباقي — بتتفاوض في «اتفاق تجاري».</p>`}</div>`;
  const gapHead = `<tr><th>المنطقة</th><th class="n">طلب/يوم</th>${GAP_TYPES.map((g) => `<th>${esc(g[1])}</th>`).join("")}</tr>`;
  const gapRows = gm.map(({ z, m: zm, cells }) => `<tr><td><b>${esc(z.ar)}</b><span class="sub">${esc(D.zoneType[z.type])} · ${z.active ? "مفعّلة" : "غير مفعّلة"}</span></td><td class="n num">${num(zm.demand)}</td>${cells.map((c) => `<td class="g-gc">${c.local ? chip(`${c.local} مفعّل`, "ok") : c.lead ? `<button class="btn sm ghost g-link" data-act="g-lead" data-id="${c.lead.id}"${tip(`${c.lead.ar} — ${D.leadStages[c.lead.stage]}`)}>${chip(`في الخط ${c.lead.id}`, "info")}</button>` : c.gap ? `<div class="col gap4">${chip(`فجوة · ~${num(c.demand)}/يوم`, "warn")}<button class="btn sm" data-act="g-gap" data-z="${z.id}" data-t="${c.gt[0]}">${ic("plus", "ic xs")}أنشئ فرصة</button></div>` : `<span class="muted" style="font-size:12px">طلب ضعيف</span>`}</td>`).join("")}</tr>`).join("");
  return `${A.head("استقطاب التجار", "خط المبيعات من «عميل محتمل» لـ «تاجر سليم» · سيناريو 9", `<button class="btn sm" data-act="g-go" data-to="/admin/expansion">${ic("map", "ic xs")}التوسع الجغرافي</button>`)}
  ${A.answer({ what: `${leads.length} عميل محتمل في 11 مرحلة`, attention: `${openGaps.length} فجوة بدون فرصة · ${near} قريبين من التفعيل`, owner: "المبيعات · رامي عزت / عمليات التجار", risk: allGaps[0] ? gapSentence(allGaps[0].z, allGaps[0].gt) : "—" })}
  ${actBanner}
  <div class="grid g4">${kpi("في الخط", num(leads.length), `${num(leads.filter((l) => l.stage <= 2).length)} في أول 3 مراحل`)}${kpi("قريبين من التفعيل", num(near), "مستندات ← تفعيل")}${kpi("فجوات بدون فرصة", num(openGaps.length), `${workedGaps.length} فجوة عليها شغل`, { tone: openGaps.length ? "warn" : "ok" })}${kpi("صيدليات في الخط", num(leads.filter((l) => l.type === "pharmacy" && l.stage < 9).length), "أعلى فجوة في القرى")}</div>
  <div class="card" data-hl="sales-pipeline"><div class="hd"><h3>${ic("layers", "ic sm")} خط استقطاب التجار</h3><span class="g-sub" style="margin:0">11 مرحلة · كل نقل بسبب من قائمة محكومة ومسجّل في التدقيق</span></div>${kan}</div>
  <div class="g-cols">${detail}${newLead}</div>
  <div class="card"><div class="hd"><h3>${ic("map", "ic sm")} فجوات التجار حسب منطقة الخدمة</h3><span class="g-sub" style="margin:0">تجار محليين مفعّلين مقابل إشارة الطلب (طلبات/قائمة انتظار × حصة القسم)</span></div>
    ${allGaps.length ? `<div class="g-gaps">${allGaps.slice(0, 4).map((g) => `<div class="g-gapline">${ic(g.lead ? "check" : "alert", "ic xs")}<span class="grow"><b>${esc(gapSentence(g.z, g.gt))}</b> <span class="muted">~${num(g.demand)} طلب/يوم</span></span>${g.lead ? chip(`${g.lead.id} · ${D.leadStages[g.lead.stage]}`, "info") : `<button class="btn sm" data-act="g-gap" data-z="${g.z.id}" data-t="${g.gt[0]}">${ic("plus", "ic xs")}أنشئ فرصة</button>`}</div>`).join("")}</div>` : ""}
    <div class="tw"><table class="tbl g-gaptbl"><thead>${gapHead}</thead><tbody>${gapRows}</tbody></table></div></div>`;
});

/* ======================================================================= GROWTH · Location expansion ===================== */
A.modals["g-launch"] = (inst, mo) => {
  const z = byId(S().zones, mo.zoneId); const m = zoneMetrics(z);
  const phLead = S().leads.filter((l) => l.zoneId === z.id && l.type === "pharmacy").sort((x, y) => y.stage - x.stage)[0];
  return TW.modalWrap(`إطلاق منطقة خدمة تجريبية — ${esc(z.ar)}`, `${banner(`<b>اللي هيحصل:</b><ul class="g-list" style="margin-top:4px"><li>${esc(z.ar)} تتفعّل كمنطقة رحلات مجدولة (${esc((z.windows || []).join(" · ") || "نوافذ تتحدد")}) بسعة مبدئية 20 طلب/يوم، رسوم ${money(z.fee)} وحد أدنى ${money(z.min)}.</li><li>${phLead ? `مهمة استقطاب الصيدلية موجودة في الخط: <b>${esc(phLead.id)} ${esc(phLead.ar)}</b> («${esc(D.leadStages[phLead.stage])}») — مش هتتكرر.` : "هتتعمل مهمة استقطاب صيدلية تلقائياً (فجوة صيدلية في المنطقة)."}</li><li>إشعار لـ <b>${num(m.users)}</b> عميل في قائمة الانتظار.</li><li>الجاهزية تبقى «تجريبية» والقرار يتسجّل في سجل التدقيق.</li></ul>`, "brand", "map")}
    <div class="grid g3">${kpi("طلب متوقع/يوم", num(m.demand), `التعادل ${m.be ? num(m.be) : "—"}`)}${kpi("تكلفة توصيل/طلب", money(m.cpo), "رحلات مجدولة")}${kpi("مساهمة/طلب متوقعة", smoney(m.cmOrder), "قبل الكثافة", { tone: m.cmOrder < 0 ? "bad" : "ok" })}</div>
    ${field("السبب (قائمة محكومة)", sel("LnReason", uiv(inst, "LnReason", LAUNCH_REASONS[0]), LAUNCH_REASONS.map((r) => [r, r])))}
    ${field("ملاحظة (اختياري)", `<textarea class="input" data-model="gLnNote" placeholder="سياق القرار للتدقيق">${esc(inst.ui.gLnNote || "")}</textarea>`)}
    <p class="muted" style="font-size:12px">${ic("book", "ic xs")} يحتاج صلاحية «${esc(D.perms["zones.edit"])}» · هيتسجّل باسم ${esc(TW.actor.admin().name)} (${esc(TW.roleOf().ar)}).</p>`,
    `<button class="btn primary" data-act="g-launch-submit">${ic("power", "ic sm")}أطلق المنطقة التجريبية</button><button class="btn" data-act="modal-close">إلغاء</button>`);
};
A.modals["g-exp-lead"] = (inst, mo) => {
  const z = byId(S().zones, mo.zoneId); const type = uiv(inst, "ElType", "pharmacy");
  return TW.modalWrap(`مهمة استقطاب تاجر — ${esc(z.ar)}`, `${field("نوع التاجر المطلوب (قائمة محكومة)", sel("ElType", type, Object.entries(D.merchantTypes)))}
    ${field("اسم المحل لو معروف (اختياري)", `<input class="input" data-model="gElName" value="${esc(inst.ui.gElName || "")}" placeholder="${esc(`${D.merchantTypes[type]} مطلوب — ${z.ar}`)}">`)}
    <p class="g-sub">المهمة بتدخل خط المبيعات في مرحلة «${esc(D.leadStages[0])}» ومربوطة بالمنطقة.</p>`, `<button class="btn primary" data-act="g-exp-lead-submit">${ic("plus", "ic sm")}أنشئ المهمة</button><button class="btn" data-act="modal-close">إلغاء</button>`);
};
page("expansion", (inst) => {
  const s = S();
  const zs = s.zones.map((z) => ({ z, m: zoneMetrics(z) }));
  const cand = zs.filter((x) => !x.z.active).sort((a, b) => b.m.users - a.m.users);
  const live = zs.filter((x) => x.z.active);
  const selId = uiv(inst, "ExpZone", "wafaeya"); const cur = zs.find((x) => x.z.id === selId) || zs[0];
  const wlTot = sum(Object.values(s.waitlist), (w) => w.users);
  const lr = inst.ui.gLaunch;
  const canEdit = TW.can("zones.edit");
  /* map with waitlist bubbles on not-yet-live zones */
  const bubbles = cand.filter((x) => x.m.users).map(({ z, m }) => `<g data-act="g-exp-zone" data-id="${z.id}"${tip(`${z.ar}: ${num(m.users)} في قائمة الانتظار · ${num(m.searches)} بحث`)}><circle class="g-wl" cx="${z.x}" cy="${z.y}" r="${(10 + Math.sqrt(m.users) * 1.6).toFixed(1)}"/><text class="g-wlt" x="${z.x}" y="${z.y + 5}" text-anchor="middle">${num(m.users)}</text></g>`).join("");
  const map = A.map({ zoneAct: "g-exp-zone", selZone: cur.z.id, riders: false }).replace(/<\/svg><\/div>$/, `${bubbles}</svg></div>`);
  const m = cur.m, z = cur.z;
  const checks = [[m.be ? m.demand >= m.be : true, `الطلب المتوقع ${num(m.demand)}/يوم ${m.be ? `مقابل تعادل ${num(m.be)}` : ""}`], [m.nearby >= 3, `${num(m.nearby)} تجار قريبين (المطلوب 3+)`], [m.phOk, `تغطية صيدلية: ${m.pharmacy}`], [m.riders >= m.ridersNeeded, `${num(m.riders)} مندوب بمركبة مناسبة (المطلوب ${num(m.ridersNeeded)})`], [(z.windows || []).length > 0, `نوافذ توصيل: ${(z.windows || []).join(" · ") || "غير محددة"}`]];
  const dailyCm = m.demand * m.cmOrder;
  const statusSel = (zz) => `<select class="input g-ssel" data-change="g-exp-status" data-z="${zz.id}" ${canEdit ? "" : "disabled"} aria-label="جاهزية ${esc(zz.ar)}">${Object.entries(EXP).map(([k, [l, , en]]) => `<option value="${k}" ${s.expansion[zz.id] === k ? "selected" : ""}>${esc(l)} · ${en}</option>`).join("")}</select>`;
  const launchRes = (zz) => (lr && lr.zoneId === zz.id ? banner(`<b>اتفعّلت ${esc(zz.ar)} كمنطقة تجريبية</b> بواسطة ${esc(lr.by)} ${TW.clock(lr.at)} · ${num(lr.notified)} عميل في قائمة الانتظار اتبعتلهم «توّا وصلت ${esc(zz.ar)}!» · ${lr.leadId ? `مهمة استقطاب الصيدلية: <button class="btn sm ghost g-link" data-act="g-go" data-to="/admin/acquisition">${esc(lr.leadId)} ${lr.created ? "(جديدة)" : "(موجودة في الخط — اتربطت)"}</button>` : ""}`, "ok", "check") : "");
  const zcard = ({ z: zz, m: mm }) => {
    const st = s.expansion[zz.id];
    return `<div class="card g-exp ${zz.id === cur.z.id ? "on" : ""}" data-hl="exp-${zz.id}">
      <div class="hd"><button type="button" class="g-exph" data-act="g-exp-zone" data-id="${zz.id}"><b>${esc(zz.ar)}</b><span class="g-sub" style="margin:0">${esc(D.zoneType[zz.type])} · ${esc(zz.cluster)} · ${num(zz.pop)} نسمة</span></button>${expChip(st)}</div>
      ${mm.suggest !== st ? `<p class="g-sub" style="margin:-4px 0 8px">توصية النظام: ${expChip(mm.suggest)}</p>` : ""}
      <dl class="g-mini">
        <div><dt>قائمة الانتظار</dt><dd class="num">${num(mm.users)}</dd></div><div><dt>عمليات بحث</dt><dd class="num">${num(mm.searches)}</dd></div>
        <div><dt>محاولات طلب</dt><dd class="num">${num(mm.attempts)}</dd></div><div><dt>السكان (تقريبي)</dt><dd class="num">${num(zz.pop)}</dd></div>
        <div><dt>تجار قريبين</dt><dd class="num">${num(mm.nearby)}${mm.local.length && !zz.active ? "" : zz.active ? ` <small>(${mm.local.length} مفعّل)</small>` : ""}</dd></div><div><dt>تغطية صيدلية</dt><dd class="${mm.phOk ? "" : "g-bad"}">${esc(mm.pharmacy)}</dd></div>
        <div><dt>${zz.active ? "طلبات/يوم" : "طلب متوقع/يوم"}</dt><dd class="num">${num(mm.demand)}</dd></div><div><dt>تكلفة توصيل/طلب</dt><dd class="num">${money(mm.cpo)}</dd></div>
        <div><dt>كثافة الرحلة</dt><dd class="num">${num(mm.density, 1)} <small>طلب/رحلة</small></dd></div><div><dt>التعادل/يوم</dt><dd class="num">${mm.be ? num(mm.be) : `<small>${mm.cmOrder >= 0 ? "مربحة" : "تحت التعادل"} (${smoney(mm.cmOrder)}/طلب)</small>`}</dd></div>
        <div><dt>خط الاستقطاب</dt><dd class="num">${num(mm.pipeline.length)} ${mm.pipeline.length ? `<small>${mm.pipeline.slice(0, 2).map((l) => esc(l.id)).join("، ")}</small>` : ""}</dd></div>
      </dl>
      ${mm.be ? `<div class="g-be"><div class="row between" style="font-size:12px"><span>الطلب مقابل التعادل</span><b class="num">${pct(mm.demand / mm.be)}</b></div>${meter(mm.demand, mm.be, mm.demand >= mm.be ? "ok" : mm.demand >= mm.be * 0.6 ? "warn" : "bad")}</div>` : ""}
      ${launchRes(zz)}
      <div class="row wrap g-expact">${statusSel(zz)}${!zz.active ? A.permBtn("zones.edit", "أطلق منطقة خدمة تجريبية", "g-launch", { cls: "sm primary", icon: "power", data: { id: zz.id } }) : ""}${TW.btn("أنشئ مهمة استقطاب تاجر", "g-exp-lead", { cls: "sm", icon: "store", data: { id: zz.id } })}</div></div>`;
  };
  return `${A.head("التوسع الجغرافي", "ذكاء التوسع لكل قرية/تجمع · سيناريو 12", `<button class="btn sm" data-act="g-go" data-to="/admin/zones">${ic("pin", "ic xs")}مناطق الخدمة</button><button class="btn sm" data-act="g-go" data-to="/admin/acquisition">${ic("store", "ic xs")}خط الاستقطاب</button>`)}
  ${A.answer({ what: `${live.length} مناطق شغالة · ${cand.length} مرشحة`, attention: cand[0] ? `${cand[0].z.ar}: ${num(cand[0].m.users)} في الانتظار` : "—", owner: "الشركاء + العمليات + المبيعات", risk: cand[0] && !cand[0].m.phOk ? `${cand[0].z.ar} بدون صيدلية` : "—" })}
  ${cand[0] ? banner(`<b>${esc(cand[0].z.ar)}</b> أقوى فرصة: ${num(cand[0].m.users)} في قائمة الانتظار، ${num(cand[0].m.attempts)} محاولة طلب، وطلب متوقع ${num(cand[0].m.demand)}/يوم ${cand[0].m.be ? `فوق التعادل (${num(cand[0].m.be)})` : ""}. ${cand[0].m.phOk ? "" : "العائق: <b>مفيش صيدلية</b> — ابدأ تجريبي بالرحلات المجدولة مع مهمة استقطاب صيدلية."}`, "brand", "map") : ""}
  <div class="grid g4">${kpi("قائمة الانتظار", num(wlTot), "في مناطق غير مفعّلة")}${kpi("مناطق شغالة", num(live.length), `${live.filter((x) => s.expansion[x.z.id] === "pilot").length} تجريبية`)}${kpi("مرشحة للتوسع", num(cand.length), cand.map((x) => x.z.ar).join("، ") || "—")}${kpi("مهام استقطاب للقرى", num(s.leads.filter((l) => l.stage < 8 && ["near", "outer"].includes((byId(s.zones, l.zoneId) || {}).type)).length), "في خط المبيعات")}</div>
  <div class="g-cols"><div class="card"><div class="hd"><h3>${ic("map", "ic sm")} الخريطة — اضغط على منطقة</h3>${TW.legend([["قائمة انتظار (حجم الدائرة)", "accent"], ["تاجر مفعّل", "teal"]])}</div>${map}</div>
    <div class="card"><div class="hd"><h3>${ic("target", "ic sm")} ${esc(z.ar)} — قرار الجاهزية</h3>${expChip(s.expansion[z.id])}</div>
      <div class="list g-l">${checks.map(([ok, t]) => `<div class="li">${ic(ok ? "check" : "x", "ic sm " + (ok ? "g-okc" : "g-badc"))}<span class="grow">${esc(t)}</span></div>`).join("")}</div>
      <dl class="kv g-kv" style="margin-top:10px"><dt>مساهمة/طلب متوقعة</dt><dd class="num ${m.cmOrder < 0 ? "g-bad" : ""}">${smoney(m.cmOrder)}</dd><dt>مساهمة يومية متوقعة</dt><dd class="num ${dailyCm < 0 ? "g-bad" : ""}">${smoney(dailyCm, 0)}</dd><dt>توصية النظام</dt><dd>${expChip(m.suggest)} <span class="muted">${esc(EXP[m.suggest][2])}</span></dd></dl>
      ${launchRes(z)}
      <div class="row wrap" style="margin-top:10px">${!z.active ? A.permBtn("zones.edit", "أطلق منطقة خدمة تجريبية", "g-launch", { cls: "primary", icon: "power", data: { id: z.id } }) : chip("المنطقة مفعّلة", "ok")}${TW.btn("أنشئ مهمة استقطاب تاجر", "g-exp-lead", { icon: "store", data: { id: z.id } })}</div>
      ${!canEdit ? `<p class="g-sub" style="margin-top:6px">${A.locked("zones.edit")}</p>` : ""}</div></div>
  ${viz(inst, "expbe", `${ic("scale", "ic sm")} الطلب المتوقع مقابل نقطة التعادل (طلب/يوم)`, "القرى المرشحة والقرى المجدولة", pairBars(zs.filter((x) => x.m.be).map(({ z: zz, m: mm }) => ({ label: zz.ar, a: mm.demand, b: mm.be })), ["طلب/يوم", "التعادل/يوم"]), table([{ k: "ar", label: "المنطقة", render: (r) => esc(r.z.ar) }, { k: "d", label: "طلب/يوم", num: true, render: (r) => num(r.m.demand) }, { k: "b", label: "التعادل", num: true, render: (r) => num(r.m.be) }, { k: "c", label: "تكلفة/طلب", num: true, render: (r) => money(r.m.cpo) }, { k: "s", label: "الحالة", render: (r) => expChip(s.expansion[r.z.id]) }], zs.filter((x) => x.m.be)))}
  <h3 class="g-h">${ic("pin", "ic sm")} المرشحة للتوسع</h3>
  <div class="g-expgrid">${cand.map(zcard).join("") || `<div class="card">${TW.empty("كل المناطق مفعّلة", "")}</div>`}</div>
  <h3 class="g-h">${ic("check", "ic sm")} المناطق الشغالة</h3>
  <div class="g-expgrid">${live.sort((a, b) => (a.z.type === "core") - (b.z.type === "core") || b.m.users - a.m.users).map(zcard).join("")}</div>`;
});

/* ======================================================================= INTELLIGENCE · Business analytics ===================== */
function kpiCatalogue() {
  const s = S(), k = TW.kpis(), h = s.hist, d = h.daily;
  const avg = (arr, f) => (arr.length ? sum(arr, f) / arr.length : 0);
  const gmv30 = sum(d, (x) => x.gmv), net30 = sum(d, (x) => x.net), cm30 = sum(d, (x) => x.cm), ord30 = sum(d, (x) => x.orders);
  const act = s.merchants.filter((m) => m.status === "active");
  const wM = (f) => sum(act, (m) => f(m) * m.orders30) / (sum(act, (m) => m.orders30) || 1);
  const inv = Object.values(s.inv.h1);
  const doneT = s.tasks.filter((t) => t.deliveredAt && t.assignedAt);
  const delMin = doneT.length ? avg(doneT, (t) => (t.deliveredAt - t.assignedAt) / 60000) : 31;
  const pickT = s.tasks.filter((t) => t.pickedAt && t.assignedAt);
  const pickMin = pickT.length ? avg(pickT, (t) => (t.pickedAt - t.assignedAt) / 60000) : 9.5;
  const offers = s.tasks.flatMap((t) => t.offers || []).filter((o) => o.resp === "accept");
  const zsAct = Object.entries(h.zoneStats).filter(([, v]) => v);
  const cpo = sum(zsAct, ([, v]) => v.cpo * v.orders) / (sum(zsAct, ([, v]) => v.orders) || 1);
  const promoSpent = sum(s.promos, (p) => p.spent), promoInc = sum(s.promos, (p) => (p.incContribution || 0) * p.redemptions);
  const cacW = sum(h.cac, (x) => x[1] * x[2]) / (sum(h.cac, (x) => x[2]) || 1);
  const act7 = h.activation;
  const refundsDone = s.refunds.filter((r) => ["COMPLETED", "SUBMITTED"].includes(r.status));
  return [
    ["Customer", "العملاء", "users", [["عملاء نشطين شهرياً (MAU)", num(k.activeCust), "TW.kpis"], ["معدل التحويل (زيارة ← طلب)", pct(h.funnel[3][1] / h.funnel[0][1], 1), "hist.funnel"], ["تحويل أول طلب", pct(act7[4][1] / act7[0][1]), "hist.activation"], ["معدل التكرار", pct(act7[6][1] / act7[5][1]), "طلب تاني ÷ أول تسليم"], ["التكرار (طلبات/عميل/شهر)", num(ord30 / k.activeCust, 2), "daily ÷ MAU"], ["متوسط السلة", money(k.aov), "TW.kpis"], ["الاحتفاظ D30", pct(h.retention.d30), "hist.retention"], ["التقييم", `\u2066${num(wM((m) => m.rating || 4.5), 2)} / 5\u2069`, "مرجّح بالطلبات"], ["معدل الاسترداد", pct(refundsDone.length / Math.max(1, s.orders.length), 1), "S.refunds ÷ طلبات اليوم"]]],
    ["Commerce", "التجارة", "receipt", [["GMV (30 يوم)", kmoney(gmv30), "hist.daily"], ["صافي الإيراد (30 يوم)", kmoney(net30), "hist.daily"], ["المساهمة (30 يوم)", kmoney(cm30), "hist.daily"], ["نسبة الاستقطاع (Take rate)", pct(net30 / gmv30, 1), "صافي ÷ GMV"], ["نسبة الخصم", pct(promoSpent / gmv30, 1), "مصروف العروض ÷ GMV"]]],
    ["Fulfillment", "التنفيذ", "box", [["نسبة التلبية (Fill rate)", pct(avg(h.catGmv, (c) => c.fill), 1), "hist.catGmv"], ["نسبة البدائل", pct(avg(h.catGmv, (c) => c.subRate), 1), "hist.catGmv"], ["SLA التجميع", `${num(s.rules.pickSlaMin)} د`, "rules.pickSlaMin"], ["متوسط تجهيز التاجر", `${num(avg(act, (m) => m.prep), 1)} د`, "merchants.prep"], ["دقة الإتاحة", pct(wM((m) => m.availAcc), 1), "merchants.availAcc"]]],
    ["Delivery", "التوصيل", "bike", [["زمن الإسناد", `${num(offers.length ? avg(offers, (o) => o.rt) : 38, 0)} ث`, "tasks.offers.rt"], ["زمن الاستلام", `${num(pickMin, 1)} د`, "assigned ← picked"], ["زمن التوصيل", `${num(delMin, 1)} د`, "assigned ← delivered"], ["في الموعد", pct(avg(d.slice(-7), (x) => x.onTime)), "آخر 7 أيام"], ["نجاح التسليم", pct(k.deliveredPct, 1), "TW.kpis"], ["تكلفة/طلب", money(cpo, 1), "zoneStats مرجّح"], ["طلبات/مندوب/ساعة", num(sum(s.riders, (r) => r.jobsToday) / (sum(s.riders, (r) => r.hours) || 1), 2), "riders"]]],
    ["Merchant", "التجار", "store", [["القبول", pct(wM((m) => m.acceptRate), 1), "merchants.acceptRate"], ["SLA التجهيز", pct(wM((m) => m.prepOnTime), 1), "merchants.prepOnTime"], ["إلغاء بعد القبول", pct(wM((m) => m.cancelAfterAccept), 1), "merchants"], ["دقة الإتاحة", pct(wM((m) => m.availAcc), 1), "merchants"], ["التقييم", num(wM((m) => m.rating || 4.5), 2), "merchants.rating"], ["مساهمة العمولة (30 يوم)", kmoney(sum(act, (m) => m.gmv30 * m.commission)), "gmv30 × عمولة"]]],
    ["Finance", "المالية", "coins", [["فرق الكاش المفتوح", money(k.cashDiscrepancy), "S.cod"], ["تسرّب الاستردادات (على توّا)", money(sum(refundsDone.filter((r) => r.party !== "merchant"), (r) => r.amount)), "S.refunds"], ["مبالغ غير مسوّاة", money(sum(s.msettle.filter((x) => x.status === "DUE"), (x) => x.net)), "msettle DUE"], ["مطابقة المدفوعات", `${num(s.payments.filter((p) => p.status === "PENDING").length)} معلّقة`, "S.payments"], ["مستحق للتجار", kmoney(sum(s.msettle.filter((x) => x.status === "DUE"), (x) => x.net)), "msettle"], ["مستحق للمناديب", money(sum(s.rsettle.filter((x) => x.status === "OPEN"), (x) => x.fees + x.incentives + x.waiting + x.deductions + x.codVariance)), "rsettle"]]],
    ["Inventory", "المخزون", "layers", [["دوران المخزون", `${num(avg(h.catGmv, (c) => c.turns), 1)}×`, "hist.catGmv"], ["نفاد", pct(inv.filter((x) => x.onHand - x.reserved <= 0).length / (inv.length || 1), 1), "S.inv.h1"], ["انكماش (تالف/منتهي)", pct(sum(inv, (x) => x.damaged + x.expired) / (sum(inv, (x) => x.onHand) || 1), 2), "S.inv.h1"], ["قريب الانتهاء (≤ 3 أيام)", `${num(inv.filter((x) => x.expiryDays <= 3).length)} صنف`, "S.inv.h1"], ["الهالك", pct(avg(h.catGmv, (c) => c.waste), 2), "hist.catGmv"], ["أيام التغطية", `${num(sum(inv, (x) => x.onHand) / (sum(inv, (x) => x.velocity) || 1), 1)} يوم`, "رصيد ÷ معدل البيع"]]],
    ["Growth", "النمو", "trend", [["CAC المرجّح", money(cacW), "hist.cac"], ["التفعيل (سجّل ← أول طلب)", pct(act7[4][1] / act7[0][1]), "hist.activation"], ["معدل الطلب التاني", pct(act7[6][1] / act7[5][1]), "hist.activation"], ["الاحتفاظ M3", pct(h.retention.m3), "hist.retention"], ["عائد العروض (ROI)", `${num(promoInc / (promoSpent || 1), 2)}×`, "Σ مساهمة إضافية ÷ مصروف"], ["مساهمة إضافية من الحملات", money(sum(s.campaigns, (c) => c.incContribution)), "S.campaigns"]]],
  ];
}
page("analytics", (inst) => {
  const s = S(), all = s.hist.daily;
  const range = Number(uiv(inst, "AnR", 30)); const d = all.slice(-range); const prevFull = all.slice(Math.max(0, all.length - range * 2), all.length - range);
  const half = Math.floor(d.length / 2); const cmpPrev = prevFull.length >= range; const prev = cmpPrev ? prevFull : d.slice(0, half); const cur = cmpPrev ? d : d.slice(-half);
  const vsTxt = cmpPrev ? "مقابل الفترة السابقة" : "آخر نصف مقابل أول نصف";
  const metric = uiv(inst, "AnM", "orders");
  const MET = { orders: ["الطلبات", (x) => x.orders, (v) => num(v)], gmv: ["GMV", (x) => x.gmv, (v) => money(v)], net: ["صافي الإيراد", (x) => x.net, (v) => money(v)], cm: ["المساهمة", (x) => x.cm, (v) => money(v)] };
  const tot = (arr, f) => sum(arr, f);
  const delta = (f) => { const a = tot(cur, f), b = tot(prev, f); return prev.length ? (a - b) / (b || 1) : null; };
  const dChip = (v) => (v == null ? "" : `<span class="${v >= 0 ? "g-ok" : "g-bad"}">${v >= 0 ? "▲" : "▼"} ${pct(Math.abs(v), 1)}</span> ${vsTxt}`);
  const labels = d.map((x) => String(x.d));
  const [mL, mF, mFmt] = MET[metric];
  const cmPer = tot(d, (x) => x.cm) / (tot(d, (x) => x.orders) || 1), cmPerFirst = d.slice(0, 7).reduce((a, x) => a + x.cm, 0) / (d.slice(0, 7).reduce((a, x) => a + x.orders, 0) || 1), cmPerLast = d.slice(-7).reduce((a, x) => a + x.cm, 0) / (d.slice(-7).reduce((a, x) => a + x.orders, 0) || 1);
  const avgOn = tot(d, (x) => x.onTime) / d.length, avgCx = tot(d, (x) => x.cancel) / d.length;
  const cat = kpiCatalogue();
  return `${A.head("تحليلات الأعمال", `آخر ${range} يوم · من السجل التاريخي + اليوم الحي`, seg("AnR", range, [[7, "7 أيام"], [14, "14 يوم"], [30, "30 يوم"]], "الفترة"))}
  ${banner(`الطلبات ${delta((x) => x.orders) >= 0 ? "زادت" : "قلّت"} ${pct(Math.abs(delta((x) => x.orders)), 1)} (${vsTxt})، والمساهمة لكل طلب اتحركت من ${money(cmPerFirst, 1)} لـ <b>${money(cmPerLast, 1)}</b> (أول أسبوع ← آخر أسبوع في الفترة). في الموعد ${pct(avgOn)} والإلغاء ${pct(avgCx, 1)}.`, "brand", "trend")}
  <div class="grid g5">${kpi("الطلبات", num(tot(d, (x) => x.orders)), dChip(delta((x) => x.orders)), { spark: d.map((x) => x.orders) })}${kpi("GMV", kmoney(tot(d, (x) => x.gmv)), dChip(delta((x) => x.gmv)), { spark: d.map((x) => x.gmv) })}${kpi("صافي الإيراد", kmoney(tot(d, (x) => x.net)), dChip(delta((x) => x.net)), { spark: d.map((x) => x.net) })}${kpi("المساهمة", kmoney(tot(d, (x) => x.cm)), `${money(cmPer, 1)}/طلب`, { spark: d.map((x) => x.cm), tone: "ok" })}${kpi("عملاء جدد", num(tot(d, (x) => x.newCust)), dChip(delta((x) => x.newCust)), { spark: d.map((x) => x.newCust) })}</div>
  ${viz(inst, "an", `${ic("chart", "ic sm")} ${esc(mL)} يومياً`, `آخر ${range} يوم · اليوم من الشهر على المحور الأفقي`, TW.lines([{ name: mL, tone: "brand", values: d.map(mF) }], labels, { area: true, w: 1000, h: 260, fmt: mFmt, label: mL }), table([{ k: "d", label: "اليوم" }, { k: "orders", label: "طلبات", num: true, render: (r) => num(r.orders) }, { k: "gmv", label: "GMV", num: true, render: (r) => money(r.gmv) }, { k: "net", label: "صافي", num: true, render: (r) => money(r.net) }, { k: "cm", label: "مساهمة", num: true, render: (r) => money(r.cm) }, { k: "onTime", label: "في الموعد", num: true, render: (r) => pct(r.onTime) }, { k: "cancel", label: "إلغاء", num: true, render: (r) => pct(r.cancel, 1) }], [...d].reverse()), { top: `<div class="filters g-filters">${seg("AnM", metric, Object.entries(MET).map(([k2, v]) => [k2, v[0]]), "المقياس")}</div>` })}
  <div class="grid g2">${viz(inst, "ot", `${ic("clock", "ic sm")} التوصيل في الموعد`, `متوسط ${pct(avgOn)} · %`, TW.lines([{ name: "في الموعد %", tone: "teal", values: d.map((x) => +(x.onTime * 100).toFixed(1)) }], labels, { w: 620, h: 200, fmt: (v) => `${num(v, 1)}%` }), table([{ k: "d", label: "اليوم" }, { k: "o", label: "في الموعد", num: true, render: (r) => pct(r.onTime, 1) }], [...d].reverse()))}
  ${viz(inst, "cx", `${ic("x", "ic sm")} نسبة الإلغاء`, `متوسط ${pct(avgCx, 1)} · %`, TW.lines([{ name: "إلغاء %", tone: "accent", values: d.map((x) => +(x.cancel * 100).toFixed(2)) }], labels, { w: 620, h: 200, fmt: (v) => `${num(v, 1)}%` }), table([{ k: "d", label: "اليوم" }, { k: "c", label: "إلغاء", num: true, render: (r) => pct(r.cancel, 1) }], [...d].reverse()))}</div>
  <h3 class="g-h">${ic("book", "ic sm")} كتالوج المؤشرات (§51) — القيمة الحالية ومصدرها</h3>
  <div class="g-kcat">${cat.map(([en, ar, icn, rows]) => `<div class="card"><h3>${ic(icn, "ic sm")} ${esc(ar)} <span class="muted" style="font-weight:600;font-size:12px">${en}</span></h3><div class="g-krows">${rows.map(([l, v, sr]) => `<div class="g-kr"><span>${esc(l)}</span><b class="num">${v}</b>${src(sr)}</div>`).join("")}</div></div>`).join("")}</div>`;
});

/* ======================================================================= INTELLIGENCE · Unit economics ===================== */
page("unit-economics", (inst) => {
  const s = S();
  const aov = Number(uiv(inst, "UeAov", 262)), rider = Number(uiv(inst, "UeRider", 27)), promo = Number(uiv(inst, "UePromo", 0.3));
  const base = ueModel(262, 27, 0.3), cur = ueModel(aov, rider, promo);
  const live = liveLedger();
  const view = uiv(inst, "UeV", "model");
  const wfItems = view === "live" && live.n ? live.items : cur.items;
  const wfCm = view === "live" && live.n ? live.cm : cur.cm;
  const wf = waterfall([...wfItems, { label: "مساهمة الطلب", short: "المساهمة", value: wfCm, kind: "total" }], { label: "شلال اقتصاديات الطلب" });
  const ord30 = sum(s.hist.daily, (x) => x.orders);
  const zones = Object.entries(s.hist.zoneStats).filter(([, v]) => v).map(([id, v]) => ({ z: byId(s.zones, id), ...v })).sort((a, b) => b.cm - a.cm);
  const bands = [["أقل من 150", 0, 150, 110], ["150–300", 150, 300, 225], ["300–500", 300, 500, 390], ["أكثر من 500", 500, 1e9, 620]].map(([l, lo, hi, rep]) => { const rows = live.rows.filter((x) => x.L.gmv >= lo && x.L.gmv < hi); return { l, n: rows.length, live: rows.length ? sum(rows, (x) => x.L.contribution) / rows.length : null, model: ueModel(rep, rider, promo).cm }; });
  const pays = ["cod", "card", "wallet"].map((k) => { const rows = live.rows.filter((x) => x.o.pay.method === k); return { k, l: { cod: "كاش عند الاستلام", card: "بطاقة", wallet: "محفظة توّا" }[k], n: rows.length, aov: rows.length ? sum(rows, (x) => x.L.gmv) / rows.length : 0, fee: rows.length ? sum(rows, (x) => x.L.payFee) / rows.length : 0, cm: rows.length ? sum(rows, (x) => x.L.contribution) / rows.length : null }; });
  const rng = (k, v, min, max, step, label, fmt) => `<label class="field g-rng"><span>${esc(label)} <b class="num">${fmt(v)}</b></span><input type="range" class="g-range" min="${min}" max="${max}" step="${step}" value="${v}" data-model="g${k}" data-live aria-label="${esc(label)}"></label>`;
  const dCm = cur.cm - base.cm;
  return `${A.head("اقتصاديات الوحدة", "كل طلب: مين بيكسب ومين بيدفع — من TW.ledger على الطلبات الحية + خط أساس", seg("UeV", view, [["model", "النموذج (المتحكمات)"], ["live", `طلبات اليوم الحية (${live.n})`]], "مصدر الشلال"))}
  ${banner(`متوسط الطلب على النموذج الأساسي (سلة ${money(262)}) بيسيب <b>${smoney(base.cm)}</b> مساهمة؛ طلبات اليوم الحية (${live.n} طلب، متوسط ${money(live.aov)}) بتسيب <b>${smoney(live.cm)}</b>. نقطة التعادل للسلة <b>${money(base.beAov)}</b> — أقل منها كل طلب خسران. أكبر بند تكلفة: المندوب (${money(27)}/طلب).`, live.cm < 0 ? "warn" : "brand", "scale")}
  <div class="grid g4">${kpi("مساهمة/طلب (النموذج)", smoney(cur.cm), dCm ? `${dCm > 0 ? "+" : "−"}${num(Math.abs(dCm), 1)} عن الأساس` : "الافتراضات الأساسية", { tone: cur.cm < 0 ? "bad" : cur.cm < s.rules.minContribution ? "warn" : "ok" })}${kpi("مساهمة/طلب (اليوم الحي)", smoney(live.cm), `${live.n} طلب · TW.ledger`, { tone: live.cm < 0 ? "bad" : "ok" })}${kpi("سلة التعادل", money(cur.beAov), `بالافتراضات الحالية`)}${kpi("مساهمة شهرية متوقعة", kmoney(cur.cm * ord30), `${num(ord30)} طلب/30 يوم`, { tone: cur.cm < 0 ? "bad" : "" })}</div>
  <div class="g-cols">${viz(inst, "wf", `${ic("bars", "ic sm")} شلال الطلب المتوسط (ج.م/طلب)`, view === "live" && live.n ? `متوسط ${live.n} طلب حي اليوم من TW.ledger · التشغيل المتغير مخصص ثابت` : `سلة ${money(aov)} · مندوب ${money(rider)} · ${pct(promo)} من الطلبات بعرض`, wf, table([{ k: "label", label: "البند" }, { k: "value", label: "ج.م/طلب", num: true, render: (r) => smoney(r.value, 2) }], [...wfItems, { label: "مساهمة الطلب", value: wfCm }]), { top: TW.legend([["إيراد", "teal"], ["تكلفة", "accent"], ["المساهمة", "brand"]]) })}
    <div class="card"><h3>${ic("settings", "ic sm")} اختبار الحساسية</h3><p class="g-sub">حرّك المتحكمات — الشلال والمؤشرات بتتحدث فوراً (حالة محلية، مش بتغيّر بيانات).</p>
      ${rng("UeAov", aov, 120, 500, 5, "متوسط السلة", (v) => money(v))}${rng("UeRider", rider, 15, 45, 1, "تكلفة المندوب/طلب", (v) => money(v))}${rng("UePromo", promo, 0, 0.8, 0.05, "نسبة الطلبات بعرض", (v) => pct(v))}
      <div class="g-big num ${cur.cm < 0 ? "g-bad" : "g-ok"}">${smoney(cur.cm)}<small> / طلب</small></div>
      <dl class="kv g-kv"><dt>مقابل الأساس</dt><dd class="num">${smoney(dCm)}</dd><dt>سلة التعادل</dt><dd class="num">${money(cur.beAov)}</dd><dt>حارس المساهمة</dt><dd>${cur.cm >= s.rules.minContribution ? chip(`≥ ${num(s.rules.minContribution)} ج.م`, "ok") : chip(`تحت ${num(s.rules.minContribution)} ج.م`, "bad")}</dd></dl>
      <button class="btn sm ghost" data-act="g-ue-reset" style="margin-top:8px">${ic("undo", "ic xs")}رجّع الافتراضات</button></div></div>
  <div class="g-cols">${viz(inst, "uez", `${ic("pin", "ic sm")} المساهمة حسب المنطقة (ج.م/طلب)`, "آخر 30 يوم · القرى البعيدة خسرانة قبل الكثافة", divBars(zones.map((x) => ({ label: x.z.ar, value: x.cm, sub: `${num(x.orders)} طلب/يوم · تكلفة ${money(x.cpo)}` }))), table([{ k: "z", label: "المنطقة", render: (r) => esc(r.z.ar) }, { k: "orders", label: "طلب/يوم", num: true }, { k: "cm", label: "مساهمة/طلب", num: true, render: (r) => smoney(r.cm) }, { k: "cpo", label: "تكلفة توصيل", num: true, render: (r) => money(r.cpo) }, { k: "km", label: "كم/طلب", num: true, render: (r) => num(r.km, 1) }, { k: "opt", label: "طلب/رحلة", num: true, render: (r) => num(r.opt, 1) }], zones), { foot: TW.legend([["مساهمة موجبة", "teal"], ["سالبة", "accent"]]) })}
    <div class="card"><h3>${ic("receipt", "ic sm")} حسب حجم السلة</h3>${table([{ k: "l", label: "السلة (ج.م)" }, { k: "n", label: "طلبات اليوم", num: true }, { k: "live", label: "مساهمة فعلية", num: true, render: (r) => (r.live == null ? "—" : `<span class="${r.live < 0 ? "g-bad" : ""}">${smoney(r.live)}</span>`) }, { k: "model", label: "النموذج", num: true, render: (r) => `<span class="${r.model < 0 ? "g-bad" : ""}">${smoney(r.model)}</span>` }], bands)}
      <h3 style="margin-top:14px">${ic("card", "ic sm")} حسب طريقة الدفع</h3>${table([{ k: "l", label: "الطريقة" }, { k: "n", label: "طلبات", num: true }, { k: "aov", label: "متوسط السلة", num: true, render: (r) => (r.n ? money(r.aov) : "—") }, { k: "fee", label: "رسوم/طلب", num: true, render: (r) => (r.n ? money(r.fee, 2) : "—") }, { k: "cm", label: "مساهمة/طلب", num: true, render: (r) => (r.cm == null ? "—" : `<span class="${r.cm < 0 ? "g-bad" : ""}">${smoney(r.cm)}</span>`) }], pays)}
      <p class="g-sub" style="margin-top:6px">الكاش: 1.5 ج.م تحصيل + مخاطر فروق · البطاقة: 2.2% + 2 ج.م (Paymob) · المحفظة: بدون رسوم.</p></div></div>`;
}, { on: { "g-ue-reset"(inst) { delete inst.ui.gUeAov; delete inst.ui.gUeRider; delete inst.ui.gUePromo; inst.render(); } } });

/* ======================================================================= INTELLIGENCE · Demand ===================== */
const REPEAT_DAYS = [["bakery", 1.6], ["dairy", 2.8], ["water", 4.5], ["produce", 3.9], ["meat", 6.2], ["grocery", 8.5], ["baby", 11], ["snacks", 5.1], ["pharmacy", 17], ["cleaning", 19], ["care", 23]];
page("demand", (inst) => {
  const s = S(), dm = s.demand;
  const nr = [...dm.noResult].sort((a, b) => b.n - a.n);
  const nrTot = sum(nr, (x) => x.n);
  const dept = (id) => (D.depts.find((x) => x.id === id) || {}).ar;
  const notifyBy = {}; dm.notify.forEach((n) => (notifyBy[n.skuId] = (notifyBy[n.skuId] || 0) + 1)); s.customers.forEach((c) => (c.notifyMe || []).forEach((id) => (notifyBy[id] = Math.max(notifyBy[id] || 0, 1))));
  const oos = Object.entries(s.inv.h1).filter(([, v]) => v.onHand - v.reserved <= 0 || v.onHand < v.reorderPt).map(([id, v]) => ({ id, sku: byId(s.skus, id), v, wait: notifyBy[id] || 0 })).filter((x) => x.sku).sort((a, b) => b.wait - a.wait || a.v.onHand - b.v.onHand).slice(0, 10);
  const subs = {}; s.orders.forEach((o) => o.lines.forEach((l) => { if (l.sub) { const k = l.name; subs[k] = subs[k] || { name: l.name, to: l.sub.name, n: 0, acc: 0 }; subs[k].n++; if (l.state === "substituted") subs[k].acc++; } }));
  const subRows = Object.values(subs).sort((a, b) => b.n - a.n);
  const catSub = [...s.hist.catGmv].sort((a, b) => b.subRate - a.subRate).slice(0, 8);
  const catOos = [...s.hist.catGmv].sort((a, b) => b.oos - a.oos).slice(0, 8);
  const zrows = s.zones.map((z) => { const m = zoneMetrics(z); return { z, m, per1k: (m.demand / z.pop) * 1000 }; }).sort((a, b) => b.m.demand - a.m.demand);
  const restricted = (x) => x.dept === null;
  return `${A.head("ذكاء الطلب", "اللي العملاء بيدوروا عليه ومش لاقيينه — مصدر قرارات الشراء والكتالوج والاستقطاب", `<button class="btn sm" data-act="g-go" data-to="/admin/purchasing">${ic("cart", "ic xs")}المشتريات</button><button class="btn sm" data-act="g-go" data-to="/admin/catalog">${ic("box", "ic xs")}الكتالوج</button>`)}
  ${banner(`<b>${esc(nr[0].q)}</b> أكتر بحث بدون نتيجة (${num(nr[0].n)} مرة) — ${dept(nr[0].dept) ? `قسم ${esc(dept(nr[0].dept))}` : "صنف مقيّد"}. ${num(nrTot)} بحث بدون نتيجة من ${num(dm.searches)} بحث (${pct(nrTot / dm.searches, 1)}). أعلى قرية طلباً من غير خدمة: <b>${esc((zrows.find((x) => !x.z.active) || zrows[0]).z.ar)}</b>.`, "brand", "search")}
  <div class="grid g5">${kpi("عمليات بحث", num(dm.searches), "اليوم")}${kpi("بحث بدون نتيجة", num(nrTot), pct(nrTot / dm.searches, 1), { tone: "warn" })}${kpi("طلبات «بلّغني»", num(dm.notify.length + sum(s.customers, (c) => (c.notifyMe || []).length)), "على أصناف نافدة")}${kpi("بدائل اليوم", num(sum(subRows, (x) => x.n)), `${num(sum(subRows, (x) => x.acc))} اتقبلت`)}${kpi("أصناف تحت حد الطلب", num(Object.values(s.inv.h1).filter((v) => v.onHand < v.reorderPt).length), "في الهب")}</div>
  <div class="g-cols">${viz(inst, "nr", `${ic("search", "ic sm")} بحث بدون نتيجة`, "عدد المرات · اضغط «اطلب SKU» أو «دبّر المنتج»", TW.hbars(nr.slice(0, 8).map((x) => ({ label: x.q, value: x.n, tone: restricted(x) ? "muted" : "brand", sub: x.resolvedBy ? "اتحل" : "" }))), table([{ k: "q", label: "البحث" }, { k: "n", label: "مرات", num: true }, { k: "dept", label: "القسم", render: (r) => esc(dept(r.dept) || "مقيّد") }], nr))}
    <div class="card"><h3>${ic("list", "ic sm")} قرارات على البحث بدون نتيجة</h3>${table([
      { k: "q", label: "البحث", render: (r) => `<b>${esc(r.q)}</b><span class="sub">${esc(dept(r.dept) || "—")}</span>` },
      { k: "n", label: "مرات", num: true },
      { k: "st", label: "الحالة", render: (r) => (restricted(r) ? chip("صنف مقيّد — لا يُباع", "neutral", "lock") : r.resolvedBy ? chip(`اتضاف ${r.resolvedBy}`, "ok") : chip("فرصة", "warn")) },
      { k: "a", label: "إجراء", render: (r) => (restricted(r) || r.resolvedBy ? `<span class="muted">—</span>` : `<div class="row gap4 wrap"><button class="btn sm" data-act="g-go" data-to="/admin/catalog">${ic("plus", "ic xs")}اطلب SKU</button><button class="btn sm ghost" data-act="g-go" data-to="/admin/purchasing">${ic("cart", "ic xs")}دبّر المنتج</button></div>`) },
    ], nr.slice(0, 8))}</div></div>
  <div class="g-cols"><div class="card"><h3>${ic("bell", "ic sm")} نافد أو تحت حد الطلب — مع طلبات «بلّغني»</h3>${table([
      { k: "s", label: "الصنف", render: (r) => `<b>${esc(r.sku.ar)}</b><span class="sub">${esc(r.sku.size || "")}</span>` },
      { k: "oh", label: "رصيد", num: true, render: (r) => `<span class="${r.v.onHand - r.v.reserved <= 0 ? "g-bad" : ""}">${num(r.v.onHand - r.v.reserved)}</span>` },
      { k: "vel", label: "بيع/يوم", num: true, render: (r) => num(r.v.velocity, 1) },
      { k: "inc", label: "وارد", num: true, render: (r) => (r.v.incoming ? num(r.v.incoming) : "—") },
      { k: "w", label: "منتظرين", num: true, render: (r) => (r.wait ? `<b>${num(r.wait)}</b>` : "—") },
      { k: "a", label: "", render: () => `<button class="btn sm ghost" data-act="g-go" data-to="/admin/purchasing">${ic("cart", "ic xs")}دبّر المنتج</button>` },
    ], oos, { empty: "كل الأصناف فوق حد الطلب" })}</div>
    ${viz(inst, "sub", `${ic("refresh", "ic sm")} البدائل والنفاد حسب القسم`, "نسبة البدائل (30 يوم) · بحث على صنف نافد اليوم", `<div class="lbl">نسبة البدائل</div>${TW.hbars(catSub.map((c) => ({ label: c.ar, value: c.subRate * 100 })), { fmt: (v) => `${num(v, 1)}%` })}<div class="lbl" style="margin-top:10px">بحث على صنف نافد</div>${TW.hbars(catOos.map((c) => ({ label: c.ar, value: c.oos, tone: "accent" })), { fmt: (v) => num(v) })}${subRows.length ? `<hr class="sep"><div class="lbl">بدائل طلبات اليوم</div>${subRows.slice(0, 4).map((x) => `<div class="row between" style="font-size:12.5px"><span>${esc(x.name)} ← ${esc(x.to)}</span><span class="num">${num(x.n)} · قبول ${num(x.acc)}</span></div>`).join("")}` : ""}`, table([{ k: "ar", label: "القسم" }, { k: "subRate", label: "بدائل", num: true, render: (r) => pct(r.subRate, 1) }, { k: "oos", label: "بحث نافد", num: true }, { k: "fill", label: "تلبية", num: true, render: (r) => pct(r.fill, 1) }], s.hist.catGmv))}</div>
  <div class="g-cols">${viz(inst, "dv", `${ic("pin", "ic sm")} الطلب حسب القرية`, "طلبات/يوم للمفعّلة · طلب متوقع لغير المفعّلة · قائمة الانتظار", TW.hbars(zrows.map((x) => ({ label: x.z.ar, value: x.m.demand, tone: x.z.active ? "brand" : "accent", sub: x.m.users ? `${num(x.m.users)} منتظر` : "" }))), table([{ k: "z", label: "القرية", render: (r) => esc(r.z.ar) }, { k: "d", label: "طلب/يوم", num: true, render: (r) => num(r.m.demand) }, { k: "u", label: "انتظار", num: true, render: (r) => num(r.m.users) }, { k: "s", label: "بحث", num: true, render: (r) => num(r.m.searches) }, { k: "a", label: "محاولات", num: true, render: (r) => num(r.m.attempts) }, { k: "p", label: "لكل 1000 نسمة", num: true, render: (r) => num(r.per1k, 2) }], zrows), { foot: TW.legend([["منطقة مفعّلة (فعلي)", "brand"], ["غير مفعّلة (متوقع)", "accent"]]) })}
    ${viz(inst, "rp", `${ic("history", "ic sm")} فترة إعادة الشراء (أيام)`, "متوسط الأيام بين طلبين لنفس القسم — بيشغّل تذكير إعادة الطلب", TW.hbars(REPEAT_DAYS.map(([id, dd]) => ({ label: dept(id), value: dd, tone: "teal" })), { fmt: (v) => `${num(v, 1)} يوم` }), table([{ k: 0, label: "القسم", render: (r) => esc(dept(r[0])) }, { k: 1, label: "أيام", num: true, render: (r) => num(r[1], 1) }], REPEAT_DAYS))}</div>`;
});

/* ======================================================================= INTELLIGENCE · Merchant performance ===================== */
function merchantScore(m) {
  const sc = 20 * m.acceptRate + 20 * m.prepOnTime + 20 * m.availAcc + 15 * (1 - clamp(m.cancelAfterAccept / 0.05, 0, 1)) + 15 * (1 - clamp(m.complaintRate / 0.03, 0, 1)) + 10 * (1 - clamp(m.subRate / 0.08, 0, 1));
  return Math.round(sc);
}
function coaching(m) {
  const issues = [[1 - m.prepOnTime, 0.12, `آخر 30 يوم ${pct(1 - m.prepOnTime)} من طلباتك اتأخرت بسبب تجهيز الأصناف — قلّل وقت التجهيز المعلن أو جهّز الأصناف السريعة الأول.`], [1 - m.availAcc, 0.07, `${pct(1 - m.availAcc)} من الأصناف المطلوبة طلعت مش موجودة — حدّث المتاح قبل الذروة (5–9 م).`], [1 - m.acceptRate, 0.06, `${pct(1 - m.acceptRate)} من الطلبات ماتقبلتش في المهلة — فعّل صوت التنبيه أو القبول التلقائي.`], [m.cancelAfterAccept, 0.025, `${pct(m.cancelAfterAccept, 1)} إلغاء بعد القبول — اقبل بس اللي متأكد إنه موجود.`], [m.complaintRate, 0.02, `${pct(m.complaintRate, 1)} شكاوى — راجع التغليف وتطابق الأصناف.`], [m.subRate, 0.06, `${pct(m.subRate, 1)} بدائل — حدّث الأصناف الناقصة عشان العميل ياخد اللي طلبه.`]];
  const w = issues.map(([v, th, t]) => [v / th, t]).sort((a, b) => b[0] - a[0])[0];
  return w[0] >= 1 ? w[1] : null;
}
page("merchant-performance", (inst) => {
  const s = S();
  const cls = uiv(inst, "MpC", "all"), sort = uiv(inst, "MpS", "gmv");
  const refundsBy = {}; s.refunds.filter((r) => r.party === "merchant").forEach((r) => { const o = byId(s.orders, r.orderId); if (!o) return; const mid = (o.lines.find((l) => l.sourceType === "merchant") || {}).sourceId; if (mid) refundsBy[mid] = (refundsBy[mid] || 0) + r.amount; });
  const rows = s.merchants.map((m) => {
    const st = s.msettle.filter((x) => x.merchantId === m.id);
    const due = st.filter((x) => x.status === "DUE"), disp = st.some((x) => x.lines.some((l) => l.status === "disputed"));
    const score = merchantScore(m);
    return { m, score, suggest: m.status === "pending" ? "pending" : score >= 70 ? "healthy" : score >= 62 ? "watch" : "restricted", twaa: m.gmv30 * m.commission - m.orders30 * 2.5, refund: refundsBy[m.id] || 0, settle: disp ? ["نزاع مفتوح", "bad"] : due.length ? [`مستحق ${kmoney(sum(due, (x) => x.net))}`, "warn"] : st.length ? ["مدفوع", "ok"] : ["—", "neutral"], coach: coaching(m) };
  });
  const counts = Object.fromEntries(Object.keys(MCLASS).map((k) => [k, rows.filter((r) => r.m.status !== "pending" && r.m.health === k).length]));
  const SORT = { gmv: (r) => -r.m.gmv30, score: (r) => r.score, accept: (r) => r.m.acceptRate, prep: (r) => r.m.prepOnTime, twaa: (r) => -r.twaa };
  const shown = rows.filter((r) => cls === "all" || (cls === "pending" ? r.m.status === "pending" : r.m.status !== "pending" && r.m.health === cls)).sort((a, b) => SORT[sort](a) - SORT[sort](b));
  const attention = rows.filter((r) => r.m.status !== "pending" && (r.score < 70 || ["watch", "restricted"].includes(r.m.health))).sort((a, b) => a.score - b.score).slice(0, 4);
  const pctC = (v, bad, warn, inv = false) => `<span class="${inv ? (v > bad ? "g-bad" : v > warn ? "g-warn" : "") : v < bad ? "g-bad" : v < warn ? "g-warn" : ""}">${pct(v, 1)}</span>`;
  return `${A.head("أداء التجار", "بطاقة أداء لكل تاجر — تدريب قبل العقوبة (§36)", "")}
  ${banner(attention.length ? `<b>${attention.length} تجار محتاجين متابعة.</b> أقلهم: <b>${esc(attention[0].m.ar)}</b> (درجة ${attention[0].score}) — ${esc(attention[0].coach || "راجع البطاقة")}` : "كل التجار في الحدود.", attention.length ? "warn" : "ok", "store")}
  <div class="grid g6">${Object.entries(MCLASS).map(([k, [l, t]]) => kpi(l, num(counts[k]), k === "healthy" ? "درجة ≥ 70" : k === "watch" ? "62–70" : k === "restricted" ? "< 62 أو قرار" : k === "new" ? "أول 30 يوم" : "مقفول", { tone: t === "ok" ? "ok" : t === "bad" && counts[k] ? "bad" : t === "warn" && counts[k] ? "warn" : "" })).join("")}${kpi("قيد التفعيل", num(rows.filter((r) => r.m.status === "pending").length), "خط المبيعات")}</div>
  <div class="card"><div class="hd"><h3>${ic("crown", "ic sm")} جدول الترتيب</h3></div>
    <div class="filters g-filters">${seg("MpC", cls, [["all", "الكل"], ["healthy", "سليم"], ["watch", "مراقبة"], ["restricted", "مقيّد"], ["new", "جديد"], ["pending", "قيد التفعيل"]], "التصنيف")}<span class="lbl">ترتيب حسب</span>${sel("MpS", sort, [["gmv", "GMV"], ["score", "الدرجة (الأضعف أولاً)"], ["accept", "القبول (الأضعف أولاً)"], ["prep", "SLA التجهيز (الأضعف أولاً)"], ["twaa", "مساهمة توّا"]], 'style="width:auto"')}</div>
    <div class="tw"><table class="tbl g-league"><thead><tr><th>#</th><th>التاجر</th><th>التصنيف</th><th class="n">الدرجة</th><th class="n">GMV 30 يوم</th><th class="n">القبول / الزمن</th><th class="n">SLA التجهيز</th><th class="n">إلغاء بعد القبول</th><th class="n">دقة الإتاحة</th><th class="n">بدائل</th><th class="n">شكاوى</th><th class="n">استرداد عليه</th><th class="n">التقييم</th><th class="n">مساهمة توّا</th><th>التسوية</th><th>رسالة تدريب</th></tr></thead><tbody>${shown.map((r, i) => `<tr><td class="num muted">${i + 1}</td><td><button class="btn sm ghost g-link" data-act="open-merchant" data-id="${r.m.id}"><b>${esc(r.m.ar)}</b></button><span class="sub">${esc(D.merchantTypes[r.m.type])} · ${esc(A.zone(r.m.zoneId))}</span></td><td>${mClassChip(r.m)}${r.suggest !== "pending" && r.suggest !== r.m.health && r.m.health !== "new" ? `<span class="sub">النظام يقترح: ${esc(MCLASS[r.suggest][0])}</span>` : ""}</td><td class="n num"><b>${r.m.status === "pending" ? "—" : r.score}</b></td><td class="n num">${kmoney(r.m.gmv30)}<span class="sub">${num(r.m.orders30)} طلب</span></td><td class="n num">${pctC(r.m.acceptRate, 0.92, 0.95)}<span class="sub">${num(r.m.acceptSec)} ث</span></td><td class="n num">${pctC(r.m.prepOnTime, 0.85, 0.9)}</td><td class="n num">${pctC(r.m.cancelAfterAccept, 0.03, 0.015, true)}</td><td class="n num">${pctC(r.m.availAcc, 0.92, 0.95)}</td><td class="n num">${pctC(r.m.subRate, 0.06, 0.04, true)}</td><td class="n num">${pctC(r.m.complaintRate, 0.02, 0.01, true)}</td><td class="n num">${r.refund ? money(r.refund) : "—"}</td><td class="n num">${r.m.rating ? num(r.m.rating, 1) : "—"}</td><td class="n num">${kmoney(r.twaa)}</td><td>${chip(r.settle[0], r.settle[1])}</td><td class="g-coach">${r.coach && r.m.status !== "pending" ? `<span${tip(r.coach)}>«${esc(r.coach)}»</span>` : `<span class="muted">—</span>`}</td></tr>`).join("")}</tbody></table></div>
    <p class="g-sub" style="margin-top:8px">الدرجة (من 100؛ سليم ≥ 70) = قبول 20 + SLA تجهيز 20 + دقة إتاحة 20 + إلغاء بعد القبول 15 + شكاوى 15 + بدائل 10. التصنيف الرسمي بيتغيّر من ملف التاجر بسبب مسجّل (merchant.status) — الجدول بيقترح بس.</p></div>
  <div class="card"><h3>${ic("chat", "ic sm")} رسائل التدريب المقترحة</h3><div class="list g-l">${attention.map((r) => `<div class="li"><span class="grow"><b>${esc(r.m.ar)}</b> ${mClassChip(r.m)}<span class="sub">«${esc(r.coach || "أداء أقل من المتوسط في أكتر من مؤشر — اتصال متابعة من عمليات التجار.")}»</span></span><button class="btn sm" data-act="open-merchant" data-id="${r.m.id}">${ic("store", "ic xs")}ملف التاجر</button></div>`).join("") || `<p class="g-sub">مفيش.</p>`}</div></div>`;
});

/* ======================================================================= INTELLIGENCE · Rider performance ===================== */
function riderPillars(r) {
  const jobs = Math.max(1, r.jobsToday);
  const safety = r.incidents ? 60 : 100;
  const accuracy = Math.round(100 * (1 - r.fails / jobs) * 0.5 + 100 * r.codAcc * 0.5);
  const cx = Math.round((r.rating / 5) * 100);
  const cash = Math.round(100 * (r.codAcc * 0.5 + r.depositOnTime * 0.5));
  const speed = Math.round(r.onTime * 100);
  return { safety, accuracy, cx, cash, speed, total: Math.round(0.2 * safety + 0.25 * accuracy + 0.2 * cx + 0.2 * cash + 0.15 * speed) };
}
page("rider-performance", (inst) => {
  const s = S();
  const sort = uiv(inst, "RpS", "total");
  const rows = s.riders.map((r) => { const P = riderPillars(r); const jobs = Math.max(1, r.jobsToday); return { r, P, oph: r.jobsToday / (r.hours || 1), eph: r.earnToday / (r.hours || 1), delMin: 14 + (r.km / jobs) * 2.4 }; });
  const SORT = { total: (x) => x.P.total, safety: (x) => x.P.safety, accuracy: (x) => x.P.accuracy, cash: (x) => x.P.cash, speed: (x) => x.P.speed };
  rows.sort((a, b) => SORT[sort](a) - SORT[sort](b));
  const fast = [...rows].sort((a, b) => b.P.speed - a.P.speed)[0];
  const watch = rows.filter((x) => x.P.total < 85 || x.r.incidents || x.P.cash < 92);
  const pill = (v) => `<span class="g-pill"><i class="${v >= 90 ? "b-ok" : v >= 75 ? "b-warn" : "b-bad"}" style="width:${v}%"></i></span><span class="num">${v}</span>`;
  return `${A.head("أداء المناديب", "متوازن: السلامة والدقة وتجربة العميل وانضباط الكاش — مش السرعة بس (§37)", seg("RpS", sort, [["total", "الإجمالي"], ["safety", "السلامة"], ["accuracy", "الدقة"], ["cash", "الكاش"], ["speed", "السرعة"]], "ترتيب (الأضعف أولاً)"))}
  ${banner(`الأسرع (${esc(fast.r.ar)}, ${fast.P.speed}% في الموعد) ${fast.P.total < 90 ? `<b>مش</b> الأعلى في الدرجة الكلية (${fast.P.total}) — ` : ""}السرعة وزنها 15% بس. ${watch.length} مندوب محتاجين متابعة في السلامة أو الكاش.`, watch.length ? "warn" : "ok", "bike")}
  <div class="grid g5">${kpi("مهام اليوم", num(sum(s.riders, (r) => r.jobsToday)), `${s.riders.filter((r) => r.status !== "offline").length} أونلاين`)}${kpi("في الموعد", pct(sum(s.riders, (r) => r.onTime) / s.riders.length), "متوسط")}${kpi("دقة الكاش", pct(sum(s.riders, (r) => r.codAcc) / s.riders.length, 1), "متوسط")}${kpi("حوادث", num(sum(s.riders, (r) => r.incidents)), "هذا الأسبوع", { tone: sum(s.riders, (r) => r.incidents) ? "warn" : "ok" })}${kpi("كسب/ساعة", money(sum(rows, (x) => x.eph) / rows.length), "متوسط")}</div>
  <div class="card"><div class="hd"><h3>${ic("list", "ic sm")} بطاقات الأداء</h3>${TW.legend([["≥ 90", "ok"], ["75–90", "warn"], ["< 75", "bad"]])}</div>
    <div class="tw"><table class="tbl g-league"><thead><tr><th>المندوب</th><th>السلامة 20%</th><th>الدقة 25%</th><th>تجربة العميل 20%</th><th>الكاش 20%</th><th>السرعة 15%</th><th class="n">الإجمالي</th><th class="n">مهام</th><th class="n">القبول</th><th class="n">استلام في الموعد</th><th class="n">زمن التوصيل</th><th class="n">التقييم</th><th class="n">فشل</th><th class="n">دقة الكاش</th><th class="n">إيداع في الموعد</th><th class="n">كم</th><th class="n">طلب/س</th><th class="n">كسب/س</th><th class="n">حوادث</th><th class="n">إنقاذ</th></tr></thead><tbody>${rows.map((x) => `<tr><td><button class="btn sm ghost g-link" data-act="open-rider" data-id="${x.r.id}"><b>${esc(x.r.ar)}</b></button><span class="sub">${esc(D.vehicles[x.r.vehicle])} · ${esc(A.zone(x.r.zoneId))}${x.r.suspended ? " · موقوف" : ""}</span></td><td>${pill(x.P.safety)}</td><td>${pill(x.P.accuracy)}</td><td>${pill(x.P.cx)}</td><td>${pill(x.P.cash)}</td><td>${pill(x.P.speed)}</td><td class="n num"><b>${x.P.total}</b></td><td class="n num">${num(x.r.jobsToday)}</td><td class="n num">${pct(x.r.accept)}</td><td class="n num">${pct(x.r.onTime)}</td><td class="n num">${num(x.delMin, 0)} د</td><td class="n num">${num(x.r.rating, 1)}</td><td class="n num">${x.r.fails ? `<span class="g-warn">${x.r.fails}</span>` : "0"}</td><td class="n num">${pct(x.r.codAcc, 1)}</td><td class="n num">${pct(x.r.depositOnTime)}</td><td class="n num">${num(x.r.km)}</td><td class="n num">${num(x.oph, 2)}</td><td class="n num">${money(x.eph)}</td><td class="n num">${x.r.incidents ? `<span class="g-bad">${x.r.incidents}</span>` : "0"}</td><td class="n num">${x.r.rescues || 0}</td></tr>`).join("")}</tbody></table></div>
    <p class="g-sub" style="margin-top:8px">السلامة: حوادث مسجلة · الدقة: فشل التسليم + دقة الكاش · تجربة العميل: التقييم · الكاش: الدقة + الإيداع في الموعد · السرعة: الاستلام في الموعد. «إنقاذ» = مهمة اتنقلت من مندوب متعطل.</p></div>
  <div class="card"><h3>${ic("shield", "ic sm")} محتاجين متابعة</h3><div class="list g-l">${watch.map((x) => `<div class="li"><span class="grow"><b>${esc(x.r.ar)}</b><span class="sub">${[x.r.incidents ? "حادث مسجّل — مراجعة سلامة قبل الوردية الجاية" : "", x.P.cash < 92 ? `انضباط الكاش ${x.P.cash} — إيداع في الموعد ${pct(x.r.depositOnTime)}` : "", x.r.fails >= 2 ? `${x.r.fails} تسليم فاشل اليوم` : "", x.P.total < 85 && !x.r.incidents && x.P.cash >= 92 ? `الدرجة الكلية ${x.P.total}` : ""].filter(Boolean).join(" · ")}</span></span><button class="btn sm" data-act="open-rider" data-id="${x.r.id}">${ic("bike", "ic xs")}ملف المندوب</button></div>`).join("") || `<p class="g-sub">مفيش.</p>`}</div></div>`;
});

/* ======================================================================= INTELLIGENCE · Cohorts ===================== */
page("cohorts", (inst) => {
  const s = S(), h = s.hist, ret = h.retention, act = h.activation;
  const cols = ["الشهر 0", "الشهر 1", "الشهر 2", "الشهر 3"];
  const tri = `<div class="tw"><table class="tbl g-tri"><thead><tr><th>شهر التسجيل</th><th class="n">الحجم</th>${cols.map((c) => `<th class="n">${c}</th>`).join("")}</tr></thead><tbody>${h.cohorts.map((c) => `<tr><td><b>${esc(c.m)}</b></td><td class="n num">${num(c.size)}</td>${c.v.map((v, i) => (v == null ? `<td class="g-na">—</td>` : `<td class="n num ${i ? `g-q${qStep(v, 0.6)}` : "g-m0"}"${tip(`${c.m} · ${cols[i]}: ${pct(v)} (${num(Math.round(c.size * v))} عميل)`)}>${pct(v)}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
  const m1 = h.cohorts.filter((c) => c.v[1] != null);
  const second = act[6][1] / act[5][1];
  return `${A.head("مجموعات العملاء", "الاحتفاظ حسب شهر التسجيل · التفعيل · الطلب التاني", "")}
  ${banner(`الاحتفاظ في الشهر الأول بيتحسن: من ${pct(m1[0].v[1])} (${esc(m1[0].m)}) لـ <b>${pct(m1[m1.length - 1].v[1])}</b> (${esc(m1[m1.length - 1].m)}). أكبر تسريب في التفعيل بين «منطقته متاحة» و«أول سلة» (${pct(1 - act[2][1] / act[1][1])} بيقعوا).`, "brand", "users")}
  <div class="grid g5">${kpi("D7", pct(ret.d7), "رجع خلال 7 أيام")}${kpi("D30", pct(ret.d30), "رجع خلال 30 يوم")}${kpi("M2", pct(ret.m2), "نشط في الشهر التاني")}${kpi("M3", pct(ret.m3), "نشط في الشهر التالت")}${kpi("معدل الطلب التاني", pct(second), `${num(act[6][1])} من ${num(act[5][1])}`, { tone: "ok" })}</div>
  <div class="g-cols">${viz(inst, "tri", `${ic("grid", "ic sm")} مثلث الاحتفاظ`, "نسبة العملاء النشطين من كل مجموعة · اللون أغمق = احتفاظ أعلى", `${tri}${qLegend(60, (v) => num(v, 0) + "%")}<p class="g-sub">الشهر 0 = 100% دائماً (أساس المجموعة) ومش داخل في مقياس الألوان.</p>`, "")}
    ${viz(inst, "act", `${ic("filter", "ic sm")} قمع التفعيل`, "آخر 30 يوم · كل خطوة بنسبتها من اللي قبلها", TW.hbars(act.map(([l, v], i) => ({ label: l, value: v, tone: i === act.length - 1 ? "accent" : "brand", sub: i ? pct(v / act[i - 1][1]) : "" }))), table([{ k: 0, label: "الخطوة" }, { k: 1, label: "العدد", num: true, render: (r) => num(r[1]) }, { k: 2, label: "من اللي قبلها", num: true, render: (r, i) => (i ? pct(r[1] / act[i - 1][1], 1) : "—") }, { k: 3, label: "من التسجيل", num: true, render: (r) => pct(r[1] / act[0][1], 1) }], act))}</div>
  <div class="card"><h3>${ic("target", "ic sm")} إيه اللي بيحرّك الاحتفاظ</h3><ul class="g-list"><li><b>الطلب التاني خلال 7 أيام</b> أقوى مؤشر — حملة CP-9 بتستهدفه (${pct(second)} حالياً).</li><li><b>«منطقته متاحة» ← «أول سلة»:</b> اعرض «محلات حواليك» و«اطلب تاني» في أول جلسة؛ ${num(act[1][1] - act[2][1])} عميل وقعوا هنا.</li><li><b>القرى المجدولة</b> احتفاظها أعلى لما الرحلة ثابتة في نفس الميعاد — ثبّت النوافذ.</li><li>شوف <button class="btn sm ghost g-link" data-act="g-go" data-to="/admin/segments">الشرائح</button> و<button class="btn sm ghost g-link" data-act="g-go" data-to="/admin/campaigns">الحملات</button> للتنفيذ.</li></ul></div>`;
});

/* ======================================================================= INTELLIGENCE · Heatmaps ===================== */
const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const hourAr = (h) => { const p = h >= 12 ? "م" : "ص"; const x = h % 12 || 12; return `${x} ${p}`; };
page("heatmaps", (inst) => {
  const s = S(), heat = s.hist.heat; const hours = Array.from({ length: heat[0].length }, (_, i) => 8 + i);
  const mx = Math.max(...heat.flat());
  let peak = [0, 0, -1]; heat.forEach((row, d) => row.forEach((v, i) => { if (v > peak[2]) peak = [d, i, v]; }));
  const dayTot = heat.map((r) => sum(r)); const hourTot = hours.map((_, i) => sum(heat, (r) => r[i]));
  const quiet = hourTot.indexOf(Math.min(...hourTot));
  const grid = `<div class="tw"><table class="g-heat" role="grid" aria-label="الطلب حسب اليوم والساعة"><thead><tr><th></th>${hours.map((h) => `<th>${h % 2 === 0 ? hourAr(h) : ""}</th>`).join("")}<th class="n">الإجمالي</th></tr></thead><tbody>${heat.map((row, d) => `<tr><th>${WEEKDAYS[d]}</th>${row.map((v, i) => `<td class="g-q${qStep(v, mx + 0.01)}"${tip(`${WEEKDAYS[d]} ${hourAr(hours[i])}–${hourAr(hours[i] + 1)}: ${num(v)} طلب`)} tabindex="0"><span class="sr">${num(v)}</span></td>`).join("")}<td class="n num">${num(dayTot[d])}</td></tr>`).join("")}</tbody></table></div>`;
  const metric = uiv(inst, "HmM", "orders");
  const zs = s.zones.filter((z) => z.active).map((z) => { const st = s.hist.zoneStats[z.id] || { orders: 0 }; return { z, orders: st.orders || 0, per1k: ((st.orders || 0) / z.pop) * 1000, st }; });
  const zv = (x) => (metric === "orders" ? x.orders : x.per1k);
  const zmx = Math.max(...zs.map(zv), 0.01);
  const dots = zs.map((x) => `<g data-act="g-hm-zone" data-id="${x.z.id}"${tip(`${x.z.ar}: ${num(x.orders)} طلب/يوم · ${num(x.per1k, 2)} لكل 1000 نسمة`)}><circle class="g-hz g-qf${qStep(zv(x), zmx + 0.001)}" cx="${x.z.x}" cy="${x.z.y}" r="${(13 + Math.sqrt(zv(x) / zmx) * 30).toFixed(1)}"/><text class="g-wlt" x="${x.z.x}" y="${x.z.y + 5}" text-anchor="middle">${metric === "orders" ? num(x.orders) : num(x.per1k, 1)}</text></g>`).join("");
  const selZ = uiv(inst, "HmZ", "center");
  const map = A.map({ zoneAct: "g-hm-zone", selZone: selZ, riders: false, merchants: false }).replace(/<\/svg><\/div>$/, `${dots}</svg></div>`);
  const sz = zs.find((x) => x.z.id === selZ) || zs[0];
  return `${A.head("الخرائط الحرارية", "الطلب حسب اليوم والساعة وحسب المنطقة — لتخطيط المناديب والرحلات والحملات", "")}
  ${banner(`الذروة <b>${WEEKDAYS[peak[0]]} ${hourAr(hours[peak[1]])}–${hourAr(hours[peak[1]] + 1)}</b> (${num(peak[2])} طلب). الخميس والجمعة أعلى بـ ~25% — زوّد المناديب من 7 م. أهدى ساعة ${hourAr(hours[quiet])}: مناسبة لرحلات القرى والتوريد.`, "brand", "fire")}
  ${viz(inst, "hm", `${ic("grid", "ic sm")} الطلب: اليوم × الساعة`, "متوسط الطلبات في الساعة (آخر 4 أسابيع) · اللون أغمق = طلب أعلى", `${grid}${qLegend(mx)}`, table([{ k: "d", label: "اليوم", render: (r) => WEEKDAYS[r.d] }, ...hours.map((h, i) => ({ k: "h" + h, label: hourAr(h), num: true, render: (r) => num(r.row[i]) })), { k: "t", label: "الإجمالي", num: true, render: (r) => num(dayTot[r.d]) }], heat.map((row, d) => ({ d, row }))))}
  <div class="g-cols"><div class="card"><div class="hd"><h3>${ic("map", "ic sm")} كثافة الطلب حسب المنطقة</h3>${seg("HmM", metric, [["orders", "طلبات/يوم"], ["per1k", "لكل 1000 نسمة"]], "المقياس")}</div>${map}${qLegend(zmx, (v) => num(v, metric === "orders" ? 0 : 1))}</div>
    <div class="card"><h3>${ic("pin", "ic sm")} ${esc(sz.z.ar)}</h3><dl class="kv"><dt>طلبات/يوم</dt><dd class="num">${num(sz.orders)}</dd><dt>لكل 1000 نسمة</dt><dd class="num">${num(sz.per1k, 2)}</dd><dt>تكلفة/طلب</dt><dd class="num">${money(sz.st.cpo)}</dd><dt>كم/طلب</dt><dd class="num">${num(sz.st.km, 1)}</dd><dt>طلبات/رحلة</dt><dd class="num">${num(sz.st.opt, 1)}</dd><dt>في الموعد</dt><dd class="num">${pct(sz.st.onTime)}</dd><dt>مساهمة/طلب</dt><dd class="num ${sz.st.cm < 0 ? "g-bad" : ""}">${smoney(sz.st.cm)}</dd></dl>
      <hr class="sep">${table([{ k: "z", label: "المنطقة", render: (r) => `<button class="btn sm ghost g-link" data-act="g-hm-zone" data-id="${r.z.id}">${esc(r.z.ar)}</button>` }, { k: "o", label: "طلب/يوم", num: true, render: (r) => num(r.orders) }, { k: "p", label: "/1000", num: true, render: (r) => num(r.per1k, 2) }], [...zs].sort((a, b) => zv(b) - zv(a)))}</div></div>`;
}, { on: { "g-hm-zone"(inst, d) { inst.ui.gHmZ = d.id; inst.render(); } } });
})();
