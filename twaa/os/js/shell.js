/* Twaa Business OS — shell: router, app instances, DOM patching, overlays, ecosystem home, live view, scenario director.

   APP CONTRACT (customer.js / merchant.js / rider.js / admin*.js):
     TW.apps.<name> = {
       kind: "phone" | "desk",          // phone apps get a device frame on desktop, full screen on phones
       actorKind: "customer" | "merchant" | "rider" | "admin",
       title: "…",
       render(inst) → HTML string       // the whole app UI (top bar, scroll area, tab bar, sheets) — re-run on every state change
       on: { actName(inst, data, el, ev) {} }   // click handlers for elements with data-act="actName" (data = el.dataset)
       init(inst) {}                    // optional, once per mount
     }
   Instance (inst): { name, el, path, route:[segments after app], ui:{} (per-instance UI state), primary, compact,
                      go(path), back(), render(), toast(text, tone), actorId() }
   Built-in data-act values: "go" (data-to="/customer/cart"), "back", "ui" (data-k, data-v → inst.ui[k]=v), "ui-toggle" (data-k),
                      "sheet-close" (clears inst.ui.sheet), "modal-close" (clears inst.ui.modal), "drawer-close" (clears inst.ui.drawer).
   Inputs: data-model="key" binds value to inst.ui[key]; add data-live to re-render on every keystroke.
   Live timers: <span data-until="ms"> countdown · <span data-since="ms"> elapsed · <span data-ago="ms"> relative time.
   Paths map to bare-token hashes: "/admin/order/TW-1043" ⇄ "#admin.order.TW-1043". */
