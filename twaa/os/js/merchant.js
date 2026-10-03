/* Twaa Business OS — Merchant app (تطبيق التاجر).
   For a trader who must never feel he's using ERP software: accept in seconds, prepare from a checklist, pick products
   from the Twaa master catalogue (never create SKUs), and understand every pound that was deducted.
   Routes: /merchant · /merchant/orders · /merchant/order/:foId · /merchant/catalog · /merchant/finance · /merchant/account · /merchant/register
   Reads TW.S, writes only through inst.act(...). Per-instance UI state lives in inst.ui. */
(function () {
const TW = window.TW, D = TW.D;
const { ic, esc, money, num, pct, chip, clock, ago, dur } = TW;
const find = (arr, id) => (arr || []).find((x) => x.id === id);
const MIN = 60000;

/* ----------------------------------------------------------------- selectors (pure) */
const me = (inst) => find(TW.S.merchants, inst.actorId()) || TW.S.merchants[0];
const isFood = (m) => m.type === "restaurant";
const zoneAr = (id) => (find(TW.S.zones, id) || {}).ar || "—";
const typeAr = (m) => D.merchantTypes[m.type] || m.type;
const orderOf = (f) => find(TW.S.orders, f.orderId);
const foLines = (f) => { const o = orderOf(f); return o ? o.lines.filter((l) => l.foId === f.id) : []; };
const foValue = (f) => TW.sum(foLines(f).filter((l) => l.state !== "removed"), (l) => l.unitPrice * l.qty);
const foTask = (f) => TW.S.tasks.find((t) => t.foIds.includes(f.id) && t.status !== "CANCELLED");
const myFos = (mid) => TW.S.fos.filter((f) => f.sourceId === mid).sort((a, b) => b.createdAt - a.createdAt);
const TABS = [["new", "جديد", ["AWAITING_ACCEPT"]], ["prep", "بيتجهز", ["PREPARING"]], ["ready", "جاهز", ["READY"]], ["done", "اتسلّم", ["HANDED_OVER", "DELIVERED", "RETURNED"]], ["cancel", "ملغي", ["REJECTED", "TIMEOUT", "CANCELLED", "REROUTED"]]];
const tabOf = (f) => (TABS.find(([, , st]) => st.includes(f.status)) || TABS[4])[0];
const deptOf = (id) => D.depts.find((d) => d.id === id) || { icon: "box", tone: 1, ar: id };
const firstName = (n) => String(n || "").split(" ")[0];
const modeMeta = { open: ["مفتوح", "ok"], busy: ["زحمة", "warn"], closed: ["مقفول", "neutral"] };
const healthMeta = { healthy: ["محلك في حالة ممتازة", "ok", "shield"], watch: ["محلك تحت الملاحظة", "warn", "alert"], restricted: ["محلك مقيّد مؤقتاً", "bad", "lock"], suspended: ["محلك موقوف", "bad", "lock"], new: ["تاجر جديد", "info", "sparkle"] };
const DISPUTE_REASONS = ["الصنف كان موجود وسلّمته كامل", "الطرد اتسلّم للمندوب سليم", "العرض ده متفقناش عليه", "التأخير مش من المحل", "المبلغ مش مظبوط", "سبب آخر"];
const deliveryMode = (f, o, t) => (o.mode === "scheduled" ? `رحلة مجدولة ${o.window || ""}` : o.split ? "مندوب توّا · توصيل منفصل" : t && t.pickups.length > 1 ? "مندوب توّا · بيجمع من محل تاني" : "مندوب توّا يستلم منك");
const prepMinOf = (f, m) => (f.prepMin || m.prep) + (m.busyExtra || 0);

/* coaching: pick the weakest metric and say it in plain words */
function coaching(m) {
  const c = [
    { gap: 0.9 - m.prepOnTime, text: `آخر 7 أيام ${pct(1 - m.prepOnTime)} من طلباتك اتأخرت بسبب تجهيز الأصناف`, tip: "جهّز الأصناف الأكتر طلباً على رف قريب من الكاشير، أو شغّل «زحمة» وقت الذروة بدل ما تتأخر.", to: "/merchant/orders", cta: "شوف الطلبات" },
    { gap: 0.95 - m.acceptRate, text: `قبلت ${pct(m.acceptRate)} بس من الطلبات اللي وصلتك الأسبوع ده`, tip: "كل طلب بترفضه أو بيعدي وقته بيقلل ظهور محلك للعملاء.", to: "/merchant/orders", cta: "الطلبات" },
    { gap: 0.95 - m.availAcc, text: `${pct(1 - m.availAcc)} من الأصناف اللي اتطلبت منك طلعت مش موجودة`, tip: "اقفل الأصناف الخلصانة من «المنتجات» عشان العميل ميطلبهاش.", to: "/merchant/catalog", cta: "حدّث التوفر" },
  ].sort((a, b) => b.gap - a.gap)[0];
  if (c.gap <= 0) return { ok: true, text: "شغلك الأسبوع ده ممتاز — التجهيز في الوقت والقبول عالي", tip: "كمّل كده، المحلات اللي بتلتزم بتظهر أول في البحث.", to: "/merchant/finance", cta: "شوف أرباحك" };
  return c;
}

/* ----------------------------------------------------------------- small atoms */
const tile = (dept, size = "") => { const d = deptOf(dept); return `<span class="tile tone-${d.tone} mc-tile ${size}">${ic(d.icon, "ic sm")}</span>`; };
const timer = (until, soon = 30000) => `<span class="timer" data-until="${until}" data-soon="${soon}">${dur(until - Date.now())}</span>`;
const topBar = (inst, m, title, opts = {}) => {
  const [ml, mt] = modeMeta[m.mode] || modeMeta.closed;
  return `<header class="app-top mc-top">${opts.back ? `<button class="btn icon sm ghost" data-act="back" aria-label="رجوع">${ic("chevS", "ic sm")}</button>` : `<span class="mc-av" aria-hidden="true">${ic(isFood(m) ? "food" : "store", "ic sm")}</span>`}
    <div class="grow"><h2>${esc(title || m.ar)}</h2>${opts.sub !== false ? `<div class="mc-sub">${esc(opts.sub || `${typeAr(m)} · ${zoneAr(m.zoneId)}`)}</div>` : ""}</div>
    ${m.status === "active" ? chip(ml, mt, m.mode === "closed" ? "lock" : "dot") : chip("بانتظار التفعيل", "warn", "clock")}</header>`;
};
const tabbar = (inst, m) => {
  const cur = inst.route[0] || "";
  const nNew = TW.S.fos.filter((f) => f.sourceId === m.id && f.status === "AWAITING_ACCEPT").length;
  const items = [["", "الرئيسية", "home"], ["orders", "الطلبات", "receipt", nNew], ["catalog", isFood(m) ? "المنيو" : "المنتجات", isFood(m) ? "food" : "grid"], ["finance", "الأرباح", "wallet"], ["account", "الحساب", "user"]];
  const on = (k) => cur === k || (k === "orders" && cur === "order") || (k === "account" && cur === "register");
  return `<nav class="tabbar" aria-label="تنقل التاجر">${items.map(([k, l, i, b]) => `<button class="${on(k) ? "on" : ""}" data-act="go" data-to="/merchant${k ? "/" + k : ""}" ${on(k) ? 'aria-current="page"' : ""}>${ic(i, "ic")}<span>${l}</span>${b ? `<span class="badge">${b}</span>` : ""}</button>`).join("")}</nav>`;
};

/* incoming order — the strongest alert in the app */
function alertCard(inst, f, hl) {
  const o = orderOf(f), m = me(inst), ls = foLines(f), t = foTask(f);
  const n = TW.sum(ls, (l) => l.qty);
  return `<article class="mc-alert" ${hl ? 'data-hl="merch-new"' : ""} aria-live="polite">
    <div class="row between"><div class="row">${ic("bell", "ic pulse")}<b class="mc-alert-t">طلب جديد!</b><span class="mono muted">${esc(o.id)}</span></div>
      <div class="mc-count" title="الوقت المتبقي للقبول">${ic("clock", "ic xs")}${timer(f.acceptBy)}</div></div>
    <div class="mc-facts">
      <div><span>الأصناف</span><b class="num">${num(n)}</b></div><div><span>القيمة</span><b class="num">${money(foValue(f))}</b></div>
      <div><span>وقت التجهيز</span><b class="num">${prepMinOf(f, m)} د</b></div><div><span>التوصيل</span><b>${esc(deliveryMode(f, o, t))}</b></div>
    </div>
    <ul class="mc-items">${ls.slice(0, 4).map((l) => `<li><span class="num">${l.qty}×</span> ${esc(l.name)}${l.size ? ` <small>${esc(l.size)}</small>` : ""}</li>`).join("")}${ls.length > 4 ? `<li class="muted">+ ${ls.length - 4} أصناف كمان</li>` : ""}</ul>
    ${o.notes ? `<div class="banner warn">${ic("chat", "ic sm")}<div><b>ملاحظة العميل:</b> ${esc(o.notes)}</div></div>` : ""}
    <div class="mc-alert-acts"><button class="btn primary lg mc-accept" data-act="accept" data-fo="${f.id}" data-hl="merch-accept">${ic("check", "ic")}<span>قبول</span></button>
      <button class="btn lg" data-act="reject-open" data-fo="${f.id}">غير قادر على التنفيذ</button></div>
    <p class="mc-note">${ic("info", "ic xs")} نسبة القبول عندك ${pct(m.acceptRate)} — الرفض أو ترك الطلب من غير رد بيقلل تقييم الالتزام وترتيب محلك.</p>
  </article>`;
}

/* compact order row for lists */
function orderRow(f, m) {
  const o = orderOf(f); if (!o) return "";
  const ls = foLines(f), t = foTask(f), r = t && t.riderId && find(TW.S.riders, t.riderId);
  let right = "";
  if (f.status === "AWAITING_ACCEPT") right = `<span class="mc-tm bad">${ic("clock", "ic xs")}${timer(f.acceptBy)}</span>`;
  else if (f.status === "PREPARING") right = `<span class="mc-tm">${ic("clock", "ic xs")}${timer(f.prepBy, 120000)}</span>`;
  else if (f.status === "READY") right = r ? `<span class="mc-sm">${t.status === "AT_PICKUP" ? "المندوب وصل" : "المندوب جاي يستلم"}</span>` : `<span class="mc-sm muted">بندور على مندوب</span>`;
  else right = `<span class="mc-sm muted">${f.handedAt ? clock(f.handedAt) : clock(f.createdAt)}</span>`;
  return `<button class="mc-orow" data-act="go" data-to="/merchant/order/${f.id}"><span class="mc-oi ${tabOf(f)}">${ic(f.status === "AWAITING_ACCEPT" ? "bell" : f.status === "PREPARING" ? "box" : f.status === "READY" ? "bike" : ["HANDED_OVER", "DELIVERED"].includes(f.status) ? "check" : "x", "ic sm")}</span>
    <span class="grow"><b><span class="mono">${esc(o.id)}</span> · ${num(TW.sum(ls, (l) => l.qty))} أصناف</b><small>${TW.stLabel("fo", f.status)} · ${money(foValue(f))} · <span data-ago="${f.createdAt}">${ago(f.createdAt)}</span></small></span>${right}</button>`;
}

/* ================================================================= HOME */
function homeView(inst, m) {
  if (m.status !== "active") return pendingView(inst, m);
  const td = TW.merchantToday(m.id);
  const fos = myFos(m.id);
  const incoming = fos.filter((f) => f.status === "AWAITING_ACCEPT" && !(orderOf(f) || {}).hold);
  const active = fos.filter((f) => ["PREPARING", "READY"].includes(f.status));
  const [hl, ht, hi] = healthMeta[m.health] || healthMeta.healthy;
  const co = coaching(m);
  const tiles = [["طلبات جديدة", num(td.newCount), "bell", "new", td.newCount ? "hot" : ""], ["بيتجهز", num(td.preparing), "box", "prep"], ["جاهز", num(td.ready), "bike", "ready"], ["مبيعات اليوم", money(td.sales), "trend", null], ["مستحق لك", money(td.due), "wallet", "fin"], ["تقييمك", `${num(td.rating, 1)} ${ic("star", "ic xs")}`, "star", null]];
  return `${incoming.map((f, i) => alertCard(inst, f, i === 0)).join("")}
    ${modeCard(inst, m)}
    <section aria-label="اليوم"><div class="mc-h"><h3>اليوم</h3><span class="muted">${TW.dateAr(Date.now())}</span></div>
      <div class="mc-tiles">${tiles.map(([l, v, i, to, hot]) => (to ? `<button class="mc-kpi ${hot || ""}" data-act="${to === "fin" ? "go" : "orders-tab"}" ${to === "fin" ? 'data-to="/merchant/finance"' : `data-tab="${to}"`}><span>${l}</span><b class="num">${v}</b></button>` : `<div class="mc-kpi"><span>${l}</span><b class="num">${v}</b></div>`)).join("")}</div></section>
    <section class="card mc-coach"><div class="row between"><span class="row">${chip(hl, ht, hi)}</span><span class="muted mc-sm">قبول ${pct(m.acceptRate)} · تجهيز في الوقت ${pct(m.prepOnTime)}</span></div>
      <p class="mc-coach-t">${ic(co.ok ? "thumb" : "trend", "ic sm")} ${esc(co.text)}</p><p class="muted mc-sm">${esc(co.tip)}</p>
      <button class="btn sm" data-act="go" data-to="${co.to}">${esc(co.cta)}</button></section>
    ${active.length ? `<section><div class="mc-h"><h3>شغال دلوقتي</h3><button class="btn sm ghost" data-act="go" data-to="/merchant/orders">كل الطلبات</button></div><div class="mc-list">${active.map((f) => orderRow(f, m)).join("")}</div></section>` : incoming.length ? "" : `<div class="card flat mc-quiet">${ic("inbox", "ic")}<div><b>مفيش طلبات شغالة دلوقتي</b><p class="muted mc-sm">${m.mode === "closed" ? "المحل مقفول — افتحه عشان الطلبات توصلك." : "أول ما يوصلك طلب هتسمع تنبيه ويظهر هنا فوق."}</p></div></div>`}
    <section class="mc-quick">${isFood(m) ? `<button class="btn block" data-act="go" data-to="/merchant/catalog">${ic("food", "ic sm")}وقف/شغّل أصناف المنيو</button>` : `<button class="btn block" data-act="cat-go" data-tab="add">${ic("plus", "ic sm")}ضيف منتجات من كتالوج توّا</button><button class="btn block" data-act="cat-go" data-tab="mine">${ic("tag", "ic sm")}حدّث الأسعار والتوفر</button>`}</section>`;
}
function modeCard(inst, m) {
  const modes = [["open", "مفتوح", "door"], ["busy", "زحمة", "clock"], ["closed", "مقفول", "lock"]];
  const expl = { open: "المحل بيستقبل طلبات عادي، ووقت التجهيز " + m.prep + " دقيقة.", busy: `بنزوّد وقت التجهيز ${m.busyExtra || 10} دقايق بدل ما نرفض طلبات — العميل بيشوف ميعاد أطول بس طلبه بيوصلك.`, closed: "المحل مش ظاهر للعملاء ومش هيوصلك طلبات جديدة." };
  return `<section class="mc-mode m-${m.mode}" data-hl="merch-mode" aria-label="حالة المحل">
    <div class="row between"><b>${m.mode === "closed" ? "المحل مقفول" : "المحل مفتوح"}</b><span class="mc-sm muted">${esc(m.hours || (find(TW.S.zones, m.zoneId) || {}).hours || "")}</span></div>
    <div class="mc-seg" role="radiogroup" aria-label="حالة المحل">${modes.map(([k, l, i]) => `<button role="radio" aria-checked="${m.mode === k}" class="${m.mode === k ? "on " + k : ""}" data-act="mode" data-mode="${k}">${ic(i, "ic sm")}<span>${l}</span></button>`).join("")}</div>
    <p class="mc-sm">${esc(expl[m.mode] || "")}</p></section>`;
}
function pendingView(inst, m) {
  const lead = TW.S.leads.find((l) => l.merchantId === m.id);
  const ap = TW.S.approvals.find((a) => a.type === "merchant_activation" && a.ref && a.ref.id === m.id);
  const stage = lead ? lead.stage : 5;
  const steps = [[4, "الاتفاق والعمولة"], [5, "مراجعة المستندات"], [6, "تجهيز الكتالوج"], [7, "تدريب سريع على التطبيق"], [8, "التفعيل وأول طلب"]];
  const nProd = Object.keys(TW.S.msku[m.id] || {}).length;
  return `<section class="card mc-pend"><div class="row">${ic("clock", "ic lg")}<div class="grow"><h3>محلك بيتراجع دلوقتي</h3><p class="muted mc-sm">بنراجع البيانات والمستندات وبعدها فريق توّا يفعّل المحل. مش محتاج تعمل حاجة غير إنك تجهّز منتجاتك.</p></div></div>
    <div class="steps">${steps.map(([s, l]) => { const done = stage > s, now = stage === s; return `<div class="st ${done ? "done" : now ? "now" : ""}"><span class="bul">${done ? ic("check", "ic xs") : ""}</span><div><b>${l}</b>${now ? `<div class="mc-sm muted">${ap && ap.status === "PENDING" ? "بانتظار موافقة عمليات التجار" : "شغالين عليها"}</div>` : ""}</div></div>`; }).join("")}</div>
    ${ap ? `<div class="banner ${ap.status === "REJECTED" ? "bad" : ap.status === "APPROVED" ? "ok" : "warn"}">${ic("shield", "ic sm")}<div><b>طلب التفعيل ${esc(ap.id)}:</b> ${ap.status === "PENDING" ? "قيد المراجعة" : ap.status === "APPROVED" ? "اتوافق عليه" : `اترفض — ${esc(ap.note || "")}`} · <span data-ago="${ap.createdAt}">${ago(ap.createdAt)}</span></div></div>` : ""}</section>
    <section class="card"><h3>${ic("grid", "ic sm")} جهّز منتجاتك من دلوقتي</h3><p class="mc-sm muted">اختار اللي بتبيعه من كتالوج توّا — من غير ما تكتب أسماء منتجات. أول ما تتفعّل تبدأ تبيع على طول.</p>
      <div class="row between" style="margin-top:8px"><span>${chip(`${num(nProd)} صنف في محلك`, nProd ? "ok" : "neutral")}</span><button class="btn sm primary" data-act="cat-go" data-tab="${isFood(m) ? "mine" : "add"}">${ic("plus", "ic xs")}${isFood(m) ? "المنيو" : "ضيف منتجات"}</button></div></section>
    ${modeCard(inst, m).replace('data-hl="merch-mode"', 'data-hl="merch-mode" aria-disabled="true"').replace(/data-act="mode"/g, 'data-act="mode" disabled')}
    <p class="lock c">${ic("lock", "ic xs")} فتح وقفل المحل هيتاح بعد التفعيل</p>`;
}

/* ================================================================= ORDERS */
function ordersView(inst, m) {
  const fos = myFos(m.id);
  const tab = inst.ui.otab || (fos.some((f) => f.status === "AWAITING_ACCEPT") ? "new" : "prep");
  const counts = Object.fromEntries(TABS.map(([k]) => [k, fos.filter((f) => tabOf(f) === k).length]));
  const list = fos.filter((f) => tabOf(f) === tab);
  const head = `<div class="mc-tabs" role="tablist">${TABS.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? "on" : ""} ${k === "new" && counts.new ? "hot" : ""}" data-act="ui" data-k="otab" data-v="${k}">${l}<span class="num">${counts[k]}</span></button>`).join("")}</div>`;
  if (!list.length) return `${head}${TW.empty(tab === "new" ? "مفيش طلبات جديدة" : "مفيش طلبات هنا", tab === "new" ? (m.mode === "closed" ? "المحل مقفول — افتحه من الرئيسية" : "أول ما يوصل طلب هيظهر هنا بتنبيه") : "", "inbox")}`;
  if (tab === "new") return `${head}${list.map((f, i) => alertCard(inst, f, i === 0)).join("")}`;
  return `${head}<div class="mc-list">${list.map((f) => orderRow(f, m)).join("")}</div>`;
}

/* ================================================================= ORDER DETAIL */
function orderView(inst, m, f) {
  if (!f || f.sourceId !== m.id) return TW.empty("الطلب ده مش لمحلك", "ارجع لقائمة الطلبات", "receipt");
  const o = orderOf(f), ls = foLines(f), t = foTask(f);
  const food = isFood(m) || ls.every((l) => l.kind === "menu");
  const marks = Object.fromEntries((f.items || []).map((i) => [i.key, i]));
  let hero = "";
  if (f.status === "AWAITING_ACCEPT") hero = alertCard(inst, f, true);
  else if (f.status === "PREPARING") { const late = Date.now() > f.prepBy; hero = `<div class="mc-hero ${late ? "late" : ""}"><div><span>${late ? "متأخر عن وقت التجهيز" : "لازم يجهز خلال"}</span><b>${timer(f.prepBy, 120000)}</b></div><div><span>اتقبل</span><b class="num">${clock(f.acceptedAt)}</b></div><div><span>القيمة</span><b class="num">${money(foValue(f))}</b></div></div>${f.repack ? `<div class="banner bad">${ic("alert", "ic sm")}<div><b>المندوب رجّع الطرد تالف.</b> جهّز الطلب وغلّفه تاني ودوس «جاهز للاستلام».</div></div>` : ""}`; }
  else if (["REJECTED", "TIMEOUT", "CANCELLED", "REROUTED"].includes(f.status)) hero = `<div class="banner ${f.status === "CANCELLED" ? "" : "bad"}">${ic(f.status === "REROUTED" ? "route" : "x", "ic sm")}<div><b>${TW.stLabel("fo", f.status)}</b>${f.rejectReason ? ` — ${esc(f.rejectReason)}` : ""}${f.status === "TIMEOUT" ? " — الطلب عدّى وقته من غير قبول، والكنترول حوّله أو لغاه." : f.status === "REROUTED" ? " — الطلب اتحوّل لمحل تاني عشان العميل ميستناش." : ""}</div></div>`;
  /* checklist */
  let check = "";
  if (ls.length) {
    const editable = f.status === "PREPARING";
    const rows = ls.map((l) => {
      const it = marks[l.key] || {}, mk = it.mark, sub = it.subSkuId && find(TW.S.skus, it.subSkuId);
      const mods = (l.mods || []).map((x) => x.n).join("، ");
      const state = l.state === "sub_pending" ? chip("العميل بيختار البديل", "warn") : l.state === "substituted" ? chip(`اتبدّل بـ ${l.sub ? l.sub.name : ""}`, "info") : l.state === "removed" ? chip("اتشال من الطلب", "neutral") : "";
      const marksHtml = !editable ? (mk ? chip(mk === "ok" ? (l.kind === "menu" ? "اتجهز" : "موجود") : mk === "missing" ? "غير موجود" : "بديل", mk === "ok" ? "ok" : mk === "missing" ? "bad" : "info") : "") :
        l.kind === "menu" ? `<div class="mc-marks one"><button class="${mk === "ok" ? "on ok" : ""}" data-act="mark" data-key="${l.key}" data-m="${mk === "ok" ? "" : "ok"}" aria-pressed="${mk === "ok"}">${ic("check", "ic sm")}${mk === "ok" ? "اتجهز" : "علّم إنه اتجهز"}</button></div>` :
        `<div class="mc-marks"><button class="${mk === "ok" ? "on ok" : ""}" data-act="mark" data-key="${l.key}" data-m="ok" aria-pressed="${mk === "ok"}">${ic("check", "ic sm")}موجود</button><button class="${mk === "missing" ? "on bad" : ""}" data-act="mark" data-key="${l.key}" data-m="missing" aria-pressed="${mk === "missing"}">${ic("x", "ic sm")}غير موجود</button><button class="${mk === "sub" ? "on info" : ""}" data-act="sub-open" data-key="${l.key}" aria-pressed="${mk === "sub"}">${ic("refresh", "ic sm")}بديل</button></div>`;
      return `<div class="mc-check ${mk ? "m-" + mk : ""}"><div class="row top"><span class="mc-qty num">${l.qty}×</span><div class="grow"><b>${esc(l.name)}</b>${l.size || mods ? `<div class="mc-sm muted">${esc(l.kind === "menu" ? mods || "" : l.size)}</div>` : ""}${l.handling && !["normal", "hot"].includes(l.handling) ? `<div>${chip({ chilled: "مبرد", frozen: "مجمد", fragile: "قابل للكسر", separate: "يتغلف لوحده" }[l.handling] || l.handling, "info", l.handling === "frozen" || l.handling === "chilled" ? "snow" : "box")}</div>` : ""}${sub ? `<div class="mc-sm">${ic("refresh", "ic xs")} البديل: <b>${esc(sub.ar)}</b> — العميل هيوافق الأول</div>` : ""}${state ? `<div>${state}</div>` : ""}</div><span class="num mc-sm">${money(l.unitPrice * l.qty)}</span></div>${marksHtml}</div>`;
    }).join("");
    const done = ls.filter((l) => (marks[l.key] || {}).mark).length;
    check = `<section ${editable ? 'data-hl="merch-prep"' : ""}><div class="mc-h"><h3>${editable ? (food ? "جهّز الطلب" : "جهّز الأصناف") : "الأصناف"}</h3>${editable ? `<span class="mc-sm ${done === ls.length ? "ok-t" : "muted"}">${food ? "اختياري · " : ""}علّمت ${done} من ${ls.length}</span>` : ""}</div>${editable && !food ? `<p class="mc-sm muted">علّم كل صنف: موجود، غير موجود، أو اقترح بديل. لو صنف مش موجود العميل هو اللي يقرر يبدّله أو يشيله.</p>` : ""}<div class="mc-checks">${rows}</div></section>`;
  }
  /* rider + handover */
  let rider = "";
  if (["PREPARING", "READY", "HANDED_OVER", "DELIVERED"].includes(f.status) && t) {
    const r = t.riderId && find(TW.S.riders, t.riderId);
    if (["HANDED_OVER", "DELIVERED"].includes(f.status)) rider = `<section class="card mc-ho done"><div class="row">${ic("check", "ic lg")}<div class="grow"><b>اتسلّم للمندوب ${f.handedAt ? clock(f.handedAt) : ""}</b><p class="mc-sm muted">${r ? `${esc(r.ar)} استلم ${num(Math.max(1, (f.packages || []).length))} طرد بكود الاستلام.` : ""} مسؤولية المحل عن الطلب خلصت هنا (سلسلة الحيازة).</p></div></div></section>`;
    else if (!r) rider = `<section class="card mc-ho"><div class="row">${ic("bike", "ic")}<div class="grow"><b>${t.status === "NO_RIDER" ? "الكنترول بيدور على مندوب" : "بندور على أقرب مندوب"}</b><p class="mc-sm muted">${f.status === "READY" ? "خلّي الطلب جاهز جنب الكاشير." : "هنبعت المندوب قبل ما الطلب يخلص بشوية."}</p></div></div></section>`;
    else {
      const km = TW.distKm(r, f), eta = Math.max(1, Math.round(km * 3));
      const here = t.status === "AT_PICKUP";
      const canHand = f.status === "READY" && ["ASSIGNED", "AT_PICKUP"].includes(t.status);
      rider = `<section class="card mc-ho ${here ? "here" : ""}" data-hl="merch-handover"><div class="row"><span class="avatar">${esc(r.ar.slice(0, 1))}</span><div class="grow"><b>${esc(r.ar)}</b><div class="mc-sm muted">${esc(D.vehicles[r.vehicle])}${r.plate && r.plate !== "—" ? ` · <span class="mc-plate">${esc(r.plate)}</span>` : ""} · ${ic("star", "ic xs")} ${num(r.rating, 1)}</div></div>${chip(here ? "وصل عندك" : `جاي · حوالي ${eta} د`, here ? "ok" : "info", here ? "pin" : "bike")}</div>
        <p class="mc-sm">${here ? "المندوب وصل المحل — اطلب منه كود الاستلام اللي في تطبيقه وسلّمه الطرد." : "المندوب جاي يستلم — جهّز الطرد واكتب عليه رقم الطلب."}</p>
        ${canHand ? `<div class="mc-code"><label class="field grow"><span>كود الاستلام من تطبيق المندوب</span><input class="input mono mc-codein" inputmode="numeric" maxlength="4" dir="ltr" placeholder="• • • •" data-model="hoCode" data-enter="handover" data-fo="${f.id}" value="${esc(inst.ui.hoCode || "")}" aria-label="كود الاستلام"></label><button class="btn primary" data-act="handover" data-fo="${f.id}">${ic("hand", "ic sm")}سلّمت الطرد</button></div><p class="mc-sm muted">${ic("info", "ic xs")} الطرد: <span class="mono">${esc(((f.packages || [])[0] || {}).id || f.id + "-P1")}</span> · للعرض التجريبي الكود <span class="mono">${esc(f.pickupCode)}</span></p>` : f.status === "PREPARING" ? `<p class="mc-sm muted">${ic("info", "ic xs")} التسليم للمندوب بيتفتح بعد ما تدوس «جاهز للاستلام».</p>` : ""}</section>`;
    }
  }
  const cust = TW.S.customers.find((c) => c.id === o.customerId) || {};
  const info = `<section class="card flat mc-info"><dl class="kv"><dt>العميل</dt><dd>${esc(firstName(cust.ar))} · ${ic("lock", "ic xs")} الرقم مخفي</dd><dt>التوصيل</dt><dd>${esc(deliveryMode(f, o, t))}</dd><dt>الدفع</dt><dd>${o.pay.method === "cod" ? "كاش مع المندوب — مش هتستلم فلوس" : "مدفوع أونلاين"}</dd>${o.notes ? `<dt>ملاحظات</dt><dd>${esc(o.notes)}</dd>` : ""}<dt>اتطلب</dt><dd>${clock(f.createdAt)}${f.acceptedAt ? ` · اتقبل ${clock(f.acceptedAt)}` : ""}${f.readyAt ? ` · جاهز ${clock(f.readyAt)}` : ""}</dd></dl><p class="mc-sm muted">${ic("help", "ic xs")} محتاج تكلم العميل؟ كلّم دعم توّا وهما يوصلوك — بيانات العميل مش بتظهر للمحل.</p></section>`;
  /* dock */
  let dock = "";
  if (f.status === "PREPARING") {
    const need = !food && ls.some((l) => !(marks[l.key] || {}).mark);
    dock = `<div class="mc-dock"><button class="btn primary lg block" data-act="ready" data-fo="${f.id}" data-hl="merch-ready" ${need ? 'aria-disabled="true"' : ""}>${ic("check", "ic")}<span>جاهز للاستلام</span></button>${need ? `<p class="mc-sm muted c">علّم كل الأصناف الأول</p>` : ""}</div>`;
  }
  return { body: `${hero}${check}${rider}${info}`, dock };
}

/* ================================================================= CATALOGUE */
function catalogView(inst, m) {
  if (isFood(m)) return menuView(inst, m);
  const tab = inst.ui.ctab || "mine";
  const map = TW.S.msku[m.id] || {};
  const myCount = Object.keys(map).length;
  const reqs = TW.S.catReqs.filter((r) => r.merchantId === m.id);
  const tabs = `<div class="mc-tabs" role="tablist"><button role="tab" aria-selected="${tab === "mine"}" class="${tab === "mine" ? "on" : ""}" data-act="ui" data-k="ctab" data-v="mine">منتجاتي<span class="num">${myCount}</span></button><button role="tab" aria-selected="${tab === "add"}" class="${tab === "add" ? "on" : ""}" data-act="ui" data-k="ctab" data-v="add" data-hl="merch-add">${ic("plus", "ic xs")}ضيف منتجات</button><button role="tab" aria-selected="${tab === "reqs"}" class="${tab === "reqs" ? "on" : ""}" data-act="ui" data-k="ctab" data-v="reqs">طلباتي<span class="num">${reqs.length}</span></button></div>`;
  if (tab === "add") return tabs + addView(inst, m, map);
  if (tab === "reqs") return tabs + reqsView(inst, m, reqs);
  return tabs + mineView(inst, m, map);
}
function mineView(inst, m, map) {
  const S = TW.S, tol = S.rules.priceTolerance / 100;
  const q = TW.norm(inst.ui.mq || ""), dept = inst.ui.mdept || "";
  const all = Object.entries(map).map(([id, x]) => ({ s: find(S.skus, id), x })).filter((r) => r.s);
  const off = all.filter((r) => !r.x.available).length, rev = all.filter((r) => r.x.pendingPrice).length;
  const depts = [...new Set(all.map((r) => r.s.dept))];
  const rows = all.filter((r) => (!dept || r.s.dept === dept) && (!q || TW.norm(`${r.s.ar} ${r.s.brand} ${r.s.aliases.join(" ")}`).includes(q))).sort((a, b) => (b.x.pendingPrice ? 1 : 0) - (a.x.pendingPrice ? 1 : 0) || a.s.dept.localeCompare(b.s.dept) || a.s.ar.localeCompare(b.s.ar, "ar"));
  const lim = inst.ui.mlim || 30, stop = !!inst.ui.stopMode, sel = inst.ui.stopSel || {};
  const nSel = Object.keys(sel).filter((k) => sel[k]).length;
  const head = `<div class="mc-sum"><span>${chip(`${all.length - off} شغال`, "ok")} ${chip(`${off} موقوف`, "neutral")} ${rev ? chip(`${rev} قيد المراجعة`, "warn", "clock") : ""}</span></div>
    <div class="mc-bulk"><button class="btn sm" data-act="bulk-open">${ic("door", "ic xs")}فتح الكل</button><button class="btn sm ${stop ? "primary" : ""}" data-act="ui-toggle" data-k="stopMode" aria-pressed="${stop}">${ic("pause", "ic xs")}إيقاف أصناف</button><button class="btn sm" data-act="bulk-price-open">${ic("percent", "ic xs")}تحديث أسعار</button></div>
    <div class="mc-filter"><label class="mc-search">${ic("search", "ic sm")}<input class="input" type="search" placeholder="دوّر في منتجاتك" data-model="mq" data-live value="${esc(inst.ui.mq || "")}" aria-label="بحث في منتجاتي"></label>
      <div class="mc-chips"><button class="${!dept ? "on" : ""}" data-act="ui" data-k="mdept" data-v="">الكل</button>${depts.map((d) => `<button class="${dept === d ? "on" : ""}" data-act="ui" data-k="mdept" data-v="${d}">${esc(deptOf(d).ar)}</button>`).join("")}</div></div>
    ${stop ? `<div class="banner warn">${ic("pause", "ic sm")}<div>اختار الأصناف اللي خلصت عندك، وبعدين دوس «إيقاف». العميل مش هيقدر يطلبها لحد ما تفتحها تاني.</div></div>` : ""}`;
  const list = rows.slice(0, lim).map(({ s, x }) => {
    const dev = (x.price - s.refPrice) / s.refPrice;
    const warn = Math.abs(dev) > tol * 0.66;
    return `<div class="mc-prod ${x.available ? "" : "off"}">${stop ? `<button type="button" class="mc-box ${sel[s.id] ? "on" : ""}" data-act="stop-sel" data-sku="${s.id}" aria-pressed="${!!sel[s.id]}" aria-label="اختيار ${esc(s.ar)}">${ic("check", "ic xs")}</button>` : ""}${tile(s.dept)}
      <div class="grow"><b class="mc-pn">${esc(s.ar)}</b><div class="mc-sm muted">${esc(s.size)} · ${esc(s.brand)}</div>
        ${x.pendingPrice ? `<div class="mc-rev">${ic("clock", "ic xs")} قيد المراجعة: ${money(x.pendingPrice)} — شغال بـ ${money(x.price)} لحد الموافقة</div>` : warn ? `<div class="mc-refw">${ic("alert", "ic xs")} المرجعي ${money(s.refPrice)} (${dev > 0 ? "+" : ""}${Math.round(dev * 100)}%)</div>` : ""}
        <label class="mc-stock"><span>المخزون</span><input class="input num" type="number" inputmode="numeric" min="0" placeholder="—" value="${x.stock == null ? "" : x.stock}" data-change="stock" data-sku="${s.id}" aria-label="مخزون ${esc(s.ar)} (اختياري)"></label></div>
      <div class="mc-pcol"><label class="mc-price"><input class="input num" type="number" inputmode="decimal" min="0" step="0.5" value="${x.price}" data-change="price" data-sku="${s.id}" aria-label="سعر ${esc(s.ar)}"><span>ج.م</span></label>
        <button class="toggle ${x.available ? "on" : ""}" data-act="avail" data-sku="${s.id}" role="switch" aria-checked="${x.available}" aria-label="${x.available ? "متاح" : "موقوف"}: ${esc(s.ar)}"></button></div></div>`;
  }).join("");
  return `${head}<div class="mc-prods">${list || TW.empty("مفيش منتجات بالفلتر ده", "", "search")}</div>${rows.length > lim ? `<button class="btn block" data-act="more" data-k="mlim">عرض ${Math.min(30, rows.length - lim)} كمان (${rows.length - lim} باقي)</button>` : ""}
    ${stop ? `<div class="mc-bar"><span>${nSel} صنف</span><button class="btn danger" data-act="bulk-stop" ${nSel ? "" : "disabled"}>${ic("pause", "ic sm")}إيقاف المحدد</button><button class="btn ghost" data-act="ui-toggle" data-k="stopMode">إلغاء</button></div>` : ""}`;
}
function peersPicks(m, map) {
  const S = TW.S, myDepts = D.typeDepts[m.type] || [];
  const peers = S.merchants.filter((x) => x.id !== m.id && x.status === "active" && x.type !== "restaurant" && (x.type === m.type || (D.typeDepts[x.type] || []).some((d) => myDepts.includes(d))));
  const cnt = {};
  peers.forEach((p) => Object.keys(S.msku[p.id] || {}).forEach((id) => { if (!map[id]) cnt[id] = (cnt[id] || 0) + 1; }));
  return Object.entries(cnt).map(([id, n]) => ({ s: find(S.skus, id), n, v: (S.inv.h1[id] || {}).velocity || 0 })).filter((r) => r.s && myDepts.includes(r.s.dept)).sort((a, b) => b.n - a.n || b.v - a.v).slice(0, 8);
}
function addView(inst, m, map) {
  const S = TW.S, depts = D.typeDepts[m.type] || [];
  const dept = inst.ui.adept || "", cat = inst.ui.acat || "", brand = inst.ui.abrand || "", q = TW.norm(inst.ui.aq || ""), bc = String(inst.ui.abc || "").trim();
  const pool = S.skus.filter((s) => s.active && depts.includes(s.dept) && !map[s.id]);
  const inDept = pool.filter((s) => !dept || s.dept === dept);
  const brands = [...new Set(inDept.filter((s) => !cat || s.cat === cat).map((s) => s.brand))].sort((a, b) => a.localeCompare(b, "ar"));
  const res = inDept.filter((s) => (!cat || s.cat === cat) && (!brand || s.brand === brand) && (!bc || s.barcode.includes(bc)) && (!q || TW.norm(`${s.ar} ${s.en} ${s.brand} ${s.aliases.join(" ")}`).includes(q)));
  const sel = inst.ui.sel || {}; const nSel = Object.keys(sel).filter((k) => sel[k]).length;
  const lim = inst.ui.alim || 24;
  const picks = !q && !bc && !dept ? peersPicks(m, map) : [];
  const card = (s, extra = "") => `<button type="button" class="mc-cat ${sel[s.id] ? "on" : ""}" data-act="sel" data-sku="${s.id}" aria-pressed="${!!sel[s.id]}"><span class="mc-box ${sel[s.id] ? "on" : ""}" aria-hidden="true">${ic("check", "ic xs")}</span>${tile(s.dept)}<span class="grow"><b class="mc-pn">${esc(s.ar)}</b><small>${esc(s.size)} · ${esc(s.brand)}${s.regulated ? " · روشتة" : ""}</small>${extra}</span><span class="num mc-sm">${money(s.refPrice)}</span></button>`;
  return `<div class="banner brand">${ic("sparkle", "ic sm")}<div>مش محتاج تكتب أسماء منتجات — اختار اللي بتبيعه من كتالوج توّا وحط السعر بس.</div></div>
    <div class="mc-filter"><label class="mc-search">${ic("search", "ic sm")}<input class="input" type="search" placeholder="اسم المنتج أو الماركة" data-model="aq" data-live value="${esc(inst.ui.aq || "")}" aria-label="بحث في كتالوج توّا"></label>
      <div class="mc-fgrid"><select class="input" data-model="adept" data-change="adept" aria-label="القسم"><option value="">كل الأقسام</option>${depts.map((d) => `<option value="${d}" ${dept === d ? "selected" : ""}>${esc(deptOf(d).ar)}</option>`).join("")}</select>
        <select class="input" data-model="acat" aria-label="الفئة" ${dept ? "" : "disabled"}><option value="">${dept ? "كل الفئات" : "اختار القسم الأول"}</option>${dept ? (D.cats[dept] || []).map(([id, ar]) => `<option value="${id}" ${cat === id ? "selected" : ""}>${esc(ar)}</option>`).join("") : ""}</select>
        <select class="input" data-model="abrand" aria-label="الماركة"><option value="">كل الماركات</option>${brands.map((b) => `<option ${brand === b ? "selected" : ""}>${esc(b)}</option>`).join("")}</select>
        <div class="mc-bc"><input class="input mono" inputmode="numeric" placeholder="باركود" dir="ltr" data-model="abc" data-live value="${esc(inst.ui.abc || "")}" aria-label="باركود"><button class="btn icon" data-act="scan-bc" aria-label="امسح باركود" title="امسح باركود">${ic("scan", "ic sm")}</button></div></div></div>
    ${picks.length ? `<section class="mc-recs"><div class="mc-h"><h3>${ic("trend", "ic sm")} أصناف محلات زيك بتبيعها وانت لسه مضفتهاش</h3></div><div class="mc-cats">${picks.map(({ s, n }) => card(s, `<em class="mc-peer">${n > 0 ? `بيبيعه ${n} ${n > 2 ? "محلات" : "محل"} في منطقتك` : "مطلوب في منطقتك"}</em>`)).join("")}</div></section>` : ""}
    <div class="mc-h"><h3>كتالوج توّا</h3><span class="mc-sm muted">${num(res.length)} صنف</span></div>
    <div class="mc-cats">${res.slice(0, lim).map((s) => card(s)).join("") || TW.empty("مش لاقيين المنتج ده في الكتالوج", "اطلب إضافته وفريق توّا هيضيفه بالاسم الصح", "search")}</div>
    ${res.length > lim ? `<button class="btn block" data-act="more" data-k="alim">عرض ${Math.min(24, res.length - lim)} كمان</button>` : ""}
    <div class="card flat mc-miss"><div class="grow"><b>مش لاقي المنتج؟</b><p class="mc-sm muted">ابعتلنا اسمه وفريق الكتالوج يضيفه بالاسم والصورة الصح ويبلغك.</p></div><button class="btn" data-act="req-open" data-hl="merch-missing">${ic("plus", "ic sm")}اطلب إضافته</button></div>
    ${nSel ? `<div class="mc-bar"><span><b class="num">${nSel}</b> صنف متختار</span><button class="btn primary" data-act="add-open">${ic("plus", "ic sm")}إضافة لمحلي</button><button class="btn ghost" data-act="sel-clear">مسح</button></div>` : ""}`;
}
function reqsView(inst, m, reqs) {
  const st = { PENDING: ["قيد المراجعة", "warn"], APPROVED: ["اتضاف للكتالوج", "ok"], LINKED: ["اتربط بصنف موجود", "ok"], REJECTED: ["اترفض", "bad"] };
  return `<div class="card flat mc-miss"><div class="grow"><b>مش لاقي المنتج؟</b><p class="mc-sm muted">فريق الكتالوج بيراجع الطلب ويضيف المنتج بالاسم الصح عشان العميل يلاقيه في البحث.</p></div><button class="btn primary" data-act="req-open" data-hl="merch-missing">${ic("plus", "ic sm")}اطلب إضافته</button></div>
    <div class="mc-list">${reqs.map((r) => { const [l, t] = st[r.status] || [r.status, "neutral"]; return `<div class="mc-orow static"><span class="mc-oi">${ic("doc", "ic sm")}</span><span class="grow"><b>${esc(r.name)}</b><small><span class="mono">${esc(r.id)}</span> · ${r.barcode ? `باركود <span class="mono">${esc(r.barcode)}</span> · ` : ""}${r.photo ? "بصورة · " : ""}<span data-ago="${r.at}">${ago(r.at)}</span></small></span>${chip(l, t)}</div>`; }).join("") || TW.empty("لسه مطلبتش منتجات", "", "doc")}</div>`;
}
function menuView(inst, m) {
  const items = TW.S.menus[m.id] || [];
  const off = items.filter((i) => !i.available).length;
  const cats = TW.groupBy(items, (i) => i.cat);
  return `<div class="mc-sum">${chip(`${items.length - off} متاح`, "ok")} ${chip(`${off} موقوف`, "neutral")} ${chip(`تجهيز ${m.prep + (m.busyExtra || 0)} د`, m.busyExtra ? "warn" : "info", "clock")}</div>
    <div class="banner">${ic("info", "ic sm")}<div>خلص صنف؟ اقفله من هنا في ثانية والعميل مش هيقدر يطلبه. وقت التجهيز بيزيد ${m.busyExtra || 10} دقايق تلقائي لما تشغّل «زحمة».</div></div>
    ${Object.entries(cats).map(([c, its]) => `<section><div class="mc-h"><h3>${esc(c)}</h3><span class="mc-sm muted">${its.length} صنف</span></div><div class="mc-prods">${its.map((it) => `<div class="mc-prod ${it.available ? "" : "off"}">${tile("food")}<div class="grow"><b class="mc-pn">${esc(it.name)}</b><div class="mc-sm muted">${it.desc ? esc(it.desc) + " · " : ""}${it.mods && it.mods.length ? `${it.mods.length} اختيارات · ` : ""}تجهيز ~${it.prep || m.prep} د</div></div><div class="mc-pcol"><b class="num">${money(it.price)}</b><button class="toggle ${it.available ? "on" : ""}" data-act="menu-toggle" data-id="${it.id}" role="switch" aria-checked="${it.available}" aria-label="${it.available ? "متاح" : "موقوف"}: ${esc(it.name)}"></button></div></div>`).join("")}</div></section>`).join("")}
    <p class="lock">${ic("lock", "ic xs")} الأسعار والإضافات بتتعدل مع مدير حسابك في توّا عشان تفضل مطابقة للي العميل شايفه.</p>`;
}

/* ================================================================= FINANCE */
function financeView(inst, m) {
  const S = TW.S, sts = S.msettle.filter((s) => s.merchantId === m.id);
  const td = TW.merchantToday(m.id);
  const due = TW.sum(sts.filter((s) => s.status === "DUE"), (s) => s.net), paid = sts.filter((s) => s.status === "PAID").sort((a, b) => b.paidAt - a.paidAt)[0];
  if (!sts.length) return `${TW.empty("لسه مفيش كشوف حساب", m.status === "active" ? "أول كشف بيطلع بعد أول أسبوع بيع." : "الكشوف بتبدأ بعد تفعيل المحل وأول طلب.", "wallet")}`;
  let firstWhy = true;
  const lineRow = (st, l) => { const hl = firstWhy && l.amount < 0; if (hl) firstWhy = false; return `<div class="mc-fl ded"><span class="grow">${esc({ responsibility: "خصم مسؤولية", promo: "عرض ممول منك", penalty: "غرامة", adjust: "تسوية" }[l.kind] || "خصم")}<small>${esc(l.order)} · ${esc(l.event)}</small>${l.status === "disputed" ? `<small>${chip("اعتراضك قيد المراجعة", "warn", "clock")}</small>` : l.status === "resolved" ? `<small>${chip("اتراجع", "ok")}</small>` : ""}</span><span class="num neg">${money(l.amount)}</span><button class="btn sm mc-why" data-act="why" data-st="${st.id}" data-line="${l.id}" ${hl ? 'data-hl="merch-why"' : ""}>${ic("help", "ic xs")}ليه اتخصم المبلغ ده؟</button></div>`; };
  const stCard = (st) => `<article class="card mc-st"><div class="hd"><h3>${esc(st.period)}</h3>${st.status === "PAID" ? chip("اتحوّل", "ok", "check") : chip("مستحق", "warn", "clock")}</div>
    <div class="mc-sm muted">${TW.dateAr(st.from)} – ${TW.dateAr(st.to)}${st.paidAt ? ` · اتحوّل ${TW.dateAr(st.paidAt)} · <span class="mono">${esc(st.ref)}</span>` : " · التحويل يوم الأحد الجاي"}</div>
    <div class="mc-fls"><div class="mc-fl"><span class="grow">المبيعات</span><span class="num">${money(st.sales)}</span></div>
      <div class="mc-fl ded"><span class="grow">عمولة توّا (${pct(m.commission)})<small>حسب العقد</small></span><span class="num neg">${money(-st.commission)}</span><button class="btn sm mc-why ghost" data-act="why" data-st="${st.id}" data-line="_comm">${ic("help", "ic xs")}ليه؟</button></div>
      ${st.refunds ? `<div class="mc-fl ded"><span class="grow">مرتجعات على المحل<small>أصناف اترجعت فلوسها للعميل</small></span><span class="num neg">${money(-st.refunds)}</span><button class="btn sm mc-why ghost" data-act="why" data-st="${st.id}" data-line="_ref">${ic("help", "ic xs")}ليه؟</button></div>` : ""}
      ${st.lines.map((l) => lineRow(st, l)).join("")}
      <div class="mc-fl net"><span class="grow">صافي ليك</span><b class="num">${money(st.net)}</b></div></div>
    <button class="btn sm" data-act="stmt" data-st="${st.id}">${ic("doc", "ic xs")}كشف الحساب</button></article>`;
  const ded = TW.sum(sts, (s) => TW.sum(s.lines.filter((l) => l.amount < 0), (l) => -l.amount));
  return `<section class="mc-money"><div class="mc-big"><span>مستحق لك دلوقتي</span><b class="num">${money(due)}</b><small>بيتحوّل كل أحد على ${esc(m.payout || "إنستاباي")}</small></div>
      <div class="mc-mini"><div><span>مبيعات النهارده</span><b class="num">${money(td.sales)}</b></div><div><span>آخر تحويل</span><b class="num">${paid ? money(paid.net) : "—"}</b></div><div><span>خصومات الأسبوعين</span><b class="num">${money(ded)}</b></div></div></section>
    <div class="banner">${ic("shield", "ic sm")}<div>كل جنيه بيتخصم ليه سبب ودليل. دوس «ليه اتخصم المبلغ ده؟» تشوف الطلب والدليل والسياسة، ولو مش موافق اعترض من نفس المكان.</div></div>
    ${sts.sort((a, b) => b.to - a.to).map(stCard).join("")}`;
}

/* ================================================================= ACCOUNT */
function accountView(inst, m) {
  const z = find(TW.S.zones, m.zoneId) || {};
  const am = TW.S.users.find((u) => u.role === "merchops") || { ar: "عمليات التجار" };
  const perf = [["القبول", m.acceptRate, 0.95], ["التجهيز في الوقت", m.prepOnTime, 0.9], ["دقة التوفر", m.availAcc, 0.95], ["بدون شكاوى", 1 - m.complaintRate, 0.97]];
  return `<section class="card mc-prof"><div class="row"><span class="mc-av lg">${ic(isFood(m) ? "food" : "store", "ic")}</span><div class="grow"><h3>${esc(m.ar)}</h3><div class="mc-sm muted">${esc(typeAr(m))} · ${esc(z.ar || "")}${m.since ? ` · على توّا من ${esc(m.since)}` : ""}</div></div>${chip(...(m.status === "active" ? (healthMeta[m.health] || healthMeta.healthy).slice(0, 2) : ["بانتظار التفعيل", "warn"]))}</div>
      <dl class="kv"><dt>صاحب المحل</dt><dd>${esc(m.owner || "—")}</dd><dt>الموبايل</dt><dd class="mono">${esc(m.phone || "—")}</dd><dt>العنوان</dt><dd>${esc(m.landmark || "—")} · ${esc(z.ar || "")}</dd><dt>المواعيد</dt><dd>${esc(m.hours || z.hours || "—")}</dd>${m.license ? `<dt>الترخيص</dt><dd>${esc(m.license)}</dd>` : ""}</dl></section>
    <section class="card"><h3>${ic("wallet", "ic sm")} التسوية والعمولة</h3><dl class="kv"><dt>طريقة التحويل</dt><dd>${esc(m.payout || "إنستاباي")} · <span class="mono">••• ${esc(String(m.phone || "0000").replace(/\D/g, "").slice(-4))}</span></dd><dt>ميعاد التحويل</dt><dd>كل أحد عن الأسبوع اللي فات</dd><dt>العمولة</dt><dd>${pct(m.commission)} من قيمة الأصناف</dd><dt>العروض</dt><dd>العروض الممولة منك بس اللي بتوافق عليها كتابة</dd></dl>
      <p class="lock" style="margin-top:8px">${ic("lock", "ic xs")} العمولة وشروط التسوية بتتغير من توّا بس — لو عندك سؤال كلّم مدير حسابك.</p></section>
    <section class="card"><h3>${ic("trend", "ic sm")} أداء المحل (آخر 7 أيام)</h3>${perf.map(([l, v, tgt]) => `<div class="mc-perf"><span>${l}</span><span class="grow">${TW.meter(v, 1, v >= tgt ? "ok" : v >= tgt - 0.08 ? "warn" : "bad")}</span><b class="num">${pct(v)}</b></div>`).join("")}<p class="mc-sm muted">الهدف: قبول 95% · تجهيز في الوقت 90% · توفر 95%.</p></section>
    <section class="card"><h3>${ic("users", "ic sm")} الفريق</h3><div class="list"><div class="li"><span class="avatar">${esc((m.owner || "؟").slice(0, 1))}</span><span class="grow"><b>${esc(m.owner || "—")}</b><small class="muted"> · صاحب المحل — كل الصلاحيات</small></span></div></div><p class="lock">${ic("lock", "ic xs")} إضافة كاشير أو موظف بتتم مع مدير حسابك عشان نأمّن الحساب.</p></section>
    <section class="card"><h3>${ic("help", "ic sm")} الدعم</h3><dl class="kv"><dt>مدير حسابك</dt><dd>${esc(am.ar)} — عمليات التجار</dd><dt>خط التجار</dt><dd class="mono">19 882</dd><dt>المواعيد</dt><dd>كل يوم 8 ص – 12 م</dd></dl></section>
    <button class="btn block" data-act="go" data-to="/merchant/register">${ic("store", "ic sm")}سجّل محل جديد على توّا</button>`;
}

/* ================================================================= ONBOARDING (section 14) */
const REG_STEPS = ["رقم الموبايل", "اسم المحل", "نوع النشاط", "المكان", "التواصل", "المواعيد", "التحويلات", "المستندات", "الاتفاق والعمولة", "الأقسام", "تم الإرسال"];
const HOURS = ["7 ص", "8 ص", "9 ص", "10 ص", "11 ص", "12 م", "4 م", "6 م", "8 م", "10 م", "11 م", "12 ص", "2 ص"];
const PAYOUT = ["إنستاباي", "فودافون كاش", "حساب بنكي"];
const docsFor = (type) => [["cr", "السجل التجاري"], ["tax", "البطاقة الضريبية"], ["nid", "بطاقة الرقم القومي لصاحب المحل"], ...(type === "pharmacy" ? [["lic", "ترخيص الصيدلية"]] : type === "restaurant" ? [["health", "الشهادة الصحية"]] : [])];
const commissionFor = (type) => (type === "restaurant" ? 0.17 : type === "pharmacy" ? 0.1 : 0.11);
function regView(inst) {
  const u = inst.ui, step = u.rstep || 0, S = TW.S;
  const v = (k, d = "") => esc(u[k] == null ? d : u[k]);
  let body = "";
  if (step === 0) body = `<p>هنبعتلك كود على الموبايل عشان نتأكد إنه رقمك.</p><label class="field"><span>رقم الموبايل</span><input class="input mono" inputmode="tel" dir="ltr" placeholder="01x xxxx xxxx" data-model="r_phone" value="${v("r_phone")}"></label>
    ${u.r_sent ? `<label class="field"><span>الكود اللي وصلك</span><input class="input mono mc-codein" inputmode="numeric" maxlength="4" dir="ltr" placeholder="• • • •" data-model="r_otp" value="${v("r_otp")}"></label><p class="mc-sm muted">${ic("info", "ic xs")} للعرض التجريبي الكود <span class="mono">2468</span></p>` : ""}`;
  if (step === 1) body = `<label class="field"><span>اسم المحل زي ما مكتوب على اليافطة</span><input class="input" data-model="r_name" value="${v("r_name")}" placeholder="مثلاً: بقالة الخير"></label>`;
  if (step === 2) body = `<p class="mc-sm muted">اختار أقرب نوع لنشاطك — ده بيحدد الأقسام اللي تقدر تبيع منها.</p><div class="mc-types">${Object.entries(D.merchantTypes).map(([k, l]) => `<button class="${u.r_type === k ? "on" : ""}" data-act="ui" data-k="r_type" data-v="${k}" aria-pressed="${u.r_type === k}">${esc(l)}</button>`).join("")}</div>`;
  if (step === 3) body = `<label class="field"><span>المنطقة</span><select class="input" data-model="r_zone">${S.zones.map((z) => `<option value="${z.id}" ${u.r_zone === z.id ? "selected" : ""}>${esc(z.ar)}${z.active ? "" : " (قريباً)"}</option>`).join("")}</select></label><label class="field"><span>علامة مميزة للمحل</span><input class="input" data-model="r_landmark" value="${v("r_landmark")}" placeholder="مثلاً: أمام مسجد الرحمن"></label><button class="btn sm ${u.r_gps ? "primary" : ""}" data-act="ui-toggle" data-k="r_gps" aria-pressed="${!!u.r_gps}">${ic("locate", "ic xs")}${u.r_gps ? "اتحدد موقع المحل ✓" : "حدد موقعي الحالي"}</button>`;
  if (step === 4) body = `<label class="field"><span>اسم صاحب المحل</span><input class="input" data-model="r_owner" value="${v("r_owner")}"></label><label class="field"><span>موبايل للتواصل مع المحل</span><input class="input mono" inputmode="tel" dir="ltr" data-model="r_cphone" value="${v("r_cphone", u.r_phone || "")}"></label>`;
  if (step === 5) body = `<div class="grid g2"><label class="field"><span>بيفتح</span><select class="input" data-model="r_from">${HOURS.map((h) => `<option ${(u.r_from || "9 ص") === h ? "selected" : ""}>${h}</option>`).join("")}</select></label><label class="field"><span>بيقفل</span><select class="input" data-model="r_to">${HOURS.map((h) => `<option ${(u.r_to || "12 ص") === h ? "selected" : ""}>${h}</option>`).join("")}</select></label></div><label class="row"><input type="checkbox" data-model="r_fri" ${u.r_fri ? "checked" : ""}> <span>مقفول الجمعة وقت الصلاة</span></label>`;
  if (step === 6) body = `<p class="mc-sm muted">فلوسك بتتحوّل كل أحد على الطريقة دي.</p><div class="mc-types">${PAYOUT.map((p) => `<button class="${(u.r_pay || PAYOUT[0]) === p ? "on" : ""}" data-act="ui" data-k="r_pay" data-v="${p}">${p}</button>`).join("")}</div><label class="field"><span>${(u.r_pay || PAYOUT[0]) === "حساب بنكي" ? "رقم الحساب (IBAN)" : "رقم الموبايل المسجّل"}</span><input class="input mono" dir="ltr" data-model="r_acct" value="${v("r_acct")}"></label>`;
  if (step === 7) body = `<p class="mc-sm muted">صوّر المستند بالموبايل — مش محتاج سكانر.</p><div class="mc-docs">${docsFor(u.r_type).map(([k, l]) => `<div class="mc-doc ${u["r_doc_" + k] ? "ok" : ""}"><span class="grow">${ic(u["r_doc_" + k] ? "check" : "doc", "ic sm")} ${l}</span><button class="btn sm" data-act="reg-doc" data-doc="${k}">${ic("camera", "ic xs")}${u["r_doc_" + k] ? "اتصوّر — غيّر" : "صوّر"}</button></div>`).join("")}</div>`;
  if (step === 8) body = `<div class="card flat"><dl class="kv"><dt>العمولة</dt><dd>${pct(commissionFor(u.r_type))} من قيمة الأصناف</dd><dt>التسوية</dt><dd>أسبوعية — كل أحد</dd><dt>التوصيل</dt><dd>مناديب توّا — مش محتاج مندوب</dd><dt>الخصومات</dt><dd>بسبب ودليل وتقدر تعترض عليها</dd></dl></div><p class="lock">${ic("lock", "ic xs")} العمولة وشروط التسوية بتتحدد من توّا ومش بتتغير من التطبيق.</p><label class="row"><input type="checkbox" data-model="r_agree" ${u.r_agree ? "checked" : ""}> <span>قريت الشروط وموافق عليها</span></label>`;
  if (step === 9) { const ds = D.typeDepts[u.r_type] || []; body = ds.length ? `<p class="mc-sm muted">الأقسام اللي هتبيع فيها من كتالوج توّا:</p><div class="mc-types">${ds.map((d) => { const on = !(u.r_cats || {})[d]; return `<button class="${on ? "on" : ""}" data-act="reg-cat" data-d="${d}" aria-pressed="${on}">${ic(deptOf(d).icon, "ic xs")} ${esc(deptOf(d).ar)}</button>`; }).join("")}</div>` : `<div class="banner">${ic("food", "ic sm")}<div>${u.r_type === "restaurant" ? "المطاعم بتشتغل بمنيو — فريق توّا هيرفع المنيو بالصور والأسعار معاك." : "فريق توّا هيربط نشاطك بالأقسام المناسبة."}</div></div>`; }
  if (step === 10) { const nm = find(S.merchants, u.r_done); const ap = nm && S.approvals.find((a) => a.type === "merchant_activation" && a.ref && a.ref.id === nm.id); body = `<div class="mc-done">${ic("check", "ic xl")}<h3>طلبك وصل!</h3><p>«${esc(nm ? nm.ar : u.r_name)}» بقى في مرحلة المراجعة. هنكلمك خلال يوم عمل نأكد البيانات ونجهّز الكتالوج معاك.</p>${ap ? chip(`طلب التفعيل ${ap.id} · ${ap.status === "PENDING" ? "قيد المراجعة" : ap.status === "APPROVED" ? "اتوافق" : "اترفض"}`, ap.status === "APPROVED" ? "ok" : "warn", "clock") : ""}</div><button class="btn primary block" data-act="reg-enter">${ic("store", "ic sm")}ادخل بحساب المحل الجديد</button>`; }
  const pctDone = Math.round((step / (REG_STEPS.length - 1)) * 100);
  return `<div class="mc-wiz"><div class="row between"><b>${step + 1}. ${REG_STEPS[step]}</b><span class="mc-sm muted">${step + 1} من ${REG_STEPS.length}</span></div>${TW.meter(pctDone, 100, "brand")}</div><section class="card mc-regb">${body}</section>`;
}
function regDock(inst) {
  const step = inst.ui.rstep || 0;
  if (step === 10) return "";
  const label = step === 0 ? (inst.ui.r_sent ? "تأكيد الكود" : "ابعت الكود") : step === 9 ? "ابعت الطلب" : "التالي";
  return `<div class="mc-dock row">${step > 0 ? `<button class="btn lg" data-act="reg-back">${ic("chevS", "ic sm")}رجوع</button>` : ""}<button class="btn primary lg grow" data-act="reg-next">${esc(label)}${ic("chevE", "ic sm")}</button></div>`;
}

/* ================================================================= SHEETS */
function sheetView(inst, m) {
  const sh = inst.ui.sheet; if (!sh) return "";
  const S = TW.S;
  if (sh.kind === "reject") {
    const f = find(S.fos, sh.foId), o = f && orderOf(f); if (!f) return "";
    return TW.sheet(`مش هتقدر تنفّذ ${o ? o.id : ""}؟`, `<p class="mc-sm">اختار السبب — ده بيساعدنا نحوّل الطلب لمحل تاني بسرعة.</p><div class="mc-reasons" role="radiogroup">${TW.REASONS.merchantReject.map((r) => `<button role="radio" aria-checked="${inst.ui.rejReason === r}" class="${inst.ui.rejReason === r ? "on" : ""}" data-act="ui" data-k="rejReason" data-v="${esc(r)}">${esc(r)}</button>`).join("")}</div><div class="banner warn">${ic("alert", "ic sm")}<div>الرفض بيقلل نسبة القبول (${pct(f && find(S.merchants, f.sourceId).acceptRate)}) وبيأثر على ترتيب محلك. لو المحل زحمة شغّل «زحمة» بدل الرفض.</div></div>`, `<button class="btn danger lg grow" data-act="reject" data-fo="${f.id}" ${inst.ui.rejReason ? "" : "disabled"}>تأكيد الرفض</button><button class="btn lg" data-act="sheet-close">رجوع</button>`);
  }
  if (sh.kind === "close") return TW.sheet("تقفل المحل وعندك طلبات شغالة؟", `<div class="banner bad">${ic("alert", "ic sm")}<div>عندك <b>${sh.count}</b> طلبات لسه شغالة. القفل بيوقف الطلبات الجديدة بس — لازم تكمّل الطلبات اللي قبلتها وتسلّمها للمندوب.</div></div><p class="mc-sm muted">لو المحل زحمة بس، «زحمة» أحسن: بتزوّد وقت التجهيز من غير ما توقف البيع.</p>`, `<button class="btn danger grow" data-act="mode-force">اقفل برضه</button><button class="btn" data-act="mode-busy">خليه «زحمة»</button><button class="btn ghost" data-act="sheet-close">رجوع</button>`);
  if (sh.kind === "sub") {
    const f = find(S.fos, sh.foId), o = orderOf(f), l = o.lines.find((x) => x.key === sh.key), s = find(S.skus, l.skuId);
    const map = S.msku[m.id] || {};
    const cands = S.skus.filter((x) => x.id !== s.id && map[x.id] && map[x.id].available && ((s.subGroup && x.subGroup === s.subGroup) || x.sub === s.sub)).slice(0, 8);
    return TW.sheet(`بديل لـ ${s.ar}`, cands.length ? `<p class="mc-sm muted">أصناف من نفس النوع موجودة في محلك. العميل هيوافق على البديل قبل ما الطلب يخرج.</p><div class="mc-list">${cands.map((x) => { const p = map[x.id].price, d = p - l.unitPrice; return `<button class="mc-orow" data-act="sub-pick" data-sku="${x.id}">${tile(x.dept)}<span class="grow"><b>${esc(x.ar)}</b><small>${esc(x.size)} · ${esc(x.brand)}${x.subGroup && x.subGroup === s.subGroup ? " · نفس المجموعة" : ""}</small></span><span class="num mc-sm">${money(p)}<br><small class="${d > 0 ? "neg" : "ok-t"}">${d > 0 ? "+" : ""}${num(d, 1)}</small></span></button>`; }).join("")}</div>` : `<div class="banner warn">${ic("info", "ic sm")}<div>مفيش بديل معتمد من نفس النوع في محلك. علّم الصنف «غير موجود» والعميل هيختار.</div></div>`, `<button class="btn" data-act="sheet-close">رجوع</button>`);
  }
  if (sh.kind === "add") {
    const ids = Object.keys(inst.ui.sel || {}).filter((k) => inst.ui.sel[k]);
    const tol = S.rules.priceTolerance / 100;
    const rows = ids.map((id) => { const s = find(S.skus, id); const p = Number(inst.ui["ap_" + id] == null ? s.refPrice : inst.ui["ap_" + id]); const out = Math.abs(p - s.refPrice) / s.refPrice > tol; const av = inst.ui["aa_" + id] !== false; return `<div class="mc-addrow ${out ? "out" : ""}"><div class="row">${tile(s.dept)}<span class="grow"><b class="mc-pn">${esc(s.ar)}</b><small class="muted">${esc(s.size)} · المرجعي ${money(s.refPrice)}</small></span><button class="toggle ${av ? "on" : ""}" data-act="add-avail" data-sku="${id}" role="switch" aria-checked="${av}" aria-label="متاح"></button></div><div class="row"><label class="mc-price"><input class="input num" type="number" inputmode="decimal" data-model="ap_${id}" data-live value="${esc(inst.ui["ap_" + id] == null ? s.refPrice : inst.ui["ap_" + id])}" aria-label="سعر ${esc(s.ar)}"><span>ج.م</span></label><label class="mc-stock"><span>المخزون</span><input class="input num" type="number" inputmode="numeric" placeholder="اختياري" data-model="as_${id}" value="${esc(inst.ui["as_" + id] || "")}" aria-label="مخزون (اختياري)"></label></div>${out ? `<div class="mc-rev">${ic("alert", "ic xs")} السعر بعيد عن المرجعي بأكتر من ${S.rules.priceTolerance}% — هيروح لمراجعة توّا قبل ما يظهر</div>` : ""}</div>`; }).join("");
    return TW.sheet(`إضافة ${ids.length} صنف لمحلك`, `<p class="mc-sm muted">الاسم والصورة والقسم جاهزين من كتالوج توّا. انت بس حط السعر واختار متاح ولا لأ.</p>${rows}`, `<button class="btn primary lg grow" data-act="add-confirm">${ic("check", "ic sm")}أضف ${ids.length} صنف</button><button class="btn lg" data-act="sheet-close">رجوع</button>`);
  }
  if (sh.kind === "added") return TW.sheet("اتضافوا لمحلك", `<div class="mc-done">${ic("check", "ic xl")}<h3>${sh.added} صنف بقوا في محلك</h3>${sh.flagged.length ? `<div class="banner warn">${ic("clock", "ic sm")}<div><b>${sh.flagged.length} صنف قيد المراجعة</b> عشان سعرهم بعيد عن السعر المرجعي: ${sh.flagged.map(esc).join("، ")}. هيظهروا للعملاء بعد موافقة توّا.</div></div>` : `<p class="muted">العملاء يقدروا يطلبوهم دلوقتي.</p>`}</div>`, `<button class="btn primary grow" data-act="sheet-close">تمام</button><button class="btn" data-act="cat-go" data-tab="add">ضيف تاني</button>`);
  if (sh.kind === "bulkPrice") {
    const map = S.msku[m.id] || {}; const depts = [...new Set(Object.keys(map).map((id) => (find(S.skus, id) || {}).dept).filter(Boolean))];
    const dept = inst.ui.bpDept || depts[0], p = Number(inst.ui.bpPct || 5);
    const tol = S.rules.priceTolerance / 100;
    const items = Object.entries(map).map(([id, x]) => ({ s: find(S.skus, id), x })).filter((r) => r.s && r.s.dept === dept);
    const prev = items.map(({ s, x }) => { const np = Math.round(x.price * (1 + p / 100) * 2) / 2; const out = Math.abs(np - s.refPrice) / s.refPrice > tol || (np - x.price) / x.price > 0.25; return { s, x, np, out }; });
    const nOut = prev.filter((r) => r.out).length;
    return TW.sheet("تحديث أسعار قسم كامل", `<label class="field"><span>القسم</span><select class="input" data-model="bpDept">${depts.map((d) => `<option value="${d}" ${d === dept ? "selected" : ""}>${esc(deptOf(d).ar)}</option>`).join("")}</select></label><div class="lbl">نسبة التغيير</div><div class="mc-types">${[-10, -5, 5, 10].map((v) => `<button class="${p === v ? "on" : ""}" data-act="ui" data-k="bpPct" data-v="${v}">${v > 0 ? "+" : ""}${v}%</button>`).join("")}</div>
      <div class="mc-list">${prev.slice(0, 6).map((r) => `<div class="mc-fl"><span class="grow">${esc(r.s.ar)}</span><span class="num mc-sm muted">${money(r.x.price)} ←</span><b class="num">${money(r.np)}</b>${r.out ? chip("مراجعة", "warn") : ""}</div>`).join("")}${prev.length > 6 ? `<p class="mc-sm muted">+ ${prev.length - 6} صنف كمان</p>` : ""}</div>${nOut ? `<div class="banner warn">${ic("clock", "ic sm")}<div>${nOut} صنف هيروحوا مراجعة عشان بعيد عن السعر المرجعي، والباقي يتغير فوراً.</div></div>` : ""}`, `<button class="btn primary grow" data-act="bulk-price" ${items.length ? "" : "disabled"}>طبّق على ${items.length} صنف</button><button class="btn" data-act="sheet-close">رجوع</button>`);
  }
  if (sh.kind === "req") {
    const depts = D.typeDepts[m.type] || D.depts.map((d) => d.id);
    return TW.sheet("اطلب إضافة منتج", `<p class="mc-sm muted">فريق الكتالوج هيضيف المنتج بالاسم والصورة والقسم الصح ويبلغك — عشان العميل يلاقيه في البحث ومفيش تكرار.</p>
      <label class="field"><span>اسم المنتج زي ما مكتوب على العلبة</span><input class="input" data-model="rq_name" value="${esc(inst.ui.rq_name || "")}" placeholder="مثلاً: جبنة بيضا دومتي 1 كجم"></label>
      <label class="field"><span>الباركود (اختياري)</span><div class="mc-bc"><input class="input mono" dir="ltr" inputmode="numeric" data-model="rq_bc" value="${esc(inst.ui.rq_bc || "")}"><button class="btn icon" data-act="rq-scan" aria-label="امسح الباركود">${ic("scan", "ic sm")}</button></div></label>
      <label class="field"><span>تخمينك للقسم</span><select class="input" data-model="rq_cat">${depts.flatMap((d) => (D.cats[d] || []).map(([c, ar]) => `<option value="${d}/${c}" ${inst.ui.rq_cat === `${d}/${c}` ? "selected" : ""}>${esc(deptOf(d).ar)} › ${esc(ar)}</option>`)).join("")}</select></label>
      <div class="row between"><span>${ic("camera", "ic sm")} صورة المنتج</span><button class="toggle ${inst.ui.rq_photo ? "on" : ""}" data-act="ui-toggle" data-k="rq_photo" role="switch" aria-checked="${!!inst.ui.rq_photo}" aria-label="إرفاق صورة"></button></div>`, `<button class="btn primary grow" data-act="req-send">${ic("check", "ic sm")}ابعت الطلب</button><button class="btn" data-act="sheet-close">رجوع</button>`);
  }
  if (sh.kind === "why") {
    const st = find(S.msettle, sh.st); if (!st) return "";
    let l = st.lines.find((x) => x.id === sh.line);
    if (sh.line === "_comm") l = { synthetic: true, amount: -st.commission, order: `${num(st.sales)} ج.م مبيعات`, event: `عمولة توّا ${pct(m.commission)} على مبيعات ${st.period}`, evidence: "كل الطلبات اللي اتسلّمت في الفترة — تفاصيلها في كشف الحساب", policy: `العقد الموقّع مع توّا: عمولة ${pct(m.commission)} من قيمة الأصناف بعد الخصومات الممولة من توّا` };
    if (sh.line === "_ref") l = { synthetic: true, amount: -st.refunds, order: "مرتجعات الفترة", event: "أصناف اترجعت فلوسها للعميل وكانت مسؤولية المحل", evidence: "سجل التجهيز (موجود/غير موجود) ومسح الطرد عند الاستلام", policy: "سياسة المسؤولية: الصنف الناقص أو الغلط بعد تأكيد المحل يتحمله المحل" };
    if (!l) return "";
    const disp = l.status === "disputed";
    return TW.sheet("ليه اتخصم المبلغ ده؟", `<div class="mc-whyamt"><b class="num neg">${money(l.amount)}</b><span>${esc(st.period)}</span></div>
      <div class="steps">${[["الطلب", l.order, "receipt"], ["إيه اللي حصل", l.event, "info"], ["الدليل", l.evidence, "eye"], ["السياسة", l.policy, "book"]].map(([k, t, i]) => `<div class="st done"><span class="bul">${ic(i, "ic xs")}</span><div><b class="mc-sm">${k}</b><div>${esc(t)}</div></div></div>`).join("")}</div>
      ${l.synthetic ? `<p class="lock">${ic("lock", "ic xs")} ${sh.line === "_comm" ? "العمولة حسب العقد ومش قابلة للاعتراض من التطبيق — كلّم مدير حسابك." : "لو في مرتجع مش مقتنع بيه، كلّم خط التجار برقم الطلب."}</p>`
        : disp ? `<div class="banner warn">${ic("clock", "ic sm")}<div><b>اعتراضك اتسجّل</b>${l.dispute ? ` <span data-ago="${l.dispute.at}">${ago(l.dispute.at)}</span> — «${esc(l.dispute.note || "")}»` : ""}. فريق المالية هيرد خلال 48 ساعة والمبلغ مش هيتخصم نهائي قبل القرار.</div></div>`
        : `<hr class="sep"><b>مش موافق؟ اعترض</b><div class="mc-reasons" role="radiogroup">${DISPUTE_REASONS.map((r) => `<button role="radio" aria-checked="${inst.ui.dpReason === r}" class="${inst.ui.dpReason === r ? "on" : ""}" data-act="ui" data-k="dpReason" data-v="${esc(r)}">${esc(r)}</button>`).join("")}</div><label class="field"><span>ملاحظة (اختياري)</span><textarea class="input" data-model="dpNote" rows="2">${esc(inst.ui.dpNote || "")}</textarea></label>`}`,
      l.synthetic || disp ? `<button class="btn grow" data-act="sheet-close">تمام</button>` : `<button class="btn primary grow" data-act="dispute" data-st="${st.id}" data-line="${l.id}" ${inst.ui.dpReason ? "" : "disabled"}>${ic("flag", "ic sm")}اعترض</button><button class="btn" data-act="sheet-close">مقتنع</button>`);
  }
  if (sh.kind === "stmt") {
    const st = find(S.msettle, sh.st); if (!st) return "";
    const rows = [["المبيعات", st.sales], [`عمولة توّا ${pct(m.commission)}`, -st.commission], ["مرتجعات", -st.refunds], ...st.lines.map((l) => [`${l.order} — ${l.event}`, l.amount])];
    return TW.sheet(`كشف حساب — ${st.period}`, `<div class="mc-stmt"><div class="row between"><b>${esc(m.ar)}</b><span class="mono">${esc(st.id)}</span></div><div class="mc-sm muted">${TW.dateAr(st.from)} – ${TW.dateAr(st.to)} · العمولة ${pct(m.commission)}</div>
      ${TW.table([{ k: "l", label: "البند" }, { k: "v", label: "المبلغ", num: true, render: (r) => `<span class="${r.v < 0 ? "neg" : ""}">${money(r.v)}</span>` }], rows.map(([l, v], i) => ({ id: i, l, v })))}
      <div class="mc-fl net"><span class="grow">الصافي</span><b class="num">${money(st.net)}</b></div><div class="mc-sm">${st.status === "PAID" ? `اتحوّل ${TW.dateAr(st.paidAt)} · مرجع التحويل <span class="mono">${esc(st.ref)}</span>` : "مستحق — التحويل يوم الأحد"}</div></div>
      <p class="mc-sm muted">${ic("info", "ic xs")} ده عرض للكشف جوه التطبيق. النسخة الـ PDF بتوصلك على الواتساب كل أحد مع التحويل.</p>`, `<button class="btn grow" data-act="sheet-close">قفل</button>`);
  }
  return "";
}

/* merchant-owned profile fields the onboarding wizard collects (store's merchant.register ignores them). Audited like store actions. */
if (!TW.actions["merchant.profile"]) TW.actions["merchant.profile"] = ({ merchantId, landmark, payout, cats }, actor) => {
  const m = find(TW.S.merchants, merchantId); if (!m) return { ok: false, error: "المحل مش موجود" };
  const old = `${m.landmark || "—"} · ${m.payout || "—"}`;
  if (landmark != null) m.landmark = String(landmark).slice(0, 120);
  if (payout != null) m.payout = String(payout).slice(0, 40);
  if (Array.isArray(cats)) m.cats = cats.filter((d) => (D.typeDepts[m.type] || []).includes(d));
  TW.audit(actor, m.ar, "بيانات التسجيل (العنوان/التحويل/الأقسام)", old, `${m.landmark || "—"} · ${m.payout || "—"}`, null);
  return { ok: true };
};

/* ================================================================= APP */
TW.apps.merchant = {
  kind: "phone", actorKind: "merchant", title: "التاجر",
  init(inst) { inst.ui.lastM = inst.actorId(); },
  render(inst) {
    const m = me(inst);
    if (inst.ui.lastM !== m.id) { Object.keys(inst.ui).forEach((k) => { if (!k.startsWith("_") && !k.startsWith("r_") && k !== "rstep") delete inst.ui[k]; }); inst.ui.lastM = m.id; }
    const page = inst.route[0] || "";
    let top, body = "", dock = "";
    if (page === "order") {
      const f = find(TW.S.fos, inst.route[1]); const o = f && orderOf(f);
      top = topBar(inst, m, o ? `طلب ${o.id}` : "الطلب", { back: true, sub: f ? `${TW.stLabel("fo", f.status)} · ${f.id}` : "" });
      const v = orderView(inst, m, f); if (typeof v === "string") body = v; else { body = v.body; dock = v.dock; }
    } else if (page === "orders") { top = topBar(inst, m, "الطلبات"); body = ordersView(inst, m); }
    else if (page === "catalog") { top = topBar(inst, m, isFood(m) ? "المنيو" : "المنتجات", { sub: isFood(m) ? "وقّف أو شغّل الأصناف في ثانية" : "من كتالوج توّا — من غير كتابة" }); body = catalogView(inst, m); }
    else if (page === "finance") { top = topBar(inst, m, "الأرباح", { sub: "مبيعاتك وخصوماتك وتحويلاتك" }); body = financeView(inst, m); }
    else if (page === "account") { top = topBar(inst, m, "الحساب"); body = accountView(inst, m); }
    else if (page === "register") { top = `<header class="app-top mc-top"><button class="btn icon sm ghost" data-act="back" aria-label="رجوع">${ic("chevS", "ic sm")}</button><div class="grow"><h2>سجّل محلك على توّا</h2><div class="mc-sub">بيع أكتر وإدارتك أبسط</div></div>${TW.logo("currentColor", "var(--logo-spark)")}</header>`; body = regView(inst); dock = regDock(inst); }
    else { top = topBar(inst, m); body = homeView(inst, m); }
    return `<div class="app mc">${top}<div class="app-scroll"><div class="mc-body">${body}</div></div>${dock}${page === "register" ? "" : tabbar(inst, m)}${sheetView(inst, m)}${TW.inappToast(inst)}</div>`;
  },
  on: {
    "orders-tab"(inst, d) { inst.ui.otab = d.tab; inst.go("/merchant/orders"); },
    "cat-go"(inst, d) { inst.ui.ctab = d.tab; inst.go("/merchant/catalog"); },
    mode(inst, d) {
      const m = me(inst); if (m.status !== "active" || m.mode === d.mode) return;
      const r = TW.act("merchant.mode", { merchantId: m.id, mode: d.mode }, TW.actor.merchant(m.id));
      if (r && r.ok === false) { if (r.activeCount) { inst.ui.sheet = { kind: "close", count: r.activeCount }; inst.render(); } else inst.toast(r.error, "bad"); return; }
      inst.toast(d.mode === "busy" ? "تمام — وقت التجهيز زاد 10 دقايق للطلبات الجديدة" : d.mode === "closed" ? "المحل اتقفل — مش هتوصلك طلبات جديدة" : "المحل مفتوح — الطلبات هتوصلك", d.mode === "closed" ? "" : "ok");
    },
    "mode-force"(inst) { const m = me(inst); inst.ui.sheet = null; const r = inst.act("merchant.mode", { merchantId: m.id, mode: "closed", force: true }); if (r.ok !== false) inst.toast("المحل اتقفل — كمّل الطلبات اللي قبلتها"); },
    "mode-busy"(inst) { const m = me(inst); inst.ui.sheet = null; const r = inst.act("merchant.mode", { merchantId: m.id, mode: "busy" }); if (r.ok !== false) inst.toast("خليناه «زحمة» — الطلبات مستمرة بوقت أطول", "ok"); },
    accept(inst, d) { const r = inst.act("fo.accept", { foId: d.fo }); if (r.ok !== false) { inst.ui.hoCode = ""; inst.go(`/merchant/order/${d.fo}`); inst.toast("قبلت الطلب — ابدأ جهّز", "ok"); } },
    "reject-open"(inst, d) { inst.ui.rejReason = null; inst.ui.sheet = { kind: "reject", foId: d.fo }; inst.render(); },
    reject(inst, d) { if (!inst.ui.rejReason) return; const r = inst.act("fo.reject", { foId: d.fo, reason: inst.ui.rejReason }); if (r.ok !== false) { inst.ui.sheet = null; inst.toast("اتسجّل الرفض — الكنترول هيحوّل الطلب لمحل تاني"); } },
    mark(inst, d) { const foId = inst.route[1]; inst.act("fo.mark", { foId, key: d.key, mark: d.m || null }); },
    "sub-open"(inst, d) { inst.ui.sheet = { kind: "sub", foId: inst.route[1], key: d.key }; inst.render(); },
    "sub-pick"(inst, d) { const sh = inst.ui.sheet; inst.ui.sheet = null; inst.act("fo.mark", { foId: sh.foId, key: sh.key, mark: "sub", subSkuId: d.sku }); inst.toast("اقترحت بديل — العميل هيوافق الأول", "ok"); },
    ready(inst, d, el) {
      if (el.getAttribute("aria-disabled") === "true") return inst.toast("علّم كل الأصناف الأول (موجود / غير موجود / بديل)", "bad");
      const r = inst.act("fo.ready", { foId: d.fo }); if (r.ok !== false) inst.toast("تمام! الطلب جاهز — المندوب جاي يستلم", "ok");
    },
    handover(inst, d, el) {
      const code = String(inst.ui.hoCode || "").trim();
      if (!/^\d{4}$/.test(code)) return inst.toast("اكتب كود الاستلام (4 أرقام) من تطبيق المندوب", "bad");
      const r = inst.act("fo.handover", { foId: d.fo || el.dataset.fo, code }); if (r.ok !== false) { inst.ui.hoCode = ""; inst.toast("اتسلّم للمندوب ✓ — مسؤوليتك عن الطلب خلصت", "ok"); }
    },
    avail(inst, d) { const m = me(inst), x = TW.S.msku[m.id][d.sku]; inst.act("mcat.update", { merchantId: m.id, skuId: d.sku, available: !x.available }); },
    price(inst, d, el) {
      const m = me(inst), v = Number(el.value); if (!(v > 0)) { el.value = TW.S.msku[m.id][d.sku].price; return inst.toast("اكتب سعر صحيح", "bad"); }
      const r = inst.act("mcat.update", { merchantId: m.id, skuId: d.sku, price: v });
      if (r && r.review) inst.toast("السعر ده بعيد عن سعر السوق — راح لمراجعة توّا، والسعر القديم شغال لحد الموافقة");
      else if (r && r.ok !== false) inst.toast("السعر اتحدّث", "ok");
    },
    stock(inst, d, el) { const m = me(inst); inst.act("mcat.update", { merchantId: m.id, skuId: d.sku, stock: el.value }); },
    "bulk-open"(inst) { const m = me(inst); const n = Object.values(TW.S.msku[m.id] || {}).filter((x) => !x.available && !x.pendingPrice).length; const ids = Object.keys(TW.S.msku[m.id] || {}).filter((id) => !TW.S.msku[m.id][id].pendingPrice); const r = inst.act("mcat.bulk", { merchantId: m.id, op: "open", skuIds: ids }); if (r.ok !== false) inst.toast(n ? `فتحت ${n} صنف` : "كل الأصناف شغالة أصلاً", "ok"); },
    "stop-sel"(inst, d) { const s = (inst.ui.stopSel = inst.ui.stopSel || {}); s[d.sku] = !s[d.sku]; inst.render(); },
    "bulk-stop"(inst) { const m = me(inst), ids = Object.keys(inst.ui.stopSel || {}).filter((k) => inst.ui.stopSel[k]); if (!ids.length) return; const r = inst.act("mcat.bulk", { merchantId: m.id, op: "close", skuIds: ids }); if (r.ok !== false) { inst.ui.stopSel = {}; inst.ui.stopMode = false; inst.toast(`وقفت ${ids.length} صنف`, "ok"); } },
    "bulk-price-open"(inst) { inst.ui.sheet = { kind: "bulkPrice" }; inst.render(); },
    "bulk-price"(inst) {
      const m = me(inst), S = TW.S, map = S.msku[m.id]; const depts = [...new Set(Object.keys(map).map((id) => (find(S.skus, id) || {}).dept))]; const dept = inst.ui.bpDept || depts[0], p = Number(inst.ui.bpPct || 5);
      let ok = 0, rev = 0; Object.keys(map).filter((id) => (find(S.skus, id) || {}).dept === dept).forEach((id) => { const np = Math.round(map[id].price * (1 + p / 100) * 2) / 2; const r = TW.act("mcat.update", { merchantId: m.id, skuId: id, price: np }, TW.actor.merchant(m.id)); if (r && r.review) rev++; else if (r && r.ok !== false) ok++; });
      inst.ui.sheet = null; inst.toast(`${ok} سعر اتحدّث${rev ? ` · ${rev} راحوا مراجعة` : ""}`, "ok");
    },
    more(inst, d) { inst.ui[d.k] = (inst.ui[d.k] || (d.k === "alim" ? 24 : 30)) + (d.k === "alim" ? 24 : 30); inst.render(); },
    adept(inst) { inst.ui.acat = ""; inst.ui.abrand = ""; inst.render(); },
    sel(inst, d) { const s = (inst.ui.sel = inst.ui.sel || {}); s[d.sku] = !s[d.sku]; inst.render(); },
    "sel-clear"(inst) { inst.ui.sel = {}; inst.render(); },
    "scan-bc"(inst) { const m = me(inst), map = TW.S.msku[m.id] || {}; const s = TW.S.skus.find((x) => (D.typeDepts[m.type] || []).includes(x.dept) && !map[x.id] && x.active); if (!s) return inst.toast("مفيش منتجات تانية في الكتالوج لنشاطك"); inst.ui.abc = s.barcode; inst.ui.aq = ""; inst.ui.adept = ""; inst.toast(`اتقرى الباركود ${s.barcode}`, "ok"); },
    "add-open"(inst) { inst.ui.sheet = { kind: "add" }; inst.render(); },
    "add-avail"(inst, d) { inst.ui["aa_" + d.sku] = inst.ui["aa_" + d.sku] === false; inst.render(); },
    "add-confirm"(inst) {
      const m = me(inst), ids = Object.keys(inst.ui.sel || {}).filter((k) => inst.ui.sel[k]);
      const items = ids.map((id) => { const s = find(TW.S.skus, id); const p = inst.ui["ap_" + id]; return { skuId: id, price: p == null || p === "" ? s.refPrice : Number(p), stock: inst.ui["as_" + id] || null }; });
      if (items.some((x) => !(x.price > 0))) return inst.toast("فيه سعر مش مظبوط", "bad");
      const r = inst.act("mcat.add", { merchantId: m.id, items }); if (r.ok === false) return;
      ids.filter((id) => inst.ui["aa_" + id] === false && !(TW.S.msku[m.id][id] || {}).pendingPrice).forEach((id) => TW.act("mcat.update", { merchantId: m.id, skuId: id, available: false }, TW.actor.merchant(m.id)));
      ids.forEach((id) => { delete inst.ui["ap_" + id]; delete inst.ui["aa_" + id]; delete inst.ui["as_" + id]; });
      inst.ui.sel = {}; inst.ui.sheet = { kind: "added", added: r.added, flagged: r.flagged || [] }; inst.ui.ctab = "mine"; inst.render();
    },
    "req-open"(inst) { const m = me(inst); const d0 = (D.typeDepts[m.type] || ["grocery"])[0]; inst.ui.rq_cat = inst.ui.rq_cat || `${d0}/${((D.cats[d0] || [])[0] || [""])[0]}`; inst.ui.sheet = { kind: "req" }; inst.render(); },
    "rq-scan"(inst) { inst.ui.rq_bc = `622${String(Date.now()).slice(-10)}`; inst.render(); },
    "req-send"(inst) {
      const m = me(inst), name = String(inst.ui.rq_name || "").trim(); if (name.length < 3) return inst.toast("اكتب اسم المنتج", "bad");
      const r = inst.act("mcat.request", { merchantId: m.id, name, barcode: inst.ui.rq_bc || "", catGuess: inst.ui.rq_cat, photo: !!inst.ui.rq_photo });
      if (r.ok !== false) { ["rq_name", "rq_bc", "rq_photo"].forEach((k) => delete inst.ui[k]); inst.ui.sheet = null; inst.ui.ctab = "reqs"; inst.toast(`طلبك ${r.id} وصل لفريق الكتالوج — هنبلغك أول ما يتضاف`, "ok"); }
    },
    "menu-toggle"(inst, d) { const m = me(inst); inst.act("menu.toggle", { merchantId: m.id, itemId: d.id }); },
    why(inst, d) { inst.ui.dpReason = null; inst.ui.dpNote = ""; inst.ui.sheet = { kind: "why", st: d.st, line: d.line }; inst.render(); },
    dispute(inst, d) { const m = me(inst); if (!inst.ui.dpReason) return; const note = `${inst.ui.dpReason}${inst.ui.dpNote ? ` — ${inst.ui.dpNote}` : ""}`; const r = inst.act("merchant.dispute", { merchantId: m.id, settlementId: d.st, lineId: d.line, note }); if (r.ok !== false) inst.toast("اعتراضك وصل للمالية — هنرد خلال 48 ساعة", "ok"); },
    stmt(inst, d) { inst.ui.sheet = { kind: "stmt", st: d.st }; inst.render(); },
    /* onboarding */
    "reg-back"(inst) { inst.ui.rstep = Math.max(0, (inst.ui.rstep || 0) - 1); inst.render(); },
    "reg-doc"(inst, d) { inst.ui["r_doc_" + d.doc] = true; inst.render(); },
    "reg-cat"(inst, d) { const c = (inst.ui.r_cats = inst.ui.r_cats || {}); c[d.d] = !c[d.d]; inst.render(); },
    "reg-next"(inst) {
      const u = inst.ui, step = u.rstep || 0, bad = (t) => inst.toast(t, "bad");
      if (step === 0) { const ph = String(u.r_phone || "").replace(/\D/g, ""); if (!/^01\d{9}$/.test(ph)) return bad("اكتب رقم موبايل مصري صحيح (11 رقم)"); if (!u.r_sent) { u.r_sent = true; inst.toast("بعتنالك كود على الموبايل", "ok"); return inst.render(); } if (String(u.r_otp || "") !== "2468") return bad("الكود مش صح — جرّب تاني"); }
      if (step === 1 && String(u.r_name || "").trim().length < 3) return bad("اكتب اسم المحل");
      if (step === 2 && !u.r_type) return bad("اختار نوع النشاط");
      if (step === 3) { u.r_zone = u.r_zone || TW.S.zones[0].id; if (!String(u.r_landmark || "").trim()) return bad("اكتب علامة مميزة عشان المندوب يوصلك"); }
      if (step === 4) { u.r_cphone = u.r_cphone || u.r_phone; if (!String(u.r_owner || "").trim()) return bad("اكتب اسم صاحب المحل"); }
      if (step === 6 && !String(u.r_acct || "").trim()) return bad("اكتب رقم التحويل");
      if (step === 7 && docsFor(u.r_type).some(([k]) => !u["r_doc_" + k])) return bad("صوّر كل المستندات المطلوبة");
      if (step === 8 && !u.r_agree) return bad("لازم توافق على الشروط");
      if (step === 9) {
        const r = inst.act("merchant.register", { name: u.r_name.trim(), type: u.r_type, zoneId: u.r_zone, owner: u.r_owner.trim(), phone: u.r_cphone, hours: `${u.r_from || "9 ص"} – ${u.r_to || "12 ص"}${u.r_fri ? " · مقفول وقت صلاة الجمعة" : ""}`, landmark: u.r_landmark, payout: u.r_pay || PAYOUT[0], cats: (D.typeDepts[u.r_type] || []).filter((d) => !(u.r_cats || {})[d]) });
        if (r.ok === false) return; u.r_done = r.merchantId;
        /* the store's merchant.register drops landmark / payout / category mapping — record them with our own audited action */
        TW.act("merchant.profile", { merchantId: r.merchantId, landmark: u.r_landmark, payout: `${u.r_pay || PAYOUT[0]}`, cats: (D.typeDepts[u.r_type] || []).filter((d) => !(u.r_cats || {})[d]) }, TW.actor.merchant(r.merchantId));
      }
      u.rstep = step + 1; inst.render(); const sc = inst.el.querySelector(".app-scroll"); if (sc) sc.scrollTop = 0;
    },
    "reg-enter"(inst) { const id = inst.ui.r_done; Object.keys(inst.ui).filter((k) => k.startsWith("r_") || k === "rstep").forEach((k) => delete inst.ui[k]); TW.act("session.set", { key: "merchant", value: id }); inst.go("/merchant"); },
  },
};
})();
