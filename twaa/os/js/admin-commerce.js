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
const mny = (v, d = 0) => (v < 0 ? `<bdi class="cm-ltr">−${num(-v, d)}</bdi> ج.م` : money(v, d));
const cmv = (v, d = 1) => `<span class="num ${v < 0 ? "cm-neg" : "cm-pos"}">${mny(v, d)}</span>`;
const pg = (html) => `<div class="cm-page">${html}</div>`;
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
      <td class="cm-nw"><b class="mono">${esc(o.id)}</b>${o.promo ? `<span class="sub">${ic("tag", "ic xs")} ${esc((find(S.promos, o.promo) || {}).code || o.promo)}</span>` : ""}</td>
      <td class="cm-nw">${c ? `<button type="button" class="btn sm ghost cm-lnk" data-act="open-customer" data-id="${esc(c.id)}">${esc(c.ar)}</button>` : "—"}<span class="sub">${esc(PAY[o.pay.method] || o.pay.method)}${(o.caseIds || []).length ? ` · ${ic("inbox", "ic xs")} ${o.caseIds.length} حالة` : ""}</span></td>
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
      <td class="cm-nw"><b>${esc(c.ar)}</b><span class="sub mono">${esc(c.phone)}</span></td><td>${esc(p.z ? p.z.ar : "—")}<span class="sub">${esc(p.addr.landmark || "")}</span></td>
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
const THR = [["acceptRate", "معدل القبول", 1, 0.92, 0.86], ["prepOnTime", "التجهيز في الموعد", 1, 0.82, 0.72], ["availAcc", "دقة الإتاحة", 1, 0.9, 0.85], ["cancelAfterAccept", "إلغاء بعد القبول", -1, 0.03, 0.06], ["subRate", "نسبة البدائل", -1, 0.065, 0.1], ["complaintRate", "نسبة الشكاوى", -1, 0.025, 0.04]];
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
      <p class="muted cm-note">${ic("info", "ic xs")} الحدود: قبول ≥ 92% · تجهيز في الموعد ≥ 82% · دقة إتاحة ≥ 90% · إلغاء بعد القبول ≤ 3% · بدائل ≤ 6.5% · شكاوى ≤ 2.5% (الأحمر = تجاوز حد التقييد).</p>`;
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
    const settleRows = x.st.map((s) => `<tr><td>${esc(s.period)}<span class="sub mono">${esc(s.id)}</span></td><td class="n num">${money(s.sales)}</td><td class="n num">${mny(-s.commission)}</td><td class="n num">${mny(-s.refunds)}</td><td class="n num">${mny(sum(s.lines, (l) => l.amount))}</td><td class="n num"><b>${mny(s.net)}</b></td><td>${chip(s.status === "PAID" ? "اتصرف" : "مستحق", s.status === "PAID" ? "ok" : "warn")}${s.ref ? `<span class="sub mono">${esc(s.ref)}</span>` : ""}</td><td>${s.status === "DUE" ? A.permBtn("settlement.adjust", "صرف", "m-pay", { cls: "sm", data: { id: s.id } }) : ""}</td></tr>
      ${s.lines.map((l) => `<tr class="cm-sub"><td colspan="4"><span class="row wrap gap4">${chip({ responsibility: "مسؤولية", penalty: "غرامة", promo: "عرض", adjustment: "تعديل" }[l.kind] || l.kind, l.status === "disputed" ? "bad" : "neutral")}<span>${esc(l.event)}</span></span><span class="sub">${esc(l.evidence)} · ${esc(l.policy)}${l.resolution ? ` · ${esc(l.resolution)}` : ""}</span></td><td class="n num">${mny(l.amount)}</td><td colspan="2">${l.status === "disputed" ? chip("متنازع عليه — EX-SET-002", "bad") : chip("نهائي", "neutral")}</td><td>${l.status === "disputed" ? `<span class="row gap4">${A.permBtn("settlement.adjust", "ثبّت", "m-line", { cls: "sm", data: { st: s.id, line: l.id, keep: "1" } })}${A.permBtn("settlement.adjust", "ألغِ الخصم", "m-line", { cls: "sm", data: { st: s.id, line: l.id, keep: "0" } })}</span>` : ""}</td></tr>`).join("")}`).join("");
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

/* ===================================================================== CATALOGUE ===================== */
/* duplicate detection for catalogue requests: barcode → exact; normalised name → exact; otherwise token overlap (aliases, brand, typo tolerance) */
function dupCandidates(name, barcode, deptGuess, limit = 4) {
  const nq = norm(name), bc = String(barcode || "").trim(); const terms = nq.split(" ").filter((t) => t.length >= 2);
  const out = [];
  TW.S.skus.forEach((s) => {
    let score = 0; const why = [];
    if (bc && s.barcode === bc) { score = 100; why.push("نفس الباركود"); }
    else if (nq && norm(s.ar) === nq) { score = 96; why.push("نفس الاسم بعد التطبيع"); }
    else if (terms.length) {
      const hay = norm([s.ar, s.en, s.brand, s.sub, ...(s.aliases || [])].join(" ")).split(" ");
      let hit = 0;
      terms.forEach((t) => { if (hay.some((w) => w === t || (t.length >= 3 && w.length >= 3 && (w.includes(t) || t.includes(w))) || (t.length >= 4 && lev(w, t) <= 1))) hit++; });
      if (hit) { score = Math.round((hit / terms.length) * 80) + (deptGuess && s.dept === deptGuess ? 10 : 0); why.push(`${hit}/${terms.length} كلمات متطابقة`); if (deptGuess && s.dept === deptGuess) why.push("نفس القسم"); }
    }
    if (score >= 35) out.push({ s, score: Math.min(100, score), why, exact: score >= 96 });
  });
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
const guessDept = (catGuess) => { const [d, c] = String(catGuess || "").split("/"); const dept = D.cats[d] ? d : null; return { dept, cat: dept && (D.cats[dept] || []).some((x) => x[0] === c) ? c : dept ? D.cats[dept][0][0] : null }; };
const brandGuess = (name) => { const n = norm(name); const b = [...new Set(TW.S.skus.map((s) => s.brand).filter((x) => x && x !== "—" && x.length > 2))].find((x) => n.includes(norm(x))); return b || ""; };
const REJECT_REASONS = ["منتج مكرر في الكتالوج", "اسم غير واضح / بدون علامة تجارية", "منتج غير مسموح (منظَّم بدون ترخيص)", "قسم غير مدعوم حالياً", "بيانات ناقصة — اطلب صورة أو باركود"];
const SKU_REASONS = ["تصحيح بيانات المورد", "توحيد التسمية ومنع التكرار", "تغيير مواصفات العبوة", "متطلبات تخزين / سلامة", "تحديث سعر السوق", "زيادة / خفض سعر المورد", "قرار إدارة القسم"];
const RETIRE_REASONS = ["بطء حركة / لا مبيعات", "المورد أوقف المنتج", "منتج مكرر — دمج في SKU آخر", "جودة / شكاوى متكررة", "استبدال بعبوة جديدة"];

function reqCard(inst, cr, SK) {
  const S = TW.S, m = find(S.merchants, cr.merchantId), g = guessDept(cr.catGuess);
  const cands = dupCandidates(cr.name, cr.barcode, g.dept);
  const exact = cands.find((c) => c.exact);
  const ap = S.approvals.find((a) => a.ref && a.ref.kind === "catreq" && a.ref.id === cr.id && a.status === "PENDING");
  const qk = `req_q_${cr.id}`, q = u(inst, qk, "");
  const found = q.trim().length >= 2 ? TW.S.skus.filter((s) => norm(`${s.ar} ${s.en} ${s.brand} ${(s.aliases || []).join(" ")} ${s.barcode}`).includes(norm(q))).slice(0, 5) : [];
  const linkBtn = (s) => gbtn("catalog.approve", `اربط بـ ${s.id}`, "req-link", { cls: "sm", icon: "link", data: { req: cr.id, sku: s.id } });
  return `<div class="cm-req">
    <div class="row wrap between"><div class="grow"><b style="font-size:15px">${esc(cr.name)}</b> <span class="mono muted">${esc(cr.id)}</span><span class="sub">من ${m ? `<button type="button" class="btn sm ghost cm-lnk" data-act="open-merchant" data-id="${esc(m.id)}">${esc(m.ar)}</button> (${esc(D.merchantTypes[m.type])})` : esc(cr.merchantId)} · ${esc(ago(cr.at))}</span></div>
      <span class="row wrap gap4">${cr.barcode ? chip(`باركود ${cr.barcode}`, "neutral", "scan") : chip("بدون باركود", "warn")}${cr.photo ? chip("صورة مرفقة", "ok", "camera") : chip("بدون صورة", "warn", "camera")}${chip(`تخمين التاجر: ${g.dept ? `${deptAr(g.dept)} › ${catAr(g.dept, g.cat)}` : cr.catGuess || "—"}`, "info")}${ap ? chip(ap.id, "neutral") : ""}</span></div>
    <div><div class="lbl">${ic("search", "ic xs")} كشف التكرار (اسم مطبّع + باركود + أسماء بحث)</div>
      ${cands.length ? `<div class="col gap4">${cands.map((c) => `<div class="cm-dup${c.exact ? " exact" : ""}"><span class="cm-score">${num(c.score)}%</span><span class="grow"><button type="button" class="btn sm ghost cm-lnk" data-act="sku-open" data-id="${esc(c.s.id)}">${esc(c.s.ar)}</button> <span class="muted">${esc(c.s.size)} · ${esc(c.s.brand)}</span><span class="sub mono">${esc(c.s.id)} · ${esc(c.s.barcode)}</span><span class="sub">${esc(c.why.join(" · "))}</span></span>${linkBtn(c.s)}</div>`).join("")}</div>` : `<p class="muted">${ic("check", "ic xs")} مفيش منتج مشابه — آمن تنشئ SKU جديد.</p>`}
      ${exact ? `<div class="banner bad" style="margin-top:6px">${ic("alert", "ic sm")}<div><b>تكرار مؤكد:</b> ${esc(exact.s.ar)} (${esc(exact.s.id)}) — إنشاء SKU جديد هيترفض. اربط الطلب بالمنتج الموجود.</div></div>` : cands.length ? `<p class="cm-note muted">${ic("info", "ic xs")} في منتجات مشابهة بس مش مطابقة — راجع الحجم والعلامة قبل الإنشاء.</p>` : ""}</div>
    <div class="row wrap">${qbox(qk, q, "دوّر في الكتالوج للربط يدوياً")}${found.map((s) => `<span class="row gap4 cm-found"><span>${esc(s.ar)} <span class="muted mono">${esc(s.id)}</span></span>${linkBtn(s)}</span>`).join("")}</div>
    <div class="row wrap">${gbtn("catalog.approve", "أنشئ SKU معتمد", "req-create", { cls: "sm primary", icon: "plus", data: { id: cr.id } })}${gbtn("catalog.approve", "ارفض", "req-reject", { cls: "sm", icon: "x", data: { id: cr.id } })}<span class="muted cm-note">القرار يوصل للتاجر كإشعار ويتسجل في التدقيق.</span></div></div>`;
}

TW.page("catalog", {
  render(inst) {
    const S = TW.S, SK = skuMap();
    const skus = S.skus, active = skus.filter((s) => s.active);
    const badBc = skus.filter((s) => !/^\d{8,14}$/.test(String(s.barcode || "")));
    const pend = S.catReqs.filter((r) => r.status === "PENDING"), done = S.catReqs.filter((r) => r.status !== "PENDING");
    const listCount = {}; Object.values(S.msku).forEach((map) => Object.keys(map || {}).forEach((id) => (listCount[id] = (listCount[id] || 0) + 1)));
    /* hierarchy state */
    const dept = u(inst, "cat_dept", null), cat = u(inst, "cat_cat", null), fam = u(inst, "cat_fam", null);
    const q = u(inst, "cat_q", ""), status = u(inst, "cat_status", "all"), flag = u(inst, "cat_flag", "all");
    const FLAGS = { all: () => true, regulated: (s) => s.regulated || s.ageR, barcode: (s) => !/^\d{8,14}$/.test(String(s.barcode || "")), chilled: (s) => s.temp === "c" || s.temp === "f", fragile: (s) => s.fragile, nosub: (s) => !s.subGroup, hub: (s) => s.hub, unlisted: (s) => !listCount[s.id] && !s.hub };
    const nq = norm(q);
    const list = skus.filter((s) => (!dept || s.dept === dept) && (!cat || s.cat === cat) && (!fam || s.sub === fam) && (status === "all" || (status === "active") === !!s.active) && (FLAGS[flag] || FLAGS.all)(s) && (!nq || norm(`${s.id} ${s.ar} ${s.en} ${s.brand} ${s.barcode} ${(s.aliases || []).join(" ")}`).includes(nq)));
    const shown = inst.ui.cat_all ? list : list.slice(0, 40);
    const deptN = (d) => skus.filter((s) => s.dept === d).length;
    const cats = dept ? (D.cats[dept] || []) : [];
    const fams = dept && cat ? [...new Set(skus.filter((s) => s.dept === dept && s.cat === cat).map((s) => s.sub))] : [];
    const hier = `<div class="cm-hier">
      <div class="cm-col"><b>القسم (Department)</b><button type="button" class="${!dept ? "on" : ""}" data-act="cat-pick" data-l="dept" data-v="">${ic("layers", "ic xs")}كل الأقسام<span class="n">${num(skus.length)}</span></button>${D.depts.map((d) => `<button type="button" class="${dept === d.id ? "on" : ""}" data-act="cat-pick" data-l="dept" data-v="${d.id}">${ic(d.icon, "ic xs")}${esc(d.ar)}<span class="n">${num(deptN(d.id))}</span></button>`).join("")}</div>
      <div class="cm-col"><b>الفئة (Category)</b>${dept ? cats.map(([cid, ar]) => `<button type="button" class="${cat === cid ? "on" : ""}" data-act="cat-pick" data-l="cat" data-v="${cid}">${esc(ar)}<span class="n">${num(skus.filter((s) => s.dept === dept && s.cat === cid).length)}</span></button>`).join("") : `<p class="muted cm-note">اختار قسم</p>`}</div>
      <div class="cm-col"><b>الفئة الفرعية / عائلة المنتج</b>${cat ? fams.map((f) => `<button type="button" class="${fam === f ? "on" : ""}" data-act="cat-pick" data-l="fam" data-v="${esc(f)}">${esc(f)}<span class="n">${num(skus.filter((s) => s.dept === dept && s.cat === cat && s.sub === f).length)}</span></button>`).join("") || `<p class="muted cm-note">لا توجد منتجات</p>` : `<p class="muted cm-note">اختار فئة</p>`}</div></div>`;
    const cov = D.depts.map((d) => { const ds = skus.filter((s) => s.dept === d.id); const merchants = S.merchants.filter((m) => m.status === "active" && (d.id === "food" ? !!S.menus[m.id] : Object.keys(S.msku[m.id] || {}).some((id) => (SK.get(id) || {}).dept === d.id))).length; const hub = ds.filter((s) => s.hub).length; return { d, n: ds.length, act: ds.filter((s) => s.active).length, merchants, hub, menu: d.id === "food" ? sum(Object.values(S.menus), (x) => x.length) : 0 }; });
    const rows = shown.map((s) => { const iv = S.inv.h1[s.id]; return `<tr class="click" data-act="sku-open" data-id="${esc(s.id)}" tabindex="0"><td class="mono">${esc(s.id)}</td><td><b>${esc(s.ar)}</b><span class="sub ltr">${esc(s.en)}</span></td><td>${esc(s.brand)}</td><td>${esc(catAr(s.dept, s.cat))}<span class="sub">${esc(deptAr(s.dept))} › ${esc(s.sub)}</span></td><td>${esc(s.size)}</td><td class="mono">${/^\d{8,14}$/.test(String(s.barcode || "")) ? esc(s.barcode) : chip("ناقص", "bad")}</td><td>${chip(TEMP[s.temp] || s.temp, s.temp === "f" ? "info" : s.temp === "c" ? "info" : "neutral")}</td><td class="n num">${money(s.refPrice)}</td><td class="n num">${num(listCount[s.id] || 0)}</td><td class="n num">${iv ? num(iv.onHand - iv.reserved) : "—"}</td><td><span class="row gap4">${s.regulated ? chip("منظَّم", "bad") : ""}${s.ageR ? chip(`+${s.ageR}`, "warn") : ""}${s.fragile ? chip("كسر", "warn") : ""}${!s.subGroup ? chip("بدون بدائل", "neutral") : ""}</span></td><td>${s.active ? chip("نشط", "ok") : chip("موقوف", "neutral")}</td></tr>`; }).join("");
    return `${A.head("كتالوج توّا الموحد", "Twaa Master Catalogue · قسم ← فئة ← فئة فرعية ← عائلة ← SKU. التاجر لا ينشئ منتجات — يختار من الكتالوج أو يطلب إضافة.")}
      <div class="grid g6">${kpi("SKU في الكتالوج", num(skus.length), `${num(active.length)} نشط · ${num(skus.length - active.length)} موقوف`)}${kpi("باركود ناقص/غير صالح", num(badBc.length), "يمنع المسح عند الاستلام", { tone: badBc.length ? "warn" : "ok", act: "ui", data: { k: "cat_flag", v: "barcode" } })}${kpi("منظَّم / قيد سن", num(skus.filter((s) => s.regulated || s.ageR).length), "بروشتة أو +16/+18", { act: "ui", data: { k: "cat_flag", v: "regulated" } })}${kpi("بدون مجموعة بدائل", num(skus.filter((s) => !s.subGroup).length), "يبطّئ قرار البديل", { act: "ui", data: { k: "cat_flag", v: "nosub" } })}${kpi("مخزّن في الهب", num(skus.filter((s) => s.hub).length), `${num(Object.keys(listCount).length)} SKU عند التجار`)}${kpi("طلبات إضافة معلّقة", num(pend.length), "طابور الموافقة", { tone: pend.length ? "warn" : "ok" })}</div>
      <div class="card" data-hl="catreq"><div class="hd"><h3>${ic("inbox", "ic sm")} طابور اعتماد الكتالوج (Catalog Approval Queue)</h3><span class="muted">${num(pend.length)} معلّق</span></div>
        ${pend.length ? `<div class="col gap12">${pend.map((cr) => reqCard(inst, cr, SK)).join("")}</div>` : TW.empty("مفيش طلبات معلّقة", "طلبات «مش لاقي المنتج؟» من التجار هتظهر هنا", "inbox")}
        ${done.length ? `<details class="cm-det"><summary>قرارات سابقة (${num(done.length)})</summary><div class="list">${done.map((r) => `<div class="li"><span class="grow">${esc(r.name)} <span class="mono muted">${esc(r.id)}</span><span class="sub">${esc(A.merchant(r.merchantId))}${r.skuId ? ` · ← <span class="mono">${esc(r.skuId)}</span>` : ""}${r.rejectReason ? ` · ${esc(r.rejectReason)}` : ""}</span></span>${chip({ APPROVED: "SKU جديد معتمد", LINKED: "اتربط بمنتج موجود", REJECTED: "مرفوض" }[r.status] || r.status, r.status === "REJECTED" ? "bad" : "ok")}${r.skuId ? `<button type="button" class="btn sm" data-act="sku-open" data-id="${esc(r.skuId)}">افتح</button>` : ""}</div>`).join("")}</div></details>` : ""}</div>
      <div class="card"><div class="hd"><h3>${ic("layers", "ic sm")} تصفح الهيكل</h3>${dept ? `<span class="row gap4 muted">${esc(deptAr(dept))}${cat ? ` › ${esc(catAr(dept, cat))}` : ""}${fam ? ` › ${esc(fam)}` : ""}</span>` : ""}</div>${hier}</div>
      <div class="filters">${qbox("cat_q", q, "اسم، إنجليزي، علامة، باركود، اسم عامي")}
        ${sel("cat_status", status, [["all", "نشط وموقوف"], ["active", "نشط فقط"], ["inactive", "موقوف فقط"]], "الحالة")}
        ${sel("cat_flag", flag, [["all", "كل العلامات"], ["regulated", "منظَّم / قيد سن"], ["barcode", "باركود ناقص"], ["chilled", "مبرد / مجمد"], ["fragile", "قابل للكسر"], ["nosub", "بدون مجموعة بدائل"], ["hub", "مخزّن في الهب"], ["unlisted", "غير متاح عند أي مصدر"]], "علامة")}
        <span class="muted">${num(list.length)} SKU</span><button type="button" class="btn sm ghost" data-act="cat-reset">${ic("refresh", "ic xs")}مسح</button></div>
      <div class="card" style="padding:0"><div class="tw"><table class="tbl"><thead><tr><th>SKU</th><th>الاسم</th><th>العلامة</th><th>الفئة</th><th>الحجم</th><th>الباركود</th><th>الحرارة</th><th class="n">المرجعي</th><th class="n">تجار</th><th class="n">الهب</th><th>علامات</th><th>الحالة</th></tr></thead><tbody>${rows || `<tr><td colspan="12" class="c muted">مفيش منتجات</td></tr>`}</tbody></table></div></div>
      ${list.length > 40 ? `<div class="row"><button type="button" class="btn sm" data-act="ui-toggle" data-k="cat_all">${inst.ui.cat_all ? "اعرض أول 40" : `اعرض كل ${num(list.length)} SKU`}</button></div>` : ""}
      <div class="card"><h3>${ic("grid", "ic sm")} التغطية حسب القسم</h3><div class="tw"><table class="tbl"><thead><tr><th>القسم</th><th class="n">SKU</th><th class="n">نشط</th><th class="n">في الهب</th><th class="n">تجار يبيعوه</th><th>تغطية المصادر</th></tr></thead><tbody>${cov.map((r) => `<tr class="click" data-act="cat-pick" data-l="dept" data-v="${r.d.id}" tabindex="0"><td>${ic(r.d.icon, "ic xs")} ${esc(r.d.ar)}</td><td class="n num">${r.d.id === "food" ? `${num(r.menu)} <small class="muted">صنف منيو</small>` : num(r.n)}</td><td class="n num">${num(r.act)}</td><td class="n num">${num(r.hub)}</td><td class="n num">${num(r.merchants)}</td><td style="min-width:140px">${meter(Math.min(1, (r.merchants + (r.hub ? 1 : 0)) / 4), 1, r.merchants + (r.hub ? 1 : 0) <= 1 ? "bad" : r.merchants + (r.hub ? 1 : 0) <= 2 ? "warn" : "ok")}</td></tr>`).join("")}</tbody></table></div><p class="muted cm-note">${ic("info", "ic xs")} التغطية = الهب + عدد التجار النشطين اللي بيبيعوا من القسم (هدف ≥ 4 مصادر).</p></div>`;
  },
  on: {},
});

/* ---------------- SKU detail: shared by the drawer (any commerce page) and the full page /admin/sku/<id> ---------------- */
const SKU_F = {
  ar: ["الاسم العربي", "text"], en: ["الاسم الإنجليزي", "text"], aliases: ["أسماء بحث / عامية (افصل بفاصلة)", "text"], brand: ["العلامة التجارية", "text"],
  cat: ["القسم › الفئة", "select"], sub: ["الفئة الفرعية", "text"], family: ["عائلة المنتج", "text"], size: ["الحجم", "text"], unit: ["الوحدة", "select"], pack: ["عدد القطع في العبوة", "number"],
  weightKg: ["الوزن التقديري (كجم)", "number"], barcode: ["الباركود", "text"], temp: ["الحرارة", "select"], handling: ["المناولة", "select"], fragile: ["قابل للكسر", "bool"], regulated: ["منظَّم / بروشتة", "bool"],
  ageR: ["قيد السن", "select"], shelfLife: ["الصلاحية المتوقعة (يوم)", "number"], subGroup: ["مجموعة البدائل", "select"], refPrice: ["السعر المرجعي", "number"], price: ["سعر بيع الهب", "number"], tax: ["الضريبة", "select"], active: ["الحالة", "bool"],
};
const skuPerm = (f) => (f === "price" || f === "refPrice" ? "price.override" : "catalog.edit");
function skuFieldOpts(f) {
  const S = TW.S;
  if (f === "cat") return D.depts.flatMap((d) => (D.cats[d.id] || []).map(([c, ar]) => [`${d.id}/${c}`, `${d.ar} › ${ar}`]));
  if (f === "unit") return [...new Set(S.skus.map((s) => s.unit))].map((x) => [x, x]);
  if (f === "temp") return Object.entries(TEMP);
  if (f === "handling") return Object.entries(HANDLING);
  if (f === "ageR") return [["0", "بدون"], ["16", "+16"], ["18", "+18"]];
  if (f === "tax") return [["0.14", "14% ضريبة قيمة مضافة"], ["0", "معفى (0%)"]];
  if (f === "subGroup") return [["", "بدون مجموعة"], ...[...new Set(S.skus.map((s) => s.subGroup).filter(Boolean))].sort().map((x) => [x, x])];
  if (f === "active") return [["true", "نشط"], ["false", "موقوف (Retired)"]];
  return [["true", "نعم"], ["false", "لا"]];
}
const skuCur = (s, f) => (f === "cat" ? `${s.dept}/${s.cat}` : f === "aliases" ? (s.aliases || []).join("، ") : SKU_F[f][1] === "bool" ? String(!!s[f]) : f === "subGroup" ? s.subGroup || "" : s[f] == null ? "" : String(s[f]));
function skuEdit(inst, id, f) {
  const s = find(TW.S.skus, id); if (!s || !SKU_F[f]) return;
  const [label, type] = SKU_F[f];
  const money_ = f === "price" || f === "refPrice";
  A.ask(inst, { title: `تعديل ${label} — ${s.ar}`, action: "commerce.skuSet", payload: { skuId: id, field: f }, extra: [{ k: "value", label: `${label} (الحالي: ${skuCur(s, f) || "—"})`, type: type === "select" || type === "bool" ? "select" : type === "number" ? "number" : "text", options: type === "select" || type === "bool" ? skuFieldOpts(f) : null, value: skuCur(s, f) }], reasons: f === "active" ? [...RETIRE_REASONS, "إعادة تفعيل — رجع من المورد"] : SKU_REASONS, confirm: "احفظ التعديل", danger: f === "active" && s.active, note: money_ ? `تعديل السعر بدون صمت: القيمة القديمة والجديدة والسبب بيتسجلوا في التدقيق. ${f === "refPrice" ? `السعر المرجعي بيحدد سماحية التجار (±${TW.S.rules.priceTolerance}%).` : "سعر الهب بيظهر للعميل فوراً."}` : f === "active" && s.active ? "إيقاف الـ SKU بيشيله من البحث وعروض كل المصادر فوراً (الطلبات الحالية بتكمّل)." : "كل تعديل على البيانات الرئيسية بيسري على كل التجار والتطبيقات ويتسجل في التدقيق." });
}
function skuView(inst, id) {
  const S = TW.S, s = find(S.skus, id); if (!s) return null;
  const iv = S.inv.h1[s.id];
  const offers = S.merchants.filter((m) => (S.msku[m.id] || {})[s.id]).map((m) => ({ m, x: S.msku[m.id][s.id] }));
  const meds = offers.map((o) => o.x.price); const med = median(meds);
  const tol = S.rules.priceTolerance / 100;
  const group = s.subGroup ? S.skus.filter((x) => x.subGroup === s.subGroup && x.id !== s.id) : [];
  const aud = S.audit.filter((a) => String(a.obj) === s.id || String(a.obj).startsWith(`${s.id} `) || String(a.obj).includes(`${s.ar} @`) || String(a.nw) === s.id).slice(0, 12);
  const f = (k, val) => `<dt>${esc(SKU_F[k] ? SKU_F[k][0] : k)}</dt><dd><span class="row between gap4"><span class="grow">${val}</span>${SKU_F[k] ? edBtn(skuPerm(k), "sku-edit", { id: s.id, f: k }, `تعديل ${SKU_F[k][0]}`) : ""}</span></dd>`;
  const yn = (b) => (b ? chip("نعم", "warn") : `<span class="muted">لا</span>`);
  const html = `<div class="row wrap">${s.active ? chip("نشط", "ok") : chip("موقوف", "neutral")}${chip(TEMP[s.temp] || s.temp, "info")}${chip(HANDLING[s.handling] || s.handling, "neutral")}${s.regulated ? chip("منظَّم", "bad") : ""}${s.ageR ? chip(`+${s.ageR}`, "warn") : ""}${s.local ? chip("منتج محلي", "accent") : ""}${s.createdFrom ? chip(`من طلب ${s.createdFrom}`, "brand") : ""}</div>
    <div class="grid g2">
      <div class="card"><h3>${ic("tag", "ic sm")} الهوية</h3><dl class="kv cm-kv"><dt>SKU ID</dt><dd class="mono">${esc(s.id)}</dd>${f("ar", esc(s.ar))}${f("en", `<span class="ltr">${esc(s.en)}</span>`)}${f("aliases", (s.aliases || []).length ? (s.aliases || []).map((a) => chip(a, "neutral")).join(" ") : `<span class="muted">— (يضعف البحث)</span>`)}${f("brand", esc(s.brand))}${f("barcode", `<span class="mono">${esc(s.barcode || "—")}</span>`)}</dl></div>
      <div class="card"><h3>${ic("layers", "ic sm")} الهيكل</h3><dl class="kv cm-kv">${f("cat", `${esc(deptAr(s.dept))} › ${esc(catAr(s.dept, s.cat))}`)}${f("sub", esc(s.sub))}${f("family", esc(s.family))}<dt>الوصف</dt><dd>${esc(s.desc || "—")}</dd></dl></div>
      <div class="card"><h3>${ic("box", "ic sm")} العبوة والمناولة</h3><dl class="kv cm-kv">${f("size", esc(s.size))}${f("unit", esc(s.unit))}${f("pack", num(s.pack))}${f("weightKg", `${num(s.weightKg, 2)} كجم${s.weightVar ? " (وزن متغير)" : ""}`)}${f("temp", esc(TEMP[s.temp] || s.temp))}${f("handling", esc(HANDLING[s.handling] || s.handling))}${f("fragile", yn(s.fragile))}${f("regulated", yn(s.regulated))}${f("ageR", s.ageR ? `+${s.ageR}` : `<span class="muted">بدون</span>`)}${f("shelfLife", `${num(s.shelfLife)} يوم`)}</dl></div>
      <div class="card"><h3>${ic("coins", "ic sm")} التجاري</h3><dl class="kv cm-kv">${f("refPrice", `<b class="num">${money(s.refPrice)}</b>`)}${f("price", `<span class="num">${money(s.price)}</span>${s.oldPrice ? ` <s class="muted num">${money(s.oldPrice)}</s>` : ""}`)}${f("tax", s.tax ? pct(s.tax) : "معفى")}${f("subGroup", s.subGroup ? `<span class="mono">${esc(s.subGroup)}</span> · ${num(group.length)} بديل` : `<span class="muted">بدون</span>`)}${f("active", s.active ? chip("نشط", "ok") : chip("موقوف", "neutral"))}<dt>وسيط أسعار التجار</dt><dd class="num">${med != null ? `${money(med)} (${num(offers.length)} تاجر)` : "—"}</dd></dl></div>
    </div>
    ${group.length ? `<div class="card"><h3>${ic("refresh", "ic sm")} البدائل في نفس المجموعة</h3><div class="cm-chips">${group.map((g) => `<button type="button" class="chip t-neutral cm-cb" data-act="sku-open" data-id="${esc(g.id)}">${esc(g.ar)} · ${money(g.price)}</button>`).join("")}</div></div>` : ""}
    <div class="card"><h3>${ic("store", "ic sm")} المصادر والأسعار</h3><div class="tw"><table class="tbl"><thead><tr><th>المصدر</th><th class="n">السعر</th><th class="n">مقابل المرجعي</th><th>الإتاحة</th><th class="n">الكمية</th></tr></thead><tbody>
      ${iv ? `<tr><td><b>هب توّا</b><span class="sub mono">رف ${esc(iv.bin)}</span></td><td class="n num">${money(s.price)}</td><td class="n">${dlt(s.price / s.refPrice - 1)}</td><td>${iv.onHand - iv.reserved > 0 ? chip("متاح", "ok") : chip("نفد", "bad")}</td><td class="n num">${num(iv.onHand)} − ${num(iv.reserved)} محجوز</td></tr>` : ""}
      ${offers.map(({ m, x }) => `<tr><td><button type="button" class="btn sm ghost cm-lnk" data-act="open-merchant" data-id="${esc(m.id)}">${esc(m.ar)}</button></td><td class="n num">${money(x.price)}${x.pendingPrice ? `<span class="sub">مقترح ${money(x.pendingPrice)}</span>` : ""}</td><td class="n">${dlt(x.price / s.refPrice - 1)}${Math.abs(x.price / s.refPrice - 1) > tol ? ` ${chip("خارج السماحية", "bad")}` : ""}</td><td>${x.available ? chip("متاح", "ok") : chip("غير متاح", "neutral")}</td><td class="n num">${x.stock == null ? "—" : num(x.stock)}</td></tr>`).join("")}
      ${!iv && !offers.length ? `<tr><td colspan="5" class="c muted">مش متاح عند أي مصدر — فرصة «مصدر منتج»</td></tr>` : ""}</tbody></table></div></div>
    <div class="card"><div class="hd"><h3>${ic("book", "ic sm")} سجل التعديلات</h3>${auditLink}</div>${auditRows(aud, "مفيش تعديلات على الـ SKU ده")}</div>`;
  const tools = `${s.active ? gbtn("catalog.edit", "أوقف الـ SKU", "sku-edit", { cls: "sm", icon: "power", data: { id: s.id, f: "active" } }) : gbtn("catalog.edit", "أعد التفعيل", "sku-edit", { cls: "sm", icon: "power", data: { id: s.id, f: "active" } })}`;
  return { title: `${esc(s.ar)} <span class="mono muted" style="font-size:13px">${esc(s.id)}</span>`, html, tools };
}
A.drawers["commerce-sku"] = (inst, d) => { const v = skuView(inst, d.id); return v ? TW.drawerWrap(v.title, `<div class="row"><button type="button" class="btn sm ghost" data-act="go" data-to="/admin/sku/${esc(d.id)}">${ic("eye", "ic xs")}افتح كصفحة كاملة</button></div>${v.html}`, v.tools) : ""; };
TW.page("sku", {
  render(inst, [id]) { const v = skuView(inst, id); if (!v) return `<div class="card">${TW.empty("الـ SKU مش موجود", id, "box")}</div>`; return `<div class="cc-top"><button type="button" class="btn sm" data-act="go" data-to="/admin/catalog">${ic("arrowR", "ic xs")}الكتالوج</button><h1>${v.title}</h1>${v.tools}</div>${v.html}`; },
  on: {},
});

/* ---------------- new canonical SKU from a merchant request ---------------- */
A.modals["commerce-newsku"] = (inst, m) => {
  const S = TW.S, cr = find(S.catReqs, m.reqId); if (!cr) return "";
  const dept = u(inst, "ns_dept", "grocery"), cats = D.cats[dept] || [];
  const ar = u(inst, "ns_ar", ""), bc = u(inst, "ns_barcode", "");
  const cands = dupCandidates(ar, bc, dept, 3), exact = cands.find((c) => c.exact);
  const dup = inst.ui.ns_dup && find(S.skus, inst.ui.ns_dup);
  const fld = (k, label, type = "text", ph = "", live = false) => `<label class="field"><span>${esc(label)}</span><input class="input" type="${type}" data-model="${k}"${live ? " data-live" : ""} value="${esc(u(inst, k, ""))}" placeholder="${esc(ph)}"${type === "number" ? ' min="0" step="0.5"' : ""}></label>`;
  const body = `<div class="banner">${ic("info", "ic sm")}<div>طلب <span class="mono">${esc(cr.id)}</span> من ${esc(A.merchant(cr.merchantId))}: «${esc(cr.name)}» ${cr.barcode ? `· باركود <span class="mono">${esc(cr.barcode)}</span>` : ""}. الاسم والقسم من قوائم محكومة — التاجر هيتبلغ ويتضاف المنتج لمحله بالسعر المرجعي.</div></div>
    ${dup ? `<div class="banner bad">${ic("alert", "ic sm")}<div class="grow"><b>اترفض الإنشاء — تكرار:</b> ${esc(dup.ar)} (${esc(dup.id)}) موجود بالفعل. الأصح ربط الطلب بيه.</div>${gbtn("catalog.approve", `اربط بـ ${dup.id}`, "req-link", { cls: "sm primary", icon: "link", data: { req: cr.id, sku: dup.id } })}</div>` : ""}
    <div class="cm-form">${fld("ns_ar", "الاسم العربي الموحّد *", "text", "علامة + منتج + مواصفة", true)}${fld("ns_en", "الاسم الإنجليزي", "text", "Brand Product Spec")}${fld("ns_brand", "العلامة التجارية", "text", "سامسونج")}
      <label class="field"><span>القسم *</span><select class="input" data-model="ns_dept" data-change="ns-dept">${D.depts.map((d) => opt(d.id, d.ar, dept)).join("")}</select></label>
      <label class="field"><span>الفئة *</span><select class="input" data-model="ns_cat">${cats.map(([c, a]) => opt(c, a, u(inst, "ns_cat", cats[0] && cats[0][0]))).join("")}</select></label>
      ${fld("ns_size", "الحجم / المواصفة *", "text", "25 وات")}${fld("ns_price", "السعر المرجعي (ج.م) *", "number", "0")}${fld("ns_barcode", "الباركود", "text", "8–14 رقم", true)}</div>
    <div><div class="lbl">${ic("search", "ic xs")} فحص التكرار المباشر</div>${cands.length ? `<div class="col gap4">${cands.map((c) => `<div class="cm-dup${c.exact ? " exact" : ""}"><span class="cm-score">${num(c.score)}%</span><span class="grow">${esc(c.s.ar)} <span class="muted">${esc(c.s.size)}</span><span class="sub mono">${esc(c.s.id)} · ${esc(c.why.join(" · "))}</span></span>${gbtn("catalog.approve", "اربط بدل الإنشاء", "req-link", { cls: "sm", icon: "link", data: { req: cr.id, sku: c.s.id } })}</div>`).join("")}</div>${exact ? `<p class="cm-note cm-neg">${ic("alert", "ic xs")} مطابق تماماً — الإنشاء هيترفض من النظام.</p>` : ""}` : `<p class="muted cm-note">${ic("check", "ic xs")} مفيش تشابه — الاسم ده جديد على الكتالوج.</p>`}</div>`;
  return TW.modalWrap(`إنشاء SKU معتمد من طلب تاجر`, body, `<button type="button" class="btn primary" data-act="ns-submit">${ic("check", "ic sm")}أنشئ واعتمد</button><button type="button" class="btn" data-act="modal-close">إلغاء</button>`, { wide: true });
};

/* ===================================================================== CATEGORIES ===================== */
function catRows(SK) {
  const S = TW.S, t = now();
  const today = S.orders.filter((o) => o.status !== "CANCELLED" && sameDay(o.createdAt, t));
  return S.hist.catGmv.map((h) => {
    const d = h.dept, skus = S.skus.filter((s) => s.dept === d);
    const hubSkus = skus.filter((s) => s.active && S.inv.h1[s.id]);
    const avail = (s) => { const iv = S.inv.h1[s.id]; return iv.onHand - iv.reserved; };
    const oos = hubSkus.filter((s) => avail(s) <= 0), low = hubSkus.filter((s) => avail(s) > 0 && avail(s) <= S.inv.h1[s.id].reorderPt);
    const merchants = S.merchants.filter((m) => m.status === "active" && (d === "food" ? !!S.menus[m.id] : Object.keys(S.msku[m.id] || {}).some((id) => (SK.get(id) || {}).dept === d)));
    const ratios = []; merchants.forEach((m) => Object.entries(S.msku[m.id] || {}).forEach(([id, x]) => { const s = SK.get(id); if (s && s.dept === d) ratios.push(x.price / s.refPrice); }));
    const liveGmv = sum(today, (o) => sum(o.lines.filter((l) => l.dept === d && l.state !== "removed"), (l) => l.unitPrice * l.qty));
    const nores = S.demand.noResult.filter((n) => n.dept === d);
    const zones = S.zones.filter((z) => z.active).map((z) => ({ z, n: merchants.filter((m) => TW.merchantServes(m, z.id)).length + (hubSkus.length ? 1 : 0) }));
    return { h, d, ar: deptAr(d), skus, hubSkus, oos, low, merchants, priceIdx: ratios.length ? median(ratios) : h.priceIdx, liveGmv, nores, zones, availability: hubSkus.length ? 1 - oos.length / hubSkus.length : null };
  });
}
TW.page("categories", {
  render(inst) {
    const S = TW.S, SK = skuMap(), rows = catRows(SK);
    const selId = u(inst, "cg_sel", rows.slice().sort((a, b) => b.h.gmv - a.h.gmv)[0].d), r = rows.find((x) => x.d === selId) || rows[0];
    const sort = u(inst, "cg_sort", "gmv");
    const SORT = { gmv: (a, b) => b.h.gmv - a.h.gmv, margin: (a, b) => b.h.margin - a.h.margin, oos: (a, b) => b.oos.length - a.oos.length, search: (a, b) => sum(b.nores, (n) => n.n) - sum(a.nores, (n) => n.n) };
    const sorted = rows.slice().sort(SORT[sort] || SORT.gmv);
    const totG = sum(rows, (x) => x.h.gmv);
    const top = r.hubSkus.map((s) => ({ s, iv: S.inv.h1[s.id] })).sort((a, b) => b.iv.velocity * b.s.price - a.iv.velocity * a.s.price).slice(0, 6);
    const can = (p) => TW.can(p);
    return `${A.head("إدارة الأقسام", "Category management · المبيعات، الهامش، الإتاحة، الطلب غير الملبّى والتغطية لكل قسم — مع إجراءات مباشرة")}
      <div class="grid g4">${kpi("GMV الأقسام (30 يوم)", TW.kmoney(totG), `${num(rows.length)} قسم`)}${kpi("هامش مرجّح", pct(sum(rows, (x) => x.h.gmv * x.h.margin) / totG, 1), "صافي بعد تكلفة البضاعة/العمولة")}${kpi("أصناف نافدة في الهب", num(sum(rows, (x) => x.oos.length)), `${num(sum(rows, (x) => x.low.length))} تحت حد إعادة الطلب`, { tone: sum(rows, (x) => x.oos.length) ? "bad" : "ok" })}${kpi("بحث بدون نتيجة", num(sum(S.demand.noResult, (n) => n.n)), `${num(S.demand.noResult.length)} كلمة · ${num(S.demand.searches)} بحث`, { tone: "warn" })}</div>
      <div class="card"><div class="hd"><h3>${ic("grid", "ic sm")} لوحة الأقسام</h3><span class="cm-hdsel">${sel("cg_sort", sort, [["gmv", "حسب المبيعات"], ["margin", "حسب الهامش"], ["oos", "حسب النفاد"], ["search", "حسب الطلب غير الملبّى"]], "الترتيب")}</span></div>
        <div class="tw"><table class="tbl"><thead><tr><th>القسم</th><th class="n">GMV 30 يوم</th><th class="n">النهارده</th><th class="n">الهامش</th><th class="n">نسبة التلبية</th><th class="n">الإتاحة</th><th class="n">نافد</th><th class="n">البدائل</th><th class="n">مؤشر السعر</th><th class="n">التجار</th><th class="n">دوران</th><th class="n">هالك</th><th class="n">بحث بلا نتيجة</th></tr></thead><tbody>
        ${sorted.map((x) => `<tr class="click${x.d === r.d ? " cm-selrow" : ""}" data-act="ui" data-k="cg_sel" data-v="${x.d}" tabindex="0"><td><b>${esc(x.ar)}</b></td><td class="n num">${TW.kmoney(x.h.gmv)}</td><td class="n num">${money(x.liveGmv)}</td><td class="n num">${pct(x.h.margin, 1)}</td><td class="n num ${x.h.fill < 0.93 ? "cm-warn" : ""}">${pct(x.h.fill, 1)}</td><td class="n num ${x.availability != null && x.availability < 0.95 ? "cm-neg" : ""}">${x.availability == null ? "—" : pct(x.availability)}</td><td class="n num ${x.oos.length ? "cm-neg" : ""}">${num(x.oos.length)}</td><td class="n num">${pct(x.h.subRate, 1)}</td><td class="n num ${x.priceIdx > 1.05 ? "cm-neg" : ""}">${num(x.priceIdx * 100, 0)}</td><td class="n num">${num(x.merchants.length)}</td><td class="n num">${num(x.h.turns, 1)}×</td><td class="n num">${pct(x.h.waste, 1)}</td><td class="n num">${num(sum(x.nores, (n) => n.n))}</td></tr>`).join("")}</tbody></table></div></div>
      <div class="card"><div class="hd"><h3>${ic(D.depts.find((d) => d.id === r.d).icon, "ic sm")} ${esc(r.ar)} <span class="muted" style="font-weight:600;font-size:13px">— ${num(r.skus.length)} SKU · ${num(r.merchants.length)} تاجر · ${r.hubSkus.length ? `${num(r.hubSkus.length)} في الهب` : "غير مخزّن في الهب"}</span></h3></div>
        <div class="row wrap">${gbtn(["catalog.edit", "catalog.approve", "analytics.view"], "أضف تاجر", "cg-lead", { cls: "sm", icon: "store", data: { d: r.d } })}${TW.btn("مصدر منتج", "go", { cls: "sm", icon: "cart", data: { to: "/admin/purchasing" } })}${TW.btn("عدّل التشكيلة", "cg-assort", { cls: "sm", icon: "layers", data: { d: r.d } })}${TW.btn("أطلق عرض", "cg-promo", { cls: "sm", icon: "percent", data: { d: r.d } })}${r.hubSkus.length ? gbtn(["catalog.edit", "po.approve", "inventory.adjust"], "زوّد مخزون الهب", "cg-po", { cls: "sm", icon: "building", data: { d: r.d } }) : ""}${gbtn("catalog.edit", "أوقف SKU", "cg-retire", { cls: "sm", icon: "power", data: { d: r.d } })}</div>
        <div class="grid g4" style="margin-top:12px">${kpi("GMV 30 يوم", TW.kmoney(r.h.gmv), `${pct(r.h.gmv / totG, 1)} من الإجمالي`)}${kpi("الهامش", pct(r.h.margin, 1), `دوران ${num(r.h.turns, 1)}× · هالك ${pct(r.h.waste, 1)}`)}${kpi("الإتاحة في الهب", r.availability == null ? "—" : pct(r.availability), `${num(r.oos.length)} نافد · ${num(r.low.length)} منخفض`, { tone: r.oos.length ? "bad" : "ok" })}${kpi("مؤشر السعر", num(r.priceIdx * 100, 0), "وسيط أسعار التجار ÷ المرجعي × 100", { tone: r.priceIdx > 1.05 ? "warn" : "ok" })}</div>
        <div class="grid g3" style="margin-top:12px">
          <div><div class="lbl">أعلى الأصناف (سرعة البيع × السعر)</div>${top.length ? `<div class="tw"><table class="tbl"><thead><tr><th>الصنف</th><th class="n">/يوم</th><th class="n">متاح</th><th class="n">يكفي</th></tr></thead><tbody>${top.map(({ s, iv }) => `<tr class="click" data-act="sku-open" data-id="${esc(s.id)}" tabindex="0"><td>${esc(s.ar)}<span class="sub">${esc(s.size)}</span></td><td class="n num">${num(iv.velocity, 1)}</td><td class="n num ${iv.onHand - iv.reserved <= 0 ? "cm-neg" : ""}">${num(iv.onHand - iv.reserved)}</td><td class="n num">${num(Math.max(0, iv.onHand - iv.reserved) / Math.max(0.1, iv.velocity), 1)} يوم</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted cm-note">القسم ده عن طريق التجار فقط.</p>`}</div>
          <div><div class="lbl">طلب البحث و«مفيش نتيجة»</div><p class="cm-note">${num(r.h.search)} بحث/أسبوع على القسم</p>${r.nores.length ? hbars(r.nores.map((n) => ({ label: n.q, value: n.n, tone: n.resolvedBy ? "ok" : "warn", sub: n.resolvedBy ? `اتحل ← ${n.resolvedBy}` : "" }))) : `<p class="muted cm-note">مفيش كلمات بدون نتيجة.</p>`}
            ${r.oos.length ? `<div class="lbl" style="margin-top:8px">نافد في الهب (المتاح = الرصيد − المحجوز ≤ 0)</div><div class="cm-chips">${r.oos.map((s) => `<button type="button" class="chip t-bad cm-cb" data-act="sku-open" data-id="${esc(s.id)}">${esc(s.ar)}</button>`).join("")}</div>` : ""}</div>
          <div><div class="lbl">تغطية المصادر حسب المنطقة</div><div class="cm-cov">${r.zones.map(({ z, n }) => `<div class="${n <= 1 ? "gap" : ""}"><span>${esc(z.ar)}</span><b class="num">${num(n)}</b></div>`).join("")}</div><p class="cm-note muted">عدد المصادر (هب + تجار) اللي تقدر تخدم المنطقة. الأحمر = فجوة → «أضف تاجر».</p></div>
        </div></div>
      <div class="card"><h3>${ic("bars", "ic sm")} مساهمة الأقسام في المبيعات</h3>${hbars(rows.slice().sort((a, b) => b.h.gmv - a.h.gmv).slice(0, 10).map((x) => ({ label: x.ar, value: x.h.gmv, sub: `هامش ${pct(x.h.margin)}`, tone: x.d === r.d ? "accent" : "brand" })), { fmt: (v) => TW.kmoney(v) })}</div>`;
  },
  on: {},
});
A.modals["commerce-po"] = (inst, m) => {
  const S = TW.S, lines = (m.lines || []);
  const tot = sum(lines, (l) => Number(u(inst, `po_${l.id}`, l.qty)) * l.cost);
  return TW.modalWrap(`زيادة مخزون الهب — ${esc(deptAr(m.dept))}`, `<div class="banner">${ic("info", "ic sm")}<div>الكمية المقترحة = (سرعة البيع × 7 أيام + حد إعادة الطلب) − (المتاح + الوارد). أمر الشراء بيروح لموافقة المالية قبل ما يتحول للمورد.</div></div>
    <div class="tw"><table class="tbl"><thead><tr><th>الصنف</th><th class="n">متاح</th><th class="n">وارد</th><th class="n">/يوم</th><th class="n">الكمية</th><th class="n">التكلفة</th></tr></thead><tbody>${lines.map((l) => `<tr><td>${esc(l.ar)}</td><td class="n num">${num(l.avail)}</td><td class="n num">${num(l.incoming)}</td><td class="n num">${num(l.vel, 1)}</td><td class="n"><input class="input cm-qty" type="number" min="0" data-model="po_${l.id}" data-live value="${esc(u(inst, `po_${l.id}`, l.qty))}" aria-label="كمية ${esc(l.ar)}"></td><td class="n num">${money(Number(u(inst, `po_${l.id}`, l.qty)) * l.cost)}</td></tr>`).join("")}</tbody></table></div>
    <label class="field"><span>المورد</span><select class="input" data-model="po_sup">${["مورد معتمد — دمنهور", "موزع جهينة — دمنهور", "شركة الضحى للأغذية", "تاجر جملة — أبو المطامير"].map((x) => opt(x, x, u(inst, "po_sup", "مورد معتمد — دمنهور"))).join("")}</select></label>
    <div class="row between card flat"><span>إجمالي أمر الشراء</span><b class="num">${money(tot)}</b></div>`, `<button type="button" class="btn primary" data-act="po-submit" ${tot > 0 ? "" : "disabled"}>${ic("cart", "ic sm")}ابعت أمر الشراء للموافقة</button><button type="button" class="btn" data-act="modal-close">إلغاء</button>`, { wide: true });
};

/* ===================================================================== PRICING ===================== */
function pricePairs(SK) {
  const S = TW.S, tol = S.rules.priceTolerance / 100, t = now();
  const bySku = {};
  S.merchants.forEach((m) => { if (m.status !== "active") return; Object.entries(S.msku[m.id] || {}).forEach(([id, x]) => { (bySku[id] = bySku[id] || []).push({ m, x }); }); });
  const promoM = new Set(S.promos.filter((p) => p.status === "active" && p.scope.startsWith("merchant:") && p.funding !== "twaa").map((p) => p.scope.split(":")[1]));
  const pendAp = S.approvals.filter((a) => a.type === "price" && a.status === "PENDING");
  const rows = [];
  Object.entries(bySku).forEach(([id, offs]) => {
    const s = SK.get(id); if (!s) return;
    offs.forEach(({ m, x }) => {
      const others = offs.filter((o) => o.m.id !== m.id).map((o) => o.x.price); if (s.hub && S.inv.h1[s.id]) others.push(s.price);
      const med = median(others);
      const dRef = x.price / s.refPrice - 1, dMed = med ? x.price / med - 1 : null;
      const flags = [];
      if (Math.abs(dRef) > tol || (x.pendingPrice && Math.abs(x.pendingPrice / s.refPrice - 1) > tol)) flags.push("abnormal");
      if (dMed != null && dMed > 0.2) flags.push("median");
      const ap = pendAp.find((a) => a.ref.merchantId === m.id && a.ref.skuId === id);
      const jump = S.audit.find((a) => a.action === "تعديل سعر" && a.obj === `${s.ar} @ ${m.ar}` && t - a.at < DAY && Number(a.nw) > Number(a.old) * 1.15);
      if (ap || jump) flags.push("sudden");
      if (promoM.has(m.id) && dRef > 0.06) flags.push("promo");
      rows.push({ s, m, x, med, dRef, dMed, flags, ap });
    });
  });
  return { rows, bySku };
}
const PFLAG = { abnormal: ["سعر غير طبيعي", "bad"], median: ["أعلى بكثير من وسيط السوق", "warn"], sudden: ["زيادة مفاجئة", "bad"], promo: ["اشتباه تلاعب بالعرض", "accent"] };
TW.page("pricing", {
  render(inst) {
    const S = TW.S, SK = skuMap(), tol = S.rules.priceTolerance;
    const { rows, bySku } = pricePairs(SK);
    const view = u(inst, "pr_view", "pairs"), flag = u(inst, "pr_flag", "flagged"), dept = u(inst, "pr_dept", "all"), mer = u(inst, "pr_m", "all"), q = u(inst, "pr_q", "");
    const nq = norm(q);
    const flagged = rows.filter((r) => r.flags.length);
    const pend = S.approvals.filter((a) => a.type === "price" && a.status === "PENDING");
    const risky = Object.values(TW.groupBy(flagged, (r) => r.m.id)).filter((g) => g.length >= 2).map((g) => ({ m: g[0].m, n: g.length }));
    const list = rows.filter((r) => (flag === "all" || (flag === "flagged" ? r.flags.length : r.flags.includes(flag))) && (dept === "all" || r.s.dept === dept) && (mer === "all" || r.m.id === mer) && (!nq || norm(`${r.s.ar} ${r.s.id} ${r.m.ar}`).includes(nq))).sort((a, b) => b.flags.length - a.flags.length || Math.abs(b.dRef) - Math.abs(a.dRef));
    const shown = inst.ui.pr_all ? list : list.slice(0, 60);
    const skuRows = Object.entries(bySku).map(([id, offs]) => ({ s: SK.get(id), ps: offs.map((o) => o.x.price), n: rows.filter((r) => r.s.id === id && r.flags.length).length })).filter((x) => x.s && (dept === "all" || x.s.dept === dept) && (!nq || norm(`${x.s.ar} ${x.s.id}`).includes(nq)) && (flag === "all" || x.n)).sort((a, b) => b.n - a.n || b.ps.length - a.ps.length);
    const pa = TW.S.audit.filter((a) => /سعر|refPrice|price|priceTolerance/.test(`${a.action} ${a.obj}`)).slice(0, 15);
    return `${A.head("التسعير", "Pricing controls · سعر مرجعي، سماحية، وسيط السوق المحلي، وكشف الأسعار الشاذة. لا تعديل صامت — كل تغيير بسبب وفي التدقيق.")}
      ${A.answer({ what: `${num(rows.length)} سعر تاجر على ${num(Object.keys(bySku).length)} SKU`, attention: `${num(flagged.length)} سعر عليه علامة · ${num(pend.length)} بانتظار مراجعة`, owner: "مدير الأقسام (اعتماد) · المالية (القاعدة)", risk: `${num(risky.length)} تاجر بنمط متكرر → علامة خطر` })}
      <div class="grid g3">
        <div class="card"><div class="hd"><h3>${ic("scale", "ic sm")} قاعدة السماحية</h3>${A.permBtn("rules.edit", "عدّل", "pr-tol", { cls: "sm", icon: "edit" })}</div><div class="cm-big num">±${num(tol)}%</div><p class="cm-note">سماحية سعر التاجر عن السعر المرجعي (Guardrail G). داخل السماحية ← فوري. خارجها ← مراجعة. نمط متكرر ← علامة خطر على التاجر.</p></div>
        <div class="card"><h3>${ic("flag", "ic sm")} علامات الأسعار</h3><div class="col gap4">${Object.entries(PFLAG).map(([k, [l, t]]) => `<div class="row between"><span class="row gap4">${chip(l, t)}</span><button type="button" class="btn sm ghost" data-act="ui" data-k="pr_flag" data-v="${k}"><b class="num">${num(rows.filter((r) => r.flags.includes(k)).length)}</b></button></div>`).join("")}</div></div>
        <div class="card"><h3>${ic("alert", "ic sm")} تجار بنمط متكرر</h3>${risky.length ? `<div class="list">${risky.map(({ m, n }) => `<div class="li"><button type="button" class="btn sm ghost cm-lnk grow" data-act="open-merchant" data-id="${esc(m.id)}">${esc(m.ar)}</button>${chip(`${n} أسعار شاذة`, "bad")}${hChip(m.health)}</div>`).join("")}</div>` : `<p class="muted cm-note">${ic("check", "ic xs")} مفيش نمط متكرر عند أي تاجر.</p>`}</div>
      </div>
      <div class="card"><div class="hd"><h3>${ic("inbox", "ic sm")} أسعار بانتظار الموافقة</h3><span class="muted">${num(pend.length)}</span></div>
        ${pend.length ? `<div class="tw"><table class="tbl"><thead><tr><th>الطلب</th><th>التاجر / الصنف</th><th class="n">المقترح</th><th class="n">المرجعي</th><th class="n">وسيط السوق</th><th>الدليل</th><th>الأثر</th><th></th></tr></thead><tbody>${pend.map((a) => { const s = SK.get(a.ref.skuId), m = find(S.merchants, a.ref.merchantId), x = (S.msku[a.ref.merchantId] || {})[a.ref.skuId] || {}, r = rows.find((y) => y.s.id === a.ref.skuId && y.m.id === a.ref.merchantId); const prop = x.pendingPrice || x.price; return `<tr><td class="mono">${esc(a.id)}<span class="sub">${esc(ago(a.createdAt))}</span></td><td>${m ? `<button type="button" class="btn sm ghost cm-lnk" data-act="open-merchant" data-id="${esc(m.id)}">${esc(m.ar)}</button>` : ""}<span class="sub">${s ? `<button type="button" class="btn sm ghost cm-lnk" data-act="sku-open" data-id="${esc(s.id)}">${esc(s.ar)}</button>` : ""}</span></td><td class="n num"><b>${money(prop)}</b></td><td class="n num">${s ? money(s.refPrice) : "—"}</td><td class="n num">${r && r.med ? money(r.med) : "—"}</td><td>${esc(a.evidence)}</td><td>${esc(a.impact)}</td><td>${TW.canApprove(a) ? `<span class="row gap4">${TW.btn("اعتمد", "approve", { cls: "sm primary", data: { id: a.id } })}${TW.btn("ارفض", "reject", { cls: "sm", data: { id: a.id } })}</span>` : `<button class="btn sm" disabled title="يحتاج صلاحية ${esc(D.perms["catalog.approve"])}">${ic("lock", "ic sm")}<span>اعتماد</span></button>`}</td></tr>`; }).join("")}</tbody></table></div>` : `<p class="muted">${ic("check", "ic xs")} مفيش أسعار معلّقة.</p>`}</div>
      <div class="filters"><div class="seg" role="tablist">${[["pairs", "تاجر × صنف"], ["skus", "حسب الصنف"]].map(([k, l]) => `<button type="button" class="${view === k ? "on" : ""}" data-act="ui" data-k="pr_view" data-v="${k}">${l}</button>`).join("")}</div>
        ${qbox("pr_q", q, "صنف أو تاجر")}
        ${sel("pr_flag", flag, [["flagged", "عليها علامة فقط"], ["all", "كل الأسعار"], ...Object.entries(PFLAG).map(([k, [l]]) => [k, l])], "العلامة")}
        ${sel("pr_dept", dept, [["all", "كل الأقسام"], ...D.depts.filter((d) => d.id !== "food").map((d) => [d.id, d.ar])], "القسم")}
        ${view === "pairs" ? sel("pr_m", mer, [["all", "كل التجار"], ...S.merchants.filter((m) => m.status === "active" && !S.menus[m.id]).map((m) => [m.id, m.ar])], "التاجر") : ""}</div>
      ${view === "pairs" ? `<div class="card" style="padding:0"><div class="tw"><table class="tbl"><thead><tr><th>الصنف</th><th>التاجر</th><th class="n">سعر التاجر</th><th class="n">المرجعي</th><th class="n">وسيط محلي</th><th class="n">مقابل المرجعي</th><th class="n">مقابل الوسيط</th><th>العلامات</th><th></th></tr></thead><tbody>
        ${shown.map((r) => `<tr><td><button type="button" class="btn sm ghost cm-lnk" data-act="sku-open" data-id="${esc(r.s.id)}">${esc(r.s.ar)}</button><span class="sub">${esc(r.s.size)} · <span class="mono">${esc(r.s.id)}</span></span></td><td><button type="button" class="btn sm ghost cm-lnk" data-act="open-merchant" data-id="${esc(r.m.id)}">${esc(r.m.ar)}</button></td><td class="n num"><b>${money(r.x.price)}</b>${r.x.pendingPrice ? `<span class="sub">مقترح ${money(r.x.pendingPrice)}</span>` : ""}</td><td class="n num">${money(r.s.refPrice)}</td><td class="n num">${r.med ? money(r.med) : "—"}</td><td class="n">${dlt(r.dRef)}</td><td class="n">${r.dMed == null ? "—" : dlt(r.dMed)}</td><td><div class="cm-chips">${r.flags.map((f) => chip(PFLAG[f][0], PFLAG[f][1])).join("") || chip("سليم", "ok")}</div></td><td>${edBtn("price.override", "sku-edit", { id: r.s.id, f: "refPrice" }, "تعديل السعر المرجعي")}</td></tr>`).join("") || `<tr><td colspan="9" class="c muted">${ic("check", "ic xs")} مفيش أسعار بالفلاتر دي</td></tr>`}</tbody></table></div></div>
        ${list.length > 60 ? `<div class="row"><button type="button" class="btn sm" data-act="ui-toggle" data-k="pr_all">${inst.ui.pr_all ? "اعرض أول 60" : `اعرض كل ${num(list.length)}`}</button></div>` : ""}`
      : `<div class="card" style="padding:0"><div class="tw"><table class="tbl"><thead><tr><th>الصنف</th><th class="n">المرجعي</th><th class="n">سعر الهب</th><th class="n">أقل تاجر</th><th class="n">وسيط التجار</th><th class="n">أعلى تاجر</th><th class="n">عدد التجار</th><th class="n">المؤشر</th><th>علامات</th><th></th></tr></thead><tbody>
        ${skuRows.slice(0, inst.ui.pr_all ? 999 : 60).map((x) => { const md = median(x.ps); return `<tr class="click" data-act="sku-open" data-id="${esc(x.s.id)}" tabindex="0"><td>${esc(x.s.ar)}<span class="sub">${esc(x.s.size)}</span></td><td class="n num">${money(x.s.refPrice)}</td><td class="n num">${x.s.hub ? money(x.s.price) : "—"}</td><td class="n num">${money(Math.min(...x.ps))}</td><td class="n num">${money(md)}</td><td class="n num">${money(Math.max(...x.ps))}</td><td class="n num">${num(x.ps.length)}</td><td class="n num ${md / x.s.refPrice > 1 + tol / 100 ? "cm-neg" : ""}">${num((md / x.s.refPrice) * 100)}</td><td>${x.n ? chip(`${x.n} علامة`, "bad") : chip("سليم", "ok")}</td><td>${edBtn("price.override", "sku-edit", { id: x.s.id, f: "refPrice" }, "تعديل السعر المرجعي")}</td></tr>`; }).join("") || `<tr><td colspan="10" class="c muted">مفيش أصناف بالفلاتر دي</td></tr>`}</tbody></table></div></div>`}
      <div class="card"><div class="hd"><h3>${ic("book", "ic sm")} سجل تغييرات الأسعار</h3>${auditLink}</div>${auditRows(pa, "مفيش تغييرات أسعار مسجلة")}</div>`;
  },
  on: {},
});

/* ===================================================================== PROMOTIONS ===================== */
/* every builder "kind" maps to a checkout mechanic the store's evalPromo understands (percent | fixed | freedelivery) */
const KINDS = {
  percent: { ar: "خصم نسبة %", mech: "percent" }, fixed: { ar: "خصم مبلغ ثابت", mech: "fixed" }, freedelivery: { ar: "توصيل مجاني", mech: "freedelivery" },
  bundle: { ar: "باقة بسعر مجمّع", mech: "fixed", goal: "basket increase" }, bxgy: { ar: "اشتري X وخد Y", mech: "percent", goal: "basket increase" },
  category: { ar: "عرض على قسم", mech: "percent", scope: "dept:cleaning", goal: "category adoption" }, merchant: { ar: "عرض على تاجر", mech: "percent", scope: "merchant:m1", funding: "merchant", goal: "merchant launch" },
  first: { ar: "أول طلب", mech: "percent", segment: "sg-new", goal: "first order", limit: 1 }, second: { ar: "الطلب التاني", mech: "fixed", segment: "sg-act", goal: "second order", limit: 1 },
  minbasket: { ar: "حد أدنى للسلة", mech: "fixed", min: 250, goal: "basket increase" }, zone: { ar: "منطقة محددة", mech: "freedelivery", goal: "zone launch", zones: "shokaf,zawya,tayreya" },
  time: { ar: "نافذة وقت (ساعات هادية)", mech: "percent", goal: "basket increase" }, segment: { ar: "شريحة عملاء", mech: "percent", segment: "sg-lapsed", goal: "winback" },
};
const GOALS = { "first order": "أول طلب", "second order": "الطلب التاني", winback: "استرجاع متوقفين", "basket increase": "زيادة السلة", "category adoption": "تجربة قسم", "merchant launch": "إطلاق تاجر", "zone launch": "إطلاق منطقة", acquisition: "استقطاب" };
const FUND = { twaa: ["توّا", "brand"], merchant: ["التاجر", "info"], shared: ["مشترك", "accent"] };
const PSTATUS = { active: ["مفعّل", "ok"], paused: ["متوقف مؤقتاً", "neutral"], pending_approval: ["بانتظار الموافقة", "warn"], rejected: ["مرفوض", "bad"], ended: ["انتهى", "neutral"], draft: ["مسودة", "neutral"] };
const WINDOWS = ["10:00 – 13:00 (ساعات هادية)", "15:00 – 17:00", "22:00 – 00:00"];
const scopeAr = (sc) => (!sc || sc === "all" ? "كل المنتجات" : sc.startsWith("dept:") ? `قسم ${deptAr(sc.slice(5))}` : sc.startsWith("merchant:") ? `تاجر: ${A.merchant(sc.slice(9))}` : sc === "zones" ? "مناطق محددة" : sc);
const zonesAr = (z) => (!z || z === "all" ? "كل المناطق" : z.split(",").map(zoneAr).join("، "));
function pbDraft(inst) {
  const kind = u(inst, "pb_kind", "percent"), K = KINDS[kind] || KINDS.percent;
  const x = Math.max(1, +u(inst, "pb_x", 2) || 1), y = Math.max(1, +u(inst, "pb_y", 1) || 1);
  const funding = u(inst, "pb_funding", K.funding || "shared");
  const share = funding === "shared" ? (+u(inst, "pb_share", 50) || 50) / 100 : funding === "twaa" ? 1 : 0;
  return {
    kind, K, name: u(inst, "pb_name", ""), code: u(inst, "pb_code", ""), type: K.mech,
    value: kind === "bxgy" ? Math.round((y / (x + y)) * 100) : K.mech === "freedelivery" ? 0 : +u(inst, "pb_value", K.mech === "fixed" ? 10 : 10) || 0,
    cap: K.mech === "percent" ? +u(inst, "pb_cap", 12) || 0 : 0, minBasket: +u(inst, "pb_min", K.min || 150) || 0, scope: u(inst, "pb_scope", K.scope || "all"),
    funding, share, budget: +u(inst, "pb_budget", 10000) || 0, limit: +u(inst, "pb_limit", K.limit || 2) || 1, segment: u(inst, "pb_segment", K.segment || "all"),
    zones: u(inst, "pb_zones", K.zones || "all"), days: +u(inst, "pb_days", 14) || 7, goal: u(inst, "pb_goal", K.goal || "basket increase"), window: kind === "time" ? u(inst, "pb_window", WINDOWS[0]) : null, x, y,
  };
}
function pbPreview(d) {
  const S = TW.S, imp = TW.promoImpact({ type: d.type, value: d.value, cap: d.cap || null, minBasket: d.minBasket, funding: d.funding, share: d.share, goal: d.goal });
  const seg = d.segment !== "all" ? find(S.segments, d.segment) : null;
  const audience = seg ? seg.size : TW.kpis().activeCust;
  const redemptions = imp.disc > 0 ? Math.floor(d.budget / imp.disc) : 0;
  const reach = Math.min(audience * d.limit, redemptions);
  return { imp, audience, redemptions, reach, totalInc: imp.incremental * reach, totalTwaa: imp.twaaCost * reach, totalMerchant: (imp.disc - imp.twaaCost) * reach, needsApproval: imp.belowGuard || d.budget > 30000 };
}
TW.page("promotions", {
  render(inst) {
    const S = TW.S, R = S.rules, d = pbDraft(inst), pv = pbPreview(d), imp = pv.imp;
    const fs = u(inst, "pm_st", "all"), ff = u(inst, "pm_fund", "all");
    const list = S.promos.filter((p) => (fs === "all" || p.status === fs) && (ff === "all" || p.funding === ff));
    const act = S.promos.filter((p) => p.status === "active");
    const pend = S.promos.filter((p) => p.status === "pending_approval");
    const twaaSpent = sum(S.promos, (p) => p.spent * (p.funding === "twaa" ? 1 : p.funding === "merchant" ? 0 : p.share ?? 0.5));
    const incTot = sum(S.promos, (p) => (p.incContribution || 0) * p.redemptions);
    const rows = list.map((p) => {
      const pi = TW.promoImpact(p), ap = S.approvals.find((a) => a.type === "promo" && a.ref.id === p.id && a.status === "PENDING");
      const ctl = p.status === "active" || p.status === "paused" ? gbtn("promo.create", p.status === "active" ? "إيقاف" : "تفعيل", "promo-toggle", { cls: "sm", icon: p.status === "active" ? "pause" : "play", data: { id: p.id } }) : p.status === "pending_approval" && ap ? (TW.canApprove(ap) ? `<span class="row gap4">${TW.btn("اعتمد", "approve", { cls: "sm primary", data: { id: ap.id } })}${TW.btn("ارفض", "reject", { cls: "sm", data: { id: ap.id } })}</span>` : `<button type="button" class="btn sm ghost" data-act="goto-approvals" title="الاعتماد للمدير العام">${ic("lock", "ic xs")}${esc(ap.id)}</button>`) : `<span class="muted">—</span>`;
      return `<tr class="${p.id === inst.ui.pm_last ? "cm-selrow" : ""}"><td><b>${esc(p.name)}</b><span class="sub">${p.code ? `<span class="mono">${esc(p.code)}</span> · ` : ""}${esc(GOALS[p.goal] || p.goal || "")}</span></td><td>${esc((KINDS[p.kind] || KINDS[p.type] || { ar: p.type }).ar)}<span class="sub">${p.type === "percent" ? `${num(p.value)}%${p.cap ? ` حتى ${money(p.cap)}` : ""}` : p.type === "fixed" ? money(p.value) : "رسوم التوصيل"}${p.minBasket ? ` · فوق ${money(p.minBasket)}` : ""}</span></td>
        <td>${esc(scopeAr(p.scope))}<span class="sub">${esc(segAr(p.segment))} · ${esc(zonesAr(p.zones))}</span></td><td>${chip(FUND[p.funding][0] + (p.funding === "shared" ? ` ${pct(p.share ?? 0.5)}` : ""), FUND[p.funding][1])}</td>
        <td style="min-width:150px"><span class="row between num" style="font-size:12px"><span>${money(p.spent)}</span><span class="muted">${money(p.budget)}</span></span>${meter(p.spent, p.budget || 1)}</td><td class="n num">${num(p.redemptions)}</td>
        <td class="n">${cmv(pi.cmPerOrder)}${pi.belowGuard ? `<span class="sub cm-neg">تحت الحد ${money(R.minContribution)}</span>` : ""}</td><td class="n">${cmv(p.incContribution || 0)}<span class="sub">إجمالي ${money((p.incContribution || 0) * p.redemptions)}</span></td>
        <td>${chip(PSTATUS[p.status][0], PSTATUS[p.status][1])}</td><td>${ctl}</td></tr>`;
    }).join("");
    const kindOpts = Object.entries(KINDS).map(([k, v]) => [k, v.ar]);
    const scopeOpts = [["all", "كل المنتجات"], ...D.depts.filter((x) => x.id !== "deals").map((x) => [`dept:${x.id}`, `قسم: ${x.ar}`]), ...S.merchants.filter((m) => m.status === "active").map((m) => [`merchant:${m.id}`, `تاجر: ${m.ar}`])];
    const zs = d.zones === "all" ? [] : d.zones.split(",");
    const f = (k, label, cur, type = "number", extra = "") => `<label class="field"><span>${esc(label)}</span><input class="input" type="${type}" data-model="${k}" data-live value="${esc(cur)}"${type === "number" ? ' min="0"' : ""}${extra}></label>`;
    const row = (l, v, cls = "") => `<div class="cm-pvrow ${cls}"><span>${l}</span><b class="num">${v}</b></div>`;
    return `${A.head("محرك العروض", "Promotions engine · كل عرض له جهة تمويل وميزانية وحد للعميل — والمعروض دايماً هو المساهمة الإضافية المتوقعة مش GMV بس")}
      ${A.answer({ what: `${num(act.length)} عرض مفعّل · ${num(sum(act, (p) => p.redemptions))} استخدام`, attention: `${num(pend.length)} عرض بانتظار الموافقة · ${num(S.promos.filter((p) => p.budget && p.spent / p.budget >= 0.8 && p.status === "active").length)} قرب يخلص ميزانيته`, owner: "التسويق (إنشاء) · المدير العام (اعتماد تحت الحد)", risk: `تكلفة على توّا حتى الآن ${money(twaaSpent)}` })}
      <div class="grid g4">${kpi("ميزانية العروض النشطة", money(sum(act, (p) => p.budget)), `صرف ${money(sum(act, (p) => p.spent))}`)}${kpi("تكلفة ممولة من توّا", money(twaaSpent), "Guardrail C: مين بيدفع")}${kpi("المساهمة الإضافية المتوقعة", cmv(incTot, 0), "Expected Incremental Contribution × الاستخدام", { tone: incTot < 0 ? "bad" : "ok" })}${kpi("حد المساهمة/طلب", money(R.minContribution), "Guardrail A — تحت الحد = موافقة")}</div>
      <div class="card" data-hl="promo-builder"><div class="hd"><h3>${ic("sparkle", "ic sm")} منشئ العروض</h3><button type="button" class="btn sm ghost" data-act="pb-reset">${ic("refresh", "ic xs")}ابدأ من جديد</button></div>
        <div class="cm-pb"><div class="col gap12">
          <div class="cm-form">${f("pb_name", "اسم العرض *", d.name, "text", ' placeholder="مثال: رجّعنا تاني — 25%"')}${f("pb_code", "الكود (اختياري)", d.code, "text", ' placeholder="BACK25" dir="ltr"')}
            <label class="field"><span>نوع العرض</span><select class="input" data-model="pb_kind" data-change="pb-kind">${kindOpts.map(([v, l]) => opt(v, l, d.kind)).join("")}</select></label>
            ${d.kind === "bxgy" ? `${f("pb_x", "اشتري (X)", d.x)}${f("pb_y", "وخد مجاناً (Y)", d.y)}` : d.type === "freedelivery" ? `<div class="field"><span>القيمة</span><div class="input cm-ro">رسوم التوصيل كاملة</div></div>` : f("pb_value", d.type === "percent" ? "نسبة الخصم %" : "قيمة الخصم (ج.م)", d.value)}
            ${d.type === "percent" ? f("pb_cap", "أقصى خصم للطلب (ج.م)", d.cap) : ""}${f("pb_min", "الحد الأدنى للسلة (ج.م)", d.minBasket)}
            <label class="field"><span>النطاق</span><select class="input" data-model="pb_scope">${scopeOpts.map(([v, l]) => opt(v, l, d.scope)).join("")}</select></label>
            <label class="field"><span>جهة التمويل *</span><select class="input" data-model="pb_funding">${Object.entries(FUND).map(([k, [l]]) => opt(k, l, d.funding)).join("")}</select></label>
            ${d.funding === "shared" ? `<label class="field"><span>حصة توّا</span><select class="input" data-model="pb_share">${[25, 50, 75].map((x) => opt(x, `${x}% توّا / ${100 - x}% التاجر`, Math.round(d.share * 100))).join("")}</select></label>` : ""}
            ${f("pb_budget", "الميزانية الكلية (ج.م) *", d.budget)}${f("pb_limit", "حد الاستخدام للعميل", d.limit)}
            <label class="field"><span>الشريحة</span><select class="input" data-model="pb_segment">${[["all", "كل العملاء"], ...S.segments.map((s) => [s.id, `${s.ar} (${num(s.size)})`])].map(([v, l]) => opt(v, l, d.segment)).join("")}</select></label>
            ${f("pb_days", "المدة (يوم)", d.days)}
            <label class="field"><span>الهدف</span><select class="input" data-model="pb_goal">${Object.entries(GOALS).map(([k, l]) => opt(k, l, d.goal)).join("")}</select></label>
            ${d.kind === "time" ? `<label class="field"><span>نافذة الوقت</span><select class="input" data-model="pb_window">${WINDOWS.map((w) => opt(w, w, d.window)).join("")}</select></label>` : ""}
            <div class="field wide"><span>المناطق</span><div class="cm-chips">${`<button type="button" class="chip t-neutral cm-cb${d.zones === "all" ? " on" : ""}" data-act="pb-zone" data-z="all">كل المناطق</button>`}${S.zones.filter((z) => z.active).map((z) => `<button type="button" class="chip t-${z.type === "core" ? "brand" : "accent"} cm-cb${zs.includes(z.id) ? " on" : ""}" data-act="pb-zone" data-z="${z.id}" aria-pressed="${zs.includes(z.id)}">${esc(z.ar)}</button>`).join("")}</div></div></div>
          <p class="cm-note muted">${ic("shield", "ic xs")} حماية من الاحتيال: حد للعميل، أقصى نسبة 60%، كود فريد، والاستخدام مربوط بالموبايل والعنوان. العروض اللي ميزانيتها فوق 30,000 ج.م أو مساهمتها تحت ${money(R.minContribution)}/طلب بتروح للمدير العام.</p></div>
        <div class="cm-pv"><div class="card flat">
          <div class="lbl">معاينة الأثر المالي — لكل طلب يستخدم العرض</div>
          ${row("متوسط السلة المفترض", money(Math.max(265, d.minBasket)))}${row("الخصم المتوقع", money(imp.disc, 1))}${row("تكلفة توّا", money(imp.twaaCost, 1))}${row("تكلفة التاجر", money(imp.disc - imp.twaaCost, 1))}
          ${row("مساهمة الطلب بعد العرض", cmv(imp.cmPerOrder), imp.belowGuard ? "bad" : "")}
          <div class="cm-guard">${chip(`حد المساهمة ${money(R.minContribution)}/طلب (Guardrail A)`, "neutral", "shield")}${chip(imp.belowGuard ? `أقل من الحد بـ ${num(R.minContribution - imp.cmPerOrder, 1)} ج.م` : `أعلى من الحد بـ ${num(imp.cmPerOrder - R.minContribution, 1)} ج.م`, imp.belowGuard ? "bad" : "ok", imp.belowGuard ? "alert" : "check")}</div>
          <div class="cm-inc"><span class="lbl">Expected Incremental Contribution / طلب</span><span class="cm-big ${imp.incremental < 0 ? "cm-neg" : "cm-pos"}">${mny(imp.incremental, 1)}</span><span class="sub muted">نسبة الطلبات الإضافية المتوقعة ${pct(imp.uplift)} حسب الهدف</span></div>
          <hr class="sep">${row("الجمهور", `${num(pv.audience)} عميل`)}${row("استخدامات تغطيها الميزانية", num(pv.redemptions))}${row("الاستخدام المتوقع", num(pv.reach))}${row("إجمالي تكلفة توّا", money(pv.totalTwaa))}${row("إجمالي تكلفة التاجر", money(pv.totalMerchant))}${row("إجمالي المساهمة الإضافية", cmv(pv.totalInc, 0))}</div>
          ${imp.belowGuard ? `<div class="banner bad">${ic("alert", "ic sm")}<div><b>تحت حد المساهمة (Guardrail A).</b> العرض هيتسجل «بانتظار الموافقة» ويروح لمركز الموافقات للمدير العام — مش هيشتغل لحد ما يتعتمد. قلّل النسبة، حط حد أقصى، أو خلّي التمويل مشترك.</div></div>` : d.budget > 30000 ? `<div class="banner warn">${ic("info", "ic sm")}<div>الميزانية فوق 30,000 ج.م → محتاج موافقة المدير العام.</div></div>` : `<div class="banner ok">${ic("check", "ic sm")}<div>داخل الحدود — هيتفعّل فوراً بعد الإنشاء ويتسجل في التدقيق.</div></div>`}
          ${A.permBtn("promo.create", pv.needsApproval ? "أنشئ وابعت للموافقة" : "أنشئ وفعّل العرض", "pb-submit", { cls: "primary block", icon: pv.needsApproval ? "check" : "play" })}</div></div></div>
      <div class="filters">${sel("pm_st", fs, [["all", "كل الحالات"], ...Object.entries(PSTATUS).map(([k, [l]]) => [k, l])], "الحالة")}${sel("pm_fund", ff, [["all", "كل جهات التمويل"], ...Object.entries(FUND).map(([k, [l]]) => [k, l])], "التمويل")}<span class="muted">${num(list.length)} عرض</span></div>
      <div class="card" style="padding:0"><div class="tw"><table class="tbl"><thead><tr><th>العرض</th><th>النوع</th><th>النطاق / الشريحة</th><th>التمويل</th><th>الميزانية (مصروف / كلي)</th><th class="n">الاستخدام</th><th class="n">مساهمة/طلب</th><th class="n">مساهمة إضافية متوقعة</th><th>الحالة</th><th></th></tr></thead><tbody>${rows || `<tr><td colspan="10" class="c muted">مفيش عروض</td></tr>`}</tbody></table></div></div>`;
  },
  on: {},
});

/* ===================================================================== CRM ===================== */
const AUTOS = [
  { id: "abandoned", ar: "سلة متروكة", trigger: "سلة فيها منتجات بدون طلب لمدة 45 دقيقة", channel: "Push", cap: "مرة كل 3 أيام", seg: null, offer: null, goal: null, def: true },
  { id: "first", ar: "تحويل أول طلب", trigger: "سجّل ولم يطلب خلال 48 ساعة", channel: "Push + واتساب", cap: "مرتين في أول أسبوع", seg: "sg-new", offer: "PR-11", goal: "first order", def: true },
  { id: "second", ar: "تفعيل الطلب التاني", trigger: "3 أيام بعد أول طلب مُسلّم", channel: "Push", cap: "مرة واحدة", seg: "sg-act", offer: "PR-12", goal: "second order", def: true },
  { id: "reorder", ar: "تذكير إعادة الطلب", trigger: "مرّ متوسط دورة الشراء للعميل", channel: "Push", cap: "مرة أسبوعياً", seg: "sg-rep", offer: null, goal: null, def: true },
  { id: "replenish", ar: "توقّع النفاد (تجديد)", trigger: "صنف متكرر قرب ميعاد نفاده (لبن، عيش، مياه)", channel: "داخل التطبيق", cap: "مرة كل 5 أيام", seg: "sg-groc", offer: null, goal: null, def: true },
  { id: "winback", ar: "استرجاع المتوقفين", trigger: "لم يطلب خلال 30 يوم", channel: "Push + واتساب", cap: "مرة كل 14 يوم", seg: "sg-lapsed", offer: "PR-12", goal: "winback", def: true },
  { id: "launch", ar: "إطلاق منطقة", trigger: "منطقة من قائمة الانتظار اتفعّلت", channel: "SMS + Push", cap: "مرة لكل منطقة", seg: "sg-village", offer: "PR-14", goal: "zone launch", def: true },
  { id: "bis", ar: "رجع للمخزون", trigger: "منتج طلب العميل «بلّغني» عليه رجع متاح", channel: "Push", cap: "مرة لكل منتج", seg: null, offer: null, goal: null, def: true },
  { id: "merchnear", ar: "تاجر جديد قريب منك", trigger: "تفعيل تاجر جديد في منطقة العميل", channel: "داخل التطبيق", cap: "مرة شهرياً", seg: null, offer: null, goal: "merchant launch", def: false },
  { id: "threshold", ar: "عرض حد السلة", trigger: "السلة أقل من حد التوصيل المجاني بـ ≤ 40 ج.م", channel: "داخل السلة", cap: "مرة لكل جلسة", seg: null, offer: "PR-12", goal: "basket increase", def: true },
];
const autoOn = (a) => { const st = (TW.S.crmAuto || {})[a.id]; return st == null ? a.def : !!st; };
const autoGoal = (a) => a.goal || `auto:${a.id}`;
function autoEligible(a) {
  const S = TW.S;
  if (a.id === "abandoned") return [Object.values(S.carts || {}).filter((c) => c.lines && c.lines.length).length, "سلة مفتوحة الآن"];
  if (a.id === "bis") return [S.demand.notify.length, "طلب «بلّغني» مفتوح"];
  if (a.id === "launch") return [sum(Object.values(S.waitlist), (w) => w.users), "على قوائم الانتظار"];
  if (a.id === "merchnear") return [S.merchants.filter((m) => m.status === "active" && m.health === "new").length, "تاجر جديد بيتطلق"];
  if (a.id === "threshold") return [S.zones.filter((z) => z.active).length, "منطقة بحد توصيل مجاني"];
  const seg = find(S.segments, a.seg); return [seg ? seg.size : 0, `في شريحة «${seg ? seg.ar : "—"}»`];
}
TW.page("crm", {
  render(inst) {
    const S = TW.S, demo = S.customers.map((c) => ({ c, p: custProfile(c) }));
    const base = TW.kpis().activeCust;
    const running = S.campaigns.filter((c) => c.status === "running");
    const offerChip = (id) => { const p = id && find(S.promos, id); return p ? `${chip(p.code || p.id, PSTATUS[p.status][1])}` : `<span class="muted">بدون عرض</span>`; };
    const autoRows = AUTOS.map((a) => {
      const on = autoOn(a), [n, nl] = autoEligible(a), camps = S.campaigns.filter((c) => c.goal === autoGoal(a));
      const sent = sum(camps, (c) => c.sent), ord = sum(camps, (c) => c.ordered), inc = sum(camps, (c) => c.incContribution);
      return `<div class="cm-auto${on ? "" : " off"}">
        <button type="button" class="toggle${on ? " on" : ""}" data-act="auto-toggle" data-id="${a.id}" aria-pressed="${on}" aria-label="${esc(on ? `إيقاف ${a.ar}` : `تشغيل ${a.ar}`)}"${TW.can("promo.create") ? "" : ` disabled title="يحتاج صلاحية ${esc(D.perms["promo.create"])}"`}></button>
        <div class="grow"><b>${esc(a.ar)}</b> ${on ? chip("يعمل", "ok") : chip("متوقف", "neutral")}<span class="sub">${ic("zap", "ic xs")} ${esc(a.trigger)}</span></div>
        <div><span class="sub">القناة: <b>${esc(a.channel)}</b></span><span class="sub">حد التكرار: <b>${esc(a.cap)}</b></span><span class="sub">العرض: ${offerChip(a.offer)}</span></div>
        <div><span class="num"><b>${num(n)}</b></span> <span class="sub">${esc(nl)}</span>${camps.length ? `<span class="sub">أُرسل ${num(sent)} · طلب ${num(ord)} (${pct(sent ? ord / sent : 0, 1)}) · ${cmv(inc, 0)}</span>` : `<span class="sub muted">لا توجد حملة مرتبطة بعد</span>`}</div>
        <div class="x">${camps.length ? camps.map((c) => chip(c.id, c.status === "running" ? "ok" : "neutral")).join(" ") : gbtn("promo.create", "أنشئ حملة", "auto-camp", { cls: "sm", icon: "plus", data: { id: a.id } })}</div></div>`;
    }).join("");
    const segRows = S.segments.map((s) => { const camps = S.campaigns.filter((c) => c.audience === s.id), promos = S.promos.filter((p) => p.segment === s.id); const dm = demo.filter((x) => x.p.segs.includes(s.id)); return `<tr><td>${chip(s.ar, SEG_TONE[s.id] || "neutral")}</td><td>${esc(s.rule)}</td><td class="n num"><b>${num(s.size)}</b></td><td class="n num">${pct(s.size / base, 1)}</td><td>${dm.length ? `<button type="button" class="btn sm ghost cm-lnk" data-act="crm-seg" data-id="${esc(s.id)}">${num(dm.length)} عميل في العيّنة</button>` : `<span class="muted">—</span>`}</td><td>${camps.map((c) => chip(c.id, c.status === "running" ? "ok" : "neutral")).join(" ") || `<span class="muted">—</span>`}</td><td>${promos.map((p) => chip(p.code || p.id, PSTATUS[p.status][1])).join(" ") || `<span class="muted">—</span>`}</td></tr>`; }).join("");
    const campRows = S.campaigns.map((c) => { const seg = find(S.segments, c.audience), p = c.offer && find(S.promos, c.offer), au = AUTOS.find((a) => autoGoal(a) === c.goal); return `<tr><td><b>${esc(c.name)}</b><span class="sub mono">${esc(c.id)}${au ? ` · أتمتة: ${esc(au.ar)}` : c.goal ? ` · ${esc(GOALS[c.goal] || c.goal)}` : ""}</span></td><td>${seg ? `${esc(seg.ar)}<span class="sub">${num(seg.size)} عميل</span>` : esc(c.audience)}</td><td>${p ? `${chip(p.code || p.id, PSTATUS[p.status][1])}<span class="sub">${esc(PSTATUS[p.status][0])}</span>` : `<span class="muted">بدون عرض</span>`}</td><td>${esc(c.channel)}<span class="sub">${esc(c.schedule || "")}</span></td><td>${chip({ running: "شغالة", scheduled: "مجدولة", draft: "مسودة", ended: "انتهت" }[c.status] || c.status, c.status === "running" ? "ok" : c.status === "scheduled" ? "info" : "neutral")}</td><td class="n num">${num(c.sent)}</td><td class="n num">${c.sent ? pct(c.opened / c.sent) : "—"}</td><td class="n num">${num(c.ordered)}${c.sent ? `<span class="sub">${pct(c.ordered / c.sent, 1)}</span>` : ""}</td><td class="n">${cmv(c.incContribution, 0)}</td><td>${c.status === "draft" || c.status === "scheduled" ? gbtn("promo.create", "أطلق", "camp-launch", { cls: "sm primary", icon: "play", data: { id: c.id } }) : `<span class="muted">—</span>`}</td></tr>`; }).join("");
    const activeAutos = AUTOS.filter(autoOn).length;
    return `${A.head("CRM ودورة حياة العميل", "Segments · lifecycle automations · campaigns — بدون إزعاج: حد تكرار لكل رسالة وسقف أسبوعي لكل عميل")}
      <div class="grid g4">${kpi("قاعدة العملاء النشطين", num(base), `${num(S.segments.length)} شريحة`)}${kpi("الاحتفاظ بعد 30 يوم", pct(S.hist.retention.d30), `7 أيام ${pct(S.hist.retention.d7)} · 3 شهور ${pct(S.hist.retention.m3)}`)}${kpi("أتمتة شغالة", `${num(activeAutos)} / ${num(AUTOS.length)}`, `${num(running.length)} حملة شغالة`)}${kpi("مساهمة إضافية من الحملات", cmv(sum(S.campaigns, (c) => c.incContribution), 0), "بعد تكلفة العروض", { tone: "ok" })}</div>
      <div class="banner brand">${ic("shield", "ic sm")}<div><b>سياسة منع الإزعاج:</b> أقصى 3 رسائل تسويقية في الأسبوع لكل عميل · ساعات هدوء 11 م – 9 ص · لا رسائل تسويقية لعميل عنده حالة دعم مفتوحة · واتساب للرسائل المهمة فقط · كل أتمتة لها حد تكرار خاص.</div></div>
      <div class="card"><div class="hd"><h3>${ic("zap", "ic sm")} أتمتة دورة الحياة</h3><span class="muted">التفعيل/الإيقاف بيتسجل في التدقيق</span></div><div class="cm-autos">${autoRows}</div></div>
      <div class="card"><div class="hd"><h3>${ic("sparkle", "ic sm")} الحملات</h3><button type="button" class="btn sm ghost" data-act="go" data-to="/admin/promotions">${ic("percent", "ic xs")}العروض</button></div><div class="tw"><table class="tbl"><thead><tr><th>الحملة</th><th>الجمهور</th><th>العرض</th><th>القناة / الموعد</th><th>الحالة</th><th class="n">أُرسل</th><th class="n">فتح</th><th class="n">طلب</th><th class="n">مساهمة إضافية</th><th></th></tr></thead><tbody>${campRows}</tbody></table></div>
        <p class="cm-note muted">${ic("info", "ic xs")} حماية الهامش: الحملة المرتبطة بعرض غير مفعّل (بانتظار موافقة أو متوقف) ما تتطلقش.</p></div>
      <div class="card"><h3>${ic("users", "ic sm")} الشرائح</h3><div class="tw"><table class="tbl"><thead><tr><th>الشريحة</th><th>القاعدة</th><th class="n">الحجم</th><th class="n">من القاعدة</th><th>في العيّنة التشغيلية</th><th>حملات</th><th>عروض</th></tr></thead><tbody>${segRows}</tbody></table></div></div>`;
  },
  on: {},
});

/* ===================================================================== handlers (shared by every commerce page + drawers/modals) ===================== */
const ON = {
  "co-reset"(inst) { ["co_q", "co_st", "co_fin", "co_zone", "co_src", "co_pay", "co_date", "co_case", "co_quick", "co_sort"].forEach((k) => (inst.ui[k] = null)); inst.render(); },
  "cu-note"(inst, d) { const c = find(TW.S.customers, d.id || inst.route[1]); const text = (inst.ui.cu_note || "").trim(); if (!text) return TW.toast("اكتب الملاحظة الأول", "bad"); const r = inst.act("commerce.custNote", { customerId: c.id, text }); if (r.ok !== false) { inst.ui.cu_note = ""; TW.toast("الملاحظة اتسجلت", "ok"); inst.render(); } },
  /* merchants */
  "m-class"(inst, d) { const m = find(TW.S.merchants, d.id), sug = suggestClass(m); A.ask(inst, { title: `تغيير تصنيف ${m.ar}`, action: "merchant.status", payload: { merchantId: m.id }, extra: [{ k: "status", label: `التصنيف الجديد (الحالي: ${HEALTH[m.health][0]} · المقترح: ${HEALTH[sug.level][0]})`, type: "select", options: Object.entries(HEALTH).map(([k, [l]]) => [k, l]), value: sug.level !== m.health ? sug.level : m.health }], reasons: ["تأخر تجهيز متكرر", "قبول بطيء / رفض متكرر", "إلغاء بعد القبول", "دقة إتاحة منخفضة", "شكاوى عملاء", "مخالفة سياسة الأسعار", "تحسّن الأداء بعد المتابعة", "انتهاء فترة التاجر الجديد"], confirm: "غيّر التصنيف", note: `التصنيف بيأثر على ترتيب التاجر في البحث وحدود الطلبات. «موقوف» بيقفل المحل فوراً. التاجر هيوصله إشعار بالسبب. الحالي: ${HEALTH[m.health][0]}.` }); },
  "m-comm"(inst, d) { const m = find(TW.S.merchants, d.id); A.ask(inst, { title: `تعديل عمولة ${m.ar}`, action: "merchant.commission", payload: { merchantId: m.id }, extra: [{ k: "pct", label: `العمولة الجديدة % (الحالية ${num(m.commission * 100)}%)`, type: "number", value: Math.round(m.commission * 100) }], reasons: ["اتفاق تجاري جديد", "حافز إطلاق مؤقت", "مراجعة سنوية للعقد", "تصحيح خطأ إدخال"], confirm: "عدّل العمولة", note: `الأثر المالي: كل 1% = ${money(m.gmv30 * 0.01)} شهرياً على GMV آخر 30 يوم (${money(m.gmv30)}). التعديل بيسري على الطلبات الجديدة ويظهر في كشف التسوية.` }); },
  "m-coach"(inst, d) { const m = find(TW.S.merchants, d.id), sug = suggestClass(m), t = [...sug.bad, ...sug.warn][Number(d.i)]; if (!t) return; const [msg, tip] = COACH[t[0]](m); const r = inst.act("commerce.coach", { merchantId: m.id, text: `${msg} ${tip}`, metric: t[1] }); if (r.ok !== false) TW.toast(`اتبعتت رسالة التوجيه لـ ${m.ar}`, "ok"); },
  "m-pay"(inst, d) { const r = inst.act("settlement.pay", { settlementId: d.id }); if (r.ok !== false) TW.toast("اتصرفت التسوية واتسجلت", "ok"); },
  "m-line"(inst, d) { const keep = d.keep === "1"; A.ask(inst, { title: keep ? "تثبيت الخصم المتنازع عليه" : "إلغاء الخصم المتنازع عليه", action: "settlement.resolveLine", payload: { settlementId: d.st, lineId: d.line, keep }, reasons: keep ? ["الدليل يثبت المسؤولية", "سجل الوقت مطابق", "تكرار المخالفة بعد التحذير"] : ["الدليل غير كافٍ", "سبب خارج عن التاجر", "قرار تجاري — أول مرة"], confirm: keep ? "ثبّت" : "ألغِ الخصم", danger: !keep, note: "حسم النزاع بيفك إيقاف صرف الكشف (EX-SET-002) والتاجر بيتبلغ بالقرار." }); },
  "m-app"(inst, d) { inst.act("session.set", { key: "merchant", value: d.id }); inst.go("/merchant"); },
  "m-pricing"(inst, d) { inst.ui.pr_m = d.id; inst.ui.pr_flag = "all"; inst.ui.pr_view = "pairs"; inst.go("/admin/pricing"); },
  /* catalogue */
  "cat-pick"(inst, d) { const v = d.v || null; if (d.l === "dept") { inst.ui.cat_dept = v; inst.ui.cat_cat = null; inst.ui.cat_fam = null; } if (d.l === "cat") { inst.ui.cat_cat = v; inst.ui.cat_fam = null; } if (d.l === "fam") inst.ui.cat_fam = inst.ui.cat_fam === v ? null : v; inst.ui.cat_all = false; if (inst.route[0] !== "catalog") return inst.go("/admin/catalog"); inst.render(); },
  "cat-reset"(inst) { ["cat_dept", "cat_cat", "cat_fam", "cat_q", "cat_status", "cat_flag"].forEach((k) => (inst.ui[k] = null)); inst.render(); },
  "sku-open"(inst, d) { inst.ui.drawer = { kind: "commerce-sku", id: d.id }; inst.render(); },
  "sku-edit"(inst, d) { skuEdit(inst, d.id, d.f); },
  "req-link"(inst, d) { const s = find(TW.S.skus, d.sku); const r = inst.act("commerce.linkRequest", { reqId: d.req, skuId: d.sku }); if (r.ok !== false) { if (inst.ui.modal && inst.ui.modal.kind === "commerce-newsku") inst.ui.modal = null; inst.ui.ns_dup = null; TW.toast(`اتربط الطلب بـ ${s.ar} (${s.id}) — بدون تكرار، والتاجر اتبلغ`, "ok"); inst.render(); } },
  "req-create"(inst, d) { const cr = find(TW.S.catReqs, d.id), g = guessDept(cr.catGuess); Object.assign(inst.ui, { ns_ar: cr.name, ns_en: "", ns_brand: brandGuess(cr.name), ns_dept: g.dept || "grocery", ns_cat: g.cat || (D.cats[g.dept || "grocery"][0] || [])[0], ns_size: "", ns_price: "", ns_barcode: cr.barcode || "", ns_dup: null }); inst.ui.modal = { kind: "commerce-newsku", reqId: cr.id }; inst.render(); },
  "ns-dept"(inst, d, el) { inst.ui.ns_dept = el.value; inst.ui.ns_cat = ((D.cats[el.value] || [])[0] || [])[0]; inst.render(); },
  "ns-submit"(inst) {
    const m = inst.ui.modal, g = (k) => String(inst.ui[k] == null ? "" : inst.ui[k]).trim();
    const miss = [["ns_ar", "الاسم العربي"], ["ns_size", "الحجم"], ["ns_price", "السعر المرجعي"]].filter(([k]) => !g(k)).map((x) => x[1]);
    if (miss.length) return TW.toast(`حقول ناقصة: ${miss.join("، ")}`, "bad");
    if (!(Number(g("ns_price")) > 0)) return TW.toast("السعر المرجعي لازم يكون أكبر من صفر", "bad");
    if (g("ns_barcode") && !/^\d{8,14}$/.test(g("ns_barcode"))) return TW.toast("الباركود لازم يكون 8–14 رقم", "bad");
    const cat = g("ns_cat") || ((D.cats[g("ns_dept")] || [])[0] || [])[0];
    const r = inst.act("catalog.createFromRequest", { reqId: m.reqId, ar: g("ns_ar"), en: g("ns_en"), brand: g("ns_brand"), dept: g("ns_dept"), cat, size: g("ns_size"), price: Number(g("ns_price")), barcode: g("ns_barcode") });
    if (r.ok === false) { if (r.dup) { inst.ui.ns_dup = r.dup; inst.render(); } return; }
    inst.ui.modal = null; inst.ui.ns_dup = null; inst.ui.drawer = { kind: "commerce-sku", id: r.skuId }; TW.toast(`اتعمل ${r.skuId} واتضاف لمحل التاجر — التاجر اتبلغ`, "ok"); inst.render();
  },
  "req-reject"(inst, d) { const ap = TW.S.approvals.find((a) => a.ref && a.ref.kind === "catreq" && a.ref.id === d.id && a.status === "PENDING"); A.ask(inst, ap ? { title: "رفض طلب إضافة منتج", action: "approval.decide", payload: { approvalId: ap.id, decision: "reject" }, field: "note", reasons: REJECT_REASONS, confirm: "ارفض", danger: true, note: "التاجر هيوصله سبب الرفض." } : { title: "رفض طلب إضافة منتج", action: "commerce.catreqReject", payload: { reqId: d.id }, reasons: REJECT_REASONS, confirm: "ارفض", danger: true, note: "التاجر هيوصله سبب الرفض ويقدر يبعت طلب جديد ببيانات أوضح." }); },
  /* categories */
  "cg-lead"(inst, d) { const types = Object.entries(D.typeDepts).filter(([, ds]) => ds.includes(d.d)).map(([t]) => t); const opts = (types.length ? types : d.d === "food" ? ["restaurant"] : ["grocery"]).map((t) => [t, D.merchantTypes[t]]); const r = catRows(skuMap()).find((x) => x.d === d.d); const gaps = r ? r.zones.slice().sort((a, b) => a.n - b.n).map((x) => x.z) : TW.S.zones.filter((z) => z.active); A.ask(inst, { title: `إضافة تاجر لقسم ${deptAr(d.d)}`, action: "commerce.leadCreate", payload: { dept: d.d }, field: "opportunity", extra: [{ k: "name", label: "اسم التاجر المحتمل", type: "text", value: "" }, { k: "type", label: "نوع التاجر (قائمة محكومة)", type: "select", options: opts, value: opts[0][0] }, { k: "zoneId", label: "المنطقة (الأقل تغطية أولاً)", type: "select", options: gaps.map((z) => [z.id, z.ar]), value: gaps[0].id }], reasons: ["فجوة تغطية في المنطقة", "بحث بدون نتيجة متكرر", "نفاد متكرر في الهب", "أسعار أعلى من السوق", "طلب قوائم الانتظار"], confirm: "أنشئ عميل محتمل", note: "هيتسجل كعميل محتمل في خط استقطاب التجار (مرحلة 1) ويظهر لفريق المبيعات." }); },
  "cg-assort"(inst, d) { inst.ui.cat_dept = d.d; inst.ui.cat_cat = null; inst.ui.cat_fam = null; inst.go("/admin/catalog"); },
  "cg-promo"(inst, d) { Object.assign(inst.ui, { pb_kind: "category", pb_scope: `dept:${d.d}`, pb_name: `عرض ${deptAr(d.d)}`, pb_goal: "category adoption", pb_funding: "shared", pb_share: 50, pb_value: 10, pb_cap: 30, pb_segment: "all" }); inst.go("/admin/promotions"); TW.toast("منشئ العروض اتملى من القسم — راجع الأثر المالي قبل الإنشاء"); },
  "cg-po"(inst, d) { const S = TW.S; let lines = S.skus.filter((s) => s.dept === d.d && s.active && S.inv.h1[s.id]).map((s) => { const iv = S.inv.h1[s.id], avail = iv.onHand - iv.reserved; return { id: s.id, ar: s.ar, avail, incoming: iv.incoming, vel: iv.velocity, cost: iv.cost, qty: Math.max(0, Math.ceil(iv.velocity * 7 + iv.reorderPt - (avail + iv.incoming))) }; }).filter((l) => l.qty > 0).sort((a, b) => a.avail / Math.max(0.1, a.vel) - b.avail / Math.max(0.1, b.vel)).slice(0, 8); if (!lines.length) return TW.toast("المخزون كافي لأسبوع في كل أصناف القسم — مفيش أمر شراء مطلوب"); lines.forEach((l) => (inst.ui[`po_${l.id}`] = String(l.qty))); inst.ui.modal = { kind: "commerce-po", dept: d.d, lines }; inst.render(); },
  "po-submit"(inst) { const m = inst.ui.modal; const lines = m.lines.map((l) => [l.id, Math.round(Number(inst.ui[`po_${l.id}`]) || 0), l.cost]).filter((l) => l[1] > 0); if (!lines.length) return TW.toast("حدد كمية لصنف واحد على الأقل", "bad"); const r = inst.act("po.create", { lines, supplier: inst.ui.po_sup || "مورد معتمد — دمنهور" }); if (r.ok !== false) { inst.ui.modal = null; TW.toast(`${r.id} اتعمل واتبعت لموافقة المالية`, "ok"); inst.render(); } },
  "cg-retire"(inst, d) { const S = TW.S; const opts = S.skus.filter((s) => s.dept === d.d && s.active).map((s) => { const iv = S.inv.h1[s.id]; return { s, v: iv ? iv.velocity : 0 }; }).sort((a, b) => a.v - b.v).map(({ s, v }) => [s.id, `${s.ar} ${s.size} — ${v ? `${num(v, 1)}/يوم` : "بدون مبيعات هب"}`]); if (!opts.length) return TW.toast("مفيش أصناف نشطة في القسم", "bad"); A.ask(inst, { title: `إيقاف SKU من ${deptAr(d.d)}`, action: "commerce.skuSet", payload: { field: "active", value: "false" }, extra: [{ k: "skuId", label: "الصنف (الأبطأ حركة أولاً)", type: "select", options: opts, value: opts[0][0] }], reasons: RETIRE_REASONS, confirm: "أوقف الـ SKU", danger: true, note: "الإيقاف بيشيل الصنف من البحث ومن كل المصادر. مش حذف — يقدر يرجع بسبب." }); },
  /* pricing */
  "pr-tol"(inst) { A.ask(inst, { title: "تعديل سماحية سعر التاجر", action: "rules.update", payload: { key: "priceTolerance" }, extra: [{ k: "value", label: `السماحية % (الحالية ±${TW.S.rules.priceTolerance}%)`, type: "number", value: TW.S.rules.priceTolerance }], reasons: ["مراجعة دورية للسياسة", "تقلب أسعار السوق", "موسم / أعياد", "شكاوى عملاء من الأسعار"], confirm: "عدّل القاعدة", note: "القاعدة بتسري فوراً على كل أسعار التجار الجديدة (Guardrail G)." }); },
  /* promotions */
  "pb-kind"(inst, d, el) { const K = KINDS[el.value] || KINDS.percent; Object.assign(inst.ui, { pb_kind: el.value, pb_scope: K.scope || "all", pb_segment: K.segment || "all", pb_goal: K.goal || "basket increase", pb_limit: K.limit || 2, pb_min: K.min || 150, pb_zones: K.zones || "all", pb_funding: K.funding || inst.ui.pb_funding || "shared", pb_value: 10 }); inst.render(); },
  "pb-zone"(inst, d) { if (d.z === "all") inst.ui.pb_zones = "all"; else { const cur = (inst.ui.pb_zones && inst.ui.pb_zones !== "all" ? inst.ui.pb_zones.split(",") : []); const nx = cur.includes(d.z) ? cur.filter((x) => x !== d.z) : [...cur, d.z]; inst.ui.pb_zones = nx.length ? nx.join(",") : "all"; } inst.render(); },
  "pb-reset"(inst) { Object.keys(inst.ui).filter((k) => k.startsWith("pb_")).forEach((k) => (inst.ui[k] = null)); inst.render(); },
  "pb-submit"(inst) {
    const d = pbDraft(inst);
    if (!d.name.trim()) return TW.toast("اسم العرض إلزامي", "bad");
    const r = inst.act("commerce.promoCreate", { name: d.name.trim(), code: d.code, kind: d.kind, type: d.type, value: d.value, cap: d.cap, minBasket: d.minBasket, scope: d.scope, funding: d.funding, share: d.share, budget: d.budget, limit: d.limit, segment: d.segment, zones: d.zones, days: d.days, goal: d.goal, window: d.window, x: d.x, y: d.y });
    if (r.ok === false) return;
    const p = r.promo; inst.ui.pm_last = p.id; inst.ui.pb_name = null; inst.ui.pb_code = null;
    TW.toast(p.status === "pending_approval" ? `${p.id} اتسجل «بانتظار الموافقة» — مساهمة ${num(p.impact.cmPerOrder, 1)} ج.م/طلب تحت الحد. تابعه في مركز الموافقات.` : `${p.id} اتفعّل — مساهمة إضافية متوقعة ${num(p.incContribution, 1)} ج.م/طلب`, p.status === "pending_approval" ? "" : "ok");
    inst.render();
  },
  "promo-toggle"(inst, d) { const r = inst.act("promo.toggle", { promoId: d.id }); if (r.ok !== false) TW.toast(`${d.id}: ${PSTATUS[find(TW.S.promos, d.id).status][0]}`, "ok"); },
  /* crm */
  "auto-toggle"(inst, d) { const a = AUTOS.find((x) => x.id === d.id); const r = inst.act("commerce.automation", { id: a.id, name: a.ar, on: !autoOn(a) }); if (r.ok !== false) TW.toast(`${a.ar}: ${autoOn(a) ? "اتشغلت" : "اتوقفت"}`, "ok"); },
  "auto-camp"(inst, d) { const a = AUTOS.find((x) => x.id === d.id); const r = inst.act("campaign.create", { name: a.ar, audience: a.seg || "all", offer: a.offer, channel: a.channel, schedule: a.trigger, budget: 3000, guard: true, goal: autoGoal(a) }); if (r.ok !== false) TW.toast(`${r.campaign.id} اتعملت «مجدولة» — أطلقها من جدول الحملات`, "ok"); },
  "camp-launch"(inst, d) { const r = inst.act("campaign.launch", { id: d.id }); if (r.ok !== false) TW.toast(`${d.id} اتطلقت`, "ok"); },
  "crm-seg"(inst, d) { inst.ui.cu_seg = d.id; inst.go("/admin/customers"); },
};
["orders", "customers", "customer", "merchants", "merchant", "catalog", "sku", "categories", "pricing", "promotions", "crm"].forEach((k) => { if (TW.adminPages[k]) TW.adminPages[k].on = ON; });

/* ===================================================================== module actions (validated wrappers around shared store actions) ===================== */
const ACT = TW.actions;
/* typed master-data edit → sku.update (which enforces catalog.edit / price.override + mandatory reason + audit) */
ACT["commerce.skuSet"] = ({ skuId, field, value, reason }, actor) => {
  const S = TW.S, s = find(S.skus, skuId); if (!s) return fail("الـ SKU مش موجود");
  if (!SKU_F[field]) return fail("حقل غير مسموح بتعديله");
  const dn = deny(skuPerm(field), actor); if (dn) return dn;
  if (!reason || !String(reason).trim()) return fail("السبب إلزامي لهذا الإجراء");
  const up = ACT["sku.update"], type = SKU_F[field][1];
  if (field === "cat") { const [dept, cat] = String(value).split("/"); if (!(D.cats[dept] || []).some((c) => c[0] === cat)) return fail("اختار القسم والفئة من القائمة"); if (dept === s.dept && cat === s.cat) return fail("القيمة الجديدة نفس الحالية"); if (dept !== s.dept) { const r = up({ skuId, field: "dept", value: dept, reason }, actor); if (r && r.ok === false) return r; } return up({ skuId, field: "cat", value: cat, reason }, actor) || { ok: true }; }
  let v = value;
  if (type === "number" || field === "ageR" || field === "tax") { v = Number(value); if (!isFinite(v) || v < 0 || String(value).trim() === "") return fail("القيمة لازم تكون رقم موجب"); if ((field === "refPrice" || field === "price") && v <= 0) return fail("السعر لازم يكون أكبر من صفر"); }
  else if (type === "bool") v = value === true || value === "true";
  else if (field === "aliases") v = String(value || "").split(/[,،]/).map((x) => x.trim()).filter(Boolean);
  else if (field === "subGroup") v = String(value || "").trim() || null;
  else { v = String(value == null ? "" : value).trim(); if (!v) return fail("القيمة مطلوبة"); }
  if (field === "barcode") { if (!/^\d{8,14}$/.test(v)) return fail("الباركود لازم يكون 8–14 رقم"); const dup = S.skus.find((x) => x.id !== skuId && x.barcode === v); if (dup) return fail(`الباركود مستخدم على ${dup.ar} (${dup.id}) — منع التكرار`); }
  if (field === "ar") { const dup = S.skus.find((x) => x.id !== skuId && norm(x.ar) === norm(v)); if (dup) return fail(`الاسم مطابق لـ ${dup.ar} (${dup.id}) — منع التكرار`); }
  if (JSON.stringify(s[field] == null ? null : s[field]) === JSON.stringify(v)) return fail("القيمة الجديدة نفس الحالية");
  return up({ skuId, field, value: v, reason }, actor) || { ok: true };
};
/* link a catalogue request to an existing SKU — adds the permission check + state guard the shared action lacks */
ACT["commerce.linkRequest"] = ({ reqId, skuId }, actor) => {
  const S = TW.S, cr = find(S.catReqs, reqId), s = find(S.skus, skuId);
  const dn = deny("catalog.approve", actor); if (dn) return dn;
  if (!cr || !s) return fail("الطلب أو المنتج مش موجود");
  if (cr.status !== "PENDING") return fail("الطلب ده اتاخد فيه قرار قبل كده");
  S.msku[cr.merchantId] = S.msku[cr.merchantId] || {};
  return ACT["catalog.linkRequest"]({ reqId, skuId }, actor) || { ok: true };
};
/* reject a catalogue request that has no approval record (seeded requests) */
ACT["commerce.catreqReject"] = ({ reqId, reason }, actor) => {
  const S = TW.S, cr = find(S.catReqs, reqId); const dn = deny("catalog.approve", actor); if (dn) return dn;
  if (!cr || cr.status !== "PENDING") return fail("الطلب مش معلّق");
  if (!reason || !String(reason).trim()) return fail("سبب الرفض إلزامي");
  cr.status = "REJECTED"; cr.rejectReason = reason; cr.decidedBy = actor.name; cr.decidedAt = now();
  TW.notify(`merchant:${cr.merchantId}`, "طلب المنتج اترفض", `${cr.name}: ${reason}`, {});
  TW.audit(actor, cr.id, "رفض طلب إضافة منتج", "PENDING", "REJECTED", reason);
};
/* promo.create + builder metadata; honours a custom shared-funding split (the shared action fixes it at 50%) */
ACT["commerce.promoCreate"] = (p, actor) => {
  const S = TW.S, code = String(p.code || "").trim().toUpperCase();
  if (code && !/^[A-Z0-9]{4,14}$/.test(code)) return fail("الكود 4–14 حرف/رقم إنجليزي بدون مسافات");
  if (code && S.promos.some((x) => (x.code || "").toUpperCase() === code && !["ended", "rejected"].includes(x.status))) return fail(`الكود ${code} مستخدم في عرض تاني`);
  if (!(Number(p.budget) > 0)) return fail("الميزانية إلزامية (Guardrail C)");
  if (p.type !== "freedelivery" && !(Number(p.value) > 0)) return fail("قيمة الخصم لازم تكون أكبر من صفر");
  if (p.type === "percent" && Number(p.value) > 60) return fail("أقصى نسبة خصم 60% — حماية من الاحتيال");
  const r = ACT["promo.create"]({ ...p, code: code || null }, actor);
  if (!r || r.ok === false) return r;
  const promo = r.promo; promo.kind = p.kind; if (p.window) promo.window = p.window; if (p.kind === "bxgy") promo.bxgy = [Number(p.x), Number(p.y)];
  if (promo.funding === "shared" && p.share != null && Math.abs(Number(p.share) - promo.share) > 1e-9) {
    promo.share = Number(p.share); const imp = TW.promoImpact(promo); promo.impact = imp; promo.incContribution = imp.incremental;
    const ap = S.approvals.find((a) => a.type === "promo" && a.ref.id === promo.id);
    const ev = `تمويل: مشترك ${Math.round(promo.share * 100)}% توّا · خصم متوقع ${num(imp.disc, 1)} ج.م`, impTxt = `Expected incremental contribution ${num(imp.incremental, 1)} ج.م/طلب`;
    if ((imp.belowGuard || promo.budget > 30000) && !ap) {
      promo.status = "pending_approval";
      S.approvals.unshift({ id: `AP-${S.seq.approval++}`, type: "promo", ref: { kind: "promo", id: promo.id }, requester: { name: actor.name, role: actor.role || actor.kind }, reason: `${promo.name} — مساهمة متوقعة ${num(imp.cmPerOrder, 1)} ج.م/طلب${imp.belowGuard ? ` (تحت الحد ${S.rules.minContribution})` : ""}`, amount: promo.budget, evidence: ev, impact: impTxt, level: "gm", status: "PENDING", createdAt: now(), decisions: [] });
      TW.audit(actor, promo.id, "تحويل عرض للموافقة", "active", "pending_approval", "حصة التمويل المشترك تنزل المساهمة تحت الحد");
    } else if (ap) { ap.evidence = ev; ap.impact = impTxt; }
  }
  return { ok: true, promo };
};
ACT["commerce.coach"] = ({ merchantId, text, metric }, actor) => {
  const dn = deny("merchant.activate", actor); if (dn) return dn; const m = find(TW.S.merchants, merchantId); if (!m || !text) return fail("بيانات ناقصة");
  TW.notify(`merchant:${m.id}`, "نصيحة لتحسين أداءك", text, { coaching: true });
  TW.audit(actor, m.ar, "إرسال توجيه أداء", null, metric || "—", text);
};
ACT["commerce.custNote"] = ({ customerId, text }, actor) => {
  const c = find(TW.S.customers, customerId); const t = String(text || "").trim(); if (!c || !t) return fail("اكتب الملاحظة");
  c.crmNotes = [{ at: now(), by: actor.name, text: t }, ...(c.crmNotes || [])].slice(0, 30);
  TW.audit(actor, c.ar, "ملاحظة CRM", null, null, t);
};
ACT["commerce.automation"] = ({ id, name, on }, actor) => {
  const dn = deny("promo.create", actor); if (dn) return dn; const S = TW.S; S.crmAuto = S.crmAuto || {}; const a = AUTOS.find((x) => x.id === id); if (!a) return fail("أتمتة غير معروفة");
  const old = autoOn(a); S.crmAuto[id] = !!on; TW.audit(actor, `أتمتة: ${name || id}`, on ? "تشغيل أتمتة CRM" : "إيقاف أتمتة CRM", old ? "يعمل" : "متوقف", on ? "يعمل" : "متوقف", null);
};
ACT["commerce.leadCreate"] = ({ name, type, zoneId, opportunity, dept }, actor) => {
  if (!String(name || "").trim()) return fail("اسم التاجر المحتمل إلزامي");
  if (!D.merchantTypes[type]) return fail("اختار نوع التاجر من القائمة");
  return ACT["lead.create"]({ name: String(name).trim(), type, zoneId, opportunity: `${deptAr(dept)}: ${opportunity}` }, actor);
};
})();