(function () {
const TW = window.TW;
const { ic, esc, money, num, dur, ago, logo } = TW;

/* ===================================================================== DOM patching (index-based morph) ===================== */
function morph(parent, html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  patchChildren(parent, tpl.content);
}
function same(a, b) { if (a.nodeType !== b.nodeType) return false; if (a.nodeType !== 1) return true; if (a.tagName !== b.tagName) return false; const ka = a.getAttribute("data-k"), kb = b.getAttribute("data-k"); return ka === kb; }
function patchChildren(a, b) {
  const bn = Array.from(b.childNodes);
  for (let i = 0; i < bn.length; i++) {
    const y = bn[i], x = a.childNodes[i];
    if (!x) { a.appendChild(y); continue; }
    if (same(x, y)) patchNode(x, y); else a.replaceChild(y, x);
  }
  while (a.childNodes.length > bn.length) a.removeChild(a.lastChild);
}
function patchNode(x, y) {
  if (x.nodeType !== 1) { if (x.nodeValue !== y.nodeValue) x.nodeValue = y.nodeValue; return; }
  const focused = x === document.activeElement;
  for (const at of Array.from(x.attributes)) if (!y.hasAttribute(at.name)) x.removeAttribute(at.name);
  for (const at of Array.from(y.attributes)) if (x.getAttribute(at.name) !== at.value) x.setAttribute(at.name, at.value);
  const tag = x.tagName;
  if (tag === "INPUT") { if (!focused) { if (x.type === "checkbox" || x.type === "radio") x.checked = y.hasAttribute("checked"); else if (x.value !== (y.getAttribute("value") || "")) x.value = y.getAttribute("value") || ""; } return; }
  if (tag === "TEXTAREA") { if (!focused && x.value !== y.textContent) x.value = y.textContent; return; }
  patchChildren(x, y);
  if (tag === "SELECT" && !focused) { const sel = y.querySelector("option[selected]"); if (sel) x.value = sel.value; }
}
TW.morph = morph;

/* ===================================================================== paths ===================== */
const toHash = (p) => p.replace(/^\//, "").split("/").filter(Boolean).join(".");
const fromHash = (h) => "/" + decodeURIComponent(h.replace(/^#/, "")).split(".").filter(Boolean).join("/");
TW.apps = TW.apps || {};

/* ===================================================================== instances ===================== */
const instances = new Set();
let seq = 0;
function mount(name, el, opts = {}) {
  const app = TW.apps[name];
  const inst = { id: ++seq, name, app, el, ui: {}, primary: !!opts.primary, compact: !!opts.compact, path: opts.path || `/${name}`, route: [], seenNotes: new Set() };
  inst.setPath = (p) => { inst.path = p; inst.route = p.split("/").filter(Boolean).slice(1); };
  inst.setPath(inst.path);
  inst.go = (p) => { if (!p.startsWith("/")) p = `/${name}/${p}`; inst.ui.sheet = null; inst.ui.modal = null; inst.ui.drawer = null; (inst.hist = inst.hist || []).push(inst.path); if (inst.primary) TW.nav(p); else { inst.setPath(p); inst.render(); } const sc = inst.el.querySelector(".app-scroll, .cc-main"); if (sc) sc.scrollTop = 0; };
  inst.back = () => { const h = inst.hist || []; const p = h.pop() || `/${name}`; if (inst.primary) TW.nav(p, true); else { inst.setPath(p); inst.render(); } };
  inst.render = () => { if (!inst.el.isConnected) return; let html; try { html = app.render(inst); } catch (e) { console.error(e); html = `<div class="card" style="margin:16px"><b>حصل خطأ في عرض الشاشة</b><p class="muted mono">${esc(e.message)}</p><button class="btn sm" data-act="go" data-to="/${name}">رجوع للرئيسية</button></div>`; } morph(inst.el, html); updateTimers(inst.el); };
  inst.toast = (text, tone = "", title = "") => { inst.ui._toast = { text, tone, title, at: Date.now() }; inst.render(); clearTimeout(inst._tt); inst._tt = setTimeout(() => { inst.ui._toast = null; inst.render(); }, 3800); };
  inst.actorId = () => (app.actorKind ? TW.S.session[app.actorKind === "admin" ? "admin" : app.actorKind] : null);
  inst.act = (actionName, payload, actor) => { const r = TW.act(actionName, payload, actor || TW.actor[app.actorKind === "admin" ? "admin" : app.actorKind](app.actorKind === "admin" ? undefined : inst.actorId())); if (r && r.ok === false) { if (app.kind === "phone") inst.toast(r.error, "bad"); else TW.toast(r.error, "bad"); } return r; };
  wire(inst);
  instances.add(inst);
  el.dataset.inst = inst.id;
  /* mark existing notes as seen so we only pop new ones */
  (TW.S.notes || []).forEach((n) => inst.seenNotes.add(n.id));
  if (app.init) app.init(inst);
  inst.render();
  return inst;
}
function unmountAll(root) { for (const i of [...instances]) if (!i.el.isConnected || (root && root.contains(i.el))) instances.delete(i); }
TW.mount = mount;
TW.instances = instances;

function wire(inst) {
  const el = inst.el;
  el.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-act]");
    if (!t || !el.contains(t)) return;
    if (t.tagName === "A" && t.getAttribute("href") && !t.dataset.to) return;
    const act = t.dataset.act; const d = t.dataset;
    if (t.disabled || t.getAttribute("aria-disabled") === "true") return;
    if (!(t.tagName === "INPUT" && /checkbox|radio/.test(t.type))) ev.preventDefault();
    if (act === "go") return inst.go(d.to);
    if (act === "back") return inst.back();
    if (act === "ui") { inst.ui[d.k] = d.v === "null" ? null : d.v; return inst.render(); }
    if (act === "ui-toggle") { inst.ui[d.k] = !inst.ui[d.k]; return inst.render(); }
    if (act === "sheet-close") { if (ev.target !== t && t.classList.contains("sheet-scrim")) return; inst.ui.sheet = null; return inst.render(); }
    if (act === "modal-close") { if (ev.target !== t && t.classList.contains("scrim")) return; inst.ui.modal = null; return inst.render(); }
    if (act === "drawer-close") { if (ev.target !== t && t.classList.contains("drawer-scrim")) return; inst.ui.drawer = null; return inst.render(); }
    const h = (inst.app.handler && inst.app.handler(inst, act)) || (inst.app.on && inst.app.on[act]);
    if (h) { try { h(inst, d, t, ev); } catch (e) { console.error(e); TW.toast(e.message, "bad"); } }
    else console.warn("no handler for", act, "in", inst.name);
  });
  el.addEventListener("input", (ev) => { const t = ev.target; if (!t.dataset || !t.dataset.model) return; inst.ui[t.dataset.model] = t.type === "checkbox" ? t.checked : t.value; if (t.dataset.live !== undefined) inst.render(); });
  el.addEventListener("change", (ev) => { const t = ev.target; if (!t.dataset) return; if (t.dataset.model) { inst.ui[t.dataset.model] = t.type === "checkbox" ? t.checked : t.value; } if (t.dataset.change) { const h = (inst.app.handler && inst.app.handler(inst, t.dataset.change)) || (inst.app.on && inst.app.on[t.dataset.change]); if (h) h(inst, t.dataset, t, ev); else inst.render(); } else if (t.dataset.model && t.tagName === "SELECT") inst.render(); });
  el.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && ev.target.dataset && ev.target.dataset.enter) { ev.preventDefault(); const h = (inst.app.handler && inst.app.handler(inst, ev.target.dataset.enter)) || inst.app.on[ev.target.dataset.enter]; if (h) h(inst, ev.target.dataset, ev.target, ev); } if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches("[role=button][data-act]")) { ev.preventDefault(); ev.target.click(); } });
  el.addEventListener("submit", (ev) => ev.preventDefault());
}

/* live timers without full re-render */
function updateTimers(root) {
  const t = Date.now();
  root.querySelectorAll("[data-until]").forEach((e) => { const left = Number(e.dataset.until) - t; const txt = left < 0 ? `+${dur(-left)}` : dur(left); if (e.textContent !== txt) e.textContent = txt; e.classList.toggle("late", left < 0); e.classList.toggle("soon", left >= 0 && left < Number(e.dataset.soon || 60000)); });
  root.querySelectorAll("[data-since]").forEach((e) => { const txt = dur(t - Number(e.dataset.since)); if (e.textContent !== txt) e.textContent = txt; });
  root.querySelectorAll("[data-ago]").forEach((e) => { const txt = ago(Number(e.dataset.ago)); if (e.textContent !== txt) e.textContent = txt; });
}

/* render scheduling: state change → re-render every mounted instance once per frame */
let raf = 0;
function renderAll() { raf = 0; unmountAll(); instances.forEach((i) => { popNotes(i); i.render(); }); }
function schedule() { if (!raf) raf = requestAnimationFrame(renderAll); }
TW.renderAll = schedule;

