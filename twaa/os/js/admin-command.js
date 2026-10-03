/* Twaa Control Center — Command (Executive Overview, Live Operations, Control Tower, Dispatch Map)
   and Customer Care (Support Cases, Case 360, Complaints, Compensation, Call/WhatsApp Queue).
   Every number below is read from TW.S through the shared selectors (TW.kpis, TW.alerts, TW.ledger, TW.recommend …);
   every action goes through inst.act(...) or the shared A.on handlers so it lands in S.audit with a reason. */
(function () {
const TW = window.TW, D = TW.D, A = TW.A;
const { ic, esc, money, kmoney, num, pct, chip, sev, clock, sum, kpi, meter, btn, tip, dur } = TW;
const MIN = 60000;
const now = () => Date.now();
const find = (arr, id) => (arr || []).find((x) => x.id === id);
const SEV_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const SEV_AR = { critical: "حرج", high: "عالي", medium: "متوسط", low: "منخفض" };
const PRIO_AR = { critical: "عاجل", high: "عالية", medium: "متوسطة", low: "منخفضة" };
const CH = { whatsapp: ["واتساب", "chat"], call: ["مكالمة", "phone"], app: ["التطبيق", "mobile"], rider: ["من المندوب", "bike"] };
const DONE = ["DELIVERED", "CANCELLED", "RETURNED"];
const S_ = () => TW.S;

/* ---------------------------------------------------------------- small atoms ---------------------------------------------------------------- */
const since = (ts) => (ts ? `<span class="timer cmd-tm" data-since="${ts}">${dur(now() - ts)}</span>` : "—");
const until = (ts, soon = 5 * MIN) => { if (!ts) return "—"; const left = ts - now(); return `<span class="timer cmd-tm ${left < 0 ? "late" : left < soon ? "soon" : ""}" data-until="${ts}" data-soon="${soon}">${left < 0 ? "+" + dur(-left) : dur(left)}</span>`; };
const goBtn = (label, to, opts = {}) => btn(label, "go", { cls: opts.cls || "sm", icon: opts.icon, data: { to } });
const hd = (title, icon, right = "") => `<div class="hd"><h3>${ic(icon, "ic sm")} ${title}</h3>${right}</div>`;
const sectionNote = (t) => `<p class="muted cmd-note">${t}</p>`;
const orderZone = (o) => (o ? A.zone(o.zoneId) : "—");
const riderBusy = (r) => !!r.task || r.status === "busy";
const riderAvail = (r) => r.status !== "offline" && !r.suspended && !r.task && r.status !== "busy";
const custOf = (o) => (o ? find(S_().customers, o.customerId) : null);
const todays = () => S_().orders.filter((o) => now() - o.createdAt < 18 * 3600000 && new Date(o.createdAt).getDate() === new Date().getDate());
const roleLimit = () => { const r = TW.roleOf().id, R = S_().rules; return r === "support" ? R.compAgent : ["supsup", "ops"].includes(r) ? R.compSupervisor : Infinity; };
const tierOf = (amt) => { const R = S_().rules; return amt <= R.compAgent ? { id: "support", ar: "خدمة العملاء (في حدود الموظف)", tone: "ok" } : amt <= R.compSupervisor ? { id: "supsup", ar: "مشرف خدمة العملاء", tone: "warn" } : { id: "finance", ar: "المالية / الإدارة", tone: "bad" }; };
const levelAr = (lv) => (D.roles.find((r) => r.id === lv) || {}).ar || lv;
const custLink = (c) => (c ? `<button class="btn sm ghost cmd-lnk" data-act="open-customer" data-id="${esc(c.id)}">${esc(c.ar)}</button>` : "—");
const riderLink = (r) => (r ? `<button class="btn sm ghost cmd-lnk" data-act="open-rider" data-id="${esc(r.id)}">${esc(r.ar)}</button>` : "—");
const merchLink = (id) => (id && id !== "h1" ? `<button class="btn sm ghost cmd-lnk" data-act="open-merchant" data-id="${esc(id)}">${esc(A.merchant(id))}</button>` : `<span>هب توّا</span>`);
const caseStatus = (s) => ({ OPEN: chip("مفتوحة", "warn"), INVESTIGATING: chip("قيد التحقيق", "info"), PENDING_APPROVAL: chip("بانتظار موافقة", "accent"), RESOLVED: chip("محلولة", "ok") }[s] || chip(s));
const refundStatus = (s) => chip({ PENDING_APPROVAL: "بانتظار موافقة", REQUESTED: "مطلوب", SUBMITTED: "اتبعت للبوابة", COMPLETED: "اتنفّذ", REJECTED: "مرفوض", FAILED: "فشل" }[s] || s, { COMPLETED: "ok", SUBMITTED: "info", REJECTED: "neutral", FAILED: "bad" }[s] || "warn");
const chBadge = (ch) => { const [l, i] = CH[ch] || [ch, "inbox"]; return chip(l, ch === "whatsapp" ? "ok" : ch === "call" ? "info" : "neutral", i); };
const legendDot = (cls, label) => `<span class="cmd-ld"><i class="${cls}"></i>${esc(label)}</span>`;

/* ---------------------------------------------------------------- Control Tower row actions (shared A.on handlers) ---------------------------------------------------------------- */
function alertActs(a) {
  const S = S_(), out = [], cls = "sm";
  const taskRef = String(a.ref).replace(/^(fail-|pk-|stuck-)/, "");
  (a.acts || []).forEach((k) => {
    if (k === "call") out.push(btn("اتصل بالتاجر", "call-merchant", { cls, icon: "phone", data: { fo: a.ref } }));
    else if (k === "reroute") out.push(btn("حوّل لتاجر بديل", "reroute", { cls: `${cls} primary`, icon: "route", data: { fo: a.ref } }));
    else if (k === "cancelFo") out.push(btn("ألغِ المكوّن", "cancel-fo", { cls: `${cls} ghost`, icon: "x", data: { fo: a.ref } }));
    else if (k === "assign") out.push(A.permBtn("dispatch.assign", "إسناد يدوي", "assign", { cls: `${cls} primary`, icon: "bike", data: { task: taskRef } }));
    else if (k === "reoffer") out.push(btn("أعد العرض", "reoffer", { cls, icon: "refresh", data: { task: taskRef } }));
    else if (k === "retry") out.push(btn("إعادة محاولة", "fail-retry", { cls: `${cls} primary`, icon: "refresh", data: { task: taskRef } }));
    else if (k === "rto") out.push(btn("إرجاع للمصدر", "fail-rto", { cls: `${cls} danger`, icon: "undo", data: { task: taskRef } }));
    else if (k === "payok") out.push(btn("البوابة أكدت الخصم", "pay-ok", { cls: `${cls} primary`, icon: "check", data: { id: a.ref } }));
    else if (k === "payfail") out.push(btn("لم يتم الخصم", "pay-fail", { cls, icon: "x", data: { id: a.ref } }));
    else if (k === "codfix") out.push(btn("سوِّ الفرق", "cod-fix", { cls: `${cls} primary`, icon: "scale", data: { id: a.ref } }));
    else if (k === "picker") out.push(btn("شاشة التجميع", "picker", { cls, icon: "scan" }));
    else if (k === "rider") out.push(btn("ملف المندوب", "open-rider", { cls, icon: "bike", data: { id: a.riderId } }));
    else if (k === "open") out.push(btn("افتح الطلب", "open-order", { cls: `${cls} ghost`, icon: "eye", data: { id: a.orderId } }));
    else if (k === "approvals") {
      const rf = find(S.refunds, a.ref), ap = rf && rf.approvalId && find(S.approvals, rf.approvalId);
      if (ap && ap.status === "PENDING") out.push(TW.canApprove(ap) ? btn("اعتمد", "approve", { cls: `${cls} primary`, icon: "check", data: { id: ap.id } }) + btn("ارفض", "reject", { cls, icon: "x", data: { id: ap.id } }) : `<span class="lock">${ic("lock", "ic xs")}يحتاج «${esc(levelAr(ap.level))}»</span>`);
      if (rf && rf.caseId) out.push(goBtn("افتح الحالة", `/admin/case/${rf.caseId}`, { icon: "inbox" }));
      out.push(btn("مركز الموافقات", "goto-approvals", { cls: `${cls} ghost`, icon: "check" }));
    }
  });
  return out.join("");
}
function alertZone(a) { const S = S_(); const o = a.orderId && find(S.orders, a.orderId); if (o) return o.zoneId; if (a.riderId) { const r = find(S.riders, a.riderId); return r && r.zoneId; } return null; }
function alertWho(a) { if (a.orderId) return A.orderLink(a.orderId); if (a.riderId) return riderLink(find(S_().riders, a.riderId)); return "—"; }

/* ---------------------------------------------------------------- shared handlers for every page in this module ---------------------------------------------------------------- */
const ON = {
  "ct-reset"(inst) { inst.ui.ctSev = "all"; inst.ui.ctOwner = "all"; inst.ui.ctZone = "all"; inst.render(); },
  "dsp-rider"(inst, d) { inst.ui.dspRider = inst.ui.dspRider === d.id ? null : d.id; inst.render(); },
  "dsp-assign"(inst, d) { A.on.assign(inst, { task: d.task }); if (d.rider) { inst.ui.assignRider = d.rider; inst.render(); } },
  "case-flow"(inst, d) { inst.ui.caseFlow = { id: d.case, type: d.type }; inst.render(); },
  "case-assign"(inst, d) { const r = inst.act("case.assign", { caseId: d.id }); if (r.ok !== false) TW.toast(`الحالة ${d.id} بقت معاك`, "ok"); },
  "case-note"(inst, d) { const text = (inst.ui.caseNote || "").trim(); if (!text) return TW.toast("اكتب الملاحظة الأول", "bad"); const r = inst.act("case.note", { caseId: d.id, text }); if (r.ok !== false) { inst.ui.caseNote = ""; TW.toast("اتسجّلت الملاحظة على الحالة", "ok"); } },
  "case-comp"(inst, d) {
    const cs = find(S_().cases, d.id); if (!cs) return;
    const cap = (cs.recommendation && cs.recommendation.maxComp) || 0, lim = roleLimit();
    if (!cap) return TW.toast("السياسة لا تسمح بتعويض نقدي لنوع المشكلة دي — استخدم الاسترداد على البنود", "bad");
    const steps = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200].filter((v) => v <= cap);
    A.ask(inst, { title: `تعويض للعميل — ${cs.id}`, action: "comp.issue", payload: { caseId: cs.id }, extra: [{ k: "amount", label: "المبلغ (قائمة محكومة حتى سقف السياسة)", type: "select", options: steps.map((v) => [v, `${money(v)}${v > lim ? " — يحتاج موافقة" : ""}`]), value: steps[steps.length - 1] }], reasons: ["تأخير التوصيل عن الوعد", "صنف تالف / ناقص — اعتذار", "تجربة سيئة مع المندوب", "خطأ من توّا", "استرضاء عميل ذهبي (ضمن السقف)"], confirm: "اصرف للمحفظة", note: `سقف التعويض لهذه الحالة ${money(cap)} (سياسة النوع «${esc(cs.type)}»). حدّك كـ${esc(TW.roleOf().ar)}: ${lim === Infinity ? "بدون سقف" : money(lim)}. مفيش خصومات مفتوحة — أي مبلغ فوق حدّك يروح لمركز الموافقات (Guardrail D).` });
  },
  "case-resolve"(inst, d) { A.ask(inst, { title: `إغلاق الحالة ${d.id}`, action: "case.resolve", payload: { caseId: d.id }, field: "resolution", reasons: ["تم الاسترداد للعميل", "تم التعويض في المحفظة", "إعادة توصيل الصنف", "تواصل وتوضيح — لا يستحق تعويض", "حُلّت مع التاجر", "حُلّت مع المندوب", "مكررة — مدمجة في حالة أخرى"], confirm: "أغلق الحالة" }); },
  "q-take"(inst, d) {
    if (d.case) { const r = inst.act("case.assign", { caseId: d.case }); if (r.ok !== false) { TW.toast(`استلمت ${d.case}`, "ok"); inst.go(`/admin/case/${d.case}`); } return; }
    const r = inst.act("support.report", { orderId: d.order, type: "سبب آخر", note: "العميل لا يرد على المندوب عند العنوان — اتصال من الدعم بالرقم البديل (EX-ARR-001)" });
    if (r.ok !== false && r.caseId) { inst.act("case.assign", { caseId: r.caseId }); TW.toast(`اتفتحت ${r.caseId} واتسندت ليك`, "ok"); inst.go(`/admin/case/${r.caseId}`); }
  },
  "abuse-watch"(inst, d) { A.ask(inst, { title: `وضع التاجر تحت المراقبة — ${A.merchant(d.id)}`, action: "merchant.status", payload: { merchantId: d.id, status: "watch" }, reasons: ["إلغاءات بعد القبول فوق الحد", "شكاوى متكررة", "مراجعة بعد تحقيق"], confirm: "ضع تحت المراقبة", note: "المراقبة مش عقوبة: بتظهر التاجر في تقارير الأداء اليومية بدون أي خصم. أي خصم مالي محتاج قرار منفصل وموافقة." }); },
};

/* ================================================================ EXECUTIVE OVERVIEW ("") ================================================================ */
/* per-order economics of the seeded (historical) part of today — matches TW.kpis() (contribution 9.6 / order, AOV 262) */
const UE_BASE = { basket: 262, margin: 34.0, delivery: 14.5, service: 3.0, promo: -6.1, payFee: -1.6, rider: -24.8, pick: -5.2, refund: -1.6, varOps: -2.6 };
const UE_ROWS = [["margin", "عمولة التجار / هامش بضاعة الهب", "rev"], ["delivery", "إيراد التوصيل", "rev"], ["service", "رسوم الخدمة", "rev"], ["promo", "تكلفة العروض (حصة توّا)", "cost"], ["payFee", "رسوم الدفع / التحصيل", "cost"], ["rider", "تكلفة المندوب", "cost"], ["pick", "تجميع وتغليف", "cost"], ["refund", "استرداد وتعويضات", "cost"], ["varOps", "تكلفة تشغيل متغيرة أخرى", "cost"]];
function ledgerVals(o) {
  const L = TW.ledger(o), v = (i) => (L.lines[i] ? L.lines[i][1] : 0);
  const extra = sum(L.lines.slice(9), (x) => x[1]);
  return { basket: L.gmv, margin: v(0) + v(1), delivery: v(2), service: v(3), promo: v(4), varOps: v(5), payFee: v(6), rider: v(7), pick: v(8), refund: extra, contribution: L.contribution };
}
function unitEconomics(mode) {
  const S = S_(), live = todays().filter((o) => o.status !== "CANCELLED");
  const baseN = mode === "live" ? 0 : Math.max(0, sum(S.hist.hourly.filter((x) => x != null)) - S.orders.filter((o) => now() - o.createdAt < 4 * 3600000).length);
  const vals = live.map(ledgerVals);
  const n = baseN + vals.length || 1;
  const out = {};
  ["basket", ...UE_ROWS.map((r) => r[0])].forEach((k) => (out[k] = (baseN * UE_BASE[k] + sum(vals, (x) => x[k])) / n));
  out.contribution = sum(UE_ROWS, (r) => out[r[0]]);
  return { ...out, n, baseN, liveN: vals.length };
}
function waterfall(ue) {
  let cum = 0; const steps = UE_ROWS.map(([k, label, kind]) => { const a = cum; cum += ue[k]; return { k, label, kind, v: ue[k], a, b: cum }; });
  steps.push({ k: "cm", label: "مساهمة الطلب", kind: "total", v: cum, a: 0, b: cum });
  const lo = Math.min(0, ...steps.map((s) => Math.min(s.a, s.b))), hi = Math.max(1, ...steps.map((s) => Math.max(s.a, s.b)));
  const span = hi - lo, P = (x) => ((x - lo) / span) * 100;
  return `<div class="cmd-wf" role="img" aria-label="شلال اقتصاديات الطلب">${steps.map((s) => { const x0 = P(Math.min(s.a, s.b)), w = Math.max(0.6, Math.abs(P(s.b) - P(s.a))); const tone = s.kind === "rev" ? "b-teal" : s.kind === "cost" ? "b-accent" : s.v < 0 ? "b-bad" : "b-brand"; return `<div class="cmd-wf-r ${s.kind === "total" ? "tot" : ""}"${tip(`${s.label}: ${money(s.v, 2)} لكل طلب · التراكمي ${money(s.b, 2)}`)} tabindex="0"><span class="cmd-wf-l">${esc(s.label)}</span><span class="cmd-wf-t"><i class="cmd-wf-z" style="inset-inline-start:${P(0).toFixed(2)}%"></i><i class="${tone}" style="inset-inline-start:${x0.toFixed(2)}%;width:${w.toFixed(2)}%"></i></span><span class="cmd-wf-v num ${s.v < 0 ? "neg" : ""}">${s.v > 0 && s.kind !== "total" ? "+" : ""}${num(s.v, 1)}</span></div>`; }).join("")}</div>`;
}
function execFlags() {
  const S = S_(), R = S.rules, out = [], al = TW.alerts(), t = now();
  const ok = [];
  /* 1 abnormal loss */
  const losers = todays().filter((o) => o.status !== "CANCELLED").map((o) => ({ o, c: TW.ledger(o).contribution })).filter((x) => x.c < 0).sort((a, b) => a.c - b.c);
  if (losers.length) out.push({ sev: sum(losers, (x) => x.c) < -40 ? "high" : "medium", code: "Guardrail A", title: `${losers.length} طلبات اليوم بمساهمة سالبة`, detail: `${losers.slice(0, 3).map((x) => `${x.o.id} (${num(x.c, 1)})`).join(" · ")} — سلة صغيرة أو توصيل بعيد لا يغطي تكلفة المندوب والتجميع.`, owner: "المالية / العمليات", money: sum(losers, (x) => x.c), to: "/admin/unit-economics" }); else ok.push("الخسائر غير الطبيعية");
  /* 2 high refund */
  const rfToday = S.refunds.filter((r) => t - r.at < 18 * 3600000 && !["REJECTED", "FAILED"].includes(r.status) && r.reason !== "إلغاء الطلب");
  const rfPend = S.refunds.filter((r) => r.status === "PENDING_APPROVAL");
  const gmvToday = TW.kpis().gmv, rfRate = sum(rfToday, (r) => r.amount) / (gmvToday || 1);
  if (rfPend.length || rfRate > 0.01) out.push({ sev: rfRate > 0.01 ? "high" : "medium", code: "Guardrail H", title: `استردادات: ${money(sum(rfToday, (r) => r.amount))} اليوم (${pct(rfRate, 2)} من GMV)`, detail: `${rfPend.length} بانتظار موافقة بقيمة ${money(sum(rfPend, (r) => r.amount))}${rfPend[0] ? ` — أقدمها ${rfPend[0].id} ${TW.ago(rfPend[0].at)}` : ""}.`, owner: "مشرف الدعم / المالية", money: -sum(rfPend, (r) => r.amount), to: "/admin/compensation" }); else ok.push("الاستردادات");
  /* 3 merchant dispute */
  const disp = S.msettle.flatMap((st) => st.lines.filter((l) => l.status === "disputed").map((l) => ({ st, l })));
  if (disp.length) out.push({ sev: "high", code: "EX-SET-002", title: `${disp.length} اعتراض تاجر مفتوح على التسوية`, detail: disp.slice(0, 2).map(({ st, l }) => `${A.merchant(st.merchantId)}: ${l.event} (${money(l.amount)})`).join(" · ") + " — الصرف متوقف لحد الحسم.", owner: "المالية / عمليات التجار", money: sum(disp, (x) => x.l.amount), to: "/admin/merchant-settlements" }); else ok.push("نزاعات التجار");
  /* 4 COD exposure */
  const over = S.riders.filter((r) => r.cash >= r.limit && r.status !== "offline"), held = sum(S.riders, (r) => r.cash), cap = sum(S.riders.filter((r) => r.status !== "offline"), (r) => r.limit);
  if (over.length) out.push({ sev: "high", code: "BR-RID-002", title: `${over.length} مندوب فوق حد الكاش`, detail: `${over.map((r) => `${r.ar} ${money(r.cash)}/${money(r.limit)}`).join(" · ")} · إجمالي الكاش في الشارع ${money(held)} (${pct(held / (cap || 1))} من الحدود).`, owner: "المالية", money: -sum(over, (r) => r.cash - r.limit), to: "/admin/cod" }); else ok.push("تعرّض الكاش");
  /* 5 rider cash discrepancy */
  const vars = S.cod.filter((c) => c.variance && !c.varianceResolved);
  if (vars.length) out.push({ sev: "high", code: "EX-COD-003", title: `فرق كاش غير مسوّى: ${money(sum(vars, (c) => Math.abs(c.variance)))}`, detail: vars.map((c) => `${A.rider(c.riderId)} على ${c.orderId} (${money(c.variance)})`).join(" · ") + " — لازم طرف مسؤول قبل إقفال اليوم.", owner: "المالية", money: sum(vars, (c) => c.variance), to: "/admin/cod" }); else ok.push("فروق الكاش");
  /* 6 category margin collapse (margin after waste) */
  const cats = S.hist.catGmv.filter((c) => c.margin - c.waste < 0.11).sort((a, b) => (a.margin - a.waste) - (b.margin - b.waste));
  if (cats.length) out.push({ sev: "medium", code: "P33", title: `هامش ${cats.length === 1 ? "قسم" : `${cats.length} أقسام`} تحت 11% بعد الهالك`, detail: cats.map((c) => `${c.ar}: هامش ${pct(c.margin, 1)} − هالك ${pct(c.waste, 1)} = ${pct(c.margin - c.waste, 1)}`).join(" · "), owner: "مدير الأقسام", money: -sum(cats, (c) => c.gmv * Math.max(0, 0.11 - (c.margin - c.waste))) / 30, to: "/admin/categories" }); else ok.push("هوامش الأقسام");
  /* 7 inventory shrinkage */
  const inv = Object.values(S.inv.h1), dmg = sum(inv, (i) => i.damaged * i.cost), exp = sum(inv, (i) => i.expired * i.cost);
  const lossMoves = S.moves.filter((m) => m.qty < 0 && t - m.at < 18 * 3600000);
  const wo = S.approvals.filter((a) => a.type === "writeoff" && a.status === "PENDING");
  if (dmg + exp > 500 || lossMoves.length) out.push({ sev: dmg + exp > 1500 ? "high" : "medium", code: "Guardrail I", title: `فقد مخزون بقيمة تكلفة ${money(dmg + exp)}`, detail: `تالف ${money(dmg)} · منتهي ${money(exp)} · ${lossMoves.length} حركة فقد اليوم${wo.length ? ` · ${wo.length} شطب بانتظار موافقة (${money(sum(wo, (a) => a.amount))})` : ""}.`, owner: "مدير الهب", money: -(dmg + exp), to: "/admin/inventory" }); else ok.push("فقد المخزون");
  /* 8 fraud / abuse */
  const codAbuse = S.customers.filter((c) => c.codFails >= R.codFailBlock), promoAb = S.customers.filter((c) => c.promoHeavy), mCancel = S.merchants.filter((m) => m.status === "active" && m.cancelAfterAccept >= 0.035);
  if (codAbuse.length + promoAb.length + mCancel.length) out.push({ sev: "medium", code: "Guardrail J", title: `${codAbuse.length + promoAb.length + mCancel.length} إشارات إساءة استخدام تحتاج مراجعة`, detail: `${codAbuse.length} عميل رفض الكاش ≥ ${R.codFailBlock} (BR-COD-002) · ${promoAb.length} عميل معتمد على العروض · ${mCancel.length} تاجر إلغاء بعد القبول ≥ 3.5% — لا عقوبة تلقائية.`, owner: "مشرف الدعم / عمليات التجار", money: 0, to: "/admin/complaints" }); else ok.push("الاحتيال");
  /* 9 SLA failure */
  const crit = al.filter((a) => a.sev === "critical"), breached = al.filter((a) => a.slaAt && a.slaAt < t);
  if (crit.length || breached.length) out.push({ sev: crit.length ? "critical" : "high", code: "Control Tower", title: `${crit.length} تنبيه حرج · ${breached.length} تجاوز SLA الآن`, detail: crit.concat(breached.filter((a) => a.sev !== "critical")).slice(0, 3).map((a) => `${a.orderId || ""} ${a.problem}`).join(" · "), owner: "مدير العمليات", money: -sum(crit, (a) => a.money), to: "/admin/control-tower" }); else ok.push("اتفاقيات الخدمة");
  /* 10 low delivery capacity */
  const avail = S.riders.filter((r) => riderAvail(r) && r.cash < r.limit), pending = S.tasks.filter((x) => ["WAITING", "OFFERED", "NO_RIDER"].includes(x.status)), noR = pending.filter((x) => x.status === "NO_RIDER");
  if (noR.length || avail.length < pending.length) out.push({ sev: noR.length ? "high" : "medium", code: "EX-RID-002", title: `السعة: ${avail.length} مندوب متاح مقابل ${pending.length} مهمة بانتظار`, detail: `${noR.length ? `${noR.map((x) => x.orderId).join("، ")} بدون مندوب بعد ${S.rules.riderOfferRetries} محاولات · ` : ""}${S.riders.filter((r) => r.status === "offline").length} أوفلاين — فكّر في تشغيل وردية إضافية.`, owner: "الموزّع / العمليات", money: -sum(noR, (x) => (find(S.orders, x.orderId) || { totals: { total: 0 } }).totals.total), to: "/admin/dispatch" }); else ok.push("سعة التوصيل");
  out.sort((a, b) => SEV_RANK[a.sev] - SEV_RANK[b.sev] || a.money - b.money);
  return { flags: out, ok };
}
function execPage(inst) {
  const S = S_(), k = TW.kpis(), H = S.hist, daily = H.daily, al = TW.alerts();
  const { flags, ok } = execFlags();
  const curH = H.hourly.reduce((m, v, i) => (v != null ? i : m), 0);
  const yestSoFar = sum(H.hourlyY.slice(0, curH + 1));
  const y = daily[daily.length - 2] || daily[0];
  const over = S.riders.filter((r) => r.cash >= r.limit && r.status !== "offline").length;
  const busy = S.riders.filter((r) => r.status !== "offline" && riderBusy(r)).length;
  const rfPend = S.refunds.filter((r) => ["PENDING_APPROVAL", "REQUESTED", "SUBMITTED"].includes(r.status));
  const varN = S.cod.filter((c) => c.variance && !c.varianceResolved).length;
  const go = (to) => ({ act: "go", data: { to } });
  const cards = [
    kpi("قيمة المبيعات اليوم (GMV)", kmoney(k.gmv), `أمس (يوم كامل) ${kmoney(y.gmv)}`, { spark: daily.map((d) => d.gmv), ...go("/admin/analytics") }),
    kpi("صافي الإيراد", money(k.netRev), `${pct(k.netRev / k.gmv, 1)} من GMV`, { spark: daily.map((d) => d.net), ...go("/admin/profitability") }),
    kpi("هامش المساهمة", money(k.cm), `${money(k.cm / k.orders, 1)} لكل طلب`, { spark: daily.map((d) => d.cm), tone: k.cm < 0 ? "bad" : "ok", ...go("/admin/unit-economics") }),
    kpi("الطلبات", num(k.orders), `أمس لنفس الساعة ${num(yestSoFar)}`, { spark: daily.map((d) => d.orders), ...go("/admin/orders") }),
    kpi("متوسط قيمة الطلب", money(k.aov), `أمس ${money(y.gmv / y.orders)}`, { spark: daily.map((d) => d.gmv / d.orders), ...go("/admin/analytics") }),
    kpi("تم التسليم", pct(k.deliveredPct), `${num(k.delivered)} طلب · ${k.live} لسه شغال`, go("/admin/orders")),
    kpi("في الموعد", pct(k.ontime), "هدف 90% · 30 يوم ↓", { spark: daily.map((d) => d.onTime), tone: k.ontime < 0.9 ? "warn" : "", ...go("/admin/sla") }),
    kpi("نسبة الإلغاء", pct(k.cancelPct, 1), "هدف أقل من 3%", { spark: daily.map((d) => d.cancel), tone: k.cancelPct > 0.03 ? "bad" : "", ...go("/admin/orders") }),
    kpi("عملاء نشطين (30 يوم)", num(k.activeCust), `${num(daily[daily.length - 1].newCust)} عميل جديد اليوم`, { spark: daily.map((d) => d.newCust), ...go("/admin/customers") }),
    kpi("تجار نشطين الآن", num(k.activeMerch), `من ${S.merchants.filter((m) => m.status === "active").length} تاجر مفعّل`, go("/admin/merchants")),
    kpi("مناديب أونلاين", num(k.activeRiders), `${busy} في مهمة · ${k.activeRiders - busy} متاح`, go("/admin/dispatch")),
    kpi("الكاش مع المناديب", money(k.codExposure), over ? `${over} مندوب فوق الحد` : "كل المناديب تحت الحد", { tone: over ? "warn" : "", ...go("/admin/cod") }),
    kpi("استردادات معلّقة", money(k.refundPending), `${rfPend.length} طلب استرداد`, { tone: k.refundPending ? "warn" : "", ...go("/admin/compensation") }),
    kpi("فروق الكاش", money(k.cashDiscrepancy), varN ? `${varN} فرق بدون طرف مسؤول` : "لا توجد فروق", { tone: k.cashDiscrepancy ? "bad" : "ok", ...go("/admin/cod") }),
  ].join("");
  /* pulse */
  const hrs = []; for (let h = 7; h <= curH; h++) hrs.push(h);
  const pulse = TW.lines([{ name: "اليوم", tone: "brand", values: hrs.map((h) => H.hourly[h] || 0) }, { name: "أمس", tone: "teal", dash: true, values: hrs.map((h) => H.hourlyY[h] || 0) }], hrs.map((h) => `${h}:00`), { h: 190, label: "الطلبات بالساعة اليوم مقابل أمس" });
  const rev = TW.lines([{ name: "صافي الإيراد", tone: "brand", values: daily.map((d) => d.net) }, { name: "المساهمة", tone: "accent", values: daily.map((d) => d.cm) }], daily.map((d) => String(d.d)), { h: 190, fmt: (v) => money(v), label: "صافي الإيراد والمساهمة يومياً" });
  const cmPer = daily.map((d) => d.cm / d.orders), cmAvg = sum(cmPer) / cmPer.length;
  /* funnel */
  const F = H.funnel; let worst = 1, worstI = 1;
  const frows = F.map(([l, v], i) => { const cv = i ? v / F[i - 1][1] : 1; if (i && cv < worst) { worst = cv; worstI = i; } return { label: l, value: v, sub: i ? `${pct(cv)} من السابق` : "100%", tone: i === F.length - 1 ? "teal" : "brand" }; });
  /* unit economics */
  const mode = inst.ui.ueMode === "live" ? "live" : "blend";
  const ue = unitEconomics(mode);
  const audit = S.audit.filter((a) => a.role !== "system" && a.role !== "rider" && a.role !== "customer").slice(0, 6);
  const risk = sum(al, (a) => a.money);
  return `${A.head("نظرة الشركاء", `Executive Overview · حتى ${clock(now())} · مركز أبو المطامير`, `<span class="chip t-info">${ic("clock", "ic xs")}يتحدّث كل ثانية</span>${goBtn("برج التحكم", "/admin/control-tower", { icon: "alert" })}`)}
  ${A.answer({ what: `${num(k.orders)} طلب اليوم · ${k.live} شغال الآن · مساهمة ${money(k.cm)}`, attention: `${flags.length} علامة حمراء · ${al.filter((a) => a.sev === "critical").length} تنبيه حرج`, owner: flags[0] ? esc(flags[0].owner) : "لا يوجد", risk: `${money(risk)} في تنبيهات مفتوحة` })}
  <div class="cmd-kpis">${cards}</div>
  <div class="cmd-g21">
    <div class="card" data-hl="exec-flags">${hd("العلامات الحمراء — محتاجة قرار الشركاء", "flag", chip(`${flags.length} من 10 فحوصات`, flags.some((f) => f.sev === "critical") ? "bad" : flags.length ? "warn" : "ok"))}
      ${flags.length ? `<div class="cmd-flags">${flags.map((f) => `<div class="cmd-flag sev-${f.sev}" data-act="go" data-to="${f.to}" role="button" tabindex="0"><div class="cmd-flag-h">${sev(f.sev)}<b class="grow">${esc(f.title)}</b>${f.money ? `<span class="num cmd-money ${f.money < 0 ? "neg" : ""}">${f.money > 0 ? "+" : ""}${money(f.money)}</span>` : ""}</div><div class="cmd-flag-d">${esc(f.detail)}</div><div class="cmd-flag-f"><span class="mono">${esc(f.code)}</span><span>${ic("user", "ic xs")} ${esc(f.owner)}</span><span class="cmd-go">افتح ${ic("chevE", "ic xs")}</span></div></div>`).join("")}</div>` : TW.empty("مفيش علامات حمراء", "كل الفحوصات العشرة سليمة", "check")}
      ${ok.length ? `<p class="muted cmd-note">${ic("check", "ic xs")} سليم: ${ok.map(esc).join(" · ")}</p>` : ""}</div>
    <div class="col gap12">
      <div class="card">${hd("نبض الطلبات بالساعة", "zap", TW.legend([["اليوم", "brand"], ["أمس (متقطع)", "teal"]]))}${pulse}${sectionNote(`حتى الساعة ${curH}:00 · اليوم ${num(sum(hrs.map((h) => H.hourly[h] || 0)))} طلب مقابل ${num(sum(hrs.map((h) => H.hourlyY[h] || 0)))} أمس لنفس الساعات.`)}</div>
      <div class="card">${hd("آخر الإجراءات الحساسة", "book", goBtn("سجل التدقيق", "/admin/audit", { cls: "sm ghost" }))}<div class="cmd-audit">${audit.map((a) => `<div><span class="muted">${clock(a.at)}</span><b>${esc(a.action)}</b><span class="mono">${esc(a.obj)}</span><span class="muted">${esc(a.who)} · ${esc(a.reason)}</span></div>`).join("") || `<p class="muted">لا يوجد.</p>`}</div></div>
    </div>
  </div>
  <div class="cmd-g2">
    <div class="card">${hd("الإيراد والمساهمة — آخر 30 يوم", "trend", TW.legend([["صافي الإيراد", "brand"], ["المساهمة", "accent"]]))}${rev}${sectionNote(`المساهمة لكل طلب اليوم ${money(k.cm / k.orders, 1)} مقابل متوسط 30 يوم ${money(cmAvg, 1)} ${k.cm / k.orders >= cmAvg ? chip("أعلى من المتوسط", "ok") : chip("أقل من المتوسط", "warn")}`)}</div>
    <div class="card">${hd("القمع — من الزيارة للطلب المتكرر", "filter", chip("آخر 30 يوم", "neutral"))}${TW.hbars(frows)}<div class="banner warn" style="margin-top:10px">${ic("alert", "ic sm")}<div>أكبر تسريب: <b>${esc(F[worstI - 1][0])} ← ${esc(F[worstI][0])}</b> — ${pct(worst)} بس بيكمّلوا. ${worstI === 3 ? "راجع رسوم التوصيل والحد الأدنى للسلة في الدفع." : "راجع الخطوة دي في تطبيق العميل."}</div></div></div>
  </div>
  <div class="card">${hd("اقتصاديات الطلب الواحد", "scale", `<div class="seg" role="tablist"><button class="${mode === "blend" ? "on" : ""}" data-act="ui" data-k="ueMode" data-v="blend">اليوم كله (${num(ue.n)} طلب)</button><button class="${mode === "live" ? "on" : ""}" data-act="ui" data-k="ueMode" data-v="live">الطلبات المباشرة فقط (${ue.liveN})</button></div>`)}
    <div class="cmd-ue"><div class="cmd-ue-k">${kpi("متوسط السلة (GMV)", money(ue.basket, 1), "قيمة البضاعة — أغلبها مستحق للتجار")}${kpi("مساهمة الطلب", money(ue.contribution, 2), `حد أدنى مقبول ${money(S.rules.minContribution)} (Guardrail A)`, { tone: ue.contribution < S.rules.minContribution ? "bad" : "ok" })}${kpi("هامش المساهمة من السلة", pct(ue.contribution / (ue.basket || 1), 1), "المساهمة ÷ GMV")}</div>
    <div>${TW.legend([["إيراد", "teal"], ["تكلفة", "accent"], ["المساهمة", "brand"]])}${waterfall(ue)}${sectionNote(mode === "live" ? `متوسط ${ue.liveN} طلب مباشر محسوب من دفتر كل طلب (TW.ledger).` : `${num(ue.baseN)} طلب من سجل اليوم بمتوسطات مسجّلة + ${ue.liveN} طلب مباشر من دفتر كل طلب. ج.م لكل طلب.`)}</div></div></div>`;
}

/* ================================================================ LIVE OPERATIONS ("live") ================================================================ */
const KCOLS = [["CONFIRMED", ["PAYMENT_PENDING", "CONFIRMED"], "مؤكد / بانتظار الدفع"], ["MERCHANT_ISSUE", ["MERCHANT_ISSUE"]], ["PREPARING", ["PREPARING"]], ["AWAITING_CUSTOMER_DECISION", ["AWAITING_CUSTOMER_DECISION"], "بانتظار قرار البديل"], ["READY", ["READY"]], ["SCHEDULED", ["SCHEDULED"], "على رحلة القرية"], ["RIDER_ASSIGNED", ["RIDER_ASSIGNED"], "مندوب رايح يستلم"], ["IN_TRANSIT", ["IN_TRANSIT"]], ["ARRIVED", ["ARRIVED"]], ["DELIVERY_FAILED", ["DELIVERY_FAILED", "RETURN_TO_ORIGIN", "PARTIALLY_DELIVERED"], "فشل / مرتجع / جزئي"]];
function liveOps(inst) {
  const S = S_(), al = TW.alerts(), t = now();
  const worst = {}; al.forEach((a) => { if (a.orderId && (!worst[a.orderId] || SEV_RANK[a.sev] < SEV_RANK[worst[a.orderId].sev])) worst[a.orderId] = a; });
  const active = S.orders.filter((o) => !DONE.includes(o.status));
  const zf = inst.ui.loZone || "all";
  const shown = active.filter((o) => zf === "all" || o.zoneId === zf);
  const deliveredHr = S.orders.filter((o) => o.status === "DELIVERED" && o.deliveredAt && t - o.deliveredAt < 3600000).length;
  const tasksOpen = S.tasks.filter((x) => !["DELIVERED", "CANCELLED", "RETURNED"].includes(x.status));
  const hubQ = S.fos.filter((f) => f.sourceType === "hub" && ["QUEUED", "PICKING"].includes(f.status));
  const hubPacked = S.fos.filter((f) => f.sourceType === "hub" && f.status === "PACKED");
  const online = S.riders.filter((r) => r.status !== "offline"), busyN = online.filter(riderBusy).length;
  const card = (o) => {
    const c = custOf(o), a = worst[o.id], last = o.events.length ? o.events[o.events.length - 1].at : o.createdAt;
    const fos = S.fos.filter((f) => f.orderId === o.id && !["REROUTED"].includes(f.status));
    return `<div class="kcard cmd-kc ${a ? `sev-${a.sev}` : ""}" data-act="open-order" data-id="${o.id}" role="button" tabindex="0" aria-label="الطلب ${o.id}">
      <div class="row between"><b class="mono">${o.id}</b><span class="muted" ${tip("عمر الطلب")}>${since(o.createdAt)}</span></div>
      <div class="cmd-kc-s">${esc(c ? c.ar : "")} · ${esc(orderZone(o))}</div>
      <div class="row wrap gap4">${fos.map((f) => `<span class="cmd-src" ${tip(`${f.name} — ${TW.stLabel("fo", f.status)}`)}>${ic(f.sourceType === "hub" ? "building" : "store", "ic xs")}${esc(f.name.split(" ").slice(0, 2).join(" "))}</span>`).join("")}</div>
      <div class="row between cmd-kc-f"><span>${A.st("fin", o.fin)}</span><span class="num">${money(o.totals.total)}</span></div>
      <div class="cmd-kc-st muted">في الحالة ${since(last)}</div>
      ${a ? `<div class="cmd-kc-a">${sev(a.sev)}<span>${esc(a.problem)}</span></div>` : ""}</div>`;
  };
  const cols = KCOLS.map(([key, sts, label]) => { const list = shown.filter((o) => sts.includes(o.status)).sort((a, b) => a.createdAt - b.createdAt); return `<div class="kc ${list.length ? "" : "cmd-kc-empty"}"><b><span>${esc(label || TW.stLabel("order", key))}</span><span class="chip ${list.some((o) => worst[o.id] && worst[o.id].sev === "critical") ? "t-bad" : list.length ? "t-info" : ""}">${list.length}</span></b>${list.map(card).join("") || `<span class="muted cmd-note">لا يوجد</span>`}</div>`; }).join("");
  const zones = S.zones.filter((z) => z.active);
  const zRows = zones.map((z) => { const tk = tasksOpen.filter((x) => x.drop.zoneId === z.id); const rz = online.filter((r) => r.zoneId === z.id); const free = rz.filter((r) => riderAvail(r)).length; const st = S.hist.zoneStats[z.id] || {}; return `<tr><td><b>${esc(z.ar)}</b><span class="sub">${esc(D.zoneType[z.type])} · ${z.route === "scheduled" ? "رحلات مجدولة" : z.route === "batched" ? "تجميع رحلات" : "عند الطلب"}</span></td><td class="n num">${tk.length} / ${z.cap}</td><td style="min-width:120px">${meter(tk.length, z.cap)}</td><td class="n num">${rz.length} <span class="muted">(${free} متاح)</span></td><td class="n num">${z.sla[0]}–${z.sla[1]} د</td><td class="n num">${st.onTime ? pct(st.onTime) : "—"}</td></tr>`; }).join("");
  const routes = zones.filter((z) => z.route === "scheduled").map((z) => { const ts = S.tasks.filter((x) => x.status === "SCHEDULED" && x.drop.zoneId === z.id); const ready = ts.filter((x) => x.foIds.every((fid) => ["PACKED", "READY"].includes((find(S.fos, fid) || {}).status))).length; const hNow = new Date().getHours(); const next = z.windows.find((w) => Number(w.split(":")[0]) >= hNow) || z.windows[0]; return `<div class="li"><div class="grow"><b>${esc(z.ar)}</b><span class="sub muted">الرحلة الجاية ${esc(next)} · ${z.windows.length} رحلات/يوم</span></div><span class="num">${ts.length} طلب</span>${chip(`${ready} جاهز`, ready === ts.length && ts.length ? "ok" : "warn")}<span class="num muted">${money(sum(ts, (x) => x.cod))} كاش</span></div>`; }).join("");
  return `${A.head("العمليات المباشرة", "Live Operations · كل الطلبات الشغالة حسب الحالة التشغيلية", `<select class="input cmd-sel" data-model="loZone" aria-label="المنطقة"><option value="all">كل المناطق</option>${zones.map((z) => `<option value="${z.id}" ${zf === z.id ? "selected" : ""}>${esc(z.ar)}</option>`).join("")}</select>${goBtn("برج التحكم", "/admin/control-tower", { icon: "alert" })}`)}
  <div class="cmd-kpis">${kpi("طلبات شغالة", num(active.length), `${shown.length} في الفلتر الحالي`)}${kpi("اتسلّم آخر ساعة", num(deliveredHr), "تسليم مؤكد بـ OTP")}${kpi("مهام توصيل مفتوحة", num(tasksOpen.length), `${S.tasks.filter((x) => x.status === "NO_RIDER").length} بدون مندوب`, { tone: S.tasks.some((x) => x.status === "NO_RIDER") ? "bad" : "" })}${kpi("طابور التجميع في الهب", num(hubQ.length), `${hubPacked.length} متغلف بانتظار مندوب`, { act: "go", data: { to: "/admin/picking" } })}${kpi("مناديب أونلاين", `${online.length}`, `${busyN} في مهمة · ${online.length - busyN} متاح`, { act: "go", data: { to: "/admin/dispatch" } })}${kpi("تنبيهات تحتاج تدخل", num(al.length), `${al.filter((a) => a.sev === "critical").length} حرج`, { tone: al.some((a) => a.sev === "critical") ? "bad" : "", act: "go", data: { to: "/admin/control-tower" } })}</div>
  <div class="card cmd-flush">${hd("لوحة الحالات التشغيلية", "layers", `<span class="muted cmd-note">الشريط الملوّن = أعلى تنبيه على الطلب · اضغط الكارت لفتح الطلب</span>`)}<div class="kanban cmd-kanban" data-hl="ops-kanban">${cols}</div></div>
  <div class="cmd-g21">
    <div class="card">${hd("سعة المناطق الآن", "map", chip("مهام نشطة / الطاقة", "neutral"))}<div class="tw"><table class="tbl"><thead><tr><th>المنطقة</th><th class="n">مهام / طاقة</th><th>الإشغال</th><th class="n">مناديب</th><th class="n">SLA</th><th class="n">في الموعد</th></tr></thead><tbody>${zRows}</tbody></table></div></div>
    <div class="col gap12">
      <div class="card">${hd("طابور التجميع — هب توّا", "scan", goBtn("التجميع", "/admin/picking", { cls: "sm ghost" }))}${hubQ.length ? `<div class="list">${hubQ.map((f) => `<div class="li"><span class="mono">${f.orderId}</span><span class="grow">${A.st("fo", f.status)} ${f.exception ? chip(f.exception.code, "bad") : ""}</span><span class="muted">${esc(f.picker || "—")}</span>${f.pickStart ? until(f.pickStart + S.rules.pickSlaMin * MIN, 2 * MIN) : since(f.createdAt)}</div>`).join("")}</div>` : `<p class="muted">الطابور فاضي.</p>`}${sectionNote(`SLA التجميع ${S.rules.pickSlaMin} د (P11) · ${D.hubs[0].pickers} مجمّعين في الوردية.`)}</div>
      <div class="card">${hd("رحلات القرى المجدولة", "route", goBtn("تخطيط الرحلات", "/admin/routes", { cls: "sm ghost" }))}<div class="list">${routes || `<p class="muted">لا توجد رحلات.</p>`}</div></div>
    </div>
  </div>
  <div class="card">${hd("المناديب", "bike", `<span class="row gap4">${chip(`${online.length - busyN} متاح`, "ok")}${chip(`${busyN} في مهمة`, "accent")}${chip(`${S.riders.length - online.length} أوفلاين`, "neutral")}</span>`)}<div class="cmd-riders">${S.riders.map((r) => { const tk = r.task && find(S.tasks, r.task); return `<div class="cmd-rc" data-act="open-rider" data-id="${r.id}" role="button" tabindex="0"><div class="row between"><b>${esc(r.ar)}</b>${r.status === "offline" ? chip("أوفلاين", "neutral") : r.cash >= r.limit ? chip("فوق حد الكاش", "bad") : riderBusy(r) ? chip("في مهمة", "accent") : chip("متاح", "ok")}</div><div class="muted cmd-kc-s">${esc(D.vehicles[r.vehicle])} · ${esc(A.zone(r.zoneId))}${tk ? ` · <span class="mono">${tk.orderId}</span> ${esc(TW.stLabel("task", tk.status))}` : ""}</div><div class="row gap4"><span class="grow">${meter(r.cash, r.limit)}</span><span class="num cmd-kc-s">${num(r.cash)}/${num(r.limit)}</span></div></div>`; }).join("")}</div></div>`;
}

/* ================================================================ CONTROL TOWER ("control-tower") ================================================================ */
function ctFilter(inst, all) {
  const f = { sev: inst.ui.ctSev || "all", owner: inst.ui.ctOwner || "all", zone: inst.ui.ctZone || "all" };
  return { f, rows: all.filter((a) => (f.sev === "all" || a.sev === f.sev) && (f.owner === "all" || a.owner === f.owner) && (f.zone === "all" || alertZone(a) === f.zone)) };
}
function ctStrip(all, f) {
  const t = now(), c = (s) => all.filter((a) => a.sev === s).length, breached = all.filter((a) => a.slaAt && a.slaAt < t).length;
  return `<div class="cmd-strip">${["critical", "high", "medium"].map((s) => `<button class="cmd-sc s-${s} ${f.sev === s ? "on" : ""}" data-act="ui" data-k="ctSev" data-v="${f.sev === s ? "all" : s}" aria-pressed="${f.sev === s}"><span>${SEV_AR[s]}</span><b class="num">${c(s)}</b></button>`).join("")}<div class="cmd-sc"><span>تجاوز SLA</span><b class="num ${breached ? "neg" : ""}">${breached}</b></div><div class="cmd-sc"><span>فلوس معرّضة للخطر</span><b class="num">${money(sum(all, (a) => a.money))}</b></div></div>`;
}
function ctFull(inst) {
  const S = S_(), all = TW.alerts(), { f, rows } = ctFilter(inst, all);
  const owners = [...new Set(all.map((a) => a.owner))], zones = S.zones.filter((z) => z.active);
  const aud = S.audit.filter((a) => a.role !== "system").slice(0, 8);
  const tbl = `<div class="tw"><table class="tbl cmd-ct" data-hl="ct-table"><thead><tr><th>الخطورة</th><th>الطلب</th><th>المشكلة</th><th>في الحالة</th><th>SLA</th><th>المسؤول</th><th>المكان</th><th class="n">المعرّض للخطر</th><th>الإجراء التالي</th></tr></thead><tbody>${rows.length ? rows.map((a) => `<tr class="sev-${a.sev}"><td>${sev(a.sev)}<span class="sub mono">${esc(a.code)}</span></td><td>${alertWho(a)}</td><td class="cmd-prob"><b>${esc(a.problem)}</b></td><td>${since(a.since)}</td><td>${until(a.slaAt)}</td><td>${esc(a.owner)}</td><td>${esc(a.loc)}</td><td class="n num">${money(a.money)}</td><td class="cmd-act"><div class="cmd-nba">${ic("arrowL", "ic xs")} ${esc(a.action)}</div><div class="row wrap gap4">${alertActs(a)}</div></td></tr>`).join("") : `<tr><td colspan="9">${TW.empty(all.length ? "مفيش تنبيهات بالفلتر ده" : "كل حاجة ماشية", all.length ? "غيّر الفلتر أو امسحه" : "مفيش طلبات محتاجة تدخل دلوقتي", "check")}</td></tr>`}</tbody></table></div>`;
  return `${A.head("برج التحكم", "Control Tower · الطلبات اللي محتاجة تدخل بس — مرتبة: الخطورة ← أقرب SLA ← المبلغ", `<span class="chip t-info">${ic("clock", "ic xs")}مباشر</span>${goBtn("خريطة التوزيع", "/admin/dispatch", { icon: "map" })}`)}
  ${A.answer({ what: `${all.length} بند مفتوح يحتاج قرار`, attention: `${all.filter((a) => a.sev === "critical").length} حرج · ${all.filter((a) => a.slaAt < now()).length} تجاوز SLA`, owner: owners.slice(0, 3).map(esc).join("، ") || "—", risk: money(sum(all, (a) => a.money)) })}
  ${ctStrip(all, f)}
  <div class="filters"><span class="lbl">فلترة</span><div class="seg" role="tablist">${[["all", "الكل"], ["critical", "حرج"], ["high", "عالي"], ["medium", "متوسط"]].map(([v, l]) => `<button class="${f.sev === v ? "on" : ""}" data-act="ui" data-k="ctSev" data-v="${v}">${l}</button>`).join("")}</div>
    <select class="input" data-model="ctOwner" aria-label="المسؤول"><option value="all">كل المسؤولين</option>${owners.map((o) => `<option ${f.owner === o ? "selected" : ""} value="${esc(o)}">${esc(o)}</option>`).join("")}</select>
    <select class="input" data-model="ctZone" aria-label="المنطقة"><option value="all">كل المناطق</option>${zones.map((z) => `<option value="${z.id}" ${f.zone === z.id ? "selected" : ""}>${esc(z.ar)}</option>`).join("")}</select>
    ${f.sev !== "all" || f.owner !== "all" || f.zone !== "all" ? btn("امسح الفلتر", "ct-reset", { cls: "sm ghost", icon: "x" }) : ""}<span class="muted grow cmd-r">${rows.length} من ${all.length}</span></div>
  <div class="card cmd-flush">${tbl}</div>
  <div class="card">${hd("آخر التدخلات اليدوية (سجل التدقيق)", "book", goBtn("سجل التدقيق الكامل", "/admin/audit", { cls: "sm ghost" }))}<div class="tw"><table class="tbl"><thead><tr><th>الوقت</th><th>من</th><th>الإجراء</th><th>العنصر</th><th>قبل ← بعد</th><th>السبب</th></tr></thead><tbody>${aud.map((a) => `<tr><td class="num">${clock(a.at)}</td><td>${esc(a.who)}<span class="sub">${esc(a.role)}</span></td><td>${esc(a.action)}</td><td class="mono">${esc(a.obj)}</td><td>${esc(a.old)} ← ${esc(a.nw)}</td><td>${esc(a.reason)}</td></tr>`).join("")}</tbody></table></div></div>`;
}
function ctCompact(inst) {
  const all = TW.alerts(), { f, rows } = ctFilter(inst, all);
  return `<div class="cmd-ctc">
    <div class="cmd-ctc-h"><b>${ic("alert", "ic sm")} ${all.length} بند يحتاج تدخل</b><span class="muted">${money(sum(all, (a) => a.money))} معرّض للخطر</span></div>
    <div class="seg cmd-ctc-seg" role="tablist">${[["all", "الكل", all.length], ["critical", "حرج", all.filter((a) => a.sev === "critical").length], ["high", "عالي", all.filter((a) => a.sev === "high").length], ["medium", "متوسط", all.filter((a) => a.sev === "medium").length]].map(([v, l, n]) => `<button class="${f.sev === v ? "on" : ""}" data-act="ui" data-k="ctSev" data-v="${v}">${l} <span class="num">${n}</span></button>`).join("")}</div>
    <div class="cmd-ctc-l" data-hl="ct-table">${rows.map((a) => `<div class="cmd-al sev-${a.sev}"><div class="cmd-al-h">${sev(a.sev)}<span class="mono muted">${esc(a.code)}</span><span class="grow">${alertWho(a)}</span><span class="cmd-al-t" ${tip("الوقت المتبقي على SLA")}>${ic("clock", "ic xs")}${until(a.slaAt)}</span></div><div class="cmd-al-p">${esc(a.problem)}</div><div class="cmd-al-m"><span>${ic("user", "ic xs")} ${esc(a.owner)}</span><span>${ic("pin", "ic xs")} ${esc(a.loc)}</span><span class="num">${money(a.money)}</span><span class="muted">في الحالة ${since(a.since)}</span></div><div class="cmd-nba">${ic("arrowL", "ic xs")} ${esc(a.action)}</div><div class="row wrap gap4">${alertActs(a)}</div></div>`).join("") || TW.empty("كل حاجة ماشية", "مفيش تنبيهات بالفلتر ده", "check")}</div></div>`;
}

/* ================================================================ DISPATCH MAP ("dispatch") ================================================================ */
function dispatchPage(inst) {
  const S = S_(), t = now();
  const active = S.tasks.filter((x) => ["WAITING", "OFFERED", "NO_RIDER", "ASSIGNED", "AT_PICKUP", "PICKED_UP", "ARRIVED", "RTO"].includes(x.status) && !(find(S.orders, x.orderId) || {}).hold);
  const unassigned = S.tasks.filter((x) => ["WAITING", "OFFERED", "NO_RIDER"].includes(x.status)).sort((a, b) => (b.status === "NO_RIDER") - (a.status === "NO_RIDER") || (a.readySince || a.createdAt) - (b.readySince || b.createdAt));
  const ord = (x) => find(S.orders, x.orderId) || {};
  const late = active.filter((x) => { const o = ord(x); return o.etaAt && o.etaAt < t && o.mode !== "scheduled"; }).concat(S.tasks.filter((x) => x.status === "ASSIGNED" && x.pickupBy && x.pickupBy < t)).filter((x, i, arr) => arr.indexOf(x) === i);
  const risk = active.filter((x) => { const o = ord(x); return !late.includes(x) && o.etaAt && o.etaAt - t < 10 * MIN && o.etaAt >= t && !["PICKED_UP", "ARRIVED"].includes(x.status); });
  const avail = S.riders.filter(riderAvail);
  const sel = inst.ui.dspRider && find(S.riders, inst.ui.dspRider);
  const taskRow = (x, extra = "") => { const o = ord(x); return `<div class="cmd-dt"><div class="row between"><span>${A.orderLink(x.orderId)} <span class="mono muted">${x.id}</span></span>${A.st("task", x.status)}</div><div class="cmd-kc-s muted">${esc(x.pickups.map((p) => p.name).join(" + "))} ← ${esc(A.zone(x.drop.zoneId))} · ${num(x.km, 1)} كم${x.cod ? ` · كاش ${money(x.cod)}` : ""}${x.handling.length ? ` · ${x.handling.map((h) => ({ chilled: "مبرد", frozen: "مجمد", hot: "ساخن", fragile: "قابل للكسر" }[h] || h)).join("، ")}` : ""}</div><div class="row between">${extra || `<span class="muted cmd-kc-s">منتظر ${since(x.readySince || x.createdAt)}</span>`}<span class="row gap4">${["WAITING", "OFFERED", "NO_RIDER", "ASSIGNED"].includes(x.status) ? A.permBtn("dispatch.assign", "إسناد", "assign", { cls: "sm", icon: "bike", data: { task: x.id } }) : ""}${x.status === "NO_RIDER" ? btn("أعد العرض", "reoffer", { cls: "sm ghost", data: { task: x.id } }) : ""}</span></div></div>`; };
  const selCard = sel ? (() => { const tk = sel.task && find(S.tasks, sel.task); return `<div class="card cmd-sel-r">${hd(`${esc(sel.ar)} <span class="muted mono">${sel.id}</span>`, "bike", btn("", "ui", { cls: "sm ghost icon", icon: "x", data: { k: "dspRider", v: "null" }, title: "إغلاق" }))}
    <dl class="kv"><dt>المركبة</dt><dd>${esc(D.vehicles[sel.vehicle])} · ${esc(sel.plate)}</dd><dt>المنطقة</dt><dd>${esc(A.zone(sel.zoneId))}</dd><dt>الحالة</dt><dd>${sel.status === "offline" ? chip("أوفلاين", "neutral") : riderBusy(sel) ? chip("في مهمة", "accent") : chip("متاح", "ok")} · تقييم ${num(sel.rating, 1)}</dd><dt>الكاش</dt><dd><div class="row gap4"><span class="grow">${meter(sel.cash, sel.limit)}</span><span class="num">${money(sel.cash)} / ${money(sel.limit)}</span></div></dd><dt>المهمة الحالية</dt><dd>${tk ? `${A.orderLink(tk.orderId)} ${A.st("task", tk.status)}<span class="sub muted">${esc(tk.pickups.map((p) => p.name).join(" + "))} ← ${esc(tk.drop.landmark)}</span>` : "—"}</dd><dt>اليوم</dt><dd>${sel.jobsToday} مهمة · ${money(sel.earnToday)} · في الموعد ${pct(sel.onTime)}</dd></dl>
    ${unassigned.length ? `<div class="lbl" style="margin-top:8px">الأهلية للمهام اللي بدون مندوب</div><div class="list">${unassigned.map((x) => { const el = TW.riderEligibility(sel, x); return `<div class="li"><span class="mono">${x.orderId}</span><span class="grow">${el.ok ? chip("مؤهل", "ok") : el.soft ? chip(el.why, "warn") : chip(el.why, "bad")}</span>${el.ok || el.soft ? (TW.can("dispatch.assign") ? btn("أسند له", "dsp-assign", { cls: "sm", data: { task: x.id, rider: sel.id } }) : A.locked("dispatch.assign")) : ""}</div>`; }).join("")}</div>` : ""}
    <div class="row" style="margin-top:8px">${btn("ملف المندوب الكامل", "open-rider", { cls: "sm ghost", icon: "user", data: { id: sel.id } })}</div></div>`; })() : "";
  const zones = S.zones.filter((z) => z.active).map((z) => { const n = active.filter((x) => x.drop.zoneId === z.id).length; const rz = S.riders.filter((r) => r.zoneId === z.id && r.status !== "offline").length; return `<div class="hb"><span class="hb-l">${esc(z.ar)}</span><span class="hb-t"><i class="${n / (z.cap || 1) >= 0.8 ? "b-bad" : "b-teal"}" style="width:${Math.min(100, (n / (z.cap || 1)) * 100).toFixed(1)}%"></i></span><span class="hb-v num">${n}/${z.cap} <small>${rz} مندوب</small></span></div>`; }).join("");
  return `${A.head("خريطة التوزيع", "Dispatch Map · المناديب والاستلامات والمسارات النشطة · التدخل اليدوي بسبب إلزامي", `${chip(`${unassigned.length} بدون مندوب`, unassigned.some((x) => x.status === "NO_RIDER") ? "bad" : unassigned.length ? "warn" : "ok")}${chip(`${avail.length} مندوب متاح`, avail.length ? "ok" : "bad")}`)}
  <div class="cmd-dsp">
    <div class="col gap12"><div class="card cmd-mapcard" data-hl="dispatch-map">${A.map({ tasks: active, riderAct: "dsp-rider", taskAct: "open-order", labels: true, big: true })}
      <div class="cmd-legend">${legendDot("ld-free", "مندوب متاح")}${legendDot("ld-busy", "في مهمة")}${legendDot("ld-bad", "فوق حد الكاش")}${legendDot("ld-off", "أوفلاين")}${legendDot("ld-hub", "هب توّا")}${legendDot("ld-mer", "تاجر")}${legendDot("ld-cust", "عميل (التسليم)")}${legendDot("ld-route", "مسار نشط")}</div>
      ${sectionNote("اضغط على مندوب لعرض مهمته والكاش والأهلية — اضغط على نقطة العميل لفتح الطلب. المحرك بيرشّح حسب: المسافة، المركبة، المناولة، جاهزية التاجر، وعد العميل، وحد الكاش.")}</div>
      <div class="card">${hd("السعة لكل منطقة", "layers", chip("مهام نشطة / الطاقة", "neutral"))}<div class="hbars">${zones}</div></div></div>
    <div class="col gap12 cmd-dsp-side">${selCard}
      <div class="card">${hd("بدون مندوب", "inbox", chip(String(unassigned.length), unassigned.length ? "warn" : "ok"))}${unassigned.map((x) => taskRow(x)).join("") || `<p class="muted">كل المهام الجاهزة اتسندت.</p>`}</div>
      <div class="card">${hd("متأخر", "clock", chip(String(late.length), late.length ? "bad" : "ok"))}${late.map((x) => taskRow(x, `<span class="cmd-kc-s">الوعد ${ord(x).etaAt ? until(ord(x).etaAt) : until(x.pickupBy)}</span>`)).join("") || `<p class="muted">مفيش تأخير.</p>`}</div>
      <div class="card">${hd("معرّض للتأخير (أقل من 10 د على الوعد)", "alert", chip(String(risk.length), risk.length ? "warn" : "ok"))}${risk.map((x) => taskRow(x, `<span class="cmd-kc-s">باقي ${until(ord(x).etaAt)}</span>`)).join("") || `<p class="muted">لا يوجد.</p>`}</div>
      <div class="card">${hd("مناديب متاحين", "bike", chip(String(avail.length), avail.length ? "ok" : "bad"))}<div class="list">${avail.map((r) => `<div class="li click" data-act="dsp-rider" data-id="${r.id}" role="button" tabindex="0"><div class="grow"><b>${esc(r.ar)}</b><span class="sub muted cmd-kc-s">${esc(D.vehicles[r.vehicle])} · ${esc(A.zone(r.zoneId))}</span></div><div style="width:110px">${meter(r.cash, r.limit)}<span class="num cmd-kc-s">${num(r.cash)}/${num(r.limit)}</span></div></div>`).join("") || `<p class="muted">مفيش مناديب متاحين.</p>`}</div></div>
    </div>
  </div>`;
}

/* ================================================================ SUPPORT CASES ("cases") ================================================================ */
function casesPage(inst) {
  const S = S_(), me = TW.actor.admin().name, t = now();
  const f = { st: inst.ui.csSt || "open", pr: inst.ui.csPr || "all", own: inst.ui.csOwn || "all", ty: inst.ui.csTy || "all" };
  const types = [...new Set(S.cases.map((c) => c.type))];
  const rows = S.cases.filter((c) => (f.st === "all" || (f.st === "open" ? c.status !== "RESOLVED" : c.status === f.st)) && (f.pr === "all" || c.priority === f.pr) && (f.ty === "all" || c.type === f.ty) && (f.own === "all" || (f.own === "me" ? c.owner === me : !c.owner)))
    .sort((a, b) => (a.status === "RESOLVED") - (b.status === "RESOLVED") || SEV_RANK[a.priority] - SEV_RANK[b.priority] || a.slaAt - b.slaAt);
  const open = S.cases.filter((c) => c.status !== "RESOLVED");
  const claim = (c) => { const o = find(S.orders, c.orderId); return c.claim || sum(S.refunds.filter((r) => r.caseId === c.id && r.status === "PENDING_APPROVAL"), (r) => r.amount) || (c.type === "فرق في الكاش" ? Math.abs(sum(S.cod.filter((x) => x.orderId === c.orderId), (x) => x.variance)) : 0) || (o && c.type === "فشل التسليم" ? o.totals.total : 0); };
  const tr = (c) => { const o = find(S.orders, c.orderId), cu = find(S.customers, c.customerId); return `<tr class="click sev-${c.status === "RESOLVED" ? "low" : c.priority}" data-act="go" data-to="/admin/case/${c.id}" tabindex="0"><td><b class="mono">${c.id}</b><span class="sub">${PRIO_AR[c.priority] || c.priority}</span></td><td>${esc(c.type)}</td><td>${A.orderLink(c.orderId)}</td><td>${esc(cu ? cu.ar : "—")}${cu && cu.codFails >= S.rules.codFailBlock ? ` ${chip("خطر COD", "bad")}` : ""}</td><td>${c.owner ? esc(c.owner) : chip("بدون مسؤول", "warn")}</td><td>${chBadge(c.channel)}</td><td>${c.status === "RESOLVED" ? `<span class="muted">${clock(c.resolvedAt || t)}</span>` : until(c.slaAt, 30 * MIN)}</td><td>${caseStatus(c.status)}</td><td class="n num">${claim(c) ? money(claim(c)) : "—"}</td><td>${o ? A.st("order", o.status) : ""}</td></tr>`; };
  const sel = (k, opts, v, label) => `<select class="input" data-model="${k}" aria-label="${label}">${opts.map(([val, l]) => `<option value="${esc(val)}" ${v === val ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  return `${A.head("حالات الدعم", "Support Cases · كل شكوى مربوطة بطلب وطرف مسؤول وسقف تعويض", `${goBtn("طابور الاتصالات", "/admin/queue", { icon: "phone" })}`)}
  ${A.answer({ what: `${open.length} حالة مفتوحة`, attention: `${open.filter((c) => !c.owner).length} بدون مسؤول · ${open.filter((c) => c.slaAt - t < 60 * MIN).length} SLA أقل من ساعة`, owner: [...new Set(open.map((c) => c.owner).filter(Boolean))].map(esc).join("، ") || "—", risk: money(sum(open, claim)) })}
  <div class="cmd-kpis">${kpi("مفتوحة", num(open.length), `${open.filter((c) => c.priority === "high").length} أولوية عالية`)}${kpi("بدون مسؤول", num(open.filter((c) => !c.owner).length), "تظهر في الطابور", { tone: open.some((c) => !c.owner) ? "warn" : "" })}${kpi("بانتظار موافقة", num(open.filter((c) => c.status === "PENDING_APPROVAL").length), "استرداد / تعويض فوق الحد", { act: "go", data: { to: "/admin/compensation" } })}${kpi("اتحلّت اليوم", num(S.cases.filter((c) => c.status === "RESOLVED").length), "من كل الحالات المسجلة")}${kpi("متوسط عمر المفتوح", open.length ? dur(sum(open, (c) => t - c.createdAt) / open.length) : "—", "ساعات:دقائق")}</div>
  <div class="filters"><span class="lbl">فلترة</span>${sel("csSt", [["open", "المفتوحة"], ["all", "الكل"], ["OPEN", "مفتوحة"], ["INVESTIGATING", "قيد التحقيق"], ["PENDING_APPROVAL", "بانتظار موافقة"], ["RESOLVED", "محلولة"]], f.st, "الحالة")}${sel("csPr", [["all", "كل الأولويات"], ["high", "عالية"], ["medium", "متوسطة"]], f.pr, "الأولوية")}${sel("csTy", [["all", "كل الأنواع"], ...types.map((x) => [x, x])], f.ty, "النوع")}${sel("csOwn", [["all", "كل المسؤولين"], ["me", "حالاتي"], ["none", "بدون مسؤول"]], f.own, "المسؤول")}<span class="muted grow cmd-r">${rows.length} حالة</span></div>
  <div class="card cmd-flush"><div class="tw"><table class="tbl"><thead><tr><th>الحالة</th><th>النوع</th><th>الطلب</th><th>العميل</th><th>المسؤول</th><th>القناة</th><th>SLA</th><th>الوضع</th><th class="n">المطالبة</th><th>حالة الطلب</th></tr></thead><tbody>${rows.map(tr).join("") || `<tr><td colspan="10">${TW.empty("مفيش حالات بالفلتر ده", "", "inbox")}</td></tr>`}</tbody></table></div></div>`;
}

/* ================================================================ CASE 360 ("case") ================================================================ */
const FLOW_GUIDE = {
  "صنف ناقص": ["راجع تحقق التغليف: عدد البنود الممسوحة مقابل المتوقع", "راجع مسح الاستلام عند كل مصدر وعدد الطرود", "راجع إثبات التسليم (OTP + GPS)", "الاسترداد على البند الناقص فقط — من دفتر الطلب"],
  "صنف غلط": ["قارن الباركود الممسوح بالمطلوب", "اطلب صورة من العميل", "استرداد أو استبدال مع أقرب طلب"],
  "صنف تالف": ["اطلب صورة الطرد من العميل", "راجع متطلبات المناولة (مبرد/قابل للكسر) وتغليفها", "الطرف المسؤول = آخر نقطة تحكم قبل الاستلام"],
  "التوصيل اتأخر": ["قارن وقت الجاهزية بـ SLA التاجر/الهب", "قارن وقت الاستلام والتسليم بوعد العميل", "كوبون حسب السياسة فقط — مفيش خصم مفتوح"],
  "شكوى من المندوب": ["راجع تقييم المندوب وسجل التواصل والـ GPS", "سجّل الواقعة على ملف المندوب — لا تعويض نقدي بدون تحقق", "حوّل لمشرف المناديب لو سلوك"],
  "شكوى من التاجر": ["راجع قائمة التجهيز وعلامات التاجر", "اتصل بالتاجر وسجّل الرد", "أي خصم على التاجر بيظهر في تسويته ببند مفسّر"],
  "فرق في الكاش": ["قارن المتوقع على المهمة بالمحصّل", "راجع سبب الفرق اللي سجّله المندوب وأي عرض مطبّق", "حدد الطرف المسؤول من شاشة الكاش (EX-COD-003)"],
  "استرداد": ["لازم: طلب + بند + سبب + طرف مسؤول + دليل (Guardrail H)", "مستوى الموافقة بيتحدد تلقائياً من المبلغ"],
  "إلغاء": ["لو التجهيز بدأ: الإلغاء بموافقة الدعم فقط (BR-CAN-002)", "الإلغاء بيحرر المخزون ويرجّع أي مبلغ أونلاين تلقائياً"],
  "مش قادر أكلم المندوب": ["شوف رقم المندوب وحالة المهمة وآخر موقع", "اتصل بالمندوب من الكنترول ثم بلّغ العميل بالوقت المتوقع"],
  "فشل التسليم": ["راجع محاولات التواصل (اتصالين + واتساب) ومهلة الانتظار (BR-ARR-001)", "قرر: إعادة محاولة أو إرجاع للمصدر — الأكل السخن مينفعش يتعاد (BR-FAIL-002)"],
  "سبب آخر": ["سجّل التفاصيل في ملاحظات الحالة", "اختار المسار الأقرب لو اتضح النوع"],
};
function custodyChain(o) {
  const S = S_(), fos = S.fos.filter((f) => f.orderId === o.id && f.status !== "REROUTED"), tasks = S.tasks.filter((x) => x.orderId === o.id && x.status !== "CANCELLED");
  const node = (tone, title, lines) => `<div class="cmd-cu-n t-${tone}"><span class="cmd-cu-b">${ic(tone === "ok" ? "check" : tone === "bad" ? "alert" : tone === "warn" ? "info" : "clock", "ic xs")}</span><div><b>${title}</b>${lines.map((l) => `<div class="cmd-cu-l">${l}</div>`).join("")}</div></div>`;
  let breakAt = null; const nodes = [];
  fos.forEach((f) => {
    const ls = o.lines.filter((l) => l.foId === f.id);
    if (f.sourceType === "hub") {
      const pc = f.packCheck; const tone = pc ? (pc.scanned < pc.expected || pc.override ? "bad" : "ok") : "warn";
      if (tone !== "ok" && !breakAt) breakAt = "محطة التغليف في الهب";
      nodes.push(node(tone, `تجميع وتغليف — ${esc(f.name)} <span class="mono muted">${f.id}</span>`, [`المجمّع: ${esc(f.picker || "وليد فتحي")} · بدأ ${f.pickStart ? clock(f.pickStart) : "—"} · اتغلف ${f.readyAt ? clock(f.readyAt) : "—"}`, `بنود ممسوحة: ${ls.filter((l) => l.picked).length}/${ls.length}${pc ? ` · تحقق التغليف <b class="num">${pc.scanned}/${pc.expected}</b> ${pc.override ? `${chip("تجاوز يدوي", "bad")} <span class="muted">${esc(pc.override)}</span>` : pc.scanned < pc.expected ? chip("ناقص", "bad") : chip("مطابق", "ok")}` : ` · ${chip("لا يوجد سجل تحقق تغليف", "warn")}`}`, ls.some((l) => l.handling && l.handling !== "normal") ? `مناولة: ${[...new Set(ls.map((l) => l.handling).filter((h) => h !== "normal"))].map((h) => ({ chilled: "مبرد — كيس بارد إلزامي", frozen: "مجمد", fragile: "قابل للكسر", hot: "ساخن", separate: "منفصل" }[h] || h)).join("، ")}` : ""].filter(Boolean)));
    } else {
      const marks = (f.items || []).filter((i) => i.mark); const miss = marks.filter((i) => i.mark === "missing").length;
      const tone = ["TIMEOUT", "REJECTED", "CANCELLED"].includes(f.status) ? "bad" : f.readyAt ? "ok" : "warn";
      nodes.push(node(tone, `تجهيز التاجر — ${esc(f.name)} <span class="mono muted">${f.id}</span>`, [`قبل ${f.acceptedAt ? clock(f.acceptedAt) : "—"}${f.acceptSec ? ` (خلال ${f.acceptSec} ث)` : ""} · جاهز ${f.readyAt ? clock(f.readyAt) : "—"}${f.prepBy ? ` · SLA ${clock(f.prepBy)}` : ""}`, `علامات التاجر: ${marks.length ? `${marks.length - miss} موجود · ${miss} غير موجود` : "كل البنود اتسلمت مختومة"} · كود الطرد <span class="mono">${esc(f.pickupCode)}</span>`]));
    }
  });
  tasks.forEach((x) => {
    const r = x.riderId && find(S.riders, x.riderId);
    x.pickups.forEach((p) => { const tone = p.scanned ? "ok" : x.pickupIssue ? "bad" : "pend"; if (tone === "bad" && !breakAt) breakAt = "الاستلام من المصدر"; nodes.push(node(tone, `مسح الاستلام — ${esc(p.name)} ← ${esc(r ? r.ar : "—")}`, [p.scanned ? `اتمسح ${clock(p.at)} · ${p.packages || 1} طرد · كود <span class="mono">${esc(p.code)}</span> مطابق (BR-PKP-001)` : x.pickupIssue ? `${chip(x.pickupIssue.type, "bad")} ${clock(x.pickupIssue.at)}` : "لسه متمسحش"])); });
    const pod = x.pod; const tone = pod ? (pod.otp && pod.gps ? "ok" : "bad") : x.status === "FAILED" ? "bad" : "pend";
    if (tone === "bad" && !breakAt) breakAt = "التسليم للعميل";
    nodes.push(node(tone, `إثبات التسليم — ${esc(x.drop.name)}`, [pod ? `OTP ${pod.otp ? "صحيح ✓" : "—"} · GPS ${pod.gps ? "داخل النطاق ✓" : "خارج النطاق"} · ${clock(pod.at || x.deliveredAt)}` : x.status === "FAILED" ? `فشل: ${esc(x.failReason || "")} · ${x.contact.length} محاولات تواصل` : `الحالة: ${esc(TW.stLabel("task", x.status))}`, x.collected != null || x.cod ? `كاش مطلوب ${money(x.cod)}${x.collected != null ? ` · محصّل ${money(x.collected)}` : ""}` : "مدفوع أونلاين"]));
  });
  return { html: `<div class="cmd-cu">${nodes.join("")}</div>`, breakAt };
}
function casePage(inst, [id]) {
  const S = S_(), cs = find(S.cases, id);
  if (!cs) return `${A.head("حالة غير موجودة", id)}<div class="card">${TW.empty("الحالة مش موجودة", id, "inbox")}${goBtn("كل الحالات", "/admin/cases")}</div>`;
  const o = find(S.orders, cs.orderId), c = find(S.customers, cs.customerId), me = TW.actor.admin().name;
  const flows = TW.REASONS.support.concat(TW.REASONS.support.includes(cs.type) ? [] : [cs.type]);
  const flow = inst.ui.caseFlow && inst.ui.caseFlow.id === cs.id ? inst.ui.caseFlow.type : cs.type;
  const rec = o ? TW.recommend(o, flow) : { party: "twaa", why: [], resolution: "مراجعة", maxComp: 0 };
  const fos = o ? S.fos.filter((f) => f.orderId === o.id) : [], tasks = o ? S.tasks.filter((x) => x.orderId === o.id) : [];
  const pay = o && S.payments.find((p) => p.orderId === o.id), cods = o ? S.cod.filter((x) => x.orderId === o.id) : [];
  const rfs = S.refunds.filter((r) => o && r.orderId === o.id);
  const prev = S.cases.filter((x) => x.customerId === cs.customerId && x.id !== cs.id);
  const custRefunds = S.refunds.filter((r) => { const oo = find(S.orders, r.orderId); return oo && oo.customerId === cs.customerId && r.reason !== "إلغاء الطلب"; });
  const claim = cs.claim || sum(rfs.filter((r) => r.status === "PENDING_APPROVAL"), (r) => r.items != null ? r.items : r.amount - (r.comp || 0)) || 0;
  const cap = (cs.recommendation && cs.recommendation.maxComp) || 0;
  const tier = tierOf(claim + Math.max(rec.maxComp, 0));
  const { html: chain, breakAt } = o ? custodyChain(o) : { html: "", breakAt: null };
  const L = o && TW.ledger(o);
  const riders = [...new Set(tasks.map((x) => x.riderId).filter(Boolean))].map((rid) => find(S.riders, rid));
  const flags = [];
  if (c) {
    if (c.codFails >= S.rules.codFailBlock) flags.push(chip(`رفض كاش ${c.codFails} مرات — COD مقيّد (BR-COD-002)`, "bad"));
    else if (c.codFails) flags.push(chip(`رفض كاش ${c.codFails} مرة`, "warn"));
    if (c.promoHeavy) flags.push(chip("معتمد على العروض", "warn"));
    if (prev.length >= 2 || custRefunds.length >= 2) flags.push(chip(`مطالبات متكررة (${prev.length} حالة · ${custRefunds.length} استرداد)`, "bad"));
    if (c.orders <= 2) flags.push(chip("عميل جديد", "info"));
    if (["ذهبي"].includes(c.tier)) flags.push(chip(`عميل ${c.tier} · LTV ${kmoney(c.ltv)}`, "ok"));
  }
  const isOpen = cs.status !== "RESOLVED";
  const caseAud = S.audit.filter((a) => [cs.id, ...rfs.map((r) => r.id), ...rfs.map((r) => r.approvalId).filter(Boolean), o && o.id].includes(a.obj) || (o && String(a.obj).includes(o.id))).slice(0, 10);
  const failTask = tasks.find((x) => x.status === "FAILED");
  const varCod = cods.find((x) => x.variance && !x.varianceResolved);
  const lateFo = fos.find((f) => ["AWAITING_ACCEPT", "PREPARING", "TIMEOUT"].includes(f.status) && f.sourceType === "merchant");
  /* flow-specific actions */
  const flowActs = [];
  if (failTask) flowActs.push(btn("إعادة محاولة التسليم", "fail-retry", { cls: "sm primary", icon: "refresh", data: { task: failTask.id } }), btn("إرجاع للمصدر", "fail-rto", { cls: "sm danger", icon: "undo", data: { task: failTask.id } }));
  if (varCod && ["فرق في الكاش"].includes(flow)) flowActs.push(btn(`سوِّ فرق الكاش ${money(varCod.variance)}`, "cod-fix", { cls: "sm primary", icon: "scale", data: { id: varCod.id } }));
  if (lateFo && ["التوصيل اتأخر", "شكوى من التاجر"].includes(flow)) flowActs.push(btn(`اتصل بـ ${lateFo.name}`, "call-merchant", { cls: "sm", icon: "phone", data: { fo: lateFo.id } }));
  if (flow === "شكوى من التاجر") fos.filter((f) => f.sourceType === "merchant").forEach((f) => flowActs.push(btn(`ملف ${f.name}`, "open-merchant", { cls: "sm ghost", icon: "store", data: { id: f.sourceId } })));
  if (["شكوى من المندوب", "مش قادر أكلم المندوب"].includes(flow)) riders.forEach((r) => flowActs.push(btn(`ملف ${r.ar}`, "open-rider", { cls: "sm ghost", icon: "bike", data: { id: r.id } })));
  if (flow === "إلغاء" && o && !DONE.includes(o.status)) flowActs.push(A.permBtn("orders.cancel", "إلغاء الطلب", "cancel-order", { cls: "sm danger", icon: "x", data: { id: o.id } }));
  if (["صنف ناقص", "صنف غلط", "صنف تالف", "استرداد", "منتهي الصلاحية"].includes(flow) && o) flowActs.push(A.permBtn("refund.create", "استرداد على البنود", "refund-open", { cls: "sm primary", icon: "undo", data: { id: o.id, case: cs.id } }));
  const tools = `${isOpen && cs.owner !== me ? btn(cs.owner ? `حوّلها ليّ (مع ${cs.owner})` : "خدها ليّ", "case-assign", { cls: "sm", icon: "hand", data: { id: cs.id } }) : ""}${isOpen && o ? A.permBtn("refund.create", "استرداد", "refund-open", { cls: "sm", icon: "undo", data: { id: o.id, case: cs.id } }) : ""}${isOpen ? (cap ? A.permBtn("comp.issue", "تعويض", "case-comp", { cls: "sm", icon: "gift", data: { id: cs.id } }) : `<button class="btn sm" disabled title="السياسة لا تسمح بتعويض نقدي لهذا النوع">${ic("lock", "ic sm")}<span>تعويض (غير مسموح للنوع)</span></button>`) : ""}${isOpen ? btn("إغلاق الحالة", "case-resolve", { cls: "sm primary", icon: "check", data: { id: cs.id } }) : ""}`;
  const rfTable = rfs.length ? `<div class="tw"><table class="tbl"><thead><tr><th>الرقم</th><th class="n">المبلغ</th><th>السبب</th><th>المسؤول</th><th>الحالة</th><th>القرار</th></tr></thead><tbody>${rfs.map((r) => { const ap = r.approvalId && find(S.approvals, r.approvalId); return `<tr><td class="mono">${esc(r.id)}<span class="sub">${esc(r.by || "")} · ${clock(r.at)}</span></td><td class="n num">${money(r.amount)}${r.comp ? `<span class="sub">منها تعويض ${money(r.comp)}</span>` : ""}</td><td>${esc(r.reason)}<span class="sub">${esc(r.evidence || "")}</span></td><td>${esc(TW.PARTY[r.party] || r.party)}</td><td>${refundStatus(r.status)}</td><td>${ap && ap.status === "PENDING" ? (TW.canApprove(ap) ? `<div class="row gap4">${btn("اعتمد", "approve", { cls: "sm primary", icon: "check", data: { id: ap.id } })}${btn("ارفض", "reject", { cls: "sm", icon: "x", data: { id: ap.id } })}</div><span class="sub">${esc(ap.id)} · مستوى ${esc(levelAr(ap.level))}</span>` : `<span class="lock">${ic("lock", "ic xs")}يحتاج «${esc(levelAr(ap.level))}»</span>`) : ap ? `<span class="muted">${esc(ap.approver || "")} ${ap.decidedAt ? clock(ap.decidedAt) : ""}</span>` : r.approvedBy ? `<span class="muted">${esc(r.approvedBy)}</span>` : "—"}</td></tr>`; }).join("")}</tbody></table></div>` : `<p class="muted">مفيش استردادات على الطلب ده.</p>`;
  return `<div class="cc-top"><button class="btn sm" data-act="go" data-to="/admin/cases">${ic("arrowR", "ic xs")}كل الحالات</button><h1>حالة <span class="mono">${esc(cs.id)}</span> — ${esc(cs.type)}<small>${o ? `الطلب ${esc(o.id)} · ` : ""}${esc(c ? c.ar : "")} · ${chBadge(cs.channel).replace(/<[^>]+>/g, "")} · اتفتحت ${clock(cs.createdAt)}</small></h1>${tools}</div>
  <div class="cmd-case-strip card flat">${caseStatus(cs.status)}${chip(`أولوية ${PRIO_AR[cs.priority] || cs.priority}`, cs.priority === "high" ? "bad" : "info")}<span>المسؤول: <b>${cs.owner ? esc(cs.owner) : "لا أحد"}</b></span><span>${isOpen ? `SLA ${until(cs.slaAt, 30 * MIN)}` : `اتحلّت ${clock(cs.resolvedAt || now())}`}</span>${o ? `<span>${A.st("order", o.status)} ${A.st("fin", o.fin)}</span>` : ""}${cs.comp ? chip(`تعويض مصروف ${money(cs.comp)}`, "accent") : ""}${cs.resolution ? `<span class="muted">الحل: ${esc(cs.resolution)}</span>` : ""}</div>
  <div class="cmd-case">
    <div class="col gap12">
      <div class="card">${hd("المسار الموجّه للمشكلة", "list", chip("اختيار من قائمة محكومة", "neutral"))}
        <div class="cmd-flow" role="tablist">${flows.map((x) => `<button class="${x === flow ? "on" : ""}" data-act="case-flow" data-case="${cs.id}" data-type="${esc(x)}" role="tab" aria-selected="${x === flow}">${esc(x)}</button>`).join("")}</div>
        <div class="cmd-rec">
          <div class="cmd-rec-h">${ic("shield", "ic sm")}<b>توصية النظام (من سلسلة الحيازة)</b></div>
          <dl class="kv"><dt>الطرف المسؤول</dt><dd>${chip(TW.PARTY[rec.party] || rec.party, rec.party === "twaa" ? "neutral" : "accent")}${breakAt && ["صنف ناقص", "صنف غلط", "صنف تالف"].includes(flow) ? ` <span class="muted">· أول انقطاع: ${esc(breakAt)}</span>` : ""}</dd><dt>الحل المسموح</dt><dd>${esc(rec.resolution)}</dd><dt>أقصى تعويض</dt><dd class="num">${money(rec.maxComp)} ${rec.maxComp ? "" : chip("لا تعويض نقدي", "neutral")}</dd><dt>الموافقة المطلوبة</dt><dd>${chip(tier.ar, tier.tone)} <span class="muted">(${money(claim)} مطالبة + ${money(rec.maxComp)} تعويض · حدود ${money(S.rules.compAgent)} / ${money(S.rules.compSupervisor)})</span></dd>${rec.why && rec.why.length ? `<dt>الأدلة</dt><dd>${rec.why.map(esc).join("<br>")}</dd>` : ""}</dl>
          <ol class="cmd-steps">${(FLOW_GUIDE[flow] || FLOW_GUIDE["سبب آخر"]).map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
          ${flowActs.length && isOpen ? `<div class="row wrap gap4">${flowActs.join("")}</div>` : ""}
        </div>
        <div class="banner brand" style="margin-top:10px">${ic("lock", "ic sm")}<div><b>مفيش خصومات مفتوحة.</b> الموظف يختار من حلول السياسة بس: الاسترداد بيتحسب من بنود الطلب، والتعويض من قائمة مبالغ حتى سقف الحالة (${money(cap)}). حدّك الحالي كـ${esc(TW.roleOf().ar)}: ${roleLimit() === Infinity ? "بدون سقف" : money(roleLimit())} — أي مبلغ أعلى بيروح للموافقة تلقائياً (Guardrail D).</div></div>
      </div>
      ${o ? `<div class="card" data-hl="case-custody">${hd("سلسلة الحيازة — مين مسك الطلب ومتى", "scan", breakAt ? chip(`أول انقطاع: ${breakAt}`, "bad") : chip("السلسلة مكتملة", "ok"))}${chain}</div>` : ""}
      <div class="card">${hd("الاستردادات على الطلب", "undo", o && isOpen ? A.permBtn("refund.create", "استرداد جديد", "refund-open", { cls: "sm", icon: "plus", data: { id: o.id, case: cs.id } }) : "")}${rfTable}</div>
      <div class="card">${hd("التواصل والملاحظات", "chat", chBadge(cs.channel))}<div class="cmd-notes">${cs.notes.map((n) => `<div class="cmd-nt"><div class="row between"><b>${esc(n.who)}</b><span class="muted">${clock(n.at)}</span></div><p>${esc(n.text)}</p></div>`).join("") || `<p class="muted">مفيش ملاحظات لسه.</p>`}</div>
        ${isOpen ? `<div class="row cmd-addnote"><input class="input" data-model="caseNote" data-enter="case-note" data-id="${cs.id}" value="${esc(inst.ui.caseNote || "")}" placeholder="ملخص المكالمة / رد العميل (بيتسجّل باسمك)" aria-label="ملاحظة"><button class="btn sm" data-act="case-note" data-id="${cs.id}">${ic("plus", "ic xs")}سجّل</button></div>` : ""}</div>
      ${o ? `<div class="card">${hd("تسلسل الطلب", "history", A.orderLink(o.id))}<div class="steps cmd-tl">${o.events.slice().reverse().map((e) => `<div class="st done"><span class="bul">${ic("check", "ic xs")}</span><div><b>${esc(e.text)}</b><div class="muted">${clock(e.at)} · ${esc({ customer: "العميل", merchant: "التاجر", rider: "المندوب", admin: "الكنترول", system: "النظام" }[e.who] || e.who)} · <span class="mono">${esc(e.code)}</span></div></div></div>`).join("")}</div></div>` : ""}
    </div>
    <div class="col gap12">
      ${c ? `<div class="card">${hd("العميل", "user", custLink(c))}<dl class="kv"><dt>الموبايل</dt><dd class="mono">${esc(c.phone)}</dd><dt>المنطقة</dt><dd>${esc(A.zone(c.zoneId))}</dd><dt>العنوان</dt><dd>${esc((o && o.address.landmark) || c.landmark)}</dd><dt>الطلبات</dt><dd class="num">${c.orders} · LTV ${money(c.ltv)}</dd><dt>الفئة</dt><dd>${esc(c.tier)} · ${num(c.points)} نقطة</dd><dt>المحفظة</dt><dd class="num">${money(c.wallet)}</dd><dt>شكاوى سابقة</dt><dd>${prev.length ? prev.map((p) => `<button class="btn sm ghost cmd-lnk mono" data-act="go" data-to="/admin/case/${p.id}">${p.id}</button> ${esc(p.type)}`).join("<br>") : "لا يوجد"}</dd></dl><div class="lbl" style="margin-top:8px">علامات الخطر</div><div class="row wrap gap4">${flags.join("") || chip("لا توجد علامات خطر", "ok")}</div></div>` : ""}
      ${o ? `<div class="card">${hd("الدفع", "card", A.st("fin", o.fin))}<dl class="kv"><dt>الطريقة</dt><dd>${{ cod: "كاش عند الاستلام", card: "بطاقة (Paymob)", wallet: "محفظة توّا" }[o.pay.method]}</dd><dt>الإجمالي</dt><dd class="num">${money(o.totals.total)} <span class="muted">(منتجات ${money(o.totals.items)} · توصيل ${money(o.totals.delivery)} · خصم ${money(o.totals.discount)})</span></dd>${pay ? `<dt>سجل الدفع</dt><dd><span class="mono">${esc(pay.id)}</span> ${chip(pay.status, pay.status === "SUCCESS" ? "ok" : pay.status === "PENDING" ? "warn" : "info")}</dd>` : ""}${cods.map((x) => `<dt>الكاش</dt><dd>${esc(A.rider(x.riderId))} · متوقع ${money(x.expected)} · محصّل ${money(x.collected)} ${x.variance ? chip(`فرق ${money(x.variance)}`, x.varianceResolved ? "neutral" : "bad") : ""}</dd>`).join("")}<dt>مساهمة الطلب</dt><dd class="num ${L.contribution < 0 ? "neg" : ""}">${money(L.contribution, 2)}</dd></dl></div>` : ""}
      ${o ? `<div class="card">${hd("مجموعات التنفيذ والأطراف", "layers", "")}${fos.map((f) => `<div class="cmd-fo"><div class="row between"><b>${ic(f.sourceType === "hub" ? "building" : "store", "ic xs")} ${merchLink(f.sourceId)} <span class="mono muted">${f.id}</span></b>${A.st("fo", f.status)}</div><div class="cmd-kc-s muted">${o.lines.filter((l) => l.foId === f.id).map((l) => `${esc(l.name)} × ${l.qty}${l.state !== "ok" ? ` (${esc({ removed: "اتشال", missing: "ناقص", substituted: "بديل", sub_pending: "بانتظار قرار" }[l.state] || l.state)})` : ""}`).join(" · ")}</div></div>`).join("")}${tasks.map((x) => { const r = x.riderId && find(S.riders, x.riderId); return `<div class="cmd-fo"><div class="row between"><b>${ic("bike", "ic xs")} ${r ? riderLink(r) : "بدون مندوب"} <span class="mono muted">${x.id}</span></b>${A.st("task", x.status)}</div><div class="cmd-kc-s muted">${r ? `${esc(D.vehicles[r.vehicle])} · <span class="mono">${esc(r.phone)}</span> · ` : ""}${num(x.km, 1)} كم${x.contact.length ? ` · تواصل: ${x.contact.map((k) => `${k.kind === "call" ? "اتصال" : "واتساب"} ${clock(k.at)} ${k.ok ? "✓" : "✗"}`).join("، ")}` : ""}</div></div>`; }).join("")}</div>` : ""}
      <div class="card">${hd("سجل التدقيق للحالة", "book", "")}${caseAud.length ? `<div class="cmd-audit">${caseAud.map((a) => `<div><span class="muted">${clock(a.at)}</span><b>${esc(a.action)}</b><span class="mono">${esc(a.obj)}</span><span class="muted">${esc(a.who)} · ${esc(a.old)} ← ${esc(a.nw)} · ${esc(a.reason)}</span></div>`).join("")}</div>` : `<p class="muted">لا توجد إجراءات مسجلة بعد.</p>`}</div>
    </div>
  </div>`;
}

/* ================================================================ COMPLAINTS ("complaints") ================================================================ */
function complaintsPage(inst) {
  const S = S_(), R = S.rules;
  const mer = S.merchants.filter((m) => m.status === "active").map((m) => ({ m, n: Math.round(m.complaintRate * m.orders30) })).sort((a, b) => b.n - a.n);
  const tot30 = sum(mer, (x) => x.n), ord30 = sum(mer, (x) => x.m.orders30), rate = tot30 / (ord30 || 1);
  const daily = S.hist.daily, lateAvg = sum(daily, (d) => 1 - d.onTime) / daily.length;
  const trend = daily.map((d) => ({ label: String(d.d), value: Math.round(d.orders * rate * ((1 - d.onTime) / lateAvg)), tone: "brand" }));
  const byType = TW.groupBy(S.cases, (c) => c.type);
  const typeRows = Object.entries(byType).map(([k, v]) => ({ label: k, value: v.length, sub: `${v.filter((c) => c.status !== "RESOLVED").length} مفتوحة` })).sort((a, b) => b.value - a.value);
  const party = {}; S.cases.forEach((c) => { const p = (c.recommendation && c.recommendation.party) || "twaa"; party[p] = party[p] || { n: 0, amt: 0 }; party[p].n++; }); S.refunds.filter((r) => r.reason !== "إلغاء الطلب").forEach((r) => { party[r.party] = party[r.party] || { n: 0, amt: 0 }; party[r.party].amt += r.amount; });
  const partyRows = Object.entries(party).map(([k, v]) => ({ label: TW.PARTY[k] || k, value: v.n, sub: v.amt ? `${money(v.amt)} استرداد` : "", tone: "accent" })).sort((a, b) => b.value - a.value);
  const riders = S.riders.map((r) => ({ r, n: r.fails + r.incidents + (S.cod.some((c) => c.riderId === r.id && c.variance && !c.varianceResolved) ? 1 : 0) })).filter((x) => x.n || x.r.codAcc < 0.975).sort((a, b) => b.n - a.n);
  /* abuse detection — Guardrail J. High-impact → "needs review", never auto-penalised */
  const ab = [];
  S.customers.forEach((c) => {
    const cl = S.cases.filter((x) => x.customerId === c.id).length, rf = S.refunds.filter((r) => { const o = find(S.orders, r.orderId); return o && o.customerId === c.id && r.reason !== "إلغاء الطلب"; }).length;
    const sig = []; if (c.codFails) sig.push([`رفض كاش ${c.codFails}×`, "BR-COD-002", c.codFails >= R.codFailBlock]); if (cl + rf >= 2) sig.push([`${cl} شكوى · ${rf} استرداد`, "EX-SUP-003", cl + rf >= 3]); if (c.promoHeavy) sig.push(["استخدام عروض متكرر", "Guardrail J", false]);
    if (sig.length) ab.push({ kind: "عميل", name: c.ar, id: c.id, act: "open-customer", sig, impact: c.ltv >= 3000 ? "high" : "medium", ev: `${c.orders} طلب · LTV ${money(c.ltv)}`, auto: c.codFails >= R.codFailBlock ? "COD مقيّد تلقائياً بالقاعدة" : "" });
  });
  S.merchants.filter((m) => m.status === "active" && m.cancelAfterAccept >= 0.03).forEach((m) => ab.push({ kind: "تاجر", name: m.ar, id: m.id, act: "open-merchant", sig: [[`إلغاء بعد القبول ${pct(m.cancelAfterAccept, 1)}`, "EX-MER-003", m.cancelAfterAccept >= 0.035]], impact: m.gmv30 > 150000 ? "high" : "medium", ev: `${num(m.orders30)} طلب/30 يوم · ${kmoney(m.gmv30)}`, health: m.health }));
  S.riders.filter((r) => r.codAcc < 0.975 || r.fails >= 2 || S.cod.some((c) => c.riderId === r.id && c.variance && !c.varianceResolved)).forEach((r) => ab.push({ kind: "مندوب", name: r.ar, id: r.id, act: "open-rider", sig: [r.codAcc < 0.975 ? [`دقة الكاش ${pct(r.codAcc, 1)}`, "EX-COD-003", r.codAcc < 0.972] : null, S.cod.some((c) => c.riderId === r.id && c.variance && !c.varianceResolved) ? ["فرق كاش مفتوح اليوم", "EX-COD-003", true] : null, r.fails >= 2 ? [`${r.fails} فشل تسليم`, "EX-ARR-001", false] : null].filter(Boolean), impact: "medium", ev: `${r.jobsToday} مهمة اليوم · تقييم ${num(r.rating, 1)}` }));
  ab.sort((a, b) => (b.sig.some((s) => s[2]) - a.sig.some((s) => s[2])) || (a.impact === "high" ? -1 : 1));
  return `${A.head("الشكاوى", "Complaints · الأنواع، الطرف المسؤول، التجار والمناديب، وكشف إساءة الاستخدام (Guardrail J)", goBtn("حالات الدعم", "/admin/cases", { icon: "inbox" }))}
  ${A.answer({ what: `${num(tot30)} شكوى خلال 30 يوم (${pct(rate, 2)} من الطلبات)`, attention: `${ab.filter((x) => x.sig.some((s) => s[2])).length} إشارة إساءة تحتاج مراجعة`, owner: "مشرف الدعم · عمليات التجار", risk: `${money(sum(S.refunds.filter((r) => r.reason !== "إلغاء الطلب"), (r) => r.amount))} استردادات مسجلة` })}
  <div class="cmd-kpis">${kpi("شكاوى 30 يوم", num(tot30), "معدل شكوى التاجر × طلباته")}${kpi("معدل الشكاوى", pct(rate, 2), "من إجمالي طلبات التجار", { tone: rate > 0.02 ? "warn" : "" })}${kpi("حالات اليوم", num(S.cases.length), `${S.cases.filter((c) => c.status !== "RESOLVED").length} مفتوحة`, { act: "go", data: { to: "/admin/cases" } })}${kpi("تجار فوق 2.5%", num(mer.filter((x) => x.m.complaintRate > 0.025).length), "مرشحين للمراقبة", { tone: "warn" })}${kpi("إشارات إساءة", num(ab.length), "لا عقوبة تلقائية", { tone: ab.length ? "warn" : "" })}</div>
  <div class="cmd-g2">
    <div class="card">${hd("حسب نوع المشكلة (الحالات المسجلة)", "flag", "")}${typeRows.length ? TW.hbars(typeRows) : `<p class="muted">لا توجد.</p>`}<hr class="sep">${hd("حسب الطرف المسؤول", "users", "")}${TW.hbars(partyRows, { tone: "accent" })}${sectionNote("الطرف المسؤول = توصية سلسلة الحيازة على الحالة، والمبلغ = الاستردادات المحمّلة عليه.")}</div>
    <div class="card">${hd("الاتجاه — شكاوى يومياً (تقدير)", "trend", chip("30 يوم", "neutral"))}${TW.bars(trend, { h: 210, label: "شكاوى يومية مقدّرة" })}${sectionNote(`تقدير = طلبات اليوم × معدل الشكاوى (${pct(rate, 2)}) × نسبة التأخير لليوم ÷ متوسط التأخير. أيام التأخير العالي = شكاوى أكتر.`)}</div>
  </div>
  <div class="cmd-g2">
    <div class="card">${hd("حسب التاجر — 30 يوم", "store", "")}<div class="tw"><table class="tbl"><thead><tr><th>التاجر</th><th class="n">شكاوى</th><th class="n">المعدل</th><th class="n">إلغاء بعد القبول</th><th>التصنيف</th></tr></thead><tbody>${mer.slice(0, 8).map(({ m, n }) => `<tr class="click" data-act="open-merchant" data-id="${m.id}" tabindex="0"><td><b>${esc(m.ar)}</b><span class="sub">${esc(D.merchantTypes[m.type] || m.type)}</span></td><td class="n num">${n}</td><td class="n num ${m.complaintRate > 0.025 ? "neg" : ""}">${pct(m.complaintRate, 1)}</td><td class="n num">${pct(m.cancelAfterAccept, 1)}</td><td>${chip({ healthy: "سليم", watch: "مراقبة", restricted: "مقيّد", suspended: "موقوف", new: "جديد" }[m.health] || m.health, { healthy: "ok", watch: "warn", restricted: "bad", suspended: "bad", new: "info" }[m.health] || "neutral")}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="card">${hd("حسب المندوب", "bike", "")}<div class="tw"><table class="tbl"><thead><tr><th>المندوب</th><th class="n">فشل تسليم</th><th class="n">حوادث</th><th class="n">دقة الكاش</th><th class="n">في الموعد</th></tr></thead><tbody>${riders.map(({ r }) => `<tr class="click" data-act="open-rider" data-id="${r.id}" tabindex="0"><td><b>${esc(r.ar)}</b><span class="sub">${esc(D.vehicles[r.vehicle])} · ${esc(A.zone(r.zoneId))}</span></td><td class="n num">${r.fails}</td><td class="n num">${r.incidents}</td><td class="n num ${r.codAcc < 0.975 ? "neg" : ""}">${pct(r.codAcc, 1)}</td><td class="n num">${pct(r.onTime)}</td></tr>`).join("") || `<tr><td colspan="5" class="muted c">لا توجد شكاوى على المناديب</td></tr>`}</tbody></table></div></div>
  </div>
  <div class="card">${hd("كشف إساءة الاستخدام — Guardrail J", "shield", chip("مراجعة بشرية قبل أي عقوبة", "info"))}
    <div class="banner" style="margin-bottom:10px">${ic("info", "ic sm")}<div>النظام بيعلّم بس: رفض كاش متكرر، مطالبات استرداد متكررة، إلغاءات تاجر مريبة، شذوذ كاش المندوب، استخدام عروض متكرر. <b>الحالات عالية التأثير «تحتاج مراجعة» ومفيش عقوبة تلقائية</b> — القاعدة الوحيدة الآلية هي تقييد الكاش (BR-COD-002).</div></div>
    <div class="tw"><table class="tbl"><thead><tr><th>الطرف</th><th>الإشارات</th><th>الأدلة</th><th>التأثير</th><th>الوضع</th><th>الإجراء</th></tr></thead><tbody>${ab.map((x) => `<tr class="sev-${x.sig.some((s) => s[2]) ? "high" : "medium"}"><td><b>${esc(x.name)}</b><span class="sub">${x.kind}</span></td><td><div class="row wrap gap4">${x.sig.map(([t, code, hot]) => `${chip(t, hot ? "bad" : "warn")}<span class="mono muted cmd-kc-s">${code}</span>`).join("")}</div></td><td class="cmd-kc-s">${esc(x.ev)}</td><td>${chip(x.impact === "high" ? "عالي" : "متوسط", x.impact === "high" ? "bad" : "info")}</td><td>${x.auto ? chip(x.auto, "info") : ""} ${x.impact === "high" || x.sig.some((s) => s[2]) ? chip("يحتاج مراجعة", "warn") : chip("مراقبة", "neutral")}</td><td><div class="row gap4">${btn("افتح الملف", x.act, { cls: "sm ghost", icon: "eye", data: { id: x.id } })}${x.kind === "تاجر" && x.health === "healthy" ? A.permBtn("merchant.activate", "ضع تحت المراقبة", "abuse-watch", { cls: "sm", icon: "flag", data: { id: x.id } }) : ""}</div></td></tr>`).join("") || `<tr><td colspan="6" class="muted c">لا توجد إشارات</td></tr>`}</tbody></table></div></div>`;
}

/* ================================================================ COMPENSATION ("compensation") ================================================================ */
function compensationPage(inst) {
  const S = S_(), R = S.rules, t = now(), role = TW.roleOf();
  const tiers = [[`0 – ${money(R.compAgent)}`, "خدمة العملاء", "support", null, "الموظف ينفّذ مباشرة"], [`${money(R.compAgent)} – ${money(R.compSupervisor)}`, "مشرف خدمة العملاء", "supsup", "refund.approve.medium", "يروح لمركز الموافقات"], [`أكثر من ${money(R.compSupervisor)}`, "المالية / الإدارة", "finance", "refund.approve.large", "يروح لمركز الموافقات"]];
  const types = ["صنف ناقص", "صنف غلط", "صنف تالف", "التوصيل اتأخر", "فرق في الكاش", "شكوى من المندوب", "شكوى من التاجر", "إلغاء"].map((ty) => ({ ty, r: TW.recommend({ id: "—" }, ty) }));
  const pend = S.approvals.filter((a) => ["refund", "compensation"].includes(a.type) && a.status === "PENDING");
  const issued = [...S.cases.filter((c) => c.comp > 0).map((c) => ({ kind: "تعويض", id: c.id, orderId: c.orderId, cust: c.customerId, amt: c.comp, by: c.owner || "—", why: c.type, st: "COMPLETED", at: c.resolvedAt || c.createdAt, cap: (c.recommendation || {}).maxComp })), ...S.refunds.filter((r) => r.reason !== "إلغاء الطلب").map((r) => ({ kind: r.comp ? "استرداد + تعويض" : "استرداد", id: r.id, orderId: r.orderId, cust: (find(S.orders, r.orderId) || {}).customerId, amt: r.amount, by: r.by, why: `${r.reason} · ${TW.PARTY[r.party] || r.party}`, st: r.status, at: r.at, ev: r.evidence }))].sort((a, b) => b.at - a.at);
  const rfAll = S.refunds.filter((r) => r.reason !== "إلغاء الطلب" && !["REJECTED", "FAILED"].includes(r.status));
  const gmv = TW.kpis().gmv, rfAmt = sum(rfAll, (r) => r.amount);
  const absorbed = sum(rfAll.filter((r) => ["twaa", "hub", "gateway"].includes(r.party)), (r) => r.amount), recovered = sum(rfAll.filter((r) => ["merchant", "rider"].includes(r.party)), (r) => r.amount);
  const noEv = rfAll.filter((r) => !r.evidence || r.evidence === "—").length;
  const overCap = S.cases.filter((c) => c.comp > ((c.recommendation || {}).maxComp || 0)).length;
  const compTot = sum(S.cases, (c) => c.comp || 0) + sum(S.refunds, (r) => r.comp || 0);
  const k = TW.kpis();
  const apRow = (a) => { const o = a.ref && (a.ref.orderId || (a.ref.kind === "case" && (find(S.cases, a.ref.id) || {}).orderId)); const rf = a.ref.kind === "refund" && find(S.refunds, a.ref.id); const csId = (rf && rf.caseId) || (a.ref.kind === "case" && a.ref.id); return `<tr class="sev-${a.amount > R.compSupervisor ? "high" : "medium"}"><td class="mono">${a.id}<span class="sub">${esc(TW.APPROVAL_TYPES[a.type])}</span></td><td>${esc(a.reason)}<span class="sub">${esc(a.evidence || "")} · ${esc(a.impact || "")}</span></td><td>${o ? A.orderLink(o) : "—"}${csId ? ` <button class="btn sm ghost cmd-lnk mono" data-act="go" data-to="/admin/case/${csId}">${csId}</button>` : ""}</td><td>${esc(a.requester.name)}<span class="sub">${esc(levelAr(a.requester.role))}</span></td><td class="n num">${money(a.amount)}</td><td>${chip(levelAr(a.level), a.level === "finance" ? "bad" : "warn")}</td><td>${since(a.createdAt)}</td><td>${TW.canApprove(a) ? `<div class="row gap4">${btn("اعتمد", "approve", { cls: "sm primary", icon: "check", data: { id: a.id } })}${btn("ارفض", "reject", { cls: "sm", icon: "x", data: { id: a.id } })}</div>` : `<span class="lock">${ic("lock", "ic xs")}مش من صلاحية ${esc(role.ar)}</span>`}</td></tr>`; };
  return `${A.head("التعويضات", "Compensation · حدود الموافقة، المصروف، الموافقات المعلّقة ومؤشرات التسريب (Guardrails D/H)", `${goBtn("قواعد العمل", "/admin/rules", { icon: "settings", cls: "sm ghost" })}${goBtn("مركز الموافقات", "/admin/approvals", { icon: "check" })}`)}
  ${A.answer({ what: `${issued.length} استرداد/تعويض مسجل · ${money(compTot)} تعويضات`, attention: `${pend.length} موافقة معلّقة بقيمة ${money(sum(pend, (a) => a.amount))}`, owner: "مشرف الدعم · المالية", risk: `${pct(rfAmt / (gmv || 1), 2)} من GMV اليوم` })}
  <div class="cmd-g2">
    <div class="card">${hd("مستويات الموافقة (قابلة للتعديل)", "scale", chip("Guardrail D", "neutral"))}<div class="tw"><table class="tbl"><thead><tr><th>المبلغ (استرداد + تعويض)</th><th>مين يعتمد</th><th>المسار</th><th>دورك (${esc(role.ar)})</th></tr></thead><tbody>${tiers.map(([rng, who, lv, perm, path]) => `<tr><td class="num"><b>${rng}</b></td><td>${esc(who)}</td><td class="muted">${path}</td><td>${!perm || TW.can(perm) ? chip("تقدر تعتمد", "ok") : chip("يروح للموافقة", "warn")}</td></tr>`).join("")}</tbody></table></div>${sectionNote(`القيم من قواعد العمل: compAgent = ${money(R.compAgent)}، compSupervisor = ${money(R.compSupervisor)}. أي تعديل بيتسجّل في التدقيق.`)}</div>
    <div class="card">${hd("سقف التعويض حسب نوع المشكلة", "gift", chip("من سياسة النظام", "neutral"))}<div class="tw"><table class="tbl"><thead><tr><th>النوع</th><th>الحل المسموح</th><th class="n">أقصى تعويض</th></tr></thead><tbody>${types.map(({ ty, r }) => `<tr><td>${esc(ty)}</td><td class="cmd-kc-s">${esc(r.resolution)}</td><td class="n num">${r.maxComp ? money(r.maxComp) : chip("لا يوجد", "neutral")}</td></tr>`).join("")}</tbody></table></div>${sectionNote("الموظف مايقدرش يكتب مبلغ حر — بيختار من قائمة حتى السقف، وأي حاجة فوق حدّه بتروح للموافقة.")}</div>
  </div>
  <div class="card">${hd("مؤشرات تسريب الاسترداد", "alert", chip("Guardrail H", "neutral"))}<div class="cmd-kpis">${kpi("استردادات (بدون الإلغاءات)", money(rfAmt), `${rfAll.length} عملية · ${pct(rfAmt / (gmv || 1), 2)} من GMV`, { tone: rfAmt / (gmv || 1) > 0.01 ? "warn" : "" })}${kpi("على حساب توّا", money(absorbed), `مسترد من التاجر/المندوب ${money(recovered)}`, { tone: absorbed > recovered ? "warn" : "" })}${kpi("نسبة الاسترجاع من المسؤول", pct(recovered / ((absorbed + recovered) || 1)), "كل ما زادت قلّ التسريب")}${kpi("بدون دليل", num(noEv), "لازم 0", { tone: noEv ? "bad" : "ok" })}${kpi("تعويض فوق السقف", num(overCap), "حالات تجاوزت سياسة النوع", { tone: overCap ? "bad" : "ok" })}${kpi("تعويض لكل طلب", money(compTot / (k.orders || 1), 2), `${money(compTot)} اليوم`)}</div></div>
  <div class="card" data-hl="approvals-list">${hd("موافقات معلّقة — استرداد وتعويض", "check", chip(String(pend.length), pend.length ? "warn" : "ok"))}<div class="tw"><table class="tbl"><thead><tr><th>الطلب</th><th>السبب والدليل</th><th>الطلب/الحالة</th><th>مقدم الطلب</th><th class="n">المبلغ</th><th>المستوى</th><th>منتظر</th><th>القرار</th></tr></thead><tbody>${pend.map(apRow).join("") || `<tr><td colspan="8" class="muted c">مفيش موافقات معلّقة</td></tr>`}</tbody></table></div></div>
  <div class="card">${hd("المصروف — استردادات وتعويضات", "undo", "")}<div class="tw"><table class="tbl"><thead><tr><th>الرقم</th><th>النوع</th><th>الطلب</th><th>العميل</th><th class="n">المبلغ</th><th>السبب · المسؤول</th><th>بواسطة</th><th>الحالة</th></tr></thead><tbody>${issued.map((x) => `<tr><td class="mono">${esc(x.id)}<span class="sub">${clock(x.at)}</span></td><td>${esc(x.kind)}</td><td>${A.orderLink(x.orderId)}</td><td>${esc(A.customer(x.cust))}</td><td class="n num">${money(x.amt)}${x.cap != null && x.amt > x.cap ? ` ${chip("فوق السقف", "bad")}` : ""}</td><td class="cmd-kc-s">${esc(x.why)}${x.ev ? `<span class="sub">${esc(x.ev)}</span>` : ""}</td><td>${esc(x.by)}</td><td>${refundStatus(x.st)}</td></tr>`).join("") || `<tr><td colspan="8" class="muted c">لا يوجد</td></tr>`}</tbody></table></div></div>`;
}

/* ================================================================ CALL / WHATSAPP QUEUE ("queue") ================================================================ */
const TARGET = { call: 2 * MIN, whatsapp: 5 * MIN, app: 15 * MIN, rider: 3 * MIN };
function scriptFor(it, agent) {
  const S = S_(), o = it.order, c = it.cust, first = c ? c.ar.split(" ")[0] : "حضرتك", fem = c && /ة$|ى$|اء$|منى|إيمان|رحاب|هبة|نورهان|شيماء|فاطمة/.test(c.ar);
  const ya = fem ? "يا فندم" : "يا فندم";
  const r = it.task && it.task.riderId && find(S.riders, it.task.riderId);
  const merch = o && S.fos.find((f) => f.orderId === o.id && f.sourceType === "merchant");
  switch (it.topic) {
    case "العميل لا يرد على المندوب": return `ألو، ${first}؟ معاك ${agent} من توّا. المندوب ${r ? r.ar.split(" ")[0] : ""} واقف عند ${o ? o.address.landmark : "العنوان"} ومعاه طلبك ${o ? o.id : ""}. ${fem ? "تحبي" : "تحب"} ينزلك ولا يستنى ${fem ? "حضرتك" : "حضرتك"} دقيقتين؟${it.task && it.task.cod ? ` المطلوب ${money(it.task.cod)} كاش.` : ""}`;
    case "فشل التسليم": return `أهلاً ${ya}، معاك ${agent} من توّا. المندوب حاول يوصل لحضرتك ومقدرش. ${fem ? "تحبي" : "تحب"} نرتب ميعاد تاني النهارده؟ ولو مش محتاج الطلب نقدر نلغيه من غير أي مصاريف.`;
    case "صنف تالف": case "صنف ناقص": case "صنف غلط": return `أهلاً ${ya}، معاك ${agent} من توّا. آسفين جداً على اللي حصل في طلب ${o ? o.id : ""}. راجعنا التغليف والاستلام، وهنرجّعلك قيمة الصنف في محفظة توّا دلوقتي${it.cap ? ` ومعاها ${money(it.cap)} تعويض حسب السياسة` : ""}. حقك علينا.`;
    case "التوصيل اتأخر": return `أهلاً ${ya}، معاك ${agent} من توّا. الطلب اتأخر عند ${merch ? merch.name : "المحل"} وإحنا متابعين معاهم دلوقتي. هيوصل خلال ${o && o.etaAt > now() ? `${TW.mins(o.etaAt - now())} دقيقة` : "دقايق"} إن شاء الله، ولو عدّى الوعد هنعوّضك بكوبون حسب السياسة.`;
    case "فرق في الكاش": return `أهلاً ${ya}، معاك ${agent} من توّا. بنراجع المبلغ اللي اتدفع للمندوب في طلب ${o ? o.id : ""}. حضرتك دفعت كام بالظبط؟ وهل المندوب قال إن فيه خصم؟ هنظبط أي فرق في نفس اليوم.`;
    default: return `أهلاً ${ya}، معاك ${agent} من توّا بخصوص طلب ${o ? o.id : ""}. قولّي إيه اللي حصل بالظبط وأنا معاك لحد ما نحلها.`;
  }
}
function queueItems() {
  const S = S_(), out = [];
  S.cases.filter((c) => c.status !== "RESOLVED").forEach((c) => { const o = find(S.orders, c.orderId); const last = c.notes.length ? c.notes[c.notes.length - 1].at : c.createdAt; out.push({ key: c.id, ch: c.channel === "rider" ? "call" : c.channel, dir: c.channel === "rider" ? "out" : "in", since: last, created: c.createdAt, cust: find(S.customers, c.customerId), order: o, topic: c.type, prio: c.priority, owner: c.owner, caseId: c.id, task: c.taskId && find(S.tasks, c.taskId), cap: (c.recommendation || {}).maxComp, status: c.status }); });
  S.tasks.filter((x) => x.status === "ARRIVED" && x.unreachable).forEach((x) => { const o = find(S.orders, x.orderId); if (S.cases.some((c) => c.orderId === x.orderId && c.status !== "RESOLVED")) return; out.push({ key: x.id, ch: "call", dir: "out", since: x.unreachable.since, created: x.unreachable.since, cust: o && find(S.customers, o.customerId), order: o, topic: "العميل لا يرد على المندوب", prio: now() > x.unreachable.waitUntil ? "critical" : "high", owner: null, caseId: null, task: x }); });
  S.tasks.filter((x) => x.status === "FAILED").forEach((x) => { if (S.cases.some((c) => c.taskId === x.id && c.status !== "RESOLVED")) return; const o = find(S.orders, x.orderId); out.push({ key: x.id, ch: "call", dir: "out", since: x.failedAt, created: x.failedAt, cust: o && find(S.customers, o.customerId), order: o, topic: "فشل التسليم", prio: "high", owner: null, caseId: null, task: x }); });
  return out.sort((a, b) => (!!a.owner - !!b.owner) || SEV_RANK[a.prio] - SEV_RANK[b.prio] || a.since - b.since);
}
function queuePage(inst) {
  const S = S_(), items = queueItems(), agent = TW.actor.admin().name.split(" ")[0], t = now();
  const chf = inst.ui.qCh || "all";
  const shown = items.filter((x) => chf === "all" || x.ch === chf);
  const waiting = items.filter((x) => !x.owner), breached = items.filter((x) => !x.owner && t - x.since > (TARGET[x.ch] || 5 * MIN));
  const agents = S.users.filter((u) => ["support", "supsup"].includes(u.role));
  const card = (it) => { const late = t - it.since > (TARGET[it.ch] || 5 * MIN); return `<div class="cmd-q sev-${it.prio}">
    <div class="cmd-q-h">${chBadge(it.ch)}${chip(it.dir === "out" ? "اتصال صادر" : "وارد", it.dir === "out" ? "accent" : "info")}<b class="grow">${esc(it.cust ? it.cust.ar : "—")} <span class="mono muted cmd-kc-s">${esc(it.cust ? it.cust.phone : "")}</span></b><span ${tip(`هدف الرد ${TW.mins(TARGET[it.ch] || 5 * MIN)} د`)} class="cmd-q-w ${late && !it.owner ? "neg" : ""}">${ic("clock", "ic xs")}${since(it.since)}</span></div>
    <div class="row wrap gap4">${chip(it.topic, it.prio === "critical" ? "bad" : it.prio === "high" ? "warn" : "info")}${it.order ? A.orderLink(it.order.id) : ""}${it.order ? A.st("order", it.order.status) : ""}${it.caseId ? `<span class="mono muted cmd-kc-s">${it.caseId}</span>` : chip("بدون حالة — هتتفتح عند الاستلام", "neutral")}${it.owner ? chip(`مع ${it.owner}`, "brand") : chip("بانتظار موظف", late ? "bad" : "warn")}</div>
    <div class="cmd-script"><div class="lbl">${ic("chat", "ic xs")} نص مقترح (عامية مصرية)</div><p>${esc(scriptFor(it, agent))}</p></div>
    <div class="row wrap gap4">${btn(it.owner === TW.actor.admin().name ? "افتح الحالة" : it.owner ? "استلمها منه" : "استلم", "q-take", { cls: "sm primary", icon: "hand", data: it.caseId ? { case: it.caseId } : { order: it.order.id } })}${it.order ? btn("الطلب", "open-order", { cls: "sm ghost", icon: "eye", data: { id: it.order.id } }) : ""}${it.task && it.task.status === "FAILED" ? btn("إعادة محاولة", "fail-retry", { cls: "sm", data: { task: it.task.id } }) + btn("إرجاع", "fail-rto", { cls: "sm ghost", data: { task: it.task.id } }) : ""}</div></div>`; };
  return `${A.head("طابور الاتصالات والواتساب", "Call/WhatsApp Queue · الحالات المفتوحة + العملاء اللي مش بيردوا + التسليمات الفاشلة", goBtn("حالات الدعم", "/admin/cases", { icon: "inbox" }))}
  ${A.answer({ what: `${items.length} محادثة في الطابور`, attention: `${waiting.length} بانتظار موظف · ${breached.length} تجاوز هدف الرد`, owner: agents.map((u) => esc(u.ar)).join("، "), risk: money(sum(items, (x) => (x.order ? x.order.totals.total : 0))) + " قيمة طلبات" })}
  <div class="cmd-kpis">${kpi("في الطابور", num(items.length), `${items.filter((x) => x.dir === "out").length} اتصال صادر`)}${kpi("بانتظار موظف", num(waiting.length), "غير مستلمة", { tone: waiting.length ? "warn" : "" })}${kpi("أطول انتظار", items.length ? dur(t - Math.min(...items.map((x) => x.since))) : "—", "منذ آخر تواصل")}${kpi("تجاوز هدف الرد", num(breached.length), "مكالمة 2د · واتساب 5د · تطبيق 15د", { tone: breached.length ? "bad" : "ok" })}${kpi("موظفين الدعم", num(agents.length), agents.map((u) => u.ar.split(" ")[0]).join("، "))}</div>
  <div class="filters"><span class="lbl">القناة</span><div class="seg">${[["all", "الكل"], ["call", "مكالمات"], ["whatsapp", "واتساب"], ["app", "التطبيق"]].map(([v, l]) => `<button class="${chf === v ? "on" : ""}" data-act="ui" data-k="qCh" data-v="${v}">${l} <span class="num">${v === "all" ? items.length : items.filter((x) => x.ch === v).length}</span></button>`).join("")}</div><span class="muted grow cmd-r">مرتبة: غير المستلم ← الأولوية ← الأقدم</span></div>
  <div class="cmd-qgrid">${shown.map(card).join("") || `<div class="card">${TW.empty("الطابور فاضي", "مفيش عملاء مستنيين", "check")}</div>`}</div>`;
}

/* ================================================================ register ================================================================ */
TW.page("", { render: execPage, on: ON });
TW.page("live", { render: liveOps, on: ON });
TW.page("control-tower", { render: (inst) => (inst.compact ? ctCompact(inst) : ctFull(inst)), on: ON });
TW.page("dispatch", { render: dispatchPage, on: ON });
TW.page("cases", { render: casesPage, on: ON });
TW.page("case", { render: casePage, on: ON });
TW.page("complaints", { render: complaintsPage, on: ON });
TW.page("compensation", { render: compensationPage, on: ON });
TW.page("queue", { render: queuePage, on: ON });
})();
