/* Twaa Business OS — the 14 end-to-end demo scenarios from the brief (section 50).
   Each step names WHO acts, opens the right screen, highlights the control (data-hl) and can be executed
   "for you" through the same store actions the apps use — so the auto path and the manual path are identical.
   A step auto-advances when its done() condition becomes true (i.e. you did it yourself in the app). */
(function () {
const TW = window.TW, K = TW.D.K;
const ctx = {};
const S = () => TW.S;
const find = (arr, id) => arr.find((x) => x.id === id);
const as = { admin: (uid) => { if (uid) TW.S.session.admin = uid; return TW.actor.admin(); }, customer: (c) => TW.actor.customer(c), merchant: (m) => TW.actor.merchant(m), rider: (r) => TW.actor.rider(r) };
const sess = (o) => Object.entries(o).forEach(([k, v]) => (TW.S.session[k] = v));
const order = () => find(S().orders, ctx.order);
const task = () => S().tasks.find((t) => t.orderId === ctx.order && t.status !== "CANCELLED" && t.status !== "DELIVERED") || S().tasks.find((t) => t.orderId === ctx.order);
const fos = () => S().fos.filter((f) => f.orderId === ctx.order && f.status !== "REROUTED");
const fail = (error) => ({ ok: false, error });
function startedAfter(cid) { return S().orders.find((o) => o.customerId === cid && o.createdAt >= ctx.t0); }
function placeFor(cid, items, pay = "cod", extra = {}) {
  TW.act("cart.clear", { customerId: cid });
  for (const it of items) { const r = it.menuItemId ? TW.act("cart.addMenu", { customerId: cid, ...it }, as.customer(cid)) : TW.act("cart.add", { customerId: cid, ...it }, as.customer(cid)); if (r.ok === false) return r; }
  const v = TW.validateCart(cid, { pay }); if (v.changes.length) TW.act("cart.applyChanges", { customerId: cid });
  const r = TW.act("order.place", { customerId: cid, pay, when: "now", idem: TW.uid("scn"), ...extra }, as.customer(cid));
  if (r.ok) ctx.order = r.order.id;
  return r;
}
const hub = (sku, qty = 1) => ({ skuId: sku, sourceType: "hub", sourceId: "h1", qty });
const mer = (mid, sku, qty = 1) => ({ skuId: sku, sourceType: "merchant", sourceId: mid, qty });
const picker = () => ({ kind: "admin", id: "u8", name: "وليد فتحي", role: "picker" });
function ensureStock(sku, n = 8) { const iv = S().inv.h1[sku]; if (iv && iv.onHand - iv.reserved < n) iv.onHand = iv.reserved + n + 4; if (iv) iv.shelfEmpty = false; }
function hubPickPack(oid = ctx.order) {
  const f = S().fos.find((x) => x.orderId === oid && x.sourceType === "hub"); if (!f) return { ok: true };
  if (["PACKED", "HANDED_OVER", "DELIVERED"].includes(f.status)) return { ok: true };
  if (f.status === "QUEUED") TW.act("hub.start", { foId: f.id }, picker());
  const o = find(S().orders, oid);
  for (const l of o.lines.filter((x) => x.foId === f.id && x.state === "ok" && !x.picked)) { const r = TW.act("hub.pick", { foId: f.id, key: l.key, result: "picked", code: find(S().skus, l.skuId).barcode }, picker()); if (r.ok === false) return r; }
  return TW.act("hub.pack", { foId: f.id }, picker());
}
function merchantReady(f) {
  if (f.status === "AWAITING_ACCEPT") TW.act("fo.accept", { foId: f.id }, as.merchant(f.sourceId));
  if (f.status === "PREPARING") { f.items.forEach((i) => { if (!i.mark) TW.act("fo.mark", { foId: f.id, key: i.key, mark: "ok" }, as.merchant(f.sourceId)); }); return TW.act("fo.ready", { foId: f.id }, as.merchant(f.sourceId)); }
  return { ok: true };
}
function riderTake(rid) {
  const t = task(); if (!t) return fail("لسه مفيش مهمة توصيل");
  if (t.riderId === rid && !["WAITING", "OFFERED", "NO_RIDER", "SCHEDULED"].includes(t.status)) return { ok: true };
  const r = find(S().riders, rid); if (r.status === "offline") TW.act("rider.online", { riderId: rid, online: true }, as.rider(rid));
  if (r.task && r.task !== t.id) return fail(`${r.ar} مشغول في مهمة تانية — خلّصها الأول أو أعد ضبط البيانات`);
  if (t.offer && t.offer.riderId === rid) return TW.act("task.accept", { taskId: t.id, riderId: rid }, as.rider(rid));
  return TW.act("dispatch.assign", { taskId: t.id, riderId: rid, reason: "عرض توضيحي: إسناد للمندوب التجريبي" }, as.admin("u1"));
}
function riderPickup(rid) {
  const t = task(); if (!t || t.riderId !== rid) { const r = riderTake(rid); if (r.ok === false) return r; }
  const tk = task();
  if (tk.status === "ASSIGNED") TW.act("task.arrivePickup", { taskId: tk.id }, as.rider(rid));
  for (const p of tk.pickups.filter((x) => !x.scanned)) {
    const f = find(S().fos, p.foId);
    if (f.sourceType === "hub") { const r = hubPickPack(); if (r.ok === false) return r; } else { const r = merchantReady(f); if (r.ok === false) return r; }
    if (tk.status === "ASSIGNED") TW.act("task.arrivePickup", { taskId: tk.id }, as.rider(rid));
    const r = TW.act("task.scan", { taskId: tk.id, sourceId: p.sourceId, code: f.pickupCode, count: Math.max(1, f.packages.length) }, as.rider(rid)); if (r.ok === false) return r;
  }
  return { ok: true };
}
function riderDeliver(rid) {
  let t = task(); if (!t) return fail("مفيش مهمة");
  if (["ASSIGNED", "AT_PICKUP", "WAITING", "OFFERED"].includes(t.status)) { const r = riderPickup(rid); if (r.ok === false) return r; t = task(); }
  if (t.status === "PICKED_UP") TW.act("task.arrive", { taskId: t.id }, as.rider(rid));
  if (t.cod && t.collected == null) TW.act("task.collect", { taskId: t.id, amount: t.cod }, as.rider(rid));
  return TW.act("task.deliver", { taskId: t.id, otp: order().otp }, as.rider(rid));
}
const st = (who, text, o = {}) => ({ who, text, ...o });

TW.scenarios = [
  /* 1 */ {
    id: "s1", title: "طلب بسيط من الهب", sub: "منى بتطلب لبن وبيض وعيش وتدفع كاش. الهب بيجمّع، محمود بيوصّل، والكاش بيتورّد ويتطابق.", outcome: "طلب واحد عدّى على أربع واجهات ورجع مطابق مالياً من غير أي إدخال يدوي.",
    setup() { ctx.t0 = Date.now(); sess({ customer: "c1", rider: "r1", merchant: "m1", admin: "u1" }); TW.S.sim.auto = true; TW.S.sim.preferDemo = true; [K.milkAlmarai, K.eggs, K.fino].forEach((k) => ensureStock(k)); TW.act("cart.clear", { customerId: "c1" }); const r = find(S().riders, "r1"); if (!r.task) r.status = "online"; },
    steps: [
      st("customer", "من الرئيسية دوّر على «لبن» وضيف <b>لبن المراعي</b>، وكمان <b>بيض بلدي</b> و<b>عيش فينو</b>.", { view: "/customer", hl: '[data-hl="cust-search"]', auto: () => { for (const k of [K.milkAlmarai, K.eggs, K.fino]) { const r = TW.act("cart.add", { customerId: "c1", ...hub(k) }, as.customer("c1")); if (r.ok === false) return r; } return { ok: true }; }, done: () => TW.cart("c1").lines.length >= 3 || !!startedAfter("c1") }),
      st("customer", "افتح السلة ← «إتمام الطلب»، اختار <b>كاش عند الاستلام</b> وأكّد. جرّب تدوس التأكيد مرتين: هيتعمل طلب واحد بس (منع التكرار).", { view: "/customer/checkout", hl: '[data-hl="cust-checkout"]', auto: () => { const r = TW.act("order.place", { customerId: "c1", pay: "cod", when: "now", idem: TW.uid("scn") }, as.customer("c1")); if (r.ok) ctx.order = r.order.id; return r; }, done: () => { const o = startedAfter("c1"); if (o) ctx.order = o.id; return !!o; } }),
      st("admin", "الهب بيجمّع ويغلّف (تلقائي)، أو جمّعه بنفسك من شاشة التجميع بالباركود.", { view: "/admin/picking", hl: '[data-hl="pick-queue"]', auto: () => hubPickPack(), done: () => fos().some((f) => f.sourceType === "hub" && ["PACKED", "HANDED_OVER", "DELIVERED"].includes(f.status)) }),
      st("rider", "محمود وصله عرض المهمة بالأجر والمسافة ومبلغ الكاش — اقبله.", { view: "/rider", hl: '[data-hl="rider-offer"]', auto: () => riderTake("r1"), done: () => { const t = task(); return t && t.riderId === "r1" && !["WAITING", "OFFERED"].includes(t.status); } }),
      st("rider", "عند الهب: امسح كود الاستلام وأكّد عدد الطرود. سلسلة الحيازة بتتسجل.", { view: () => `/rider/job/${task().id}`, hl: '[data-hl="rider-scan"]', auto: () => riderPickup("r1"), done: () => { const t = task(); return t && ["PICKED_UP", "ARRIVED", "DELIVERED"].includes(t.status); } }),
      st("customer", "عند منى: «طلبك خرج» وكود الاستلام ظاهر، والمندوب بيتحرك على الخريطة.", { view: () => `/customer/order/${ctx.order}`, hl: '[data-hl="cust-journey"]', done: () => TW.stage(order()) >= 3 && TW.stage(order()) < 6 }),
      st("rider", "عند العميل: «وصلت» ← استلم الكاش ← اكتب كود الاستلام ← «تم التسليم».", { view: () => `/rider/job/${task().id}`, hl: '[data-hl="rider-deliver"]', auto: () => riderDeliver("r1"), done: () => order() && order().status === "DELIVERED" }),
      st("rider", "ورّد الكاش في الهب من شاشة «الكاش».", { view: "/rider/cash", hl: '[data-hl="rider-deposit"]', auto: () => TW.act("rider.deposit", { riderId: "r1" }, as.rider("r1")), done: () => S().deposits.some((d) => d.riderId === "r1" && d.at >= ctx.t0) }),
      st("admin", "المالية تأكّد استلام الكاش ⇒ الطلب يبقى «تمت المطابقة».", { view: "/admin/cod", hl: '[data-hl="cod-deposits"]', auto: () => { const d = S().deposits.find((x) => x.riderId === "r1" && x.status === "PENDING_VERIFY"); return d ? TW.act("deposit.verify", { depositId: d.id }, as.admin("u1")) : fail("مفيش توريد بانتظار التأكيد"); }, done: () => order() && order().fin === "RECONCILED" }),
    ],
  },
  /* 2 */ {
    id: "s2", title: "طلب من أكتر من مصدر", sub: "بقالة من هب توّا + كشري من «كشري التحرير». طلب عميل واحد بيتحول لأمرين تنفيذ، والمحرك يقرر: مندوب واحد ولا تسليم مجزّأ.", outcome: "العميل شاف رحلة واحدة؛ داخلياً أمرين تنفيذ ومهمة توصيل متعددة الاستلام. لو اخترت مشويات أبو حيدر (تجهيز 22 د) المحرك هيقسم التسليم.",
    setup() { ctx.t0 = Date.now(); sess({ customer: "c1", rider: "r1", admin: "u1" }); TW.S.sim.auto = true; [K.cola, K.chips].forEach((k) => ensureStock(k)); TW.act("cart.clear", { customerId: "c1" }); },
    steps: [
      st("customer", "ضيف <b>كوكاكولا</b> و<b>شيبسي</b> من توّا، وبعدين من «أكل ومطاعم» ضيف <b>كشري وسط</b> من كشري التحرير.", { view: "/customer/store/m8", auto: () => { for (const it of [hub(K.cola, 2), hub(K.chips)]) { const r = TW.act("cart.add", { customerId: "c1", ...it }, as.customer("c1")); if (r.ok === false) return r; } return TW.act("cart.addMenu", { customerId: "c1", merchantId: "m8", menuItemId: S().menus.m8[0].id, mods: [{ n: "وسط", p: 0 }], qty: 1 }, as.customer("c1")); }, done: () => { const ls = TW.cart("c1").lines; return (ls.some((l) => l.sourceId === "h1") && ls.some((l) => l.sourceId === "m8")) || !!startedAfter("c1"); } }),
      st("customer", "السلة مقسومة حسب المصدر، لكل مجموعة وقتها ومجموعها. أكّد الطلب كاش.", { view: "/customer/cart", hl: '[data-hl="cart-groups"]', auto: () => { const r = TW.act("order.place", { customerId: "c1", pay: "cod", when: "now", idem: TW.uid("scn") }, as.customer("c1")); if (r.ok) ctx.order = r.order.id; return r; }, done: () => { const o = startedAfter("c1"); if (o) ctx.order = o.id; return !!o; } }),
      st("admin", "في الكنترول: طلب عميل واحد ⇒ أمرين تنفيذ (FO)، وقرار التنسيق مكتوب بسببه (BR-DSP-001).", { view: () => `/admin/order/${ctx.order}` }),
      st("rider", "محمود: مهمة واحدة فيها نقطتين استلام. اقبلها.", { view: "/rider", hl: '[data-hl="rider-offer"]', auto: () => riderTake("r1"), done: () => { const t = task(); return t && t.riderId === "r1" && !["WAITING", "OFFERED"].includes(t.status); } }),
      st("rider", "امسح كود كل نقطة استلام: الهب وبعدين كشري التحرير.", { view: () => `/rider/job/${task().id}`, hl: '[data-hl="rider-scan"]', auto: () => riderPickup("r1"), done: () => { const t = task(); return t && ["PICKED_UP", "ARRIVED", "DELIVERED"].includes(t.status); } }),
      st("rider", "سلّم واستلم الكاش.", { view: () => `/rider/job/${task().id}`, hl: '[data-hl="rider-deliver"]', auto: () => riderDeliver("r1"), done: () => order() && order().status === "DELIVERED" }),
    ],
  },
  /* 3 */ {
    id: "s3", title: "منتج خلص — بديل بموافقة العميل", sub: "المجمّع يلاقي رف لبن جهينة فاضي والنظام يقول متاح. المخزون يتصحح بسجل تدقيق، ومنى تختار البديل والفرق يتسجل.", outcome: "تصحيح المخزون بسبب ومستخدم ووقت، والعميل قرر بنفسه، وفرق السعر في دفتر الطلب.",
    setup() { ctx.t0 = Date.now(); sess({ customer: "c1", admin: "u1" }); TW.S.sim.auto = true; TW.act("cust.subPref", { customerId: "c1", pref: "call" }); const iv = S().inv.h1[K.milk]; iv.onHand = iv.reserved + 7; iv.shelfEmpty = true; ensureStock(K.rice); ensureStock(K.milkAlmarai); TW.act("cart.clear", { customerId: "c1" }); },
    steps: [
      st("customer", "منى تضيف <b>لبن جهينة</b> و<b>أرز الضحى</b> وتفضيل البدائل «اسألني الأول»، وتدفع بالبطاقة.", { view: `/customer/product/${K.milk}`, auto: () => placeFor("c1", [hub(K.milk, 2), hub(K.rice)], "card"), done: () => { const o = startedAfter("c1"); if (o) ctx.order = o.id; return !!o; } }),
      st("admin", "المجمّع يوصل للرف B-02 يلاقيه فاضي ⇒ «الرف فاضي» (EX-INV-001): تسوية مخزون تلقائية وسؤال العميل.", { view: "/admin/picking", hl: '[data-hl="pick-queue"]', auto: () => { const f = fos().find((x) => x.sourceType === "hub"); if (f.status === "QUEUED") TW.act("hub.start", { foId: f.id }, picker()); const o = order(); const l = o.lines.find((x) => x.skuId === K.milk && x.state === "ok"); if (!l) return { ok: true }; return TW.act("hub.pick", { foId: f.id, key: l.key, result: "empty" }, picker()); }, done: () => order() && order().lines.some((l) => ["sub_pending", "substituted", "removed"].includes(l.state)) }),
      st("customer", "منى يوصلها: «لبن جهينة خلص — نبدّله بلبن المراعي؟» بالفرق. وافقي على البديل.", { view: () => `/customer/order/${ctx.order}`, hl: '[data-hl="cust-sub"]', auto: () => { const l = order().lines.find((x) => x.state === "sub_pending"); return l ? TW.act("order.subDecision", { orderId: ctx.order, key: l.key, choice: "accept" }, as.customer("c1")) : { ok: true }; }, done: () => order() && order().lines.some((l) => l.state === "substituted") }),
      st("admin", "في الكنترول: البند مستبدل وفرق السعر مسجّل، وحركة المخزون في سجل التدقيق.", { view: () => `/admin/order/${ctx.order}` }),
    ],
  },
  /* 4 */ {
    id: "s4", title: "طلب تاجر: استلم، جهّز، سلّم", sub: "منى تطلب من «سوبر ماركت الحمد». التاجر يقبل بعدّاد، يعلّم الأصناف، ويسلّم للمندوب بكود.", outcome: "التاجر ما كتبش ولا كلمة: قبول، علامات، جاهز، كود. وكل خطوة ظهرت عند المندوب والعميل والكنترول.",
    setup() { ctx.t0 = Date.now(); sess({ customer: "c1", merchant: "m1", rider: "r1", admin: "u1" }); const m = find(S().merchants, "m1"); m.autopilot = false; m.mode = "open"; TW.act("cart.clear", { customerId: "c1" }); [K.feta, K.oil, K.rice].forEach((k) => { const x = S().msku.m1[k]; if (x) { x.available = true; if (x.stock != null && x.stock < 3) x.stock = 12; } }); },
    steps: [
      st("customer", "من «محلات حواليك» افتح <b>سوبر ماركت الحمد</b> واطلب جبنة دومتي وزيت عافية وأرز.", { view: "/customer/store/m1", auto: () => placeFor("c1", [mer("m1", K.feta), mer("m1", K.oil), mer("m1", K.rice)], "cod"), done: () => { const o = startedAfter("c1"); if (o) ctx.order = o.id; return !!o; } }),
      st("merchant", "تنبيه قوي عند التاجر بعدّاد للقبول — دوس «قبول».", { view: "/merchant", hl: '[data-hl="merch-new"]', auto: () => { const f = fos()[0]; return TW.act("fo.accept", { foId: f.id }, as.merchant("m1")); }, done: () => fos()[0] && fos()[0].status !== "AWAITING_ACCEPT" }),
      st("merchant", "قائمة التجهيز: علّم كل صنف «موجود» وبعدين «جاهز للاستلام».", { view: () => `/merchant/order/${fos()[0].id}`, hl: '[data-hl="merch-prep"]', auto: () => merchantReady(fos()[0]), done: () => ["READY", "HANDED_OVER", "DELIVERED"].includes(fos()[0].status) }),
      st("rider", "محمود يقبل ويتحرك للمحل. التاجر بيشوف «المندوب جاي يستلم».", { view: "/rider", hl: '[data-hl="rider-offer"]', auto: () => { const r = riderTake("r1"); if (r.ok === false) return r; const t = task(); return TW.act("task.arrivePickup", { taskId: t.id }, as.rider("r1")); }, done: () => { const t = task(); return t && t.riderId === "r1" && !["WAITING", "OFFERED"].includes(t.status); } }),
      st("merchant", "التاجر يطابق كود الاستلام مع المندوب ويسلّم الطرد.", { view: () => `/merchant/order/${fos()[0].id}`, hl: '[data-hl="merch-handover"]', auto: () => { const t = task(); if (t.status === "ASSIGNED") TW.act("task.arrivePickup", { taskId: t.id }, as.rider("r1")); const f = fos()[0]; return TW.act("fo.handover", { foId: f.id, code: f.pickupCode }, as.merchant("m1")); }, done: () => ["HANDED_OVER", "DELIVERED"].includes(fos()[0].status) }),
      st("customer", "عند منى: «طلبك خرج».", { view: () => `/customer/order/${ctx.order}`, hl: '[data-hl="cust-journey"]', done: () => TW.stage(order()) >= 3 }),
    ],
  },
  /* 5 */ {
    id: "s5", title: "التاجر ما ردّش — الكنترول يتدخل", sub: "طلب صيدلية مستني «صيدلية د. منى». المهلة بتخلص، برج التحكم ينبّه، والمشغّل يحوّل لصيدلية بديلة بسبب مكتوب.", outcome: "العميل ما استناش؛ الطلب اتحوّل لصيدلية الحياة، والتاجر الأصلي اتخصم من موثوقيته، والقرار في سجل التدقيق.",
    setup() { ctx.t0 = Date.now(); sess({ customer: "c5", admin: "u5" }); const m = find(S().merchants, "m3"); m.autopilot = false; m.mode = "open"; [K.panadol, K.vitc].forEach((k) => { S().msku.m3[k].available = true; S().msku.m3[k].stock = null; }); const keep = S().rules.merchantAcceptSec; S().rules.merchantAcceptSec = 45; placeFor("c5", [mer("m3", K.panadol), mer("m3", K.vitc)], "cod"); S().rules.merchantAcceptSec = keep; },
    steps: [
      st("admin", "برج التحكم: «التاجر لم يقبل بعد» والعداد شغال (EX-MER-001). اتصل بالتاجر — المحاولة بتتسجل.", { view: "/admin/control-tower", hl: '[data-hl="ct-table"]', auto: () => TW.act("fo.callMerchant", { foId: fos()[0].id }, as.admin()), done: () => (fos()[0] || {}).calls > 0 || ["TIMEOUT", "REROUTED"].includes((fos()[0] || {}).status) }),
      st("system", "المهلة خلصت والتاجر ما ردّش ⇒ حالة MERCHANT_TIMEOUT (ممكن تستنى العداد أو تخطّاه).", { auto: () => { const f = fos()[0]; if (f.status === "AWAITING_ACCEPT") f.acceptBy = Date.now() - 1000; TW.tick(); return { ok: true }; }, done: () => S().fos.some((f) => f.orderId === ctx.order && ["TIMEOUT", "REROUTED"].includes(f.status)) }),
      st("admin", "حوّل المكوّن لـ<b>صيدلية الحياة</b> (عندها نفس الأصناف وتخدم المنطقة) — السبب إلزامي.", { view: "/admin/control-tower", hl: '[data-hl="ct-table"]', auto: () => { const f = S().fos.find((x) => x.orderId === ctx.order && ["TIMEOUT", "AWAITING_ACCEPT"].includes(x.status)); return f ? TW.act("fo.reroute", { foId: f.id, toMerchantId: "m26", reason: "التاجر لم يقبل خلال المهلة" }, as.admin()) : { ok: true }; }, done: () => S().fos.some((f) => f.orderId === ctx.order && f.status === "REROUTED") }),
      st("customer", "العميل اتبلّغ إن طلبه اتحوّل لصيدلية تانية عشان منأخروش.", { view: () => `/customer/order/${ctx.order}` }),
      st("admin", "القرار متسجّل: مين، إمتى، من إيه لإيه، وليه.", { view: "/admin/audit" }),
    ],
  },
  /* 6 */ {
    id: "s6", title: "المندوب وصل لحد الكاش", sub: "محمود قرب من حد الكاش (1,000 ج.م). بعد التسليم العداد يتملى، مهام الكاش تتوقف لحد ما يورّد وتأكد المالية.", outcome: "الشركة ما تعرّضتش لكاش زيادة: المحرك استبعد المندوب من مهام الكاش أوتوماتيك لحد التوريد.",
    setup() { ctx.t0 = Date.now(); sess({ customer: "c1", rider: "r1", admin: "u1" }); TW.S.sim.auto = true; const r = find(S().riders, "r1"); if (!r.task) r.status = "online"; ensureStock(K.persil); TW.act("cart.clear", { customerId: "c1" }); },
    steps: [
      st("customer", "منى تطلب باقة منظفات كاش.", { view: "/customer", auto: () => { const r = placeFor("c1", [hub(K.persil)], "cod"); if (r.ok === false) return r; const rd = find(S().riders, "r1"); rd.cash = Math.max(0, rd.limit - order().totals.total); return r; }, done: () => { const o = startedAfter("c1"); if (o) ctx.order = o.id; return !!o; } }),
      st("rider", "عداد الكاش عند محمود: قريب من الحد. اقبل المهمة وسلّمها.", { view: "/rider", hl: '[data-hl="rider-cash-meter"]', auto: () => riderDeliver("r1"), done: () => order() && order().status === "DELIVERED" }),
      st("rider", "العداد اتملى: «وصلت لحد الكاش — مهام الكاش اتوقفت» (BR-RID-002).", { view: "/rider", hl: '[data-hl="rider-cash-meter"]', done: () => { const r = find(S().riders, "r1"); return r.cash >= r.limit; } }),
      st("admin", "طلب كاش جديد: محمود بيظهر «غير مؤهل — حد الكاش» في ترشيحات التوزيع (EX-RID-003).", { view: "/admin/dispatch-queue", auto: () => { ensureStock(K.water, 14); const keep = ctx.order; const r = placeFor("c6", [hub(K.water, 8)], "cod"); ctx.second = r.order && r.order.id; ctx.order = keep; return r; } }),
      st("rider", "محمود يورّد الكاش في الهب.", { view: "/rider/cash", hl: '[data-hl="rider-deposit"]', auto: () => TW.act("rider.deposit", { riderId: "r1" }, as.rider("r1")), done: () => find(S().riders, "r1").cash < find(S().riders, "r1").limit }),
      st("admin", "المالية تأكد التوريد ⇒ محمود يرجع مؤهل لمهام الكاش.", { view: "/admin/cod", hl: '[data-hl="cod-deposits"]', auto: () => { const d = S().deposits.find((x) => x.riderId === "r1" && x.status === "PENDING_VERIFY"); return d ? TW.act("deposit.verify", { depositId: d.id }, as.admin("u1")) : fail("مفيش توريد بانتظار التأكيد"); } }),
    ],
  },
  /* 7 */ {
    id: "s7", title: "فشل التسليم — العميل مش بيرد", sub: "محمود عند العميل والعميل مش بيرد. النظام بيفرض تسلسل التواصل والانتظار قبل الفشل، والدعم يقرر إعادة محاولة أو إرجاع.", outcome: "مفيش إلغاء عشوائي من المندوب: كل محاولة متسجلة، والقرار من الدعم، والمرتجع اتفحص، والعميل اتسجّل عليه رفض كاش.",
    setup() { ctx.t0 = Date.now(); sess({ customer: "c5", rider: "r1", admin: "u1" }); S().rules.unreachableWaitSec = 20; const r = find(S().riders, "r1"); if (r.task) { /* free the demo rider */ } ensureStock(K.rice); ensureStock(K.sugar); placeFor("c5", [hub(K.rice), hub(K.sugar, 2)], "cod"); hubPickPack(); riderPickup("r1"); const t = task(); if (t) { t.prog = 0.97; } },
    steps: [
      st("rider", "محمود وصل العنوان — دوس «وصلت».", { view: () => `/rider/job/${task().id}`, hl: '[data-hl="rider-deliver"]', auto: () => { const t = task(); return t.status === "PICKED_UP" ? TW.act("task.arrive", { taskId: t.id }, as.rider("r1")) : { ok: true }; }, done: () => ["ARRIVED", "FAILED", "RTO", "RETURNED"].includes((task() || {}).status) }),
      st("rider", "العميل مش بيرد: اتصل مرتين وابعت واتساب — عداد الانتظار بيبدأ (BR-ARR-001).", { view: () => `/rider/job/${task().id}`, hl: '[data-hl="rider-contact"]', auto: () => { const t = task(); TW.act("task.contact", { taskId: t.id, kind: "call", reached: false }, as.rider("r1")); TW.act("task.contact", { taskId: t.id, kind: "call", reached: false }, as.rider("r1")); return TW.act("task.contact", { taskId: t.id, kind: "whatsapp", reached: false }, as.rider("r1")); }, done: () => { const t = task(); return t && t.contact.length >= 3; } }),
      st("rider", "بعد مهلة الانتظار: «فشل التسليم» ← «العميل مش بيرد». المندوب ما يقدرش يلغي من نفسه.", { view: () => `/rider/job/${task().id}`, auto: () => { const t = task(); if (t.unreachable) t.unreachable.waitUntil = Date.now() - 1; return TW.act("task.fail", { taskId: t.id, reason: "العميل مش بيرد" }, as.rider("r1")); }, done: () => ["FAILED", "RTO", "RETURNED"].includes((task() || {}).status) }),
      st("admin", "برج التحكم: «فشل التسليم» — قرر <b>إرجاع للمصدر</b> بسبب.", { view: "/admin/control-tower", hl: '[data-hl="ct-table"]', auto: () => TW.act("failed.decide", { taskId: task().id, decision: "rto", reason: "العميل لا يرد بعد كل المحاولات" }, as.admin()), done: () => ["RTO", "RETURNED"].includes((task() || {}).status) }),
      st("admin", "المرتجع رجع الهب ويتفحص: يرجع للرف أو حجر أو هالك.", { view: "/admin/returns", auto: () => { const t = task(); t.prog = 1; TW.tick(); const rt = S().returns.find((x) => x.orderId === ctx.order); return rt ? TW.act("return.inspect", { returnId: rt.id, outcome: "restock", reason: "العبوات سليمة ومقفولة" }, as.admin()) : fail("المرتجع لسه في الطريق"); } }),
      st("admin", "ملف العميل: اتسجّل عليه رفض كاش — بعد حدّين الكاش بيتقفل ويتطلب دفع أونلاين (BR-COD-002).", { view: "/admin/customer/c5" }),
    ],
  },
  /* 8 */ {
    id: "s8", title: "صنف ناقص واسترداد", sub: "منى بلّغت إن جبنة دومتي ناقصة من طلب TW-1036. الدعم يراجع سلسلة الحيازة، يحدد المسؤول، والاسترداد يعدّي على مستوى الموافقة الصح.", outcome: "مفيش استرداد من غير بند وسبب وطرف مسؤول ودليل وموافقة. الخسارة اتحمّلها الهب، ومنى خدت فلوسها في المحفظة.",
    setup() { ctx.t0 = Date.now(); ctx.order = "TW-1036"; sess({ customer: "c1", admin: "u10" }); },
    steps: [
      st("customer", "منى تفتح الطلب TW-1036 ← «عندك مشكلة؟» ← تختار جبنة دومتي ← «صنف ناقص».", { view: "/customer/order/TW-1036", hl: '[data-hl="cust-report"]', auto: () => { const l = order().lines.find((x) => x.skuId === K.feta); const r = TW.act("support.report", { orderId: "TW-1036", type: "صنف ناقص", keys: [l.key], note: "الجبنة مش في الشنطة" }, as.customer("c1")); if (r.ok) ctx.case = r.caseId; return r; }, done: () => { const c = S().cases.find((x) => x.orderId === "TW-1036" && x.createdAt >= ctx.t0); if (c) ctx.case = c.id; return !!c; } }),
      st("admin", "دينا (خدمة العملاء) تفتح صفحة 360: التغليف سجّل 4 من 5 بنود بتجاوز يدوي ⇒ التوصية: المسؤول الهب.", { view: () => `/admin/case/${ctx.case}`, hl: '[data-hl="case-custody"]' }),
      st("admin", "تطلب استرداد 62 ج.م للمحفظة — فوق حد موظف الدعم (50 ج.م) ⇒ يروح لمشرف خدمة العملاء.", { view: () => `/admin/case/${ctx.case}`, auto: () => { const l = order().lines.find((x) => x.skuId === K.feta); return TW.act("refund.create", { orderId: "TW-1036", caseId: ctx.case, keys: [l.key], reason: "صنف ناقص", party: "hub", evidence: "تحقق التغليف 4/5 بتجاوز يدوي · تقرير العميلة", method: "wallet" }, as.admin("u10")); }, done: () => S().refunds.some((r) => r.orderId === "TW-1036" && r.at >= ctx.t0) }),
      st("admin", "أيمن (مشرف خدمة العملاء) يعتمد من مركز الموافقات.", { view: "/admin/approvals", hl: '[data-hl="approvals-list"]', auto: () => { const rf = S().refunds.find((r) => r.orderId === "TW-1036" && r.at >= ctx.t0); if (rf.status !== "PENDING_APPROVAL") return { ok: true }; return TW.act("approval.decide", { approvalId: rf.approvalId, decision: "approve" }, as.admin("u11")); }, done: () => S().refunds.some((r) => r.orderId === "TW-1036" && r.at >= ctx.t0 && r.status === "COMPLETED") }),
      st("customer", "منى: «رجعنالك فلوسك» — 62 ج.م في محفظة توّا.", { view: "/customer/order/TW-1036" }),
      st("admin", "دفتر الطلب: الاسترداد على الهب، وحركة فقد في المخزون، وكل خطوة في التدقيق.", { view: "/admin/order/TW-1036" }),
    ],
  },
  /* 9 */ {
    id: "s9", title: "تاجر جديد من أول زيارة لأول طلب", sub: "صيدلية النور في أبو الشقاف: عميل محتمل ← اتفاق ← مستندات ← كتالوج ← تدريب ← تفعيل بموافقة.", outcome: "أول صيدلية في أبو الشقاف بقت مفعّلة بكتالوج مربوط بالكتالوج الرئيسي، وظهرت للعملاء في القرية.",
    setup() { ctx.t0 = Date.now(); sess({ admin: "u13", merchant: "m25", customer: "c3" }); },
    steps: [
      st("admin", "رامي (المبيعات): صيدلية النور في مرحلة «مستندات». حرّكها لـ«تجهيز الكتالوج».", { view: "/admin/acquisition", hl: '[data-hl="lead-L-301"]', auto: () => TW.act("lead.move", { leadId: "L-301", stage: 6, note: "المستندات اكتملت" }, as.admin("u13")), done: () => find(S().leads, "L-301").stage >= 6 }),
      st("admin", "الكتالوج اتجهّز من الكتالوج الرئيسي (من غير أسماء عشوائية) ⇒ «تدريب».", { view: "/admin/acquisition", hl: '[data-hl="lead-L-301"]', auto: () => TW.act("lead.move", { leadId: "L-301", stage: 7, note: "تدريب على استلام الطلبات والكاش" }, as.admin("u13")), done: () => find(S().leads, "L-301").stage >= 7 }),
      st("admin", "باسم (عمليات التجار) يعتمد التفعيل من مركز الموافقات.", { view: "/admin/approvals", hl: '[data-hl="approvals-list"]', auto: () => { const ap = S().approvals.find((a) => a.type === "merchant_activation" && a.ref.id === "m25" && a.status === "PENDING"); return ap ? TW.act("approval.decide", { approvalId: ap.id, decision: "approve" }, as.admin("u12")) : { ok: true }; }, done: () => find(S().merchants, "m25").status === "active" }),
      st("merchant", "صيدلية النور: «مبروك! محلك اتفعّل على توّا».", { view: "/merchant" }),
      st("customer", "الحاجة فاطمة في أبو الشقاف تلاقي الصيدلية في «محلات حواليك».", { view: "/customer/store/m25" }),
    ],
  },
  /* 10 */ {
    id: "s10", title: "التاجر يضيف 20 منتج من غير ما يكتب", sub: "سوبر ماركت الحمد يختار من كتالوج توّا ويحدد السعر بس. سعر غير طبيعي واحد يروح للمراجعة.", outcome: "20 منتج اتضافوا بأسماء وصور وتصنيف موحّد، والعملاء شافوهم فوراً، والسعر الشاذ اتحجز للمراجعة.",
    setup() { ctx.t0 = Date.now(); sess({ merchant: "m1", customer: "c1", admin: "u14" }); },
    steps: [
      st("merchant", "المنتجات ← «ضيف منتجات»: الكتالوج الرئيسي متفلتر على أقسام السوبر ماركت.", { view: "/merchant/catalog", hl: '[data-hl="merch-add"]' }),
      st("merchant", "اختار 20 منتج ← السعر متعبّي بالسعر المرجعي ← «إضافة لمحلي».", { view: "/merchant/catalog", hl: '[data-hl="merch-add"]', auto: () => { const have = S().msku.m1; const pool = S().skus.filter((s) => TW.D.typeDepts.supermarket.includes(s.dept) && !have[s.id] && !s.regulated).slice(0, 20); ctx.added = pool.map((s) => s.id); return TW.act("mcat.add", { merchantId: "m1", items: pool.map((s, i) => ({ skuId: s.id, price: i === 3 ? Math.round(s.refPrice * 1.4) : s.refPrice, stock: "" })) }, as.merchant("m1")); }, done: () => (ctx.added || []).length && ctx.added.every((id) => S().msku.m1[id]) }),
      st("admin", "التسعير: سعر واحد أعلى 40% من المرجعي اتحجز للمراجعة (Guardrail G).", { view: "/admin/pricing" }),
      st("customer", "المنتجات ظهرت للعملاء في صفحة المحل.", { view: "/customer/store/m1" }),
    ],
  },
  /* 11 */ {
    id: "s11", title: "منتج مش موجود في الكتالوج", sub: "مخبز الأمانة عايز يبيع «عيش سن بلدي». يطلب إضافته، قسم الكتالوج يتأكد إنه مش مكرر وينشئ SKU معتمد.", outcome: "منتج جديد بدون تكرار ولا أسماء عشوائية — وكلمة «عيش سن» اللي كانت بتطلع بحث بدون نتيجة بقت بتلاقي منتج.",
    setup() { ctx.t0 = Date.now(); sess({ merchant: "m4", admin: "u14", customer: "c1" }); },
    steps: [
      st("merchant", "«مش لاقي المنتج؟ اطلب إضافته» ← «عيش سن بلدي (ردة)».", { view: "/merchant/catalog", hl: '[data-hl="merch-missing"]', auto: () => { const r = TW.act("mcat.request", { merchantId: "m4", name: "عيش سن بلدي (ردة)", barcode: "", catGuess: "bakery/bread", photo: true }, as.merchant("m4")); if (r.ok) ctx.req = r.id; return r; }, done: () => { const c = S().catReqs.find((x) => x.merchantId === "m4" && x.at >= ctx.t0); if (c) ctx.req = c.id; return !!c; } }),
      st("admin", "ليلى (الأقسام): طابور الموافقة بيكشف التكرار — مفيش منتج مطابق ⇒ أنشئ SKU معتمد.", { view: "/admin/catalog", hl: '[data-hl="catreq"]', auto: () => TW.act("catalog.createFromRequest", { reqId: ctx.req, ar: "عيش سن بلدي (ردة)", en: "Baladi whole-wheat bread", brand: "مخبز الأمانة", dept: "bakery", cat: "bread", size: "5 أرغفة", price: 18 }, as.admin("u14")), done: () => { const c = find(S().catReqs, ctx.req); return c && c.status !== "PENDING"; } }),
      st("merchant", "التاجر اتبلّغ والمنتج اتضاف لمحله بسعره.", { view: "/merchant/catalog" }),
      st("customer", "دوّر على «عيش سن» — بقى بيلاقي منتج.", { view: "/customer/search" }),
    ],
  },
  /* 12 */ {
    id: "s12", title: "التوسع لقرية جديدة", sub: "الوفائية: 186 في قائمة الانتظار و940 بحث ومفيش صيدلية. الكنترول يطلق منطقة تجريبية بنوافذ مجدولة ويفتح مهمة استقطاب.", outcome: "القرار مبني على إشارات طلب حقيقية؛ المنطقة اتفعلت بنوافذ، واتعملت مهمة استقطاب صيدلية، والعملاء اللي مستنيين اتبلغوا.",
    setup() { ctx.t0 = Date.now(); sess({ admin: "u1", customer: "c12" }); const c = find(S().customers, "c12"); if (!c.waitlist.includes("wafaeya")) c.waitlist.push("wafaeya"); },
    steps: [
      st("admin", "لوحة التوسع: الوفائية «محتاجة استقطاب تجار» — الطلب المتوقع، تكلفة التوصيل، ونقطة التعادل.", { view: "/admin/expansion", hl: '[data-hl="exp-wafaeya"]' }),
      st("admin", "أطلق «منطقة خدمة تجريبية» بنوافذ توصيل مجدولة — بسبب مكتوب.", { view: "/admin/expansion", hl: '[data-hl="exp-wafaeya"]', auto: () => TW.act("zone.launch", { zoneId: "wafaeya", reason: "قائمة انتظار 186 + 940 بحث — تجربة 4 أسابيع" }, as.admin("u1")), done: () => find(S().zones, "wafaeya").active }),
      st("admin", "اتعملت مهمة استقطاب صيدلية للوفائية تلقائياً في خط المبيعات.", { view: "/admin/acquisition" }),
      st("customer", "شيماء (كانت في قائمة الانتظار) وصلها إشعار «توّا وصلت الوفائية».", { view: "/customer" }),
      st("admin", "المنطقة في إعدادات المناطق برسومها وحدّها الأدنى ونوافذها.", { view: "/admin/zones" }),
    ],
  },
  /* 13 */ {
    id: "s13", title: "اقتصاديات العرض قبل إطلاقه", sub: "التسويق يبني عرض 25% على البقالة للعملاء المتوقفين. النظام يحسب المساهمة المتوقعة؛ تحت الحد ⇒ موافقة المدير العام.", outcome: "مفيش عرض بيتطلق على حساب الربحية من غير قرار واضح؛ النسخة المعدّلة (15% بتمويل مشترك وحد أدنى أعلى للسلة) عدّت الحد وانطلقت في حملة.",
    setup() { ctx.t0 = Date.now(); sess({ admin: "u15" }); },
    steps: [
      st("admin", "منة (التسويق) تفتح منشئ العروض: الجمهور «متوقف»، 25% على البقالة، تمويل توّا.", { view: "/admin/promotions", hl: '[data-hl="promo-builder"]', auto: () => { const r = TW.act("promo.create", { name: "رجوع المتوقفين — 25% بقالة", code: "BACK25", type: "percent", value: 25, cap: 80, minBasket: 150, scope: "dept:grocery", funding: "twaa", budget: 20000, limit: 1, segment: "sg-lapsed", goal: "winback", days: 7 }, as.admin("u15")); if (r.ok) ctx.promo = r.promo.id; return r; }, done: () => { const p = S().promos.find((x) => x.code === "BACK25"); if (p) ctx.promo = p.id; return !!p; } }),
      st("admin", "المساهمة المتوقعة تحت الحد ⇒ العرض «بانتظار الموافقة» ومش هيشتغل لوحده.", { view: "/admin/approvals", hl: '[data-hl="approvals-list"]' }),
      st("admin", "هشام (المدير العام) يرفض بسبب: «خفّض الخصم لـ 15% بتمويل مشترك وارفع الحد الأدنى للسلة».", { view: "/admin/approvals", auto: () => { const ap = S().approvals.find((a) => a.type === "promo" && a.ref.id === ctx.promo && a.status === "PENDING"); return ap ? TW.act("approval.decide", { approvalId: ap.id, decision: "reject", note: "خفّض الخصم لـ 15% بتمويل مشترك وارفع الحد الأدنى للسلة لـ 250" }, as.admin("u4")) : { ok: true }; }, done: () => { const p = find(S().promos, ctx.promo); return p && p.status === "rejected"; } }),
      st("admin", "منة تعدّل: 15% بتمويل مشترك وحد أدنى 250 ج.م ⇒ المساهمة فوق الحد ⇒ يتفعّل وتطلقه في حملة.", { view: "/admin/campaigns", auto: () => { sess({ admin: "u15" }); const r = TW.act("promo.create", { name: "رجوع المتوقفين — 15% بقالة (مشترك)", code: "BACK15", type: "percent", value: 15, cap: 50, minBasket: 250, scope: "dept:grocery", funding: "shared", budget: 15000, limit: 1, segment: "sg-lapsed", goal: "winback", days: 7 }, as.admin("u15")); if (r.ok === false) return r; const c = TW.act("campaign.create", { name: "رجوع المتوقفين بالبقالة", audience: "sg-lapsed", offer: r.promo.id, channel: "push+whatsapp", schedule: "الخميس 6 م", budget: 15000, goal: "winback" }, as.admin("u15")); if (c.ok === false) return c; return TW.act("campaign.launch", { id: c.campaign.id }, as.admin("u15")); } }),
    ],
  },
  /* 14 */ {
    id: "s14", title: "إقفال اليوم المالي", sub: "نهى (المالية) تقفل اليوم: مدفوعات أونلاين، كاش، مستحقات التجار والمناديب، والاستثناءات المالية. الإقفال ممنوع طول ما فيه تعرّض مفتوح.", outcome: "اليوم اتقفل والطلبات المطابقة بقت «مقفلة مالياً»، وكل خطوة باسم صاحبها في التدقيق.",
    setup() { ctx.t0 = Date.now(); sess({ admin: "u9" }); },
    steps: [
      st("admin", "شاشة المطابقة: التعرّض المالي المفتوح وكل اللي مانع الإقفال.", { view: "/admin/reconciliation", hl: '[data-hl="recon-steps"]' }),
      st("admin", "المدفوعات: البوابة أكدت خصم TW-1024 المعلّق ⇒ اتطابق.", { view: "/admin/payments", auto: () => { const ps = S().payments.filter((p) => p.status === "PENDING"); ps.forEach((p) => TW.act("payment.reconcile", { paymentId: p.id, result: "success" }, as.admin("u9"))); return TW.act("recon.step", { step: "online" }, as.admin("u9")); }, done: () => !!S().recon.online }),
      st("admin", "الكاش: حسم فرق TW-1020، توريد كاش المناديب وتأكيده.", { view: "/admin/cod", auto: () => { S().cod.filter((c) => c.variance && !c.varianceResolved).forEach((c) => TW.act("cod.resolve", { codId: c.id, party: "rider", reason: "لا يوجد عرض يبرر الفرق" }, as.admin("u9"))); S().riders.filter((r) => r.cash > 0 && !r.task).forEach((r) => TW.act("rider.deposit", { riderId: r.id }, as.rider(r.id))); S().deposits.filter((d) => d.status === "PENDING_VERIFY").forEach((d) => TW.act("deposit.verify", { depositId: d.id }, as.admin("u9"))); return TW.act("recon.step", { step: "cod" }, as.admin("u9")); }, done: () => !!S().recon.cod }),
      st("admin", "ترحيل مستحقات التجار والمناديب.", { view: "/admin/merchant-settlements", auto: () => { TW.act("recon.step", { step: "merchant" }, as.admin("u9")); return TW.act("recon.step", { step: "rider" }, as.admin("u9")); }, done: () => !!S().recon.merchant && !!S().recon.rider }),
      st("admin", "الاستثناءات المالية: الاستردادات المعلّقة والحالات المالية المفتوحة لازم تتحسم.", { view: "/admin/refunds", auto: () => { S().approvals.filter((a) => a.status === "PENDING" && a.type === "refund").forEach((a) => TW.act("approval.decide", { approvalId: a.id, decision: "approve" }, as.admin("u9"))); S().cases.filter((c) => c.status !== "RESOLVED" && ["صنف ناقص", "صنف غلط", "صنف تالف", "فرق في الكاش", "استرداد"].includes(c.type)).forEach((c) => TW.act("case.resolve", { caseId: c.id, resolution: "اتراجعت في إقفال اليوم — لا مبلغ إضافي مستحق" }, as.admin("u9"))); return TW.act("recon.step", { step: "exceptions" }, as.admin("u9")); }, done: () => !!S().recon.exceptions }),
      st("admin", "اقفل اليوم المالي.", { view: "/admin/reconciliation", hl: '[data-hl="recon-steps"]', auto: () => TW.act("recon.close", {}, as.admin("u9")), done: () => !!S().recon.closedAt }),
    ],
  },
];
})();
