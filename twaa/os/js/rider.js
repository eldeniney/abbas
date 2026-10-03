/* Twaa Business OS — Rider app (تطبيق المندوب).
   «استلم، وصّل، واتحاسب»: one next action at a time, big one-hand buttons, COD amount impossible to confuse,
   chain of custody at pickup, controlled failure flow (rider can't cancel), and a cash-exposure meter that stops COD jobs.
   Routes: /rider · /rider/jobs · /rider/job/:taskId · /rider/earnings · /rider/cash · /rider/account
   Reads TW.S, writes only through inst.act(...). Per-instance UI state lives in inst.ui. */
(function () {
const TW = window.TW, D = TW.D;
const { ic, esc, money, num, pct, chip, clock, ago, dur } = TW;
const find = (arr, id) => (arr || []).find((x) => x.id === id);

/* ----------------------------------------------------------------- selectors (pure) */
const ACTIVE = ["ASSIGNED", "AT_PICKUP", "PICKED_UP", "ARRIVED", "FAILED", "RTO"];
const me = (inst) => find(TW.S.riders, inst.actorId()) || TW.S.riders[0];
const myTasks = (r) => TW.S.tasks.filter((t) => t.riderId === r.id && ACTIVE.includes(t.status));
const curTask = (r) => { const t = find(TW.S.tasks, r.task); return t && ACTIVE.includes(t.status) ? t : myTasks(r)[0] || null; };
const myOffers = (r) => TW.S.tasks.filter((t) => t.status === "OFFERED" && t.offer && t.offer.riderId === r.id).sort((a, b) => a.offer.until - b.offer.until);
const myOffer = (r) => myOffers(r)[0];
const orderOf = (t) => find(TW.S.orders, t.orderId);
const zoneAr = (id) => (find(TW.S.zones, id) || {}).ar || "—";
const firstName = (n) => String(n || "").split(" ")[0];
const isToday = (ts) => ts && new Date(ts).toDateString() === new Date().toDateString();
const settle = (r) => TW.S.rsettle.find((x) => x.riderId === r.id) || { missions: r.jobsToday, fees: 0, incentives: 0, waiting: 0, deductions: 0, codVariance: 0 };
const gross = (rs) => (rs.fees || 0) + (rs.incentives || 0) + (rs.waiting || 0);
const netDue = (rs) => gross(rs) + (rs.deductions || 0) + (rs.codVariance || 0);
const HANDLING = { normal: ["عادي", "box"], chilled: ["مبرد", "snow"], frozen: ["مجمد", "snow"], hot: ["سخن", "flame"], fragile: ["قابل للكسر", "fragile"], separate: ["يتشال لوحده", "layers"] };
const VAR_REASONS = ["العميل معهوش المبلغ كامل", "مفيش فكة مع العميل", "صنف اترفض عند الباب", "خصم اتفق عليه مع الدعم", "سبب آخر"];
const FAIL_FLOW = {
  "العميل مش بيرد": "لازم تتصل مرتين وتبعت واتساب وتستنى المهلة كلها — بعدها الدعم يقرر.",
  "العنوان غلط": "اتصل بالعميل الأول وحاول توصل للعلامة المميزة. لو مفيش فايدة سجّل.",
  "العميل رفض الطلب": "متسيبش الطلب عند العميل — هيرجع للمصدر بعد قرار الدعم.",
  "مش قادر أوصل للمكان": "سجّل السبب (طريق مقفول / مية) والدعم هيرتب ميعاد تاني.",
  "المكان مش آمن": "سلامتك أولاً — امشي من المكان فوراً والدعم هيتواصل مع العميل.",
  "مشكلة في الكاش": "متقبلش مبلغ ناقص من غير سبب — سجّل والدعم هيكلم العميل.",
  "سبب آخر": "الدعم هيتصل بيك يفهم اللي حصل.",
};
const handlingChips = (hs) => (hs && hs.length ? hs : ["normal"]).map((h) => { const [l, i] = HANDLING[h] || [h, "box"]; return `<span class="rd-hand h-${h}">${ic(i, "ic xs")}${l}</span>`; }).join("");
const sm = (n) => (n < 0 ? `<span class="ltr">−${num(-n)}</span> ج.م` : money(n));
const timer = (until, soon = 15000) => `<span class="timer" data-until="${until}" data-soon="${soon}">${dur(until - Date.now())}</span>`;
const pickupPlace = (p) => { if (p.sourceType === "hub") { const h = find(TW.S.hubs, p.sourceId) || {}; return { name: "هب توّا", landmark: h.ar || "وسط المدينة" }; } const m = find(TW.S.merchants, p.sourceId) || {}; return { name: p.name, landmark: `${m.landmark || ""}${m.landmark ? " · " : ""}${zoneAr(m.zoneId)}` }; };

/* ----------------------------------------------------------------- mock map focused on the current leg */
const ROADS = `<path class="water" d="M0 520 C 200 500, 380 560, 560 540 S 860 470, 1000 500 L1000 640 L0 640Z"/><path class="road" d="M120 586 L 212 362 L 400 262 L 422 238 L 604 339 L 924 202"/><path class="road" d="M240 93 L 422 238 L 524 486"/><path class="road sm" d="M422 238 L 672 134"/><path class="road sm" d="M400 262 L 212 362"/>`;
function legMap(r, t) {
  const pend = t.pickups.filter((p) => !p.scanned);
  const pickupLeg = ["ASSIGNED", "AT_PICKUP"].includes(t.status);
  const rto = t.status === "RTO";
  const path = rto ? [r, t.pickups[0]] : pickupLeg ? [r, ...pend, t.drop] : [r, t.drop];
  const pts = [r, ...t.pickups, t.drop];
  let x0 = Math.min(...pts.map((p) => p.x)), x1 = Math.max(...pts.map((p) => p.x)), y0 = Math.min(...pts.map((p) => p.y)), y1 = Math.max(...pts.map((p) => p.y));
  let w = Math.max(120, x1 - x0 + 60), h = Math.max(70, y1 - y0 + 50); if (w / h < 2.2) w = h * 2.2; else h = w / 2.2;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, vx = cx - w / 2, vy = cy - h / 2, k = w / 320;
  const d = path.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const pk = t.pickups.map((p) => `<rect class="${p.scanned ? "rd-mk-done" : p.sourceType === "hub" ? "hubm" : "merm"}" x="${p.x - 6 * k}" y="${p.y - 6 * k}" width="${12 * k}" height="${12 * k}" rx="${3 * k}" style="stroke-width:${2 * k}"/>`).join("");
  return `<div class="map rd-map"><svg viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}" role="img" aria-label="خريطة المسار" preserveAspectRatio="xMidYMid slice"><g style="stroke-width:${k}">${ROADS.replace(/class="road"/g, `class="road" style="stroke-width:${5 * k}"`).replace(/class="road sm"/g, `class="road sm" style="stroke-width:${3 * k}"`)}</g>
    <path class="route" d="${d}" style="stroke-width:${3 * k};stroke-dasharray:${7 * k} ${5 * k}"/>${pk}<circle class="custm" cx="${t.drop.x}" cy="${t.drop.y}" r="${7 * k}" style="stroke-width:${2.5 * k}"/><circle class="rid busy" cx="${r.x}" cy="${r.y}" r="${8 * k}" style="stroke-width:${2.5 * k}"/></svg>
    <div class="rd-legend"><span><i class="rd-lg-r"></i>إنت</span><span><i class="rd-lg-p"></i>استلام</span><span><i class="rd-lg-c"></i>العميل</span></div></div>`;
}
const legTarget = (t) => (t.status === "RTO" ? t.pickups[0] : ["ASSIGNED", "AT_PICKUP"].includes(t.status) ? t.pickups.find((p) => !p.scanned) || t.pickups[0] : t.drop);

/* ----------------------------------------------------------------- chrome */
function topBar(inst, r, opts = {}) {
  const on = r.status !== "offline";
  return `<header class="app-top rd-top">${opts.back ? `<button class="btn icon sm rd-back" data-act="back" aria-label="رجوع">${ic("chevS", "ic sm")}</button>` : `<span class="rd-av">${esc(r.ar.slice(0, 1))}</span>`}
    <div class="grow"><h2>${esc(opts.title || r.ar)}</h2><div class="rd-sub">${esc(opts.sub || `${D.vehicles[r.vehicle]} · ${zoneAr(r.zoneId)}`)}</div></div>
    ${opts.back ? "" : `<button class="rd-online ${on ? "on" : ""}" data-act="online" role="switch" aria-checked="${on}" data-hl="rider-online" ${r.suspended ? "disabled" : ""}><span class="rd-knob"></span><span>${r.suspended ? "موقوف" : on ? "أونلاين" : "أوفلاين"}</span></button>`}</header>`;
}
function tabbar(inst, r) {
  const cur = inst.route[0] || "";
  const t = curTask(r), offer = myOffer(r);
  const items = [["", "الرئيسية", "home", offer ? "!" : 0], ["jobs", "مهامي", "list", myTasks(r).length], ["earnings", "الأرباح", "coins"], ["cash", "الكاش", "cash", r.cash >= r.limit ? "!" : 0], ["account", "حسابي", "user"]];
  const on = (k) => cur === k || (k === "jobs" && cur === "job");
  return `<nav class="tabbar rd-tabs" aria-label="تنقل المندوب">${items.map(([k, l, i, b]) => `<button class="${on(k) ? "on" : ""}" data-act="go" data-to="/rider${k ? "/" + k : ""}" ${on(k) ? 'aria-current="page"' : ""}>${ic(i, "ic")}<span>${l}</span>${b ? `<span class="badge">${b}</span>` : ""}</button>`).join("")}</nav>`;
}
function cashMeter(r, opts = {}) {
  const p = r.limit ? r.cash / r.limit : 0, stop = r.cash >= r.limit, warn = !stop && p >= 0.8;
  return `<section class="rd-cash ${stop ? "stop" : warn ? "warn" : ""}" data-hl="rider-cash-meter" aria-label="عداد الكاش">
    <div class="row between"><span class="rd-lbl">${ic("cash", "ic sm")} الكاش اللي معاك</span>${stop ? chip("مهام الكاش متوقفة", "bad", "lock") : warn ? chip("قربت من الحد", "warn", "alert") : chip("في الأمان", "ok", "check")}</div>
    <p class="rd-cash-t">معاك <b class="num">${num(r.cash)}</b> من حد <b class="num">${num(r.limit)}</b> جنيه</p>
    ${TW.meter(r.cash, r.limit)}
    <p class="rd-sm">${stop ? "وصلت للحد — مش هيتعرض عليك أي طلب كاش لحد ما تورّد في الهب. طلبات الدفع أونلاين لسه شغالة." : warn ? `باقي ${money(r.limit - r.cash)} — أي طلب كاش أكبر من كده مش هيتعرض عليك.` : `تقدر تستلم طلبات كاش لحد ${money(r.limit - r.cash)} كمان.`}</p>
    ${opts.cta !== false && r.cash > 0 ? `<button class="btn ${stop ? "accent" : ""} block rd-btn" data-act="deposit-open" data-hl="rider-deposit">${ic("building", "ic sm")}ورّد الكاش في الهب</button>` : ""}</section>`;
}

/* ================================================================= HOME */
function offerCard(inst, r, t, first = true) {
  const o = orderOf(t), z = zoneAr(t.drop.zoneId);
  const toPick = t.offer.km || TW.distKm(r, t.pickups[0]);
  const mins = Math.round((toPick + t.km) * 3 + 4 * t.pickups.length);
  return `<article class="rd-offer" ${first ? 'data-hl="rider-offer"' : ""} aria-live="assertive">
    <div class="row between"><b class="rd-offer-t">${ic("bell", "ic pulse")} مهمة جديدة</b><span class="rd-count">${ic("clock", "ic xs")}${timer(t.offer.until)}</span></div>
    <div class="rd-earn"><span>هتكسب</span><b class="num">${money(t.earn)}</b></div>
    <div class="rd-facts">
      <div><span>الاستلام</span><b>${t.pickups.length > 1 ? `${t.pickups.length} نقط` : "نقطة واحدة"}</b><small>${esc(t.pickups.map((p) => pickupPlace(p).name).join(" + "))}</small></div>
      <div><span>التوصيل في</span><b>${esc(z)}</b><small>العنوان يظهر بعد القبول</small></div>
      <div><span>المسافة</span><b class="num">${num(toPick + t.km, 1)} كم</b><small>${num(toPick, 1)} للاستلام + ${num(t.km, 1)}</small></div>
      <div><span>الوقت</span><b class="num">حوالي ${mins} د</b><small>${o && o.mode === "scheduled" ? `ميعاد ${esc(o.window || "")}` : "توصيل فوري"}</small></div>
    </div>
    <div class="rd-hands">${handlingChips(t.handling)}</div>
    <div class="rd-codline ${t.cod ? "" : "paid"}">${ic(t.cod ? "cash" : "card", "ic sm")}${t.cod ? `هتحصّل <b class="num">${money(t.cod)}</b> كاش` : "مدفوع أونلاين — مفيش كاش"}</div>
    <div class="rd-offer-acts"><button class="btn rd-cta ok" data-act="accept" data-task="${t.id}">${ic("check", "ic")}قبول</button><button class="btn rd-cta2" data-act="reject-open" data-task="${t.id}">رفض</button></div></article>`;
}
function homeView(inst, r) {
  const rs = settle(r), t = curTask(r), offers = myOffers(r), offer = offers[0], online = r.status !== "offline";
  const next = t ? nextStep(t) : null;
  return `${offers.map((o, i) => offerCard(inst, r, o, i === 0)).join("")}
    ${!online ? `<section class="rd-off">${ic("power", "ic xl")}<h3>إنت أوفلاين</h3><p>ابدأ الوردية عشان المهام توصلك.</p><button class="btn rd-cta ok" data-act="online">${ic("power", "ic")}ابدأ الوردية</button></section>` : ""}
    ${t ? `<button class="rd-active" data-act="go" data-to="/rider/job/${t.id}"><span class="rd-active-i">${ic(next.icon, "ic lg")}</span><span class="grow"><small>مهمة شغالة · <span class="mono">${esc(t.orderId)}</span></small><b>${esc(next.title)}</b><small>${esc(next.sub)}</small></span>${ic("chevE", "ic")}</button>` : online && !offer ? `<section class="rd-wait">${ic("bike", "ic lg")}<div><b>مستني مهمة جديدة</b><p class="rd-sm">خليك قريب من وسط ${esc(zoneAr(r.zoneId))} — العروض بتوصل للأقرب.</p></div></section>` : ""}
    ${cashMeter(r)}
    <section class="rd-today" aria-label="النهارده"><div><span>أرباح النهارده</span><b class="num">${money(gross(rs))}</b></div><div><span>مهام خلصت</span><b class="num">${num(rs.missions)}</b></div><div><span>المنطقة</span><b>${esc(zoneAr(r.zoneId))}</b></div></section>
    <p class="rd-motto">${ic("zap", "ic xs")} استلم، وصّل، واتحاسب — الأرباح والكاش منفصلين، شوف كل واحد في صفحته.</p>`;
}

/* ================================================================= ACTIVE JOB */
function nextStep(t) {
  const p = t.pickups.find((x) => !x.scanned) || t.pickups[0];
  if (t.status === "ASSIGNED") return { icon: "nav", title: `روح استلم من ${pickupPlace(p).name}`, sub: "لما توصل دوس «وصلت للاستلام»" };
  if (t.status === "AT_PICKUP") return { icon: "scan", title: "امسح الطرد وأكد الاستلام", sub: `${pickupPlace(p).name} · كود ${p.code}` };
  if (t.status === "PICKED_UP") return { icon: "nav", title: "في الطريق للعميل", sub: t.cod ? `حصّل ${money(t.cod)} كاش` : "مدفوع أونلاين" };
  if (t.status === "ARRIVED") return { icon: "hand", title: "سلّم الطلب", sub: t.cod && t.collected == null ? `حصّل ${money(t.cod)} وخد الكود` : "خد كود الاستلام من العميل" };
  if (t.status === "FAILED") return { icon: "clock", title: "مستني قرار الدعم", sub: t.failReason || "" };
  if (t.status === "RTO") return { icon: "undo", title: `رجّع الطلب لـ ${pickupPlace(t.pickups[0]).name}`, sub: "مرتجع للمصدر" };
  return { icon: "check", title: "خلصت", sub: "" };
}
function jobView(inst, r, t) {
  if (!t) return { body: TW.empty("المهمة دي مش موجودة", "ارجع لمهامي", "list"), dock: "" };
  if (t.riderId !== r.id) return { body: TW.empty("المهمة دي مش متسندة ليك", t.status === "OFFERED" ? "اقبلها من الرئيسية الأول" : "", "lock"), dock: "" };
  const o = orderOf(t), S = TW.S;
  const legIdx = ["ASSIGNED", "AT_PICKUP"].includes(t.status) ? 0 : ["PICKED_UP", "ARRIVED"].includes(t.status) ? 1 : t.status === "DELIVERED" ? 3 : 1;
  const steps = `<ol class="rd-steps">${["استلم", "وصّل", "اتحاسب"].map((l, i) => `<li class="${i < legIdx ? "done" : i === legIdx ? "now" : ""}"><span>${i < legIdx ? ic("check", "ic xs") : i + 1}</span>${l}</li>`).join("")}</ol>`;
  if (t.status === "DELIVERED") {
    return { body: `${steps}<section class="rd-done">${ic("check", "ic xl")}<h3>تم التسليم</h3><p><b class="num">+${money(t.earn)}</b> اتضافوا لأرباحك</p>${t.collected != null && t.cod ? `<p class="rd-sm">استلمت ${money(t.collected)} كاش — بقى معاك ${money(r.cash)} من حد ${money(r.limit)}.</p>` : ""}</section>${r.cash >= r.limit ? cashMeter(r) : ""}`, dock: `<div class="rd-dock"><button class="btn rd-cta" data-act="go" data-to="/rider">${ic("home", "ic")}رجوع للرئيسية</button></div>` };
  }
  const target = legTarget(t), km = TW.distKm(r, target), eta = Math.max(1, Math.round(km * 3));
  const mapCard = `<section class="rd-mapc">${legMap(r, t)}<div class="rd-eta"><span>${ic("route", "ic sm")} ${num(km, 1)} كم</span><span>${["AT_PICKUP", "ARRIVED", "FAILED"].includes(t.status) ? "إنت في المكان" : `حوالي ${eta} د`}</span><span class="rd-net">${ic("refresh", "ic xs")} بيتحدث تلقائي</span></div></section>`;
  let body = "", dock = "";
  /* ---------------- pickup leg */
  if (["ASSIGNED", "AT_PICKUP"].includes(t.status)) {
    const p = t.pickups.find((x) => !x.scanned) || t.pickups[0], f = find(S.fos, p.foId), pl = pickupPlace(p);
    const ready = f && ["READY", "PACKED"].includes(f.status);
    const expected = Math.max(1, (f && f.packages.length) || 1);
    const multi = t.pickups.length > 1 ? `<ol class="rd-picks">${t.pickups.map((x, i) => `<li class="${x.scanned ? "done" : x === p ? "now" : ""}">${x.scanned ? ic("check", "ic xs") : `<span>${i + 1}</span>`}${esc(pickupPlace(x).name)}${x.scanned ? ` <small>اتسلّم ${clock(x.at)}</small>` : ""}</li>`).join("")}</ol>` : "";
    const where = `<section class="rd-card"><div class="rd-lbl">${ic("store", "ic sm")} ${t.pickups.length > 1 ? `استلام ${t.pickups.indexOf(p) + 1} من ${t.pickups.length}` : "استلم من"}</div><h3 class="rd-place">${esc(pl.name)}</h3><p class="rd-sm">${ic("pin", "ic xs")} ${esc(pl.landmark)}</p>
      <div class="rd-pk"><div><span>الطرود</span><b class="num">${ready ? expected : "—"}</b></div><div><span>كود الاستلام</span><b class="mono">${esc(p.code)}</b></div><div><span>الحالة</span><b>${ready ? chip("جاهز", "ok") : chip("بيتجهز", "warn")}</b></div></div>
      ${ready ? `<p class="rd-sm">${ic("box", "ic xs")} ${(f.packages || []).map((x) => `<span class="mono">${esc(x.id)}</span>`).join("، ") || "طرد واحد"}</p>` : f && f.prepBy ? `<p class="rd-sm">${ic("clock", "ic xs")} المتوقع يجهز خلال ${timer(f.prepBy, 60000)}</p>` : ""}
      <div class="rd-hands">${handlingChips(t.handling)}</div>${multi}</section>`;
    if (t.status === "ASSIGNED") {
      body = `${steps}${mapCard}${where}`;
      dock = `<div class="rd-dock"><button class="btn rd-cta" data-act="arrive-pickup" data-task="${t.id}">${ic("pin", "ic")}وصلت للاستلام</button><p class="rd-hint">لو وصلت المكان، التطبيق بيعلّم الوصول لوحده.</p></div>`;
    } else {
      const u = inst.ui, code = u.scanCode || "", cnt = u.scanCount == null ? expected : Number(u.scanCount), dmg = !!u.scanDamaged;
      const cold = t.handling.some((h) => h === "chilled" || h === "frozen"), hot = t.handling.includes("hot");
      const issue = t.pickupIssue && !p.scanned ? `<div class="banner bad">${ic("alert", "ic sm")}<div><b>اتسجّل: ${esc(t.pickupIssue.type)}</b> — ${t.pickupIssue.type === "طرد تالف" ? "الطرد رجع للتاجر يتغلف تاني. استنى لحد ما يبقى جاهز وامسحه تاني." : t.pickupIssue.type === "التاجر مش جاهز" ? "الكنترول اتبلّغ — استنى في المكان." : "مينفعش تتحرك قبل ما الطرود تكمل. الكنترول اتبلّغ."}</div></div>` : "";
      body = `${steps}${issue}${where}
        <section class="rd-card rd-scan" data-hl="rider-scan"><div class="rd-lbl">${ic("scan", "ic sm")} التحقق من الطرد (سلسلة الحيازة)</div>
          ${!ready ? `<div class="banner warn">${ic("clock", "ic sm")}<div>${esc(pl.name)} لسه بيجهّز الطلب — استنى جنب الكاشير.</div></div>` : ""}
          <button class="btn rd-scanbtn ${code === p.code ? "ok" : ""}" data-act="scan-sim" data-code="${esc(p.code)}" ${ready ? "" : "disabled"}>${ic(code === p.code ? "check" : "camera", "ic")}${code === p.code ? "اتقرى الكود ✓" : "امسح باركود الطرد"}</button>
          <label class="field"><span>أو اكتب كود الاستلام</span><input class="input mono rd-codein" inputmode="numeric" maxlength="4" dir="ltr" placeholder="• • • •" data-model="scanCode" data-live value="${esc(code)}" aria-label="كود الاستلام"></label>
          <div class="rd-row"><span>عدد الطرود <small>(المفروض ${expected})</small></span><div class="rd-step"><button class="btn icon" data-act="cnt" data-d="-1" aria-label="أقل">${ic("minus", "ic sm")}</button><b class="num">${cnt}</b><button class="btn icon" data-act="cnt" data-d="1" aria-label="أكتر">${ic("plus", "ic sm")}</button></div></div>
          <div class="rd-row"><span>حالة الطرد</span><div class="seg"><button class="${!dmg ? "on" : ""}" data-act="ui" data-k="scanDamaged" data-v="">سليم</button><button class="${dmg ? "on" : ""}" data-act="ui" data-k="scanDamaged" data-v="1">فيه تلف</button></div></div>
          ${cold || hot ? `<div class="rd-row"><span>${ic(cold ? "snow" : "flame", "ic sm")} ${cold ? "حطيته في الشنطة المبردة" : "حطيته في الشنطة الحرارية"}</span><button class="toggle ${u.scanBag ? "on" : ""}" data-act="ui-toggle" data-k="scanBag" role="switch" aria-checked="${!!u.scanBag}" aria-label="تأكيد الشنطة"></button></div>` : ""}
          ${cnt < expected ? `<div class="banner bad">${ic("alert", "ic sm")}<div>طرد ناقص — هيتسجل استثناء ومش هتقدر تمشي قبل ما يتحل.</div></div>` : dmg ? `<div class="banner bad">${ic("alert", "ic sm")}<div>هيتسجل «طرد تالف» والطرد يرجع للتاجر يتغلف تاني.</div></div>` : ""}
          <button class="btn sm ghost" data-act="pk-issue" data-type="التاجر مش جاهز" ${ready ? "disabled" : ""}>${ic("flag", "ic xs")}سجّل إن التاجر مش جاهز</button></section>`;
      const exc = cnt < expected || dmg;
      dock = `<div class="rd-dock"><button class="btn rd-cta ${exc ? "bad" : ""}" data-act="scan" data-task="${t.id}" data-src="${esc(p.sourceId)}" ${ready ? "" : "disabled"}>${ic(exc ? "alert" : "check", "ic")}${exc ? "سجّل المشكلة" : `أكد استلام ${cnt} طرد`}</button>${!ready ? `<p class="rd-hint">الزرار هيتفتح أول ما الطلب يبقى جاهز.</p>` : ""}</div>`;
    }
    return { body, dock };
  }
  /* ---------------- drop leg */
  const cust = find(S.customers, o.customerId) || {};
  const codBox = t.cod > 0 ? `<section class="rd-cod"><span>حصّل من العميل</span><b class="num">${num(t.cod)}</b><em>جنيه كاش</em>${o.pay.changeFor ? `<small>${ic("info", "ic xs")} العميل محتاج فكة من ${money(o.pay.changeFor)} — جهّز ${money(o.pay.changeFor - t.cod)}</small>` : ""}${t.collected != null ? `<small class="rd-got">${ic("check", "ic xs")} سجّلت إنك استلمت ${money(t.collected)}${t.varReason ? ` — ${esc(t.varReason)}` : ""}</small>` : ""}</section>` : `<section class="rd-cod paid"><span>${ic("card", "ic sm")} مدفوع أونلاين</span><b>متحصّلش أي فلوس</b></section>`;
  const custCard = `<section class="rd-card"><div class="rd-lbl">${ic("user", "ic sm")} سلّم لـ</div><h3 class="rd-place">${esc(firstName(t.drop.name || cust.ar))}</h3><p class="rd-land">${ic("pin", "ic sm")} ${esc(t.drop.landmark || "")}</p><p class="rd-sm">${esc(t.drop.street || "")}${t.drop.street ? " · " : ""}${esc(zoneAr(t.drop.zoneId))}</p>${o.notes ? `<div class="banner">${ic("chat", "ic sm")}<div><b>ملاحظة التوصيل:</b> ${esc(o.notes)}</div></div>` : ""}<div class="rd-hands">${handlingChips(t.handling)}</div>
    <div class="rd-contact"><button class="btn rd-btn" data-act="contact-open" data-kind="call">${ic("phone", "ic sm")}اتصال (رقم مخفي)</button><button class="btn rd-btn" data-act="contact-open" data-kind="whatsapp">${ic("chat", "ic sm")}واتساب</button></div></section>`;
  if (t.status === "PICKED_UP") {
    body = `${steps}${mapCard}${codBox}${custCard}`;
    dock = `<div class="rd-dock"><button class="btn rd-cta" data-act="arrive" data-task="${t.id}">${ic("pin", "ic")}وصلت عند العميل</button>${t.prog < 0.9 ? `<p class="rd-hint">لسه ${num(km, 1)} كم — دوس لما توصل فعلاً (GPS بيتسجّل).</p>` : ""}</div>`;
    return { body, dock };
  }
  if (t.status === "ARRIVED") {
    const calls = t.contact.filter((c) => c.kind === "call" && !c.ok).length, wa = t.contact.some((c) => c.kind === "whatsapp" && !c.ok);
    const un = t.unreachable, waited = un && Date.now() >= un.waitUntil;
    const seq = `<section class="rd-card rd-seq" data-hl="rider-contact"><div class="rd-lbl">${ic("phone", "ic sm")} العميل مش بيرد؟ اعمل الخطوات دي بالترتيب</div>
      <ol class="rd-checks"><li class="${calls >= 1 ? "done" : ""}">${ic(calls >= 1 ? "check" : "phone", "ic xs")}اتصال أول</li><li class="${calls >= 2 ? "done" : ""}">${ic(calls >= 2 ? "check" : "phone", "ic xs")}اتصال تاني</li><li class="${wa ? "done" : ""}">${ic(wa ? "check" : "chat", "ic xs")}رسالة واتساب</li><li class="${waited ? "done" : un ? "now" : ""}">${ic(waited ? "check" : "clock", "ic xs")}مهلة الانتظار ${un ? timer(un.waitUntil, 60000) : `<span class="num">${dur(S.rules.unreachableWaitSec * 1000)}</span>`}</li></ol>
      <div class="rd-contact"><button class="btn rd-btn" data-act="contact-open" data-kind="call">${ic("phone", "ic sm")}اتصال</button><button class="btn rd-btn" data-act="contact-open" data-kind="whatsapp">${ic("chat", "ic sm")}واتساب</button></div>
      <button class="btn block rd-btn ${waited && calls >= 2 && wa ? "danger" : ""}" data-act="fail-open">${ic("flag", "ic sm")}مقدرتش أسلّم الطلب</button></section>`;
    const needCash = t.cod > 0 && t.collected == null;
    let pay = "";
    if (t.cod > 0) {
      const amt = inst.ui.cashAmt == null ? t.cod : inst.ui.cashAmt, diff = Math.abs(Number(amt) - t.cod) > 0.01;
      pay = needCash || inst.ui.recollect ? `<section class="rd-card"><div class="rd-lbl">${ic("cash", "ic sm")} استلمت كام؟</div><label class="rd-amt"><input class="input num" type="number" inputmode="decimal" data-model="cashAmt" data-live value="${esc(amt)}" aria-label="المبلغ اللي استلمته"><span>ج.م</span></label>
        ${diff ? `<div class="banner warn">${ic("alert", "ic sm")}<div>المبلغ مختلف عن المطلوب بـ <b class="num">${money(Number(amt) - t.cod)}</b> — لازم تختار السبب (BR-COD-005).</div></div><div class="rd-reasons">${VAR_REASONS.map((x) => `<button class="${inst.ui.varReason === x ? "on" : ""}" data-act="ui" data-k="varReason" data-v="${esc(x)}" aria-pressed="${inst.ui.varReason === x}">${esc(x)}</button>`).join("")}</div>` : `<p class="rd-sm">${ic("check", "ic xs")} نفس المبلغ المطلوب بالظبط.</p>`}</section>` : "";
    }
    const otp = `<section class="rd-card"><div class="rd-lbl">${ic("key", "ic sm")} كود الاستلام من العميل</div><input class="input mono rd-codein big" inputmode="numeric" maxlength="4" dir="ltr" placeholder="• • • •" data-model="otp" data-live data-enter="deliver" data-task="${t.id}" value="${esc(inst.ui.otp || "")}" aria-label="كود الاستلام من العميل"><p class="rd-sm">العميل لاقي الكود في تطبيقه أو في رسالة SMS. للعرض التجريبي: <span class="mono">${esc(o.otp)}</span></p></section>`;
    body = `${steps}${codBox}${pay}${needCash ? "" : otp}${custCard.replace(/<div class="rd-contact">[\s\S]*?<\/div><\/section>$/, "</section>")}${seq}`;
    dock = needCash || inst.ui.recollect
      ? `<div class="rd-dock"><button class="btn rd-cta" data-act="collect" data-task="${t.id}">${ic("cash", "ic")}استلمت ${money(Number(inst.ui.cashAmt == null ? t.cod : inst.ui.cashAmt) || 0)}</button></div>`
      : `<div class="rd-dock"><button class="btn rd-cta ok" data-act="deliver" data-task="${t.id}" data-hl="rider-deliver" ${/^\d{4}$/.test(String(inst.ui.otp || "")) ? "" : 'aria-disabled="true"'}>${ic("check", "ic")}تم التسليم</button>${t.cod > 0 ? `<button class="btn sm ghost" data-act="recollect">عدّل مبلغ الكاش</button>` : ""}</div>`;
    return { body, dock };
  }
  if (t.status === "FAILED") {
    body = `${steps}<section class="rd-card rd-wait2">${ic("clock", "ic xl")}<h3>سجّلت: ${esc(t.failReason)}</h3><p>الدعم بيقرر دلوقتي: نحاول تاني ولا نرجّع الطلب للمصدر. خليك في مكانك وخلي الطلب معاك — متسيبهوش لحد.</p><p class="rd-sm">${t.contact.length} محاولات تواصل اتسجلت · <span data-ago="${t.failedAt}">${ago(t.failedAt)}</span></p></section>${codBox}`;
    return { body, dock: `<div class="rd-dock"><p class="rd-hint">${ic("lock", "ic xs")} المندوب مش بيلغي طلب — القرار عند الدعم.</p></div>` };
  }
  if (t.status === "RTO") {
    const p0 = t.pickups[0];
    body = `${steps}${mapCard}<section class="rd-card"><div class="rd-lbl">${ic("undo", "ic sm")} مرتجع للمصدر</div><h3 class="rd-place">رجّع الطلب لـ ${esc(pickupPlace(p0).name)}</h3><p class="rd-sm">${esc(pickupPlace(p0).landmark)} — سلّم الطرد بنفس الكود <span class="mono">${esc(p0.code)}</span> عشان سلسلة الحيازة تقفل.</p></section>`;
    return { body, dock: `<div class="rd-dock"><p class="rd-hint">${ic("route", "ic xs")} الوصول بيتسجّل تلقائي أول ما توصل المكان.</p></div>` };
  }
  return { body: steps, dock: "" };
}

/* ================================================================= JOBS */
function jobsView(inst, r) {
  const S = TW.S, act = myTasks(r);
  const done = S.tasks.filter((t) => t.riderId === r.id && t.status === "DELIVERED" && isToday(t.deliveredAt)).sort((a, b) => b.deliveredAt - a.deliveredAt);
  const sched = S.tasks.filter((t) => t.status === "SCHEDULED" && (find(S.zones, t.drop.zoneId) || { riderType: [] }).riderType.includes(r.vehicle));
  const byZone = TW.groupBy(sched, (t) => t.drop.zoneId);
  const row = (t, sub, right) => `<button class="rd-jrow" data-act="go" data-to="/rider/job/${t.id}"><span class="rd-ji">${ic(nextStep(t).icon, "ic sm")}</span><span class="grow"><b>${esc(nextStep(t).title)}</b><small><span class="mono">${esc(t.orderId)}</span> · ${sub}</small></span>${right}</button>`;
  return `<section><div class="rd-h"><h3>شغالة دلوقتي</h3>${chip(String(act.length), act.length ? "info" : "neutral")}</div>${act.length ? `<div class="rd-list">${act.map((t) => row(t, `${esc(zoneAr(t.drop.zoneId))} · ${t.cod ? money(t.cod) + " كاش" : "مدفوع"}`, TW.stChip("task", t.status))).join("")}</div>` : `<p class="rd-sm rd-emptyl">مفيش مهام شغالة.</p>`}</section>
    <section><div class="rd-h"><h3>رحلات القرى المجدولة</h3>${chip(String(sched.length), "neutral")}</div>${Object.keys(byZone).length ? Object.entries(byZone).map(([z, ts]) => `<div class="rd-route"><div class="row between"><b>${ic("route", "ic sm")} ${esc(zoneAr(z))}</b>${chip(ts[0].window || (find(S.zones, z) || {}).windows?.[0] || "مجدولة", "info", "clock")}</div><p class="rd-sm">${ts.length} طلبات · ${num(TW.sum(ts, (t) => t.km), 1)} كم · ${money(TW.sum(ts, (t) => t.cod))} كاش · ${money(TW.sum(ts, (t) => t.earn))} أجر</p><p class="rd-sm muted">الكنترول بيحمّل الرحلة على مندوب موتوسيكل قبل الميعاد — هيوصلك إشعار لو اتسندت ليك.</p></div>`).join("") : `<p class="rd-sm rd-emptyl">مفيش رحلات مجدولة على مركبتك دلوقتي.</p>`}</section>
    <section><div class="rd-h"><h3>خلصت النهارده</h3>${chip(String(done.length), "ok")}</div>${done.length ? `<div class="rd-list">${done.map((t) => `<div class="rd-jrow static"><span class="rd-ji ok">${ic("check", "ic sm")}</span><span class="grow"><b><span class="mono">${esc(t.orderId)}</span> · ${esc(zoneAr(t.drop.zoneId))}</b><small>${clock(t.deliveredAt)} · ${num(t.km, 1)} كم${t.cod ? ` · ${money(t.cod)} كاش` : ""}</small></span><b class="num">+${money(t.earn)}</b></div>`).join("")}</div>` : `<p class="rd-sm rd-emptyl">لسه مفيش مهام خلصت النهارده من التطبيق.</p>`}</section>`;
}

/* ================================================================= EARNINGS */
function earningsView(inst, r) {
  const rs = settle(r), S = TW.S;
  const done = S.tasks.filter((t) => t.riderId === r.id && t.status === "DELIVERED" && isToday(t.deliveredAt));
  const line = (l, v, sub, cls = "") => `<div class="rd-el ${cls}"><span class="grow">${l}${sub ? `<small>${sub}</small>` : ""}</span><b class="num">${sm(v)}</b></div>`;
  return `<section class="rd-earnhero"><span>صافي مستحقك النهارده</span><b class="num">${money(netDue(rs))}</b><small>${rs.status === "PAID" ? "اتحوّل" : "بيتحوّل مع تسوية آخر الأسبوع"} · ${num(rs.missions)} مهمة</small></section>
    <div class="banner">${ic("info", "ic sm")}<div><b>الأرباح غير الكاش.</b> الأرباح دي فلوسك. الكاش اللي معاك فلوس العملاء وبتورّده — تابعه في صفحة «الكاش».</div></div>
    <section class="rd-card"><div class="rd-lbl">${ic("coins", "ic sm")} تفاصيل النهارده</div>
      ${line("المهام اللي خلصت", rs.fees, `${num(rs.missions)} مهمة · أجر المهمة حسب المسافة ونقط الاستلام`)}${line("حوافز", rs.incentives, rs.incentives ? "حافز أكتر من 8 مهام" : "خلّص 9 مهام وخد 40 ج.م حافز")}${line("تعويض انتظار", rs.waiting, rs.waiting ? "انتظار عند التاجر أكتر من 10 دقايق" : "")}
      ${line("خصومات", rs.deductions || 0, rs.deductions ? "بقرار من العمليات — ليها سبب ودليل" : "", rs.deductions ? "neg" : "")}${line("فرق الكاش", rs.codVariance || 0, rs.codVariance ? "فرق تحصيل اتحدد إنه على المندوب" : "مفيش فروق — تمام", rs.codVariance ? "neg" : "")}
      <div class="rd-el net"><span class="grow">الصافي ليك</span><b class="num">${money(netDue(rs))}</b></div></section>
    ${done.length ? `<section class="rd-card"><div class="rd-lbl">${ic("list", "ic sm")} مهام اتسلّمت من التطبيق</div>${done.map((t) => line(`<span class="mono">${esc(t.orderId)}</span> · ${esc(zoneAr(t.drop.zoneId))}`, t.earn, `${num(t.km, 1)} كم · ${t.pickups.length} استلام · ${clock(t.deliveredAt)}`)).join("")}</section>` : ""}
    <section class="rd-card"><div class="rd-lbl">${ic("trend", "ic sm")} أداءك بيأثر على العروض</div><div class="rd-perf">${[["قبول العروض", r.accept], ["في الميعاد", r.onTime], ["دقة الكاش", r.codAcc]].map(([l, v]) => `<div><span>${l}</span><b class="num">${pct(v)}</b></div>`).join("")}</div></section>`;
}

/* ================================================================= CASH */
function cashView(inst, r) {
  const S = TW.S;
  const cods = S.cod.filter((c) => c.riderId === r.id).sort((a, b) => b.at - a.at);
  const deps = S.deposits.filter((d) => d.riderId === r.id);
  const pend = deps.filter((d) => d.status === "PENDING_VERIFY");
  const st = { HELD: ["معاك", "warn"], DEPOSITED: ["اتورّد", "info"], RECONCILED: ["اتطابق", "ok"] };
  return `${cashMeter(r)}
    ${pend.length ? `<div class="banner">${ic("clock", "ic sm")}<div><b>${money(TW.sum(pend, (d) => d.amount))} بانتظار تأكيد المالية</b> — اتسجل التوريد، والمالية بتأكد الاستلام من أمين الخزينة.</div></div>` : ""}
    <section class="rd-card"><div class="rd-lbl">${ic("receipt", "ic sm")} تحصيلات الكاش</div>${cods.length ? cods.slice(0, 12).map((c) => { const [l, tn] = st[c.status] || [c.status, "neutral"]; return `<div class="rd-el"><span class="grow"><span class="mono">${esc(c.orderId)}</span><small>${clock(c.at)} · المطلوب ${money(c.expected)}${c.variance ? ` · <span class="neg">فرق ${money(c.variance)}</span>${c.varReason ? ` (${esc(c.varReason)})` : ""}` : ""}</small></span><b class="num">${money(c.collected)}</b>${chip(l, tn)}</div>`; }).join("") : `<p class="rd-sm">مفيش تحصيلات.</p>`}</section>
    <section class="rd-card"><div class="rd-lbl">${ic("building", "ic sm")} التوريدات</div>${deps.length ? deps.map((d) => `<div class="rd-el"><span class="grow"><span class="mono">${esc(d.id)}</span><small>${clock(d.at)} · ${esc(d.place)} · ${esc(d.receiver || "")}</small></span><b class="num">${money(d.amount)}</b>${d.status === "VERIFIED" ? chip("اتأكد", "ok", "check") : chip("بانتظار تأكيد المالية", "warn", "clock")}</div>`).join("") : `<p class="rd-sm">لسه مورّدتش النهارده.</p>`}</section>
    <p class="rd-motto">${ic("shield", "ic xs")} الكاش بيتورّد في الهب لأمين الخزينة وبياخد رقم إيصال. محدش يطلب منك كاش برّه الهب.</p>`;
}

/* ================================================================= ACCOUNT */
function accountView(inst, r) {
  const docs = [["رخصة القيادة", "سارية لحد 2029"], ["رخصة المركبة", r.vehicle === "bicycle" ? "مش مطلوبة للعجلة" : "سارية لحد 2028"], ["بطاقة الرقم القومي", "متراجعة"], ["الفيش الجنائي", "متراجع"]];
  return `<section class="rd-card rd-prof"><div class="row"><span class="rd-av lg">${esc(r.ar.slice(0, 1))}</span><div class="grow"><h3>${esc(r.ar)}</h3><p class="rd-sm"><span class="mono">${esc(r.phone)}</span> · ${esc(zoneAr(r.zoneId))}</p></div>${r.suspended ? chip("موقوف", "bad") : chip(`${num(r.rating, 1)} ★`, "ok")}</div></section>
    <section class="rd-card"><div class="rd-lbl">${ic(r.vehicle === "bicycle" ? "bike" : "truck", "ic sm")} المركبة</div><dl class="kv"><dt>النوع</dt><dd>${esc(D.vehicles[r.vehicle])}</dd><dt>اللوحة</dt><dd>${esc(r.plate || "—")}</dd><dt>حد الكاش</dt><dd class="num">${money(r.limit)}</dd><dt>شنطة مبردة</dt><dd>${r.vehicle === "bicycle" ? "صغيرة" : "معاك"}</dd></dl></section>
    <section class="rd-card"><div class="rd-lbl">${ic("doc", "ic sm")} المستندات</div>${docs.map(([l, s]) => `<div class="rd-el"><span class="grow">${l}<small>${s}</small></span>${chip("سليم", "ok", "check")}</div>`).join("")}</section>
    <section class="rd-card"><div class="rd-lbl">${ic("trend", "ic sm")} الأداء</div><div class="rd-perf">${[["التقييم", `${num(r.rating, 1)} ★`], ["في الميعاد", pct(r.onTime)], ["قبول العروض", pct(r.accept)], ["دقة الكاش", pct(r.codAcc)], ["التوريد في الميعاد", pct(r.depositOnTime)], ["مهام فشلت", num(r.fails)]].map(([l, v]) => `<div><span>${l}</span><b class="num">${v}</b></div>`).join("")}</div></section>
    <section class="rd-card"><div class="rd-lbl">${ic("help", "ic sm")} الدعم</div><dl class="kv"><dt>مشرف الوردية</dt><dd>${esc((TW.S.users.find((u) => u.role === "dispatcher") || { ar: "الموزّع" }).ar)} — التوزيع</dd><dt>خط المناديب</dt><dd class="mono">19 883</dd><dt>طوارئ الطريق</dt><dd>الدعم بيرد 24 ساعة</dd></dl></section>`;
}

/* ================================================================= SHEETS */
function sheetView(inst, r) {
  const sh = inst.ui.sheet; if (!sh) return "";
  const S = TW.S;
  if (sh.kind === "reject") return TW.sheet("ترفض المهمة؟", `<p class="rd-sm">السبب اختياري — بيساعدنا نبعتلك مهام أنسب.</p><div class="rd-reasons">${TW.REASONS.riderReject.map((x) => `<button class="${inst.ui.rjReason === x ? "on" : ""}" data-act="ui" data-k="rjReason" data-v="${esc(x)}" aria-pressed="${inst.ui.rjReason === x}">${esc(x)}</button>`).join("")}</div><p class="rd-sm muted">${ic("info", "ic xs")} الرفض الكتير بيقلل نسبة القبول (${pct(r.accept)}).</p>`, `<button class="btn danger lg grow" data-act="reject" data-task="${sh.taskId}">ارفض</button><button class="btn lg" data-act="sheet-close">رجوع</button>`);
  if (sh.kind === "contact") {
    const t = find(S.tasks, sh.taskId);
    return TW.sheet(sh.kind2 === "call" ? "بنتصل بالعميل" : "رسالة واتساب للعميل", `<div class="rd-calling">${ic(sh.kind2 === "call" ? "phone" : "chat", "ic xl")}<b>${esc(firstName(t && t.drop.name))}</b><p class="rd-sm">${sh.kind2 === "call" ? "المكالمة عن طريق توّا — رقمك ورقم العميل مخفيين." : "بنبعت: «أنا مندوب توّا وصلت بطلبك، ممكن ترد؟» من رقم توّا."}</p></div><p><b>${sh.kind2 === "call" ? "العميل رد؟" : "العميل رد على الرسالة؟"}</b></p>`, `<button class="btn rd-cta ok grow" data-act="contact" data-reached="1">${ic("check", "ic")}رد</button><button class="btn rd-cta2 grow" data-act="contact" data-reached="">${ic("x", "ic")}مردش</button>`);
  }
  if (sh.kind === "fail") {
    const t = find(S.tasks, sh.taskId); if (!t) return "";
    const calls = t.contact.filter((c) => c.kind === "call" && !c.ok).length, wa = t.contact.some((c) => c.kind === "whatsapp" && !c.ok), waited = t.unreachable && Date.now() >= t.unreachable.waitUntil;
    const unOk = calls >= 2 && wa && waited, sel = inst.ui.failReason;
    return TW.sheet("مقدرتش أسلّم؟", `<p class="rd-sm">اختار اللي حصل — كل سبب ليه خطوات، والدعم هو اللي يقرر (إعادة محاولة أو رجوع للمصدر).</p><div class="rd-reasons col">${TW.REASONS.deliveryFail.map((x) => { const lock = x === "العميل مش بيرد" && !unOk; return `<button class="${sel === x ? "on" : ""}" data-act="ui" data-k="failReason" data-v="${esc(x)}" aria-pressed="${sel === x}" ${lock ? "disabled" : ""}><b>${esc(x)}</b>${lock ? `<small>${ic("lock", "ic xs")} اتصل ${Math.max(0, 2 - calls)} كمان${wa ? "" : " + واتساب"}${t.unreachable && !waited ? ` واستنى ${dur(t.unreachable.waitUntil - Date.now())}` : !t.unreachable ? " واستنى المهلة" : ""}</small>` : ""}</button>`; }).join("")}</div>${sel ? `<div class="banner warn">${ic("info", "ic sm")}<div>${esc(FAIL_FLOW[sel] || "")}</div></div>` : ""}`, `<button class="btn danger lg grow" data-act="fail" data-task="${t.id}" ${sel ? "" : "disabled"}>${ic("flag", "ic sm")}سجّل وبلّغ الدعم</button><button class="btn lg" data-act="sheet-close">رجوع</button>`);
  }
  if (sh.kind === "deposit") {
    const amt = inst.ui.depAmt == null ? r.cash : inst.ui.depAmt;
    return TW.sheet("ورّد الكاش", `<div class="rd-cod"><span>معاك دلوقتي</span><b class="num">${num(r.cash)}</b><em>جنيه</em></div><label class="field"><span>هتورّد كام؟</span><input class="input num rd-amt-in" type="number" inputmode="decimal" data-model="depAmt" data-live value="${esc(amt)}"></label><label class="field"><span>مكان التوريد</span><select class="input" data-model="depPlace"><option ${(inst.ui.depPlace || "الهب") === "الهب" ? "selected" : ""}>الهب</option></select></label><p class="rd-sm">${ic("info", "ic xs")} سلّم الفلوس لأمين خزينة الهب وخد الإيصال. الحالة هتبقى «بانتظار تأكيد المالية» لحد ما يتعدّ.</p>`, `<button class="btn rd-cta grow" data-act="deposit" ${Number(amt) > 0 && Number(amt) <= r.cash + 0.01 ? "" : "disabled"}>${ic("building", "ic")}سجّل التوريد</button><button class="btn lg" data-act="sheet-close">رجوع</button>`);
  }
  return "";
}

/* ================================================================= APP */
TW.apps.rider = {
  kind: "phone", actorKind: "rider", title: "المندوب",
  init(inst) { inst.ui.lastR = inst.actorId(); },
  render(inst) {
    const r = me(inst);
    if (inst.ui.lastR !== r.id) { Object.keys(inst.ui).forEach((k) => { if (!k.startsWith("_")) delete inst.ui[k]; }); inst.ui.lastR = r.id; }
    const page = inst.route[0] || "";
    let top, body = "", dock = "";
    if (page === "job") {
      const t = find(TW.S.tasks, inst.route[1]);
      if (t && inst.ui.jobId !== t.id) { ["scanCode", "scanCount", "scanDamaged", "scanBag", "cashAmt", "varReason", "otp", "recollect", "failReason"].forEach((k) => delete inst.ui[k]); inst.ui.jobId = t.id; }
      top = topBar(inst, r, { back: true, title: t ? `مهمة ${t.orderId}` : "المهمة", sub: t ? `${TW.stLabel("task", t.status)} · ${t.id}` : "" });
      const v = jobView(inst, r, t); body = v.body; dock = v.dock;
    } else if (page === "jobs") { top = topBar(inst, r); body = jobsView(inst, r); }
    else if (page === "earnings") { top = topBar(inst, r); body = earningsView(inst, r); }
    else if (page === "cash") { top = topBar(inst, r); body = cashView(inst, r); }
    else if (page === "account") { top = topBar(inst, r); body = accountView(inst, r); }
    else { top = topBar(inst, r); body = homeView(inst, r); }
    return `<div class="app rd">${top}<div class="app-scroll"><div class="rd-body">${body}</div></div>${dock}${tabbar(inst, r)}${sheetView(inst, r)}${TW.inappToast(inst)}</div>`;
  },
  on: {
    online(inst) { const r = me(inst); const on = r.status === "offline"; const res = inst.act("rider.online", { riderId: r.id, online: on }); if (res.ok !== false) inst.toast(on ? "إنت أونلاين — المهام هتوصلك" : "الوردية خلصت — مش هيوصلك مهام", on ? "ok" : ""); },
    accept(inst, d) { const r = me(inst); const res = inst.act("task.accept", { taskId: d.task, riderId: r.id }); if (res.ok !== false) { inst.go(`/rider/job/${d.task}`); inst.toast("قبلت المهمة — روح على الاستلام", "ok"); } },
    "reject-open"(inst, d) { inst.ui.rjReason = null; inst.ui.sheet = { kind: "reject", taskId: d.task }; inst.render(); },
    reject(inst, d) { const r = me(inst); const res = inst.act("task.reject", { taskId: d.task, riderId: r.id, reason: inst.ui.rjReason || null }); if (res.ok !== false) { inst.ui.sheet = null; inst.toast("اترفضت — هتوصلك المهمة الجاية"); } else { inst.ui.sheet = null; inst.render(); } },
    "arrive-pickup"(inst, d) { const res = inst.act("task.arrivePickup", { taskId: d.task }); if (res.ok !== false) inst.toast("اتسجل وصولك — امسح الطرد", "ok"); },
    "scan-sim"(inst, d) { inst.ui.scanCode = d.code; inst.toast("اتقرى كود الطرد ✓", "ok"); },
    cnt(inst, d) { const t = find(TW.S.tasks, inst.route[1]); const p = t && (t.pickups.find((x) => !x.scanned) || t.pickups[0]); const f = p && find(TW.S.fos, p.foId); const exp = Math.max(1, (f && f.packages.length) || 1); const cur = inst.ui.scanCount == null ? exp : Number(inst.ui.scanCount); inst.ui.scanCount = Math.max(0, Math.min(9, cur + Number(d.d))); inst.render(); },
    "pk-issue"(inst, d) { const t = find(TW.S.tasks, inst.route[1]); const p = t && t.pickups.find((x) => !x.scanned); if (!p) return; const res = inst.act("task.pickupIssue", { taskId: t.id, sourceId: p.sourceId, type: d.type }); if (res.ok !== false) inst.toast("اتسجّل وبلّغنا الكنترول", "ok"); },
    scan(inst, d) {
      const t = find(TW.S.tasks, d.task), p = t.pickups.find((x) => x.sourceId === d.src && !x.scanned), f = p && find(TW.S.fos, p.foId);
      if (!p) return;
      const exp = Math.max(1, (f && f.packages.length) || 1), cnt = inst.ui.scanCount == null ? exp : Number(inst.ui.scanCount), dmg = !!inst.ui.scanDamaged;
      const cold = t.handling.some((h) => h === "chilled" || h === "frozen" || h === "hot");
      if (!dmg && cnt >= exp && cold && !inst.ui.scanBag) return inst.toast("أكد إن الطرد في الشنطة المناسبة الأول", "bad");
      const code = String(inst.ui.scanCode || "").trim(); if (!/^\d{4}$/.test(code)) return inst.toast("امسح الباركود أو اكتب كود الاستلام (4 أرقام)", "bad");
      const res = TW.act("task.scan", { taskId: t.id, sourceId: p.sourceId, code, count: cnt, damaged: dmg }, TW.actor.rider(me(inst).id));
      if (res && res.blocked) { /* the exception was recorded on the task; make it visible everywhere (audited event + re-render) */ TW.act("task.pickupIssue", { taskId: t.id, sourceId: p.sourceId, type: dmg ? "طرد تالف" : "طرد ناقص" }, TW.actor.rider(me(inst).id)); inst.ui.scanDamaged = ""; inst.ui.scanCount = null; inst.toast(res.error, "bad"); return; }
      if (res && res.ok === false) return inst.toast(res.error, "bad");
      ["scanCode", "scanCount", "scanDamaged", "scanBag"].forEach((k) => delete inst.ui[k]);
      inst.toast(t.status === "PICKED_UP" ? "استلمت ✓ — اتسجّلت الحيازة. اطلع على العميل" : "استلمت ✓ — روح على الاستلام التاني", "ok");
    },
    arrive(inst, d) { const res = inst.act("task.arrive", { taskId: d.task }); if (res.ok !== false) inst.toast("اتسجل وصولك — العميل اتبلّغ", "ok"); },
    "contact-open"(inst, d) { const r = me(inst), t = curTask(r); if (!t) return; inst.ui.sheet = { kind: "contact", kind2: d.kind, taskId: t.id }; inst.render(); },
    contact(inst, d) { const sh = inst.ui.sheet; inst.ui.sheet = null; const res = inst.act("task.contact", { taskId: sh.taskId, kind: sh.kind2, reached: !!d.reached }); if (res.ok !== false) inst.toast(d.reached ? "تمام — العميل نازل" : "اتسجلت المحاولة", d.reached ? "ok" : ""); },
    collect(inst, d) {
      const t = find(TW.S.tasks, d.task), amt = inst.ui.cashAmt == null ? t.cod : Number(inst.ui.cashAmt);
      if (!(amt >= 0)) return inst.toast("اكتب المبلغ اللي استلمته", "bad");
      const diff = Math.abs(amt - t.cod) > 0.01; if (diff && !inst.ui.varReason) return inst.toast("المبلغ مختلف — اختار سبب الفرق", "bad");
      const res = inst.act("task.collect", { taskId: t.id, amount: amt, reason: diff ? inst.ui.varReason : null }); if (res.ok !== false) { inst.ui.recollect = false; inst.toast(`اتسجّل ${money(amt)} — خد كود الاستلام من العميل`, "ok"); }
    },
    recollect(inst) { inst.ui.recollect = true; inst.render(); },
    deliver(inst, d, el) {
      const otp = String(inst.ui.otp || "").trim(); if (!/^\d{4}$/.test(otp)) return inst.toast("اكتب كود الاستلام (4 أرقام) من العميل", "bad");
      const taskId = d.task || el.dataset.task; const res = inst.act("task.deliver", { taskId, otp }); if (res.ok !== false) { inst.ui.otp = ""; inst.toast("تم التسليم ✓ — الكاش اتسجّل على حسابك", "ok"); }
    },
    "fail-open"(inst) { const r = me(inst), t = curTask(r); if (!t) return; inst.ui.failReason = null; inst.ui.sheet = { kind: "fail", taskId: t.id }; inst.render(); },
    fail(inst, d) { if (!inst.ui.failReason) return; const res = inst.act("task.fail", { taskId: d.task, reason: inst.ui.failReason }); if (res.ok !== false) { inst.ui.sheet = null; inst.toast("اتسجّل وبلّغنا الدعم — استنى القرار", "ok"); } },
    "deposit-open"(inst) { inst.ui.depAmt = null; inst.ui.sheet = { kind: "deposit" }; inst.render(); },
    deposit(inst) { const r = me(inst); const amt = inst.ui.depAmt == null ? r.cash : Number(inst.ui.depAmt); const res = inst.act("rider.deposit", { riderId: r.id, amount: amt, at: inst.ui.depPlace || "الهب" }); if (res.ok !== false) { inst.ui.sheet = null; inst.go("/rider/cash"); inst.toast(`اتسجّل توريد ${money(amt)} — بانتظار تأكيد المالية`, "ok"); } },
  },
};
})();
