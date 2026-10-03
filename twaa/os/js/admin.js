/* Twaa Control Center — shell, navigation, role-based access, shared drawers & dialogs.
   Pages live in admin-*.js and register with TW.page(path, def):
     TW.page("control-tower", { title, sub, roles:[...]|null, render(inst, params) → HTML, on:{ act(inst, data, el, ev) } })
   Route "/admin/order/TW-1043" → page "order" with params ["TW-1043"]. Exec overview is page "" (path "/admin").
   Shared helpers on TW.A: openOrder(inst,id) · reason dialog · entity drawers · page header · answer strip. */
(function () {
const TW = window.TW, D = TW.D;
const { ic, esc, money, num, pct, chip, sev, ago, clock, table } = TW;
const A = (TW.A = {});
TW.adminPages = {};
TW.page = (path, def) => { TW.adminPages[path] = def; };

/* ---------------- navigation (exact structure from the brief) ---------------- */
const ALL = null;
const R = { exec: ["founder", "gm", "ops", "finance", "analyst", "marketing", "category"], ops: ["founder", "gm", "ops", "dispatcher", "hub", "support", "supsup", "merchops", "analyst"], fin: ["founder", "gm", "finance", "analyst"], care: ["founder", "gm", "ops", "support", "supsup", "finance"], growth: ["founder", "gm", "marketing", "sales", "merchops", "analyst", "category"], supply: ["founder", "gm", "ops", "hub", "picker", "procurement", "category", "finance", "analyst"], gov: ["founder", "gm"], intel: ["founder", "gm", "analyst", "finance", "marketing", "category", "ops", "merchops"] };
A.NAV = [
  ["Command", "القيادة", [["", "نظرة الشركاء", "Executive Overview", "chart", R.exec], ["live", "العمليات المباشرة", "Live Operations", "zap", R.ops], ["control-tower", "برج التحكم", "Control Tower", "alert", ALL], ["dispatch", "خريطة التوزيع", "Dispatch Map", "map", R.ops]]],
  ["Commerce", "التجارة", [["orders", "الطلبات", "Orders", "receipt", ALL], ["customers", "العملاء", "Customers", "users", R.care.concat(["marketing", "analyst"])], ["merchants", "التجار", "Merchants", "store", ["founder", "gm", "ops", "merchops", "sales", "category", "finance", "analyst", "support", "supsup"]], ["catalog", "الكتالوج", "Catalogue", "box", ["founder", "gm", "category", "merchops", "procurement", "analyst"]], ["categories", "الأقسام", "Categories", "grid", ["founder", "gm", "category", "analyst", "procurement"]], ["pricing", "التسعير", "Pricing", "tag", ["founder", "gm", "category", "finance", "analyst"]], ["promotions", "العروض", "Promotions", "percent", ["founder", "gm", "marketing", "category", "finance", "analyst"]], ["crm", "CRM", "CRM", "target", ["founder", "gm", "marketing", "analyst"]]]],
  ["Supply", "الإمداد", [["hub", "الهب", "Hub", "building", R.supply], ["inventory", "المخزون", "Inventory", "layers", R.supply], ["purchasing", "المشتريات", "Purchasing", "cart", R.supply], ["receiving", "الاستلام", "Receiving", "inbox", R.supply], ["picking", "التجميع والتغليف", "Picking & Packing", "scan", R.supply], ["returns", "المرتجعات", "Returns", "undo", R.supply]]],
  ["Delivery", "التوصيل", [["riders", "المناديب", "Riders", "bike", R.ops], ["fleet", "الأسطول", "Fleet", "car", R.ops], ["zones", "مناطق الخدمة", "Zones", "pin", R.ops.concat(["sales"])], ["dispatch-queue", "قائمة التوزيع", "Dispatch", "list", R.ops], ["routes", "تخطيط الرحلات", "Route Planning", "route", R.ops]]],
  ["Finance", "المالية", [["payments", "المدفوعات", "Payments", "card", R.fin], ["cod", "الكاش (COD)", "COD", "cash", R.fin.concat(["ops"])], ["refunds", "الاستردادات", "Refunds", "undo", R.fin.concat(["supsup", "support"])], ["merchant-settlements", "تسويات التجار", "Merchant Settlements", "store", R.fin.concat(["merchops"])], ["rider-settlements", "تسويات المناديب", "Rider Settlements", "bike", R.fin.concat(["ops"])], ["reconciliation", "المطابقة اليومية", "Reconciliation", "scale", R.fin], ["profitability", "الربحية", "Profitability", "trend", R.fin.concat(["category", "marketing"])]]],
  ["Customer Care", "خدمة العملاء", [["cases", "حالات الدعم", "Support Cases", "inbox", R.care], ["complaints", "الشكاوى", "Complaints", "flag", R.care], ["compensation", "التعويضات", "Compensation", "gift", R.care], ["queue", "طابور الاتصالات والواتساب", "Call/WhatsApp Queue", "phone", R.care]]],
  ["Growth", "النمو", [["campaigns", "الحملات", "Campaigns", "sparkle", R.growth], ["segments", "الشرائح", "Segments", "users", R.growth], ["offers", "العروض والكوبونات", "Offers", "tag", R.growth], ["referral", "الإحالة", "Referral", "share", R.growth], ["acquisition", "استقطاب التجار", "Merchant Acquisition", "store", R.growth], ["expansion", "التوسع الجغرافي", "Location Expansion", "map", R.growth.concat(["ops"])]]],
  ["Intelligence", "الذكاء", [["analytics", "تحليلات الأعمال", "Business Analytics", "chart", R.intel], ["unit-economics", "اقتصاديات الوحدة", "Unit Economics", "scale", R.intel], ["demand", "ذكاء الطلب", "Demand Intelligence", "search", R.intel.concat(["procurement"])], ["merchant-performance", "أداء التجار", "Merchant Performance", "store", R.intel], ["rider-performance", "أداء المناديب", "Rider Performance", "bike", R.intel], ["cohorts", "مجموعات العملاء", "Customer Cohorts", "users", R.intel], ["heatmaps", "الخرائط الحرارية", "Heatmaps", "fire", R.intel]]],
  ["Governance", "الحوكمة", [["users", "المستخدمون والصلاحيات", "Users & Roles", "key", R.gov], ["approvals", "مركز الموافقات", "Approval Center", "check", ALL], ["audit", "سجل التدقيق", "Audit Log", "book", ["founder", "gm", "finance", "ops", "analyst"]], ["rules", "قواعد العمل", "Business Rules", "settings", R.gov.concat(["ops", "finance"])], ["sla", "اتفاقيات مستوى الخدمة", "SLA", "clock", R.gov.concat(["ops", "supsup"])], ["config", "الإعدادات", "Configuration", "settings", R.gov]]],
];
const pageMeta = {}; A.NAV.forEach(([g, gar, items]) => items.forEach(([p, ar, en, icn, roles]) => (pageMeta[p] = { ar, en, icn, roles, group: gar })));
const DETAIL_PARENT = { order: "orders", customer: "customers", merchant: "merchants", rider: "riders", case: "cases", sku: "catalog" };
A.canView = (p, role = TW.roleOf().id) => { const m = pageMeta[DETAIL_PARENT[p] || p]; return !m || !m.roles || m.roles.includes(role); };

function badges() {
  const S = TW.S, al = TW.alerts();
  return { "control-tower": [al.length, al.some((a) => a.sev === "critical")], approvals: [S.approvals.filter((a) => a.status === "PENDING").length, true], cases: [S.cases.filter((c) => c.status !== "RESOLVED").length, false], catalog: [S.catReqs.filter((c) => c.status === "PENDING").length, false], cod: [S.cod.filter((c) => c.variance && !c.varianceResolved).length + S.deposits.filter((d) => d.status === "PENDING_VERIFY").length, true], payments: [S.payments.filter((p) => p.status === "PENDING").length, true], returns: [S.returns.filter((r) => ["INSPECTION", "IN_TRANSIT"].includes(r.status)).length, false], picking: [S.fos.filter((f) => f.sourceType === "hub" && ["QUEUED", "PICKING"].includes(f.status)).length, false], routes: [S.tasks.filter((t) => t.status === "SCHEDULED").length, false], refunds: [S.refunds.filter((r) => ["PENDING_APPROVAL", "REQUESTED", "SUBMITTED"].includes(r.status)).length, false] };
}

/* ---------------- app ---------------- */
TW.apps.admin = {
  kind: "desk", actorKind: "admin", title: "Twaa Control Center",
  handler(inst, act) { const pg = TW.adminPages[pageKey(inst)]; return (pg && pg.on && pg.on[act]) || A.on[act]; },
  render(inst) {
    const key = pageKey(inst), params = inst.route.slice(1);
    const pg = TW.adminPages[key];
    const role = TW.roleOf();
    let body;
    if (!pg) body = `<div class="card">${TW.empty("الصفحة دي لسه بتتبني", key, "settings")}</div>`;
    else if (!A.canView(key, role.id)) body = `<div class="card">${TW.empty(`الصفحة مش متاحة لدور «${role.ar}»`, "الصلاحيات بتتبع مبدأ أقل صلاحية لازمة. غيّر الدور من أعلى الصفحة لتجربة دور آخر.", "lock")}</div>`;
    else { try { body = pg.render(inst, params); } catch (e) { console.error(e); body = `<div class="card"><b>خطأ في عرض الصفحة</b><p class="mono muted">${esc(e.message)}</p></div>`; } }
    const overlays = A.overlays(inst);
    if (inst.compact) return `<div class="col gap12">${body}</div>${overlays}`;
    const b = badges();
    const side = A.NAV.map(([g, gar, items]) => `<div class="grp"><b>${esc(gar)} · ${g}</b>${items.map(([p, ar, en, icn, roles]) => { const ok = A.canView(p, role.id); const [n, hot] = b[p] || [0]; return `<button class="${key === p || DETAIL_PARENT[key] === p ? "on" : ""}" ${ok ? `data-act="go" data-to="/admin${p ? "/" + p : ""}"` : `disabled title="غير متاح لدور ${esc(role.ar)}"`}>${ic(ok ? icn : "lock", "ic sm")}<span>${esc(ar)}</span>${n ? `<span class="cnt ${hot ? "" : "n"}">${n}</span>` : ""}</button>`; }).join("")}</div>`).join("");
    return `<div class="cc"><nav class="cc-side" aria-label="أقسام الكنترول">${A.roleBox()}${side}</nav><main class="cc-main">${body}</main></div>${overlays}`;
  },
};
function pageKey(inst) { return inst.route[0] || ""; }
A.roleBox = () => { const u = TW.actor.admin(); return `<div class="card flat" style="padding:10px;margin:0 2px"><div class="lbl">الدور الحالي (للتجربة)</div><select class="input" style="min-height:34px;margin-top:4px" data-change="switch-user" aria-label="تبديل المستخدم">${TW.S.users.map((x) => `<option value="${x.id}" ${x.id === u.id ? "selected" : ""}>${esc(x.ar)} — ${esc(D.roles.find((r) => r.id === x.role).ar)}</option>`).join("")}</select></div>`; };

/* page header: title + the questions every admin screen must answer */
A.head = (title, sub, tools = "") => (!title ? "" : `<div class="cc-top"><h1>${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ""}</h1>${tools}</div>`);
A.answer = (o) => `<div class="answer">${[["ماذا يحدث؟", o.what], ["ما يحتاج انتباه؟", o.attention], ["من المسؤول؟", o.owner], ["ما المعرّض للخطر؟", o.risk]].map(([q, a]) => `<div class="card flat" style="padding:8px 10px"><div class="lbl">${q}</div><div style="font-weight:700">${a || "—"}</div></div>`).join("")}</div>`;
A.locked = (perm) => `<span class="lock">${ic("lock", "ic xs")}يحتاج صلاحية «${esc(D.perms[perm])}»</span>`;
A.permBtn = (perm, label, act, opts = {}) => (TW.can(perm) ? TW.btn(label, act, opts) : `<button class="btn ${opts.cls || ""}" disabled title="يحتاج صلاحية ${esc(D.perms[perm])}">${ic("lock", "ic sm")}<span>${esc(label)}</span></button>`);
A.orderLink = (id) => (id ? `<button class="btn sm ghost mono" data-act="open-order" data-id="${esc(id)}" style="padding:0 6px">${esc(id)}</button>` : "—");
A.st = (kind, s) => TW.stChip(kind, s);
A.zone = (id) => (TW.S.zones.find((z) => z.id === id) || {}).ar || id;
A.merchant = (id) => (TW.S.merchants.find((m) => m.id === id) || {}).ar || id;
A.rider = (id) => (TW.S.riders.find((r) => r.id === id) || {}).ar || "—";
A.customer = (id) => (TW.S.customers.find((c) => c.id === id) || {}).ar || id;
A.sku = (id) => (TW.S.skus.find((s) => s.id === id) || {}).ar || id;

/* ---------------- overlays: drawers + modals registry ---------------- */
A.drawers = {};
A.modals = {};
A.overlays = (inst) => {
  let h = "";
  const d = inst.ui.drawer; if (d && A.drawers[d.kind]) { try { h += A.drawers[d.kind](inst, d); } catch (e) { console.error(e); } }
  const m = inst.ui.modal; if (m && A.modals[m.kind]) { try { h += A.modals[m.kind](inst, m); } catch (e) { console.error(e); } }
  return h;
};
A.openOrder = (inst, id) => { inst.ui.drawer = { kind: "order", id, tab: "overview" }; inst.render(); };

/* generic reason dialog: any material action asks for a controlled reason (+ optional note) before running.
   open with: A.ask(inst, { title, action, payload, reasons:[...], field:"reason", extra:[{k,label,type,options,value}], confirm, danger, note }) */
A.ask = (inst, cfg) => { inst.ui.modal = { kind: "ask", ...cfg }; inst.ui.askReason = (cfg.reasons || [])[0] || ""; inst.ui.askNote = ""; (cfg.extra || []).forEach((f) => (inst.ui[`ask_${f.k}`] = f.value != null ? String(f.value) : "")); inst.render(); };
A.modals.ask = (inst, m) => {
  const reasons = m.reasons || [];
  const extra = (m.extra || []).map((f) => `<label class="field"><span>${esc(f.label)}</span>${f.type === "select" ? `<select class="input" data-model="ask_${f.k}">${f.options.map(([v, l]) => `<option value="${esc(v)}" ${String(inst.ui[`ask_${f.k}`]) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>` : `<input class="input" type="${f.type || "text"}" data-model="ask_${f.k}" value="${esc(inst.ui[`ask_${f.k}`] || "")}">`}</label>`).join("");
  return TW.modalWrap(esc(m.title), `${m.note ? `<div class="banner ${m.danger ? "warn" : ""}">${ic(m.danger ? "alert" : "info", "ic sm")}<div>${m.note}</div></div>` : ""}${extra}
    ${reasons.length ? `<label class="field"><span>السبب (قائمة محكومة)</span><select class="input" data-model="askReason">${reasons.map((r) => `<option ${inst.ui.askReason === r ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label>` : ""}
    <label class="field"><span>${reasons.length ? "ملاحظة إضافية (اختياري)" : "السبب (إلزامي)"}</span><textarea class="input" data-model="askNote" placeholder="اكتب السياق اللي هيظهر في سجل التدقيق">${esc(inst.ui.askNote || "")}</textarea></label>
    <p class="muted" style="font-size:12px">${ic("book", "ic xs")} الإجراء ده هيتسجل في سجل التدقيق باسم ${esc(TW.actor.admin().name)} (${esc(TW.roleOf().ar)}).</p>`,
    `<button class="btn ${m.danger ? "danger" : "primary"}" data-act="ask-submit">${esc(m.confirm || "تأكيد")}</button><button class="btn" data-act="modal-close">إلغاء</button>`);
};
A.on = {
  "switch-user"(inst, d, el) { TW.act("session.set", { key: "admin", value: el.value }); TW.toast(`بقيت داخل بصفة ${TW.roleOf().ar}`); },
  "open-order"(inst, d) { A.openOrder(inst, d.id); },
  "open-customer"(inst, d) { inst.go(`/admin/customer/${d.id}`); },
  "open-merchant"(inst, d) { inst.go(`/admin/merchant/${d.id}`); },
  "open-rider"(inst, d) { inst.go(`/admin/rider/${d.id}`); },
  "drawer-tab"(inst, d) { inst.ui.drawer.tab = d.tab; inst.render(); },
  "ask-submit"(inst) {
    const m = inst.ui.modal; const note = (inst.ui.askNote || "").trim(); const r = m.reasons && m.reasons.length ? `${inst.ui.askReason}${note ? " — " + note : ""}` : note;
    if (!r) return TW.toast("السبب إلزامي", "bad");
    const payload = { ...(m.payload || {}), [m.field || "reason"]: r };
    (m.extra || []).forEach((f) => (payload[f.k] = inst.ui[`ask_${f.k}`]));
    const res = inst.act(m.action, payload);
    if (res && res.ok !== false) { inst.ui.modal = null; TW.toast(res.pending ? "اتبعت للموافقة — تابعها في مركز الموافقات" : m.done || "اتنفّذ واتسجّل في التدقيق", "ok"); inst.render(); }
  },
  approve(inst, d) { const r = inst.act("approval.decide", { approvalId: d.id, decision: "approve" }); if (r.ok !== false) TW.toast("اتعتمد", "ok"); },
  reject(inst, d) { A.ask(inst, { title: "رفض الطلب", action: "approval.decide", payload: { approvalId: d.id, decision: "reject" }, field: "note", reasons: ["الأدلة غير كافية", "يتجاوز السياسة", "المبلغ غير مبرر", "مطلوب مراجعة إضافية"], confirm: "ارفض", danger: true }); },
  "cancel-order"(inst, d) { A.ask(inst, { title: `إلغاء الطلب ${d.id}`, action: "order.cancel", payload: { orderId: d.id }, reasons: TW.REASONS.cancel, confirm: "ألغِ الطلب", danger: true, note: "الإلغاء بيحرّر حجز المخزون، يلغي مهام التوصيل، ويرجّع أي مبلغ مدفوع أونلاين تلقائياً." }); },
  "assign"(inst, d) { inst.ui.modal = { kind: "assign", taskId: d.task }; inst.ui.assignRider = ""; inst.ui.askNote = ""; inst.render(); },
  "assign-pick"(inst, d) { inst.ui.assignRider = d.rider; inst.render(); },
  "assign-submit"(inst) { const m = inst.ui.modal; if (!inst.ui.assignRider) return TW.toast("اختار مندوب", "bad"); const reason = (inst.ui.askNote || "").trim(); const r = inst.act("dispatch.assign", { taskId: m.taskId, riderId: inst.ui.assignRider, reason }); if (r.ok !== false) { inst.ui.modal = null; TW.toast("اتسند يدوياً واتسجّل السبب", "ok"); inst.render(); } },
  "reoffer"(inst, d) { inst.act("dispatch.reoffer", { taskId: d.task }); TW.toast("رجعت للعرض التلقائي"); },
  "reroute"(inst, d) { const f = TW.S.fos.find((x) => x.id === d.fo); const o = TW.S.orders.find((x) => x.id === f.orderId); const ls = o.lines.filter((l) => l.foId === f.id); const alts = TW.S.merchants.filter((m) => m.id !== f.sourceId && m.status === "active" && m.mode !== "closed" && TW.merchantServes(m, o.zoneId) && ls.every((l) => l.kind === "sku" && (TW.S.msku[m.id] || {})[l.skuId] && TW.S.msku[m.id][l.skuId].available)); if (!alts.length) return TW.toast("مفيش تاجر بديل عنده كل الأصناف — جرّب إلغاء المكوّن", "bad"); A.ask(inst, { title: `إعادة توجيه ${f.name}`, action: "fo.reroute", payload: { foId: f.id }, extra: [{ k: "toMerchantId", label: "التاجر البديل (عنده كل الأصناف ويخدم المنطقة)", type: "select", options: alts.map((m) => [m.id, `${m.ar} — ${D.merchantTypes[m.type]} · قبول ${pct(m.acceptRate)}`]), value: alts[0].id }], reasons: ["التاجر لم يقبل خلال المهلة", "التاجر رفض الطلب", "التاجر مقفول", "تأخر شديد في التجهيز"], confirm: "حوّل الطلب" }); },
  "cancel-fo"(inst, d) { A.ask(inst, { title: "إلغاء مكوّن من الطلب", action: "fo.cancel", payload: { foId: d.fo }, reasons: ["التاجر لم يقبل ولا يوجد بديل", "الأصناف غير متاحة", "طلب العميل"], confirm: "ألغِ المكوّن", danger: true, note: "باقي الطلب هيكمّل. العميل هيتبلغ والمبلغ يتعدّل تلقائياً." }); },
  "call-merchant"(inst, d) { inst.act("fo.callMerchant", { foId: d.fo }); TW.toast("اتسجّلت محاولة الاتصال"); },
  "pay-ok"(inst, d) { inst.act("payment.reconcile", { paymentId: d.id, result: "success" }); TW.toast("اتأكد الخصم من البوابة — الطلب اتحرر", "ok"); },
  "pay-fail"(inst, d) { inst.act("payment.reconcile", { paymentId: d.id, result: "fail" }); TW.toast("البوابة: لم يتم الخصم — الطلب اتلغى بدون أي مبلغ", "ok"); },
  "fail-retry"(inst, d) { A.ask(inst, { title: "إعادة محاولة التسليم", action: "failed.decide", payload: { taskId: d.task, decision: "retry" }, reasons: ["العميل رد واتفقنا على ميعاد", "تصحيح العنوان", "العميل رجع البيت"], confirm: "أعد المحاولة" }); },
  "fail-rto"(inst, d) { A.ask(inst, { title: "إرجاع للمصدر (RTO)", action: "failed.decide", payload: { taskId: d.task, decision: "rto" }, reasons: ["العميل لا يرد بعد كل المحاولات", "العميل رفض الطلب", "العنوان غير صحيح", "مكان غير آمن"], confirm: "ارجع للمصدر", danger: true, note: "الطلب هيرجع للمصدر ويتفحص. لو كاش: مفيش مبلغ مستحق، وعدد رفض الكاش للعميل بيزيد (BR-COD-002)." }); },
  "cod-fix"(inst, d) { A.ask(inst, { title: "تسوية فرق الكاش", action: "cod.resolve", payload: { codId: d.id }, extra: [{ k: "party", label: "الطرف المسؤول", type: "select", options: [["rider", "المندوب"], ["twaa", "توّا (خسارة مقبولة)"], ["customer", "العميل (تحصيل لاحق)"]], value: "rider" }], reasons: ["لا يوجد عرض يبرر الفرق", "خطأ فكة موثّق", "عرض مطبّق لم يُسجّل", "قرار إداري"], confirm: "سجّل التسوية" }); },
  "picker"(inst) { inst.go("/admin/picking"); },
  "goto-approvals"(inst) { inst.go("/admin/approvals"); },
  "refund-open"(inst, d) { inst.ui.modal = { kind: "refund", orderId: d.id, caseId: d.case || null }; const o = TW.S.orders.find((x) => x.id === d.id); const cs = d.case && TW.S.cases.find((c) => c.id === d.case); inst.ui.rfKeys = (cs && cs.keys) || []; inst.ui.rfReason = (cs && TW.REASONS.refund.includes(cs.type) ? cs.type : TW.REASONS.refund[0]); inst.ui.rfParty = (cs && cs.recommendation.party) || TW.recommend(o, inst.ui.rfReason).party; inst.ui.rfComp = "0"; inst.ui.rfMethod = "wallet"; inst.ui.rfEvidence = ""; inst.render(); },
  "rf-key"(inst, d) { const k = inst.ui.rfKeys || []; inst.ui.rfKeys = k.includes(d.key) ? k.filter((x) => x !== d.key) : [...k, d.key]; inst.render(); },
  "refund-submit"(inst) { const m = inst.ui.modal; const r = inst.act("refund.create", { orderId: m.orderId, caseId: m.caseId, keys: inst.ui.rfKeys, comp: Number(inst.ui.rfComp || 0), reason: inst.ui.rfReason, party: inst.ui.rfParty, evidence: inst.ui.rfEvidence || "سجل الطلب وسلسلة الحيازة", method: inst.ui.rfMethod }); if (r.ok !== false) { inst.ui.modal = null; TW.toast(r.pending ? "الاسترداد فوق حدّك — اتبعت للموافقة" : "اتنفّذ الاسترداد واتسجّل في دفتر الطلب", "ok"); inst.render(); } },
};

/* ---------------- manual assignment dialog (reason mandatory, eligibility visible) ---------------- */
A.modals.assign = (inst, m) => {
  const t = TW.S.tasks.find((x) => x.id === m.taskId); const o = TW.S.orders.find((x) => x.id === t.orderId);
  const cands = TW.riderCandidates(t);
  const rows = cands.map(({ r, el, km }) => `<tr class="${el.ok || el.soft ? "click" : ""}" ${el.ok || el.soft ? `data-act="assign-pick" data-rider="${r.id}"` : ""} style="${inst.ui.assignRider === r.id ? "outline:2px solid var(--accent)" : ""}"><td><b>${esc(r.ar)}</b><span class="sub">${esc(D.vehicles[r.vehicle])} · ${esc(A.zone(r.zoneId))}</span></td><td class="n num">${num(km, 1)} كم</td><td class="n num">${money(r.cash)} / ${money(r.limit)}</td><td>${el.ok ? chip("مؤهل", "ok") : el.soft ? chip(el.why, "warn") : chip(el.why, "bad")}</td></tr>`).join("");
  return TW.modalWrap(`إسناد يدوي — ${esc(t.id)} <span class="muted" style="font-weight:600">(${esc(o.id)})</span>`, `<div class="banner">${ic("info", "ic sm")}<div>المحرك بيرشّح حسب: الإتاحة، المسافة، نوع المركبة، حد الكاش، ومتطلبات المناولة (${t.handling.length ? t.handling.map((h) => ({ chilled: "مبرد", frozen: "مجمد", hot: "ساخن", fragile: "قابل للكسر", separate: "منفصل" }[h] || h)).join("، ") : "عادي"}). الكاش المطلوب تحصيله ${money(t.cod)}.</div></div>
    <div class="tw"><table class="tbl"><thead><tr><th>المندوب</th><th class="n">المسافة للاستلام</th><th class="n">الكاش / الحد</th><th>الأهلية</th></tr></thead><tbody>${rows}</tbody></table></div>
    <label class="field"><span>سبب التدخل اليدوي (إلزامي)</span><textarea class="input" data-model="askNote" placeholder="مثال: لا يوجد مندوب قبل العرض بعد 3 محاولات">${esc(inst.ui.askNote || "")}</textarea></label>`, `<button class="btn primary" data-act="assign-submit">${ic("bike", "ic sm")}أسند للمندوب المختار</button><button class="btn" data-act="modal-close">إلغاء</button>`, { wide: true });
};

/* ---------------- refund dialog (Guardrail H: order + item + reason + party + evidence + approval level) ---------------- */
A.modals.refund = (inst, m) => {
  const S = TW.S, o = S.orders.find((x) => x.id === m.orderId);
  const keys = inst.ui.rfKeys || [];
  const items = TW.sum(o.lines.filter((l) => keys.includes(l.key)), (l) => (l.sub ? l.sub.price : l.unitPrice) * l.qty);
  const total = items + Number(inst.ui.rfComp || 0);
  const tier = total <= S.rules.compAgent ? ["support", "خدمة العملاء (في حدّك)"] : total <= S.rules.compSupervisor ? ["supsup", "مشرف خدمة العملاء"] : ["finance", "المالية"];
  const rec = TW.recommend(o, inst.ui.rfReason);
  return TW.modalWrap(`استرداد — ${esc(o.id)}`, `<div class="banner brand">${ic("shield", "ic sm")}<div><b>توصية النظام من سلسلة الحيازة:</b> المسؤول ${esc(TW.PARTY[rec.party])}. ${rec.why.map(esc).join(" · ")}</div></div>
    <div class="lbl">البنود</div><div class="list">${o.lines.map((l) => `<label class="li click" data-act="rf-key" data-key="${l.key}"><input type="checkbox" ${keys.includes(l.key) ? "checked" : ""} tabindex="-1"><span class="grow">${esc(l.sub ? l.sub.name : l.name)} × ${l.qty}</span><span class="num">${money((l.sub ? l.sub.price : l.unitPrice) * l.qty)}</span></label>`).join("")}</div>
    <div class="grid g2"><label class="field"><span>السبب</span><select class="input" data-model="rfReason">${TW.REASONS.refund.map((r) => `<option ${inst.ui.rfReason === r ? "selected" : ""}>${r}</option>`).join("")}</select></label>
    <label class="field"><span>الطرف المسؤول</span><select class="input" data-model="rfParty">${Object.entries(TW.PARTY).map(([k, v]) => `<option value="${k}" ${inst.ui.rfParty === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
    <label class="field"><span>تعويض إضافي (ج.م)</span><input class="input" type="number" min="0" data-model="rfComp" data-live value="${esc(inst.ui.rfComp || "0")}"></label>
    <label class="field"><span>طريقة الاسترداد</span><select class="input" data-model="rfMethod"><option value="wallet" ${inst.ui.rfMethod === "wallet" ? "selected" : ""}>محفظة توّا (فوري)</option><option value="original" ${inst.ui.rfMethod === "original" ? "selected" : ""}>وسيلة الدفع الأصلية</option></select></label></div>
    <label class="field"><span>الدليل / السياسة</span><input class="input" data-model="rfEvidence" value="${esc(inst.ui.rfEvidence || "")}" placeholder="صورة العميل، سجل التغليف، سياسة المسؤولية §25"></label>
    <div class="row between card flat"><span>الإجمالي <b class="num">${money(total)}</b></span><span>مستوى الموافقة: ${chip(tier[1], tier[0] === "support" ? "ok" : "warn")}</span></div>`,
    `<button class="btn primary" data-act="refund-submit" ${keys.length ? "" : "disabled"}>${ic("undo", "ic sm")}${tier[0] === "support" || (tier[0] === "supsup" && TW.can("refund.approve.medium")) || (tier[0] === "finance" && TW.can("refund.approve.large")) ? "نفّذ الاسترداد" : "ابعت للموافقة"}</button><button class="btn" data-act="modal-close">إلغاء</button>`);
};

/* ---------------- order 360 drawer ---------------- */
A.drawers.order = (inst, d) => { const v = A.orderView(inst, d.id, d.tab || "overview", "drawer"); return v ? TW.drawerWrap(v.title, v.html, v.tools) : ""; };
/* full-page variant: /admin/order/TW-1043 */
TW.page("order", {
  render(inst, [id]) { const v = A.orderView(inst, id, inst.ui.orderTab || "overview", "page"); if (!v) return `<div class="card">${TW.empty("الطلب مش موجود", id)}</div>`; return `${A.head("", "", "")}<div class="cc-top"><button class="btn sm" data-act="go" data-to="/admin/orders">${ic("arrowR", "ic xs")}كل الطلبات</button><h1 style="font-size:20px">${v.title}</h1>${v.tools}</div>${v.html}`; },
  on: { "page-tab"(inst, d) { inst.ui.orderTab = d.tab; inst.render(); } },
});
A.orderView = (inst, id, tab, mode) => {
  const S = TW.S, o = S.orders.find((x) => x.id === id); if (!o) return null;
  const tabAct = mode === "page" ? "page-tab" : "drawer-tab";
  const c = S.customers.find((x) => x.id === o.customerId), z = S.zones.find((x) => x.id === o.zoneId);
  const fos = S.fos.filter((f) => f.orderId === o.id), tasks = S.tasks.filter((t) => t.orderId === o.id);
  const L = TW.ledger(o);
  const tabs = [["overview", "نظرة عامة"], ["fulfillment", "التنفيذ والتوصيل"], ["money", "الدفتر المالي"], ["timeline", "التسلسل والتدقيق"]];
  const head = `<div class="row wrap">${A.st("order", o.status)}${A.st("fin", o.fin)}${o.split ? chip("تسليم مجزّأ", "warn") : ""}${o.mode === "scheduled" ? chip(`مجدول ${o.window || ""}`, "info") : ""}<span class="muted">${esc(clock(o.createdAt))} · ${esc(ago(o.createdAt))}</span></div>
    <div class="seg" role="tablist">${tabs.map(([k, l]) => `<button class="${tab === k ? "on" : ""}" data-act="${tabAct}" data-tab="${k}" role="tab" aria-selected="${tab === k}">${l}</button>`).join("")}</div>`;
  let body = "";
  if (tab === "overview") {
    body = `<div class="grid g2"><div class="card"><h3>${ic("user", "ic sm")} العميل</h3><dl class="kv"><dt>الاسم</dt><dd><button class="btn sm ghost" data-act="open-customer" data-id="${c.id}" style="padding:0">${esc(c.ar)}</button></dd><dt>الموبايل</dt><dd class="mono">${esc(c.phone)}</dd><dt>المنطقة</dt><dd>${esc(z.ar)} · ${esc(D.zoneType[z.type])}</dd><dt>العلامة</dt><dd>${esc(o.address.landmark)}</dd><dt>الدفع</dt><dd>${{ cod: "كاش عند الاستلام", card: "بطاقة (Paymob)", wallet: "محفظة توّا" }[o.pay.method]}</dd><dt>البدائل</dt><dd>${{ call: "اسألني الأول", auto: "بدّل بأقرب بديل", remove: "شيل الصنف" }[o.subPref] || o.subPref}</dd></dl></div>
      <div class="card"><h3>${ic("route", "ic sm")} قرار التنسيق</h3><p>${esc(o.decision.text)}</p><p class="muted" style="margin-top:6px">الوعد للعميل: ${o.mode === "scheduled" ? `رحلة ${esc(o.window || "")}` : `${o.etaRange[0]}–${o.etaRange[1]} دقيقة`} · كود الاستلام <span class="mono">${o.otp}</span></p></div></div>
      <div class="card"><h3>${ic("receipt", "ic sm")} البنود حسب مصدر التنفيذ</h3>${fos.map((f) => `<div style="margin-bottom:10px"><div class="row between"><b>${esc(f.name)} <span class="mono muted">${esc(f.id)}</span></b>${A.st("fo", f.status)}</div>${o.lines.filter((l) => l.foId === f.id || (f.status === "REROUTED" && false)).map((l) => `<div class="row" style="font-size:13px;padding:3px 0"><span class="grow">${esc(l.name)} ${l.size ? `<span class="muted">${esc(l.size)}</span>` : ""} × ${l.qty}${l.sub ? ` <span class="chip t-info">بديل: ${esc(l.sub.name)} (${l.sub.diff > 0 ? "+" : ""}${num(l.sub.diff, 2)})</span>` : ""}${l.state === "removed" ? ` ${chip("اتشال", "neutral")}` : l.state === "sub_pending" ? ` ${chip("بانتظار قرار العميل", "warn")}` : l.state === "missing" ? ` ${chip("غير موجود على الرف", "bad")}` : ""}</span><span class="num">${money(l.unitPrice * l.qty)}</span></div>`).join("")}</div>`).join("")}
      <hr class="sep"><dl class="kv"><dt>المنتجات</dt><dd class="num">${money(o.totals.items)}</dd><dt>التوصيل</dt><dd class="num">${money(o.totals.delivery)}</dd><dt>الخدمة</dt><dd class="num">${money(o.totals.service)}</dd><dt>الخصم</dt><dd class="num">${money(o.totals.discount)}${o.promo ? ` · ${esc(o.promo)}` : ""}</dd><dt>الإجمالي</dt><dd class="num"><b>${money(o.totals.total)}</b></dd></dl></div>
      ${(o.caseIds || []).length ? `<div class="card"><h3>${ic("inbox", "ic sm")} حالات الدعم</h3>${o.caseIds.map((id) => { const cs = S.cases.find((x) => x.id === id); return cs ? `<div class="row between"><span>${esc(cs.id)} — ${esc(cs.type)}</span>${chip(cs.status === "RESOLVED" ? "محلولة" : cs.status === "PENDING_APPROVAL" ? "بانتظار موافقة" : "مفتوحة", cs.status === "RESOLVED" ? "ok" : "warn")}<button class="btn sm" data-act="go" data-to="/admin/case/${cs.id}">افتح</button></div>` : ""; }).join("")}</div>` : ""}`;
  }
  if (tab === "fulfillment") {
    body = fos.map((f) => `<div class="card"><div class="hd"><h3>${ic(f.sourceType === "hub" ? "building" : "store", "ic sm")} ${esc(f.name)} <span class="mono muted">${esc(f.id)}</span></h3>${A.st("fo", f.status)}</div>
      <dl class="kv"><dt>أُنشئ</dt><dd>${clock(f.createdAt)}</dd>${f.acceptBy ? `<dt>مهلة القبول</dt><dd>${f.status === "AWAITING_ACCEPT" ? `<span class="timer" data-until="${f.acceptBy}"></span>` : clock(f.acceptBy)}${f.acceptSec ? ` · قبل خلال ${f.acceptSec} ث` : ""}</dd>` : ""}${f.prepBy ? `<dt>موعد الجاهزية</dt><dd>${f.status === "PREPARING" ? `<span class="timer" data-until="${f.prepBy}"></span>` : clock(f.prepBy)}</dd>` : ""}${f.picker ? `<dt>المجمّع</dt><dd>${esc(f.picker)}</dd>` : ""}${f.packCheck ? `<dt>تحقق التغليف</dt><dd>${f.packCheck.scanned}/${f.packCheck.expected} ${f.packCheck.override ? chip("تجاوز يدوي", "bad") : chip("مطابق", "ok")}${f.packCheck.override ? `<span class="sub">${esc(f.packCheck.override)}</span>` : ""}</dd>` : ""}<dt>كود الاستلام</dt><dd class="mono">${f.pickupCode}</dd>${f.rejectReason ? `<dt>سبب الرفض</dt><dd>${esc(f.rejectReason)}</dd>` : ""}${f.calls ? `<dt>اتصالات الكنترول</dt><dd>${f.calls}</dd>` : ""}</dl>
      ${["AWAITING_ACCEPT", "TIMEOUT", "REJECTED"].includes(f.status) && !f.resolved ? `<div class="row wrap" style="margin-top:10px"><button class="btn sm" data-act="call-merchant" data-fo="${f.id}">${ic("phone", "ic xs")}اتصل بالتاجر</button><button class="btn sm primary" data-act="reroute" data-fo="${f.id}">${ic("route", "ic xs")}حوّل لتاجر بديل</button><button class="btn sm danger" data-act="cancel-fo" data-fo="${f.id}">${ic("x", "ic xs")}ألغِ المكوّن</button></div>` : ""}</div>`).join("") +
      tasks.map((t) => { const r = t.riderId && S.riders.find((x) => x.id === t.riderId); return `<div class="card"><div class="hd"><h3>${ic("bike", "ic sm")} مهمة توصيل <span class="mono muted">${esc(t.id)}</span></h3>${A.st("task", t.status)}</div>
      <dl class="kv"><dt>المندوب</dt><dd>${r ? `${esc(r.ar)} · ${esc(D.vehicles[r.vehicle])}` : "—"}${t.manual ? ` ${chip("إسناد يدوي", "warn")}<span class="sub">${esc(t.manual.by)}: ${esc(t.manual.reason)}</span>` : ""}</dd><dt>الاستلام</dt><dd>${t.pickups.map((p) => `${esc(p.name)} ${p.scanned ? chip(`اتسلّم ${clock(p.at)}`, "ok") : chip("لسه", "neutral")}`).join(" ")}</dd><dt>التسليم</dt><dd>${esc(t.drop.landmark)}</dd><dt>كاش مطلوب</dt><dd class="num">${money(t.cod)}${t.collected != null ? ` · اتحصّل ${money(t.collected)}` : ""}</dd><dt>المسافة / الأجر</dt><dd class="num">${t.km} كم · ${money(t.earn)}</dd><dt>محاولات العرض</dt><dd>${t.offers.map((x) => `${esc(A.rider(x.riderId))}: ${{ accept: "قبل", reject: "رفض", timeout: "لم يرد" }[x.resp]} (${x.rt} ث)${x.reason ? ` — ${esc(x.reason)}` : ""}`).join(" · ") || "—"}</dd>${t.contact.length ? `<dt>التواصل</dt><dd>${t.contact.map((x) => `${x.kind === "call" ? "اتصال" : "واتساب"} ${clock(x.at)} ${x.ok ? "✓" : "✗"}`).join(" · ")}</dd>` : ""}${t.pod ? `<dt>إثبات التسليم</dt><dd>OTP ${t.pod.otp ? "✓" : "—"} · GPS ${t.pod.gps ? "داخل النطاق" : "—"} · ${clock(t.pod.at || t.deliveredAt)}</dd>` : ""}${t.failReason ? `<dt>فشل</dt><dd>${esc(t.failReason)}</dd>` : ""}</dl>
      <div class="row wrap" style="margin-top:10px">${["WAITING", "OFFERED", "NO_RIDER", "ASSIGNED", "SCHEDULED"].includes(t.status) ? A.permBtn("dispatch.assign", "إسناد يدوي", "assign", { cls: "sm", icon: "bike", data: { task: t.id } }) : ""}${t.status === "NO_RIDER" ? TW.btn("أعد العرض التلقائي", "reoffer", { cls: "sm", data: { task: t.id } }) : ""}${t.status === "FAILED" ? TW.btn("إعادة محاولة", "fail-retry", { cls: "sm", data: { task: t.id } }) + TW.btn("إرجاع للمصدر", "fail-rto", { cls: "sm danger", data: { task: t.id } }) : ""}</div></div>`; }).join("");
  }
  if (tab === "money") {
    const pay = S.payments.find((p) => p.orderId === o.id); const cod = S.cod.filter((x) => x.orderId === o.id); const rfs = S.refunds.filter((r) => r.orderId === o.id);
    body = `<div class="card"><h3>${ic("scale", "ic sm")} دفتر الطلب — من يكسب ومن يدفع</h3><div class="tw"><table class="tbl"><tbody>${L.lines.map(([l, v]) => `<tr><td>${esc(l)}</td><td class="n num" style="color:${v < 0 ? "var(--bad)" : "var(--ink)"}">${money(v, 2)}</td></tr>`).join("")}<tr><td><b>مساهمة الطلب (صافي الإيراد − التكلفة المتغيرة)</b></td><td class="n num"><b style="color:${L.contribution < 0 ? "var(--bad)" : "var(--ok)"}">${money(L.contribution, 2)}</b></td></tr></tbody></table></div>
      <div class="grid g3" style="margin-top:10px">${TW.kpi("قيمة البضاعة (GMV)", money(L.gmv))}${TW.kpi("صافي الإيراد", money(L.netRevenue, 1))}${TW.kpi("مستحق للتجار", money(L.merchantPayable, 1))}</div>
      ${L.contribution < 0 ? `<div class="banner warn" style="margin-top:10px">${ic("alert", "ic sm")}<div>الطلب ده خسران: سلة ${money(L.gmv)} لا تغطي تكلفة المندوب والتجميع. الحد الأدنى للسلة والدمج في رحلات بيقللوا الخسارة.</div></div>` : ""}</div>
      <div class="card"><h3>${ic("card", "ic sm")} الدفع</h3>${pay ? `<dl class="kv"><dt>المرجع</dt><dd class="mono">${esc(pay.id)} ${pay.ref ? `· ${esc(pay.ref)}` : ""}</dd><dt>الطريقة</dt><dd>${esc(pay.gw)}</dd><dt>الحالة</dt><dd>${chip(pay.status, pay.status === "SUCCESS" ? "ok" : pay.status === "PENDING" ? "warn" : "info")}</dd><dt>مفتاح منع التكرار</dt><dd class="mono">${esc(pay.idem || "—")}</dd><dt>رسوم البوابة</dt><dd class="num">${money(pay.fee, 2)}</dd></dl>${pay.status === "PENDING" ? `<div class="row" style="margin-top:8px">${TW.btn("البوابة أكدت الخصم", "pay-ok", { cls: "sm primary", data: { id: pay.id } })}${TW.btn("البوابة: لم يتم الخصم", "pay-fail", { cls: "sm", data: { id: pay.id } })}</div>` : ""}` : "—"}
      ${cod.length ? `<hr class="sep"><b>الكاش</b>${cod.map((x) => `<div class="row between" style="font-size:13px"><span>${esc(A.rider(x.riderId))} · متوقع ${money(x.expected)} · محصّل ${money(x.collected)}</span>${x.variance ? chip(`فرق ${money(x.variance)}`, x.varianceResolved ? "neutral" : "bad") : chip(x.status, "info")}</div>`).join("")}` : ""}</div>
      <div class="card"><div class="hd"><h3>${ic("undo", "ic sm")} الاستردادات</h3>${o.status === "DELIVERED" || o.status === "PARTIALLY_DELIVERED" ? A.permBtn("refund.create", "استرداد", "refund-open", { cls: "sm", data: { id: o.id } }) : ""}</div>${rfs.length ? table([{ k: "id", label: "الرقم", render: (r) => `<span class="mono">${esc(r.id)}</span>` }, { k: "amount", label: "المبلغ", num: true, render: (r) => money(r.amount) }, { k: "reason", label: "السبب" }, { k: "party", label: "المسؤول", render: (r) => esc(TW.PARTY[r.party]) }, { k: "status", label: "الحالة", render: (r) => chip(r.status, r.status === "COMPLETED" ? "ok" : "warn") }], rfs) : `<p class="muted">مفيش استردادات.</p>`}</div>`;
  }
  if (tab === "timeline") {
    const aud = S.audit.filter((a) => String(a.obj).includes(o.id) || o.tasks.some((t) => String(a.obj).includes(t)) || o.fos.some((f) => String(a.obj).includes(f)));
    body = `<div class="card"><h3>${ic("history", "ic sm")} تسلسل الأحداث</h3><div class="steps">${o.events.map((e) => `<div class="st done"><span class="bul">${ic("check", "ic xs")}</span><div><b style="font-size:13px">${esc(e.text)}</b><div class="muted" style="font-size:12px">${clock(e.at)} · ${esc({ customer: "العميل", merchant: "التاجر", rider: "المندوب", admin: "الكنترول", system: "النظام" }[e.who] || e.who)} · <span class="mono">${esc(e.code)}</span></div></div></div>`).join("")}</div></div>
      <div class="card"><h3>${ic("book", "ic sm")} سجل التدقيق المرتبط</h3>${aud.length ? table([{ k: "at", label: "الوقت", render: (a) => clock(a.at) }, { k: "who", label: "من" }, { k: "action", label: "الإجراء" }, { k: "old", label: "قبل" }, { k: "nw", label: "بعد" }, { k: "reason", label: "السبب" }], aud) : `<p class="muted">مفيش إجراءات يدوية على الطلب ده.</p>`}</div>`;
  }
  const tools = `${!["DELIVERED", "CANCELLED", "RETURNED"].includes(o.status) ? A.permBtn("orders.cancel", "إلغاء", "cancel-order", { cls: "sm", icon: "x", data: { id: o.id } }) : ""}`;
  return { title: `الطلب <span class="mono">${esc(o.id)}</span> <span class="muted" style="font-weight:600;font-size:13px">${esc(c.ar)} · ${money(o.totals.total)}</span>`, html: head + body, tools };
};

/* shared mini map used by dispatch / zones / expansion pages */
A.map = (opts = {}) => {
  const S = TW.S; const W = 1000, H = 640;
  const zones = S.zones.map((z) => `<g><circle class="zone ${z.active ? "" : "off"} ${opts.selZone === z.id ? "sel" : ""}" cx="${z.x}" cy="${z.y}" r="${z.pr + 26}" ${opts.zoneAct ? `data-act="${opts.zoneAct}" data-id="${z.id}"` : ""}/><text class="zl" x="${z.x}" y="${z.y - z.pr - 32}" text-anchor="middle">${esc(z.ar)}</text></g>`).join("");
  const roads = `<path class="water" d="M0 520 C 200 500, 380 560, 560 540 S 860 470, 1000 500 L1000 640 L0 640Z"/><path class="road" d="M120 586 L 212 362 L 400 262 L 422 238 L 604 339 L 924 202"/><path class="road" d="M240 93 L 422 238 L 524 486"/><path class="road sm" d="M422 238 L 672 134"/><path class="road sm" d="M400 262 L 212 362"/>`;
  const hub = S.hubs.filter((h) => h.active).map((h) => `<g><rect class="hubm" x="${h.x - 11}" y="${h.y - 11}" width="22" height="22" rx="6"/><text class="mlbl" x="${h.x + 16}" y="${h.y + 4}">هب توّا</text></g>`).join("");
  const mers = opts.merchants === false ? "" : S.merchants.filter((m) => m.status === "active").map((m) => `<circle class="merm" cx="${m.x}" cy="${m.y}" r="5"${TW.tip(m.ar)}/>`).join("");
  const tasks = (opts.tasks || []).map((t) => { const r = t.riderId && S.riders.find((x) => x.id === t.riderId); const p = t.pickups[0]; return `${r ? `<path class="route" d="M${r.x} ${r.y} L ${t.status === "PICKED_UP" || t.status === "ARRIVED" ? `${t.drop.x} ${t.drop.y}` : `${p.x} ${p.y} L ${t.drop.x} ${t.drop.y}`}"/>` : `<path class="route" style="opacity:.45" d="M${p.x} ${p.y} L ${t.drop.x} ${t.drop.y}"/>`}<circle class="custm" cx="${t.drop.x}" cy="${t.drop.y}" r="7" ${opts.taskAct ? `data-act="${opts.taskAct}" data-id="${t.orderId}"` : ""}${TW.tip(`${t.orderId} · ${t.drop.name}`)}/>`; }).join("");
  const riders = opts.riders === false ? "" : S.riders.map((r) => { const cls = (r.status === "offline" ? "off" : r.cash >= r.limit ? "bad" : r.task ? "busy" : "") + (opts.selRider === r.id ? " sel" : ""); return `<g ${opts.riderAct ? `data-act="${opts.riderAct}" data-id="${r.id}"` : ""}><circle class="rid ${cls}" cx="${r.x}" cy="${r.y}" r="${opts.big ? 10 : 8}"${TW.tip(`${r.ar} · ${D.vehicles[r.vehicle]} · ${r.status === "offline" ? "أوفلاين" : r.task ? "في مهمة" : "متاح"} · كاش ${money(r.cash)}`)}/>${opts.labels ? `<text class="mlbl" x="${r.x + 12}" y="${r.y + 4}">${esc(r.ar.split(" ")[0])}</text>` : ""}</g>`; }).join("");
  return `<div class="map" style="aspect-ratio:${W}/${H};max-width:100%"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="خريطة مركز أبو المطامير">${roads}${zones}${mers}${hub}${tasks}${riders}</svg></div>`;
};
})();