/* new notifications for an instance's actor → in-app toast */
function popNotes(inst) {
  const kind = inst.app.actorKind; if (!kind || kind === "admin") return;
  const key = `${kind}:${inst.actorId()}`;
  const fresh = TW.S.notes.filter((n) => n.to === key && !inst.seenNotes.has(n.id));
  fresh.forEach((n) => inst.seenNotes.add(n.id));
  if (fresh.length) { const n = fresh[0]; inst.ui._toast = { title: n.title, text: n.body, tone: n.alert ? "alert" : "", at: Date.now(), note: n }; clearTimeout(inst._tt); inst._tt = setTimeout(() => { inst.ui._toast = null; inst.render(); }, 4500); }
}
/* the in-app toast markup — phone apps call TW.inappToast(inst) at the end of render() */
TW.inappToast = (inst) => { const t = inst.ui._toast; if (!t) return ""; return `<div class="inapp-toast" role="status">${ic(t.tone === "bad" ? "alert" : t.tone === "alert" ? "bell" : "info", "ic sm")}<div class="grow">${t.title ? `<b>${esc(t.title)}</b>` : ""}${esc(t.text)}</div></div>`; };
TW.sheet = (title, body, foot = "", opts = {}) => `<div class="sheet-scrim" data-act="sheet-close"><div class="sheet" role="dialog" aria-label="${esc(title)}" data-act="noop"><div class="sh"><h3>${esc(title)}</h3><button class="btn icon sm ghost" data-act="sheet-close" aria-label="إغلاق">${ic("x", "ic sm")}</button></div><div class="sb">${body}</div>${foot ? `<div class="sf">${foot}</div>` : ""}</div></div>`;
TW.modalWrap = (title, body, foot = "", opts = {}) => `<div class="scrim" data-act="modal-close"><div class="modal ${opts.wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}" data-act="noop"><div class="mh"><h3>${title}</h3><button class="btn icon sm ghost" data-act="modal-close" aria-label="إغلاق">${ic("x", "ic sm")}</button></div><div class="mb">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ""}</div></div>`;
TW.drawerWrap = (title, body, tools = "") => `<div class="drawer-scrim" data-act="drawer-close"><aside class="drawer" role="dialog" aria-label="${esc(title)}" data-act="noop"><div class="dh"><h3>${title}</h3>${tools}<button class="btn icon sm ghost" data-act="drawer-close" aria-label="إغلاق">${ic("x", "ic sm")}</button></div><div class="db">${body}</div></aside></div>`;

/* ===================================================================== global overlays ===================== */
let toastsEl, ttEl;
TW.toast = (text, tone = "") => { if (!toastsEl) return; const d = document.createElement("div"); d.className = `toast ${tone}`; d.setAttribute("role", "status"); d.innerHTML = `${ic(tone === "bad" ? "alert" : tone === "ok" ? "check" : "info", "ic sm")}<div>${esc(text)}</div>`; toastsEl.appendChild(d); setTimeout(() => d.remove(), 4200); };
function tooltips() {
  document.addEventListener("mousemove", (e) => { const t = e.target.closest && e.target.closest("[data-tip]"); if (!t) { ttEl.style.opacity = 0; return; } ttEl.textContent = t.dataset.tip; ttEl.style.opacity = 1; const r = ttEl.getBoundingClientRect(); let L = e.clientX + 14, T = e.clientY + 14; if (L + r.width > innerWidth - 8) L = e.clientX - r.width - 14; if (T + r.height > innerHeight - 8) T = e.clientY - r.height - 14; ttEl.style.left = L + "px"; ttEl.style.top = T + "px"; });
  document.addEventListener("focusin", (e) => { const t = e.target.closest && e.target.closest("[data-tip]"); if (!t) return; const b = t.getBoundingClientRect(); ttEl.textContent = t.dataset.tip; ttEl.style.opacity = 1; ttEl.style.left = Math.max(8, b.left) + "px"; ttEl.style.top = b.bottom + 6 + "px"; });
  document.addEventListener("focusout", () => (ttEl.style.opacity = 0));
}

/* ===================================================================== theme ===================== */
function applyTheme(t) { const r = document.documentElement; if (t === "light" || t === "dark") r.setAttribute("data-theme", t); else r.removeAttribute("data-theme"); TW.store.set("twaa-os-theme", t || "system"); }
TW.cycleTheme = () => { const cur = TW.store.get("twaa-os-theme") || "system"; const next = cur === "system" ? "dark" : cur === "dark" ? "light" : "system"; applyTheme(next); TW.toast(next === "system" ? "المظهر: حسب الجهاز" : next === "dark" ? "المظهر: داكن" : "المظهر: فاتح"); renderOsbar(); };

