/* Twaa Control Center — SUPPLY (Hub · Inventory · Purchasing · Receiving · Picking & Packing · Returns)
   and DELIVERY (Riders · Rider 360 · Fleet · Zones · Dispatch queue · Route planning).
   Pages read TW.S through selectors and change it only through inst.act(). Module-local actions (store conventions + TW.audit):
     hub.manual   take a hub FO out of the simulated auto-picker (f.manualPick) so a human picks it
     hub.recount  EX-INV-001 recount: the stock was found → record the counted quantity and clear the exception
     hub.putaway  confirm bin put-away after a PO was received (barcode movement on record)
     po.request   procurement request → po.create (approval before any PO) + audit line */
(function () {
const TW = window.TW, D = TW.D, A = TW.A;
const { ic, esc, money, num, pct, chip, clock, kpi, meter, sum } = TW;
const MIN = 60000;
const now = () => Date.now();
const find = (arr, id) => arr.find((x) => x.id === id);
const skuOf = (id) => find(TW.S.skus, id) || { id, ar: id, size: "", barcode: "—", dept: "", price: 0, handling: "normal" };
const invOf = (id) => TW.S.inv.h1[id];
const availOf = (id) => TW.hubAvail(id);
const coverOf = (id) => { const x = invOf(id); if (!x) return 0; return x.velocity > 0 ? availOf(id) / x.velocity : 999; };
const deptAr = (id) => (D.depts.find((d) => d.id === id) || {}).ar || "—";
const isToday = (ts) => !!ts && new Date(ts).toDateString() === new Date().toDateString();
const orderOf = (id) => find(TW.S.orders, id);
const ui = (inst, k, d) => (inst.ui[k] == null ? d : inst.ui[k]);
const dcov = (n) => (n >= 999 ? "∞" : n >= 100 ? "+99" : num(n, n < 10 ? 1 : 0));
const HUB_ROLES = ["founder", "gm", "ops", "hub", "picker"];
const hubOk = () => HUB_ROLES.includes(TW.roleOf().id);
const HUB_WHY = "مخصص لطاقم الهب (مدير الهب، المجمّعين، العمليات)";
const canPO = () => TW.can("po.approve") || TW.can("inventory.adjust");
const gbtn = (ok, why, label, act, opts = {}) => { if (ok) return TW.btn(label, act, opts); const lock = why === HUB_WHY || /صلاحية|مخصص/.test(why); return `<button type="button" class="btn ${opts.cls || ""}" disabled title="${esc(why)}">${ic(lock ? "lock" : opts.icon || "lock", "ic sm")}<span>${esc(label)}</span></button>`; };
const seg = (k, items, cur) => `<div class="seg sp-seg" role="tablist">${items.map(([v, l, n]) => `<button type="button" class="${String(cur) === String(v) ? "on" : ""}" data-act="ui" data-k="${k}" data-v="${esc(v)}" role="tab" aria-selected="${String(cur) === String(v)}">${esc(l)}${n != null ? ` <span class="sp-n">${esc(n)}</span>` : ""}</button>`).join("")}</div>`;
const card = (title, icn, body, tools = "", cls = "") => `<div class="card ${cls}"><div class="hd"><h3>${ic(icn, "ic sm")} ${title}</h3>${tools}</div>${body}</div>`;
const mini = (label, value, sub, tone) => `<div class="sp-mini ${tone ? "t-" + tone : ""}"><span>${esc(label)}</span><b class="num">${value}</b>${sub ? `<small>${sub}</small>` : ""}</div>`;
const HANDLING = { chilled: ["مبرد", "info", "snow"], frozen: ["مجمد", "info", "snow"], hot: ["ساخن", "warn", "flame"], fragile: ["قابل للكسر", "warn", "fragile"], separate: ["منفصل (منظفات)", "neutral", "spray"], normal: ["عادي", "neutral", null] };
const hChip = (h) => (h && h !== "normal" && HANDLING[h] ? chip(HANDLING[h][0], HANDLING[h][1], HANDLING[h][2]) : "");
const cbox = (on, act, data, label) => `<button type="button" class="sp-check ${on ? "on" : ""}" role="checkbox" aria-checked="${on}" aria-label="${esc(label)}" data-act="${act}"${TW.dataAttrs(data)}>${on ? ic("check", "ic xs") : ""}</button>`;
const hubFos = () => TW.S.fos.filter((f) => { if (f.sourceType !== "hub") return false; const o = orderOf(f.orderId); return o && o.status !== "CANCELLED"; });
const foLines = (f) => { const o = orderOf(f.orderId); return o ? o.lines.filter((l) => l.foId === f.id) : []; };
const lineCost = (skuId, q) => { const x = invOf(skuId); return (x ? x.cost : skuOf(skuId).price * 0.85) * q; };

/* ===================================================================== module actions ===================== */
const ACT = TW.actions;
const fail = (error, extra) => ({ ok: false, error, ...(extra || {}) });
ACT["hub.manual"] = ({ foId, on }, actor) => {
  const f = find(TW.S.fos, foId);
  if (!f || f.sourceType !== "hub") return fail("أمر التنفيذ ده مش من الهب");
  if (!["QUEUED", "PICKING"].includes(f.status)) return fail("التجميع خلص بالفعل");
  if (!!f.manualPick === !!on) return { ok: true };
  f.manualPick = !!on;
  TW.audit(actor, f.id, on ? "تجميع يدوي" : "رجوع للتجميع الآلي", on ? "آلي (محاكاة)" : "يدوي", on ? "يدوي" : "آلي (محاكاة)", on ? "المجمّع استلم أمر التنفيذ" : "تسليم أمر التنفيذ للمحاكاة");
  return { ok: true };
};
ACT["hub.recount"] = ({ foId, key, count, reason }, actor) => {
  const S = TW.S, f = find(S.fos, foId), o = f && orderOf(f.orderId), l = o && o.lines.find((x) => x.key === key);
  if (!l || l.state !== "missing") return fail("البند ده مفيهوش استثناء عدّ مفتوح");
  if (!reason || !String(reason).trim()) return fail("السبب إلزامي لإعادة العد (BR-INV-003)");
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return fail("اكتب العدد الفعلي على الرف");
  if (n < l.qty) return fail(`العدد (${n}) أقل من المطلوب (${l.qty}) — سجّل «الرف فاضي» عشان يبدأ مسار البديل`);
  const iv = S.inv.h1[l.skuId]; const before = iv.onHand;
  S.moves.unshift({ id: `MV-${S.seq.mv++}`, at: now(), skuId: l.skuId, type: "إعادة عدّ (EX-INV-001)", qty: n - before, before, after: n, reason: `EX-INV-001 — ${reason}`, user: actor.name, evidence: "عدّ فعلي + مسح باركود الرف" });
  iv.onHand = n; iv.shelfEmpty = false;
  l.state = "ok"; l.issue = null; f.exception = null; f.manualPick = true;
  o.events.push({ at: now(), code: "RECOUNT", text: `إعادة عدّ ${l.name}: ${n} وحدة — التجميع كمّل`, who: "admin" });
  TW.audit(actor, `${l.skuId} (مخزون)`, "إعادة عدّ — EX-INV-001", before, n, reason);
  return { ok: true };
};
ACT["hub.putaway"] = ({ poId }, actor) => {
  const S = TW.S, po = find(S.pos, poId);
  if (!po || po.status !== "RECEIVED") return fail("أمر الشراء لسه ما اتستلمش");
  if (po.putaway) return fail("اتسكّن بالفعل");
  (po.receivedLines || []).forEach(([id, q]) => { const iv = S.inv.h1[id]; if (iv && q) S.moves.unshift({ id: `MV-${S.seq.mv++}`, at: now(), skuId: id, type: "تسكين على الرف", qty: 0, before: iv.onHand, after: iv.onHand, reason: `${po.id} → ${iv.bin}`, user: actor.name, evidence: `مسح باركود الرف ${iv.bin}` }); });
  po.putaway = { at: now(), by: actor.name };
  TW.audit(actor, po.id, "تسكين بضاعة على الأرفف", "منطقة الاستلام", "الأرفف", "مسح باركود الرف");
  return { ok: true };
};
ACT["po.request"] = ({ lines, supplier, reason }, actor) => {
  if (actor.kind === "admin" && !(TW.can("po.approve", actor.id) || TW.can("inventory.adjust", actor.id))) return fail("طلب الشراء محتاج صلاحية المشتريات أو المخزون", { denied: true });
  if (!lines || !lines.length) return fail("اختار أصناف الأول");
  if (lines.some((l) => !(Number(l[1]) > 0))) return fail("كل كمية لازم تكون أكبر من صفر");
  const res = ACT["po.create"]({ lines: lines.map(([id, q, c]) => [id, Number(q), Number(c)]), supplier }, actor);
  TW.audit(actor, res.id, "طلب أمر شراء (بانتظار الاعتماد)", null, `${lines.length} أصناف · ${money(sum(lines, (l) => l[1] * l[2]))}`, reason || "توصية الشراء");
  return res;
};

/* ===================================================================== shared supply helpers ===================== */
const STATES = [["onHand", "الرصيد الفعلي", "On-hand"], ["reserved", "محجوز لطلبات", "Reserved"], ["available", "متاح للبيع", "Available"], ["incoming", "وارد", "Incoming"], ["damaged", "تالف", "Damaged"], ["expired", "منتهي الصلاحية", "Expired"], ["quarantine", "حجر / عزل", "Quarantine"]];
function stockTotals() {
  const t = {}; STATES.forEach(([k]) => (t[k] = { u: 0, v: 0 }));
  Object.values(TW.S.inv.h1).forEach((x) => { const vals = { ...x, available: Math.max(0, x.onHand - x.reserved) }; STATES.forEach(([k]) => { t[k].u += vals[k] || 0; t[k].v += (vals[k] || 0) * x.cost; }); });
  return t;
}
const pipeline = () => { const m = {}; TW.S.pos.filter((p) => ["PENDING_APPROVAL", "APPROVED", "RECEIVING"].includes(p.status)).forEach((p) => p.lines.forEach(([id, q]) => (m[id] = (m[id] || 0) + q))); return m; };
const receivedHere = () => new Set(TW.S.moves.filter((m) => m.type === "استلام").map((m) => m.reason));
const exceptionsBySku = () => { const m = {}; hubFos().forEach((f) => { if (f.exception && f.status === "PICKING") foLines(f).filter((l) => l.state === "missing").forEach((l) => (m[l.skuId] = f)); }); return m; };
function procSteps() {
  const S = TW.S, hf = hubFos(), rh = receivedHere();
  const reserved = sum(Object.values(S.inv.h1), (x) => x.reserved);
  const readyToPack = hf.filter((f) => f.status === "PICKING" && foLines(f).every((l) => l.picked || l.state === "removed")).length;
  return [
    [1, "أمر شراء", "Purchase order", S.pos.filter((p) => p.status === "PENDING_APPROVAL").length, "بانتظار الاعتماد", "/admin/purchasing", "cart"],
    [2, "استلام", "Receiving", S.pos.filter((p) => ["APPROVED", "RECEIVING"].includes(p.status)).length, "أمر على الباب", "/admin/receiving", "inbox"],
    [3, "فروقات", "Discrepancy", S.pos.filter((p) => p.discrepancy).length, "مطالبة مورد", "/admin/receiving", "alert"],
    [4, "تسكين", "Put-away", S.pos.filter((p) => p.status === "RECEIVED" && !p.putaway && rh.has(p.id)).length, "بانتظار الرف", "/admin/receiving", "layers"],
    [5, "متاح", "Available", Object.keys(S.inv.h1).filter((id) => availOf(id) > 0).length, "SKU قابل للبيع", "/admin/inventory", "check"],
    [6, "حجز", "Reservation", reserved, "وحدة محجوزة", "/admin/inventory", "lock"],
    [7, "تجميع", "Picking", hf.filter((f) => ["QUEUED", "PICKING"].includes(f.status)).length, "أمر في الطابور", "/admin/picking", "scan"],
    [8, "تغليف", "Packing", readyToPack, "جاهز للتغليف", "/admin/picking", "box"],
    [9, "تسليم للمندوب", "Dispatch", hf.filter((f) => f.status === "PACKED").length, "طرد بانتظار المندوب", "/admin/dispatch-queue", "bike"],
    [10, "مرتجع", "Return", S.returns.filter((r) => r.status === "IN_TRANSIT").length, "في الطريق للهب", "/admin/returns", "undo"],
    [11, "فحص", "Inspection", S.returns.filter((r) => r.status === "INSPECTION").length, "بانتظار الفحص", "/admin/returns", "eye"],
    [12, "إعادة / عزل / هالك", "Restock · Quarantine · Waste", S.returns.filter((r) => ["RESTOCKED", "QUARANTINED", "WASTE"].includes(r.status)).length, "مرتجع اتقفل", "/admin/returns", "refresh"],
  ];
}
const procStrip = () => `<div class="sp-proc" role="list">${procSteps().map(([n, ar, en, c, sub, to, icn]) => `<button type="button" role="listitem" class="sp-step ${c ? "has" : ""}" data-act="go" data-to="${to}" title="${esc(en)}"><span class="sp-sn">${n}</span><span class="sp-sl">${ic(icn, "ic xs")}${esc(ar)}</span><b class="num">${num(c)}</b><small>${esc(sub)}</small></button>`).join("")}</div>`;
const moveCols = (withSku = true) => [
  { k: "at", label: "الوقت", render: (m) => `${clock(m.at)}<span class="sub">${isToday(m.at) ? "اليوم" : TW.dateAr(m.at)}</span>` },
  ...(withSku ? [{ k: "skuId", label: "الصنف", render: (m) => `${esc(skuOf(m.skuId).ar)}<span class="sub mono">${esc(m.skuId)}</span>` }] : []),
  { k: "type", label: "الحركة", render: (m) => chip(m.type, /استلام|تسكين/.test(m.type) ? "ok" : /تالف|رف فاضي|شطب|منتهي|مفقود/.test(m.type) ? "bad" : "info") },
  { k: "before", label: "قبل", num: true, render: (m) => num(m.before) },
  { k: "after", label: "بعد", num: true, render: (m) => num(m.after) },
  { k: "qty", label: "الفرق", num: true, render: (m) => `<b style="color:${m.qty < 0 ? "var(--bad)" : m.qty > 0 ? "var(--ok)" : "var(--muted)"}">${m.qty > 0 ? "+" : ""}${num(m.qty)}</b>` },
  { k: "reason", label: "السبب", render: (m) => esc(m.reason) },
  { k: "user", label: "المستخدم", render: (m) => esc(m.user) },
  { k: "evidence", label: "الدليل", render: (m) => `<span class="muted">${esc(m.evidence || "—")}</span>` },
];

/* ===================================================================== HUB overview ===================== */
TW.page("hub", {
  render(inst) {
    const S = TW.S, h = find(S.hubs, "h1"), tot = stockTotals(), hf = hubFos(), sla = S.rules.pickSlaMin;
    const queue = hf.filter((f) => ["QUEUED", "PICKING"].includes(f.status)).sort((a, b) => (!!b.exception - !!a.exception) || (a.pickStart || a.createdAt) - (b.pickStart || b.createdAt));
    const exc = queue.filter((f) => f.exception);
    const done = hf.filter((f) => f.pickStart && f.readyAt && isToday(f.readyAt));
    const avgPick = done.length ? sum(done, (f) => f.readyAt - f.pickStart) / done.length : 0;
    const inSla = done.filter((f) => f.readyAt - f.pickStart <= sla * MIN).length;
    const ids = Object.keys(S.inv.h1);
    const expiring = ids.filter((id) => invOf(id).onHand > 0 && invOf(id).expiryDays <= 3).sort((a, b) => invOf(a).expiryDays - invOf(b).expiryDays);
    const slow = ids.filter((id) => invOf(id).onHand > 0 && invOf(id).velocity < 1).sort((a, b) => invOf(b).onHand * invOf(b).cost - invOf(a).onHand * invOf(a).cost);
    const low = ids.filter((id) => availOf(id) <= invOf(id).reorderPt);
    const moves = S.moves.filter((m) => isToday(m.at));
    const activePickers = [...new Set(queue.filter((f) => f.status === "PICKING" && f.picker).map((f) => f.picker))];
    const atRisk = tot.damaged.v + tot.expired.v + tot.quarantine.v;
    const shrink = shrinkage();
    const head = A.head("الهب — " + h.ar, `مخزون توّا المملوك · ساعات العمل ${h.hours} · أرفف ${h.bins} · SLA التجميع ${sla} د`, `<div class="row wrap">${TW.btn("وضع المجمّع", "go", { cls: "sm primary", icon: "scan", data: { to: "/admin/picking" } })}${TW.btn("المخزون", "go", { cls: "sm", icon: "layers", data: { to: "/admin/inventory" } })}</div>`);
    const answer = A.answer({ what: `${queue.length} أوامر في التجميع · ${num(tot.available.u)} وحدة متاحة`, attention: exc.length ? `${exc.length} عدم تطابق رف (EX-INV-001)` : low.length ? `${low.length} SKU تحت نقطة الطلب` : "لا شيء عاجل", owner: "مدير الهب — حمدي رزق", risk: `${money(atRisk)} تالف/منتهي/حجر · ${expiring.length} صنف ينتهي ≤ 3 أيام` });
    const states = `<div class="sp-states">${STATES.map(([k, ar, en]) => kpi(`${ar} · ${en}`, num(tot[k].u), `${money(tot[k].v)} بالتكلفة`, { tone: ["damaged", "expired", "quarantine"].includes(k) && tot[k].u ? "warn" : k === "available" ? "ok" : "" })).join("")}</div>`;
    const qList = queue.length ? `<div class="list">${queue.slice(0, 7).map((f) => { const o = orderOf(f.orderId), ls = foLines(f).filter((l) => l.state !== "removed"); return `<div class="li"><span class="mono">${esc(f.orderId)}</span><span class="grow">${esc(A.customer(o.customerId))} · ${esc(A.zone(o.zoneId))}<span class="sub muted">${ls.filter((l) => l.picked).length}/${ls.length} أصناف ${f.picker ? "· " + esc(f.picker) : ""}</span></span>${f.exception ? chip(f.exception.code, "bad", "alert") : o.hold ? chip("بانتظار الدفع", "warn") : A.st("fo", f.status)}${f.status === "PICKING" && f.pickStart ? `<span class="timer" data-until="${f.pickStart + sla * MIN}"></span>` : `<span class="muted" style="font-size:12px">انتظار <span class="timer" data-since="${f.createdAt}"></span></span>`}</div>`; }).join("")}</div>` : TW.empty("الطابور فاضي", "كل أوامر الهب اتغلفت", "check");
    const qCard = card("طابور التجميع و SLA", "scan", `<div class="sp-minis">${mini("في الطابور", num(queue.filter((f) => f.status === "QUEUED").length))}${mini("جاري التجميع", num(queue.filter((f) => f.status === "PICKING").length))}${mini("متوسط زمن التجميع اليوم", done.length ? TW.dur(avgPick) : "—", `SLA ${sla} د`, avgPick > sla * MIN ? "bad" : "ok")}${mini("الالتزام بالـ SLA", done.length ? pct(inSla / done.length) : "—", `${inSla}/${done.length} أمر`)}${mini("مجمّعين في الوردية", `${activePickers.length}/${h.pickers}`, "شغالين / في الوردية", queue.length > h.pickers * 2 ? "warn" : "")}</div>${exc.map((f) => `<div class="banner bad" style="margin-top:10px">${ic("alert", "ic sm")}<div class="grow"><b>${esc(f.exception.code)} — ${esc(f.exception.text)}</b><div class="muted">${esc(f.orderId)} · المسؤول: ${esc(f.exception.owner)} · من <span class="timer" data-since="${f.exception.at}"></span></div></div>${TW.btn("أعد العد", "sp-goto-pick", { cls: "sm danger", data: { fo: f.id } })}</div>`).join("")}<div style="margin-top:10px">${qList}</div>${queue.length > h.pickers * 2 ? `<div class="banner warn" style="margin-top:8px">${ic("alert", "ic sm")}<div>EX-INV-003 — الطابور أكبر من سعة المجمّعين؛ أعد توزيع الطاقم.</div></div>` : ""}`, TW.btn("افتح وضع المجمّع", "go", { cls: "sm", icon: "arrowL", data: { to: "/admin/picking" } }));
    const expCard = card("ينتهي قريباً (≤ 3 أيام)", "clock", expiring.length ? TW.table([{ k: "s", label: "الصنف", render: (id) => `${esc(skuOf(id).ar)}<span class="sub">${esc(invOf(id).bin)}</span>` }, { k: "d", label: "متبقي", num: true, render: (id) => chip(`${invOf(id).expiryDays} يوم`, invOf(id).expiryDays <= 1 ? "bad" : "warn") }, { k: "q", label: "رصيد", num: true, render: (id) => num(invOf(id).onHand) }, { k: "v", label: "قيمة معرضة", num: true, render: (id) => money(Math.max(0, invOf(id).onHand - invOf(id).velocity * invOf(id).expiryDays) * invOf(id).cost) }, { k: "a", label: "", render: (id) => A.permBtn("inventory.adjust", "شطب/تسوية", "sp-adj-open", { cls: "sm", data: { id } }) }], expiring.slice(0, 6)) : TW.empty("مفيش أصناف قربت تنتهي", "", "check"));
    const slowCard = card("مخزون راكد وبطيء الحركة", "pause", slow.length ? TW.table([{ k: "s", label: "الصنف", render: (id) => `${esc(skuOf(id).ar)}<span class="sub">${esc(deptAr(skuOf(id).dept))}</span>` }, { k: "vel", label: "مبيعات/يوم", num: true, render: (id) => num(invOf(id).velocity, 1) }, { k: "c", label: "تغطية", num: true, render: (id) => `${dcov(invOf(id).onHand / Math.max(0.01, invOf(id).velocity))} يوم` }, { k: "v", label: "كاش مربوط", num: true, render: (id) => money(invOf(id).onHand * invOf(id).cost) }], slow.slice(0, 6)) + `<p class="muted" style="font-size:12px;margin-top:6px">الراكد = أقل من وحدة/يوم. القرار: عرض تصريف، وقف إعادة الطلب، أو مرتجع للمورد — من <button class="btn sm ghost" data-act="go" data-to="/admin/purchasing" style="padding:0 4px">مراقبة التكدس</button>.</p>` : TW.empty("مفيش مخزون راكد", "", "check"));
    const movCard = card("حركات المخزون اليوم", "history", moves.length ? TW.table(moveCols(), moves.slice(0, 8)) : TW.empty("لسه مفيش حركات اليوم", "كل استلام، تسوية، تالف أو إعادة عدّ بيظهر هنا بالسبب والمستخدم والوقت والقبل/بعد.", "history"), TW.btn("السجل الكامل", "go", { cls: "sm", data: { to: "/admin/inventory" } }));
    const shrinkCard = card("الفاقد (Guardrail I)", "scale", `${TW.hbars(shrink.rows.map((r) => ({ label: r[0], value: Math.round(r[1]), tone: "bad" })), { fmt: (v) => money(v) })}<div class="row between" style="margin-top:8px"><span class="muted">إجمالي الفاقد المسجّل</span><b class="num">${money(shrink.total)}</b></div>`);
    return `${head}${answer}${states}${card("دورة البضاعة في الهب — 12 مرحلة", "route", procStrip(), `<span class="muted" style="font-size:12px">كل رقم لحظي — اضغط للمرحلة</span>`)}<div class="grid sp-g21">${qCard}<div class="col gap12">${shrinkCard}${expCard}</div></div><div class="grid g2">${slowCard}${movCard}</div>`;
  },
  on: { "sp-goto-pick"(inst, d) { inst.ui.spPick = d.fo; inst.go("/admin/picking"); } },
});
function shrinkage() {
  const S = TW.S, inv = Object.values(S.inv.h1);
  const missing = sum(S.moves.filter((m) => /رف فاضي|مفقود/.test(m.type + m.reason) && m.qty < 0), (m) => -m.qty * ((invOf(m.skuId) || {}).cost || 0));
  const adj = sum(S.moves.filter((m) => /^تسوية/.test(m.type) && m.qty < 0 && !/مفقود/.test(m.reason)), (m) => -m.qty * ((invOf(m.skuId) || {}).cost || 0));
  const ret = sum(S.returns.filter((r) => ["WASTE", "QUARANTINED"].includes(r.status)), (r) => returnValue(r));
  const rows = [["تالف", sum(inv, (x) => x.damaged * x.cost)], ["منتهي الصلاحية", sum(inv, (x) => x.expired * x.cost)], ["مفقود / عجز رف", missing], ["تسويات بالسالب", adj], ["خسارة مرتجعات", ret]];
  return { rows, total: sum(rows, (r) => r[1]) };
}

/* ===================================================================== INVENTORY ===================== */
const ADJ_FIELDS = [["onHand", "الرصيد الفعلي"], ["damaged", "تالف"], ["expired", "منتهي الصلاحية"], ["quarantine", "حجر / عزل"]];
const EVIDENCE = ["تقرير الجرد", "صورة الرف/العبوة", "مسح باركود", "فاتورة المورد", "تقرير المرتجع", "لا يوجد"];
const EVIDENCE_REQUIRED = ["تالف", "منتهي الصلاحية", "مفقود", "مرتجع غير صالح", "خطأ استلام"];
function invRows(inst) {
  const S = TW.S, q = TW.norm(ui(inst, "spInvQ", "")), dept = ui(inst, "spInvDept", "all"), f = ui(inst, "spInvF", "all"), ex = exceptionsBySku();
  let rows = Object.keys(S.inv.h1).map((id) => ({ id, s: skuOf(id), x: invOf(id), a: availOf(id), c: coverOf(id), ex: ex[id] }));
  if (q) rows = rows.filter((r) => TW.norm(`${r.s.ar} ${r.s.en} ${r.id} ${r.s.barcode} ${r.x.bin}`).includes(q));
  if (dept !== "all") rows = rows.filter((r) => r.s.dept === dept);
  if (f === "low") rows = rows.filter((r) => r.a <= r.x.reorderPt);
  if (f === "exp") rows = rows.filter((r) => r.x.onHand > 0 && r.x.expiryDays <= 5);
  if (f === "mis") rows = rows.filter((r) => r.x.shelfEmpty || r.ex);
  if (f === "bad") rows = rows.filter((r) => r.x.damaged + r.x.expired + r.x.quarantine > 0);
  const sort = ui(inst, "spInvSort", "cover");
  rows.sort(sort === "value" ? (a, b) => b.x.onHand * b.x.cost - a.x.onHand * a.x.cost : sort === "name" ? (a, b) => a.s.ar.localeCompare(b.s.ar, "ar") : (a, b) => a.c - b.c);
  return rows;
}
TW.page("inventory", {
  render(inst) {
    const S = TW.S, ids = Object.keys(S.inv.h1), ex = exceptionsBySku();
    const low = ids.filter((id) => availOf(id) <= invOf(id).reorderPt).length, exp = ids.filter((id) => invOf(id).onHand > 0 && invOf(id).expiryDays <= 5).length;
    const mis = ids.filter((id) => invOf(id).shelfEmpty || ex[id]).length, bad = ids.filter((id) => { const x = invOf(id); return x.damaged + x.expired + x.quarantine > 0; }).length;
    const value = sum(ids, (id) => invOf(id).onHand * invOf(id).cost);
    const rows = invRows(inst), all = ui(inst, "spInvAll", "") === "1", shown = all ? rows : rows.slice(0, 40);
    const selSku = ui(inst, "spInvSku", "");
    const depts = [...new Set(ids.map((id) => skuOf(id).dept))];
    const cols = [
      { k: "s", label: "الصنف", render: (r) => `<div class="sp-skucell"><b>${esc(r.s.ar)}</b> <span class="muted">${esc(r.s.size)}</span><span class="sub"><span class="mono">${esc(r.id)}</span> · ${esc(deptAr(r.s.dept))}</span></div>` },
      { k: "bin", label: "الرف", render: (r) => `<span class="mono sp-binx">${esc(r.x.bin)}</span>` },
      { k: "onHand", label: "فعلي", num: true, render: (r) => num(r.x.onHand) },
      { k: "res", label: "محجوز", num: true, render: (r) => (r.x.reserved ? `<span style="color:var(--info)">${num(r.x.reserved)}</span>` : "0") },
      { k: "av", label: "متاح", num: true, render: (r) => `<b style="color:${r.a <= r.x.reorderPt ? "var(--bad)" : "var(--ink)"}">${num(r.a)}</b>` },
      { k: "inc", label: "وارد", num: true, render: (r) => num(r.x.incoming) },
      { k: "dmg", label: "تالف", num: true, render: (r) => (r.x.damaged ? `<span style="color:var(--bad)">${r.x.damaged}</span>` : "0") },
      { k: "expd", label: "منتهي", num: true, render: (r) => (r.x.expired ? `<span style="color:var(--bad)">${r.x.expired}</span>` : "0") },
      { k: "q", label: "حجر", num: true, render: (r) => num(r.x.quarantine) },
      { k: "rp", label: "نقطة الطلب", num: true, render: (r) => num(r.x.reorderPt) },
      { k: "cov", label: "تغطية (يوم)", num: true, render: (r) => `<b style="color:${r.c < 1 ? "var(--bad)" : r.c < 3 ? "var(--warn)" : "var(--ink)"}">${dcov(r.c)}</b><span class="sub">بيع ${num(r.x.velocity, 1)} يومياً</span>` },
      { k: "cost", label: "التكلفة", num: true, render: (r) => money(r.x.cost, 2) },
      { k: "val", label: "القيمة", num: true, render: (r) => money(r.x.onHand * r.x.cost) },
      { k: "flags", label: "تنبيهات", render: (r) => `<div class="row wrap gap4">${r.x.shelfEmpty || r.ex ? chip("EX-INV-001 رف فاضي", "bad", "alert") : ""}${r.a <= r.x.reorderPt ? chip("تحت نقطة الطلب", "warn") : ""}${r.x.onHand > 0 && r.x.expiryDays <= 5 ? chip(`ينتهي ${r.x.expiryDays} يوم`, r.x.expiryDays <= 2 ? "bad" : "warn") : ""}${r.x.velocity < 1 && r.x.onHand > 10 ? chip("راكد", "neutral") : ""}</div>` },
      { k: "act", label: "", render: (r) => `<div class="row gap4">${A.permBtn("inventory.adjust", "تسوية", "sp-adj-open", { cls: "sm", data: { id: r.id } })}<button type="button" class="btn sm ghost" data-act="ui" data-k="spInvSku" data-v="${r.id}" title="سجل حركات الصنف">${ic("history", "ic sm")}</button></div>` },
    ];
    const moves = selSku ? S.moves.filter((m) => m.skuId === selSku) : S.moves;
    const invAudit = S.audit.filter((a) => /مخزون/.test(a.obj) && (!selSku || a.obj.includes(selSku) || a.obj.includes(skuOf(selSku).ar)));
    return `${A.head("المخزون", "على مستوى الـ SKU — المتاح = الفعلي − المحجوز · كل تسوية بسبب ومستخدم ووقت وقبل/بعد (لا تعديل خفي)", `<div class="row wrap">${TW.btn("الهب", "go", { cls: "sm", icon: "building", data: { to: "/admin/hub" } })}${TW.btn("اقتراحات الشراء", "go", { cls: "sm", icon: "cart", data: { to: "/admin/purchasing" } })}</div>`)}
      <div class="grid g5">${kpi("SKUs في الهب", num(ids.length), `${num(ids.filter((id) => availOf(id) > 0).length)} متاح للبيع`)}${kpi("قيمة المخزون بالتكلفة", TW.kmoney(value), "رصيد فعلي")}${kpi("تحت نقطة الطلب", num(low), "محتاج شراء", { tone: low ? "warn" : "", act: "ui", data: { k: "spInvF", v: "low" } })}${kpi("ينتهي خلال 5 أيام", num(exp), "قرار تصريف/شطب", { tone: exp ? "warn" : "", act: "ui", data: { k: "spInvF", v: "exp" } })}${kpi("عدم تطابق رف", num(mis), "EX-INV-001", { tone: mis ? "bad" : "ok", act: "ui", data: { k: "spInvF", v: "mis" } })}</div>
      <div class="filters"><input class="input" style="min-width:220px;flex:1" data-model="spInvQ" data-live placeholder="ابحث بالاسم أو الكود أو الباركود أو الرف" value="${esc(ui(inst, "spInvQ", ""))}" aria-label="بحث في المخزون">
        <select class="input" data-model="spInvDept" aria-label="القسم"><option value="all">كل الأقسام</option>${depts.map((d) => `<option value="${d}" ${ui(inst, "spInvDept", "all") === d ? "selected" : ""}>${esc(deptAr(d))}</option>`).join("")}</select>
        ${seg("spInvF", [["all", "الكل"], ["low", "مخزون منخفض", low], ["exp", "قرب الانتهاء", exp], ["mis", "عدم تطابق رف", mis], ["bad", "تالف/حجر", bad]], ui(inst, "spInvF", "all"))}
        <select class="input" data-model="spInvSort" aria-label="الترتيب"><option value="cover" ${ui(inst, "spInvSort", "cover") === "cover" ? "selected" : ""}>الأقل تغطية أولاً</option><option value="value" ${ui(inst, "spInvSort", "") === "value" ? "selected" : ""}>الأعلى قيمة</option><option value="name" ${ui(inst, "spInvSort", "") === "name" ? "selected" : ""}>الاسم</option></select></div>
      <div class="card" style="padding:0">${TW.table(cols, shown, { empty: "مفيش أصناف بالفلتر ده", rowCls: (r) => (r.x.shelfEmpty || r.ex ? "sev-critical" : r.a <= r.x.reorderPt ? "sev-high" : "") })}${rows.length > shown.length ? `<div class="row between" style="padding:10px 14px"><span class="muted">عرض ${shown.length} من ${rows.length}</span>${TW.btn("اعرض الكل", "ui", { cls: "sm", data: { k: "spInvAll", v: "1" } })}</div>` : ""}</div>
      <div class="grid sp-g21">${card(`سجل حركات المخزون${selSku ? ` — ${esc(skuOf(selSku).ar)}` : ""}`, "history", moves.length ? TW.table(moveCols(!selSku), moves.slice(0, 30)) : TW.empty("مفيش حركات مسجّلة", selSku ? "الصنف ده ما اتحركش في السجل" : "الاستلام والتسويات والتالف بيظهروا هنا", "history"), selSku ? TW.btn("كل الأصناف", "ui", { cls: "sm", data: { k: "spInvSku", v: "null" } }) : `<span class="muted" style="font-size:12px">${S.moves.length} حركة</span>`)}
      ${card("تدقيق المخزون", "book", invAudit.length ? `<div class="list">${invAudit.slice(0, 8).map((a) => `<div class="li"><div class="grow"><b style="font-size:13px">${esc(a.action)}</b><span class="sub muted">${esc(a.obj)} · ${esc(a.old)} ← ${esc(a.nw)} · ${esc(a.reason)}</span></div><span class="muted" style="font-size:12px;text-align:left">${esc(a.who)}<br>${clock(a.at)}</span></div>`).join("")}</div>` : TW.empty("لا إجراءات", "", "book"))}</div>`;
  },
  on: {},
});
/* adjustment modal — reason from TW.REASONS.stockAdjust, evidence from a controlled list, preview of the financial effect */
A.modals["sp-adj"] = (inst, m) => {
  const s = skuOf(m.skuId), x = invOf(m.skuId), field = ui(inst, "spAdjField", "onHand"), before = x[field];
  const after = Number(ui(inst, "spAdjVal", String(before))), reason = ui(inst, "spAdjReason", TW.REASONS.stockAdjust[0]), evid = ui(inst, "spAdjEv", EVIDENCE[0]);
  const diff = after - before, val = diff * x.cost, writeoff = field === "onHand" && diff < 0 && -val > 300;
  const needEv = EVIDENCE_REQUIRED.includes(reason) && evid === "لا يوجد";
  return TW.modalWrap(`تسوية مخزون — ${esc(s.ar)} <span class="mono muted" style="font-size:12px">${esc(s.id)}</span>`, `
    <div class="grid g4">${mini("فعلي", num(x.onHand))}${mini("محجوز", num(x.reserved))}${mini("متاح", num(availOf(s.id)))}${mini("الرف", `<span class="mono">${esc(x.bin)}</span>`)}</div>
    <div class="grid g2"><label class="field"><span>الرصيد المراد تسويته</span><select class="input" data-model="spAdjField" data-change="sp-adj-field">${ADJ_FIELDS.map(([k, l]) => `<option value="${k}" ${field === k ? "selected" : ""}>${l} (حالياً ${num(x[k])})</option>`).join("")}</select></label>
    <label class="field"><span>القيمة الجديدة (بعد العد)</span><input class="input" type="number" min="0" data-model="spAdjVal" data-live value="${esc(ui(inst, "spAdjVal", String(before)))}"></label>
    <label class="field"><span>السبب (قائمة محكومة)</span><select class="input" data-model="spAdjReason">${TW.REASONS.stockAdjust.map((r) => `<option ${reason === r ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label>
    <label class="field"><span>الدليل</span><select class="input" data-model="spAdjEv">${EVIDENCE.map((r) => `<option ${evid === r ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label></div>
    <label class="field"><span>ملاحظة (اختياري)</span><input class="input" data-model="spAdjNote" value="${esc(ui(inst, "spAdjNote", ""))}" placeholder="مثال: عبوتين مكسورين في الرف السفلي"></label>
    <div class="card flat"><dl class="kv"><dt>قبل</dt><dd class="num">${num(before)}</dd><dt>بعد</dt><dd class="num">${isNaN(after) ? "—" : num(after)}</dd><dt>الفرق</dt><dd class="num" style="color:${diff < 0 ? "var(--bad)" : "var(--ok)"}">${diff > 0 ? "+" : ""}${num(diff)} وحدة · ${money(val, 2)} بالتكلفة</dd><dt>المستخدم</dt><dd>${esc(TW.actor.admin().name)} (${esc(TW.roleOf().ar)}) · ${clock(now())}</dd></dl></div>
    ${writeoff ? `<div class="banner warn">${ic("alert", "ic sm")}<div>شطب بقيمة ${money(-val)} — فوق حد 300 ج.م، هيتسجل كطلب «شطب مخزون» في مركز الموافقات للاعتماد من مدير العمليات.</div></div>` : ""}
    ${needEv ? `<div class="banner bad">${ic("alert", "ic sm")}<div>السبب «${esc(reason)}» محتاج دليل (صورة أو تقرير).</div></div>` : ""}
    <p class="muted" style="font-size:12px">${ic("book", "ic xs")} المحجوز والوارد بيتحكم فيهم النظام بس (طلبات وأوامر شراء) — مش بيتسوّوا يدوي.</p>`,
    `<button class="btn primary" data-act="sp-adj-submit" ${needEv || isNaN(after) || after < 0 || diff === 0 ? "disabled" : ""}>${ic("check", "ic sm")}سجّل التسوية</button><button class="btn" data-act="modal-close">إلغاء</button>`);
};
A.on["sp-adj-open"] = (inst, d) => { const x = invOf(d.id); inst.ui.modal = { kind: "sp-adj", skuId: d.id }; inst.ui.spAdjField = "onHand"; inst.ui.spAdjVal = String(x.onHand); inst.ui.spAdjReason = TW.REASONS.stockAdjust[0]; inst.ui.spAdjEv = EVIDENCE[0]; inst.ui.spAdjNote = ""; inst.render(); };
A.on["sp-adj-submit"] = (inst) => {
  const m = inst.ui.modal, note = (inst.ui.spAdjNote || "").trim();
  const r = inst.act("inv.adjust", { skuId: m.skuId, field: inst.ui.spAdjField || "onHand", value: Number(inst.ui.spAdjVal), reason: `${inst.ui.spAdjReason}${note ? " — " + note : ""}`, evidence: inst.ui.spAdjEv });
  if (r && r.ok !== false) { inst.ui.modal = null; inst.ui.spInvSku = m.skuId; TW.toast("اتسجلت التسوية في سجل الحركات والتدقيق", "ok"); inst.render(); }
};
/* the field select must reset the "new value" to the current value of that field */
A.on["sp-adj-field"] = (inst, d, el) => { inst.ui.spAdjField = el.value; inst.ui.spAdjVal = String(invOf(inst.ui.modal.skuId)[el.value]); inst.render(); };

/* ===================================================================== PURCHASING ===================== */
const SUPPLIERS = ["موزع جهينة — دمنهور", "شركة الضحى للأغذية", "موزع بيبسيكو — البحيرة", "تاجر جملة أبو المطامير", "موزع منظفات P&G — دمنهور"];
const PO_ST = { PENDING_APPROVAL: ["بانتظار الاعتماد", "warn"], APPROVED: ["معتمد — بانتظار التوريد", "info"], RECEIVING: ["على باب الهب", "brand"], RECEIVED: ["اتستلم", "ok"], REJECTED: ["مرفوض", "bad"] };
const poChip = (s) => chip((PO_ST[s] || [s])[0], (PO_ST[s] || [0, "neutral"])[1]);
const poValue = (p) => sum(p.lines, (l) => l[1] * l[2]);
const poApproval = (p) => TW.S.approvals.find((a) => a.ref && a.ref.kind === "po" && a.ref.id === p.id);
function subCounts() { const m = {}; TW.S.orders.forEach((o) => o.lines.forEach((l) => { if (l.sub && l.sub.from) m[l.sub.from.skuId] = (m[l.sub.from.skuId] || 0) + 1; if (l.state === "removed" && l.skuId) m[l.skuId] = (m[l.skuId] || 0) + 1; })); return m; }
function suggestions(N) {
  const S = TW.S, notify = TW.groupBy(S.demand.notify, (n) => n.skuId), subs = subCounts(), pipe = pipeline();
  return Object.keys(S.inv.h1).map((id) => {
    const s = skuOf(id), x = invOf(id), a = availOf(id), sig = (notify[id] || []).length + (subs[id] || 0);
    const open = Math.max(x.incoming, pipe[id] || 0);
    const fc = Math.ceil(x.velocity * N + sig);
    const need = fc + x.reorderPt - a - open;
    const pack = x.velocity >= 6 ? 12 : x.velocity >= 2 ? 6 : 1;
    const rec = need > 0 ? Math.ceil(need / pack) * pack : 0;
    return { id, s, x, a, fc, sig, open, cover: coverOf(id), rec, pack, cost: x.cost, price: s.price, margin: s.price ? (s.price - x.cost) / s.price : 0 };
  }).filter((r) => r.rec > 0 && (r.a <= r.x.reorderPt || r.cover < N)).sort((a, b) => a.cover - b.cover);
}
TW.page("purchasing", {
  render(inst) {
    const S = TW.S, N = Number(ui(inst, "spPoN", "7")), sel = inst.ui.spPoSel || {}, all = ui(inst, "spPoAll", "") === "1";
    const sug = suggestions(N), shown = all ? sug : sug.slice(0, 25);
    const qty = (r) => { const v = inst.ui[`spPoQ_${r.id}`]; return v == null || v === "" ? r.rec : Number(v); };
    const picked = sug.filter((r) => sel[r.id]);
    const totCost = sum(picked, (r) => qty(r) * r.cost), totRev = sum(picked, (r) => qty(r) * r.price);
    const ids = Object.keys(S.inv.h1);
    /* signals */
    const top = ids.slice().sort((a, b) => invOf(b).velocity - invOf(a).velocity).slice(0, 7);
    const nr = S.demand.noResult.filter((n) => !n.resolvedBy).slice().sort((a, b) => b.n - a.n).slice(0, 7);
    const nt = Object.entries(TW.groupBy(S.demand.notify, (n) => n.skuId)).map(([id, l]) => [id, l.length]).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const sb = Object.entries(subCounts()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const dl = S.hist.daily || [], w1 = sum(dl.slice(-7), (d) => d.orders), w0 = sum(dl.slice(-14, -7), (d) => d.orders), growth = w0 ? w1 / w0 - 1 : 0;
    const catTop = (S.hist.catGmv || []).slice().sort((a, b) => b.gmv - a.gmv).slice(0, 4);
    const signals = `<div class="grid sp-g4">
      <div class="card flat"><div class="lbl">${ic("trend", "ic xs")} سرعة البيع (وحدة/يوم)</div>${TW.hbars(top.map((id) => ({ label: skuOf(id).ar, value: invOf(id).velocity })), { fmt: (v) => num(v, 1) })}</div>
      <div class="card flat"><div class="lbl">${ic("search", "ic xs")} بحث بدون نتيجة (${num(S.demand.searches)} بحث)</div>${TW.hbars(nr.map((n) => ({ label: n.q, value: n.n, tone: n.dept ? "brand" : "neutral", sub: n.dept ? deptAr(n.dept) : "غير مسموح" })))}</div>
      <div class="card flat"><div class="lbl">${ic("bell", "ic xs")} «بلّغني لما يتوفر»</div>${nt.length ? TW.hbars(nt.map(([id, n]) => ({ label: skuOf(id).ar, value: n, tone: "accent" }))) : `<p class="muted" style="font-size:12.5px">لا طلبات تنبيه مفتوحة الآن — أي ضغطة «بلّغني» من تطبيق العميل بتظهر هنا وتدخل في التوقع.</p>`}
        <div class="lbl" style="margin-top:10px">${ic("refresh", "ic xs")} بدائل وحذف بسبب عدم التوفر</div>${sb.length ? TW.hbars(sb.map(([id, n]) => ({ label: skuOf(id).ar, value: n, tone: "warn" }))) : `<p class="muted" style="font-size:12.5px">مفيش بدائل مسجّلة.</p>`}</div>
      <div class="card flat"><div class="lbl">${ic("calendar", "ic xs")} موسمية واتجاه</div><div class="row between" style="margin:4px 0"><span>طلبات آخر 7 أيام مقابل اللي قبلها</span><b class="num" style="color:${growth >= 0 ? "var(--ok)" : "var(--bad)"}">${growth >= 0 ? "+" : ""}${pct(growth, 1)}</b></div>${TW.spark(dl.map((d) => d.orders), { tone: "brand" })}<div class="lbl" style="margin-top:8px">أعلى الأقسام مبيعاً (30 يوم)</div>${TW.hbars(catTop.map((c) => ({ label: c.ar, value: c.gmv, tone: "brand" })), { fmt: (v) => TW.kmoney(v) })}</div></div>`;
    const cols = [
      { k: "sel", label: "", render: (r) => cbox(!!sel[r.id], "sp-po-sel", { id: r.id }, `اختيار ${r.s.ar}`) },
      { k: "s", label: "الصنف", render: (r) => `<b>${esc(r.s.ar)}</b> <span class="muted">${esc(r.s.size)}</span><span class="sub mono">${esc(r.id)}</span>` },
      { k: "fc", label: `توقع ${N} يوم`, num: true, render: (r) => `${num(r.fc)}${r.sig ? `<span class="sub">+${r.sig} إشارات</span>` : ""}` },
      { k: "oh", label: "متاح", num: true, render: (r) => num(r.a) },
      { k: "op", label: "مفتوح/وارد", num: true, render: (r) => (r.open ? `<span style="color:var(--info)">${num(r.open)}</span>` : "0") },
      { k: "cov", label: "تغطية", num: true, render: (r) => `<b style="color:${r.cover < 1 ? "var(--bad)" : r.cover < 3 ? "var(--warn)" : "var(--ink)"}">${dcov(r.cover)} يوم</b>` },
      { k: "rp", label: "نقطة الطلب", num: true, render: (r) => num(r.x.reorderPt) },
      { k: "rec", label: "الكمية المقترحة", num: true, render: (r) => `<input class="input sp-qty" type="number" min="0" step="${r.pack}" data-model="spPoQ_${r.id}" data-live value="${esc(inst.ui[`spPoQ_${r.id}`] != null ? inst.ui[`spPoQ_${r.id}`] : r.rec)}" aria-label="كمية ${esc(r.s.ar)}"><span class="sub">كرتونة ${r.pack}</span>` },
      { k: "cost", label: "تكلفة الشراء", num: true, render: (r) => `${money(qty(r) * r.cost)}<span class="sub">${money(r.cost, 2)}/وحدة</span>` },
      { k: "pr", label: "سعر البيع", num: true, render: (r) => money(r.price) },
      { k: "mg", label: "الهامش المتوقع", num: true, render: (r) => `<b style="color:${r.margin < 0.1 ? "var(--warn)" : "var(--ok)"}">${pct(r.margin, 1)}</b><span class="sub">${money(qty(r) * (r.price - r.cost))}</span>` },
    ];
    const last = inst.ui.spPoLast && find(S.pos, inst.ui.spPoLast), lastAp = last && poApproval(last);
    const foot = `<div class="sp-foot"><div class="grow"><b>${picked.length}</b> صنف مختار · تكلفة <b class="num">${money(totCost)}</b> · هامش متوقع <b class="num">${totRev ? pct((totRev - totCost) / totRev, 1) : "—"}</b></div>
      <select class="input" data-model="spPoSup" aria-label="المورد">${SUPPLIERS.map((x) => `<option ${ui(inst, "spPoSup", SUPPLIERS[0]) === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>
      ${TW.btn("حدد العاجل (< يومين)", "sp-po-urgent", { cls: "sm" })}${gbtn(canPO() && picked.length, canPO() ? "اختار أصناف الأول" : "يحتاج صلاحية المشتريات أو المخزون", "اطلب موافقة شراء", "sp-po-request", { cls: "primary", icon: "check" })}</div>`;
    const poCols = [
      { k: "id", label: "الأمر", render: (p) => `<b class="mono">${esc(p.id)}</b><span class="sub">${esc(p.supplier)}</span>` },
      { k: "l", label: "البنود", render: (p) => `${p.lines.map(([id, q]) => `${esc(skuOf(id).ar)} × ${num(q)}`).slice(0, 3).join("<br>")}${p.lines.length > 3 ? `<span class="sub">+${p.lines.length - 3} أصناف</span>` : ""}` },
      { k: "v", label: "القيمة", num: true, render: (p) => money(poValue(p)) },
      { k: "st", label: "الحالة", render: (p) => `${poChip(p.status)}${p.discrepancy ? `<span class="sub" style="color:var(--bad)">${esc(p.discrepancy)}</span>` : ""}` },
      { k: "ap", label: "الاعتماد", render: (p) => { const ap = poApproval(p); return ap ? `<span class="mono">${esc(ap.id)}</span> ${chip(ap.status === "PENDING" ? "بانتظار" : ap.status === "APPROVED" ? "معتمد" : "مرفوض", ap.status === "PENDING" ? "warn" : ap.status === "APPROVED" ? "ok" : "bad")}<span class="sub">${esc(ap.approver || "مستوى: المالية / المشتريات")}</span>` : p.approvedBy ? `${chip("معتمد", "ok")}<span class="sub">${esc(p.approvedBy)}</span>` : "—"; } },
      { k: "t", label: "الإنشاء / الوصول", render: (p) => `${clock(p.createdAt)} · ${TW.dateAr(p.createdAt)}<span class="sub">${["APPROVED", "RECEIVING"].includes(p.status) ? `وصول <span class="timer" data-until="${p.eta}"></span>` : p.status === "RECEIVED" ? "اتستلم" : "ETA " + clock(p.eta)}</span>` },
      { k: "a", label: "", render: (p) => { const ap = poApproval(p); if (p.status === "PENDING_APPROVAL" && ap && ap.status === "PENDING") return TW.canApprove(ap) ? `<div class="row gap4">${TW.btn("اعتمد", "approve", { cls: "sm primary", data: { id: ap.id } })}${TW.btn("ارفض", "reject", { cls: "sm", data: { id: ap.id } })}</div>` : `<span class="lock">${ic("lock", "ic xs")}الاعتماد للمالية/المشتريات</span>`; if (["APPROVED", "RECEIVING"].includes(p.status)) return TW.btn("استلم", "go", { cls: "sm", icon: "inbox", data: { to: "/admin/receiving" } }); return ""; } },
    ];
    /* overstock monitor */
    const dailyCogs = sum(ids, (id) => invOf(id).velocity * invOf(id).cost), stockVal = sum(ids, (id) => invOf(id).onHand * invOf(id).cost);
    const slow = ids.filter((id) => invOf(id).velocity < 1 && invOf(id).onHand > 0), dead = ids.filter((id) => invOf(id).onHand > 0 && invOf(id).onHand / Math.max(0.01, invOf(id).velocity) > 90);
    const spoil = ids.map((id) => { const x = invOf(id); const left = Math.max(0, x.onHand - Math.floor(x.velocity * x.expiryDays)); return { id, x, left }; }).filter((r) => r.left > 0 && r.x.expiryDays <= 10).sort((a, b) => b.left * b.x.cost - a.left * a.x.cost);
    const over = `<div class="grid g4">${kpi("أيام المخزون (DOI)", num(dailyCogs ? stockVal / dailyCogs : 0, 1), `${money(stockVal)} ÷ ${money(dailyCogs)} تكلفة/يوم`)}${kpi("بطيء الحركة", num(slow.length), `${money(sum(slow, (id) => invOf(id).onHand * invOf(id).cost))} مربوط`, { tone: slow.length ? "warn" : "" })}${kpi("مخزون ميت (> 90 يوم تغطية)", num(dead.length), money(sum(dead, (id) => invOf(id).onHand * invOf(id).cost)), { tone: dead.length ? "bad" : "ok" })}${kpi("هيبوظ قبل ما يتباع", num(sum(spoil, (r) => r.left)), `${money(sum(spoil, (r) => r.left * r.x.cost))} معرض للهالك`, { tone: spoil.length ? "bad" : "ok" })}</div>
      ${spoil.length ? TW.table([{ k: "s", label: "الصنف", render: (r) => `${esc(skuOf(r.id).ar)}<span class="sub">${esc(r.x.bin)}</span>` }, { k: "e", label: "الصلاحية", num: true, render: (r) => `${r.x.expiryDays} يوم` }, { k: "v", label: "بيع متوقع", num: true, render: (r) => num(Math.floor(r.x.velocity * r.x.expiryDays)) }, { k: "l", label: "فائض معرض", num: true, render: (r) => `<b style="color:var(--bad)">${num(r.left)}</b>` }, { k: "m", label: "القيمة", num: true, render: (r) => money(r.left * r.x.cost) }, { k: "a", label: "القرار المقترح", render: (r) => (r.x.expiryDays <= 2 ? chip("تصريف بعرض اليوم / شطب", "bad") : chip("عرض تصريف + وقف إعادة الطلب", "warn")) }], spoil.slice(0, 6)) : ""}`;
    return `${A.head("المشتريات وذكاء الطلب", "إشارات الطلب ← توقع ← اقتراح شراء ← اعتماد ← أمر شراء. مفيش أمر شراء من غير اعتماد.", `<div class="row wrap">${TW.btn("الاستلام", "go", { cls: "sm", icon: "inbox", data: { to: "/admin/receiving" } })}${TW.btn("مركز الموافقات", "go", { cls: "sm", icon: "check", data: { to: "/admin/approvals" } })}</div>`)}
      ${A.answer({ what: `${sug.length} صنف محتاج شراء لتغطية ${N} أيام`, attention: `${sug.filter((r) => r.cover < 1).length} صنف تغطيته أقل من يوم`, owner: "المشتريات — كمال عيسى · الاعتماد: المالية", risk: `${money(sum(sug, (r) => r.rec * r.cost))} شراء مقترح · ${money(sum(spoil, (r) => r.left * r.x.cost))} معرض للهالك` })}
      ${card("إشارات الطلب", "sparkle", signals)}
      ${last ? `<div class="banner ok">${ic("check", "ic sm")}<div class="grow"><b>${esc(last.id)}</b> اتعمل كطلب شراء بقيمة ${money(poValue(last))} — الحالة: ${poChip(last.status)}${lastAp ? ` · طلب الاعتماد <span class="mono">${esc(lastAp.id)}</span> في مركز الموافقات (مستوى ${esc((D.roles.find((r) => r.id === lastAp.level) || {}).ar || lastAp.level)})` : ""}. المخزون الوارد مش هيتحسب غير بعد الاعتماد.</div>${TW.btn("افتح الموافقات", "go", { cls: "sm", data: { to: "/admin/approvals" } })}</div>` : ""}
      <div class="card" style="padding:0"><div class="hd" style="padding:14px 16px 0"><h3>${ic("cart", "ic sm")} اقتراحات الشراء</h3>${seg("spPoN", [["3", "3 أيام"], ["7", "7 أيام"], ["14", "14 يوم"]], String(N))}</div>
        <p class="muted" style="font-size:12px;padding:4px 16px 8px">الكمية = توقع ${N} أيام (سرعة البيع + إشارات «بلّغني» والبدائل) + نقطة الطلب − المتاح − المفتوح في أوامر شراء، مقرّبة لأقرب كرتونة.</p>
        ${TW.table(cols, shown, { empty: "مفيش أصناف محتاجة شراء لفترة التغطية دي", rowCls: (r) => (r.cover < 1 ? "sev-critical" : r.cover < 3 ? "sev-high" : "") })}
        ${sug.length > shown.length ? `<div class="row between" style="padding:8px 14px"><span class="muted">عرض ${shown.length} من ${sug.length}</span>${TW.btn("اعرض الكل", "ui", { cls: "sm", data: { k: "spPoAll", v: "1" } })}</div>` : ""}${foot}</div>
      ${card("أوامر الشراء", "receipt", TW.table(poCols, S.pos.slice().sort((a, b) => b.createdAt - a.createdAt)), `<span class="muted" style="font-size:12px">${S.pos.filter((p) => p.status === "PENDING_APPROVAL").length} بانتظار الاعتماد · ${money(sum(S.pos.filter((p) => ["APPROVED", "RECEIVING"].includes(p.status)), poValue))} كاش ملتزم بيه</span>`)}
      ${card("مراقبة التكدس — صلاحية، بطء، أيام مخزون، مخزون ميت", "layers", over)}`;
  },
  on: {
    "sp-po-sel"(inst, d) { const s = { ...(inst.ui.spPoSel || {}) }; s[d.id] = !s[d.id]; inst.ui.spPoSel = s; inst.render(); },
    "sp-po-urgent"(inst) { const s = { ...(inst.ui.spPoSel || {}) }; suggestions(Number(ui(inst, "spPoN", "7"))).filter((r) => r.cover < 2).forEach((r) => (s[r.id] = true)); inst.ui.spPoSel = s; inst.render(); },
    "sp-po-request"(inst) {
      const N = Number(ui(inst, "spPoN", "7")), sel = inst.ui.spPoSel || {};
      const lines = suggestions(N).filter((r) => sel[r.id]).map((r) => { const v = inst.ui[`spPoQ_${r.id}`]; return [r.id, v == null || v === "" ? r.rec : Number(v), r.cost]; });
      const r = inst.act("po.request", { lines, supplier: ui(inst, "spPoSup", SUPPLIERS[0]), reason: `توصية الشراء — تغطية ${N} أيام` });
      if (r && r.ok !== false) { inst.ui.spPoSel = {}; inst.ui.spPoLast = r.id; lines.forEach(([id]) => delete inst.ui[`spPoQ_${id}`]); TW.toast(`${r.id} اتبعت لمركز الموافقات — مفيش أمر شراء من غير اعتماد`, "ok"); inst.render(); }
    },
  },
});

/* ===================================================================== RECEIVING ===================== */
TW.page("receiving", {
  render(inst) {
    const S = TW.S, open = S.pos.filter((p) => ["APPROVED", "RECEIVING"].includes(p.status)).sort((a, b) => a.eta - b.eta);
    const rh = receivedHere(), pend = S.pos.filter((p) => p.status === "RECEIVED" && !p.putaway && rh.has(p.id));
    const done = S.pos.filter((p) => p.status === "RECEIVED");
    const canRcv = hubOk() || TW.can("inventory.adjust");
    const rcvQ = (p, i) => { const v = inst.ui[`spRcv_${p.id}_${i}`]; return v == null || v === "" ? p.lines[i][1] : Number(v); };
    const poCard = (p) => {
      const rows = p.lines.map(([id, q, c], i) => ({ id, q, c, i, got: rcvQ(p, i), scanned: !!inst.ui[`spScan_${p.id}_${i}`] }));
      const short = rows.filter((r) => r.got < r.q), over = rows.filter((r) => r.got > r.q), claim = sum(short, (r) => (r.q - r.got) * r.c);
      const allScanned = rows.every((r) => r.scanned);
      const cols = [
        { k: "s", label: "الصنف", render: (r) => `<b>${esc(skuOf(r.id).ar)}</b><span class="sub mono">${esc(skuOf(r.id).barcode)}</span>` },
        { k: "bin", label: "رف التسكين", render: (r) => `<span class="mono sp-binx">${esc((invOf(r.id) || {}).bin || "—")}</span>` },
        { k: "q", label: "المطلوب", num: true, render: (r) => num(r.q) },
        { k: "g", label: "المستلم فعلياً", num: true, render: (r) => `<input class="input sp-qty" type="number" min="0" data-model="spRcv_${p.id}_${r.i}" data-live value="${esc(inst.ui[`spRcv_${p.id}_${r.i}`] != null ? inst.ui[`spRcv_${p.id}_${r.i}`] : r.q)}" aria-label="المستلم من ${esc(skuOf(r.id).ar)}">` },
        { k: "sc", label: "مسح الباركود", render: (r) => (r.scanned ? chip("اتمسح — مطابق", "ok", "check") : TW.btn("امسح", "sp-rcv-scan", { cls: "sm", icon: "scan", data: { po: p.id, i: r.i } })) },
        { k: "d", label: "الفرق", render: (r) => (r.got < r.q ? chip(`عجز ${r.q - r.got}`, "bad") : r.got > r.q ? chip(`زيادة ${r.got - r.q} — ترفض عند الباب`, "warn") : chip("مطابق", "ok")) },
        { k: "v", label: "القيمة", num: true, render: (r) => money(r.got * r.c) },
      ];
      return `<div class="card" data-k="rcv-${p.id}"><div class="hd"><h3>${ic("truck", "ic sm")} <span class="mono">${esc(p.id)}</span> · ${esc(p.supplier)}</h3><div class="row wrap">${poChip(p.status)}<span class="muted" style="font-size:12px">وصول <span class="timer" data-until="${p.eta}"></span></span></div></div>
        <div class="muted" style="font-size:12px;margin-bottom:8px">اعتمده ${esc(p.approvedBy || "—")} · قيمة الأمر ${money(poValue(p))} · كل بند لازم يتمسح باركوده قبل الاعتماد (حركة بالباركود فقط).</div>
        ${TW.table(cols, rows, { rowCls: (r) => (r.got < r.q ? "sev-critical" : r.got > r.q ? "sev-high" : "") })}
        ${short.length ? `<div class="banner bad" style="margin-top:10px">${ic("alert", "ic sm")}<div><b>فرق استلام:</b> عجز ${short.map((r) => `${num(r.q - r.got)} ${esc(skuOf(r.id).ar)}`).join("، ")} — هتتسجل مطالبة للمورد بقيمة <b class="num">${money(claim, 2)}</b> والكمية الناقصة مش هتدخل المخزون.</div></div>` : ""}
        ${over.length ? `<div class="banner warn" style="margin-top:10px">${ic("alert", "ic sm")}<div>الزيادة عن أمر الشراء مش بتدخل المخزون — رجّعها للمورد عند الباب أو اعمل أمر شراء جديد.</div></div>` : ""}
        <div class="row wrap" style="margin-top:10px">${TW.btn("امسح كل البنود (محاكاة الماسح)", "sp-rcv-scan-all", { cls: "sm", icon: "scan", data: { po: p.id } })}${gbtn(canRcv && allScanned && !over.length, !canRcv ? HUB_WHY : over.length ? "صحّح الزيادة الأول" : "امسح باركود كل البنود الأول", "اعتمد الاستلام", "sp-rcv-submit", { cls: "primary", icon: "check", data: { po: p.id } })}</div></div>`;
    };
    const putCard = pend.length ? card("تسكين على الأرفف (Put-away)", "layers", pend.map((p) => `<div class="card flat" style="margin-bottom:8px"><div class="row between wrap"><b class="mono">${esc(p.id)}</b>${p.discrepancy ? chip(p.discrepancy, "bad") : chip("مطابق", "ok")}</div><div class="list">${(p.receivedLines || []).map(([id, q]) => `<div class="li"><span class="mono sp-binx">${esc((invOf(id) || {}).bin)}</span><span class="grow">${esc(skuOf(id).ar)}</span><b class="num">${num(q)}</b></div>`).join("")}</div>${gbtn(canRcv, HUB_WHY, "أكّد التسكين (مسح باركود الرف)", "sp-putaway", { cls: "sm primary", icon: "scan", data: { po: p.id } })}</div>`).join("")) : "";
    const hist = done.length ? TW.table([
      { k: "id", label: "الأمر", render: (p) => `<b class="mono">${esc(p.id)}</b><span class="sub">${esc(p.supplier)}</span>` },
      { k: "l", label: "المطلوب ← المستلم", render: (p) => p.lines.map(([id, q], i) => { const g = ((p.receivedLines || [])[i] || [id, q])[1]; return `${esc(skuOf(id).ar)}: ${num(q)} ← <b style="color:${g < q ? "var(--bad)" : "var(--ink)"}">${num(g)}</b>`; }).join("<br>") },
      { k: "d", label: "الفروقات والمطالبة", render: (p) => { const c = sum(p.lines.map(([id, q, cost], i) => Math.max(0, q - (((p.receivedLines || [])[i] || [id, q])[1])) * cost)); return p.discrepancy ? `${chip(p.discrepancy, "bad")}<span class="sub">مطالبة ${money(c, 2)}</span>` : chip("مطابق", "ok"); } },
      { k: "p", label: "التسكين", render: (p) => (p.putaway ? `${chip("على الرف", "ok")}<span class="sub">${esc(p.putaway.by)} · ${clock(p.putaway.at)}</span>` : rh.has(p.id) ? chip("بانتظار التسكين", "warn") : chip("اتسكّن (قبل اليوم)", "neutral")) },
    ], done) : TW.empty("مفيش استلامات", "", "inbox");
    return `${A.head("الاستلام", "أوامر شراء معتمدة على الباب ← مسح باركود ← عدّ ← فروقات ومطالبة ← تسكين", TW.btn("أوامر الشراء", "go", { cls: "sm", icon: "cart", data: { to: "/admin/purchasing" } }))}
      <div class="grid g4">${kpi("أوامر على الباب", num(open.length), money(sum(open, poValue)))}${kpi("بانتظار التسكين", num(pend.length), "بعد الاستلام", { tone: pend.length ? "warn" : "" })}${kpi("فروقات مفتوحة", num(S.pos.filter((p) => p.discrepancy).length), "مطالبات مورد", { tone: S.pos.some((p) => p.discrepancy) ? "bad" : "ok" })}${kpi("وارد متوقع (وحدات)", num(sum(open, (p) => sum(p.lines, (l) => l[1]))), "هيبقى متاح بعد الاستلام")}</div>
      ${open.length ? open.map(poCard).join("") : `<div class="card">${TW.empty("مفيش أوامر شراء جاهزة للاستلام", "الأوامر بتظهر هنا بعد الاعتماد", "inbox")}</div>`}
      ${putCard}${card("سجل الاستلام والفروقات", "history", hist)}`;
  },
  on: {
    "sp-rcv-scan"(inst, d) { inst.ui[`spScan_${d.po}_${d.i}`] = true; const p = find(TW.S.pos, d.po); TW.toast(`باركود ${skuOf(p.lines[d.i][0]).barcode} مطابق لأمر الشراء`, "ok"); inst.render(); },
    "sp-rcv-scan-all"(inst, d) { const p = find(TW.S.pos, d.po); p.lines.forEach((_, i) => (inst.ui[`spScan_${d.po}_${i}`] = true)); inst.render(); },
    "sp-rcv-submit"(inst, d) {
      const p = find(TW.S.pos, d.po); const received = p.lines.map((l, i) => { const v = inst.ui[`spRcv_${p.id}_${i}`]; return v == null || v === "" ? l[1] : Math.max(0, Number(v)); });
      const r = inst.act("po.receive", { poId: p.id, received });
      if (r && r.ok !== false) { p.lines.forEach((_, i) => { delete inst.ui[`spRcv_${p.id}_${i}`]; delete inst.ui[`spScan_${p.id}_${i}`]; }); TW.toast(p.discrepancy ? `اتستلم مع فرق — ${p.discrepancy}` : "اتستلم مطابق ودخل المخزون المتاح", p.discrepancy ? "bad" : "ok"); inst.render(); }
    },
    "sp-putaway"(inst, d) { const r = inst.act("hub.putaway", { poId: d.po }); if (r && r.ok !== false) TW.toast("اتسكّن على الأرفف واتسجّلت الحركة", "ok"); },
  },
});
/* ===================================================================== PICKING & PACKING — Hub / Picker mode ===================== */
/* mirrors hub.pack: P1 normal · P2 chilled/frozen · P3 cleaning (only split out when cold items are present — see report) */
function packPlan(ls) {
  const live = ls.filter((l) => l.state !== "removed");
  const cold = live.filter((l) => ["chilled", "frozen"].includes(l.handling)), sep = live.filter((l) => l.handling === "separate");
  const split = cold.length > 0 && sep.length > 0;
  const bags = [{ h: "normal", items: live.filter((l) => !cold.includes(l) && !(split && l.handling === "separate")) }];
  if (cold.length) bags.push({ h: "chilled", items: cold });
  if (split) bags.push({ h: "separate", items: sep });
  return bags;
}
const BAG = { normal: ["كيس عادي", "bag"], chilled: ["كيس مبرد / مجمد معزول", "snow"], separate: ["منظفات — منفصلة عن الأكل", "spray"] };
const lname = (l) => (l.sub ? l.sub.name : l.name);
function pickQueue() {
  const hf = hubFos();
  const active = hf.filter((f) => ["QUEUED", "PICKING"].includes(f.status)).sort((a, b) => (!!b.exception - !!a.exception) || (!!orderOf(a.orderId).hold - !!orderOf(b.orderId).hold) || ((b.status === "PICKING") - (a.status === "PICKING")) || a.createdAt - b.createdAt);
  const packed = hf.filter((f) => f.status === "PACKED").sort((a, b) => a.readyAt - b.readyAt);
  const handed = hf.filter((f) => ["HANDED_OVER", "DELIVERED"].includes(f.status) && isToday(f.readyAt || f.createdAt));
  return { hf, active, packed, handed };
}
const ensureManual = (inst, foId) => { const f = find(TW.S.fos, foId); if (f && TW.S.sim.auto && !f.manualPick && ["QUEUED", "PICKING"].includes(f.status)) inst.act("hub.manual", { foId, on: true }); };
function pickWorkspace(inst, f) {
  const S = TW.S, o = orderOf(f.orderId), ls = foLines(f), sla = S.rules.pickSlaMin, ok = hubOk();
  const live = ls.filter((l) => l.state !== "removed"), pending = ls.filter((l) => l.state === "sub_pending");
  const allPicked = live.every((l) => l.picked);
  const canPack = f.status === "PICKING" && !pending.length && allPicked;
  const packWhy = pending.length ? "فيه صنف بانتظار قرار العميل على البديل" : !allPicked ? "لسه فيه أصناف متجمعتش (EX-PCK-001)" : "";
  const manualOn = !!f.manualPick || !S.sim.auto;
  const sorted = ls.slice().sort((a, b) => String((invOf(a.skuId) || {}).bin).localeCompare(String((invOf(b.skuId) || {}).bin)));
  const pref = { call: "اسألني الأول", auto: "بدّل بأقرب بديل", remove: "شيل الصنف" }[o.subPref] || o.subPref;
  const head = `<div class="sp-wh"><div class="grow"><div class="row wrap"><b class="sp-big mono">${esc(o.id)}</b>${A.st("fo", f.status)}${f.exception ? chip(f.exception.code, "bad", "alert") : ""}${o.hold ? chip("بانتظار تأكيد الدفع — ممنوع التجميع", "warn") : ""}${o.mode === "scheduled" ? chip(`رحلة ${o.window || ""}`, "info", "route") : ""}</div>
      <div class="muted" style="font-size:12.5px">${esc(A.customer(o.customerId))} · ${esc(A.zone(o.zoneId))} · <span class="mono">${esc(f.id)}</span> · البدائل: ${esc(pref)} · ${f.picker ? "المجمّع: " + esc(f.picker) : "لم يبدأ"}</div></div>
    <div class="sp-sla">${f.status === "PICKING" && f.pickStart ? `<span class="lbl">SLA ${sla} د</span><span class="timer" data-until="${f.pickStart + sla * MIN}" data-soon="120000"></span>` : f.status === "QUEUED" ? `<span class="lbl">في الطابور</span><span class="timer" data-since="${f.createdAt}"></span>` : f.readyAt ? `<span class="lbl">زمن التجميع</span><b class="num">${TW.dur(f.readyAt - (f.pickStart || f.createdAt))}</b>` : ""}</div>
    ${["QUEUED", "PICKING"].includes(f.status) ? `<div class="sp-man"><button type="button" class="toggle ${manualOn ? "on" : ""}" data-act="sp-manual" data-fo="${f.id}" role="switch" aria-checked="${manualOn}" aria-label="تجميع يدوي" ${S.sim.auto && ok ? "" : "disabled"}></button><span>تجميع يدوي<small>${!S.sim.auto ? "المحاكاة متوقفة" : manualOn ? "المحاكاة مش هتلمسه" : "المحاكاة بتجمّعه آلياً"}</small></span></div>` : ""}</div>`;
  if (f.exception && f.status === "PICKING") { /* surfaced again inside the line, but the banner makes EX-INV-001 impossible to miss */ }
  const excBanner = f.exception ? `<div class="banner bad sp-exc">${ic("alert", "ic sm")}<div class="grow"><b>${esc(f.exception.code)} — عدم تطابق مخزون</b><div>${esc(f.exception.text)}. التجميع واقف من <span class="timer" data-since="${f.exception.at}"></span> · المسؤول: ${esc(f.exception.owner)}</div><div class="muted" style="font-size:12px">أعد عدّ الرف: لو فاضي فعلاً ← النظام يصفّر الرصيد بحركة مسجّلة ويبدأ مسار البديل (BR-INV-003). لو لقيت الكمية ← سجّل العد الفعلي وكمّل.</div></div></div>` : "";
  const lineRow = (l) => {
    const s = skuOf(l.skuId), x = invOf(l.skuId) || {}, st = l.state;
    const right = st === "removed" ? chip("اتشال — الإجمالي اتعدّل", "neutral") : st === "sub_pending" ? chip("بانتظار قرار العميل", "warn", "clock") : st === "substituted" ? chip(`بديل: ${l.sub.name}`, "info", "refresh") : l.picked ? chip("اتجمّع", "ok", "check") : st === "missing" ? chip("EX-INV-001", "bad", "alert") : f.status === "QUEUED" ? chip("لسه", "neutral") : chip("جاري", "info");
    let extra = "";
    if (st === "missing" && f.status === "PICKING") extra = `<div class="sp-acts">${gbtn(ok, HUB_WHY, "الرف فاضي فعلاً — ابدأ مسار البديل", "sp-empty", { cls: "sm danger", icon: "alert", data: { fo: f.id, key: l.key } })}${gbtn(ok, HUB_WHY, "لقيت الكمية — سجّل إعادة العد", "sp-recount", { cls: "sm", icon: "refresh", data: { fo: f.id, key: l.key } })}</div>`;
    if (st === "ok" && !l.picked && f.status === "PICKING") extra = `<div class="sp-acts"><input class="input mono sp-code" data-model="spCode_${l.key}" data-enter="sp-scan" data-fo="${f.id}" data-key="${l.key}" placeholder="امسح أو اكتب الباركود" value="${esc(inst.ui["spCode_" + l.key] || "")}" aria-label="باركود ${esc(s.ar)}" ${ok ? "" : "disabled"}>${gbtn(ok, HUB_WHY, "تحقق", "sp-scan", { cls: "sm primary", icon: "check", data: { fo: f.id, key: l.key } })}${gbtn(ok, HUB_WHY, "محاكاة الماسح", "sp-scan-sim", { cls: "sm", icon: "scan", data: { fo: f.id, key: l.key } })}${gbtn(ok, HUB_WHY, "الرف فاضي", "sp-empty", { cls: "sm", icon: "inbox", data: { fo: f.id, key: l.key } })}${gbtn(ok, HUB_WHY, "تالف", "sp-damaged", { cls: "sm", icon: "alert", data: { fo: f.id, key: l.key } })}</div>`;
    if (st === "sub_pending") { const n = S.notes.find((x) => x.to === `customer:${o.customerId}` && x.sub === l.key); extra = `<div class="banner warn sp-subp">${ic("clock", "ic sm")}<div class="grow"><b>بانتظار قرار العميل على البديل</b> — ${l.sub ? `المقترح: ${esc(l.sub.name)} (${money(l.sub.price)}، فرق ${l.sub.price - l.unitPrice > 0 ? "+" : ""}${num(l.sub.price - l.unitPrice, 2)} ج.م)` : "لا يوجد بديل معتمد"}.<div class="muted" style="font-size:12px">${n ? `اتبعت للعميل إشعار «${esc(n.title)}» ${clock(n.at)} · ` : ""}لو مفيش رد خلال المهلة يتطبق الاحتياطي (حذف البند — BR-SUB-002). باقي الأصناف تتجمع عادي.</div></div><div class="sp-sla"><span class="lbl">مهلة الرد</span><span class="timer" data-until="${l.subAsked + S.rules.subWaitSec * 1000}" data-soon="60000"></span></div></div>`; }
    if (st === "substituted" && l.sub) extra = `<div class="muted" style="font-size:12px;padding-inline-start:84px">العميل وافق على ${esc(l.sub.name)} · فرق ${num(l.sub.diff, 2)} ج.م${l.sub.absorbed ? " — توّا تتحمله" : ""} · رف ${esc((invOf(l.sub.skuId) || {}).bin || "—")}</div>`;
    return `<div class="sp-line s-${st} ${l.picked ? "done" : ""}" data-k="${l.key}"><div class="sp-bin"><span>الرف</span><b class="mono">${esc(x.bin || "—")}</b></div><div class="grow"><b>${esc(l.name)}</b> <span class="muted">${esc(l.size || "")}</span> <span class="sp-qtyb">× ${l.qty}</span> ${hChip(l.handling)}<span class="sub mono">${esc(s.barcode)}</span></div><div class="sp-st">${right}</div>${extra}</div>`;
  };
  let body = "";
  if (f.status === "QUEUED") body = `<div class="sp-startbox"><div><b>${live.length} أصناف</b> · مسار التجميع مرتب حسب الرف ${packPlan(ls).length > 1 ? `· ${packPlan(ls).length} أكياس متوقعة` : ""}</div>${gbtn(ok && !o.hold, o.hold ? "بانتظار تأكيد الدفع (EX-PAY-002)" : HUB_WHY, "ابدأ التجميع", "sp-start", { cls: "primary sp-xl", icon: "play", data: { fo: f.id } })}</div><div class="sp-lines">${sorted.map(lineRow).join("")}</div>`;
  else if (f.status === "PICKING") {
    const plan = packPlan(ls), pk = live.filter((l) => l.picked).length;
    body = `${excBanner}<div class="sp-lines">${sorted.map(lineRow).join("")}</div>
      <div class="sp-packbar"><div class="grow"><div class="row between"><b>التقدم ${pk}/${live.length}</b><span class="muted" style="font-size:12px">${pending.length ? `${pending.length} بانتظار العميل` : ""}</span></div>${meter(pk, live.length || 1, "brand")}
        <div class="sp-plan">${plan.map((b) => `<span class="sp-bagchip b-${b.h}">${ic(BAG[b.h][1], "ic xs")}${BAG[b.h][0]} · ${b.items.length}</span>`).join("")}</div>${packWhy ? `<small class="muted">${esc(packWhy)}</small>` : ""}</div>
        ${gbtn(ok && canPack, !ok ? HUB_WHY : packWhy, "تغليف", "sp-pack", { cls: "primary sp-xl", icon: "box", data: { fo: f.id } })}</div>`;
  } else {
    const plan = packPlan(ls), t = TW.S.tasks.find((x) => x.foIds.includes(f.id)), r = t && t.riderId && find(S.riders, t.riderId);
    const pk = (f.packages || []).length ? f.packages : plan.map((b, i) => ({ id: `${f.id}-P${i + 1}`, code: f.pickupCode, handling: b.h }));
    body = `<div class="sp-packed"><div class="sp-pkcode"><span class="lbl">كود الاستلام للمندوب</span><b class="mono">${esc(f.pickupCode)}</b><small>${pk.length} طرد · تحقق التغليف ${f.packCheck ? `${f.packCheck.scanned}/${f.packCheck.expected}` : "—"} ${f.packCheck && f.packCheck.override ? chip("تجاوز يدوي", "bad") : chip("مطابق", "ok")}</small></div>
      <div class="sp-bags">${pk.map((p) => { const b = plan.find((x) => x.h === p.handling) || { items: [] }; return `<div class="sp-bag b-${p.handling}"><div class="row between"><b>${ic(BAG[p.handling] ? BAG[p.handling][1] : "box", "ic sm")} ${esc(BAG[p.handling] ? BAG[p.handling][0] : p.handling)}</b><span class="mono muted">${esc(p.id)}</span></div><ul>${b.items.map((l) => `<li>${esc(lname(l))} × ${l.qty}</li>`).join("") || "<li class='muted'>—</li>"}</ul></div>`; }).join("")}</div>
      <div class="row wrap" style="margin-top:4px">${t ? `مهمة التوصيل <span class="mono">${esc(t.id)}</span> ${A.st("task", t.status)} ${r ? `· ${esc(r.ar)} (${esc(D.vehicles[r.vehicle])})` : ""}` : ""}${f.handedAt ? ` · اتسلّم للمندوب ${clock(f.handedAt)}` : ""}<span class="grow"></span>${t && ["WAITING", "OFFERED", "NO_RIDER"].includes(t.status) ? A.permBtn("dispatch.assign", "إسناد يدوي", "assign", { cls: "sm", icon: "bike", data: { task: t.id } }) : ""}${A.orderLink(o.id)}</div></div>`;
  }
  return `<div class="sp-work-in">${head}${body}</div>`;
}
TW.page("picking", {
  render(inst) {
    const S = TW.S, q = pickQueue(), sla = S.rules.pickSlaMin, h = find(S.hubs, "h1");
    let cur = inst.ui.spPick && find(S.fos, inst.ui.spPick);
    if (!cur || cur.sourceType !== "hub") cur = q.active[0] || q.packed[0] || null;
    const exc = q.active.filter((f) => f.exception);
    const qc = (f) => { const o = orderOf(f.orderId), live = foLines(f).filter((l) => l.state !== "removed"), pk = live.filter((l) => l.picked).length, sp = live.some((l) => l.state === "sub_pending"); return `<button type="button" class="sp-qc ${cur && cur.id === f.id ? "on" : ""} ${f.exception ? "exc" : ""}" data-act="ui" data-k="spPick" data-v="${f.id}"><span class="row between"><b class="mono">${esc(o.id)}</b>${f.exception ? chip(f.exception.code, "bad", "alert") : o.hold ? chip("بانتظار الدفع", "warn") : sp ? chip("بانتظار العميل", "warn") : A.st("fo", f.status)}</span><span class="muted sp-qcs">${esc(A.customer(o.customerId))} · ${esc(A.zone(o.zoneId))}</span><span class="row between"><span class="sp-pbar" aria-hidden="true"><i style="width:${live.length ? Math.round((pk / live.length) * 100) : 0}%"></i></span><span class="num" style="font-size:12px">${pk}/${live.length}</span>${f.status === "PICKING" && f.pickStart ? `<span class="timer" data-until="${f.pickStart + sla * MIN}" data-soon="120000"></span>` : `<span class="timer muted" data-since="${f.createdAt}"></span>`}</span>${f.manualPick ? `<span class="sp-tag">${ic("hand", "ic xs")}يدوي</span>` : ""}</button>`; };
    const pc = (f) => { const t = TW.S.tasks.find((x) => x.foIds.includes(f.id)); return `<button type="button" class="sp-qc done ${cur && cur.id === f.id ? "on" : ""}" data-act="ui" data-k="spPick" data-v="${f.id}"><span class="row between"><b class="mono">${esc(f.orderId)}</b><span class="mono sp-pcode">${esc(f.pickupCode)}</span></span><span class="muted sp-qcs">${(f.packages || []).length || packPlan(foLines(f)).length} طرد · ${t ? TW.stLabel("task", t.status) : "—"}</span></button>`; };
    const queued = q.active.filter((f) => f.status === "QUEUED" && !f.manualPick && !orderOf(f.orderId).hold);
    const top = `<div class="sp-ttop"><span class="row">${ic("building", "ic sm")}<b>${esc(h.ar)}</b></span><span class="row gap4">${ic("user", "ic xs")}${esc(TW.actor.admin().name)} · ${esc(TW.roleOf().ar)}</span><span class="grow"></span><span class="sp-pill">طابور ${q.active.length}</span><span class="sp-pill">جاهز للمندوب ${q.packed.length}</span><span class="sp-pill">اتسلّم اليوم ${q.handed.length}</span><span class="sp-pill ${S.sim.auto ? "" : "off"}">${S.sim.auto ? "المحاكاة شغالة" : "المحاكاة متوقفة"}</span></div>`;
    return `${A.head("التجميع والتغليف — وضع المجمّع", `Hub / Picker mode · مسح باركود لكل صنف · SLA ${sla} دقائق · البديل بقرار العميل · تغليف حسب الحرارة والفصل`, `<div class="row wrap">${queued.length ? gbtn(hubOk() && S.sim.auto, HUB_WHY, `استلم الطابور يدوي (${queued.length})`, "sp-take-all", { cls: "sm", icon: "hand" }) : ""}${TW.btn("الهب", "go", { cls: "sm", icon: "building", data: { to: "/admin/hub" } })}</div>`)}
      ${exc.map((f) => `<div class="banner bad">${ic("alert", "ic sm")}<div class="grow"><b>${esc(f.exception.code)} · ${esc(f.orderId)}</b> — ${esc(f.exception.text)} · واقف من <span class="timer" data-since="${f.exception.at}"></span></div>${TW.btn("افتح وأعد العد", "ui", { cls: "sm danger", data: { k: "spPick", v: f.id } })}</div>`).join("")}
      <div class="sp-tablet" data-hl="pick-queue">${top}<div class="sp-tbody"><aside class="sp-queue" aria-label="طابور التجميع"><div class="lbl">الطابور (${q.active.length})</div>${q.active.map(qc).join("") || `<p class="muted" style="font-size:12.5px;padding:8px">الطابور فاضي.</p>`}<div class="lbl" style="margin-top:10px">جاهز — بانتظار المندوب (${q.packed.length})</div>${q.packed.map(pc).join("") || `<p class="muted" style="font-size:12.5px;padding:8px">لا يوجد.</p>`}</aside>
      <section class="sp-work">${cur ? pickWorkspace(inst, cur) : TW.empty("مفيش أوامر تجميع", "أي طلب فيه أصناف من الهب بيظهر هنا فوراً", "scan")}</section></div></div>`;
  },
  on: {
    "sp-take-all"(inst) { const fs = pickQueue().active.filter((f) => f.status === "QUEUED" && !f.manualPick && !orderOf(f.orderId).hold); fs.forEach((f) => inst.act("hub.manual", { foId: f.id, on: true })); TW.toast(`${fs.length} أوامر بقت يدوي — المحاكاة مش هتلمسها`, "ok"); },
    "sp-manual"(inst, d) { const f = find(TW.S.fos, d.fo); const r = inst.act("hub.manual", { foId: d.fo, on: !f.manualPick }); if (r && r.ok !== false) TW.toast(f.manualPick ? "التجميع بقى يدوي — أنت المسؤول عن الأمر" : "رجع للتجميع الآلي (محاكاة)", "ok"); },
    "sp-start"(inst, d) { ensureManual(inst, d.fo); const r = inst.act("hub.start", { foId: d.fo }); if (r && r.ok !== false) { inst.ui.spPick = d.fo; TW.toast("بدأ التجميع — عدّاد الـ SLA شغال", "ok"); } },
    "sp-scan"(inst, d) { const code = String(inst.ui[`spCode_${d.key}`] || "").trim(); if (!code) return TW.toast("امسح الباركود الأول", "bad"); ensureManual(inst, d.fo); const r = inst.act("hub.pick", { foId: d.fo, key: d.key, result: "picked", code }); if (r && r.ok !== false) { delete inst.ui[`spCode_${d.key}`]; TW.toast("الباركود مطابق — اتجمّع", "ok"); inst.render(); } },
    "sp-scan-sim"(inst, d) { const f = find(TW.S.fos, d.fo), l = orderOf(f.orderId).lines.find((x) => x.key === d.key); ensureManual(inst, d.fo); const r = inst.act("hub.pick", { foId: d.fo, key: d.key, result: "picked", code: skuOf(l.skuId).barcode }); if (r && r.ok !== false) { delete inst.ui[`spCode_${d.key}`]; TW.toast(`${skuOf(l.skuId).barcode} ✓ ${l.name}`, "ok"); } },
    "sp-empty"(inst, d) { const f = find(TW.S.fos, d.fo), o = orderOf(f.orderId), l = o.lines.find((x) => x.key === d.key), x = invOf(l.skuId); ensureManual(inst, d.fo); A.ask(inst, { title: `الرف فاضي — ${l.name}`, action: "hub.pick", payload: { foId: d.fo, key: d.key, result: "empty" }, reasons: ["دورت في الرف والرف الاحتياطي — مفيش", "إعادة العد أكدت إن الرصيد غلط"], confirm: "سجّل الرف فاضي", danger: true, done: "اتسجّل — بدأ مسار البديل", note: `النظام هيصفّر رصيد «${esc(l.name)}» على الرف ${esc(x.bin)} (كان ${num(x.onHand)}) بحركة EX-INV-001 مسجّلة باسمك، ويبدأ مسار البديل حسب تفضيل العميل («${esc({ call: "اسألني الأول", auto: "بدّل بأقرب بديل", remove: "شيل الصنف" }[o.subPref] || o.subPref)}»).` }); },
    "sp-damaged"(inst, d) { const f = find(TW.S.fos, d.fo), l = orderOf(f.orderId).lines.find((x) => x.key === d.key); ensureManual(inst, d.fo); A.ask(inst, { title: `صنف تالف — ${l.name}`, action: "hub.pick", payload: { foId: d.fo, key: d.key, result: "damaged" }, reasons: ["عبوة مكسورة أو مفتوحة", "قريب الانتهاء / منتهي", "تلف في سلسلة التبريد"], confirm: "سجّل التالف", done: "اتسجّل التالف (EX-INV-002)", note: "الوحدة التالفة بتتشال من الرصيد الفعلي وتتسجل تالف. لو فيه وحدة سليمة متاحة بتتجمع بدلها، غير كده يبدأ مسار البديل." }); },
    "sp-recount"(inst, d) { const f = find(TW.S.fos, d.fo), l = orderOf(f.orderId).lines.find((x) => x.key === d.key), x = invOf(l.skuId); ensureManual(inst, d.fo); A.ask(inst, { title: `إعادة عدّ — ${l.name} (${x.bin})`, action: "hub.recount", payload: { foId: d.fo, key: d.key }, extra: [{ k: "count", label: `العدد الفعلي بعد العد (المطلوب للطلب ${l.qty} · النظام كان ${x.onHand})`, type: "number", value: x.onHand }], reasons: ["اتلقى في الرف الاحتياطي", "اتلقى في منطقة الاستلام ولسه ما اتسكنش", "خطأ تسكين — كان على رف غلط"], confirm: "سجّل العد وكمّل", done: "اتسجّل العد — الاستثناء اتقفل", note: "العدد الفعلي بيتسجل كحركة مخزون (قبل/بعد/السبب/المستخدم) وبيقفل EX-INV-001." }); },
    "sp-pack"(inst, d) { const r = inst.act("hub.pack", { foId: d.fo }); if (r && r.ok !== false) { const f = find(TW.S.fos, d.fo); TW.toast(`اتغلّف في ${f.packages.length} طرد — كود الاستلام ${f.pickupCode}`, "ok"); } },
  },
});

/* ===================================================================== RETURNS & INSPECTION ===================== */
const RT_ST = { IN_TRANSIT: ["في الطريق للهب", "warn"], INSPECTION: ["بانتظار الفحص", "info"], RESTOCKED: ["رجع للمخزون", "ok"], QUARANTINED: ["حجر / عزل", "warn"], WASTE: ["هالك", "bad"] };
const INSPECT = { restock: ["العبوة سليمة ومقفولة", "الصلاحية والتبريد سليمين"], quarantine: ["محتاج فحص جودة", "سلسلة التبريد غير مؤكدة", "العبوة مفتوحة لكن المنتج سليم"], waste: ["تالف", "منتهي الصلاحية", "سلسلة التبريد انقطعت", "أكل سخن — هالك (BR-RTO-001)"] };
const OUTCOME = [["restock", "إعادة للمخزون", "ok"], ["quarantine", "حجر / عزل", "warn"], ["waste", "هالك", "bad"]];
function returnLines(rt) { const o = orderOf(rt.orderId); return rt.lines.map(([id, q]) => { const s = find(TW.S.skus, id), ol = o && o.lines.find((l) => l.skuId === id || l.menuItemId === id); return { id, q, name: ol ? ol.name : s ? s.ar : id, hub: rt.source === "h1" && !!invOf(id), handling: ol ? ol.handling : s ? s.handling : "normal", price: ol ? ol.unitPrice : s ? s.price : 0 }; }); }
function returnValue(rt) { return sum(returnLines(rt), (l) => (l.hub ? lineCost(l.id, l.q) : l.price * l.q)); }
const isHot = (rt) => !!rt.hot || returnLines(rt).some((l) => l.handling === "hot");
function lossParty(rt) { const r = String(rt.reason || ""); if (/رفض|بيرد|يرد|العنوان|الكاش/.test(r)) return "customer"; if (/آمن|أوصل/.test(r)) return "twaa"; if (/تالف|كسر/.test(r)) return "rider"; return "twaa"; }
TW.page("returns", {
  render(inst) {
    const S = TW.S, f = ui(inst, "spRtF", "open"), rts = S.returns.slice().sort((a, b) => b.at - a.at);
    const cnt = (st) => rts.filter((r) => r.status === st).length;
    const list = f === "open" ? rts.filter((r) => ["IN_TRANSIT", "INSPECTION"].includes(r.status)) : f === "closed" ? rts.filter((r) => !["IN_TRANSIT", "INSPECTION"].includes(r.status)) : rts;
    const canIns = hubOk() || TW.can("inventory.adjust");
    const cols = [
      { k: "id", label: "المرتجع", render: (r) => `<b class="mono">${esc(r.id)}</b><span class="sub">${clock(r.at)} · ${r.status === "IN_TRANSIT" || r.status === "INSPECTION" ? `<span class="timer" data-since="${r.at}"></span>` : TW.dateAr(r.at)}</span>` },
      { k: "o", label: "الطلب", render: (r) => (orderOf(r.orderId) ? A.orderLink(r.orderId) : `<span class="mono">${esc(r.orderId)}</span>`) },
      { k: "src", label: "المصدر", render: (r) => (r.source === "h1" ? chip("هب توّا", "brand", "building") : esc(A.merchant(r.source))) },
      { k: "l", label: "البنود", render: (r) => `${returnLines(r).map((l) => `${esc(l.name)} × ${l.q} ${hChip(l.handling)}`).join("<br>")}` },
      { k: "re", label: "سبب الرجوع", render: (r) => esc(r.reason || "—") },
      { k: "st", label: "الحالة", render: (r) => `${chip((RT_ST[r.status] || [r.status])[0], (RT_ST[r.status] || [0, "neutral"])[1])}${isHot(r) ? `<span class="sub" style="color:var(--bad)">أكل سخن — هالك إلزامي (BR-RTO-001)</span>` : ""}${r.outcome ? `<span class="sub">${esc(r.outcome)}${r.inspectedBy ? " · " + esc(r.inspectedBy) : ""}</span>` : ""}` },
      { k: "v", label: "القيمة", num: true, render: (r) => money(returnValue(r)) },
      { k: "p", label: "تحميل الخسارة", render: (r) => (["WASTE", "QUARANTINED"].includes(r.status) || ["IN_TRANSIT", "INSPECTION"].includes(r.status) ? esc(TW.PARTY[lossParty(r)]) : `<span class="muted">لا خسارة</span>`) },
      { k: "a", label: "", render: (r) => (r.status === "INSPECTION" ? gbtn(canIns, HUB_WHY, "افحص", "sp-ins-open", { cls: "sm primary", icon: "eye", data: { id: r.id } }) : r.status === "IN_TRANSIT" ? `<span class="muted" style="font-size:12px">${(() => { const t = S.tasks.find((x) => x.orderId === r.orderId && x.status === "RTO"); return t ? `مع ${esc(A.rider(t.riderId))}` : "في الطريق"; })()}</span>` : "") },
    ];
    const lossBy = {}; rts.filter((r) => ["WASTE", "QUARANTINED"].includes(r.status)).forEach((r) => { const p = lossParty(r); lossBy[p] = (lossBy[p] || 0) + returnValue(r); });
    const exposure = sum(rts.filter((r) => ["IN_TRANSIT", "INSPECTION"].includes(r.status)), returnValue);
    return `${A.head("المرتجعات والفحص", "مرتجع ← فحص ← إعادة للمخزون / حجر / هالك · كل قرار بسبب ومسؤول (P22)", TW.btn("الهب", "go", { cls: "sm", icon: "building", data: { to: "/admin/hub" } }))}
      <div class="grid g5">${kpi("في الطريق للهب", num(cnt("IN_TRANSIT")), "RTO مع المندوب", { tone: cnt("IN_TRANSIT") ? "warn" : "" })}${kpi("بانتظار الفحص", num(cnt("INSPECTION")), `${money(exposure)} قيمة معلّقة`, { tone: cnt("INSPECTION") ? "warn" : "ok" })}${kpi("رجع للمخزون", num(cnt("RESTOCKED")), "متاح للبيع تاني", { tone: "ok" })}${kpi("حجر / عزل", num(cnt("QUARANTINED")), "مش متاح للبيع")}${kpi("هالك", num(cnt("WASTE")), money(sum(rts.filter((r) => r.status === "WASTE"), returnValue)), { tone: cnt("WASTE") ? "bad" : "" })}</div>
      <div class="filters">${seg("spRtF", [["open", "مفتوحة", cnt("IN_TRANSIT") + cnt("INSPECTION")], ["closed", "مقفولة"], ["all", "الكل", rts.length]], f)}<span class="muted" style="font-size:12px">الأكل السخن مبيرجعش للمخزون أبداً (BR-RTO-001) · القابل للبيع يتفحص قبل الإرجاع (BR-RTO-002)</span></div>
      <div class="card" style="padding:0">${TW.table(cols, list, { empty: "مفيش مرتجعات بالفلتر ده", rowCls: (r) => (r.status === "INSPECTION" ? "sev-medium" : r.status === "IN_TRANSIT" ? "sev-high" : "") })}</div>
      <div class="grid g2">${card("تحميل خسارة المرتجعات", "scale", Object.keys(lossBy).length ? `${TW.hbars(Object.entries(lossBy).map(([p, v]) => ({ label: TW.PARTY[p], value: Math.round(v), tone: p === "customer" ? "warn" : "bad" })), { fmt: (v) => money(v) })}<p class="muted" style="font-size:12px;margin-top:6px">رفض العميل بيزوّد عداد رفض الكاش عنده (BR-COD-002) — الطرف المسؤول بيظهر في دفتر الطلب.</p>` : TW.empty("مفيش خسائر مرتجعات مسجّلة", "الهالك والحجر بيتحمّلوا هنا على الطرف المسؤول", "scale"))}
      ${card("تدقيق المرتجعات", "book", (() => { const a = S.audit.filter((x) => /^RT-/.test(x.obj)); return a.length ? `<div class="list">${a.slice(0, 6).map((x) => `<div class="li"><div class="grow"><b style="font-size:13px">${esc(x.obj)} · ${esc(x.nw)}</b><span class="sub muted">${esc(x.reason)}</span></div><span class="muted" style="font-size:12px">${esc(x.who)} · ${clock(x.at)}</span></div>`).join("")}</div>` : TW.empty("لسه مفيش قرارات فحص", "", "book"); })())}</div>`;
  },
  on: {
    "sp-ins-open"(inst, d) { const rt = find(TW.S.returns, d.id); inst.ui.modal = { kind: "sp-inspect", id: d.id }; inst.ui.spInsOut = isHot(rt) ? "waste" : "restock"; inst.ui.spInsReason = INSPECT[inst.ui.spInsOut][isHot(rt) ? 3 : 0]; inst.ui.spInsNote = ""; inst.render(); },
    "sp-ins-out"(inst, d) { inst.ui.spInsOut = d.v; inst.ui.spInsReason = INSPECT[d.v][0]; inst.render(); },
    "sp-ins-submit"(inst) { const m = inst.ui.modal, note = (inst.ui.spInsNote || "").trim(); const r = inst.act("return.inspect", { returnId: m.id, outcome: inst.ui.spInsOut, reason: `${inst.ui.spInsReason}${note ? " — " + note : ""}` }); if (r && r.ok !== false) { inst.ui.modal = null; TW.toast("اتسجّل قرار الفحص والمخزون اتحدّث", "ok"); inst.render(); } },
  },
});
A.modals["sp-inspect"] = (inst, m) => {
  const rt = find(TW.S.returns, m.id); if (!rt) return "";
  const hot = isHot(rt), out = hot ? "waste" : ui(inst, "spInsOut", "restock"), reasons = INSPECT[out], reason = reasons.includes(inst.ui.spInsReason) ? inst.ui.spInsReason : reasons[0];
  const ls = returnLines(rt), cold = ls.some((l) => ["chilled", "frozen"].includes(l.handling)), age = now() - rt.at, val = returnValue(rt), q = sum(ls, (l) => l.q);
  const eff = { restock: `+${q} على الرصيد الفعلي — يرجع متاح للبيع`, quarantine: `+${q} على رصيد الحجر — مش متاح للبيع لحد فحص الجودة`, waste: `+${q} تالف — خسارة ${money(val)} على ${TW.PARTY[lossParty(rt)]}` }[out];
  return TW.modalWrap(`فحص المرتجع <span class="mono">${esc(rt.id)}</span>`, `<div class="list">${ls.map((l) => `<div class="li"><span class="grow">${esc(l.name)} × ${l.q} ${hChip(l.handling)}</span><span class="num">${money(l.hub ? lineCost(l.id, l.q) : l.price * l.q)}</span></div>`).join("")}</div>
    <div class="muted" style="font-size:12.5px">الطلب ${esc(rt.orderId)} · السبب: ${esc(rt.reason || "—")} · رجع من ${TW.mins(age)} دقيقة</div>
    ${hot ? `<div class="banner bad">${ic("flame", "ic sm")}<div>أكل سخن — BR-RTO-001: مبيرجعش للمخزون، القرار الوحيد هالك.</div></div>` : cold && age > 30 * MIN ? `<div class="banner warn">${ic("snow", "ic sm")}<div>صنف مبرد بقاله أكتر من 30 دقيقة خارج التبريد — الأفضل حجر أو هالك.</div></div>` : ""}
    <div class="lbl">القرار</div><div class="seg">${OUTCOME.map(([k, l]) => `<button type="button" class="${out === k ? "on" : ""}" data-act="sp-ins-out" data-v="${k}" ${hot && k !== "waste" ? "disabled" : ""}>${l}</button>`).join("")}</div>
    <label class="field"><span>السبب (قائمة محكومة)</span><select class="input" data-model="spInsReason">${reasons.map((r) => `<option ${reason === r ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label>
    <label class="field"><span>ملاحظة (اختياري)</span><input class="input" data-model="spInsNote" value="${esc(inst.ui.spInsNote || "")}"></label>
    <div class="banner ${out === "waste" ? "bad" : out === "quarantine" ? "warn" : "ok"}">${ic("info", "ic sm")}<div><b>الأثر:</b> ${eff}</div></div>`,
    `<button class="btn primary" data-act="sp-ins-submit">${ic("check", "ic sm")}سجّل القرار</button><button class="btn" data-act="modal-close">إلغاء</button>`);
};
/* ===================================================================== DELIVERY — shared ===================== */
const riderState = (r) => (r.suspended ? ["موقوف", "bad"] : r.status === "offline" ? ["أوفلاين", "neutral"] : r.task ? ["في مهمة", "brand"] : r.cash >= r.limit ? ["فوق حد الكاش", "bad"] : ["متاح", "ok"]);
const rChip = (r) => { const [l, t] = riderState(r); return chip(l, t); };
const VIC = { bicycle: "bike", motorbike: "bike", tricycle: "truck" };
function riderPerf(r) {
  const dl = TW.S.tasks.filter((t) => t.riderId === r.id && t.status === "DELIVERED" && t.assignedAt && t.deliveredAt);
  const avgDel = dl.length ? sum(dl, (t) => t.deliveredAt - t.assignedAt) / dl.length : null;
  const safety = Math.max(0, 1 - r.incidents * 0.35), accuracy = Math.max(0, r.codAcc - r.fails * 0.04), cx = r.rating / 5, cash = r.depositOnTime * (r.cash > r.limit ? 0.75 : 1), speed = r.onTime * 0.6 + r.accept * 0.4;
  return { avgDel, delivered: dl.length, safety, accuracy, cx, cash, speed, score: (safety + accuracy + cx + cash + speed) / 5, oph: r.jobsToday / Math.max(1, r.hours), eph: r.earnToday / Math.max(1, r.hours) };
}
const scoreChip = (v) => chip(num(v * 100), v >= 0.88 ? "ok" : v >= 0.78 ? "warn" : "bad");
const cashCell = (r) => `<div class="sp-cash"><span class="num">${money(r.cash)} / ${money(r.limit)}</span>${meter(r.cash, r.limit)}</div>`;
const riderActs = (r) => `<div class="row gap4">${TW.btn("افتح", "open-rider", { cls: "sm", data: { id: r.id } })}${A.permBtn("rider.manage", r.suspended ? "تفعيل" : "إيقاف", "sp-r-suspend", { cls: `sm ${r.suspended ? "" : "ghost"}`, data: { id: r.id } })}${A.permBtn("rider.manage", "حد الكاش", "sp-r-limit", { cls: "sm ghost", data: { id: r.id } })}${A.permBtn("rider.manage", "تعديل مستحقات", "sp-r-adjust", { cls: "sm ghost", data: { id: r.id } })}</div>`;
A.on["sp-r-suspend"] = (inst, d) => { const r = find(TW.S.riders, d.id); A.ask(inst, { title: `${r.suspended ? "إعادة تفعيل" : "إيقاف"} ${r.ar}`, action: "rider.suspend", payload: { riderId: r.id, on: !r.suspended }, reasons: r.suspended ? ["انتهى التحقيق", "استكمل المستندات", "قرار إداري"] : ["مخالفة سلامة", "فرق كاش متكرر", "شكاوى عملاء متكررة", "مستندات منتهية", "تحقيق جاري"], confirm: r.suspended ? "فعّل المندوب" : "أوقف المندوب", danger: !r.suspended, note: r.suspended ? "المندوب هيقدر يبدأ وردية ويستقبل عروض تاني." : `الإيقاف بيقفل الوردية فوراً وبيمنع أي عروض جديدة${r.task ? " — المندوب عنده مهمة حالية لازم تتعاد إسنادها" : ""}.` }); };
A.on["sp-r-limit"] = (inst, d) => { const r = find(TW.S.riders, d.id); A.ask(inst, { title: `حد الكاش — ${r.ar}`, action: "rider.limit", payload: { riderId: r.id }, extra: [{ k: "limit", label: `الحد الجديد (ج.م) — الحالي ${num(r.limit)} · معاه الآن ${num(r.cash)}`, type: "number", value: r.limit }], reasons: ["أداء كاش ممتاز ومستمر", "رحلات قرى بتحصيل أعلى", "تقليل المخاطر بعد فرق كاش", "قرار المالية"], confirm: "حدّث الحد", note: "Guardrail E: لما الكاش يوصل للحد، المندوب مبيستقبلش مهام كاش لحد ما يورّد (BR-RID-002)." }); };
A.on["sp-r-adjust"] = (inst, d) => { const r = find(TW.S.riders, d.id); A.ask(inst, { title: `تعديل مستحقات — ${r.ar}`, action: "rider.adjust", payload: { riderId: r.id }, extra: [{ k: "amount", label: "المبلغ (سالب = خصم، موجب = إضافة)", type: "number", value: -25 }], reasons: ["تأخير متكرر في الاستلام", "فرق كاش ثابت على المندوب", "حافز أداء", "تعويض انتظار عند التاجر", "تصحيح حساب"], confirm: "ابعت للموافقة", note: "أي تعديل على مستحقات المندوب بيروح لمركز الموافقات قبل ما يأثر على التسوية — ومش بيتطبق تلقائياً." }); };
A.on["sp-r-deposit"] = (inst, d) => { const r = find(TW.S.riders, d.id); A.ask(inst, { title: `استلام كاش من ${r.ar}`, action: "rider.deposit", payload: { riderId: r.id }, field: "at", extra: [{ k: "amount", label: `المبلغ المستلم (ج.م) — معاه ${num(r.cash)}`, type: "number", value: r.cash }], reasons: ["خزينة الهب — وسط المدينة", "نقطة تحصيل شارع الجيش"], confirm: "سجّل التوريد", note: "التوريد بيتسجل «بانتظار تأكيد المالية» وبيفك حجب مهام الكاش فوراً — المطابقة النهائية من صفحة الكاش." }); };
A.on["sp-dep-verify"] = (inst, d) => { const r = inst.act("deposit.verify", { depositId: d.id }); if (r && r.ok !== false) TW.toast("اتأكد استلام الكاش واتطابق", "ok"); };

/* ===================================================================== RIDERS ===================== */
TW.page("riders", {
  render(inst) {
    const S = TW.S, f = ui(inst, "spRdF", "all"), v = ui(inst, "spRdV", "ops");
    const rs = S.riders.filter((r) => f === "all" || (f === "online" && r.status !== "offline" && !r.task && !r.suspended) || (f === "busy" && !!r.task) || (f === "offline" && (r.status === "offline" || r.suspended)) || (f === "cash" && r.cash >= r.limit * 0.8));
    const online = S.riders.filter((r) => r.status !== "offline" && !r.suspended), busy = S.riders.filter((r) => r.task), over = S.riders.filter((r) => r.cash >= r.limit);
    const avgScore = sum(S.riders, (r) => riderPerf(r).score) / S.riders.length;
    const ops = [
      { k: "r", label: "المندوب", render: (r) => `<button class="btn sm ghost sp-link" data-act="open-rider" data-id="${r.id}">${ic(VIC[r.vehicle], "ic sm")}<b>${esc(r.ar)}</b></button><span class="sub">${esc(D.vehicles[r.vehicle])} · <span class="mono">${esc(r.plate)}</span> · ${esc(A.zone(r.zoneId))}</span>` },
      { k: "s", label: "الحالة", render: (r) => rChip(r) },
      { k: "t", label: "المهمة الحالية", render: (r) => { const t = r.task && find(S.tasks, r.task); return t ? `<span class="mono">${esc(t.id)}</span> ${A.st("task", t.status)}${r.route ? `<span class="sub">رحلة ${r.route.length} طلبات</span>` : ""}` : `<span class="muted">—</span>`; } },
      { k: "c", label: "الكاش / الحد", render: cashCell },
      { k: "j", label: "مهام اليوم", num: true, render: (r) => num(r.jobsToday) },
      { k: "e", label: "أرباح اليوم", num: true, render: (r) => money(r.earnToday) },
      { k: "h", label: "ساعات", num: true, render: (r) => num(r.hours) },
      { k: "sc", label: "المؤشر المتوازن", num: true, render: (r) => scoreChip(riderPerf(r).score) },
      { k: "a", label: "", render: riderActs },
    ];
    const score = [
      { k: "r", label: "المندوب", render: (r) => `<button class="btn sm ghost sp-link" data-act="open-rider" data-id="${r.id}"><b>${esc(r.ar)}</b></button><span class="sub">${esc(D.vehicles[r.vehicle])}</span>` },
      { k: "m", label: "مهام", num: true, render: (r) => num(r.jobsToday) },
      { k: "ac", label: "القبول", num: true, render: (r) => pct(r.accept) },
      { k: "ot", label: "في الموعد", num: true, render: (r) => pct(r.onTime) },
      { k: "dt", label: "زمن التوصيل", num: true, render: (r) => { const p = riderPerf(r); return p.avgDel ? `${num(p.avgDel / MIN)} د` : "—"; } },
      { k: "ra", label: "التقييم", num: true, render: (r) => `${num(r.rating, 1)} ${ic("star", "ic xs")}` },
      { k: "f", label: "فشل", num: true, render: (r) => (r.fails ? `<span style="color:var(--bad)">${r.fails}</span>` : "0") },
      { k: "ca", label: "دقة الكاش", num: true, render: (r) => pct(r.codAcc, 1) },
      { k: "dp", label: "توريد في الموعد", num: true, render: (r) => pct(r.depositOnTime) },
      { k: "km", label: "كم", num: true, render: (r) => num(r.km) },
      { k: "oph", label: "طلب/ساعة", num: true, render: (r) => num(riderPerf(r).oph, 1) },
      { k: "eph", label: "ج.م/ساعة", num: true, render: (r) => num(riderPerf(r).eph) },
      { k: "in", label: "حوادث", num: true, render: (r) => (r.incidents ? chip(String(r.incidents), "bad") : "0") },
      { k: "re", label: "إنقاذ", num: true, render: (r) => num(r.rescues) },
      { k: "sc", label: "المتوازن", num: true, render: (r) => scoreChip(riderPerf(r).score) },
    ];
    return `${A.head("المناديب", "الحالة، الكاش مقابل الحد، وبطاقة أداء متوازنة — مش السرعة بس: السلامة، الدقة، تجربة العميل، وانضباط الكاش", `<div class="row wrap">${TW.btn("الأسطول", "go", { cls: "sm", icon: "car", data: { to: "/admin/fleet" } })}${TW.btn("قائمة التوزيع", "go", { cls: "sm", icon: "list", data: { to: "/admin/dispatch-queue" } })}</div>`)}
      ${A.answer({ what: `${online.length} مندوب في الوردية · ${busy.length} في مهمة`, attention: over.length ? `${over.length} فوق حد الكاش (EX-RID-003) — مهام الكاش متوقفة` : "لا تجاوزات كاش", owner: "مدير العمليات — سارة مختار · الكاش: المالية", risk: `${money(sum(S.riders, (r) => r.cash))} كاش مع المناديب الآن` })}
      <div class="grid g5">${kpi("في الوردية", num(online.length), `من ${S.riders.length} مندوب`)}${kpi("في مهمة", num(busy.length), `${pct(online.length ? busy.length / online.length : 0)} استغلال`)}${kpi("كاش مع المناديب", TW.kmoney(sum(S.riders, (r) => r.cash)), `${over.length} فوق الحد`, { tone: over.length ? "bad" : "" })}${kpi("متوسط التقييم", num(sum(S.riders, (r) => r.rating) / S.riders.length, 2), "من 5")}${kpi("المؤشر المتوازن", num(avgScore * 100), "سلامة · دقة · عميل · كاش · سرعة")}</div>
      <div class="filters">${seg("spRdF", [["all", "الكل", S.riders.length], ["online", "متاح", S.riders.filter((r) => r.status !== "offline" && !r.task && !r.suspended).length], ["busy", "في مهمة", busy.length], ["offline", "أوفلاين/موقوف", S.riders.filter((r) => r.status === "offline" || r.suspended).length], ["cash", "قرب حد الكاش", S.riders.filter((r) => r.cash >= r.limit * 0.8).length]], f)}<span class="grow"></span>${seg("spRdV", [["ops", "الحالة والكاش"], ["score", "بطاقة الأداء"]], v)}</div>
      <div class="card" style="padding:0">${TW.table(v === "score" ? score : ops, rs, { empty: "مفيش مناديب بالفلتر ده", rowCls: (r) => (r.cash >= r.limit && r.status !== "offline" ? "sev-critical" : r.suspended ? "sev-high" : "") })}</div>
      ${v === "score" ? `<div class="banner brand">${ic("shield", "ic sm")}<div><b>المؤشر المتوازن</b> = متوسط 5 محاور بنفس الوزن: السلامة (حوادث)، الدقة (دقة الكاش والفشل)، تجربة العميل (التقييم)، انضباط الكاش (التوريد في الموعد والحد)، السرعة والالتزام (في الموعد والقبول). السرعة 20% بس — مش بنكافئ اللي بيجري ويكسر القواعد.</div></div>` : ""}`;
  },
  on: {},
});

/* ===================================================================== RIDER 360 ===================== */
TW.page("rider", {
  render(inst, [id]) {
    const S = TW.S, r = find(S.riders, id);
    if (!r) return `<div class="card">${TW.empty("المندوب مش موجود", id, "bike")}</div>`;
    const p = riderPerf(r), cur = r.task && find(S.tasks, r.task);
    const active = S.tasks.filter((t) => t.riderId === r.id && !["DELIVERED", "CANCELLED", "RETURNED"].includes(t.status));
    const today = S.tasks.filter((t) => (t.riderId === r.id || t.offers.some((x) => x.riderId === r.id)) && isToday(t.createdAt)).sort((a, b) => b.createdAt - a.createdAt);
    const cods = S.cod.filter((c) => c.riderId === r.id).sort((a, b) => b.at - a.at), deps = S.deposits.filter((d) => d.riderId === r.id);
    const rs = S.rsettle.find((x) => x.riderId === r.id), aps = S.approvals.filter((a) => a.type === "rider_adjust" && a.ref && a.ref.id === r.id);
    const tids = new Set(S.tasks.filter((t) => t.riderId === r.id).map((t) => t.id));
    const aud = S.audit.filter((a) => a.obj === r.ar || String(a.nw).includes(r.ar) || [...tids].some((t) => String(a.obj).includes(t)) || String(a.reason).includes(r.ar));
    const zonesOk = S.zones.filter((z) => z.active && z.riderType.includes(r.vehicle)).map((z) => z.ar);
    const kit = KIT[r.vehicle];
    const net = rs ? rs.fees + rs.incentives + rs.waiting + rs.deductions + rs.codVariance : 0;
    const pill = (label, v, sub) => `<div class="sp-pillar"><div class="row between"><b>${label}</b>${scoreChip(v)}</div>${meter(v, 1, v >= 0.88 ? "ok" : v >= 0.78 ? "warn" : "bad")}<small class="muted">${sub}</small></div>`;
    const curCard = cur ? (() => { const o = orderOf(cur.orderId); return `<dl class="kv"><dt>المهمة</dt><dd><span class="mono">${esc(cur.id)}</span> ${A.st("task", cur.status)} ${A.orderLink(cur.orderId)}</dd><dt>الاستلام</dt><dd>${cur.pickups.map((pp) => `${esc(pp.name)} ${pp.scanned ? chip("اتسلّم", "ok") : chip("لسه", "neutral")}`).join(" ")}</dd><dt>التسليم</dt><dd>${esc(cur.drop.name)} — ${esc(cur.drop.landmark)}</dd><dt>كاش مطلوب</dt><dd class="num">${money(cur.cod)}</dd><dt>الوعد</dt><dd>${o && o.mode !== "scheduled" ? `<span class="timer" data-until="${o.etaAt}"></span>` : esc(cur.window || "رحلة مجدولة")}</dd>${r.route ? `<dt>الرحلة</dt><dd>${r.route.length} طلبات (${r.route.map((x) => esc(x)).join("، ")})</dd>` : ""}</dl>`; })() : `<p class="muted">مفيش مهمة حالية.</p>`;
    const tCols = [
      { k: "id", label: "المهمة", render: (t) => `<span class="mono">${esc(t.id)}</span><span class="sub">${clock(t.createdAt)}</span>` },
      { k: "o", label: "الطلب", render: (t) => A.orderLink(t.orderId) },
      { k: "s", label: "الحالة", render: (t) => (t.riderId === r.id ? A.st("task", t.status) : chip("عُرضت عليه", "neutral")) },
      { k: "of", label: "رده على العرض", render: (t) => { const x = t.offers.filter((y) => y.riderId === r.id).pop(); return x ? `${chip({ accept: "قبل", reject: "رفض", timeout: "لم يرد" }[x.resp], x.resp === "accept" ? "ok" : x.resp === "reject" ? "warn" : "bad")} <span class="muted">${x.rt} ث</span>${x.reason ? `<span class="sub">${esc(x.reason)}</span>` : ""}` : t.manual ? chip("إسناد يدوي", "warn") : t.route ? chip("رحلة مجدولة", "info") : "—"; } },
      { k: "km", label: "كم", num: true, render: (t) => num(t.km, 1) },
      { k: "c", label: "كاش", num: true, render: (t) => (t.cod ? money(t.cod) : "—") },
      { k: "e", label: "الأجر", num: true, render: (t) => money(t.earn) },
      { k: "d", label: "زمن التوصيل", num: true, render: (t) => (t.deliveredAt && t.assignedAt ? `${num((t.deliveredAt - t.assignedAt) / MIN)} د` : "—") },
    ];
    const cCols = [
      { k: "at", label: "الوقت", render: (c) => clock(c.at) },
      { k: "o", label: "الطلب", render: (c) => (orderOf(c.orderId) ? A.orderLink(c.orderId) : esc(c.orderId)) },
      { k: "e", label: "المتوقع", num: true, render: (c) => money(c.expected) },
      { k: "c", label: "المحصّل", num: true, render: (c) => money(c.collected) },
      { k: "v", label: "الفرق", num: true, render: (c) => (c.variance ? `<b style="color:var(--bad)">${money(c.variance)}</b>${c.varianceResolved ? `<span class="sub">اتسوّى</span>` : ""}` : "0") },
      { k: "s", label: "الحالة", render: (c) => chip({ HELD: "مع المندوب", DEPOSITED: "اتورّد", RECONCILED: "اتطابق" }[c.status] || c.status, c.status === "HELD" ? "warn" : c.status === "RECONCILED" ? "ok" : "info") },
    ];
    return `<div class="cc-top"><button class="btn sm" data-act="go" data-to="/admin/riders">${ic("arrowR", "ic xs")}كل المناديب</button><h1>${esc(r.ar)}<small>${esc(D.vehicles[r.vehicle])} · <span class="mono">${esc(r.plate)}</span> · ${esc(A.zone(r.zoneId))} · <span class="mono">${esc(r.phone)}</span></small></h1><div class="row wrap">${rChip(r)}${A.permBtn("rider.manage", r.suspended ? "تفعيل" : "إيقاف", "sp-r-suspend", { cls: "sm", icon: r.suspended ? "play" : "pause", data: { id: r.id } })}${A.permBtn("rider.manage", "حد الكاش", "sp-r-limit", { cls: "sm", icon: "cash", data: { id: r.id } })}${A.permBtn("rider.manage", "تعديل مستحقات", "sp-r-adjust", { cls: "sm", icon: "coins", data: { id: r.id } })}</div></div>
      ${r.cash >= r.limit && !r.suspended ? `<div class="banner bad">${ic("alert", "ic sm")}<div class="grow"><b>EX-RID-003 — فوق حد الكاش (${money(r.cash)} / ${money(r.limit)})</b> · المحرك مش هيعرض عليه أي مهمة كاش لحد ما يورّد (BR-RID-002). مهام الدفع أونلاين مسموحة.</div>${A.permBtn("settlement.adjust", "سجّل توريد في الخزينة", "sp-r-deposit", { cls: "sm danger", icon: "cash", data: { id: r.id } })}</div>` : ""}
      ${r.suspended ? `<div class="banner warn">${ic("lock", "ic sm")}<div>المندوب موقوف — مش هيظهر في الترشيحات ولا يقدر يبدأ وردية.</div></div>` : ""}
      <div class="grid g5">${kpi("مهام اليوم", num(r.jobsToday), `${num(p.oph, 1)} طلب/ساعة`)}${kpi("أرباح اليوم", money(r.earnToday), `${num(p.eph)} ج.م/ساعة`)}${kpi("الكاش معاه", money(r.cash), `${meter(r.cash, r.limit)}<span class="num">الحد ${money(r.limit)}</span>`, { tone: r.cash >= r.limit ? "bad" : r.cash >= r.limit * 0.8 ? "warn" : "" })}${kpi("التقييم", num(r.rating, 1), `${r.fails} فشل · ${r.incidents} حوادث`)}${kpi("المؤشر المتوازن", num(p.score * 100), "مش السرعة بس")}</div>
      <div class="grid sp-g21"><div class="card"><div class="hd"><h3>${ic("map", "ic sm")} المهمة الحالية</h3>${cur ? A.st("task", cur.status) : rChip(r)}</div>${A.map({ tasks: active, riderAct: "open-rider", taskAct: "open-order", merchants: false })}<p class="muted" style="font-size:12px;margin-top:4px">${ic("info", "ic xs")} مسار المهمة الحالية متقطع — مرّر على أي مندوب لاسمه وكاشه.</p><div style="margin-top:10px">${curCard}</div></div>
      <div class="col gap12">${card("الملف والمركبة", "user", `<dl class="kv"><dt>المركبة</dt><dd>${esc(D.vehicles[r.vehicle])} · <span class="mono">${esc(r.plate)}</span></dd><dt>منطقة الارتكاز</dt><dd>${esc(A.zone(r.zoneId))}</dd><dt>مسموح يخدم</dt><dd>${zonesOk.map(esc).join("، ") || "—"}</dd><dt>العدّة</dt><dd>${esc(kit.bag)} · ${kit.items.map(esc).join("، ")}</dd><dt>السعة</dt><dd>${esc(kit.cap)}</dd><dt>ساعات اليوم</dt><dd>${num(r.hours)} س · ${num(r.km)} كم</dd><dt>محرك الترشيح</dt><dd>${r.autopilot ? chip("محاكاة آلية", "neutral") : chip("مندوب العرض (يدوي)", "brand")}</dd></dl>`)}
      ${card("الأداء المتوازن", "shield", `<div class="sp-pillars">${pill("السلامة", p.safety, `${r.incidents} حوادث · ${r.rescues} إنقاذ`)}${pill("الدقة", p.accuracy, `دقة الكاش ${pct(r.codAcc, 1)} · ${r.fails} فشل`)}${pill("تجربة العميل", p.cx, `تقييم ${num(r.rating, 1)} من 5`)}${pill("انضباط الكاش", p.cash, `توريد في الموعد ${pct(r.depositOnTime)}${r.cash > r.limit ? " · فوق الحد" : ""}`)}${pill("السرعة والالتزام", p.speed, `في الموعد ${pct(r.onTime)} · قبول ${pct(r.accept)}${p.avgDel ? ` · ${num(p.avgDel / MIN)} د/توصيلة` : ""}`)}</div>`)}</div></div>
      ${card("مهام اليوم وردوده على العروض", "list", TW.table(tCols, today, { empty: "مفيش مهام النهارده" }))}
      <div class="grid g2">${card("دفتر الكاش", "cash", `${TW.table(cCols, cods.slice(0, 12), { empty: "مفيش كاش مسجّل" })}<div class="lbl" style="margin-top:10px">التوريدات</div>${deps.length ? `<div class="list">${deps.map((dp) => `<div class="li"><span class="mono">${esc(dp.id)}</span><span class="grow">${money(dp.amount)} · ${esc(dp.place)} · ${clock(dp.at)}</span>${dp.status === "PENDING_VERIFY" ? A.permBtn("settlement.adjust", "أكّد الاستلام", "sp-dep-verify", { cls: "sm primary", data: { id: dp.id } }) : chip("اتأكد", "ok")}</div>`).join("")}</div>` : `<p class="muted" style="font-size:12.5px">مفيش توريدات النهارده.</p>`}${r.cash > 0 && r.cash < r.limit ? `<div style="margin-top:8px">${A.permBtn("settlement.adjust", "سجّل توريد في الخزينة", "sp-r-deposit", { cls: "sm", icon: "cash", data: { id: r.id } })}</div>` : ""}`)}
      ${card("التسوية", "wallet", rs ? `<dl class="kv"><dt>الفترة</dt><dd>${esc(rs.period)} · ${chip(rs.status === "PAID" ? "اتصرفت" : "مفتوحة", rs.status === "PAID" ? "ok" : "info")}</dd><dt>المهام</dt><dd class="num">${num(rs.missions)}</dd><dt>أجر المهام</dt><dd class="num">${money(rs.fees)}</dd><dt>حوافز</dt><dd class="num">${money(rs.incentives)}</dd><dt>انتظار</dt><dd class="num">${money(rs.waiting)}</dd><dt>خصومات معتمدة</dt><dd class="num" style="color:${rs.deductions < 0 ? "var(--bad)" : "inherit"}">${money(rs.deductions)}</dd><dt>فروق كاش</dt><dd class="num" style="color:${rs.codVariance < 0 ? "var(--bad)" : "inherit"}">${money(rs.codVariance)}</dd><dt>الصافي</dt><dd class="num"><b>${money(net)}</b></dd></dl>${aps.length ? `<hr class="sep"><div class="lbl">تعديلات بانتظار/بعد الموافقة</div>${aps.map((a) => `<div class="row between" style="font-size:13px"><span>${esc(a.reason)}</span>${chip(a.status === "PENDING" ? "بانتظار" : a.status === "APPROVED" ? "معتمد" : "مرفوض", a.status === "PENDING" ? "warn" : a.status === "APPROVED" ? "ok" : "bad")}</div>`).join("")}` : ""}` : TW.empty("مفيش تسوية", "", "wallet"))}</div>
      ${card("سجل التدقيق", "book", aud.length ? TW.table([{ k: "at", label: "الوقت", render: (a) => clock(a.at) }, { k: "who", label: "من" }, { k: "action", label: "الإجراء" }, { k: "obj", label: "على" }, { k: "old", label: "قبل" }, { k: "nw", label: "بعد" }, { k: "reason", label: "السبب" }], aud.slice(0, 15)) : TW.empty("مفيش إجراءات يدوية على المندوب ده", "", "book"))}`;
  },
  on: {},
});

/* ===================================================================== FLEET ===================== */
/* equipment standard per vehicle type (module configuration, shown as the kit policy) */
const KIT = {
  bicycle: { bag: "شنطة ظهر حرارية 20 لتر", items: ["خوذة", "سترة عاكسة", "حامل موبايل"], cap: "حتى 12 كجم · مشاوير حتى 3 كم", thermal: "شنطة حرارية صغيرة — لا مجمدات لمسافات طويلة" },
  motorbike: { bag: "صندوق حراري 45 لتر", items: ["خوذة", "سترة عاكسة", "كيس تبريد", "حامل موبايل"], cap: "حتى 25 كجم · حتى 10 كم", thermal: "صندوق حراري + كيس تبريد للمبرد والمجمد" },
  tricycle: { bag: "صندوق معزول 150 لتر + ثلاجة كولمان", items: ["سترة عاكسة", "حبال تثبيت", "ثلج جاف", "ميزان"], cap: "حتى 120 كجم · رحلات القرى المجمّعة", thermal: "صندوق معزول كبير للرحلات المجدولة" },
};
TW.page("fleet", {
  render(inst) {
    const S = TW.S, types = Object.keys(D.vehicles);
    const avgOph = sum(S.riders, (r) => r.jobsToday / Math.max(1, r.hours)) / S.riders.length;
    const online = S.riders.filter((r) => r.status !== "offline" && !r.suspended).length;
    const hrs = (S.hist.hourlyY || []).map((v, h) => ({ h, v })).filter((x) => x.h >= 8 && x.h <= 23);
    const cur = new Date().getHours();
    const series = hrs.map((x) => { const need = Math.ceil(x.v / Math.max(0.5, avgOph)); return { label: String(x.h), value: need, tone: need > online ? "bad" : x.h === cur ? "accent" : "brand" }; });
    const typeCard = (t) => {
      const rs = S.riders.filter((r) => r.vehicle === t), on = rs.filter((r) => r.status !== "offline" && !r.suspended), busy = rs.filter((r) => r.task);
      const zs = S.zones.filter((z) => z.riderType.includes(t)), k = KIT[t];
      return `<div class="card"><div class="hd"><h3>${ic(VIC[t], "ic sm")} ${esc(D.vehicles[t])}</h3>${chip(`${rs.length} مركبة`, "brand")}</div>
        <div class="sp-minis">${mini("في الوردية", num(on.length))}${mini("في مهمة", num(busy.length))}${mini("الاستغلال", pct(on.length ? busy.length / on.length : 0), "في مهمة ÷ في الوردية")}${mini("كم اليوم", num(sum(rs, (r) => r.km)))}</div>
        <dl class="kv" style="margin-top:10px"><dt>مسموح في</dt><dd>${zs.map((z) => `${esc(z.ar)}${z.active ? "" : " (غير مفعّلة)"}`).join("، ")}</dd><dt>السعة</dt><dd>${esc(k.cap)}</dd><dt>الحرارة</dt><dd>${esc(k.thermal)}</dd><dt>العدّة</dt><dd>${esc(k.bag)} · ${k.items.map(esc).join("، ")}</dd><dt>اللوحات</dt><dd class="mono">${rs.map((r) => esc(r.plate)).join(" · ")}</dd></dl></div>`;
    };
    const flags = S.riders.filter((r) => r.incidents || r.fails >= 2);
    const cols = [
      { k: "r", label: "المندوب", render: (r) => `<button class="btn sm ghost sp-link" data-act="open-rider" data-id="${r.id}"><b>${esc(r.ar)}</b></button>` },
      { k: "v", label: "المركبة", render: (r) => `${ic(VIC[r.vehicle], "ic xs")} ${esc(D.vehicles[r.vehicle])}` },
      { k: "p", label: "اللوحة", render: (r) => `<span class="mono">${esc(r.plate)}</span>` },
      { k: "z", label: "الارتكاز", render: (r) => esc(A.zone(r.zoneId)) },
      { k: "s", label: "الحالة", render: rChip },
      { k: "h", label: "ساعات الوردية", num: true, render: (r) => num(r.hours) },
      { k: "u", label: "طلب/ساعة", num: true, render: (r) => num(r.jobsToday / Math.max(1, r.hours), 1) },
      { k: "km", label: "كم اليوم", num: true, render: (r) => num(r.km) },
      { k: "kit", label: "العدّة", render: (r) => chip(KIT[r.vehicle].bag.split(" ").slice(0, 2).join(" "), "info", "box") },
      { k: "m", label: "الصيانة / السلامة", render: (r) => (r.incidents ? chip("فحص بعد حادث مطلوب", "bad", "alert") : r.fails >= 2 ? chip("مراجعة حالات الفشل", "warn") : chip("سليم", "ok")) },
    ];
    return `${A.head("الأسطول", "المركبات حسب النوع، المناطق المسموحة لكل نوع، الاستغلال، الإتاحة مقابل الطلب، والصيانة والعدّة", TW.btn("المناديب", "go", { cls: "sm", icon: "bike", data: { to: "/admin/riders" } }))}
      <div class="grid g3">${types.map(typeCard).join("")}</div>
      <div class="grid sp-g21">${card("الإتاحة مقابل الطلب حسب الساعة", "bars", `${TW.bars(series, { h: 190, label: "مناديب مطلوبين في الساعة", fmt: (v) => `${v} مندوب` })}${TW.legend([["مطلوب ≤ المتاح الآن", "brand"], ["الساعة الحالية", "accent"], ["عجز عن المتاح الآن", "bad"]])}<p class="muted" style="font-size:12px;margin-top:6px">المطلوب = طلبات الساعة (منحنى الأسبوع اللي فات) ÷ متوسط ${num(avgOph, 1)} طلب لكل مندوب/ساعة · المتاح الآن ${online} مندوب.</p>`)}
      ${card("تنبيهات الصيانة والسلامة", "alert", flags.length ? `<div class="list">${flags.map((r) => `<div class="li">${ic(VIC[r.vehicle], "ic sm")}<div class="grow"><b>${esc(r.ar)}</b> <span class="mono muted">${esc(r.plate)}</span><span class="sub muted">${r.incidents ? `${r.incidents} حادث مسجّل — فحص المركبة والعدّة قبل الوردية الجاية` : `${r.fails} حالات فشل — مراجعة مع المشرف`}</span></div>${TW.btn("افتح", "open-rider", { cls: "sm", data: { id: r.id } })}</div>`).join("")}</div>` : TW.empty("لا تنبيهات", "", "check"))}</div>
      <div class="card" style="padding:0">${TW.table(cols, S.riders)}</div>`;
  },
  on: {},
});

/* ===================================================================== ZONES & CLUSTERS ===================== */
const ROUTE_AR = { "on-demand": "حسب الطلب", batched: "تجميع رحلات", scheduled: "نوافذ مجدولة" };
const STRATEGY = { core: "عجلة/موتوسيكل · توصيل سريع · توزيع مرن", near: "موتوسيكل · تجميع رحلات ممكن", outer: "نوافذ مجدولة · حد أدنى أعلى · تجميع طلبات · cut-off للرحلة" };
const HOURS = ["7 ص – 1 ص", "8 ص – 12 م", "9 ص – 11 م", "10 ص – 10 م", "رحلات مجدولة", "غير مفعّلة"];
const WINDOWS = Array.from({ length: 12 }, (_, i) => `${i + 9}:00 – ${i + 10}:00`);
const ZF = { fee: "رسوم التوصيل (ج.م)", min: "الحد الأدنى للسلة (ج.م)", sla: "وعد التوصيل (دقيقة)", hours: "ساعات العمل", cap: "أقصى سعة (طلبات متزامنة)", windows: "النوافذ المجدولة", riderType: "أنواع المركبات", route: "استراتيجية التوزيع", active: "الحالة", hub: "الهب المغذّي" };
const ZONE_REASONS = ["تحسين اقتصاديات المنطقة", "تغيير الطلب الموسمي", "سعة المناديب", "مواعيد محلية (صلاة/سوق)", "شكاوى وعد التوصيل", "قرار إداري"];
function zoneEcon(z) {
  const s = TW.S.hist.zoneStats[z.id]; if (!s) return null;
  const kmPer = s.km + s.dead / Math.max(1, s.opt);
  return { ...s, kmPer, cpk: s.cpo / kmPer, density: s.opt / (s.km * s.opt + s.dead), day: s.cm * s.orders, subsidy: s.cpo - z.fee, loss: s.cm < 0 };
}
const zoneHub = (z) => find(TW.S.hubs, z.hub || "h1");
const zVal = (z, f) => (f === "sla" ? `${z.sla[0]}–${z.sla[1]} د` : f === "windows" ? (z.windows.length ? z.windows.join("، ") : "—") : f === "riderType" ? z.riderType.map((v) => D.vehicles[v]).join("، ") : f === "route" ? ROUTE_AR[z.route] || z.route : f === "active" ? (z.active ? "مفعّلة" : "غير مفعّلة") : f === "hub" ? zoneHub(z).ar : f === "fee" || f === "min" ? money(z[f]) : String(z[f]));
TW.page("zones", {
  render(inst) {
    const S = TW.S, zid = ui(inst, "spZone", "hadeen"), z = find(S.zones, zid) || S.zones[0], e = zoneEcon(z);
    const villages = TW.groupBy(S.zones, (x) => x.village), clusters = TW.groupBy(S.zones, (x) => x.cluster);
    const tree = `<div class="sp-tree"><div class="sp-tn l0">${ic("globe", "ic xs")} محافظة ${esc(D.geo.governorate.ar)}</div><div class="sp-tn l1">${ic("building", "ic xs")} ${esc(D.geo.markaz.ar)}</div>${Object.entries(villages).map(([v, zs]) => `<div class="sp-tn l2">${ic(zs[0].type === "core" ? "building" : "home", "ic xs")} ${esc(v)} <span class="muted">${zs[0].type === "core" ? "مدينة" : "قرية"} · ${num(zs[0].pop)} نسمة</span></div>${zs.map((x) => `<button type="button" class="sp-tn l3 ${x.id === z.id ? "on" : ""}" data-act="sp-zone-sel" data-id="${x.id}"><span>${ic("pin", "ic xs")} ${esc(x.ar)}</span>${chip(D.zoneType[x.type], x.type === "core" ? "brand" : x.type === "near" ? "info" : "accent")}<span class="mono muted">${esc(x.cluster)}</span>${x.active ? "" : chip("غير مفعّلة", "neutral")}${zoneEcon(x) && zoneEcon(x).loss ? chip("خسرانة", "bad") : ""}</button>`).join("")}`).join("")}</div>`;
    const clCard = `<div class="sp-clusters">${Object.entries(clusters).map(([c, zs]) => `<div class="sp-cl"><b class="mono">${esc(c)}</b><span>${zs.map((x) => esc(x.ar)).join(" + ")}</span><small class="muted">${esc(STRATEGY[zs[0].type])}</small></div>`).join("")}</div>`;
    const cols = [
      { k: "z", label: "المنطقة", render: (x) => `<button class="btn sm ghost sp-link" data-act="sp-zone-sel" data-id="${x.id}"><b>${esc(x.ar)}</b></button><span class="sub">${esc(D.zoneType[x.type])} · ${esc(x.cluster)}</span>` },
      { k: "h", label: "الهب", render: (x) => esc(zoneHub(x).ar.split(" — ")[0]) },
      { k: "fee", label: "الرسوم", num: true, render: (x) => money(x.fee) },
      { k: "min", label: "حد أدنى", num: true, render: (x) => money(x.min) },
      { k: "sla", label: "الوعد", num: true, render: (x) => `${x.sla[0]}–${x.sla[1]} د` },
      { k: "hrs", label: "الساعات", render: (x) => esc(x.hours) },
      { k: "cap", label: "السعة", num: true, render: (x) => num(x.cap) },
      { k: "w", label: "النوافذ", render: (x) => (x.windows.length ? x.windows.map((w) => `<span class="mono">${esc(w)}</span>`).join("<br>") : "—") },
      { k: "rt", label: "المركبات", render: (x) => x.riderType.map((v) => esc(D.vehicles[v])).join("، ") },
      { k: "r", label: "التوزيع", render: (x) => chip(ROUTE_AR[x.route], x.route === "scheduled" ? "accent" : x.route === "batched" ? "info" : "brand") },
      { k: "a", label: "الحالة", render: (x) => (x.active ? chip("مفعّلة", "ok") : chip("غير مفعّلة", "neutral")) },
      { k: "cm", label: "مساهمة/طلب", num: true, render: (x) => { const ee = zoneEcon(x); return ee ? `<b style="color:${ee.loss ? "var(--bad)" : "var(--ok)"}">${money(ee.cm, 1)}</b>` : "—"; } },
    ];
    const live = S.orders.filter((o) => o.zoneId === z.id && !["DELIVERED", "CANCELLED", "RETURNED"].includes(o.status)).length;
    const sched = S.tasks.filter((t) => t.status === "SCHEDULED" && t.drop.zoneId === z.id).length;
    const eligRiders = S.riders.filter((r) => z.riderType.includes(r.vehicle) && r.status !== "offline" && !r.suspended).length;
    const fields = ["fee", "min", "sla", "hours", "cap", "windows", "riderType", "route", "active", "hub"];
    const cfg = `<div class="list">${fields.map((f) => `<div class="li"><span class="lbl" style="min-width:150px">${ZF[f]}</span><span class="grow">${esc(zVal(z, f))}</span>${A.permBtn("zones.edit", "تعديل", "sp-ze-open", { cls: "sm ghost", icon: "edit", data: { zone: z.id, field: f } })}</div>`).join("")}</div>`;
    const econ = e ? `<div class="sp-minis">${mini("تكلفة/طلب", money(e.cpo), `الرسوم ${money(z.fee)}`, e.cpo > z.fee ? "warn" : "")}${mini("تكلفة/كم", money(e.cpk, 1), `${num(e.kmPer, 1)} كم/طلب`)}${mini("طلبات/رحلة", num(e.opt, 1))}${mini("كثافة المسار", num(e.density, 2), "طلب لكل كم رحلة")}${mini("انتظار", `${num(e.wait, 1)} د`, "عند الاستلام")}${mini("كم فاضي (deadhead)", num(e.dead, 1), "لكل رحلة")}${mini("مساهمة/طلب", money(e.cm, 1), "", e.loss ? "bad" : "ok")}${mini("مساهمة/يوم", money(e.day), `${num(e.orders)} طلب/يوم`, e.loss ? "bad" : "ok")}${mini("في الموعد", pct(e.onTime))}</div>
      ${e.loss ? `<div class="banner bad" style="margin-top:10px">${ic("alert", "ic sm")}<div><b>المنطقة خسرانة (Guardrail B):</b> مساهمة ${money(e.cm, 1)} لكل طلب — دعم توصيل ${money(e.subsidy)} على كل طلب. الحلول بالترتيب: ارفع الحد الأدنى للسلة (كل +${money(Math.ceil(-e.cm / 0.15 / 5) * 5)} سلة بتغطي العجز بهامش 15%)، قلّل النوافذ لتجميع ${num(e.opt + 1, 1)}+ طلب/رحلة، أو ارفع رسوم التوصيل.</div></div>` : e.subsidy > 0 ? `<div class="banner warn" style="margin-top:10px">${ic("info", "ic sm")}<div>رسوم التوصيل أقل من تكلفة الطلب بـ ${money(e.subsidy)} — الهامش من المنتجات بيغطيها حالياً.</div></div>` : `<div class="banner ok" style="margin-top:10px">${ic("check", "ic sm")}<div>اقتصاديات التوصيل سليمة.</div></div>`}` : `<p class="muted">المنطقة غير مفعّلة — مفيش بيانات تشغيل. قرار الإطلاق من <button class="btn sm ghost" data-act="go" data-to="/admin/expansion" style="padding:0 4px">التوسع الجغرافي</button>.</p>`;
    return `${A.head("مناطق الخدمة والعناقيد", "محافظة ← مركز ← مدينة/قرية ← منطقة خدمة ← عنقود رحلات · الوعد واقعي حسب المنطقة — مفيش «15 دقيقة» للكل", TW.btn("تخطيط الرحلات", "go", { cls: "sm", icon: "route", data: { to: "/admin/routes" } }))}
      <div class="grid sp-g12">${card("التسلسل الجغرافي", "layers", tree + `<div class="lbl" style="margin-top:12px">عناقيد الرحلات واستراتيجيتها</div>${clCard}`)}
      <div class="card"><div class="hd"><h3>${ic("map", "ic sm")} الخريطة — اضغط على منطقة</h3>${chip(z.ar, "accent", "pin")}</div>${A.map({ zoneAct: "sp-zone-sel", selZone: z.id, riderAct: "open-rider" })}</div></div>
      <div class="grid g2"><div class="card"><div class="hd"><h3>${ic("settings", "ic sm")} إعدادات ${esc(z.ar)}</h3><div class="row wrap">${chip(D.zoneType[z.type], "brand")}${chip(ROUTE_AR[z.route], "info")}</div></div><div class="sp-minis" style="margin-bottom:8px">${mini("طلبات نشطة", num(live), `السعة ${num(z.cap)}`, z.cap && live >= z.cap ? "bad" : "")}${mini("مجدول على رحلة", num(sched))}${mini("مناديب مؤهلين متاحين", num(eligRiders))}</div>${cfg}<p class="muted" style="font-size:12px;margin-top:8px">${ic("book", "ic xs")} كل تعديل بسبب إلزامي وصلاحية «${esc(D.perms["zones.edit"])}» وبيتسجل في التدقيق.</p></div>
      ${card(`اقتصاديات التوصيل — ${esc(z.ar)}`, "scale", econ)}</div>
      <div class="card" style="padding:0">${TW.table(cols, S.zones, { rowCls: (x) => (zoneEcon(x) && zoneEcon(x).loss ? "sev-critical" : x.id === z.id ? "sev-medium" : "") })}</div>
      ${card("تدقيق المناطق", "book", (() => { const a = S.audit.filter((x) => /^منطقة/.test(x.obj)); return a.length ? TW.table([{ k: "at", label: "الوقت", render: (x) => clock(x.at) }, { k: "who", label: "من" }, { k: "obj", label: "المنطقة" }, { k: "action", label: "الإجراء" }, { k: "old", label: "قبل" }, { k: "nw", label: "بعد" }, { k: "reason", label: "السبب" }], a.slice(0, 10)) : TW.empty("لا تعديلات", "", "book"); })())}`;
  },
  on: {
    "sp-zone-sel"(inst, d) { inst.ui.spZone = d.id; inst.render(); },
    "sp-ze-open"(inst, d) {
      const z = find(TW.S.zones, d.zone); inst.ui.modal = { kind: "sp-zone-edit", zoneId: z.id, field: d.field };
      inst.ui.spZeVal = d.field === "active" ? String(z.active) : d.field === "hub" ? z.hub || "h1" : ["fee", "min", "cap", "hours", "route"].includes(d.field) ? String(z[d.field]) : "";
      inst.ui.spZeA = String(z.sla[0]); inst.ui.spZeB = String(z.sla[1]); inst.ui.spZeArr = d.field === "windows" ? z.windows.slice() : d.field === "riderType" ? z.riderType.slice() : [];
      inst.ui.spZeReason = ZONE_REASONS[0]; inst.ui.spZeNote = ""; inst.render();
    },
    "sp-ze-tog"(inst, d) { const a = inst.ui.spZeArr || []; inst.ui.spZeArr = a.includes(d.v) ? a.filter((x) => x !== d.v) : [...a, d.v]; inst.render(); },
    "sp-ze-submit"(inst) {
      const m = inst.ui.modal, z = find(TW.S.zones, m.zoneId), f = m.field; let value = inst.ui.spZeVal;
      if (["fee", "min", "cap"].includes(f)) { value = Number(value); if (!(value >= 0)) return TW.toast("اكتب رقم صحيح", "bad"); }
      if (f === "sla") { const a = Number(inst.ui.spZeA), b = Number(inst.ui.spZeB); if (!(a > 0 && b > a)) return TW.toast("الحد الأدنى للوعد لازم يكون أقل من الأقصى", "bad"); if (z.type !== "core" && a < 20) return TW.toast("مينفعش نوعد بأقل من 20 دقيقة خارج قلب المدينة — الوعد لازم يكون واقعي", "bad"); value = [a, b]; }
      if (f === "windows") { value = (inst.ui.spZeArr || []).slice().sort((x, y) => parseInt(x) - parseInt(y)); if (z.route === "scheduled" && !value.length) return TW.toast("منطقة مجدولة لازم يبقى لها نافذة واحدة على الأقل", "bad"); }
      if (f === "riderType") { value = (inst.ui.spZeArr || []).slice(); if (!value.length) return TW.toast("اختار نوع مركبة واحد على الأقل", "bad"); }
      if (f === "route" && value === "scheduled" && !z.windows.length) return TW.toast("حدد نوافذ مجدولة الأول قبل تحويل المنطقة لرحلات", "bad");
      if (f === "active") value = value === "true";
      const note = (inst.ui.spZeNote || "").trim();
      const r = inst.act("zone.update", { zoneId: z.id, field: f, value, reason: `${inst.ui.spZeReason}${note ? " — " + note : ""}` });
      if (r && r.ok !== false) { inst.ui.modal = null; TW.toast(`اتعدّل «${ZF[f]}» في ${z.ar} واتسجّل في التدقيق`, "ok"); inst.render(); }
    },
  },
});
A.modals["sp-zone-edit"] = (inst, m) => {
  const z = find(TW.S.zones, m.zoneId), f = m.field, e = zoneEcon(z), arr = inst.ui.spZeArr || [];
  let input = "";
  if (["fee", "min", "cap"].includes(f)) input = `<label class="field"><span>${ZF[f]} — الحالي ${esc(zVal(z, f))}</span><input class="input" type="number" min="0" data-model="spZeVal" data-live value="${esc(inst.ui.spZeVal)}"></label>`;
  if (f === "sla") input = `<div class="grid g2"><label class="field"><span>من (دقيقة)</span><input class="input" type="number" min="5" data-model="spZeA" data-live value="${esc(inst.ui.spZeA)}"></label><label class="field"><span>إلى (دقيقة)</span><input class="input" type="number" min="10" data-model="spZeB" data-live value="${esc(inst.ui.spZeB)}"></label></div>`;
  if (f === "hours") input = `<label class="field"><span>ساعات العمل</span><select class="input" data-model="spZeVal">${HOURS.map((h) => `<option ${inst.ui.spZeVal === h ? "selected" : ""}>${esc(h)}</option>`).join("")}</select></label>`;
  if (f === "route") input = `<label class="field"><span>استراتيجية التوزيع</span><select class="input" data-model="spZeVal">${Object.entries(ROUTE_AR).map(([k, l]) => `<option value="${k}" ${inst.ui.spZeVal === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>`;
  if (f === "active") input = `<label class="field"><span>الحالة</span><select class="input" data-model="spZeVal"><option value="true" ${inst.ui.spZeVal === "true" ? "selected" : ""}>مفعّلة</option><option value="false" ${inst.ui.spZeVal === "false" ? "selected" : ""}>غير مفعّلة</option></select></label>${inst.ui.spZeVal === "false" && z.active ? `<div class="banner warn">${ic("alert", "ic sm")}<div>إيقاف المنطقة بيخفي الهب والتجار عن عملائها فوراً — الطلبات الحالية بتكمّل.</div></div>` : ""}`;
  if (f === "hub") input = `<label class="field"><span>الهب المغذّي</span><select class="input" data-model="spZeVal">${TW.S.hubs.map((h) => `<option value="${h.id}" ${inst.ui.spZeVal === h.id ? "selected" : ""} ${h.active ? "" : "disabled"}>${esc(h.ar)}${h.active ? "" : " — غير مفعّل"}</option>`).join("")}</select></label>`;
  if (f === "windows") input = `<div class="lbl">النوافذ (قائمة محكومة)</div><div class="sp-opts">${WINDOWS.map((w) => `<button type="button" class="sp-opt ${arr.includes(w) ? "on" : ""}" data-act="sp-ze-tog" data-v="${esc(w)}" aria-pressed="${arr.includes(w)}">${arr.includes(w) ? ic("check", "ic xs") : ""}<span class="mono">${esc(w)}</span></button>`).join("")}</div>`;
  if (f === "riderType") input = `<div class="lbl">أنواع المركبات المسموحة</div><div class="sp-opts">${Object.entries(D.vehicles).map(([k, l]) => `<button type="button" class="sp-opt ${arr.includes(k) ? "on" : ""}" data-act="sp-ze-tog" data-v="${k}" aria-pressed="${arr.includes(k)}">${arr.includes(k) ? ic("check", "ic xs") : ""}${esc(l)}</button>`).join("")}</div>${arr.includes("bicycle") && z.type !== "core" ? `<div class="banner warn">${ic("alert", "ic sm")}<div>العجلة مش مناسبة لقرى بعيدة (مسافة ومجمدات).</div></div>` : ""}`;
  let impact = "";
  if (f === "fee" && e) { const d = Number(inst.ui.spZeVal) - z.fee; impact = `الأثر المتوقع: ${d >= 0 ? "+" : ""}${money(d * e.orders)} مساهمة/يوم (قبل أثر الطلب) · المساهمة/طلب تبقى ${money(e.cm + d, 1)}.`; }
  if (f === "min" && e) impact = `رفع الحد الأدنى بيرفع متوسط السلة وبيقلل الطلبات الصغيرة الخسرانة — المساهمة الحالية ${money(e.cm, 1)}/طلب.`;
  if (f === "sla") impact = "الوعد بيظهر للعميل في التطبيق فوراً — لازم يبقى واقعي حسب المسافة والمركبات.";
  return TW.modalWrap(`تعديل ${ZF[f]} — ${esc(z.ar)}`, `${input}${impact ? `<div class="banner">${ic("info", "ic sm")}<div>${impact}</div></div>` : ""}
    <label class="field"><span>السبب (قائمة محكومة)</span><select class="input" data-model="spZeReason">${ZONE_REASONS.map((r) => `<option ${inst.ui.spZeReason === r ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label>
    <label class="field"><span>ملاحظة (اختياري)</span><input class="input" data-model="spZeNote" value="${esc(inst.ui.spZeNote || "")}"></label>
    <p class="muted" style="font-size:12px">${ic("book", "ic xs")} القيمة الحالية «${esc(zVal(z, f))}» — التعديل هيتسجل باسم ${esc(TW.actor.admin().name)}.</p>`,
    `<button class="btn primary" data-act="sp-ze-submit">${ic("check", "ic sm")}احفظ التعديل</button><button class="btn" data-act="modal-close">إلغاء</button>`);
};
/* ===================================================================== DISPATCH QUEUE ===================== */
const OPEN_T = ["WAITING", "OFFERED", "NO_RIDER", "ASSIGNED", "AT_PICKUP"];
const RESP = { accept: ["قبل", "ok"], reject: ["رفض", "warn"], timeout: ["لم يرد", "bad"] };
function taskRisk(t) { const o = orderOf(t.orderId); if (t.status === "NO_RIDER") return ["لا يوجد مندوب", "bad"]; if (!o || o.mode === "scheduled" || t.window) return null; const left = o.etaAt - now(); if (left < 0) return ["متأخر عن الوعد", "bad"]; if (left < 10 * MIN) return ["معرض للتأخير", "warn"]; if (t.status === "ASSIGNED" && t.pickupBy && now() > t.pickupBy) return ["استلام متأخر", "warn"]; return null; }
function consolidation(ts) {
  const out = [], free = ts.filter((t) => ["WAITING", "OFFERED", "NO_RIDER"].includes(t.status));
  for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
    const a = free[i], b = free[j], pa = a.pickups[0], pb = b.pickups[0];
    const pick = TW.distKm(pa, pb), drop = TW.distKm(a.drop, b.drop);
    if (pick > 1 || drop > 1.6) continue;
    if ((a.handling.includes("hot") && b.handling.includes("frozen")) || (b.handling.includes("hot") && a.handling.includes("frozen"))) continue;
    const combined = pick + TW.distKm(pb, a.drop) + drop, saved = a.km + b.km - combined;
    if (saved > 0.3) out.push({ a, b, saved, cod: a.cod + b.cod });
  }
  return out.sort((x, y) => y.saved - x.saved).slice(0, 5);
}
TW.page("dispatch-queue", {
  render(inst) {
    const S = TW.S, f = ui(inst, "spDqF", "all");
    const all = S.tasks.filter((t) => { const o = orderOf(t.orderId); return OPEN_T.includes(t.status) && o && o.status !== "CANCELLED" && !o.hold; });
    const unassigned = all.filter((t) => ["WAITING", "OFFERED", "NO_RIDER"].includes(t.status)), risky = all.filter((t) => taskRisk(t));
    const list = (f === "un" ? unassigned : f === "as" ? all.filter((t) => ["ASSIGNED", "AT_PICKUP"].includes(t.status)) : f === "risk" ? risky : all).sort((a, b) => ((b.status === "NO_RIDER") - (a.status === "NO_RIDER")) || (!!taskRisk(b) - !!taskRisk(a)) || a.createdAt - b.createdAt);
    const sel = ui(inst, "spDq", "") && find(S.tasks, inst.ui.spDq);
    const freeRiders = S.riders.filter((r) => r.status !== "offline" && !r.suspended && !r.task);
    const sched = S.tasks.filter((t) => t.status === "SCHEDULED").length;
    const cols = [
      { k: "id", label: "المهمة", render: (t) => `<b class="mono">${esc(t.id)}</b><span class="sub">من <span class="timer" data-since="${t.createdAt}"></span></span>` },
      { k: "o", label: "الطلب", render: (t) => `${A.orderLink(t.orderId)}<span class="sub">${esc(A.zone(t.drop.zoneId))} · ${num(t.km, 1)} كم</span>` },
      { k: "p", label: "الاستلام والجاهزية", render: (t) => t.pickups.map((p) => { const fo = find(S.fos, p.foId); return `${esc(p.name)} ${fo ? A.st("fo", fo.status) : ""}`; }).join("<br>") },
      { k: "s", label: "الحالة", render: (t) => `${A.st("task", t.status)}${t.offer ? `<span class="sub">معروض على ${esc(A.rider(t.offer.riderId))} · <span class="timer" data-until="${t.offer.until}" data-soon="15000"></span></span>` : t.riderId ? `<span class="sub">${esc(A.rider(t.riderId))}${t.manual ? " · يدوي" : ""}</span>` : ""}` },
      { k: "h", label: "سجل العروض", render: (t) => (t.offers.length ? t.offers.map((x) => `<span class="sp-offer">${esc(A.rider(x.riderId).split(" ")[0])} ${chip(RESP[x.resp][0], RESP[x.resp][1])} <span class="muted">${x.rt}ث</span></span>`).join("") : `<span class="muted">${t.attempts ? t.attempts + " محاولات" : "لسه"}</span>`) },
      { k: "c", label: "كاش / مناولة", render: (t) => `${t.cod ? money(t.cod) : `<span class="muted">مدفوع</span>`}<div class="row wrap gap4">${t.handling.map(hChip).join("")}</div>` },
      { k: "eta", label: "الوعد", render: (t) => { const o = orderOf(t.orderId); return o.mode === "scheduled" || t.window ? esc(t.window || "مجدول") : `<span class="timer" data-until="${o.etaAt}" data-soon="600000"></span>`; } },
      { k: "r", label: "الخطر", render: (t) => { const r = taskRisk(t); return r ? chip(r[0], r[1], "alert") : chip("في الموعد", "ok"); } },
      { k: "a", label: "", render: (t) => `<div class="row gap4">${TW.btn("الأهلية", "ui", { cls: `sm ${sel && sel.id === t.id ? "primary" : ""}`, data: { k: "spDq", v: t.id } })}${A.permBtn("dispatch.assign", "إسناد يدوي", "assign", { cls: "sm", icon: "bike", data: { task: t.id } })}${t.status === "NO_RIDER" ? TW.btn("أعد العرض", "reoffer", { cls: "sm", data: { task: t.id } }) : ""}</div>` },
    ];
    const cons = consolidation(all);
    const elig = sel ? TW.riderCandidates(sel) : [];
    const eligCard = sel ? card(`أهلية المناديب — ${esc(sel.id)}`, "users", `<p class="muted" style="font-size:12px;margin-bottom:6px">المحرك بيرتب: الإتاحة ← المسافة للاستلام ← المركبة المسموحة للمنطقة ← حد الكاش (${sel.cod ? `الطلب ${money(sel.cod)} كاش` : "مدفوع أونلاين"}) ← المناولة${sel.handling.length ? ` (${sel.handling.map((h) => HANDLING[h] ? HANDLING[h][0] : h).join("، ")})` : ""}.</p>${TW.table([{ k: "r", label: "المندوب", render: (c) => `<b>${esc(c.r.ar)}</b><span class="sub">${esc(D.vehicles[c.r.vehicle])} · ${esc(A.zone(c.r.zoneId))}</span>` }, { k: "km", label: "للاستلام", num: true, render: (c) => `${num(c.km, 1)} كم` }, { k: "c", label: "الكاش / الحد", render: (c) => cashCell(c.r) }, { k: "h", label: "عروض سابقة", render: (c) => { const x = sel.offers.filter((y) => y.riderId === c.r.id); return x.length ? x.map((y) => chip(RESP[y.resp][0], RESP[y.resp][1])).join(" ") : "—"; } }, { k: "e", label: "الأهلية", render: (c) => (c.el.ok ? chip("مؤهل", "ok", "check") : c.el.soft ? chip(c.el.why, "warn") : chip(c.el.why, "bad")) }], elig)}<div class="row" style="margin-top:8px">${A.permBtn("dispatch.assign", "إسناد يدوي بسبب", "assign", { cls: "sm primary", icon: "bike", data: { task: sel.id } })}${TW.btn("إغلاق", "ui", { cls: "sm", data: { k: "spDq", v: "null" } })}</div>`) : "";
    return `${A.head("قائمة التوزيع", "الوجه الجدولي لخريطة التوزيع — من اتعرض عليه، رده، وأهلية كل مندوب · أي تدخل يدوي بسبب إلزامي", `<div class="row wrap">${TW.btn("خريطة التوزيع", "go", { cls: "sm", icon: "map", data: { to: "/admin/dispatch" } })}${TW.btn(`رحلات مجدولة (${sched})`, "go", { cls: "sm", icon: "route", data: { to: "/admin/routes" } })}</div>`)}
      <div class="grid g6">${kpi("بانتظار مندوب", num(all.filter((t) => t.status === "WAITING").length), "جاهز أو قرب")}${kpi("معروض الآن", num(all.filter((t) => t.status === "OFFERED").length), `مهلة الرد ${S.rules.riderOfferSec} ث`)}${kpi("لا يوجد مندوب", num(all.filter((t) => t.status === "NO_RIDER").length), "EX-RID-002", { tone: all.some((t) => t.status === "NO_RIDER") ? "bad" : "ok", act: "ui", data: { k: "spDqF", v: "un" } })}${kpi("في الطريق للاستلام", num(all.filter((t) => ["ASSIGNED", "AT_PICKUP"].includes(t.status)).length), "")}${kpi("متأخر / معرض", num(risky.length), "حسب وعد العميل", { tone: risky.length ? "warn" : "ok", act: "ui", data: { k: "spDqF", v: "risk" } })}${kpi("مناديب متاحين", num(freeRiders.length), `${freeRiders.filter((r) => r.cash < r.limit).length} يقدروا ياخدوا كاش`)}</div>
      <div class="filters">${seg("spDqF", [["all", "الكل", all.length], ["un", "بدون مندوب", unassigned.length], ["as", "مُسندة", all.length - unassigned.length], ["risk", "متأخر/معرض", risky.length]], f)}</div>
      <div class="card" style="padding:0">${TW.table(cols, list, { empty: "مفيش مهام مفتوحة", rowCls: (t) => (t.status === "NO_RIDER" ? "sev-critical" : taskRisk(t) ? "sev-high" : sel && sel.id === t.id ? "sev-medium" : "") })}</div>
      ${eligCard}
      <div class="grid g2">${card("اقتراحات الدمج", "route", cons.length ? `<div class="list">${cons.map((c) => `<div class="li"><div class="grow"><b class="mono">${esc(c.a.orderId)} + ${esc(c.b.orderId)}</b><span class="sub muted">${esc(c.a.pickups[0].name)} · ${esc(A.zone(c.a.drop.zoneId))}${c.a.drop.zoneId !== c.b.drop.zoneId ? " / " + esc(A.zone(c.b.drop.zoneId)) : ""} · كاش ${money(c.cod)} (BR-DSP-001)</span></div>${chip(`توفير ${num(c.saved, 1)} كم`, "ok")}${A.permBtn("dispatch.assign", "أسند الأول", "assign", { cls: "sm", data: { task: c.a.id } })}</div>`).join("")}</div><p class="muted" style="font-size:12px;margin-top:6px">نفس نقطة الاستلام (أقل من 1 كم) وتسليم متقارب (أقل من 1.6 كم) ومناولة متوافقة. الإسناد اليدوي لنفس المندوب بيتسجل بالسبب.</p>` : TW.empty("مفيش مهام قابلة للدمج دلوقتي", "الاقتراح بيظهر لما مهمتين بدون مندوب يبقوا من نفس المصدر وتسليمهم قريب", "route"))}
      ${card("مناديب متاحين الآن", "bike", freeRiders.length ? `<div class="list">${freeRiders.map((r) => `<div class="li">${ic(VIC[r.vehicle], "ic sm")}<div class="grow"><button class="btn sm ghost sp-link" data-act="open-rider" data-id="${r.id}"><b>${esc(r.ar)}</b></button><span class="sub muted">${esc(D.vehicles[r.vehicle])} · ${esc(A.zone(r.zoneId))}</span></div>${cashCell(r)}${r.cash >= r.limit ? chip("كاش ممنوع", "bad") : ""}</div>`).join("")}</div>` : TW.empty("كل المناديب مشغولين", "", "bike"))}</div>`;
  },
  on: {},
});

/* ===================================================================== ROUTE PLANNING (scheduled village windows) ===================== */
const CUTOFF_MIN = 30;
function parseWin(w, base = new Date()) { const m = String(w).match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/); if (!m) return null; const s = new Date(base), e = new Date(base); s.setHours(+m[1], +m[2], 0, 0); e.setHours(+m[3], +m[4], 0, 0); return { label: w, s: +s, e: +e }; }
function nextWin(z) { const ws = z.windows.map((w) => parseWin(w)).filter(Boolean).sort((a, b) => a.s - b.s); const t = now(); const n = ws.find((w) => w.e > t); if (n) return n; if (!ws.length) return null; return { ...ws[0], s: ws[0].s + 864e5, e: ws[0].e + 864e5, tomorrow: true }; }
function routeElig(r, z, cod) { if (!z.riderType.includes(r.vehicle)) return `${D.vehicles[r.vehicle]} غير مسموح`; if (r.suspended) return "موقوف"; if (r.status === "offline") return "أوفلاين"; if (r.task) return "في مهمة"; if (cod > 0 && r.cash + cod > r.limit) return `حد الكاش (${money(r.cash)} + ${money(cod)} > ${money(r.limit)})`; return null; }
TW.page("routes", {
  render(inst) {
    const S = TW.S, zs = S.zones.filter((z) => z.route === "scheduled"), act = zs.filter((z) => z.active), off = zs.filter((z) => !z.active);
    const total = S.tasks.filter((t) => t.status === "SCHEDULED");
    const zoneCard = (z) => {
      const ts = S.tasks.filter((t) => t.status === "SCHEDULED" && t.drop.zoneId === z.id).sort((a, b) => a.createdAt - b.createdAt);
      const onRoute = S.tasks.filter((t) => t.route && t.route.zoneId === z.id && !["DELIVERED", "CANCELLED", "RETURNED"].includes(t.status));
      const tn = now(), wins = z.windows.map((w) => parseWin(w)).filter(Boolean).map((w) => ({ ...w, n: ts.filter((x) => x.window === w.label).length, st: w.e < tn ? "passed" : w.s <= tn ? "open" : "up", cut: w.s - CUTOFF_MIN * MIN }));
      const nw = wins.find((w) => w.st !== "passed" && w.n) || nextWin(z), cutoff = nw ? nw.s - CUTOFF_MIN * MIN : null, cod = sum(ts, (t) => t.cod);
      const strip = `<div class="sp-wins">${wins.map((w) => `<span class="sp-win ${w.st} ${nw && w.label === nw.label && !nw.tomorrow ? "tgt" : ""}"><b class="mono">${esc(w.label)}</b><small>${w.st === "passed" ? "فاتت" : w.st === "open" ? "شغالة الآن" : `cut-off ${clock(w.cut)}`} · ${w.n} طلب</small></span>`).join("")}</div>`;
      const ready = ts.filter((t) => t.foIds.every((id) => ["PACKED", "READY"].includes((find(S.fos, id) || {}).status)));
      const cands = S.riders.filter((r) => z.riderType.includes(r.vehicle)).map((r) => ({ r, why: routeElig(r, z, cod), km: TW.distKm(r, find(S.hubs, "h1")) })).sort((a, b) => (!a.why - !b.why) * -1 || (b.r.zoneId === z.id) - (a.r.zoneId === z.id) || a.km - b.km);
      const best = cands.find((c) => !c.why);
      const rid = inst.ui[`spRtR_${z.id}`] || (best ? best.r.id : "");
      const selC = cands.find((c) => c.r.id === rid);
      const byWin = TW.groupBy(ts, (t) => t.window || "—");
      const e = zoneEcon(z);
      const rows = ts.map((t) => { const o = orderOf(t.orderId), pw = parseWin(t.window || ""), missed = pw && pw.e < now(); return `<div class="li"><div class="grow">${A.orderLink(t.orderId)} <b>${esc(t.drop.name)}</b><span class="sub muted">${esc(t.drop.landmark)} · ${num(t.km, 1)} كم · <span class="mono">${esc(t.window || "—")}</span>${missed ? ` ${chip("فاتت النافذة", "bad")}` : ""}</span></div><div class="row wrap gap4">${t.foIds.map((id) => A.st("fo", (find(S.fos, id) || {}).status)).join("")}${t.handling.map(hChip).join("")}</div><span class="num" style="min-width:80px;text-align:left">${t.cod ? money(t.cod) : `<span class="muted">مدفوع</span>`}</span></div>`; }).join("");
      const canGo = ts.length && ready.length === ts.length;
      return `<div class="card sp-route" data-hl="route-${z.id}"><div class="hd"><h3>${ic("route", "ic sm")} رحلة ${esc(z.ar)} <span class="mono muted">${esc(z.cluster)}</span></h3><div class="row wrap">${chip(`${z.windows.length} نوافذ/يوم`, "info")}${e ? chip(`مساهمة ${money(e.cm, 1)}/طلب`, e.loss ? "bad" : "ok") : ""}</div></div>
        <div class="sp-minis">${mini("نافذة الرحلة", nw ? `<span class="mono">${esc(nw.label)}</span>` : "—", nw && nw.tomorrow ? "بكرة" : nw && nw.s <= now() ? "شغالة الآن" : ts.length ? "أقرب نافذة عليها طلبات" : "النافذة الجاية")}${mini("آخر موعد للتحميل (cut-off)", cutoff ? `<span class="timer" data-until="${cutoff}" data-soon="900000"></span>` : "—", `قبل النافذة بـ ${CUTOFF_MIN} د`)}${mini("طلبات على الرحلة", num(ts.length), `${ready.length}/${ts.length} جاهز`, ts.length && ready.length < ts.length ? "warn" : "")}${mini("كاش الرحلة", money(cod), "لازم يدخل في حد المندوب")}${mini("الحمولة", `${num(sum(ts, (t) => t.km), 1)} كم`, `حد أدنى للسلة ${money(z.min)}`)}</div>
        ${strip}${Object.keys(byWin).length > 1 ? `<div class="banner warn" style="margin-top:8px">${ic("alert", "ic sm")}<div>فيه طلبات على أكتر من نافذة (${Object.keys(byWin).map(esc).join("، ")}) — «تحرك الرحلة» بيحمّل كل الطلبات المجدولة للمنطقة.</div></div>` : ""}
        <div class="grid sp-g21" style="margin-top:10px"><div><div class="lbl">الطلبات وجاهزيتها</div>${ts.length ? `<div class="list">${rows}</div>` : `<p class="muted" style="font-size:12.5px;padding:8px 0">مفيش طلبات مجدولة على الرحلة دي لسه.</p>`}
          ${onRoute.length ? `<div class="banner brand" style="margin-top:8px">${ic("truck", "ic sm")}<div>في الطريق الآن: ${onRoute.map((t) => `${esc(t.orderId)} (${TW.stLabel("task", t.status)})`).join("، ")} مع ${esc(A.rider(onRoute[0].riderId))}</div></div>` : ""}
          <div class="lbl" style="margin-top:10px">المندوب المقترح (${z.riderType.map((v) => esc(D.vehicles[v])).join(" / ")})</div>
          <div class="row wrap"><select class="input sp-rsel" data-model="spRtR_${z.id}" aria-label="مندوب الرحلة">${cands.map((c) => `<option value="${c.r.id}" ${c.r.id === rid ? "selected" : ""}>${esc(c.r.ar)} — ${esc(D.vehicles[c.r.vehicle])} · كاش ${num(c.r.cash)}/${num(c.r.limit)}${c.why ? ` · ✗ ${esc(c.why)}` : c === best ? " · الأنسب" : ""}</option>`).join("")}</select>
          ${A.permBtn("dispatch.assign", "تحرك الرحلة", "sp-route-go", { cls: "primary", icon: "truck", data: { zone: z.id } })}</div>
          ${selC && selC.why ? `<div class="banner bad" style="margin-top:6px">${ic("alert", "ic sm")}<div>${esc(selC.r.ar)} غير مؤهل: ${esc(selC.why)}</div></div>` : !canGo && ts.length ? `<div class="banner warn" style="margin-top:6px">${ic("clock", "ic sm")}<div>${ts.length - ready.length} طلب لسه مش جاهز في الهب/عند التاجر — الرحلة مش هتتحرك قبل ما الكل يتغلف.</div></div>` : ""}</div>
          <div>${A.map({ tasks: [...ts, ...onRoute], selZone: z.id, merchants: false, labels: true })}</div></div></div>`;
    };
    return `${A.head("تخطيط الرحلات", "نوافذ القرى المجدولة: تجميع الطلبات، الجاهزية، الكاش، المندوب المناسب، و cut-off قبل كل نافذة (BR-DSP-003)", TW.btn("مناطق الخدمة", "go", { cls: "sm", icon: "pin", data: { to: "/admin/zones" } }))}
      <div class="grid g4">${kpi("طلبات مجدولة", num(total.length), "على كل الرحلات")}${kpi("كاش الرحلات", money(sum(total, (t) => t.cod)), "COD هيتحصل")}${kpi("رحلات في الطريق", num(S.riders.filter((r) => r.route && r.task).length), "مندوب على رحلة")}${kpi("مناطق مجدولة مفعّلة", `${act.length}/${zs.length}`, off.map((z) => z.ar).join("، ") + (off.length ? " غير مفعّلة" : ""))}</div>
      ${act.map(zoneCard).join("")}
      ${off.length ? card("مناطق مجدولة غير مفعّلة", "lock", `<div class="list">${off.map((z) => `<div class="li"><span class="grow"><b>${esc(z.ar)}</b><span class="sub muted">نوافذ مخططة: ${z.windows.map(esc).join("، ")} · رسوم ${money(z.fee)} · حد أدنى ${money(z.min)}</span></span>${TW.btn("ملف التوسع", "go", { cls: "sm", data: { to: "/admin/expansion" } })}</div>`).join("")}</div>`) : ""}`;
  },
  on: {
    "sp-route-go"(inst, d) {
      const S = TW.S, z = find(S.zones, d.zone), ts = S.tasks.filter((t) => t.status === "SCHEDULED" && t.drop.zoneId === z.id);
      if (!ts.length) return TW.toast("مفيش طلبات على الرحلة دي", "bad");
      const notReady = ts.filter((t) => !t.foIds.every((id) => ["PACKED", "READY"].includes((find(S.fos, id) || {}).status)));
      if (notReady.length) return TW.toast(`${notReady.length} طلب لسه مش جاهز — مينفعش الرحلة تتحرك`, "bad");
      const cod = sum(ts, (t) => t.cod);
      let rid = inst.ui[`spRtR_${z.id}`];
      if (!rid) { const c = S.riders.filter((r) => !routeElig(r, z, cod)).sort((a, b) => (b.zoneId === z.id) - (a.zoneId === z.id))[0]; rid = c && c.id; }
      const r = rid && find(S.riders, rid); if (!r) return TW.toast("مفيش مندوب مؤهل للرحلة", "bad");
      const why = routeElig(r, z, cod); if (why) return TW.toast(`${r.ar} غير مؤهل: ${why}`, "bad");
      const nw = nextWin(z);
      A.ask(inst, { title: `تحرك رحلة ${z.ar} مع ${r.ar}`, action: "route.depart", payload: { zoneId: z.id, riderId: r.id }, reasons: ["موعد الرحلة", "اكتمال الحمولة قبل الموعد", "طلب عاجل على الرحلة", "قرار تشغيلي"], confirm: "تحرك الرحلة", done: `الرحلة اتحركت مع ${r.ar}`, note: `${ts.length} طلبات · كاش ${money(cod)} (المندوب هيبقى معاه ${money(r.cash + cod)} من حد ${money(r.limit)}) · ${D.vehicles[r.vehicle]} · النافذة ${nw ? esc(nw.label) : "—"}. الطلبات هتتحمّل بالترتيب وكل تسليم بـ OTP.` });
    },
  },
});
})();
