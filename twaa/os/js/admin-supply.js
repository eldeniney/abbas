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
const gbtn = (ok, why, label, act, opts = {}) => (ok ? TW.btn(label, act, opts) : `<button type="button" class="btn ${opts.cls || ""}" disabled title="${esc(why)}">${ic("lock", "ic sm")}<span>${esc(label)}</span></button>`);
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
      { k: "s", label: "الصنف", render: (r) => `<b>${esc(r.s.ar)}</b> <span class="muted">${esc(r.s.size)}</span><span class="sub"><span class="mono">${esc(r.id)}</span> · ${esc(deptAr(r.s.dept))}</span>` },
      { k: "bin", label: "الرف", render: (r) => `<span class="mono sp-binx">${esc(r.x.bin)}</span>` },
      { k: "onHand", label: "فعلي", num: true, render: (r) => num(r.x.onHand) },
      { k: "res", label: "محجوز", num: true, render: (r) => (r.x.reserved ? `<span style="color:var(--info)">${num(r.x.reserved)}</span>` : "0") },
      { k: "av", label: "متاح", num: true, render: (r) => `<b style="color:${r.a <= r.x.reorderPt ? "var(--bad)" : "var(--ink)"}">${num(r.a)}</b>` },
      { k: "inc", label: "وارد", num: true, render: (r) => num(r.x.incoming) },
      { k: "dmg", label: "تالف", num: true, render: (r) => (r.x.damaged ? `<span style="color:var(--bad)">${r.x.damaged}</span>` : "0") },
      { k: "expd", label: "منتهي", num: true, render: (r) => (r.x.expired ? `<span style="color:var(--bad)">${r.x.expired}</span>` : "0") },
      { k: "q", label: "حجر", num: true, render: (r) => num(r.x.quarantine) },
      { k: "rp", label: "نقطة الطلب", num: true, render: (r) => num(r.x.reorderPt) },
      { k: "cov", label: "تغطية (يوم)", num: true, render: (r) => `<b style="color:${r.c < 1 ? "var(--bad)" : r.c < 3 ? "var(--warn)" : "var(--ink)"}">${dcov(r.c)}</b><span class="sub">${num(r.x.velocity, 1)}/يوم</span>` },
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
      { k: "d", label: "الفروقات والمطالبة", render: (p) => { const c = sum(p.lines, ([id, q, cost], i) => Math.max(0, q - (((p.receivedLines || [])[i] || [id, q])[1])) * cost); return p.discrepancy ? `${chip(p.discrepancy, "bad")}<span class="sub">مطالبة ${money(c, 2)}</span>` : chip("مطابق", "ok"); } },
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
/* @@PART3@@ */
})();