/* ===================================================================== router & layouts ===================== */
let root, osbarEl, viewEl, directorEl, curView = null, curApp = null;
const VIEWS = [["home", "النظام", "layers"], ["customer", "العميل", "bag"], ["merchant", "التاجر", "store"], ["rider", "المندوب", "bike"], ["admin", "الكنترول", "chart"], ["live", "عرض متزامن", "zap"]];
TW.nav = (p, replace) => { const h = "#" + toHash(p); if (location.hash === h) route(); else if (replace) { history.replaceState(null, "", h); route(); } else location.hash = h; };
function route() {
  const p = location.hash ? fromHash(location.hash) : "/home";
  const seg = p.split("/").filter(Boolean);
  const view = seg[0] && (TW.apps[seg[0]] || seg[0] === "live" || seg[0] === "home") ? seg[0] : "home";
  const path = seg.length ? p : "/home";
  if (view === curView && curApp && (view !== "live" && view !== "home")) { const changed = curApp.path !== path; curApp.setPath(path); curApp.render(); renderOsbar(); if (changed) { const sc = curApp.el.querySelector(".cc-main, .app-scroll"); if (sc) sc.scrollTop = 0; window.scrollTo(0, 0); } return; }
  curView = view; viewEl.innerHTML = ""; unmountAll(viewEl); for (const i of [...instances]) if (!i.el.isConnected) instances.delete(i);
  if (view === "home") { const host = document.createElement("div"); viewEl.appendChild(host); curApp = mount("home", host, { primary: true, path }); }
  else if (view === "live") layoutLive();
  else if (TW.apps[view].kind === "phone") layoutStage(view, path);
  else { const host = document.createElement("div"); viewEl.appendChild(host); curApp = mount(view, host, { primary: true, path }); }
  renderOsbar(); window.scrollTo(0, 0);
}
function phoneFrame() { return `<div class="phone"><div class="notch"></div><div class="screen"><div class="statusbar"><span class="sb-time"></span><span>5G ▮▮▮</span></div><div class="app-host" style="flex:1;min-height:0;display:flex;flex-direction:column;position:relative"></div></div></div>`; }
function layoutStage(view, path) {
  viewEl.innerHTML = `<div class="stage"><aside class="rail right"></aside><div class="ph">${phoneFrame()}</div><aside class="rail left"></aside></div>`;
  curApp = mount(view, viewEl.querySelector(".app-host"), { primary: true, path });
  mount("rail", viewEl.querySelector(".rail.right"), { path: `/rail/${view}/actor` });
  mount("rail", viewEl.querySelector(".rail.left"), { path: `/rail/${view}/system` });
}
function layoutLive() {
  viewEl.innerHTML = `<div class="live">${[["customer", "تطبيق العميل", "bag"], ["merchant", "تطبيق التاجر", "store"], ["rider", "تطبيق المندوب", "bike"]].map(([a, l, i]) => `<div><div class="ph-l">${ic(i, "ic sm")} ${l}</div>${phoneFrame().replace('class="app-host"', `class="app-host" data-live-app="${a}"`)}</div>`).join("")}<div class="ctower"><div class="ph-l">${ic("chart", "ic sm")} برج التحكم — نفس اللحظة</div><div class="tower-host"></div></div></div>`;
  ["customer", "merchant", "rider"].forEach((a) => mount(a, viewEl.querySelector(`[data-live-app="${a}"]`), { path: `/${a}` }));
  if (TW.apps.admin) mount("admin", viewEl.querySelector(".tower-host"), { path: "/admin/control-tower", compact: true });
  curApp = null;
}
TW.liveInstance = (name) => [...instances].find((i) => i.name === name && i.el.closest && i.el.closest(".live"));

function renderOsbar() {
  const pend = TW.S.approvals.filter((a) => a.status === "PENDING").length, al = TW.alerts().filter((a) => a.sev === "critical").length;
  const theme = TW.store.get("twaa-os-theme") || "system";
  osbarEl.innerHTML = `<button class="brand" data-nav="/home" aria-label="الصفحة الرئيسية للنظام">${logo("currentColor", "var(--logo-spark)")}<span>توّا OS<small> · Twaa Business OS</small></span></button>
  <nav aria-label="التطبيقات">${VIEWS.slice(1).map(([v, l, i]) => `<button class="${curView === v ? "on" : ""}" data-nav="/${v}">${ic(i, "ic sm")}${l}${v === "admin" && al ? ` <span class="chip t-bad" style="line-height:16px">${al}</span>` : ""}</button>`).join("")}</nav>
  <div class="tools"><button class="btn sm accent" data-dir="open">${ic("play", "ic xs")}<span class="hide-sm">السيناريوهات</span></button><button class="btn sm icon" data-theme-btn aria-label="تغيير المظهر" title="المظهر">${ic(theme === "dark" ? "moon" : theme === "light" ? "sun" : "settings", "ic sm")}</button></div>`;
}

