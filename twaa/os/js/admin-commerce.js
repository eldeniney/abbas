/* Twaa Control Center — COMMERCE pages.
   orders · customers · customer (360) · merchants · merchant (scorecard) · catalog (+ SKU drawer, Catalog Approval Queue) · sku (full page)
   categories · pricing · promotions (+ builder) · crm.
   Every number is read from TW.S / store selectors; every change goes through inst.act(...) (store actions write the audit).
   Module-local actions (prefix "commerce.") only wrap / validate shared actions — see bottom of file. */
(function () {
const TW = window.TW, D = TW.D, A = TW.A;
const { ic, esc, money, num, pct, chip, ago, clock, sum, norm, lev, kpi, meter, hbars, dateAr } = TW;
const DAY = 864e5, now = () => Date.now();
const FINAL = ["DELIVERED", "CANCELLED", "RETURNED"];
const find = (arr, id) => arr.find((x) => x.id === id);
const fail = (error, extra) => ({ ok: false, error, ...extra });
const deny = (perm, actor) => (actor.kind === "admin" && !TW.can(perm, actor.id) ? fail(`صلاحية «${D.perms[perm]}» غير متاحة لدورك (${TW.roleOf(actor.id).ar}).`, { denied: true }) : null);

/* ===================================================================== small view helpers ===================== */
const u = (inst, k, d) => (inst.ui[k] == null ? d : inst.ui[k]);
const opt = (v, l, cur) => `<option value="${esc(v)}"${String(cur) === String(v) ? " selected" : ""}>${esc(l)}</option>`;
const sel = (k, cur, opts, label) => `<select class="input" data-model="${k}" aria-label="${esc(label)}" title="${esc(label)}">${opts.map(([v, l]) => opt(v, l, cur)).join("")}</select>`;
const qbox = (k, cur, ph) => `<label class="cm-q">${ic("search", "ic sm")}<input class="input" type="search" data-model="${k}" data-live value="${esc(cur)}" placeholder="${esc(ph)}" aria-label="${esc(ph)}"></label>`;
const cbtn = (label, k, v, cur, tone = "neutral", n) => { const on = String(cur) === String(v); return `<button type="button" class="chip t-${tone} cm-cb${on ? " on" : ""}" data-act="ui" data-k="${k}" data-v="${on && v !== "all" ? "all" : esc(v)}" aria-pressed="${on}">${esc(label)}${n != null ? ` <b class="num">${num(n)}</b>` : ""}</button>`; };
/* button enabled when the user holds ANY of the perms; otherwise visibly locked with the reason */
const gbtn = (perms, label, act, opts = {}) => { const ps = [].concat(perms); return ps.some((p) => TW.can(p)) ? TW.btn(label, act, opts) : `<button type="button" class="btn ${opts.cls || ""}" disabled title="يحتاج صلاحية ${esc(D.perms[ps[0]])}">${ic("lock", "ic sm")}<span>${esc(label)}</span></button>`; };
const edBtn = (perm, act, data, title = "تعديل") => (TW.can(perm) ? `<button type="button" class="btn icon sm ghost cm-ed" data-act="${act}"${TW.dataAttrs(data)} title="${esc(title)}" aria-label="${esc(title)}">${ic("edit", "ic xs")}</button>` : `<span class="cm-ed lockd" title="يحتاج صلاحية ${esc(D.perms[perm])}">${ic("lock", "ic xs")}</span>`);
const cmv = (v, d = 1) => `<span class="num ${v < 0 ? "cm-neg" : "cm-pos"}">${money(v, d)}</span>`;
const dlt = (v, goodWhenDown = true, d = 0) => { const bad = goodWhenDown ? v > 0.005 : v < -0.005, good = goodWhenDown ? v < -0.005 : v > 0.005; return `<span class="cm-d ${bad ? "bad" : good ? "ok" : ""}">${v > 0 ? "+" : ""}${pct(v, d)}</span>`; };
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const zoneAr = (id) => (find(TW.S.zones, id) || {}).ar || id || "—";
const deptAr = (id) => (D.depts.find((d) => d.id === id) || {}).ar || id || "—";
const catAr = (dept, cat) => ((D.cats[dept] || []).find((c) => c[0] === cat) || [])[1] || cat || "—";
const segAr = (id) => (id === "all" || !id ? "كل العملاء" : (find(TW.S.segments, id) || {}).ar || id);
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const skuMap = () => { const m = new Map(); TW.S.skus.forEach((s) => m.set(s.id, s)); return m; };
const auditRows = (rows, empty = "مفيش إجراءات مسجلة") => (rows.length ? `<div class="tw"><table class="tbl"><thead><tr><th>الوقت</th><th>من</th><th>الكائن</th><th>الإجراء</th><th>قبل</th><th>بعد</th><th>السبب</th></tr></thead><tbody>${rows.map((a) => `<tr><td class="num">${esc(clock(a.at))}<span class="sub">${esc(dateAr(a.at))}</span></td><td>${esc(a.who)}<span class="sub">${esc(a.role || "")}</span></td><td class="mono">${esc(a.obj)}</td><td>${esc(a.action)}</td><td>${esc(a.old)}</td><td><b>${esc(a.nw)}</b></td><td>${esc(a.reason)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">${esc(empty)}</p>`);
const auditLink = `<button type="button" class="btn sm ghost" data-act="go" data-to="/admin/audit">${ic("book", "ic xs")}سجل التدقيق الكامل</button>`;

const HEALTH = { new: ["جديد", "info"], healthy: ["سليم", "ok"], watch: ["مراقبة", "warn"], restricted: ["مقيّد", "bad"], suspended: ["موقوف", "bad"] };
const hChip = (h) => chip((HEALTH[h] || [h])[0], (HEALTH[h] || [0, "neutral"])[1]);
const TEMP = { a: "جاف / عادي", c: "مبرّد", f: "مجمّد", h: "ساخن" };
const HANDLING = { normal: "عادي", chilled: "مبرّد", frozen: "مجمّد", hot: "ساخن", fragile: "قابل للكسر", separate: "منفصل (منظفات)" };
const PAY = { cod: "كاش", card: "بطاقة", wallet: "محفظة" };
const SEG_TONE = { "sg-new": "info", "sg-act": "info", "sg-rep": "ok", "sg-hf": "brand", "sg-hv": "brand", "sg-lapsed": "bad", "sg-cod": "neutral", "sg-promo": "warn", "sg-groc": "neutral", "sg-rest": "neutral", "sg-village": "accent" };

/* ===================================================================== ORDERS ===================== */
function orderSources(o) { const fos = TW.S.fos.filter((f) => f.orderId === o.id && f.status !== "REROUTED"); return { fos, type: fos.length > 1 ? "multi" : fos.some((f) => f.sourceType === "hub") ? "hub" : "merchant" }; }
const unpaidCod = (o) => o.pay.method === "cod" && o.status !== "CANCELLED" && ["COD_PENDING", "COD_COLLECTED", "RECON_REQUIRED"].includes(o.fin);
function exceptionIds() {
  const ids = new Set(TW.alerts().map((a) => a.orderId).filter(Boolean));
  TW.S.orders.forEach((o) => { if (["MERCHANT_ISSUE", "DELIVERY_FAILED", "RETURN_TO_ORIGIN", "AWAITING_CUSTOMER_DECISION", "PAYMENT_PENDING"].includes(o.status) || o.fin === "RECON_REQUIRED") ids.add(o.id); });
  return ids;
}
function etaCell(o) {
  if (o.status === "CANCELLED" || o.status === "RETURNED") return `<span class="muted">—</span>`;
  if (o.status === "DELIVERED" || o.status === "PARTIALLY_DELIVERED") {
    const at = Math.max(0, ...TW.S.tasks.filter((t) => t.orderId === o.id && t.deliveredAt).map((t) => t.deliveredAt));
    if (!at) return chip("اتسلّم", "ok");
    const late = at - o.etaAt; return late > 60000 ? chip(`متأخر ${TW.mins(late)} د`, "warn") : chip("في الموعد", "ok");
  }
  if (o.mode === "scheduled" || o.status === "SCHEDULED") return chip(`رحلة ${o.window || ""}`, "info");
  return `<span class="row gap4"><span class="timer" data-until="${o.etaAt}" data-soon="300000"></span><span class="sub muted">${o.etaRange ? `${o.etaRange[0]}–${o.etaRange[1]} د` : ""}</span></span>`;
}
TW.page("orders", {
  render(inst) {
    const S = TW.S, t = now();
    const q = u(inst, "co_q", ""), st = u(inst, "co_st", "all"), fin = u(inst, "co_fin", "all"), zone = u(inst, "co_zone", "all"), src = u(inst, "co_src", "all"), pay = u(inst, "co_pay", "all"), date = u(inst, "co_date", "all"), cs = u(inst, "co_case", "all"), quick = u(inst, "co_quick", "all"), sort = u(inst, "co_sort", "new");
    const exc = exceptionIds(), refundIds = new Set(S.refunds.map((r) => r.orderId));
    const custs = new Map(S.customers.map((c) => [c.id, c]));
    const QUICK = { all: () => true, active: (r) => !FINAL.includes(r.o.status), exceptions: (r) => exc.has(r.o.id), cod: (r) => unpaidCod(r.o), refunds: (r) => refundIds.has(r.o.id) || ["REFUNDED", "PARTIALLY_REFUNDED"].includes(r.o.fin), split: (r) => !!r.o.split };
    const inDate = (o) => (date === "all" ? true : date === "today" ? sameDay(o.createdAt, t) : date === "yday" ? sameDay(o.createdAt, t - DAY) : t - o.createdAt <= 7 * DAY);
    const all = S.orders.map((o) => ({ o, sr: orderSources(o), c: custs.get(o.customerId) }));
    const dated = all.filter((r) => inDate(r.o));
    const base = dated.filter(QUICK[quick] || QUICK.all);
    const nq = norm(q);
    const list = base.filter(({ o, sr, c }) => (st === "all" || o.status === st) && (fin === "all" || o.fin === fin) && (zone === "all" || o.zoneId === zone) && (src === "all" || sr.type === src) && (pay === "all" || o.pay.method === pay) && (cs === "all" || (cs === "yes") === !!(o.caseIds || []).length) && (!nq || norm(`${o.id} ${c ? `${c.ar} ${c.phone} ${c.phone.replace(/\s/g, "")}` : ""} ${sr.fos.map((f) => f.name).join(" ")}`).includes(nq)));
    list.forEach((r) => (r.L = TW.ledger(r.o)));
    const SORT = { new: (a, b) => b.o.createdAt - a.o.createdAt, old: (a, b) => a.o.createdAt - b.o.createdAt, total: (a, b) => b.o.totals.total - a.o.totals.total, cm: (a, b) => a.L.contribution - b.L.contribution };
    list.sort(SORT[sort] || SORT.new);
    const shown = inst.ui.co_all ? list : list.slice(0, 50);
    /* answer strip */
    const active = S.orders.filter((o) => !FINAL.includes(o.status));
    const excOrders = S.orders.filter((o) => exc.has(o.id));
    const codOpen = S.orders.filter(unpaidCod);
    const counts = {}; base.forEach((r) => (counts[r.o.status] = (counts[r.o.status] || 0) + 1));
    const qn = (k) => dated.filter(QUICK[k]).length;
    const gmv = sum(list, (r) => r.L.gmv), cm = sum(list, (r) => r.L.contribution), neg = list.filter((r) => r.L.contribution < 0).length;
    const rows = shown.map(({ o, sr, c, L }) => `<tr class="click${exc.has(o.id) ? " sev-high" : ""}" data-act="open-order" data-id="${esc(o.id)}" tabindex="0">
      <td><b class="mono">${esc(o.id)}</b>${o.promo ? `<span class="sub">${ic("tag", "ic xs")} ${esc((find(S.promos, o.promo) || {}).code || o.promo)}</span>` : ""}</td>
      <td>${c ? `<button type="button" class="btn sm ghost cm-lnk" data-act="open-customer" data-id="${esc(c.id)}">${esc(c.ar)}</button>` : "—"}<span class="sub">${esc(PAY[o.pay.method] || o.pay.method)}${(o.caseIds || []).length ? ` · ${ic("inbox", "ic xs")} ${o.caseIds.length} حالة` : ""}</span></td>
      <td>${esc(zoneAr(o.zoneId))}</td>
      <td><span class="row gap4">${chip(sr.type === "multi" ? `${sr.fos.length} مصادر` : sr.type === "hub" ? "هب" : "تاجر", sr.type === "multi" ? "accent" : sr.type === "hub" ? "brand" : "info")}${o.split ? chip("مجزّأ", "warn") : ""}</span><span class="sub">${esc(sr.fos.map((f) => f.name).join(" + "))}</span></td>
      <td>${A.st("order", o.status)}</td><td>${A.st("fin", o.fin)}</td>
      <td class="n num">${money(o.totals.total)}</td><td class="n">${cmv(L.contribution)}</td>
      <td class="n"><span class="num" data-ago="${o.createdAt}"></span></td><td>${etaCell(o)}</td></tr>`).join("");
    return `${A.head("الطلبات", "Orders · كل طلب = طلب عميل واحد ← أوامر تنفيذ لكل مصدر ← مهام توصيل. الحالة التشغيلية والمالية منفصلتين.")}
      ${A.answer({ what: `${num(active.length)} طلب نشط · ${num(S.orders.filter((o) => o.status === "DELIVERED" && sameDay(o.createdAt, t)).length)} اتسلّم النهارده`, attention: `${num(excOrders.length)} طلب فيه استثناء`, owner: "العمليات (برج التحكم) · الدعم للحالات", risk: `${money(sum(excOrders, (o) => o.totals.total))} في طلبات متعثرة · كاش غير مُسوّى ${money(sum(codOpen, (o) => o.totals.total))}` })}
      <div class="cm-chips" role="group" aria-label="فلاتر محفوظة"><span class="lbl">فلاتر محفوظة:</span>${cbtn("الكل", "co_quick", "all", quick, "neutral", dated.length)}${cbtn("نشطة", "co_quick", "active", quick, "info", qn("active"))}${cbtn("استثناءات", "co_quick", "exceptions", quick, "bad", qn("exceptions"))}${cbtn("كاش غير مُسوّى", "co_quick", "cod", quick, "warn", qn("cod"))}${cbtn("استردادات", "co_quick", "refunds", quick, "accent", qn("refunds"))}${cbtn("طلبات مجزّأة", "co_quick", "split", quick, "brand", qn("split"))}</div>
      <div class="filters">${qbox("co_q", q, "رقم الطلب، العميل، الموبايل، التاجر")}
        ${sel("co_st", st, [["all", "كل الحالات التشغيلية"], ...Object.keys(TW.ST.order).map((k) => [k, TW.stLabel("order", k)])], "الحالة التشغيلية")}
        ${sel("co_fin", fin, [["all", "كل الحالات المالية"], ...Object.keys(TW.ST.fin).map((k) => [k, TW.stLabel("fin", k)])], "الحالة المالية")}
        ${sel("co_zone", zone, [["all", "كل المناطق"], ...S.zones.filter((z) => z.active).map((z) => [z.id, z.ar])], "المنطقة")}
        ${sel("co_src", src, [["all", "كل المصادر"], ["hub", "هب توّا فقط"], ["merchant", "تاجر واحد"], ["multi", "متعدد المصادر"]], "نوع المصدر")}
        ${sel("co_pay", pay, [["all", "كل طرق الدفع"], ["cod", "كاش"], ["card", "بطاقة"], ["wallet", "محفظة"]], "طريقة الدفع")}
        ${sel("co_date", date, [["all", "كل التواريخ"], ["today", "النهارده"], ["yday", "امبارح"], ["7d", "آخر 7 أيام"]], "التاريخ")}
        ${sel("co_case", cs, [["all", "بحالة دعم أو بدون"], ["yes", "عليه حالة دعم"], ["no", "بدون حالة"]], "حالة دعم")}
        ${sel("co_sort", sort, [["new", "الأحدث أولاً"], ["old", "الأقدم أولاً"], ["total", "الأعلى قيمة"], ["cm", "الأقل مساهمة"]], "الترتيب")}
        <button type="button" class="btn sm ghost" data-act="co-reset">${ic("refresh", "ic xs")}مسح</button></div>
      <div class="cm-chips" aria-label="العدد حسب الحالة"><span class="lbl">حسب الحالة:</span>${Object.keys(TW.ST.order).filter((k) => counts[k]).map((k) => cbtn(TW.stLabel("order", k), "co_st", k, st, TW.ST.order[k][1], counts[k])).join("") || `<span class="muted">—</span>`}</div>
      <div class="card" style="padding:0"><div class="tw"><table class="tbl"><thead><tr><th>الطلب</th><th>العميل</th><th>المنطقة</th><th>المصادر</th><th>تشغيلي</th><th>مالي</th><th class="n">الإجمالي</th><th class="n">المساهمة</th><th class="n">العمر</th><th>SLA / الوصول</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="10" class="c muted">مفيش طلبات بالفلاتر دي</td></tr>`}</tbody>
        ${list.length ? `<tfoot><tr class="cm-tot"><td colspan="6">${num(list.length)} طلب · ${neg ? `<span class="cm-neg">${num(neg)} بمساهمة سالبة</span>` : "كلها بمساهمة موجبة"}</td><td class="n num">${money(gmv)}</td><td class="n">${cmv(cm)}<span class="sub">متوسط ${money(cm / list.length, 1)}/طلب</span></td><td colspan="2"></td></tr></tfoot>` : ""}</table></div></div>
      ${list.length > 50 ? `<div class="row"><button type="button" class="btn sm" data-act="ui-toggle" data-k="co_all">${inst.ui.co_all ? "اعرض أول 50 بس" : `اعرض كل ${num(list.length)} طلب`}</button></div>` : ""}`;
  },
  on: {},
});

/* ===================================================================== CUSTOMERS ===================== */
function custProfile(c) {
  const S = TW.S, R = S.rules, t = now();
  const os = S.orders.filter((o) => o.customerId === c.id).sort((a, b) => b.createdAt - a.createdAt);
  const lastDays = os.length ? Math.floor((t - os[0].createdAt) / DAY) : c.last;
  const addr = c.addresses.find((a) => a.id === c.addr) || c.addresses[0] || {};
  const z = find(S.zones, addr.zoneId || c.zoneId);
  const live = os.filter((o) => o.status !== "CANCELLED");
  const ledgers = live.map((o) => [o, TW.ledger(o)]);
  const contribution = sum(ledgers, (x) => x[1].contribution);
  let foodV = 0, grocV = 0, foodN = 0;
  os.forEach((o) => { const f = sum(o.lines.filter((l) => l.dept === "food"), (l) => l.unitPrice * l.qty), g = sum(o.lines.filter((l) => l.dept !== "food"), (l) => l.unitPrice * l.qty); foodV += f; grocV += g; if (f > g) foodN++; });
  const promoN = os.filter((o) => o.promo).length;
  const aov = c.orders ? c.ltv / c.orders : 0;
  const freq = c.orders / Math.max(1, (c.since || 30) / 30);
  const recent = os.filter((o) => t - o.createdAt < 30 * DAY).length;
  const refunds = S.refunds.filter((r) => os.some((o) => o.id === r.orderId));
  const cases = S.cases.filter((x) => x.customerId === c.id);
  const failed = S.tasks.filter((tk) => os.some((o) => o.id === tk.orderId) && ["FAILED", "RTO", "RETURNED"].includes(tk.status)).length;
  const segs = [];
  if (!c.orders) segs.push("sg-new");
  if (c.orders >= 1 && c.orders <= 2 && (c.since || 0) <= 30) segs.push("sg-act");
  if (c.orders >= 2 && lastDays != null && lastDays <= 30) segs.push("sg-rep");
  if (freq >= 8 || recent >= 8) segs.push("sg-hf");
  if (aov >= 350) segs.push("sg-hv");
  if (c.orders && (lastDays == null || lastDays > 30)) segs.push("sg-lapsed");
  if (c.cod >= 0.8) segs.push("sg-cod");
  if (c.promoHeavy || (os.length >= 2 && promoN / os.length >= 0.7)) segs.push("sg-promo");
  if (grocV + foodV > 0 && grocV / (grocV + foodV) >= 0.7) segs.push("sg-groc");
  if (os.length && foodN / os.length >= 0.6) segs.push("sg-rest");
  if (z && z.type !== "core") segs.push("sg-village");
  const stage = !c.orders ? ["جديد — لم يطلب بعد", "info", 0] : lastDays > 30 ? ["متوقف", "bad", 5] : lastDays > 14 ? ["معرّض للتوقف", "warn", 4] : c.orders === 1 ? ["أول طلب", "info", 1] : c.orders < 8 ? ["متكرر", "ok", 2] : ["مخلص", "brand", 3];
  const risks = [];
  if (c.codFails >= R.codFailBlock) risks.push([`الكاش موقوف — ${c.codFails} رفض استلام (BR-COD-002)`, "bad"]); else if (c.codFails) risks.push([`${c.codFails} رفض استلام كاش`, "warn"]);
  if (refunds.length >= 2) risks.push([`${refunds.length} مطالبات استرداد`, "warn"]);
  if (failed) risks.push([`${failed} تسليم فاشل / مرتجع`, "warn"]);
  const openCases = cases.filter((x) => x.status !== "RESOLVED").length; if (openCases) risks.push([`${openCases} حالة دعم مفتوحة`, "warn"]);
  if (segs.includes("sg-promo")) risks.push(["معتمد على الكوبونات", "info"]);
  if (live.length && contribution < 0) risks.push(["مساهمة تراكمية سالبة", "bad"]);
  return { os, live, ledgers, lastDays, z, addr, contribution, cmAvg: live.length ? contribution / live.length : 0, segs, stage, risks, refunds, cases, aov, freq, recent };
}
const segChips = (segs) => segs.map((id) => chip(segAr(id), SEG_TONE[id] || "neutral")).join(" ");
const lastTxt = (d) => (d == null ? "لم يطلب" : d === 0 ? "النهارده" : d === 1 ? "امبارح" : `منذ ${d} يوم`);

TW.page("customers", {
  render(inst) {
    const S = TW.S;
    const q = u(inst, "cu_q", ""), seg = u(inst, "cu_seg", "all"), zone = u(inst, "cu_zone", "all"), risk = u(inst, "cu_risk", "all"), sort = u(inst, "cu_sort", "ltv");
    const all = S.customers.map((c) => ({ c, p: custProfile(c) }));
    const nq = norm(q);
    const list = all.filter(({ c, p }) => (seg === "all" || p.segs.includes(seg)) && (zone === "all" || (p.z && p.z.id === zone)) && (risk === "all" || (risk === "yes" ? p.risks.some((r) => r[1] !== "info") : !p.risks.some((r) => r[1] !== "info"))) && (!nq || norm(`${c.ar} ${c.phone} ${c.phone.replace(/\s/g, "")} ${c.id}`).includes(nq)));
    const SORT = { ltv: (a, b) => b.c.ltv - a.c.ltv, orders: (a, b) => b.c.orders - a.c.orders, cm: (a, b) => a.p.contribution - b.p.contribution, last: (a, b) => (b.p.lastDays ?? 999) - (a.p.lastDays ?? 999) };
    list.sort(SORT[sort] || SORT.ltv);
    const segCount = (id) => all.filter((x) => x.p.segs.includes(id)).length;
    const rows = list.map(({ c, p }) => `<tr class="click" data-act="open-customer" data-id="${esc(c.id)}" tabindex="0">
      <td><b>${esc(c.ar)}</b><span class="sub mono">${esc(c.phone)}</span></td><td>${esc(p.z ? p.z.ar : "—")}<span class="sub">${esc(p.addr.landmark || "")}</span></td>
      <td><div class="cm-chips">${segChips(p.segs) || `<span class="muted">—</span>`}</div></td>
      <td>${chip(p.stage[0], p.stage[1])}</td>
      <td class="n num">${num(c.orders)}</td><td class="n num">${money(c.ltv)}</td><td class="n">${p.live.length ? cmv(p.contribution) : `<span class="muted">—</span>`}</td>
      <td>${esc(lastTxt(p.lastDays))}</td><td class="n num">${money(c.wallet)}</td><td class="n num">${c.codFails ? `<span class="cm-neg">${c.codFails}</span>` : "0"}</td>
      <td><div class="cm-chips">${p.risks.filter((r) => r[1] !== "info").map((r) => chip(r[0], r[1])).join("") || chip("سليم", "ok")}</div></td></tr>`).join("");
    return `${A.head("العملاء", "Customers · الشرائح محسوبة من بيانات العميل الفعلية (الطلبات، الكاش، القسم، المنطقة، الكوبونات)")}
      <div class="grid g4">${kpi("عملاء في العيّنة", num(all.length), `${num(all.filter((x) => x.c.orders).length)} طلبوا قبل كده`)}${kpi("متوسط القيمة التراكمية (LTV)", money(sum(all, (x) => x.c.ltv) / all.length), "من القيمة التراكمية المسجلة")}${kpi("مساهمة الطلبات المسجلة", cmv(sum(all, (x) => x.p.contribution), 0), "مجموع دفتر الطلب لكل عميل", { tone: sum(all, (x) => x.p.contribution) < 0 ? "bad" : "ok" })}${kpi("عملاء عليهم مخاطر", num(all.filter((x) => x.p.risks.some((r) => r[1] === "bad")).length), "كاش موقوف / مساهمة سالبة", { tone: "warn" })}</div>
      <div class="cm-chips"><span class="lbl">الشرائح:</span>${cbtn("الكل", "cu_seg", "all", seg, "neutral", all.length)}${S.segments.map((s) => cbtn(s.ar, "cu_seg", s.id, seg, SEG_TONE[s.id] || "neutral", segCount(s.id))).join("")}</div>
      <div class="filters">${qbox("cu_q", q, "اسم العميل أو الموبايل")}
        ${sel("cu_zone", zone, [["all", "كل المناطق"], ...S.zones.filter((z) => z.active).map((z) => [z.id, z.ar])], "المنطقة")}
        ${sel("cu_risk", risk, [["all", "كل العملاء"], ["yes", "عليهم مخاطر"], ["no", "بدون مخاطر"]], "المخاطر")}
        ${sel("cu_sort", sort, [["ltv", "الأعلى قيمة"], ["orders", "الأكثر طلبات"], ["cm", "الأقل مساهمة"], ["last", "الأطول بدون طلب"]], "الترتيب")}</div>
      <div class="card" style="padding:0"><div class="tw"><table class="tbl"><thead><tr><th>العميل</th><th>المنطقة</th><th>الشرائح (CRM)</th><th>المرحلة</th><th class="n">الطلبات</th><th class="n">LTV</th><th class="n">المساهمة</th><th>آخر طلب</th><th class="n">المحفظة</th><th class="n">رفض كاش</th><th>المخاطر</th></tr></thead><tbody>${rows || `<tr><td colspan="11" class="c muted">مفيش عملاء بالفلاتر دي</td></tr>`}</tbody></table></div></div>
      <p class="muted cm-note">${ic("info", "ic xs")} أحجام الشرائح على مستوى القاعدة كلها في صفحة CRM. هنا العيّنة التشغيلية (${num(all.length)} عميل) مع الشرائح المشتقة لكل عميل.</p>`;
  },
  on: {},
});

TW.page("customer", {
  render(inst, [id]) {
    const S = TW.S, c = find(S.customers, id);
    if (!c) return `<div class="card">${TW.empty("العميل مش موجود", id, "user")}</div>`;
    const p = custProfile(c);
    const notes = (c.crmNotes || []);
    const msgs = S.notes.filter((n) => n.to === `customer:${c.id}`).slice(0, 6);
    const aud = S.audit.filter((a) => String(a.obj).includes(c.ar) || p.os.some((o) => String(a.obj).includes(o.id)) || p.cases.some((x) => String(a.obj).includes(x.id))).slice(0, 12);
    const refundSum = sum(p.refunds.filter((r) => r.status === "COMPLETED"), (r) => r.amount), compSum = sum(p.cases, (x) => x.comp || 0);
    const autos = AUTOS.filter((x) => x.seg && p.segs.includes(x.seg));
    const orderRows = p.os.map((o) => { const L = TW.ledger(o); return `<tr class="click" data-act="open-order" data-id="${esc(o.id)}" tabindex="0"><td class="mono"><b>${esc(o.id)}</b></td><td class="num">${esc(dateAr(o.createdAt))} ${esc(clock(o.createdAt))}</td><td>${esc(orderSources(o).fos.map((f) => f.name).join(" + "))}</td><td>${A.st("order", o.status)}</td><td>${A.st("fin", o.fin)}</td><td>${esc(PAY[o.pay.method])}</td><td class="n num">${money(o.totals.total)}</td><td class="n">${o.status === "CANCELLED" ? `<span class="muted">—</span>` : cmv(L.contribution)}</td></tr>`; }).join("");
    return `<div class="cc-top"><button type="button" class="btn sm" data-act="go" data-to="/admin/customers">${ic("arrowR", "ic xs")}كل العملاء</button><h1>${esc(c.ar)}<small>Customer 360 · <span class="mono">${esc(c.id)}</span> · عميل منذ ${num(c.since)} يوم · ${esc(c.tier)}</small></h1>${chip(p.stage[0], p.stage[1])}</div>
      <div class="grid g4">${kpi("الطلبات", num(c.orders), `آخر طلب: ${lastTxt(p.lastDays)}`)}${kpi("القيمة التراكمية (LTV)", money(c.ltv), `متوسط السلة ${money(p.aov)}`)}${kpi("مساهمة العميل (الطلبات المسجلة)", cmv(p.contribution), `${num(p.live.length)} طلب · ${money(p.cmAvg, 1)}/طلب`, { tone: p.contribution < 0 ? "bad" : "ok" })}${kpi("المحفظة", money(c.wallet), `استردادات ${money(refundSum)} · تعويضات ${money(compSum)}`)}</div>
      <div class="grid g3">
        <div class="card"><h3>${ic("user", "ic sm")} البيانات</h3><dl class="kv"><dt>الموبايل</dt><dd class="mono">${esc(c.phone)}</dd><dt>الفئة</dt><dd>${esc({ family: "أسرة", young: "شباب", elderly: "كبار السن", village: "قرية" }[c.cluster] || c.cluster)}</dd><dt>المستوى</dt><dd>${esc(c.tier)} · ${num(c.points)} نقطة</dd><dt>الدفع المعتاد</dt><dd>${pct(c.cod)} كاش</dd><dt>البدائل</dt><dd>${esc({ call: "اسألني الأول", auto: "بدّل بأقرب بديل", remove: "شيل الصنف" }[c.subPref] || c.subPref)}</dd><dt>المفضلة</dt><dd>${num((c.favs || []).length)} منتج · ${num((c.baskets || []).length)} سلة محفوظة</dd></dl></div>
        <div class="card"><h3>${ic("pin", "ic sm")} العناوين</h3><div class="list">${c.addresses.map((a) => { const z = find(S.zones, a.zoneId); return `<div class="li"><span class="grow"><b>${esc(a.label)}</b> ${a.id === c.addr ? chip("الافتراضي", "brand") : ""}<span class="sub">${esc(z ? `${z.ar} · ${D.zoneType[z.type]} · ${z.route === "scheduled" ? "رحلات مجدولة" : z.route === "batched" ? "توصيل مجمّع" : "فوري"}` : a.zoneId)}</span><span class="sub">${ic("pin", "ic xs")} ${esc(a.landmark)}${a.street ? ` · ${esc(a.street)}` : ""}</span></span></div>`; }).join("")}</div></div>
        <div class="card"><h3>${ic("shield", "ic sm")} المخاطر</h3>${p.risks.length ? `<div class="col">${p.risks.map((r) => `<div class="row">${chip(r[1] === "bad" ? "عالي" : r[1] === "warn" ? "متوسط" : "معلومة", r[1])}<span>${esc(r[0])}</span></div>`).join("")}</div>` : `<p class="muted">مفيش علامات خطر.</p>`}<hr class="sep"><div class="lbl">قواعد مطبّقة</div><p class="cm-note">حد الكاش للطلب ${money(S.rules.codOrderMax)} (BR-COD-001) · التقييد بعد ${num(S.rules.codFailBlock)} رفض كاش (BR-COD-002)</p></div>
      </div>
      <div class="grid g2">
        <div class="card"><h3>${ic("target", "ic sm")} CRM — الشرائح ومرحلة دورة الحياة</h3><div class="cm-chips">${segChips(p.segs) || `<span class="muted">مفيش شريحة</span>`}</div>
          <div class="cm-life">${["جديد", "أول طلب", "متكرر", "مخلص", "معرّض للتوقف", "متوقف"].map((s, i) => `<span class="${i === p.stage[2] ? "on" : ""}">${esc(s)}</span>`).join("")}</div>
          <div class="lbl">الأتمتة اللي العميل مؤهل لها</div>${autos.length ? `<div class="cm-chips">${autos.map((x) => chip(`${x.ar}${autoOn(x) ? "" : " (موقوفة)"}`, autoOn(x) ? "ok" : "neutral", "zap")).join("")}</div>` : `<p class="muted">لا توجد أتمتة تنطبق حالياً.</p>`}
          <button type="button" class="btn sm ghost" data-act="go" data-to="/admin/crm">${ic("arrowL", "ic xs")}إدارة الأتمتة في CRM</button></div>
        <div class="card"><h3>${ic("wallet", "ic sm")} المحفظة والاستردادات</h3><dl class="kv"><dt>رصيد المحفظة</dt><dd class="num">${money(c.wallet)}</dd><dt>استردادات مكتملة</dt><dd class="num">${money(refundSum)}</dd><dt>تعويضات</dt><dd class="num">${money(compSum)}</dd></dl>
          ${p.refunds.length ? `<div class="tw" style="margin-top:8px"><table class="tbl"><thead><tr><th>الرقم</th><th>الطلب</th><th>السبب</th><th>المسؤول</th><th class="n">المبلغ</th><th>الحالة</th></tr></thead><tbody>${p.refunds.map((r) => `<tr><td class="mono">${esc(r.id)}</td><td>${A.orderLink(r.orderId)}</td><td>${esc(r.reason)}</td><td>${esc(TW.PARTY[r.party] || r.party)}</td><td class="n num">${money(r.amount)}</td><td>${chip(r.status, r.status === "COMPLETED" ? "ok" : r.status === "REJECTED" ? "bad" : "warn")}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted" style="margin-top:6px">مفيش استردادات.</p>`}</div>
      </div>
      <div class="card"><div class="hd"><h3>${ic("receipt", "ic sm")} سجل الطلبات</h3><span class="muted">${num(p.os.length)} طلب في النظام</span></div>${p.os.length ? `<div class="tw"><table class="tbl"><thead><tr><th>الطلب</th><th>الوقت</th><th>المصادر</th><th>تشغيلي</th><th>مالي</th><th>الدفع</th><th class="n">الإجمالي</th><th class="n">المساهمة</th></tr></thead><tbody>${orderRows}</tbody></table></div>` : TW.empty("لسه مطلبش", "العميل مؤهل لأتمتة «تحويل أول طلب»", "receipt")}</div>
      <div class="grid g2">
        <div class="card"><h3>${ic("inbox", "ic sm")} حالات الدعم</h3>${p.cases.length ? `<div class="list">${p.cases.map((x) => `<div class="li"><span class="grow"><b>${esc(x.id)}</b> — ${esc(x.type)}<span class="sub">${A.orderLink(x.orderId)} · ${esc(x.owner || "—")} · ${esc(ago(x.createdAt))}</span></span>${chip(x.status === "RESOLVED" ? "محلولة" : x.status === "PENDING_APPROVAL" ? "بانتظار موافقة" : "مفتوحة", x.status === "RESOLVED" ? "ok" : "warn")}<button type="button" class="btn sm" data-act="go" data-to="/admin/case/${esc(x.id)}">افتح</button></div>`).join("")}</div>` : `<p class="muted">مفيش حالات.</p>`}</div>
        <div class="card"><h3>${ic("doc", "ic sm")} ملاحظات CRM الداخلية</h3>
          <div class="row"><input class="input grow" data-model="cu_note" data-enter="cu-note" value="${esc(inst.ui.cu_note || "")}" placeholder="ملاحظة للفريق (تظهر في سجل التدقيق)" aria-label="ملاحظة"><button type="button" class="btn sm primary" data-act="cu-note" data-id="${esc(c.id)}">${ic("plus", "ic xs")}أضف</button></div>
          ${notes.length ? `<div class="list">${notes.map((n) => `<div class="li"><span class="grow">${esc(n.text)}<span class="sub">${esc(n.by)} · ${esc(ago(n.at))}</span></span></div>`).join("")}</div>` : `<p class="muted" style="margin-top:6px">مفيش ملاحظات.</p>`}
          ${msgs.length ? `<hr class="sep"><div class="lbl">آخر رسائل اتبعتت للعميل</div><div class="list">${msgs.map((n) => `<div class="li"><span class="grow"><b>${esc(n.title)}</b><span class="sub">${esc(n.body)} · ${esc(ago(n.at))}</span></span></div>`).join("")}</div>` : ""}</div>
      </div>
      <div class="card"><div class="hd"><h3>${ic("book", "ic sm")} سجل التدقيق للعميل</h3>${auditLink}</div>${auditRows(aud)}</div>`;
  },
  on: {},
});

/* ===================================================================== MERCHANTS ===================== */
/* thresholds for the classification engine: [field, label, direction (+1 higher is better), watch, restrict] */
const THR = [["acceptRate", "معدل القبول", 1, 0.92, 0.85], ["prepOnTime", "التجهيز في الموعد", 1, 0.85, 0.75], ["availAcc", "دقة الإتاحة", 1, 0.92, 0.86], ["cancelAfterAccept", "إلغاء بعد القبول", -1, 0.025, 0.05], ["subRate", "نسبة البدائل", -1, 0.06, 0.1], ["complaintRate", "نسبة الشكاوى", -1, 0.02, 0.035]];
const lvlOf = (m, t) => { const v = m[t[0]]; return t[2] > 0 ? (v < t[4] ? 2 : v < t[3] ? 1 : 0) : v > t[4] ? 2 : v > t[3] ? 1 : 0; };
function suggestClass(m) {
  if (m.status === "pending") return { level: "new", bad: [], warn: [], why: "بانتظار التفعيل" };
  const lv = THR.map((t) => [t, lvlOf(m, t)]);
  const bad = lv.filter((x) => x[1] === 2).map((x) => x[0]), warn = lv.filter((x) => x[1] === 1).map((x) => x[0]);
  let level = bad.length >= 2 ? "restricted" : bad.length || warn.length >= 2 ? "watch" : "healthy";
  if (m.health === "new" && level === "healthy" && m.orders30 < 100) level = "new";
  if (m.health === "suspended") level = "suspended";
  const why = bad.length || warn.length ? [...bad, ...warn].map((t) => t[1]).join("، ") : "كل المؤشرات في الحدود";
  return { level, bad, warn, why };
}
const COACH = {
  prepOnTime: (m) => [`آخر 7 أيام ${pct(1 - m.prepOnTime)} من طلباتك اتأخرت بسبب تجهيز الأصناف.`, "جهّز الأصناف الأكثر طلباً قبل الذروة (1–3 م و7–9 م) وخلّي حد مسؤول عن التغليف."],
  acceptRate: (m) => [`${pct(1 - m.acceptRate)} من الطلبات اتأخر قبولها أو اترفضت — متوسط وقت القبول ${num(m.acceptSec)} ثانية.`, "شغّل صوت التنبيه، ولو المحل زحمة استخدم وضع «مشغول» بدل الرفض."],
  availAcc: (m) => [`${pct(1 - m.availAcc)} من الأصناف اللي كانت ظاهرة «متاحة» طلعت مش موجودة وقت التجهيز.`, "حدّث الإتاحة من «منتجاتي» كل صباح — صنف واحد ناقص بيأخر طلب كامل."],
  cancelAfterAccept: (m) => [`${pct(m.cancelAfterAccept, 1)} من الطلبات اتلغت بعد ما اتقبلت.`, "اقبل الطلب بعد ما تتأكد إن كل الأصناف موجودة."],
  subRate: (m) => [`${pct(m.subRate, 1)} من البنود احتاجت بديل.`, "علّم الأصناف الناقصة «مش متاح» بدري عشان العميل يختار من الأول."],
  complaintRate: (m) => [`${pct(m.complaintRate, 1)} من الطلبات عليها شكوى من العميل.`, "راجع التغليف والأصناف الحساسة (مبرد / قابل للكسر) قبل التسليم."],
};
function priceIndex(mid, SK) {
  const S = TW.S, map = S.msku[mid] || {}, tol = S.rules.priceTolerance / 100;
  const rows = Object.entries(map).map(([id, x]) => { const s = SK.get(id); return s ? { s, x, r: x.price / s.refPrice } : null; }).filter(Boolean);
  return { n: rows.length, avail: rows.filter((r) => r.x.available).length, idx: rows.length ? sum(rows, (r) => r.r) / rows.length : null, out: rows.filter((r) => Math.abs(r.r - 1) > tol), pending: rows.filter((r) => r.x.pendingPrice), rows };
}
function mStats(m, SK) {
  const S = TW.S;
  const listing = S.menus[m.id] ? S.menus[m.id].length : Object.keys(S.msku[m.id] || {}).length;
  const st = S.msettle.filter((x) => x.merchantId === m.id);
  const disputed = st.flatMap((x) => x.lines.filter((l) => l.status === "disputed"));
  const due = st.filter((x) => x.status === "DUE");
  const settle = m.status !== "active" ? ["—", "neutral"] : disputed.length ? [`نزاع مفتوح (${disputed.length})`, "bad"] : due.length ? [`مستحق ${money(sum(due, (x) => x.net))}`, "warn"] : ["مسدَّد", "ok"];
  return { listing, st, disputed, due, settle, sug: suggestClass(m), pi: S.menus[m.id] ? null : priceIndex(m.id, SK) };
}
TW.page("merchants", {
  render(inst) {
    const S = TW.S, SK = skuMap();
    const q = u(inst, "me_q", ""), cls = u(inst, "me_cls", "all"), type = u(inst, "me_type", "all"), zone = u(inst, "me_zone", "all"), sort = u(inst, "me_sort", "gmv");
    const all = S.merchants.map((m) => ({ m, x: mStats(m, SK) }));
    const nq = norm(q);
    const list = all.filter(({ m }) => (cls === "all" || (cls === "pending" ? m.status === "pending" : m.health === cls)) && (type === "all" || m.type === type) && (zone === "all" || m.zoneId === zone) && (!nq || norm(`${m.ar} ${m.owner} ${m.id} ${D.merchantTypes[m.type]}`).includes(nq)));
    const SORT = { gmv: (a, b) => b.m.gmv30 - a.m.gmv30, accept: (a, b) => a.m.acceptRate - b.m.acceptRate, prep: (a, b) => a.m.prepOnTime - b.m.prepOnTime, complaints: (a, b) => b.m.complaintRate - a.m.complaintRate };
    list.sort(SORT[sort] || SORT.gmv);
    const pending = S.merchants.filter((m) => m.status === "pending");
    const mismatch = all.filter(({ m, x }) => m.status === "active" && x.sug.level !== m.health && !(m.health === "new" && x.sug.level === "new"));
    const disputes = sum(all, (r) => r.x.disputed.length);
    const pctCell = (m, k) => { const t = THR.find((x) => x[0] === k), l = m.status === "active" ? lvlOf(m, t) : 0; return `<td class="n num ${l === 2 ? "cm-neg" : l === 1 ? "cm-warn" : ""}">${m.status === "active" ? pct(m[k], k === "complaintRate" ? 1 : 0) : "—"}</td>`; };
    const rows = list.map(({ m, x }) => `<tr class="click" data-act="open-merchant" data-id="${esc(m.id)}" tabindex="0">
      <td><b>${esc(m.ar)}</b><span class="sub">${esc(D.merchantTypes[m.type])}${m.cuisine ? ` · ${esc(D.cuisine[m.cuisine])}` : ""} · ${esc(zoneAr(m.zoneId))}</span></td>
      <td>${m.status === "pending" ? chip("بانتظار التفعيل", "warn") : hChip(m.health)}${m.status === "active" && x.sug.level !== m.health && !(m.health === "new" && x.sug.level === "new") ? `<span class="sub">المقترح: ${esc(HEALTH[x.sug.level][0])}</span>` : ""}</td>
      ${pctCell(m, "acceptRate")}${pctCell(m, "prepOnTime")}${pctCell(m, "availAcc")}${pctCell(m, "complaintRate")}
      <td class="n num">${m.status === "active" ? money(m.gmv30) : "—"}</td><td class="n num">${pct(m.commission)}</td><td class="n num">${num(x.listing)}</td><td>${chip(x.settle[0], x.settle[1])}</td></tr>`).join("");
    const cnt = (h) => S.merchants.filter((m) => m.status === "active" && m.health === h).length;
    return `${A.head("التجار", "Merchants · التصنيف: جديد / سليم / مراقبة / مقيّد / موقوف — مع توجيه بدل العقاب")}
      ${A.answer({ what: `${num(S.merchants.filter((m) => m.status === "active").length)} تاجر نشط · ${num(S.merchants.filter((m) => m.mode === "open").length)} فاتح الآن`, attention: `${num(mismatch.length)} تصنيف يحتاج مراجعة · ${num(pending.length)} بانتظار التفعيل`, owner: "عمليات التجار", risk: `${num(disputes)} بند تسوية متنازع عليه · ${num(cnt("restricted") + cnt("watch"))} تاجر تحت المراقبة/مقيّد` })}
      ${pending.length ? `<div class="banner warn">${ic("store", "ic sm")}<div class="grow"><b>${num(pending.length)} تاجر بانتظار التفعيل:</b> ${pending.map((m) => `<button type="button" class="btn sm ghost cm-lnk" data-act="open-merchant" data-id="${esc(m.id)}">${esc(m.ar)}</button>`).join(" ")} — التفعيل بيمر بمركز الموافقات بعد اكتمال مراحل الاستقطاب.</div><button type="button" class="btn sm" data-act="goto-approvals">${ic("check", "ic xs")}مركز الموافقات</button></div>` : ""}
      <div class="cm-chips"><span class="lbl">التصنيف:</span>${cbtn("الكل", "me_cls", "all", cls, "neutral", S.merchants.length)}${Object.keys(HEALTH).map((h) => cbtn(HEALTH[h][0], "me_cls", h, cls, HEALTH[h][1], cnt(h))).join("")}${cbtn("بانتظار التفعيل", "me_cls", "pending", cls, "warn", pending.length)}</div>
      <div class="filters">${qbox("me_q", q, "اسم التاجر أو المالك")}
        ${sel("me_type", type, [["all", "كل الأنواع"], ...Object.entries(D.merchantTypes)], "نوع التاجر")}
        ${sel("me_zone", zone, [["all", "كل المناطق"], ...S.zones.filter((z) => z.active).map((z) => [z.id, z.ar])], "المنطقة")}
        ${sel("me_sort", sort, [["gmv", "الأعلى مبيعات"], ["accept", "الأقل قبولاً"], ["prep", "الأقل التزاماً بالتجهيز"], ["complaints", "الأكثر شكاوى"]], "الترتيب")}</div>
      <div class="card" style="padding:0"><div class="tw"><table class="tbl"><thead><tr><th>التاجر</th><th>التصنيف</th><th class="n">القبول</th><th class="n">تجهيز في الموعد</th><th class="n">دقة الإتاحة</th><th class="n">الشكاوى</th><th class="n">GMV 30 يوم</th><th class="n">العمولة</th><th class="n">التشكيلة</th><th>التسوية</th></tr></thead><tbody>${rows || `<tr><td colspan="10" class="c muted">مفيش تجار بالفلاتر دي</td></tr>`}</tbody></table></div></div>
      <p class="muted cm-note">${ic("info", "ic xs")} الحدود: قبول ≥ 92% · تجهيز في الموعد ≥ 85% · دقة إتاحة ≥ 92% · إلغاء بعد القبول ≤ 2.5% · شكاوى ≤ 2% (الأحمر = تجاوز حد التقييد).</p>`;
  },
  on: {},
});

TW.page("merchant", {
  render(inst, [id]) {
    const S = TW.S, SK = skuMap(), m = find(S.merchants, id);
    if (!m) return `<div class="card">${TW.empty("التاجر مش موجود", id, "store")}</div>`;
    const x = mStats(m, SK), sug = x.sug, tol = S.rules.priceTolerance;
    const fos = S.fos.filter((f) => f.sourceId === m.id && !["DELIVERED", "CANCELLED", "REROUTED", "RETURNED", "HANDED_OVER"].includes(f.status));
    /* Twaa contribution from orders that include this merchant (pro-rata of the order ledger) */
    let cmLive = 0, gmvLive = 0, nLive = 0;
    S.orders.forEach((o) => { if (o.status === "CANCELLED") return; const ls = o.lines.filter((l) => l.sourceId === m.id && l.state !== "removed"); if (!ls.length) return; const L = TW.ledger(o); const v = sum(ls, (l) => l.unitPrice * l.qty); gmvLive += v; nLive++; cmLive += L.gmv ? L.contribution * (v / L.gmv) : 0; });
    const respLines = x.st.flatMap((s) => s.lines.filter((l) => l.kind === "responsibility" || l.kind === "penalty"));
    const respRefunds = S.refunds.filter((r) => r.party === "merchant" && S.orders.some((o) => o.id === r.orderId && o.lines.some((l) => l.sourceId === m.id)));
    const commission30 = m.gmv30 * m.commission;
    const ap = S.approvals.find((a) => a.type === "merchant_activation" && a.ref.id === m.id && a.status === "PENDING");
    const lead = S.leads.find((l) => l.merchantId === m.id);
    const aud = S.audit.filter((a) => String(a.obj).includes(m.ar) || String(a.obj).includes(`MS-${m.id}-`) || String(a.obj).includes(`@ ${m.ar}`)).slice(0, 15);
    const met = (label, val, t, extra = "") => { const l = t ? lvlOf(m, t) : 0; return `<div class="cm-met"><span class="lbl">${esc(label)}</span><span class="v ${l === 2 ? "cm-neg" : l === 1 ? "cm-warn" : ""}">${val}</span>${t ? `<span class="sub muted">الحد ${t[2] > 0 ? "≥" : "≤"} ${pct(t[3], t[3] < 0.05 ? 1 : 0)}</span>${meter(t[2] > 0 ? m[t[0]] : 1 - m[t[0]] / Math.max(t[4] * 2, 0.0001), 1, l === 2 ? "bad" : l === 1 ? "warn" : "ok")}` : ""}${extra}</div>`; };
    const coach = [...sug.bad, ...sug.warn].map((t) => { const [msg, tip] = COACH[t[0]](m); return { msg, tip, bad: sug.bad.includes(t) }; });
    const pi = x.pi;
    const settleRows = x.st.map((s) => `<tr><td>${esc(s.period)}<span class="sub mono">${esc(s.id)}</span></td><td class="n num">${money(s.sales)}</td><td class="n num">−${money(s.commission)}</td><td class="n num">−${money(s.refunds)}</td><td class="n num">${money(sum(s.lines, (l) => l.amount))}</td><td class="n num"><b>${money(s.net)}</b></td><td>${chip(s.status === "PAID" ? "اتصرف" : "مستحق", s.status === "PAID" ? "ok" : "warn")}${s.ref ? `<span class="sub mono">${esc(s.ref)}</span>` : ""}</td><td>${s.status === "DUE" ? A.permBtn("settlement.adjust", "صرف", "m-pay", { cls: "sm", data: { id: s.id } }) : ""}</td></tr>
      ${s.lines.map((l) => `<tr class="cm-sub"><td colspan="4"><span class="row wrap gap4">${chip({ responsibility: "مسؤولية", penalty: "غرامة", promo: "عرض", adjustment: "تعديل" }[l.kind] || l.kind, l.status === "disputed" ? "bad" : "neutral")}<span>${esc(l.event)}</span></span><span class="sub">${esc(l.evidence)} · ${esc(l.policy)}${l.resolution ? ` · ${esc(l.resolution)}` : ""}</span></td><td class="n num">${money(l.amount)}</td><td colspan="2">${l.status === "disputed" ? chip("متنازع عليه — EX-SET-002", "bad") : chip("نهائي", "neutral")}</td><td>${l.status === "disputed" ? `<span class="row gap4">${A.permBtn("settlement.adjust", "ثبّت", "m-line", { cls: "sm", data: { st: s.id, line: l.id, keep: "1" } })}${A.permBtn("settlement.adjust", "ألغِ الخصم", "m-line", { cls: "sm", data: { st: s.id, line: l.id, keep: "0" } })}</span>` : ""}</td></tr>`).join("")}`).join("");
    return `<div class="cc-top"><button type="button" class="btn sm" data-act="go" data-to="/admin/merchants">${ic("arrowR", "ic xs")}كل التجار</button><h1>${esc(m.ar)}<small>${esc(D.merchantTypes[m.type])}${m.cuisine ? ` · ${esc(D.cuisine[m.cuisine])}` : ""} · ${esc(zoneAr(m.zoneId))} · ${esc(m.owner)} · <span class="mono">${esc(m.phone)}</span>${m.license ? ` · ${esc(m.license)}` : ""}</small></h1>
        <span class="row wrap gap4">${m.status === "pending" ? chip("بانتظار التفعيل", "warn") : hChip(m.health)}${chip(m.mode === "open" ? "فاتح" : m.mode === "busy" ? "مشغول" : "مقفول", m.mode === "open" ? "ok" : m.mode === "busy" ? "warn" : "neutral")}</span>
        ${A.permBtn("merchant.activate", "تغيير التصنيف", "m-class", { cls: "sm", icon: "flag", data: { id: m.id } })}${A.permBtn("merchant.commission", `العمولة ${pct(m.commission)}`, "m-comm", { cls: "sm", icon: "percent", data: { id: m.id } })}${m.status === "active" ? `<button type="button" class="btn sm ghost" data-act="m-app" data-id="${esc(m.id)}" title="افتح تطبيق التاجر بصفة هذا التاجر">${ic("mobile", "ic xs")}تطبيق التاجر</button>` : ""}</div>
      ${m.status === "pending" ? `<div class="banner warn">${ic("store", "ic sm")}<div class="grow"><b>تاجر بانتظار التفعيل.</b> ${lead ? `مرحلة الاستقطاب: «${esc(D.leadStages[lead.stage])}» (${lead.stage + 1}/${D.leadStages.length}).` : ""} ${ap ? `طلب الموافقة <span class="mono">${esc(ap.id)}</span>: ${esc(ap.reason)} · ${esc(ap.evidence)}` : "لا يوجد طلب موافقة مفتوح."}</div>${ap ? (TW.canApprove(ap) ? `<span class="row gap4">${TW.btn("فعّل", "approve", { cls: "sm primary", icon: "check", data: { id: ap.id } })}${TW.btn("ارفض", "reject", { cls: "sm", data: { id: ap.id } })}</span>` : `<button class="btn sm" disabled title="الموافقة محتاجة مستوى عمليات التجار">${ic("lock", "ic sm")}<span>فعّل</span></button>`) : ""}<button type="button" class="btn sm ghost" data-act="goto-approvals">مركز الموافقات</button></div>` : ""}
      <div class="grid g4">${kpi("GMV آخر 30 يوم", money(m.gmv30), `${num(m.orders30)} طلب · متوسط ${money(m.orders30 ? m.gmv30 / m.orders30 : 0)}`)}${kpi("إيراد العمولة (30 يوم)", money(commission30), `عمولة ${pct(m.commission)} — كل 1% = ${money(m.gmv30 * 0.01)}/شهر`)}${kpi("مساهمة توّا من طلباته (المسجلة)", cmv(cmLive), `${num(nLive)} طلب · ${money(gmvLive)} بضاعة`, { tone: cmLive < 0 ? "bad" : "ok" })}${kpi("التسوية", esc(x.settle[0]), `${num(x.st.length)} كشف · ${num(x.disputed.length)} بند متنازع`, { tone: x.disputed.length ? "bad" : x.due.length ? "warn" : "ok" })}</div>
      <div class="grid g2">
        <div class="card"><div class="hd"><h3>${ic("chart", "ic sm")} بطاقة الأداء (Scorecard)</h3><span class="muted">تقييم العملاء ${m.rating ? num(m.rating, 1) : "—"} ★</span></div>
          <div class="cm-metrics">${met("معدل القبول", pct(m.acceptRate), THR[0], `<span class="sub muted">متوسط ${num(m.acceptSec)} ث للقبول</span>`)}${met("التجهيز في الموعد (SLA)", pct(m.prepOnTime), THR[1], `<span class="sub muted">وقت التجهيز المعلن ${num(m.prep)} د</span>`)}${met("دقة الإتاحة", pct(m.availAcc), THR[2])}${met("إلغاء بعد القبول", pct(m.cancelAfterAccept, 1), THR[3])}${met("نسبة البدائل", pct(m.subRate, 1), THR[4])}${met("نسبة الشكاوى", pct(m.complaintRate, 1), THR[5])}${met("مسؤولية الاستردادات", money(-sum(respLines, (l) => l.amount) + sum(respRefunds, (r) => r.amount)), null, `<span class="sub muted">${num(respLines.length + respRefunds.length)} حالة بدليل سلسلة الحيازة</span>`)}${met("صافي المستحق الحالي", money(sum(x.due, (s) => s.net)), null, `<span class="sub muted">${num(x.due.length)} كشف مستحق</span>`)}</div></div>
        <div class="card"><div class="hd"><h3>${ic("flag", "ic sm")} التصنيف والتوجيه</h3>${hChip(m.health)}</div>
          <div class="banner ${sug.level === m.health || (m.health === "new" && sug.level === "new") ? "ok" : sug.level === "restricted" ? "bad" : "warn"}">${ic(sug.level === m.health ? "check" : "info", "ic sm")}<div><b>اقتراح النظام: ${esc(HEALTH[sug.level][0])}</b> — ${esc(sug.why)}.${sug.level !== m.health && m.status === "active" ? " التغيير يدوي ومحتاج سبب من القائمة." : ""}</div></div>
          <div class="lbl" style="margin-top:10px">رسائل توجيه (بدل العقاب المباشر)</div>
          ${coach.length ? `<div class="col">${coach.map((c, i) => `<div class="cm-coach ${c.bad ? "bad" : ""}"><b>«${esc(c.msg)}»</b><span>${esc(c.tip)}</span><div class="row" style="margin-top:6px">${gbtn("merchant.activate", "ابعت للتاجر", "m-coach", { cls: "sm", icon: "chat", data: { id: m.id, i } })}</div></div>`).join("")}</div>` : `<div class="cm-coach ok"><b>«أداءك ممتاز — كل المؤشرات في الحدود. استمر!»</b><span>لا يحتاج تدخل.</span></div>`}
          <p class="cm-note muted">${ic("info", "ic xs")} مقيّد = ترتيب أقل في البحث وحد أقصى للطلبات المتزامنة · موقوف = المحل يتقفل فوراً وتتوقف الطلبات الجديدة.</p></div>
      </div>
      <div class="grid g2">
        <div class="card"><div class="hd"><h3>${ic("box", "ic sm")} التشكيلة والأسعار</h3>${pi ? `<button type="button" class="btn sm ghost" data-act="m-pricing" data-id="${esc(m.id)}">${ic("tag", "ic xs")}في صفحة التسعير</button>` : ""}</div>
          ${pi ? `<div class="cm-metrics">${met("أصناف من الكتالوج الموحد", num(pi.n))}${met("متاح الآن", `${num(pi.avail)} <small class="muted">(${pct(pi.n ? pi.avail / pi.n : 0)})</small>`)}${met("مؤشر السعر مقابل المرجعي", pi.idx ? `${num(pi.idx * 100, 1)}` : "—", null, `<span class="sub muted">100 = السعر المرجعي · ${pi.idx > 1 ? "أغلى" : "أرخص"} بـ ${pct(Math.abs((pi.idx || 1) - 1), 1)}</span>`)}${met(`خارج السماحية ±${tol}%`, `<span class="${pi.out.length ? "cm-neg" : ""}">${num(pi.out.length)}</span>`, null, `<span class="sub muted">${num(pi.pending.length)} سعر بانتظار مراجعة</span>`)}</div>
            ${pi.out.length ? `<div class="tw" style="margin-top:10px"><table class="tbl"><thead><tr><th>الصنف</th><th class="n">سعر التاجر</th><th class="n">المرجعي</th><th class="n">الفرق</th></tr></thead><tbody>${pi.out.slice(0, 6).map((r) => `<tr class="click" data-act="sku-open" data-id="${esc(r.s.id)}" tabindex="0"><td>${esc(r.s.ar)}<span class="sub">${esc(r.s.size)}</span></td><td class="n num">${money(r.x.price)}</td><td class="n num">${money(r.s.refPrice)}</td><td class="n">${dlt(r.r - 1)}</td></tr>`).join("")}</tbody></table></div>` : ""}` : `<p>منيو مطعم: <b class="num">${num(x.listing)}</b> صنف (${num((S.menus[m.id] || []).filter((i) => i.available).length)} متاح). أسعار المطاعم خارج سماحية الكتالوج الموحد.</p>`}</div>
        <div class="card"><div class="hd"><h3>${ic("receipt", "ic sm")} أوامر التنفيذ المفتوحة</h3><span class="muted">${num(fos.length)}</span></div>
          ${fos.length ? `<div class="tw"><table class="tbl"><thead><tr><th>أمر التنفيذ</th><th>الطلب</th><th>الحالة</th><th>المهلة</th><th class="n">القيمة</th></tr></thead><tbody>${fos.map((f) => { const o = find(S.orders, f.orderId); const v = o ? sum(o.lines.filter((l) => l.foId === f.id), (l) => l.unitPrice * l.qty) : 0; const until = f.status === "AWAITING_ACCEPT" ? f.acceptBy : f.status === "PREPARING" ? f.prepBy : null; return `<tr><td class="mono">${esc(f.id)}</td><td>${A.orderLink(f.orderId)}</td><td>${A.st("fo", f.status)}</td><td>${until ? `<span class="timer" data-until="${until}"></span>` : `<span class="muted">—</span>`}</td><td class="n num">${money(v)}</td></tr>`; }).join("")}</tbody></table></div>` : `<p class="muted">مفيش أوامر مفتوحة دلوقتي.</p>`}</div>
      </div>
      <div class="card"><div class="hd"><h3>${ic("scale", "ic sm")} التسويات (كشوف قابلة للتفسير)</h3><button type="button" class="btn sm ghost" data-act="go" data-to="/admin/merchant-settlements">كل التسويات</button></div>
        ${x.st.length ? `<div class="tw"><table class="tbl"><thead><tr><th>الفترة</th><th class="n">المبيعات</th><th class="n">العمولة</th><th class="n">الاستردادات</th><th class="n">بنود</th><th class="n">الصافي</th><th>الحالة</th><th></th></tr></thead><tbody>${settleRows}</tbody></table></div>${x.disputed.length ? `<div class="banner bad" style="margin-top:8px">${ic("alert", "ic sm")}<div>الصرف متوقف لحد ما البند المتنازع عليه يتحسم (EX-SET-002) — Guardrail F: النزاعات ما تكبرش في الخفاء.</div></div>` : ""}` : `<p class="muted">لا توجد كشوف بعد.</p>`}</div>
      <div class="card"><div class="hd"><h3>${ic("book", "ic sm")} سجل التدقيق للتاجر</h3>${auditLink}</div>${auditRows(aud)}</div>`;
  },
  on: {},
});