/* ===================================================================== ecosystem home ===================== */
TW.apps.home = {
  kind: "page", title: "Twaa Business OS",
  render(inst) {
    const S = TW.S, k = TW.kpis(), alerts = TW.alerts();
    const live = S.orders.filter((o) => !["DELIVERED", "CANCELLED", "RETURNED"].includes(o.status));
    const pend = S.approvals.filter((a) => a.status === "PENDING").length;
    const node = (x, y, w, t, s, cls, to, hl) => `<g class="node ${cls}" data-act="go" data-to="${to}" tabindex="0" role="link" aria-label="${esc(t)}"><rect x="${x}" y="${y}" width="${w}" height="58" rx="14"/><text x="${x + w / 2}" y="${y + 25}" text-anchor="middle">${esc(t)}</text><text class="s" x="${x + w / 2}" y="${y + 44}" text-anchor="middle">${esc(s)}</text></g>`;
    const fosActive = S.fos.filter((f) => ["AWAITING_ACCEPT", "PREPARING", "PICKING", "QUEUED"].includes(f.status)).length;
    const tasksActive = S.tasks.filter((t) => ["OFFERED", "ASSIGNED", "AT_PICKUP", "PICKED_UP", "ARRIVED"].includes(t.status)).length;
    const codHeld = TW.sum(S.riders, (r) => r.cash);
    const map = `<svg viewBox="0 0 1180 330" role="img" aria-label="خريطة تدفق النظام"><defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--line-2)"/></marker></defs>
      <path class="edge flow" d="M1080 80 H 960"/><path class="edge flow" d="M820 80 H 700"/><path class="edge flow" d="M560 80 H 440"/><path class="edge flow" d="M300 80 H 180"/>
      <path class="edge flow" d="M110 109 V 190"/><path class="edge flow" d="M180 220 H 300"/><path class="edge flow" d="M440 220 H 560"/><path class="edge flow" d="M700 220 H 820"/><path class="edge flow" d="M960 220 H 1080"/>
      <path class="edge data" d="M630 109 C 630 150, 630 150, 630 190"/>
      ${node(1080, 51, 100, "العميل", `${live.length} طلب شغال`, "ext", "/customer")}${node(820, 51, 140, "التجارة", "كتالوج · بحث · سلة", "", "/customer/categories")}${node(560, 51, 140, "OMS", `${S.orders.length} طلب · تحقق P04`, "core", "/admin/orders")}${node(300, 51, 140, "التنفيذ", `${fosActive} أمر تنفيذ`, "", "/admin/picking")}${node(40, 51, 140, "تاجر / هب", `${S.merchants.filter((m) => m.status === "active").length} تاجر · هب 1`, "ext", "/merchant")}
      ${node(40, 191, 140, "التوصيل", `${tasksActive} مهمة نشطة`, "", "/admin/dispatch")}${node(300, 191, 140, "المندوب", `${S.riders.filter((r) => r.status !== "offline").length} أونلاين`, "ext", "/rider")}${node(560, 191, 140, "التسليم للعميل", "OTP · GPS · كاش", "", "/admin/orders")}${node(820, 191, 140, "التسوية", `كاش مع المناديب ${money(codHeld)}`, "core", "/admin/reconciliation")}${node(1080, 191, 100, "الإقفال", S.recon.closedAt ? "مقفل" : "مفتوح", "", "/admin/reconciliation")}
      <g transform="translate(0,268)">${[["CRM", "/admin/crm", "الشرائح والحملات"], ["المالية", "/admin/payments", "مدفوعات · كاش · تسويات"], ["التحليلات", "/admin/analytics", "اقتصاديات الوحدة"], ["برج التحكم", "/admin/control-tower", `${alerts.length} تنبيه`]].map(([t, to, s], i) => node(140 + i * 240, 0, 200, t, s, "data", to)).join("")}</g></svg>`;
    const scen = (TW.scenarios || []).map((s, i) => `<button data-act="scenario" data-id="${s.id}"><span class="n">${i + 1}</span><span><b>${esc(s.title)}</b><small>${esc(s.sub)}</small></span></button>`).join("");
    return `<div class="home">
      <section class="hero"><div>
        <div class="eyebrow">أبو المطامير · البحيرة · منصة تشغيل واحدة</div>
        <h1>توّا <span>Business OS</span></h1>
        <p class="lead">أربع واجهات على محرك واحد: العميل بيطلب، التاجر بيجهّز، المندوب بيوصّل، والشركاء شايفين كل حاجة من الكنترول. كل ضغطة هنا بتغيّر نفس البيانات، فاللي بيعمله التاجر بيظهر فوراً عند المندوب والعميل وفي برج التحكم.</p>
        <div class="meta">${TW.chip("Customer Order ≠ Fulfillment Order", "brand", "layers")}${TW.chip("حالة تشغيلية منفصلة عن الحالة المالية", "info", "scale")}${TW.chip("كل إجراء مالي له سبب وسجل تدقيق", "accent", "shield")}</div>
        <div class="row wrap" style="margin-top:16px"><button class="btn primary lg" data-act="go" data-to="/live">${ic("zap", "ic sm")}شوف المنصة شغالة متزامنة</button><button class="btn lg" data-act="scenario" data-id="s1">${ic("play", "ic sm")}ابدأ أول سيناريو</button></div>
      </div>
      <div class="pulseboard" aria-label="نبض اليوم">
        <div class="pb"><span>طلبات اليوم</span><b>${num(k.orders)}</b></div><div class="pb"><span>قيمة الطلبات (GMV)</span><b>${TW.kmoney(k.gmv)}</b></div>
        <div class="pb"><span>هامش المساهمة اليوم</span><b>${money(k.cm)}</b></div><div class="pb"><span>تنبيهات تحتاج تدخل</span><b style="color:var(--bad)">${alerts.length}</b></div>
        <div class="pb"><span>موافقات معلّقة</span><b>${pend}</b></div><div class="pb"><span>كاش مع المناديب</span><b>${money(codHeld)}</b></div>
      </div></section>
      <section class="appcards">
        <button class="appcard" data-act="go" data-to="/customer"><span class="aic tone-4">${ic("bag", "ic lg")}</span><h3>تطبيق العميل</h3><span class="tag">اطلب كل احتياجاتك</span><p>بقالة وأكل وصيدلية ومحلات حواليك في سلة واحدة، بموعد توصيل واقعي حسب منطقتك.</p><span class="who">${ic("user", "ic xs")} ${esc(TW.actor.customer().name)} · ${esc(TW.zoneOfCustomer(S.session.customer).ar)}</span></button>
        <button class="appcard" data-act="go" data-to="/merchant"><span class="aic tone-6">${ic("store", "ic lg")}</span><h3>تطبيق التاجر</h3><span class="tag">بيع أكتر وإدارتك أبسط</span><p>استلم الطلب في ثواني، اختار منتجاتك من كتالوج توّا من غير كتابة، واعرف كل جنيه ليه اتخصم.</p><span class="who">${ic("store", "ic xs")} ${esc(TW.actor.merchant().name)}</span></button>
        <button class="appcard" data-act="go" data-to="/rider"><span class="aic tone-5">${ic("bike", "ic lg")}</span><h3>تطبيق المندوب</h3><span class="tag">استلم، وصّل، واتحاسب</span><p>أزرار كبيرة بإيد واحدة، كود استلام لكل طرد، وعداد كاش يمنع التجاوز.</p><span class="who">${ic("bike", "ic xs")} ${esc(TW.actor.rider().name)}</span></button>
        <button class="appcard ctrl" data-act="go" data-to="/admin"><span class="aic" style="background:rgba(255,255,255,.12)">${ic("chart", "ic lg")}</span><h3>Twaa Control Center</h3><span class="tag">شوف الشركة كلها من مكان واحد</span><p>برج تحكم، توزيع، مخزون، مالية، نمو، وحوكمة بصلاحيات وسجل تدقيق.</p><span class="who">${ic("shield", "ic xs")} ${esc(TW.actor.admin().name)} · ${esc(TW.roleOf().ar)}</span></button>
      </section>
      <section class="col gap12"><div class="sec-h"><div><h2>رحلة الطلب في النظام</h2><p>اضغط على أي مرحلة تفتح الشاشة المسؤولة عنها. الأرقام حيّة من نفس البيانات.</p></div></div><div class="sysmap tw">${map}</div></section>
      <section class="col gap12"><div class="sec-h"><div><h2>سيناريوهات قابلة للتشغيل</h2><p>كل سيناريو بيجهّز البيانات ويمشّيك خطوة بخطوة بين التطبيقات. تقدر تنفّذ كل خطوة بنفسك أو تخلي المخرج ينفّذها.</p></div><button class="btn" data-act="reset">${ic("refresh", "ic sm")}إعادة ضبط بيانات العرض</button></div><div class="scen">${scen}</div></section>
      ${inst.ui.modal === "reset" ? TW.modalWrap("إعادة ضبط بيانات العرض", `<p>هترجع كل الطلبات والمخزون والموافقات لحالة الصبح التجريبية. أي حاجة عملتها هتتمسح من المتصفح ده.</p>`, `<button class="btn danger" data-act="reset-yes">${ic("refresh", "ic sm")}أعد الضبط</button><button class="btn" data-act="modal-close">رجوع</button>`) : ""}
    </div>`;
  },
  on: {
    scenario(inst, d) { TW.director.start(d.id); },
    reset(inst) { inst.ui.modal = "reset"; inst.render(); },
    "reset-yes"(inst) { inst.ui.modal = null; TW.reset(); TW.toast("رجعنا لبيانات الصبح التجريبية", "ok"); },
  },
};

/* ===================================================================== context rails beside the phone ===================== */
TW.apps.rail = {
  kind: "rail",
  render(inst) {
    const [view, side] = inst.route; const S = TW.S;
    if (side === "actor") {
      const kind = view, cur = S.session[kind];
      const list = kind === "customer" ? S.customers.map((c) => [c.id, `${c.ar} — ${TW.D.zones.find((z) => z.id === c.zoneId).ar}`]) : kind === "merchant" ? S.merchants.map((m) => [m.id, `${m.ar}${m.status !== "active" ? " (بانتظار التفعيل)" : ""}`]) : S.riders.map((r) => [r.id, `${r.ar} — ${TW.D.vehicles[r.vehicle]}`]);
      const notes = S.notes.filter((n) => n.to === `${kind}:${cur}`).slice(0, 12);
      const ent = kind === "customer" ? TW.S.customers.find((c) => c.id === cur) : kind === "merchant" ? TW.S.merchants.find((m) => m.id === cur) : TW.S.riders.find((r) => r.id === cur);
      const auto = kind !== "customer" ? `<label class="row between" style="font-size:12.5px"><span>${kind === "merchant" ? "التاجر ده بيشتغل تلقائي (محاكاة)" : "المندوب ده بيشتغل تلقائي (محاكاة)"}</span><button class="toggle ${ent.autopilot ? "on" : ""}" data-act="autopilot" aria-label="تشغيل تلقائي"></button></label><p class="muted" style="font-size:12px">اقفله عشان تتحكم أنت في كل خطوة من التطبيق.</p>` : "";
      return `<div class="card"><h3>${ic("user", "ic sm")} أنت داخل بصفتك</h3><select class="input" data-change="switch" aria-label="اختيار الحساب">${list.map(([id, l]) => `<option value="${id}" ${id === cur ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>${auto ? `<hr class="sep">${auto}` : ""}</div>
      <div class="card"><h3>${ic("bell", "ic sm")} الإشعارات اللي وصلت للحساب ده</h3><div class="feed">${notes.length ? notes.map((n) => `<div class="fi">${ic(n.alert ? "bell" : "info", "ic sm")}<div class="grow"><b>${esc(n.title)}</b>${esc(n.body)}</div><time data-ago="${n.at}">${ago(n.at)}</time></div>`).join("") : `<p class="muted" style="font-size:12.5px">لسه مفيش إشعارات.</p>`}</div></div>`;
    }
    const evs = []; S.orders.slice(0, 40).forEach((o) => o.events.slice(-3).forEach((e) => evs.push({ ...e, orderId: o.id })));
    evs.sort((a, b) => b.at - a.at);
    const al = TW.alerts();
    return `<div class="card"><h3>${ic("zap", "ic sm")} اللي بيحصل في النظام دلوقتي</h3><div class="feed">${evs.slice(0, 14).map((e) => `<div class="fi"><span class="mono" style="font-size:11px">${esc(e.orderId)}</span><div class="grow">${esc(e.text)}</div><time data-ago="${e.at}">${ago(e.at)}</time></div>`).join("")}</div></div>
      <div class="card"><div class="hd"><h3>${ic("alert", "ic sm")} برج التحكم</h3>${TW.chip(`${al.length} تنبيه`, al.some((a) => a.sev === "critical") ? "bad" : "warn")}</div>${al.slice(0, 4).map((a) => `<div class="row" style="font-size:12.5px;padding:4px 0">${TW.sev(a.sev)}<span class="grow">${esc(a.problem)}</span></div>`).join("")}<button class="btn sm block" style="margin-top:8px" data-act="go" data-to="/admin/control-tower">افتح برج التحكم</button></div>
      <div class="card"><h3>${ic("play", "ic sm")} جرّب سيناريو</h3><p class="muted" style="font-size:12.5px">المخرج بيجهّز البيانات ويقولك تضغط فين.</p><button class="btn sm block accent" style="margin-top:8px" data-act="dir">افتح السيناريوهات</button></div>`;
  },
  on: {
    switch(inst, d, el) { const view = inst.route[0]; TW.act("session.set", { key: view, value: el.value }); TW.toast(`دخلت بحساب ${el.options[el.selectedIndex].text}`); },
    autopilot(inst) { const view = inst.route[0]; const id = TW.S.session[view]; const ent = (view === "merchant" ? TW.S.merchants : TW.S.riders).find((x) => x.id === id); TW.act("actor.autopilot", { kind: view, id, value: !ent.autopilot }); },
    dir() { TW.director.open(); },
  },
};

/* ===================================================================== scenario director ===================== */
/* Scenario: { id, title, sub, setup(), steps:[{ who:"customer|merchant|rider|admin", text, view:"/customer/cart" (opens it), hl:"css selector", auto(): void|{ok,error}, done(): bool }] } */
const dir = { id: null, step: 0, open: false, min: false };
TW.director = {
  start(id) { const sc = (TW.scenarios || []).find((s) => s.id === id); if (!sc) return; dir.id = id; dir.step = 0; dir.open = true; dir.min = false; try { sc.setup && sc.setup(); } catch (e) { console.error(e); } TW.recompute(); TW.renderAll(); const st = sc.steps[0]; if (st && st.view) TW.nav(viewOf(st)); renderDirector(); setTimeout(() => highlight(st), 400); },
  open() { dir.open = true; dir.min = false; renderDirector(); },
  close() { dir.open = false; renderDirector(); },
  get state() { return dir; },
};
function viewOf(st) { return typeof st.view === "function" ? st.view() : st.view; }
function highlight(st) { if (!st || !st.hl) return; setTimeout(() => { const e = document.querySelector(st.hl); if (e) { e.classList.add("hl"); e.scrollIntoView({ block: "nearest", behavior: "smooth" }); setTimeout(() => e.classList.remove("hl"), 3800); } }, 250); }
function renderDirector() {
  if (!dir.open) { directorEl.innerHTML = ""; return; }
  const sc = (TW.scenarios || []).find((s) => s.id === dir.id);
  const who = { customer: ["العميل", "bag"], merchant: ["التاجر", "store"], rider: ["المندوب", "bike"], admin: ["الكنترول", "chart"], system: ["النظام", "zap"] };
  if (!sc) {
    directorEl.innerHTML = `<div class="director ${dir.min ? "min" : ""}"><div class="dh">${ic("play", "ic sm")}<b>سيناريوهات العرض</b><button class="btn sm icon" data-d="min" aria-label="تصغير">${ic(dir.min ? "chevD" : "minus", "ic xs")}</button><button class="btn sm icon" data-d="close" aria-label="إغلاق">${ic("x", "ic xs")}</button></div><div class="db">${(TW.scenarios || []).map((s, i) => `<button class="btn block" style="justify-content:flex-start;text-align:right;height:auto;padding:8px 10px" data-d="start" data-id="${s.id}"><span class="mono">${i + 1}</span> ${esc(s.title)}</button>`).join("")}</div></div>`;
    return;
  }
  if (sc.steps[dir.step] && sc.steps[dir.step].done && safe(sc.steps[dir.step].done) && !dir.autoAdv) { /* auto-advance when the user did the step themselves */ dir.autoAdv = true; setTimeout(() => { dir.autoAdv = false; const cur = sc.steps[dir.step]; if (cur && cur.done && safe(cur.done)) { dir.step++; const nx = sc.steps[dir.step]; if (nx && nx.view && nx.follow !== false) TW.nav(viewOf(nx)); highlight(nx); renderDirector(); } }, 900); }
  const steps = sc.steps.map((st, i) => { const done = i < dir.step || (st.done && safe(st.done)); const now = i === dir.step; const [w, wi] = who[st.who] || who.system; return `<div class="dstep ${now ? "now" : ""} ${done && !now ? "done" : ""}"><span class="w">${ic(wi, "ic xs")} ${w} · خطوة ${i + 1}${done ? " ✓" : ""}</span><span>${st.text}</span>${now ? `<div class="row wrap">${st.view ? `<button class="btn sm" data-d="view" data-i="${i}">${ic("eye", "ic xs")}افتح الشاشة</button>` : ""}${st.auto ? `<button class="btn sm primary" data-d="auto" data-i="${i}">${ic("play", "ic xs")}نفّذها عني</button>` : ""}<button class="btn sm ghost" data-d="next">التالي</button></div>` : ""}</div>`; }).join("");
  directorEl.innerHTML = `<div class="director ${dir.min ? "min" : ""}"><div class="dh">${ic("play", "ic sm")}<b>${esc(sc.title)}</b><button class="btn sm icon" data-d="list" aria-label="كل السيناريوهات" title="كل السيناريوهات">${ic("list", "ic xs")}</button><button class="btn sm icon" data-d="min" aria-label="تصغير">${ic(dir.min ? "chevD" : "minus", "ic xs")}</button><button class="btn sm icon" data-d="close" aria-label="إغلاق">${ic("x", "ic xs")}</button></div><div class="db"><p class="muted" style="font-size:12.5px">${esc(sc.sub)}</p>${steps}${dir.step >= sc.steps.length ? `<div class="banner ok">${ic("check", "ic sm")}<div><b>السيناريو خلص.</b> ${esc(sc.outcome || "")}</div></div>` : ""}</div></div>`;
}
function safe(f) { try { return f(); } catch (e) { return false; } }
function dirClick(ev) {
  const b = ev.target.closest("[data-d]"); if (!b) return;
  const sc = (TW.scenarios || []).find((s) => s.id === dir.id);
  const a = b.dataset.d;
  if (a === "close") { dir.open = false; }
  if (a === "min") dir.min = !dir.min;
  if (a === "list") { dir.id = null; }
  if (a === "start") { TW.director.start(b.dataset.id); return; }
  if (a === "next") { dir.step++; const st = sc.steps[dir.step]; if (st && st.view) TW.nav(viewOf(st)); highlight(st); }
  if (a === "view") { const st = sc.steps[Number(b.dataset.i)]; TW.nav(viewOf(st)); highlight(st); }
  if (a === "auto") { const st = sc.steps[Number(b.dataset.i)]; let r; try { r = st.auto(); } catch (e) { r = { ok: false, error: e.message }; } if (r && r.ok === false) TW.toast(r.error, "bad"); else { TW.toast("اتنفّذت", "ok"); dir.step++; const nx = sc.steps[dir.step]; if (nx && nx.view) TW.nav(viewOf(nx)); highlight(nx); } }
  renderDirector();
}

/* ===================================================================== boot ===================== */
function boot() {
  TW.boot();
  applyTheme(TW.store.get("twaa-os-theme") || "system");
  root = document.getElementById("os");
  root.innerHTML = `<header class="osbar"></header><main id="view"></main><div class="toasts" aria-live="polite"></div><div id="tt" role="tooltip"></div><div id="director"></div>`;
  osbarEl = root.querySelector(".osbar"); viewEl = root.querySelector("#view"); toastsEl = root.querySelector(".toasts"); ttEl = root.querySelector("#tt"); directorEl = root.querySelector("#director");
  osbarEl.addEventListener("click", (e) => { const b = e.target.closest("[data-nav]"); if (b) TW.nav(b.dataset.nav); if (e.target.closest("[data-dir]")) { dir.open ? (dir.min = false) : (dir.open = true); renderDirector(); } if (e.target.closest("[data-theme-btn]")) TW.cycleTheme(); });
  directorEl.addEventListener("click", dirClick);
  tooltips();
  window.addEventListener("hashchange", route);
  TW.on((reason) => {
    if (reason === "clock") { instances.forEach((i) => i.el.isConnected && updateTimers(i.el)); document.querySelectorAll(".sb-time").forEach((e) => (e.textContent = TW.clock(Date.now()).replace(" ص", "").replace(" م", ""))); return; }
    schedule(); renderOsbar(); if (dir.open) renderDirector();
  });
  route();
}
/* clicks inside sheets/modals land on data-act="noop" containers — swallow them */
const noop = () => {};
document.addEventListener("DOMContentLoaded", () => {
  Object.values(TW.apps).forEach((a) => { if (a && typeof a === "object") { a.on = a.on || {}; a.on.noop = a.on.noop || noop; } });
  boot();
});
})();
