/* Twaa — interactive customer-app prototype (vanilla JS, no build step) */
(function () {
  const T = window.TWAA;
  const $ = (s, r = document) => r.querySelector(s);
  const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---------------- Icons (Lucide-style inline SVG) ---------------- */
  const I = {
    search: '<path d="M21 21l-4.3-4.3"/><circle cx="11" cy="11" r="7"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>', chevS: '<path d="m9 18 6-6-6-6"/>', chevE: '<path d="m15 18-6-6 6-6"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>', minus: '<path d="M5 12h14"/>', trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="3" rx="1.5"/><rect width="7" height="7" x="14" y="14" rx="1.5"/><rect width="7" height="7" x="3" y="14" rx="1.5"/>',
    receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    tag: '<path d="M12 2H2v10l9.3 9.3a1 1 0 0 0 1.4 0l8.6-8.6a1 1 0 0 0 0-1.4L12 2Z"/><circle cx="7" cy="7" r="1.5"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7A2 2 0 0 1 22 16.9z"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
    card: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
    cash: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
    mobile: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
    filter: '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>', sort: '<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    nav: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
    locate: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    box: '<path d="m21 8-9-5-9 5v8l9 5 9-5V8z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    bike: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    /* category glyphs */
    leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.5 5-6"/>',
    milk: '<path d="M8 2h8"/><path d="M9 2v2.8L6 9v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9l-3-4.2V2"/><path d="M6 12h12"/>',
    bread: '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4 3 3 0 0 1-2 2.8V18a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-5.2A3 3 0 0 1 4 10z"/>',
    drop: '<path d="M12 2.7 6.6 9.3a7 7 0 1 0 10.8 0z"/>',
    cup: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
    chips: '<path d="M6 3h12l-1 18H7z"/><path d="M8 8c2 1 6 1 8 0"/><path d="M8.5 13c2 1 5 1 7 0"/>',
    candy: '<circle cx="12" cy="12" r="5"/><path d="M17 12h4l-2-3M17 12l2 3"/><path d="M7 12H3l2-3M7 12l-2 3"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    snow: '<path d="M12 2v20M2 12h20"/><path d="m4.9 4.9 14.2 14.2M19.1 4.9 4.9 19.1"/>',
    spray: '<path d="M3 3h.01M7 5h.01M11 7h.01M3 7h.01M7 9h.01"/><path d="M15 5a2 2 0 0 1 2 2v2"/><path d="M14 9h6l1 12H13z"/>',
    soap: '<rect width="16" height="12" x="4" y="9" rx="4"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
    baby: '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01"/><path d="M9 15c1.5 1.3 4.5 1.3 6 0"/><path d="M12 3c0-1 1-2 2-1.5"/>',
    paw: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5c0 4-2 5-5 5s-5-1-5-5a5 5 0 0 1 5-5z"/>',
    plug: '<path d="M12 22v-5"/><path d="M9 8V2M15 8V2"/><path d="M18 8v5a6 6 0 0 1-12 0V8z"/>',
    egg: '<path d="M12 22c-5 0-7-4-7-9 0-5 3-11 7-11s7 6 7 11c0 5-2 9-7 9z"/>',
    food: '<path d="M3 17h18"/><path d="M5 17a7 7 0 0 1 14 0"/><path d="M12 10V8"/><path d="M7 21h10"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 3-2 4-4 4 0-3-1-6-3-8-1 4-4 6-4 11 0 4 3 7 7 7z"/>',
    pill: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m8.5 8.5 7 7"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    arrowS: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7z"/>',
    stethoscope: '<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>',
    rx: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h3a2 2 0 1 1 0 4H9v-4"/><path d="m12 17 3 3"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><path d="M14 12h.01"/>',
    hand: '<path d="M18 11V6a2 2 0 0 0-4 0v1"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.3 16.6a2 2 0 0 1 2.8-2.8L8 15.5"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    crown: '<path d="m2 8 4 10h12l4-10-5 4-5-7-5 7z"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10a6 6 0 1 1-8 8"/><path d="M7 6h1v4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 19v3"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  };
  const ic = (name, cls = "icon") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[name] || ""}</svg>`;
  const wave = (cls = "wave") => `<svg class="${cls}" viewBox="0 0 240 80" aria-hidden="true"><path d="M0 40c30-30 60-30 90 0s60 30 90 0 45-25 60 0" fill="none" stroke="#F9F2E7" stroke-width="16" stroke-linecap="round"/><path d="M0 40c30 30 60 30 90 0s60-30 90 0 45 25 60 0" fill="none" stroke="#F9F2E7" stroke-width="16" stroke-linecap="round" opacity=".6"/></svg>`;

  /* ---------------- State ---------------- */
  const S = {
    seg: {}, psub: 0, onb: 0, ret: { step: 0, items: new Set(), reason: null, method: "wallet", done: false }, useWallet: false, change: "200", card: 0, handover: "hand", cancel: null, viewOrder: null, deliveryCode: "4821", lang: "ar", screen: "splash", tab: "home", cart: {}, favs: new Set([2, 26]), promo: null, sub: "similar", pay: "cod", slot: "now",
    zone: { area: T.zones[0], label: "homeLbl" },
    cat: "dairy", subcat: 0, query: "", homeTab: "all", sort: "recommended", pdp: null, toast: null, otp: 0, phone: "010 1234 5678", loc: { lat: T.zones[0].lat, lng: T.zones[0].lng, zone: T.zones[0], dist: 0, live: false, status: "" }, stars: 0, fb: new Set(), trackStep: 2, heroIdx: 0, orderId: null,
  };
  const FREE_DELIVERY = 150;
  const t = (k, vars) => { let s = (T.i18n[S.lang][k] ?? T.i18n.ar[k] ?? k); if (vars) Object.keys(vars).forEach((v) => (s = s.replace(`{${v}}`, vars[v]))); return s; };
  const name = (p) => (S.lang === "ar" ? p.ar : p.en);
  const unit = (p) => (S.lang === "ar" ? p.unitAr : p.unitEn);
  const catName = (c) => (S.lang === "ar" ? c.ar : c.en);
  const cat = (id) => T.categories.find((c) => c.id === id);
  const prod = (id) => T.products.find((p) => p.id === id);
  const fmt = (n) => `<span class="price num">${n}<small>${t("egp")}</small></span>`;
  const money = (n) => `${n} ${t("egp")}`;
  const cartItems = () => Object.entries(S.cart).map(([id, q]) => ({ p: prod(+id), q }));
  const cartCount = () => Object.values(S.cart).reduce((a, b) => a + b, 0);
  const subtotal = () => cartItems().reduce((a, { p, q }) => a + p.price * q, 0);
  const discount = () => (S.promo === "TWAA30" ? Math.min(Math.round(subtotal() * 0.3), 60) : S.promo === "FREE" ? 0 : 0);
  const deliveryFee = () => (subtotal() >= FREE_DELIVERY || S.promo === "FREE" ? 0 : S.zone.area.fee);
  const serviceFee = () => (subtotal() > 0 ? 3 : 0);
  const total = () => Math.max(0, subtotal() - discount() + deliveryFee() + serviceFee());
  const walletUsed = () => (S.useWallet ? Math.min(T.wallet.balance, total()) : 0);
  const dueNow = () => total() - walletUsed();
  const ptsFor = (amt) => Math.floor(amt / 10);
  const activeOrder = () => (S.orderId ? { id: S.orderId, total: total(), items: cartItems() } : T.orders[0].status === "out" ? { id: T.orders[0].id, total: T.orders[0].total, items: T.orders[0].items.map((id) => ({ p: prod(id), q: 1 })) } : null);
  const pct = (p) => (p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0);
  const km = (a1, b1, a2, b2) => { const r = Math.PI / 180, R = 6371; const dLat = (a2 - a1) * r, dLng = (b2 - b1) * r; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  /* live serviceability: nearest configured zone within its radius (polygons in production) */
  function resolveZone(lat, lng) {
    let best = null;
    T.zones.forEach((z) => { const d = km(lat, lng, z.lat, z.lng); if (d <= z.radius && (!best || d < best.d)) best = { z, d }; });
    const nearest = T.zones.reduce((acc, z) => { const d = km(lat, lng, z.lat, z.lng); return !acc || d < acc.d ? { z, d } : acc; }, null);
    S.loc.lat = lat; S.loc.lng = lng; S.loc.zone = best ? best.z : null; S.loc.nearest = nearest.z; S.loc.dist = km(lat, lng, T.store.lat, T.store.lng);
  }
  const zoneName = (z) => (S.lang === "ar" ? z.ar : z.en);
  const placeName = (z) => esc(S.lang === "ar" ? `${z.ar}، ${T.city.ar}` : `${z.en}, ${T.city.en}`);

  /* ---------------- Screen registry (for the workbench sidebar) ---------------- */
  const SCREENS = [
    ["splash", "Splash", "شاشة البداية"], ["onboarding", "Onboarding", "التعريف بالتطبيق"], ["location", "Location & serviceability", "الموقع"], ["login", "Login (mobile)", "تسجيل الدخول"], ["otp", "OTP", "كود التأكيد"],
    ["home", "Home", "الرئيسية"], ["categories", "Categories", "الأقسام"], ["plp", "Category listing", "قائمة المنتجات"], ["search", "Search", "البحث"], ["deals", "Deal zone", "منطقة العروض"], ["food", "Food vertical", "أكل"], ["pharmacy", "Pharmacy vertical", "صيدلية"],
    ["pdp", "Product detail (sheet)", "تفاصيل المنتج"], ["cart", "Cart", "السلة"], ["checkout", "Checkout & payment", "إتمام الطلب والدفع"], ["confirmed", "Order confirmed", "تم التأكيد"], ["tracking", "Live tracking", "تتبع مباشر"], ["orders", "My orders", "طلباتي"], ["orderDetail", "Order details", "تفاصيل الطلب"], ["returns", "Return & refund", "إرجاع واسترداد"], ["rating", "Rate order", "التقييم"], ["wallet", "Wallet", "محفظة توّا"], ["loyalty", "Twaa Points & Twaa+", "نقط توّا"], ["notifications", "Notifications", "الإشعارات"], ["support", "Help & support", "المساعدة"], ["account", "Account", "حسابي"],
  ];

  /* ---------------- Rendering helpers ---------------- */
  function statusbar(dark) {
    return `<div class="statusbar ${dark ? "on-dark" : ""}"><span class="num">9:41</span><span class="right"><svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="7" width="3" height="5" rx="1" fill="currentColor"/><rect x="5" y="5" width="3" height="7" rx="1" fill="currentColor"/><rect x="10" y="2" width="3" height="10" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" opacity=".35"/></svg><svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true"><rect x=".5" y=".5" width="22" height="11" rx="3" stroke="currentColor" fill="none"/><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor"/><rect x="24" y="4" width="2" height="4" rx="1" fill="currentColor"/></svg></span></div>`;
  }
  function tile(p, cls = "img") { const c = cat(p.cat); return `<div class="${cls}" style="background:${c.bg};color:${c.fg}">${ic(c.icon)}</div>`; }
  function quickAdd(p, lg = false) {
    const q = S.cart[p.id] || 0;
    if (p.stock === 0) return `<span class="pill danger">${t("outStock")}</span>`;
    if (!q) return `<button class="qa add ${lg ? "lg" : ""}" data-add="${p.id}" aria-label="${t("add")} ${esc(name(p))}">${ic("plus", "icon xs")}<span>${t("add")}</span></button>`;
    return `<div class="qa stepper ${lg ? "lg" : ""}"><button data-dec="${p.id}" aria-label="−">${ic(q === 1 ? "trash" : "minus", "icon xs")}</button><span class="n num">${q}</span><button data-inc="${p.id}" aria-label="+" ${q >= 10 ? "disabled" : ""}>${ic("plus", "icon xs")}</button></div>`;
  }
  function productCard(p) {
    const d = pct(p);
    return `<article class="product ${S.cart[p.id] ? "in-cart" : ""}" data-pid="${p.id}">
      <div class="imgwrap"><button class="img" data-open="${p.id}" style="background:${cat(p.cat).bg};color:${cat(p.cat).fg}" aria-label="${esc(name(p))}">${ic(cat(p.cat).icon)}
        ${d ? `<span class="discount num">${d}% ${t("off")}</span>` : ""}</button>
        <button class="fav ${S.favs.has(p.id) ? "on" : ""}" data-fav="${p.id}" aria-label="${t("myFavs")}">${ic("heart")}</button>
        <div class="qa-float">${quickAdd(p)}</div></div>
      <div class="name">${esc(name(p))}</div>
      <div class="unit">${esc(unit(p))} ${ic("chevD", "icon xs")}</div>
      ${p.stock > 0 && p.stock <= 5 ? `<span class="pill warn" style="align-self:flex-start">${t("lowStock", { n: p.stock })}</span>` : ""}
      <div class="price-row"><div class="row" style="gap:6px;align-items:baseline">${fmt(p.price)}${p.oldPrice ? `<span class="price-old num">${p.oldPrice} ${t("egp")}</span>` : ""}</div></div>
      ${p.stock === 0 ? `<div class="oos"><span>${t("outStock")}</span></div>` : ""}
    </article>`;
  }
  function carousel(list) { return `<div class="h-scroll">${list.map(productCard).join("")}</div>`; }
  function mealCard(p, wide = false) {
    const c = cat(p.cat); const d = pct(p);
    return `<article class="meal ${wide ? "wide" : ""} ${S.cart[p.id] ? "in-cart" : ""}" data-pid="${p.id}">
      <button class="mimg" data-open="${p.id}" style="background:${c.bg};color:${c.fg}" aria-label="${esc(name(p))}">${ic("food")}${d ? `<span class="discount num">${d}% ${t("off")}</span>` : ""}<span class="prep">${ic("clock", "icon xs")} <span class="num">${p.prep}</span> ${t("min")}</span></button>
      <div class="mbody"><div class="mname">${esc(name(p))}</div><div class="mdesc">${esc(S.lang === "ar" ? p.descAr : p.descEn)}</div>
        <div class="price-row"><div>${fmt(p.price)}${p.oldPrice ? `<span class="price-old num" style="margin-inline-start:6px">${p.oldPrice} ${t("egp")}</span>` : ""}</div>${quickAdd(p)}</div></div></article>`;
  }
  function sectionHead(title, sub, more = true, extra = "") {
    return `<div class="section-head"><div><h2>${title}${extra}</h2>${sub ? `<div class="sub">${sub}</div>` : ""}</div>${more ? `<button class="more" data-go="plp">${t("seeAll")} ${ic("chevS", "icon xs")}</button>` : ""}</div>`;
  }
  function bottomNav(active) {
    const items = [["home", "home", "navHome"], ["categories", "grid", "navCats"], ["deals", "percent", "navDeals"], ["account", "user", "navAccount"], ["cart", "cart", "navCart"]];
    const n = cartCount();
    return `<nav class="bottomnav" aria-label="Main">${items.map(([s, i, l]) => `<button data-go="${s}" class="${active === s ? "on" : ""} ${s === "cart" ? "cart-tab" : ""}" aria-current="${active === s ? "page" : "false"}">${ic(i)}${s === "cart" && n ? `<span class="badge num">${n}</span>` : ""}<span>${t(l)}</span></button>`).join("")}</nav>`;
  }
  function cartBar() {
    const n = cartCount(); if (!n) return "";
    const thumbs = cartItems().slice(0, 3).map(({ p }) => `<span style="background:${cat(p.cat).bg};color:${cat(p.cat).fg}">${ic(cat(p.cat).icon, "icon xs")}</span>`).join("");
    return `<button class="cartbar pill-bar" data-go="cart"><span class="thumbs">${thumbs}</span><span class="info"><div class="t">${t("viewCart")}</div><div class="s num">${n} ${n === 1 ? t("items") : t("itemsPl")} · ${money(subtotal())}</div></span>${ic("chevS", "icon sm")}</button>`;
  }
  const VERTICALS = [["home", "vSuper", "brand"], ["food", "vFood", "food"], ["pharmacy", "vPharma", "pill"], ["deals", "vDeals", "percent"], ["plp", "vLocal", "home"]];
  function vstrip(active) {
    return `<div class="vstrip" role="tablist" aria-label="Twaa">${VERTICALS.map(([id, l, i]) => `<button role="tab" class="vtile v-${id} ${active === id ? "on" : ""}" data-go="${id}" ${id === "plp" ? 'data-cat="local"' : ""} aria-selected="${active === id}">${i === "brand" ? `<span class="vlogo">${T.logoImg(true, false)}</span>` : ic(i)}<span>${t(l)}</span></button>`).join("")}</div>`;
  }
  function addrLine(big) {
    const a = S.zone.area;
    return `<button class="addr-line" data-go="location">
      ${big ? `<div class="eta-head">${ic("bolt", "icon sm spark")}<span>${t("eta")} <b class="num">${a.eta}</b> ${t("min")}</span></div>` : `<div class="eta-head small">${ic("home", "icon sm")}<b>${t(S.zone.label)}</b> ${ic("chevD", "icon xs")} <span class="eta-chip mini">${ic("bolt", "icon xs")}<span class="num">${a.eta} ${t("min")}</span></span></div>`}
      <div class="addr-sub">${big ? `${ic("home", "icon xs")} ${t(S.zone.label)} · ` : ""}${placeName(a)} ${big ? ic("chevD", "icon xs") : ""}</div></button>`;
  }
  function vhead(active, opts = {}) {
    return `<div class="vhead v-${active}">${vstrip(active)}
      <div class="vhead-row">${addrLine(!!opts.big)}<div class="row" style="gap:6px">${ptsChip()}<button class="icon-btn ghost" data-go="notifications" aria-label="${t("notif")}">${ic("bell")}<span class="badge" style="border-color:#fff">2</span></button></div></div>
      <div class="row" style="gap:8px;align-items:stretch"><button class="searchbar" data-go="search" style="flex:1;margin:0">${ic("search")}<span style="flex:1;text-align:start;color:var(--muted);font-size:15px">${opts.search || t("searchPh2")}</span>${ic("mic", "icon sm")}${ic("camera", "icon sm")}</button>${opts.side ? `<button class="side-tile" data-go="${opts.side[1]}">${ic(opts.side[2], "icon sm")}<span>${opts.side[0]}</span></button>` : ""}</div></div>`;
  }
  function promoTiles(tiles) {
    return `<div class="h-scroll promo-tiles">${tiles.map((x) => `<button class="promo-tile" style="background:${x.bg};color:${x.fg || "#fff"}" data-go="${x.go}" ${x.cat ? `data-cat="${x.cat}"` : ""}>${x.code ? `<span class="code">${x.code}</span>` : ""}<div class="pt-title">${x.t}</div><div class="pt-sub">${x.s}</div>${ic(x.icon, "icon pt-icon")}</button>`).join("")}</div>`;
  }
  function promoCards(cards) {
    return `<div class="h-scroll promo-cards">${cards.map((c) => `<button class="promo-card" style="background:${c.bg};color:${c.fg}" data-go="${c.go}" ${c.sub != null ? `data-foodsub="${c.sub}"` : ""}><div><div class="pc-title">${c.t}</div><div class="pc-sub">${c.s}</div><span class="pc-arrow" style="background:${c.fg};color:#fff">${ic("arrowS", "icon sm")}</span></div><span class="pc-ill" style="color:${c.fg}">${ic(c.icon)}</span></button>`).join("")}</div>`;
  }
  function quickTiles(tiles) {
    return `<div class="h-scroll quick-tiles">${tiles.map((q) => `<button class="quick-tile ${q.soon ? "soon" : ""}" ${q.go ? `data-go="${q.go}"` : q.toast ? `data-toast="${q.toast}"` : ""} ${q.sub != null ? `data-foodsub="${q.sub}"` : ""} ${q.psub != null ? `data-psub="${q.psub}"` : ""}><span class="qt-ico" style="background:${q.bg};color:${q.fg}">${ic(q.icon)}</span><b>${q.t}</b><span>${q.s}</span>${q.soon ? `<em class="pill accent">${t("soon")}</em>` : ""}</button>`).join("")}</div>`;
  }
  function segmented(key, opts) {
    const cur = S.seg[key] ?? 0;
    return `<div class="seg" role="tablist">${opts.map(([l, i], k) => `<button role="tab" class="${cur === k ? "on" : ""}" data-seg="${key}:${k}" aria-selected="${cur === k}">${i ? ic(i, "icon xs") : ""}${l}</button>`).join("")}</div>`;
  }
  function foodImgCard(p) {
    const c = cat(p.cat); const d = pct(p);
    return `<article class="fcard" data-pid="${p.id}"><button class="fimg" data-open="${p.id}" style="background:linear-gradient(180deg,${c.bg},#F3D9C4);color:${c.fg}" aria-label="${esc(name(p))}">${ic(c.icon)}<div class="fov">${d ? `<b>${d}% ${t("off")}</b>` : `<b>${t("free")} ${t("delivery")}</b>`}<span class="num">${p.prep} ${t("min")}</span></div></button><button class="fav ${S.favs.has(p.id) ? "on" : ""}" data-fav="${p.id}" aria-label="${t("myFavs")}">${ic("heart")}</button>
      <div class="fbody"><div class="mname">${esc(name(p))}</div><div class="row between"><span class="price num" style="font-size:15px">${p.price}<small>${t("egp")}</small></span>${quickAdd(p)}</div></div></article>`;
  }
  function trustRow(compact = false) {
    const items = [["bolt", t("why1")], ["undo", t("why2")], ["lock", t("why3")], ["coins", t("why4")]];
    return `<div class="trust ${compact ? "compact" : ""}">${items.map(([i, l]) => `<span>${ic(i, "icon xs")}${l}</span>`).join("")}</div>`;
  }
  function activeOrderCard() {
    const o = activeOrder(); if (!o) return "";
    const step = S.trackStep; const labels = ["stConfirmed", "stPreparing", "stOut", "stDelivered"]; const mins = step >= 3 ? 0 : 12 - step * 3;
    return `<button class="active-order" data-go="tracking"><span class="ao-ico ${step >= 3 ? "done" : ""}">${ic(step >= 2 ? "bike" : "box", "icon sm")}</span>
      <span class="ao-body"><span class="ao-t">${t("activeOrder")} · <b>${t(labels[Math.min(step, 3)])}</b></span><span class="ao-s num">${step >= 3 ? t("stDeliveredS") : `${t("arrivesIn")} ${mins} ${t("min")} · #${o.id}`}</span><span class="ao-bar"><i style="width:${Math.min(100, (step + 1) * 25)}%"></i></span></span>
      <span class="ao-cta">${t("viewLive")} ${ic("chevS", "icon xs")}</span></button>`;
  }
  const ptsChip = () => `<button class="pts-chip" data-go="loyalty" aria-label="${t("loyaltyT")}">${ic("coins", "icon xs")}<span class="num">${T.loyalty.points}</span> ${t("ptsChip")}</button>`;
  function toastEl() { return S.toast ? `<div class="toast" role="status" aria-live="polite">${ic("check", "icon sm")}<span>${S.toast}</span></div>` : ""; }
  function map(h, rider) { /* static illustration used on tracking */
    return `<div class="map" style="height:${h}px"><svg class="grid" viewBox="0 0 390 ${h}" preserveAspectRatio="none" aria-hidden="true">
      <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0v40" fill="none" stroke="#DED3C2" stroke-width="1"/></pattern></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <path d="M0 ${h * .3}h390M0 ${h * .7}h390M120 0v${h}M260 0v${h}" stroke="#F5EFE4" stroke-width="14"/>
      <path d="M0 ${h * .3}h390M0 ${h * .7}h390M120 0v${h}M260 0v${h}" stroke="#D3C7B4" stroke-width="1"/>
      <rect x="140" y="${h * .38}" width="60" height="40" rx="6" fill="#E3D9C8"/><rect x="290" y="${h * .1}" width="70" height="50" rx="6" fill="#E3D9C8"/><rect x="20" y="${h * .76}" width="80" height="40" rx="6" fill="#DCEBD8"/>
      ${rider ? `<path d="M60 ${h * .78} C120 ${h * .78}, 140 ${h * .5}, 195 ${h * .5}" fill="none" stroke="#3A1F3D" stroke-width="4" stroke-dasharray="8 8" stroke-linecap="round"/>` : ""}
    </svg>
    <div class="pin"><svg viewBox="0 0 44 54" aria-hidden="true"><path d="M22 2C11 2 3 10 3 21c0 13 19 31 19 31s19-18 19-31C41 10 33 2 22 2z" fill="currentColor"/><circle cx="22" cy="21" r="8" fill="#fff"/></svg></div>
    ${rider ? `<div class="rider" style="left:44px;top:${h * .78 - 20}px">${ic("bike", "icon sm")}</div>` : ""}</div>`;
  }

  /* ---- Live map (location screen) ----
     Uses Leaflet + OpenStreetMap tiles when the library and tiles are reachable; otherwise a built-in
     draggable map of the service area. Both keep a fixed centre pin and re-resolve the zone on every move. */
  const PIN = `<svg viewBox="0 0 44 54" aria-hidden="true"><path d="M22 2C11 2 3 10 3 21c0 13 19 31 19 31s19-18 19-31C41 10 33 2 22 2z" fill="currentColor"/><circle cx="22" cy="21" r="8" fill="#fff"/></svg>`;
  function liveMapHtml(h) {
    return `<div class="map live" style="height:${h}px" data-livemap>
      <div class="lm-canvas" data-lm-canvas aria-hidden="true"></div>
      <div class="pin live"><span class="pin-hint">${t("dragHint")}</span>${PIN}</div>
      <div class="lm-badge ${S.loc.live ? "on" : ""}">${ic("locate", "icon xs")} ${S.loc.status || (S.loc.live ? t("youAreHere") : t("village"))}</div>
      <button class="icon-btn ghost loc-fab" aria-label="${t("useGps")}" data-gps>${ic("locate")}</button>
      <div class="lm-zoom"><button data-lm-zoom="1" aria-label="+">${ic("plus", "icon sm")}</button><button data-lm-zoom="-1" aria-label="−">${ic("minus", "icon sm")}</button></div>
    </div>`;
  }
  const LM = { leaflet: null, zoom: 14, tileErrors: 0, tileOk: 0, mode: null, fallback: null };
  function mountLiveMap() {
    const host = $("[data-livemap]"); if (!host) return; const canvas = $("[data-lm-canvas]", host);
    const canLeaflet = !!window.L && LM.mode !== "fallback";
    if (canLeaflet) {
      try {
        const m = window.L.map(canvas, { center: [S.loc.lat, S.loc.lng], zoom: LM.zoom, zoomControl: false, attributionControl: false });
        const tiles = window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(m);
        tiles.on("tileerror", () => { LM.tileErrors++; if (LM.tileErrors >= 3 && LM.tileOk === 0) { LM.mode = "fallback"; m.remove(); LM.leaflet = null; mountLiveMap(); } });
        tiles.on("tileload", () => { LM.tileOk++; });
        window.L.circleMarker([T.store.lat, T.store.lng], { radius: 7, color: "#3A1F3D", fillColor: "#F9F2E7", fillOpacity: 1, weight: 3 }).addTo(m).bindTooltip(S.lang === "ar" ? T.store.ar : T.store.en);
        T.zones.forEach((z) => window.L.circle([z.lat, z.lng], { radius: z.radius * 1000, color: z.ok ? "#2E7D4F" : "#B8860B", weight: 1, fillOpacity: .08 }).addTo(m));
        m.on("moveend", () => { const c = m.getCenter(); LM.zoom = m.getZoom(); onMapMoved(c.lat, c.lng); });
        m.on("movestart", () => host.classList.add("moving")); m.on("moveend", () => host.classList.remove("moving"));
        LM.leaflet = m; LM.mode = "leaflet"; return;
      } catch (e) { LM.mode = "fallback"; }
    }
    LM.mode = "fallback"; mountFallbackMap(host, canvas);
  }
  function mountFallbackMap(host, canvas) {
    /* simple equirectangular projection around the city centre; 1px = metersPerPx */
    const mpp = () => 156543 * Math.cos(T.city.lat * Math.PI / 180) / Math.pow(2, LM.zoom);
    const W = host.clientWidth || 370, H = host.clientHeight || 260;
    const draw = () => {
      const m = mpp(); const px = (lat, lng) => [W / 2 + ((lng - S.loc.lng) * 111320 * Math.cos(S.loc.lat * Math.PI / 180)) / m, H / 2 - ((lat - S.loc.lat) * 110540) / m];
      const roads = []; for (let i = -12; i <= 12; i++) { roads.push([T.city.lat + i * 0.004, "h"]); roads.push([T.city.lng + i * 0.0045, "v"]); }
      const [sx, sy] = px(T.store.lat, T.store.lng);
      canvas.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
        <rect width="100%" height="100%" fill="#EDE6DA"/>
        <g stroke="#F7F1E7" stroke-width="${Math.max(2, 900 / m)}">${roads.map(([v, o]) => o === "h" ? `<path d="M0 ${px(v, 0)[1]} H${W}"/>` : `<path d="M${px(0, v)[0]} 0 V${H}"/>`).join("")}</g>
        <g stroke="#D8CCB9" stroke-width="1" fill="none">${roads.map(([v, o]) => o === "h" ? `<path d="M0 ${px(v, 0)[1]} H${W}"/>` : `<path d="M${px(0, v)[0]} 0 V${H}"/>`).join("")}</g>
        ${T.zones.map((z) => { const [x, y] = px(z.lat, z.lng); const r = (z.radius * 1000) / m; return `<circle cx="${x}" cy="${y}" r="${r}" fill="${z.ok ? "#2E7D4F" : "#B8860B"}" fill-opacity=".09" stroke="${z.ok ? "#2E7D4F" : "#B8860B"}" stroke-opacity=".5" stroke-width="1.5"/><text x="${x}" y="${y - r - 6}" text-anchor="middle" font-size="12" font-weight="700" font-family="Cairo, sans-serif" fill="${z.ok ? "#1F5C39" : "#7A5A05"}">${esc(zoneName(z))}</text>`; }).join("")}
        <g transform="translate(${sx} ${sy})"><circle r="11" fill="#3A1F3D"/><circle r="5" fill="#F9F2E7"/><text y="26" text-anchor="middle" font-size="11" font-weight="700" font-family="Cairo, sans-serif" fill="#3A1F3D">${esc(S.lang === "ar" ? "متجر توّا" : "Twaa store")}</text></g>
      </svg>`;
    };
    draw();
    let drag = null;
    canvas.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY, lat: S.loc.lat, lng: S.loc.lng }; canvas.setPointerCapture(e.pointerId); host.classList.add("moving"); };
    canvas.onpointermove = (e) => { if (!drag) return; const m = mpp(); const dx = e.clientX - drag.x, dy = e.clientY - drag.y; S.loc.lng = drag.lng - (dx * m) / (111320 * Math.cos(drag.lat * Math.PI / 180)); S.loc.lat = drag.lat + (dy * m) / 110540; draw(); };
    canvas.onpointerup = canvas.onpointercancel = () => { if (!drag) return; drag = null; host.classList.remove("moving"); onMapMoved(S.loc.lat, S.loc.lng); };
    LM.fallback = { draw, setView: (lat, lng) => { S.loc.lat = lat; S.loc.lng = lng; draw(); } };
  }
  function onMapMoved(lat, lng) { S.loc.live = false; S.loc.status = ""; resolveZone(lat, lng); patchLocationCard(); const bd = $(".lm-badge"); if (bd) bd.replaceWith(h(`<div class="lm-badge">${ic("pin", "icon xs")} ${S.loc.zone ? esc(zoneName(S.loc.zone)) : esc(zoneName(S.loc.nearest))} · <span class="num" dir="ltr">${lat.toFixed(4)}, ${lng.toFixed(4)}</span></div>`)); }
  function setMapView(lat, lng) { if (LM.mode === "leaflet" && LM.leaflet) LM.leaflet.setView([lat, lng], Math.max(LM.zoom, 15)); else if (LM.fallback) LM.fallback.setView(lat, lng); }
  function locateMe() {
    S.loc.status = t("locating"); patchLocationCard(); $(".lm-badge")?.replaceWith(h(`<div class="lm-badge">${ic("locate", "icon xs")} ${t("locating")}</div>`));
    const fail = () => { S.loc.status = ""; toast(t("locErr")); };
    if (!navigator.geolocation) return fail();
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords; resolveZone(lat, lng); S.loc.live = true; S.loc.status = t("youAreHere"); setMapView(lat, lng); patchLocationCard();
      $(".lm-badge")?.replaceWith(h(`<div class="lm-badge on">${ic("locate", "icon xs")} ${t("youAreHere")} · <span class="num" dir="ltr">${lat.toFixed(4)}, ${lng.toFixed(4)}</span></div>`));
    }, fail, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
  }
  function locationCard() {
    const z = S.loc.zone, near = S.loc.nearest || T.zones[0];
    if (z && z.ok) return `<div class="card loc-card" data-loc-card style="border:1.5px solid var(--success-100)"><div class="row between"><div><span class="pill success">${ic("check", "icon xs")} ${t("serviceable")}</span><div style="font-family:var(--font-display);font-weight:800;font-size:18px;color:var(--aubergine);margin-top:8px">${placeName(z)}</div><div class="muted num">${t("distance", { n: S.loc.dist.toFixed(1) })}</div></div><span class="eta-chip">${ic("bolt")}<span class="num">${z.eta} ${t("min")}</span></span></div>
      <div class="kv" style="margin-top:12px"><div><div class="k">${t("fee")}</div><div class="v num">${money(z.fee)}</div></div><div><div class="k">${t("minOrder")}</div><div class="v num">${money(z.min)}</div></div></div></div>`;
    return `<div class="card loc-card" data-loc-card style="border:1.5px solid var(--mandarin-100);background:var(--mandarin-50)"><span class="pill warn">${ic("info", "icon xs")} ${z ? t("coming") : t("outside")} · ${esc(zoneName(near))}</span><div style="font-family:var(--font-display);font-weight:800;color:var(--aubergine);font-size:17px;line-height:1.5;margin-top:8px">${t("notServiceable")}</div><div class="muted" style="margin:6px 0 12px">${S.lang === "ar" ? "سيب رقمك وهنبلّغك أول ما نفتح في منطقتك." : "Leave your number and we'll tell you the moment we open in your area."}</div><div class="input" style="height:46px"><span class="prefix">+20</span><input inputmode="tel" value="${S.phone}" aria-label="${t("phone")}"></div><button class="btn dark" style="margin-top:10px;min-height:46px" data-toast="notify">${ic("bell", "icon sm")} ${t("notifyMe")}</button></div>`;
  }
  function patchLocationCard() {
    const c = $("[data-loc-card]"); if (c) c.replaceWith(h(locationCard()));
    const sel = $("[data-zone-select]"); if (sel) sel.value = S.loc.zone ? S.loc.zone.id : "";
    const cta = $("[data-confirm-loc]"); if (cta) cta.disabled = !(S.loc.zone && S.loc.zone.ok);
  }

  /* ---------------- Screens ---------------- */
  const R = {};
  R.splash = () => `<div class="screen dark"><div class="splash">${statusbar(true)}${wave()}<div class="splash-bag" aria-hidden="true"></div><div class="brand-logo lg" style="color:var(--cream)">${T.logoImg(true, true)}</div><div class="tagline">${t("tagline")}</div><div class="en-tag">Local roots. Closer days.</div><button class="btn primary" style="position:absolute;bottom:56px;left:24px;right:24px" data-go="onboarding">${t("shopNow")}</button></div></div>`;

  R.location = () => {
    return `<div class="screen">${statusbar()}
      <div class="topbar"><button class="icon-btn ghost" data-go="home" aria-label="back">${ic("chevS")}</button><h1>${t("locT")}</h1><span class="pill brand">${esc(T.city[S.lang])}</span></div>
      ${liveMapHtml(270)}
      <div class="scroll pad pb-cta" style="margin-top:-24px;position:relative;z-index:2">
        <div class="card">
          <button class="btn soft" data-gps style="min-height:46px">${ic("locate")} ${t("useGps")}</button>
          <div class="searchbar" style="box-shadow:none;border:1.5px solid var(--line-strong)">${ic("search")}<input placeholder="${t("searchArea")}" aria-label="${t("searchArea")}" list="zones-list" data-zone-search><datalist id="zones-list">${T.zones.map((z) => `<option value="${esc(zoneName(z))}">`).join("")}</datalist></div>
          <div class="field" style="margin:12px 0 0"><label>${t("village")} · ${esc(T.city[S.lang])}</label><div class="input" style="height:46px">${ic("pin", "icon sm")}<select data-zone-select style="flex:1;border:0;background:none;font-weight:700;height:100%"><option value="">—</option>${T.zones.map((z) => `<option value="${z.id}" ${S.loc.zone && S.loc.zone.id === z.id ? "selected" : ""}>${esc(zoneName(z))}${z.ok ? "" : ` · ${t("coming")}`}</option>`).join("")}</select></div></div>
          <div class="field" style="margin:12px 0 0"><div class="input" style="height:46px">${ic("info", "icon sm")}<input placeholder="${t("landmark")}" aria-label="${t("landmark")}"></div></div>
        </div>
        ${locationCard()}
      </div>
      <div class="cta-bar"><button class="btn primary" data-confirm-loc ${S.loc.zone && S.loc.zone.ok ? "" : "disabled"}>${t("confirmLoc")}</button></div></div>`;
  };

  R.login = () => `<div class="screen">${statusbar()}
    <div class="topbar"><button class="icon-btn ghost" data-go="cart" aria-label="back">${ic("chevS")}</button></div>
    <div class="scroll pad"><div style="text-align:center;margin:24px 0 28px"><div class="brand-logo md" style="color:var(--aubergine);margin:0 auto">${T.logoImg(false, false)}</div></div>
      <h2 style="font-family:var(--font-display);font-size:26px;color:var(--aubergine)">${t("loginT")}</h2><p class="muted" style="margin:6px 0 24px;line-height:1.7">${t("loginSub")}</p>
      <div class="field"><label>${t("phone")}</label><div class="input"><span class="prefix" dir="ltr">🇪🇬 +20</span><input inputmode="tel" autocomplete="tel" value="${S.phone}" aria-label="${t("phone")}" dir="ltr"></div><div class="hint">${S.lang === "ar" ? "هنبعت كود تأكيد برسالة SMS" : "We'll text you a verification code"}</div></div>
      <button class="btn primary" data-go="otp">${t("sendOtp")}</button>
      <p class="muted" style="text-align:center;margin-top:20px;font-size:12px;line-height:1.7">${t("termsAck")}</p></div></div>`;

  R.otp = () => `<div class="screen">${statusbar()}
    <div class="topbar"><button class="icon-btn ghost" data-go="login" aria-label="back">${ic("chevS")}</button></div>
    <div class="scroll pad"><h2 style="font-family:var(--font-display);font-size:26px;color:var(--aubergine);margin-top:16px">${t("otpT")}</h2><p class="muted" style="margin:6px 0 28px">${t("otpSub", { p: `<b dir="ltr">+20 ${S.phone}</b>` })}</p>
      <div class="otp" role="group" aria-label="OTP">${[0, 1, 2, 3, 4, 5].map((i) => `<span class="${i < S.otp ? "on" : ""} ${i === S.otp ? "cur" : ""}">${i < S.otp ? "4" : ""}</span>`).join("")}</div>
      <div class="row between" style="margin:20px 0 28px"><span class="muted num">00:${String(Math.max(0, 45 - S.otp * 7)).padStart(2, "0")}</span><button class="btn ghost sm" data-otp-fill>${t("resend")}</button></div>
      <button class="btn primary" data-verify ${S.otp < 6 ? "disabled" : ""}>${t("verify")}</button>
      <div style="text-align:center;margin-top:16px"><button class="btn ghost sm" data-otp-fill>${S.lang === "ar" ? "(للعرض) املأ الكود" : "(Demo) fill code"}</button></div></div></div>`;

  R.home = () => {
    const by = (tag) => T.products.filter((p) => p.tags.includes(tag));
    const tiles = [
      { t: t("home_hero1t"), s: t("home_hero1p"), code: "TWAA30", bg: "linear-gradient(160deg,#3A1F3D,#5A2F5E)", go: "deals", icon: "tag" },
      { t: t("home_hero2t"), s: t("home_hero2p"), bg: "linear-gradient(160deg,#E05F1C,#F9732F)", go: "deals", icon: "truck" },
      { t: t("secFood"), s: t("secFoodSub"), bg: "linear-gradient(160deg,#8E2F14,#B4441E)", go: "food", icon: "food" },
      { t: t("pharmaT"), s: t("otcNote"), bg: "linear-gradient(160deg,#0B5F6B,#0F7C8C)", go: "pharmacy", icon: "pill" },
      { t: t("home_hero3t"), s: t("home_hero3p"), bg: "linear-gradient(160deg,#1F6B4A,#2E7D4F)", go: "plp", cat: "local", icon: "leaf" },
      { t: t("plusT"), s: t("plusS"), bg: "linear-gradient(160deg,#241626,#3A1F3D)", go: "loyalty", icon: "crown", code: t("plusSoon") },
    ];
    const segList = (S.seg.home ?? 0) === 0 ? by("again") : T.products.filter((p) => S.favs.has(p.id));
    return `<div class="screen">${statusbar()}${vhead("home", { big: true, side: [S.lang === "ar" ? "اطلب بقائمتك" : "Shop by list", "orders", "list"] })}
      <div class="scroll pb-nav">
        <div class="pad" style="margin-top:8px">${activeOrderCard()}</div>
        ${promoTiles(tiles)}
        <div class="pad">${trustRow()}</div>
        <div class="section" style="margin-top:12px"><div class="pad">${segmented("home", [[t("secAgain"), "refresh"], [t("myFavs"), "heart"]])}</div>${segList.length ? carousel(segList.slice(0, 10)) : `<div class="empty" style="padding:24px"><p>${t("emptyCartSub")}</p></div>`}</div>
        <div class="section">${sectionHead(t("shopBy"), null, true)}<div class="cat-scroll">${T.categories.map((c) => `<button class="cat round" data-go="${c.id === "food" ? "food" : c.id === "pharmacy" ? "pharmacy" : "plp"}" data-cat="${c.id}"><span class="tile" style="background:${c.bg};color:${c.fg}">${ic(c.icon)}</span><span>${esc(catName(c))}</span></button>`).join("")}</div></div>
        <div class="section">${sectionHead(t("recommended2"), null, false)}${carousel(by("popular").filter((p) => !["food", "pharmacy"].includes(p.cat)).slice(0, 8))}</div>
        <div class="section">${sectionHead(t("secDeals"), t("secDealsSub"), true, ` <span class="countdown" aria-label="${t("endsIn")}"><span class="num">02</span>:<span class="num">14</span>:<span class="num">09</span></span>`).replace('data-go="plp"', 'data-go="deals"')}${carousel(by("deal").filter((p) => !["food", "pharmacy"].includes(p.cat)).slice(0, 8))}</div>
        <div class="section food-sec"><div class="section-head"><div><h2>${ic("flame", "icon sm")} ${t("secFood")}</h2><div class="sub">${t("secFoodSub")} · <span class="pill success" style="padding:1px 8px">${t("openNow")}</span></div></div><button class="more" data-go="food">${t("seeAll")} ${ic("chevS", "icon xs")}</button></div>
          <div class="h-scroll">${by("food").slice(0, 8).map((p) => mealCard(p)).join("")}</div></div>
        <div class="section pharma-sec"><div class="section-head"><div><h2>${ic("pill", "icon sm")} ${t("secPharma")}</h2><div class="sub">${t("secPharmaSub")}</div></div><button class="more" data-go="pharmacy">${t("seeAll")} ${ic("chevS", "icon xs")}</button></div>${carousel(by("pharma").slice(0, 8))}</div>
        <div class="section">${sectionHead(t("secUnder50"))}${carousel(by("under50").filter((p) => !["food", "pharmacy"].includes(p.cat)).slice(0, 8))}</div>
        <div class="section">${sectionHead(t("secLocal"), t("secLocalSub")).replace('data-go="plp"', 'data-go="plp" data-cat="local"')}${carousel(by("local"))}</div>
        <div class="section">${sectionHead(t("secNew"))}${carousel(by("new").filter((p) => !["food", "pharmacy"].includes(p.cat)))}</div>
      </div>${cartBar()}${bottomNav("home")}${toastEl()}</div>`;
  };

  R.categories = () => `<div class="screen">${statusbar()}
    <div class="topbar"><h1>${t("catsT")}</h1><button class="icon-btn ghost" data-go="search" aria-label="${t("navSearch")}">${ic("search")}</button></div>
    <div class="scroll pb-nav"><div class="cat-grid" style="grid-template-columns:repeat(3,1fr);gap:16px 12px;padding-top:8px">${T.categories.map((c) => `<button class="cat" data-go="plp" data-cat="${c.id}"><span class="tile" style="width:100%;aspect-ratio:1;height:auto;background:${c.bg};color:${c.fg}">${ic(c.icon)}</span><span>${esc(catName(c))}</span></button>`).join("")}</div></div>${cartBar()}${bottomNav("categories")}${toastEl()}</div>`;

  R.plp = () => {
    const c = cat(S.cat); const subs = (S.lang === "en" && T.subcatsEn[S.cat]) || T.subcats[S.cat] || ["الكل"];
    let list = T.products.filter((p) => p.cat === S.cat);
    if (S.sort === "priceLow") list = [...list].sort((a, b) => a.price - b.price); if (S.sort === "priceHigh") list = [...list].sort((a, b) => b.price - a.price); if (S.sort === "biggestDisc") list = [...list].sort((a, b) => pct(b) - pct(a));
    const sorts = ["recommended", "popular", "priceLow", "priceHigh", "biggestDisc", "newest"];
    return `<div class="screen">${statusbar()}
      <div class="topbar"><button class="icon-btn ghost" data-go="home" aria-label="back">${ic("chevS")}</button><h1>${esc(catName(c))}</h1><button class="icon-btn ghost" data-go="search" aria-label="${t("navSearch")}">${ic("search")}</button><button class="icon-btn ghost" data-go="cart" aria-label="${t("cart")}">${ic("cart")}${cartCount() ? `<span class="badge" style="border-color:#fff">${cartCount()}</span>` : ""}</button></div>
      <div class="chips" style="padding-top:0">${sorts.map((s) => `<button class="chip ${S.sort === s ? "on" : ""}" data-sort="${s}">${s === "recommended" ? ic("sort") : ""}${t(s)}</button>`).join("")}</div>
      <div class="plp-layout">
        <div class="plp-rail" role="tablist">${T.categories.map((k) => `<button role="tab" class="${k.id === S.cat ? "on" : ""}" data-cat-switch="${k.id}"><span class="tile" style="background:${k.bg};color:${k.fg}">${ic(k.icon)}</span>${esc(catName(k))}</button>`).join("")}</div>
        <div class="plp-body"><div class="chips">${subs.map((s, i) => `<button class="chip ${S.subcat === i ? "on" : ""}" data-subcat="${i}">${esc(S.lang === "ar" || T.subcatsEn[S.cat] ? s : i === 0 ? "All" : s)}</button>`).join("")}</div>
          <div class="scroll pb-nav"><div class="muted num" style="padding:0 12px 8px">${list.length} ${t("results")}</div><div class="p-grid">${list.map(productCard).join("")}</div></div></div>
      </div>${cartBar()}${bottomNav("categories")}${toastEl()}</div>`;
  };

  R.search = () => {
    const q = S.query.trim().toLowerCase();
    const res = q ? T.products.filter((p) => (p.ar + " " + p.en + " " + p.brand).toLowerCase().includes(q)) : [];
    const recents = S.lang === "ar" ? ["لبن", "شيبسي", "حفاضات", "مياه"] : ["milk", "chips", "diapers", "water"];
    const trending = S.lang === "ar" ? ["بيض", "عيش", "بيبسي", "أرز", "زيت", "سكر", "جبنة", "نسكافيه"] : ["eggs", "bread", "pepsi", "rice", "oil", "sugar", "cheese", "nescafe"];
    return `<div class="screen">${statusbar()}
      <div class="topbar"><button class="icon-btn ghost" data-go="home" aria-label="back">${ic("chevS")}</button><div class="searchbar" style="flex:1;margin:0;border:1.5px solid var(--aubergine)">${ic("search")}<input data-q value="${esc(S.query)}" placeholder="${t("searchPh")}" aria-label="${t("navSearch")}" autofocus>${q ? `<button class="icon-btn" style="width:32px;height:32px" data-clear-q aria-label="clear">${ic("x", "icon sm")}</button>` : ""}</div></div>
      <div class="scroll pb-nav">
        ${!q ? `<div class="section" style="margin-top:8px">${sectionHead(t("recent"), null, false)}<div class="search-list">${recents.map((r) => `<button data-q-set="${esc(r)}">${ic("history", "icon sm")}<span style="flex:1">${esc(r)}</span>${ic("chevS", "icon xs")}</button>`).join("")}</div></div>
          <div class="section">${sectionHead(t("trending"), null, false)}<div class="trend">${trending.map((r) => `<button class="chip" data-q-set="${esc(r)}">${ic("trend")}${esc(r)}</button>`).join("")}</div></div>
          <div class="section">${sectionHead(t("secPopular"), null, false)}${carousel(T.products.filter((p) => p.tags.includes("popular")).slice(0, 6))}</div>`
          : res.length ? `<div class="muted num" style="padding:8px 16px">${res.length} ${t("results")} · "${esc(S.query)}"</div><div class="p-grid">${res.map(productCard).join("")}</div>`
          : `<div class="empty"><div class="ill">${ic("search")}</div><h3>${t("noResults", { q: esc(S.query) })}</h3><p>${t("noResultsSub")}</p><button class="btn soft sm" data-go="categories">${t("navCats")}</button></div>`}
      </div>${cartBar()}${bottomNav("search")}${toastEl()}</div>`;
  };

  R.deals = () => {
    const deals = T.products.filter((p) => p.tags.includes("deal")).sort((a, b) => pct(b) - pct(a));
    return `<div class="screen">${statusbar()}${vhead("deals")}
      <div class="scroll pb-nav"><div class="pad" style="margin-top:12px"><div class="deal-banner" style="background:linear-gradient(135deg,var(--mandarin-600),var(--mandarin));color:#fff">${wave()}<div><div style="font-size:12px;font-weight:800;opacity:.9">${t("endsIn")}</div><h3 style="margin:2px 0 4px"><span class="countdown"><span class="num" style="background:rgba(255,255,255,.2)">02</span>:<span class="num" style="background:rgba(255,255,255,.2)">14</span>:<span class="num" style="background:rgba(255,255,255,.2)">09</span></span></h3><p>${t("dealHero")} · ${t("dealHeroSub")}</p></div>${ic("percent", "icon")} </div></div>
        <div class="chips">${[["all", t("all")], ["grocery", t("supermarket")], ["drinks", t("drinks")], ["care", t("care")], ["baby", t("baby")]].map(([id, l], i) => `<button class="chip ${i === 0 ? "on" : ""}">${l}</button>`).join("")}</div>
        <div class="p-grid">${deals.map(productCard).join("")}</div></div>${cartBar()}${bottomNav("deals")}${toastEl()}</div>`;
  };

  R.food = () => {
    const subs = S.lang === "ar" ? T.subcats.food : T.subcatsEn.food; const si = S.foodSub || 0;
    const all = T.products.filter((p) => p.cat === "food");
    const list = all.filter((p) => si === 0 || p.sub === si);
    const seg = S.seg.food ?? 0; const featured = seg === 0 ? all.filter((p) => p.tags.includes("popular") || p.oldPrice) : all.filter((p) => p.price >= 60);
    const cards = [
      { t: t("foodHero"), s: t("kitchen"), bg: "#FCE9D9", fg: "#B4441E", icon: "food", go: "food", sub: 0 },
      { t: S.lang === "ar" ? "فطار بلدي لشخصين" : "Baladi breakfast for 2", s: S.lang === "ar" ? "من مطبخ توّا · 95 ج.م" : "Twaa kitchen · EGP 95", bg: "#F7E9D3", fg: "#A15B12", icon: "egg", go: "food", sub: 3 },
      { t: S.lang === "ar" ? "حلويات سخنة" : "Warm desserts", s: S.lang === "ar" ? "أم علي ورز بلبن" : "Om Ali & rice pudding", bg: "#F3E5E8", fg: "#8E3A4B", icon: "candy", go: "food", sub: 4 },
    ];
    const quick = [
      { t: S.lang === "ar" ? "كل العروض" : "All offers", s: S.lang === "ar" ? "لحد 15% خصم" : "Up to 15% off", icon: "percent", bg: "#FEE7DA", fg: "#E05F1C", go: "deals" },
      { t: S.lang === "ar" ? "15 دقيقة" : "15 mins", s: S.lang === "ar" ? "أسرع تجهيز" : "Fastest prep", icon: "bolt", bg: "#FBF0D0", fg: "#B8860B", go: "food", sub: 1 },
      { t: S.lang === "ar" ? "جديد" : "Latest", s: S.lang === "ar" ? "وصل حديثاً" : "New additions", icon: "sparkle", bg: "#E3F3E6", fg: "#2E7D4F", go: "food", sub: 2 },
      { t: S.lang === "ar" ? "مشروبات" : "Drinks", s: S.lang === "ar" ? "شاي وقهوة" : "Tea & coffee", icon: "cup", bg: "#EFE5F0", fg: "#3A1F3D", go: "food", sub: 5 },
    ];
    return `<div class="screen">${statusbar()}${vhead("food", { search: S.lang === "ar" ? "دوّر على أكلة أو مطبخ" : "Search dishes or kitchens" })}
      <div class="scroll pb-nav">
        ${promoCards(cards)}
        ${quickTiles(quick)}
        <div class="section" style="margin-top:12px"><div class="pad">${segmented("food", [[t("recommended"), null], [`${t("free")} ${t("delivery")}`, "bike"]])}</div><div class="h-scroll">${featured.map(foodImgCard).join("")}</div></div>
        <div class="section"><div class="section-head"><div><h2>${t("foodT")}</h2><div class="sub">${t("foodHeroSub")}</div></div></div>
          <div class="chips">${subs.map((s, i) => `<button class="chip ${si === i ? "on" : ""}" data-foodsub="${i}">${esc(s)}</button>`).join("")}</div>
          <div class="pad meal-list">${list.map((p) => mealCard(p, true)).join("")}</div></div>
      </div>${cartBar()}${bottomNav("home")}${toastEl()}</div>`;
  };

  /* ---- PHARMACY vertical (OTC only) ---- */
  R.pharmacy = () => {
    const subs = S.lang === "ar" ? T.subcats.pharmacy : T.subcatsEn.pharmacy; const si = S.psub || 0;
    const all = T.products.filter((p) => p.cat === "pharmacy"); const list = all.filter((p) => si === 0 || p.sub === si);
    const seg = S.seg.pharma ?? 0; const featured = seg === 0 ? all.filter((p) => p.tags.includes("popular") || p.tags.includes("again")) : all.filter((p) => p.oldPrice);
    const cards = [
      { t: t("pharmaHero"), s: t("otcNote"), bg: "#E1F1F3", fg: "#0F7C8C", icon: "pill", go: "pharmacy" },
      { t: S.lang === "ar" ? "فيتامينات ومناعة" : "Vitamins & immunity", s: S.lang === "ar" ? "خصم لحد 15%" : "Up to 15% off", bg: "#FBF0D0", fg: "#B8860B", icon: "sparkle", go: "pharmacy" },
      { t: S.lang === "ar" ? "أمومة وطفل" : "Mother & baby", s: S.lang === "ar" ? "لبن أطفال وحفاضات" : "Formula & diapers", bg: "#FDECEC", fg: "#C24E6B", icon: "baby", go: "pharmacy" },
    ];
    const quick = [
      { t: S.lang === "ar" ? "مسكنات وبرد" : "Pain & cold", s: S.lang === "ar" ? "بانادول، كونجستال" : "Panadol, Congestal", icon: "pill", bg: "#E1F1F3", fg: "#0F7C8C", go: "pharmacy", psub: 1 },
      { t: S.lang === "ar" ? "فيتامينات" : "Vitamins", s: S.lang === "ar" ? "سي، زنك، د" : "C, Zinc, D", icon: "sparkle", bg: "#FBF0D0", fg: "#B8860B", go: "pharmacy", psub: 2 },
      { t: t("askPharmacist"), s: t("askPharmacistSub"), icon: "stethoscope", bg: "#E3F3E6", fg: "#2E7D4F", toast: "help" },
      { t: t("uploadRx"), s: S.lang === "ar" ? "أدوية بروشتة" : "Prescription items", icon: "rx", bg: "#EFE5F0", fg: "#3A1F3D", toast: "soon", soon: true },
    ];
    return `<div class="screen">${statusbar()}${vhead("pharmacy", { search: S.lang === "ar" ? "دوّر على دوا أو منتج طبي" : "Search medicines or medical products" })}
      <div class="scroll pb-nav">
        ${promoCards(cards)}
        ${quickTiles(quick)}
        <div class="pad" style="margin-top:8px"><div class="row" style="gap:8px;background:var(--success-100);color:var(--success);border-radius:12px;padding:10px 12px;font-size:13px;font-weight:700">${ic("shield", "icon sm")}<span>${t("otcNote")} · ${S.lang === "ar" ? "صيدلي مرخّص يراجع كل طلب" : "A licensed pharmacist reviews every order"}</span></div></div>
        <div class="section" style="margin-top:12px"><div class="pad">${segmented("pharma", [[t("recommended"), null], [t("deals"), "percent"]])}</div>${carousel(featured)}</div>
        <div class="section"><div class="section-head"><div><h2>${t("pharmaT")}</h2><div class="sub">${t("pharmaHeroSub")}</div></div></div>
          <div class="chips">${subs.map((s, i) => `<button class="chip ${si === i ? "on" : ""}" data-psub="${i}">${esc(s)}</button>`).join("")}</div>
          <div class="p-grid">${list.map(productCard).join("")}</div></div>
      </div>${cartBar()}${bottomNav("home")}${toastEl()}</div>`;
  };

  R.cart = () => {
    const items = cartItems(); const sub = subtotal(); const remain = Math.max(0, FREE_DELIVERY - sub); const min = S.zone.area.min;
    return `<div class="screen">${statusbar()}
      <div class="topbar"><button class="icon-btn ghost" data-go="home" aria-label="back">${ic("chevS")}</button><h1>${t("cart")} ${items.length ? `<span class="muted num" style="font-family:var(--font-body)">(${cartCount()})</span>` : ""}</h1>${items.length ? `<button class="btn ghost sm" data-clear-cart style="color:var(--danger)">${ic("trash", "icon sm")}</button>` : ""}</div>
      ${!items.length ? `<div class="scroll"><div class="empty" style="padding-top:80px"><div class="ill">${ic("cart")}</div><h3>${t("emptyCart")}</h3><p>${t("emptyCartSub")}</p><button class="btn primary sm" data-go="home">${t("startShopping")}</button></div></div>${bottomNav("home")}`
      : `<div class="scroll pad pb-cta">
          <div class="upsell"><div class="t">${ic("truck", "icon sm")}<span>${remain > 0 ? t("upsellFree", { n: remain }) : t("upsellDone")}</span></div><div class="progress"><i style="width:${Math.min(100, (sub / FREE_DELIVERY) * 100)}%"></i></div></div>
          <div class="card" style="margin-top:12px;padding:4px 16px">${items.map(({ p, q }) => `<div class="line-item">${tile(p, "thumb")}<div class="info"><div class="n">${esc(name(p))}</div><div class="u">${esc(unit(p))} · <span class="num">${money(p.price)}</span></div></div><div class="col"><span class="price num" style="font-size:15px">${p.price * q} ${t("egp")}</span>${quickAdd(p)}</div></div>`).join("")}</div>
          <div class="section" style="margin-top:20px">${sectionHead(t("related"), null, false)}<div class="h-scroll" style="padding-left:0;padding-right:0">${T.products.filter((p) => !S.cart[p.id] && (T.related[items[0].p.id] || [5, 9, 13]).includes(p.id)).concat(T.products.filter((p) => !S.cart[p.id] && p.tags.includes("popular")).slice(0, 4)).slice(0, 5).map(productCard).join("")}</div></div>
          <div class="card" style="margin-top:8px"><h3>${ic("tag", "icon sm")} ${t("promoPh")}</h3>${S.promo ? `<div class="row between"><span class="pill success">${ic("check", "icon xs")} ${t("promoOk", { c: S.promo })}</span><button class="btn ghost sm" data-promo-clear>${ic("x", "icon sm")}</button></div>` : `<div class="row"><div class="input" style="flex:1;height:46px"><input data-promo placeholder="TWAA30" aria-label="${t("promoPh")}" dir="ltr" style="text-transform:uppercase;font-family:var(--font-display);font-weight:800;letter-spacing:.1em"></div><button class="btn dark sm" data-promo-apply style="min-height:46px">${t("apply")}</button></div>`}</div>
          <div class="card"><h3>${ic("refresh", "icon sm")} ${t("subPref")}</h3>${[["none", "subNone"], ["similar", "subSimilar"], ["call", "subCall"]].map(([v, l]) => `<button class="opt ${S.sub === v ? "on" : ""}" data-sub="${v}"><span class="radio"></span><span class="ob"><div class="t">${t(l)}</div></span></button>`).join("")}</div>
          <div class="card"><h3>${t("summaryT")}</h3>
            <div class="row between muted"><span>${t("subtotal")}</span><span class="num">${money(sub)}</span></div>
            ${discount() ? `<div class="row between" style="color:var(--success);font-size:13px;margin-top:6px"><span>${t("discount")} (${S.promo})</span><span class="num">−${money(discount())}</span></div>` : ""}
            <div class="row between muted" style="margin-top:6px"><span>${t("delivery")}</span><span class="num">${deliveryFee() ? money(deliveryFee()) : `<b style="color:var(--success)">${t("free")}</b>`}</span></div>
            <div class="row between muted" style="margin-top:6px"><span>${t("service")} ${ic("info", "icon xs")}</span><span class="num">${money(serviceFee())}</span></div>
            <div class="divider"></div><div class="row between"><b>${t("total")}</b><span class="price num">${total()} <small>${t("egp")}</small></span></div></div>
        </div>
        <div class="cta-bar">${sub < min ? `<div class="row" style="justify-content:center"><span class="pill warn">${ic("info", "icon xs")} ${t("minBasket", { n: min })}</span></div>` : ""}<button class="btn primary" data-go="checkout" ${sub < min ? "disabled" : ""}><span>${t("checkout")}</span><span class="split num">${money(total())}</span></button></div>`}
      ${toastEl()}</div>`;
  };

  R.checkout = () => {
    const a = S.zone.area;
    const pays = [["cod", "cash", "cod", "codSub"], ["card", "card", "card", "cardSub"], ["wallet", "mobile", "wallet", "walletSub"], ["twaa", "wallet", "twaaWallet", "twaaWalletSub"]];
    return `<div class="screen">${statusbar()}
      <div class="topbar"><button class="icon-btn ghost" data-go="cart" aria-label="back">${ic("chevS")}</button><h1>${t("checkout")}</h1></div>
      <div class="chips" style="padding-top:0;gap:6px">${[t("addressT"), t("deliveryT"), t("paymentT"), t("summaryT")].map((s, i) => `<span class="chip ${i < 3 ? "on" : ""}" style="min-height:28px;padding:4px 10px;font-size:12px">${i + 1}. ${s}</span>`).join("")}</div>
      <div class="scroll pad pb-cta">
        <div class="card"><div class="row between"><h3 style="margin:0">${ic("pin", "icon sm")} ${t("addressT")}</h3><button class="btn ghost sm" data-go="location" style="color:var(--mandarin-600)">${t("change")}</button></div>
          <div class="row" style="margin-top:8px"><span class="pill brand">${ic("home", "icon xs")} ${t(S.zone.label)}</span><span style="font-weight:700;font-size:14px">${placeName(a)}</span></div>
          <div class="muted" style="margin-top:4px">${S.lang === "ar" ? "شارع الجيش، عمارة 12، الدور 3، شقة 7 · بجوار البنك الأهلي" : "El Gaish St., Bldg 12, Floor 3, Apt 7 · Next to NBE bank"}</div>
          <div class="row" style="margin-top:8px"><span class="muted num" dir="ltr">+20 ${S.phone}</span></div></div>
        <div class="card"><h3>${ic("clock", "icon sm")} ${t("deliveryT")}</h3>
          <button class="opt ${S.slot === "now" ? "on" : ""}" data-slot="now"><span class="radio"></span><span class="ico">${ic("bolt", "icon sm")}</span><span class="ob"><div class="t">${t("now")} · <span class="num" style="color:var(--mandarin-600)">${a.eta} ${t("min")}</span></div><div class="s">${t("nowSub")}</div></span></button>
          <button class="opt ${S.slot === "sched" ? "on" : ""}" data-slot="sched"><span class="radio"></span><span class="ico">${ic("clock", "icon sm")}</span><span class="ob"><div class="t">${t("sched")}</div><div class="s">${t("schedSub")}</div></span></button>
          ${S.slot === "sched" ? `<div class="chips" style="padding:10px 0 0">${["6–7 م", "7–8 م", "8–9 م", "9–10 م"].map((s, i) => `<button class="chip ${i === 1 ? "on" : ""}">${s}</button>`).join("")}</div>` : ""}</div>
        <div class="card"><h3>${ic("wallet", "icon sm")} ${t("paymentT")} <span class="pill success" style="margin-inline-start:auto;font-family:var(--font-body)">${ic("lock", "icon xs")} ${t("secureBadge")}</span></h3>
          <button class="opt wallet-opt ${S.useWallet ? "on" : ""}" data-usewallet><span class="ico" style="background:var(--mandarin-100);color:var(--mandarin-600)">${ic("wallet", "icon sm")}</span><span class="ob"><div class="t">${t("useWallet")} · <span class="num">${money(T.wallet.balance)}</span></div><div class="s">${S.useWallet ? t("useWalletS", { n: walletUsed() }) : t("walletPromo")}</div></span><span class="switch ${S.useWallet ? "on" : ""}"><i></i></span></button>
          ${dueNow() > 0 ? `<div class="muted" style="margin:10px 0 6px;font-weight:700">${S.useWallet ? `${t("remaining")} <span class="num">${money(dueNow())}</span> · ` : ""}${S.lang === "ar" ? "ادفع بـ" : "Pay with"}</div>
          ${[["cod", "cash", "cod", "codSub"], ["card", "card", "card", "cardSub"], ["wallet", "mobile", "wallet", "walletSub"]].map(([v, i, l, s]) => `<button class="opt ${S.pay === v ? "on" : ""}" data-pay="${v}"><span class="radio"></span><span class="ico">${ic(i, "icon sm")}</span><span class="ob"><div class="t">${t(l)}</div><div class="s">${t(s)}</div></span></button>
            ${S.pay === v && v === "cod" ? `<div class="sub-opt"><div class="muted" style="font-weight:700;margin-bottom:6px">${t("changeFor")}</div><div class="chips" style="padding:0">${["exact", "100", "200", "500"].map((c) => `<button class="chip ${S.change === c ? "on" : ""}" data-change="${c}">${c === "exact" ? t("changeNo") : `<span class="num">${c}</span> ${t("egp")}`}</button>`).join("")}</div></div>` : ""}
            ${S.pay === v && v === "card" ? `<div class="sub-opt"><div class="muted" style="font-weight:700;margin-bottom:6px">${t("savedCards")}</div>${T.cards.map((c, k) => `<button class="opt sm ${S.card === k ? "on" : ""}" data-card="${k}"><span class="radio"></span><span class="ob"><div class="t">${c.brand} <span class="num" dir="ltr">•••• ${c.last4}</span></div><div class="s num" dir="ltr">${c.exp}</div></span>${ic("card", "icon sm")}</button>`).join("")}<button class="btn ghost sm" style="margin-top:6px">${ic("plus", "icon sm")} ${t("addCard")}</button></div>` : ""}
            ${S.pay === v && v === "wallet" ? `<div class="sub-opt"><div class="input" style="height:44px"><span class="prefix">+20</span><input inputmode="tel" value="${S.phone}" aria-label="${t("walletPhone")}"></div><div class="hint" style="margin-top:6px">${S.lang === "ar" ? "هيجيلك طلب تأكيد على موبايلك" : "You'll get a confirmation prompt on your phone"}</div></div>` : ""}`).join("")}` : `<div class="pill success" style="margin-top:10px">${ic("check", "icon xs")} ${S.lang === "ar" ? "المحفظة بتغطي الطلب كله" : "Wallet covers the whole order"}</div>`}
          <div class="row" style="gap:6px;margin-top:12px;color:var(--muted);font-size:12px">${ic("lock", "icon xs")} ${t("secure")}</div></div>
        <div class="card earn-card"><span class="ico">${ic("coins", "icon sm")}</span><div><b>${t("earnOnOrder", { n: ptsFor(total()) })}</b><div class="muted">${t("earnRule")}</div></div><button class="btn ghost sm" data-go="loyalty">${ic("chevS", "icon xs")}</button></div>
        <div class="card"><h3>${t("notes")}</h3><div class="input" style="height:46px"><input placeholder="${t("notesPh")}" aria-label="${t("notes")}"></div></div>
        <div class="card"><h3>${t("summaryT")} <span class="muted num" style="font-family:var(--font-body);font-weight:600">· ${cartCount()} ${t("itemsPl")}</span></h3>
          <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:10px">${cartItems().slice(0, 6).map(({ p, q }) => `<span style="position:relative">${tile(p, "thumb").replace('class="thumb"', 'class="thumb" style="width:44px;height:44px;border-radius:10px;display:grid;place-items:center;"')}<span class="badge" style="position:absolute;top:-4px;inset-inline-end:-4px;min-width:18px;height:18px;border-radius:9px;background:var(--aubergine);color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center">${q}</span></span>`).join("")}</div>
          <div class="row between muted"><span>${t("subtotal")}</span><span class="num">${money(subtotal())}</span></div>
          ${discount() ? `<div class="row between" style="color:var(--success);font-size:13px;margin-top:6px"><span>${t("discount")}</span><span class="num">−${money(discount())}</span></div>` : ""}
          <div class="row between muted" style="margin-top:6px"><span>${t("delivery")}</span><span class="num">${deliveryFee() ? money(deliveryFee()) : `<b style="color:var(--success)">${t("free")}</b>`}</span></div>
          <div class="row between muted" style="margin-top:6px"><span>${t("service")}</span><span class="num">${money(serviceFee())}</span></div>
          <div class="divider"></div><div class="row between"><b>${t("total")}</b><span class="price num">${total()} <small>${t("egp")}</small></span></div></div>
      </div>
      <div class="cta-bar"><div class="row"><span class="muted">${S.useWallet ? t("remaining") : t("total")}${S.pay === "cod" && dueNow() > 0 ? ` · ${t("payAtDoor")}` : ""}</span><b class="num" style="margin-inline-start:auto">${money(dueNow())}</b></div><button class="btn primary" data-place>${ic("check", "icon sm")} ${t("placeOrder")}</button></div>${toastEl()}</div>`;
  };

  R.tracking = () => {
    const o = T.orders[0]; const steps = [["stConfirmed", "stConfirmedS", "4:21"], ["stPreparing", "stPreparingS", "4:26"], ["stOut", "stOutS", "4:38"], ["stDelivered", "stDeliveredS", ""]];
    const items = S.orderId ? cartItems().map(({ p, q }) => ({ p, q })) : o.items.map((id) => ({ p: prod(id), q: 1 }));
    return `<div class="screen">${statusbar()}
      <div class="topbar"><button class="icon-btn ghost" data-go="orders" aria-label="back">${ic("chevS")}</button><h1>${t("trackT")}</h1><button class="icon-btn ghost" data-toast="help" aria-label="${t("help")}">${ic("help")}</button></div>
      ${map(210, S.trackStep >= 2)}
      <div class="scroll pad pb-cta" style="margin-top:-28px;position:relative;z-index:2">
        <div class="card"><div class="row between"><div><div class="muted">${t("orderNo")} <span class="num" dir="ltr">#${S.orderId || o.id}</span></div><div style="font-family:var(--font-display);font-weight:800;font-size:22px;color:var(--aubergine)">${t("arriving")} <span class="num" style="color:var(--mandarin-600)">${S.trackStep >= 3 ? "0" : 12 - S.trackStep * 3} ${t("min")}</span></div></div><span class="eta-chip">${ic("bolt")}<span class="num">${S.zone.area.eta} ${t("min")}</span></span></div>
          <div class="divider"></div>
          <div class="hsteps" aria-label="${t("trackT")}">${steps.map(([l, s, tm], i) => `<div class="hstep ${i < S.trackStep ? "done" : i === S.trackStep ? "now" : "pending"}"><span class="dot">${i < S.trackStep ? ic("check", "icon xs") : ic(["check", "box", "bike", "home"][i], "icon xs")}</span><div class="hl">${t(l)}</div></div>`).join("")}</div>
          <div class="hstep-msg">${ic(["check", "box", "bike", "home"][S.trackStep], "icon sm")}<div><b>${t(steps[S.trackStep][0])}</b><div class="muted">${t(steps[S.trackStep][1])}${steps[S.trackStep][2] ? ` · <span class="num">${steps[S.trackStep][2]}</span>` : ""}</div></div></div>
          <button class="btn ghost sm" data-track-next style="margin:-8px auto 0;display:flex">${S.lang === "ar" ? "(للعرض) الخطوة التالية" : "(Demo) next step"} ${ic("chevS", "icon xs")}</button></div>
        <div class="card code-card"><div><div class="muted">${t("deliveryCode")}</div><div class="code-digits num" dir="ltr">${S.deliveryCode.split("").map((c) => `<span>${c}</span>`).join("")}</div><div class="muted">${t("deliveryCodeS")}</div></div><div class="col" style="display:flex;flex-direction:column;gap:8px"><button class="btn soft sm" data-toast="share">${ic("share", "icon sm")} ${t("shareTrack")}</button><span class="pill ${S.pay === "cod" && dueNow() > 0 ? "warn" : "success"}">${S.pay === "cod" && dueNow() > 0 ? `${ic("cash", "icon xs")} ${t("codDue")} · <span class="num">${money(dueNow())}</span>` : `${ic("check", "icon xs")} ${t("paidOk")}`}</span></div></div>
        ${S.trackStep < 3 ? `<div class="card"><h3>${ic("door", "icon sm")} ${S.lang === "ar" ? "طريقة الاستلام" : "Handover"}</h3><div class="row" style="gap:8px">${[["hand", "hand", "handToMe", "handToMeS"], ["door", "door", "contactless", "contactlessS"]].map(([v, i, l, s]) => `<button class="opt ${S.handover === v ? "on" : ""}" data-handover="${v}" style="flex:1;margin:0"><span class="ico">${ic(i, "icon sm")}</span><span class="ob"><div class="t">${t(l)}</div><div class="s">${t(s)}</div></span></button>`).join("")}</div>${S.pay === "cod" && dueNow() > 0 ? `<div class="pill warn" style="margin-top:10px">${ic("info", "icon xs")} ${t("prepareChange")} · ${S.change === "exact" ? t("changeNo") : `<span class="num">${S.change} ${t("egp")}</span>`}</div>` : ""}</div>` : `<div class="card"><h3>${ic("image", "icon sm")} ${t("proof")}</h3><div class="proof"><span class="proof-img">${ic("box")}</span><div><b>${t("stDeliveredS")}</b><div class="muted">${t("proofS")} · <span class="num">4:52</span></div></div></div></div>`}
        ${S.trackStep >= 2 ? `<div class="card"><div class="row"><span class="avatar">م</span><div style="flex:1"><div style="font-weight:800">${S.lang === "ar" ? "محمود عبدالله" : "Mahmoud Abdallah"}</div><div class="muted">${t("rider")} · ${ic("star", "icon xs")} <span class="num">4.9</span> · <span class="num" dir="ltr">${S.lang === "ar" ? "س ن ط 4521" : "SNT 4521"}</span></div><div class="pill accent" style="margin-top:4px">${ic("nav", "icon xs")} ${t("riderAway", { n: S.trackStep >= 3 ? "0" : "1.2" })}</div></div><button class="icon-btn ghost" aria-label="${t("callRider")}" data-toast="call">${ic("phone")}</button><button class="icon-btn ghost" aria-label="${t("chatSupport")}" data-toast="help">${ic("chat")}</button></div></div>` : ""}
        <div class="card"><h3>${ic("box", "icon sm")} ${t("orderItems")} <span class="muted" style="font-family:var(--font-body);font-weight:600">· ${items.length}</span></h3>${items.map(({ p, q }) => `<div class="row" style="padding:6px 0">${tile(p, "thumb").replace('class="thumb"', 'class="thumb" style="width:40px;height:40px;border-radius:10px;display:grid;place-items:center"')}<span style="flex:1;font-size:14px;font-weight:700">${esc(name(p))}</span><span class="muted num">×${q}</span><span class="num" style="font-weight:700">${money(p.price * q)}</span></div>`).join("")}<div class="divider"></div><div class="row between"><b>${t("total")}</b><b class="num">${money(S.orderId ? total() : o.total)}</b></div><div class="muted" style="margin-top:4px">${t(S.pay === "cod" ? "cod" : S.pay === "card" ? "card" : S.pay === "wallet" ? "wallet" : "twaaWallet")}</div></div>
        <div class="card"><h3>${ic("bell", "icon sm")} ${t("updatesT")}</h3>${[[3, "4:52", "stDeliveredS"], [2, "4:38", "stOutS"], [1, "4:26", "stPreparingS"], [0, "4:21", "stConfirmedS"]].filter(([i]) => i <= S.trackStep).map(([i, tm, k]) => `<div class="upd"><span class="num">${tm}</span><span>${t(k)}</span></div>`).join("")}</div>
        <div class="card"><div class="row between"><span style="font-weight:700">${t("needHelp")}</span><button class="btn soft sm" data-go="support">${ic("chat", "icon sm")} ${t("support")}</button></div>
          ${S.trackStep < 1 ? `<div class="divider"></div>${S.cancel === null ? `<div class="row between"><span class="pill success">${ic("check", "icon xs")} ${t("cancelFree")}</span><button class="btn ghost sm" style="color:var(--danger)" data-cancel-start>${t("cancelOrder")}</button></div>` : S.cancel === "done" ? `<div class="pill danger">${ic("x", "icon xs")} ${t("cancelled2")}</div><div class="muted" style="margin-top:6px">${t("cancelledS")}</div>` : `<div class="muted" style="font-weight:700;margin-bottom:8px">${t("cancelReasonT")}</div><div class="chips" style="padding:0;flex-wrap:wrap">${t("cancelReasons").map((r, i) => `<button class="chip ${S.cancel === i ? "on" : ""}" data-cancel-reason="${i}">${esc(r)}</button>`).join("")}</div><button class="btn outline sm" style="margin-top:10px;color:var(--danger);border-color:var(--danger)" data-cancel-confirm ${typeof S.cancel === "number" ? "" : "disabled"}>${t("cancelConfirm")}</button>`}` : ""}</div>
      </div>
      ${S.trackStep >= 3 ? `<div class="cta-bar"><button class="btn primary" data-go="rating">${ic("star", "icon sm")} ${t("rateOrder")}</button></div>` : ""}${toastEl()}</div>`;
  };

  R.orders = () => `<div class="screen">${statusbar()}
    <div class="topbar"><h1>${t("ordersT")}</h1></div>
    <div class="scroll pad pb-nav">${T.orders.map((o) => `<div class="card order-card"><div class="oh"><div><div style="font-weight:800" class="num" dir="ltr">#${o.id}</div><div class="muted">${esc(S.lang === "ar" ? o.date : o.dateEn)} · <span class="num">${o.items.length} ${t("itemsPl")}</span></div></div><span class="pill ${o.status === "out" ? "accent" : o.status === "delivered" ? "success" : "danger"}">${o.status === "out" ? ic("bike", "icon xs") + " " + t("onWay") : o.status === "delivered" ? ic("check", "icon xs") + " " + t("delivered") : ic("x", "icon xs") + " " + t("cancelled")}</span></div>
      <div class="thumbs">${o.items.slice(0, 4).map((id) => `<span style="background:${cat(prod(id).cat).bg};color:${cat(prod(id).cat).fg}">${ic(cat(prod(id).cat).icon)}</span>`).join("")}${o.items.length > 4 ? `<span class="more">+${o.items.length - 4}</span>` : ""}</div>
      ${o.status === "out" ? `<div class="ao-bar" style="margin-bottom:10px"><i style="width:${(S.trackStep + 1) * 25}%"></i></div>` : ""}
      <div class="row between"><b class="num">${money(o.total)}</b><div class="row" style="gap:8px">${o.status === "out" ? `<button class="btn dark sm" data-go="tracking">${ic("nav", "icon sm")} ${t("trackT")}</button>` : `<button class="btn soft sm" data-reorder="${o.id}">${ic("refresh", "icon sm")} ${t("reorder")}</button>`}<button class="btn ghost sm" data-order="${o.id}">${t("orderDetailT")} ${ic("chevS", "icon xs")}</button></div></div></div>`).join("")}</div>${cartBar()}${bottomNav("orders")}${toastEl()}</div>`;

  R.rating = () => `<div class="screen">${statusbar()}
    <div class="topbar"><button class="icon-btn ghost" data-go="orders" aria-label="close">${ic("x")}</button></div>
    <div class="scroll pad pb-cta" style="text-align:center"><div class="empty" style="padding:8px 0 16px"><div class="ill" style="background:var(--success-100);color:var(--success)">${ic("check")}</div><h3 style="font-size:26px">${t("ratingT")}</h3><p>${t("ratingSub")}</p></div>
      <div class="rating-stars" role="radiogroup" aria-label="rating">${[1, 2, 3, 4, 5].map((n) => `<button role="radio" aria-checked="${S.stars === n}" class="${n <= S.stars ? "on" : ""}" data-star="${n}" aria-label="${n}">${ic("star")}</button>`).join("")}</div>
      <div class="fb-chips" style="margin:24px 0">${t("fb").map((f, i) => `<button class="chip ${S.fb.has(i) ? "on" : ""}" data-fb="${i}">${esc(f)}</button>`).join("")}</div>
      <div class="card" style="text-align:start"><div class="row"><span class="avatar">م</span><div style="flex:1"><div style="font-weight:800">${t("rateRider")}</div><div class="muted">${S.lang === "ar" ? "محمود عبدالله" : "Mahmoud Abdallah"}</div></div><div class="rating-stars" style="gap:0">${[1, 2, 3, 4, 5].map((n) => `<button class="${n <= 5 ? "on" : ""}" style="width:32px;height:32px" aria-label="${n}"><svg viewBox="0 0 24 24" class="icon" style="width:22px;height:22px">${I.star}</svg></button>`).join("")}</div></div></div>
      <div class="card" style="text-align:start"><div style="font-weight:800;margin-bottom:8px">${t("rateProducts")}</div><div class="input" style="height:80px;align-items:flex-start;padding-top:10px"><input placeholder="${S.lang === "ar" ? "اكتب ملاحظاتك (اختياري)" : "Write your notes (optional)"}" aria-label="${t("rateProducts")}"></div></div></div>
    <div class="cta-bar"><button class="btn primary" data-toast="thanks" ${S.stars ? "" : "disabled"}>${t("submit")}</button><button class="btn ghost" data-go="home" style="min-height:40px">${t("skip")}</button></div>${toastEl()}</div>`;

  R.account = () => {
    const rows = [["receipt", "ordersT", "orders", `12`], ["pin", "myAddresses", "location", `3`], ["wallet", "myWallet", "wallet", `<span class="num">${T.wallet.balance} ${t("egp")}</span>`], ["coins", "loyaltyT", "loyalty", `<span class="num">${T.loyalty.points}</span>`], ["undo", "retT", "orders", ""], ["heart", "myFavs", null, `${S.favs.size}`], ["tag", "myPromos", "deals", "2"], ["bell", "notif", "notifications", "2"], ["chat", "support", "support", ""], ["globe", "lang", "lang", S.lang === "ar" ? "العربية" : "English"], ["shield", "privacy", null, ""], ["doc", "terms", null, ""]];
    return `<div class="screen">${statusbar(true)}
      <div class="appbar"><div class="row"><span class="avatar" style="background:var(--cream);color:var(--aubergine)">أ</span><div style="flex:1"><div style="font-family:var(--font-display);font-weight:800;font-size:20px">${S.lang === "ar" ? "أحمد محمد" : "Ahmed Mohamed"}</div><div style="opacity:.8;font-size:13px" class="num" dir="ltr">+20 ${S.phone}</div></div><button class="icon-btn ghost-light" aria-label="edit">${ic("user")}</button></div>
        <div class="row" style="margin-top:16px;gap:8px">${[[12, t("orders")], [T.wallet.balance, t("myWallet")], [T.loyalty.points, t("ptsPl")]].map(([n, l], k) => `<div data-go="${["orders", "wallet", "loyalty"][k]}" role="button" tabindex="0" style="flex:1;background:rgba(255,255,255,.1);border-radius:12px;padding:10px;text-align:center;cursor:pointer"><div class="num" style="font-family:var(--font-display);font-weight:800;font-size:20px">${n}</div><div style="font-size:11px;opacity:.8">${l}</div></div>`).join("")}</div></div>
      <div class="scroll pad pb-nav" style="padding-top:16px">
        <div>${rows.map(([i, l, go, v]) => `<button class="menu-item" ${go === "lang" ? "data-lang-toggle" : go ? `data-go="${go}"` : ""}><span class="mi">${ic(i, "icon sm")}</span><span class="ml">${t(l)}</span><span class="muted">${v}</span>${ic("chevS", "icon sm chev")}</button>`).join("")}</div>
        <div style="margin-top:16px"><button class="menu-item danger" style="border-radius:16px" data-go="login"><span class="mi">${ic("logout", "icon sm")}</span><span class="ml">${t("logout")}</span></button></div>
        <div class="muted" style="text-align:center;margin-top:20px;font-size:12px">Twaa v1.0 · ${S.lang === "ar" ? "من هنا لك.. توّا" : "From here, to you.. now"}</div>
      </div>${cartBar()}${bottomNav("account")}${toastEl()}</div>`;
  };

  /* ---- Onboarding (first run) ---- */
  R.onboarding = () => {
    const slides = [["pin", "onb1T", "onb1S", "#EFE5F0", "#3A1F3D"], ["cart", "onb2T", "onb2S", "#FCE9D9", "#B4441E"], ["bike", "onb3T", "onb3S", "#E3F3E6", "#2E7D4F"]]; const i = S.onb;
    return `<div class="screen">${statusbar()}<div class="topbar"><span style="flex:1"></span><button class="btn ghost sm" data-go="location">${t("onbSkip")}</button></div>
      <div class="scroll pad" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:16px">
        <div class="onb-ill" style="background:${slides[i][3]};color:${slides[i][4]}">${ic(slides[i][0])}</div>
        <h2 style="font-family:var(--font-display);font-size:28px;color:var(--aubergine)">${t(slides[i][1])}</h2><p class="muted" style="font-size:15px;line-height:1.8;max-width:320px">${t(slides[i][2])}</p>
        <div class="dots">${slides.map((_, k) => `<span class="${k === i ? "on" : ""}"></span>`).join("")}</div>${trustRow(true)}</div>
      <div class="cta-bar"><button class="btn primary" data-onb-next>${i === 2 ? t("onbStart") : t("onbNext")} ${ic("chevS", "icon sm")}</button></div></div>`;
  };

  /* ---- Order confirmed ---- */
  R.confirmed = () => {
    const a = S.zone.area; const pts = ptsFor(total() || 134); const id = S.orderId || T.orders[0].id;
    return `<div class="screen">${statusbar()}<div class="scroll pad" style="text-align:center;padding-top:24px">
      <div class="confirm-ill">${ic("check")}</div>
      <h2 style="font-family:var(--font-display);font-size:28px;color:var(--aubergine);margin-top:12px">${t("confirmedT")}</h2><p class="muted" style="line-height:1.7;margin:6px auto 18px;max-width:320px">${t("confirmedS")}</p>
      <div class="card" style="text-align:start"><div class="row between"><div><div class="muted">${t("orderNo")} <span class="num" dir="ltr">#${id}</span></div><div style="font-family:var(--font-display);font-weight:800;font-size:22px;color:var(--aubergine)">${t("arrivesIn")} <span class="num" style="color:var(--mandarin-600)">${a.eta} ${t("min")}</span></div></div><span class="eta-chip">${ic("bolt")}<span class="num">${a.eta} ${t("min")}</span></span></div>
        <div class="hsteps" style="margin-top:14px"><div class="hstep done"><span class="dot">${ic("check", "icon xs")}</span><div class="hl">${t("stConfirmed")}</div></div><div class="hstep now"><span class="dot">${ic("box", "icon xs")}</span><div class="hl">${t("stPreparing")}</div></div><div class="hstep pending"><span class="dot">${ic("bike", "icon xs")}</span><div class="hl">${t("stOut")}</div></div><div class="hstep pending"><span class="dot">${ic("home", "icon xs")}</span><div class="hl">${t("stDelivered")}</div></div></div></div>
      <div class="card code-card" style="text-align:start"><div><div class="muted">${t("deliveryCode")}</div><div class="code-digits num" dir="ltr">${S.deliveryCode.split("").map((c) => `<span>${c}</span>`).join("")}</div><div class="muted">${t("deliveryCodeS")}</div></div><span class="pill ${S.pay === "cod" && dueNow() > 0 ? "warn" : "success"}">${S.pay === "cod" && dueNow() > 0 ? `${ic("cash", "icon xs")} ${t("codDue")} <span class="num">${money(dueNow())}</span>` : `${ic("check", "icon xs")} ${t("paidOk")}`}</span></div>
      <div class="card earn-card" style="text-align:start"><span class="ico">${ic("coins", "icon sm")}</span><div><b>${t("youEarn")} <span class="num">${pts}</span> ${t("ptsPl")}</b><div class="muted">${t("earnRule")}</div></div></div>
      <div style="height:140px"></div></div>
      <div class="cta-bar"><button class="btn primary" data-go="tracking">${ic("nav", "icon sm")} ${t("trackBtn")}</button><button class="btn ghost" data-go="home" style="min-height:40px">${t("keepShopping")}</button></div></div>`;
  };

  /* ---- Order details (Amazon-style: everything about one order) ---- */
  R.orderDetail = () => {
    const o = T.orders.find((x) => x.id === S.viewOrder) || T.orders[1]; const items = o.items.map((id) => ({ p: prod(id), q: 1 }));
    const st = o.status; const pill = st === "out" ? `<span class="pill accent">${ic("bike", "icon xs")} ${t("onWay")}</span>` : st === "delivered" ? `<span class="pill success">${ic("check", "icon xs")} ${t("delivered")}</span>` : `<span class="pill danger">${ic("x", "icon xs")} ${t("cancelled")}</span>`;
    return `<div class="screen">${statusbar()}<div class="topbar"><button class="icon-btn ghost" data-go="orders" aria-label="back">${ic("chevS")}</button><h1>${t("orderDetailT")}</h1><button class="icon-btn ghost" data-toast="share" aria-label="${t("invoice")}">${ic("doc")}</button></div>
      <div class="scroll pad pb-cta">
        <div class="card"><div class="row between"><div><div style="font-weight:800" class="num" dir="ltr">#${o.id}</div><div class="muted">${esc(S.lang === "ar" ? o.date : o.dateEn)} · <span class="num">${items.length} ${t("itemsPl")}</span></div></div>${pill}</div>
          ${st === "out" ? `<button class="btn dark" style="margin-top:12px;min-height:46px" data-go="tracking">${ic("nav", "icon sm")} ${t("trackT")}</button>` : ""}</div>
        ${st === "delivered" ? `<div class="card return-card"><div class="row"><span class="ico" style="background:var(--success-100);color:var(--success)">${ic("undo", "icon sm")}</span><div style="flex:1"><b>${t("problem")}</b><div class="muted">${t("returnPolicyS")}</div></div></div><button class="btn outline" style="margin-top:12px;min-height:46px" data-ret-start="${o.id}">${t("returnBtn")}</button></div>` : ""}
        <div class="card"><h3>${ic("box", "icon sm")} ${t("orderItems")}</h3>${items.map(({ p, q }) => `<div class="row" style="padding:8px 0">${tile(p, "thumb").replace('class="thumb"', 'class="thumb" style="width:44px;height:44px;border-radius:10px;display:grid;place-items:center"')}<span style="flex:1;font-size:14px;font-weight:700">${esc(name(p))}<div class="muted" style="font-weight:600">${esc(unit(p))}</div></span><span class="muted num">×${q}</span><span class="num" style="font-weight:700">${money(p.price * q)}</span></div>`).join("")}<div class="divider"></div><div class="row between muted"><span>${t("subtotal")}</span><span class="num">${money(o.total - 13)}</span></div><div class="row between muted" style="margin-top:4px"><span>${t("delivery")} + ${t("service")}</span><span class="num">${money(13)}</span></div><div class="row between" style="margin-top:6px"><b>${t("total")}</b><b class="num">${money(o.total)}</b></div></div>
        <div class="card"><h3>${ic("wallet", "icon sm")} ${t("paidStatus")}</h3><div class="row between"><span>${t("cod")}</span><span class="pill success">${ic("check", "icon xs")} ${t("paidOk")}</span></div><div class="row between" style="margin-top:8px"><span class="muted">${t("youEarned")}</span><span class="pill brand">${ic("coins", "icon xs")} <span class="num">${ptsFor(o.total)}</span> ${t("ptsPl")}</span></div></div>
        <div class="card"><h3>${ic("pin", "icon sm")} ${t("addressT")}</h3><div style="font-weight:700">${t("homeLbl")} · ${placeName(S.zone.area)}</div><div class="muted">${S.lang === "ar" ? "شارع الجيش، عمارة 12، الدور 3، شقة 7" : "El Gaish St., Bldg 12, Floor 3, Apt 7"}</div></div>
        <div class="card"><div class="row" style="gap:8px"><button class="btn soft sm" style="flex:1" data-reorder="${o.id}">${ic("refresh", "icon sm")} ${t("reorderAll")}</button><button class="btn soft sm" style="flex:1" data-go="support">${ic("chat", "icon sm")} ${t("helpOrder")}</button></div></div>
      </div></div>`;
  };

  /* ---- Return & refund wizard ---- */
  R.returns = () => {
    const o = T.orders.find((x) => x.id === S.viewOrder) || T.orders[1]; const items = o.items.map(prod); const r = S.ret;
    const amount = [...r.items].reduce((s, id) => s + prod(id).price, 0);
    const steps = ["retStep1", "retStep2", "retStep3", "retStep4"];
    const body = r.done ? `<div class="empty" style="padding-top:12px"><div class="ill" style="background:var(--success-100);color:var(--success)">${ic("check")}</div><h3>${t("retDoneT")}</h3><p style="max-width:300px">${t("retDoneS")}</p></div>
        <div class="card"><div class="row between"><span class="muted">${t("retAmount")}</span><b class="num" style="font-size:20px;color:var(--aubergine)">${money(amount)}</b></div><div class="divider"></div><div class="hsteps" style="margin:0">${t("retTimeline").map((l, i) => `<div class="hstep ${i === 0 ? "done" : i === 1 ? "now" : "pending"}"><span class="dot">${i === 0 ? ic("check", "icon xs") : ""}</span><div class="hl">${esc(l)}</div></div>`).join("")}</div></div>
        <div class="card"><div class="row between"><span>${t("walletT")}</span><span class="pill brand">${ic("wallet", "icon xs")} <span class="num">${T.wallet.balance}</span> ${t("egp")}</span></div><button class="btn soft sm" style="margin-top:10px" data-go="wallet">${t("walletHistory")} ${ic("chevS", "icon xs")}</button></div>`
      : r.step === 0 ? `<div class="muted" style="margin:4px 0 10px">${t("retSelectS")}</div>${items.map((p) => `<button class="opt ${r.items.has(p.id) ? "on" : ""}" data-ret-item="${p.id}"><span class="check ${r.items.has(p.id) ? "on" : ""}">${ic("check", "icon xs")}</span>${tile(p, "thumb").replace('class="thumb"', 'class="thumb" style="width:44px;height:44px;border-radius:10px;display:grid;place-items:center"')}<span class="ob"><div class="t">${esc(name(p))}</div><div class="s">${esc(unit(p))} · <span class="num">${money(p.price)}</span></div></span></button>`).join("")}`
      : r.step === 1 ? `<div class="muted" style="margin:4px 0 10px">${t("retReasonS")}</div><div class="chips" style="padding:0;flex-wrap:wrap">${t("retReasons").map((x, i) => `<button class="chip ${r.reason === i ? "on" : ""}" data-ret-reason="${i}">${esc(x)}</button>`).join("")}</div>
          <button class="opt" style="margin-top:14px" data-toast="photo"><span class="ico">${ic("camera", "icon sm")}</span><span class="ob"><div class="t">${t("retPhoto")}</div><div class="s">${t("retPhotoS")}</div></span>${ic("plus", "icon sm")}</button>
          <div class="field" style="margin-top:12px"><div class="input" style="height:80px;align-items:flex-start;padding-top:10px"><input placeholder="${S.lang === "ar" ? "تفاصيل إضافية (اختياري)" : "More details (optional)"}" aria-label="notes"></div></div>`
      : `${[["wallet", "wallet", "retToWallet", "retToWalletS"], ["card", "card", "retToCard", "retToCardS"], ["replace", "refresh", "retReplace", "retReplaceS"]].map(([v, i, l, s]) => `<button class="opt ${r.method === v ? "on" : ""}" data-ret-method="${v}"><span class="radio"></span><span class="ico">${ic(i, "icon sm")}</span><span class="ob"><div class="t">${t(l)} ${v === "wallet" ? `<span class="pill success" style="margin-inline-start:6px">${S.lang === "ar" ? "الأسرع" : "Fastest"}</span>` : ""}</div><div class="s">${t(s)}</div></span></button>`).join("")}
          <div class="card" style="margin-top:12px"><div class="row between"><span class="muted">${t("retAmount")}</span><b class="num" style="font-size:20px;color:var(--aubergine)">${money(amount)}</b></div></div>`;
    const canNext = r.step === 0 ? r.items.size > 0 : r.step === 1 ? r.reason !== null : true;
    return `<div class="screen">${statusbar()}<div class="topbar"><button class="icon-btn ghost" data-go="orderDetail" aria-label="back">${ic("chevS")}</button><h1>${t("retT")}</h1><span class="muted num" dir="ltr">#${o.id}</span></div>
      ${!r.done ? `<div class="chips" style="padding-top:0;gap:6px">${steps.map((s, i) => `<span class="chip ${i <= r.step ? "on" : ""}" style="min-height:28px;padding:4px 10px;font-size:12px">${i + 1}. ${t(s)}</span>`).join("")}</div>` : ""}
      <div class="scroll pad pb-cta">${body}</div>
      <div class="cta-bar">${r.done ? `<button class="btn primary" data-go="orders">${t("ordersT")}</button>` : `<button class="btn primary" data-ret-next ${canNext ? "" : "disabled"}>${r.step === 2 ? t("retSubmit") : t("retNext")}</button>${r.step > 0 ? `<button class="btn ghost" style="min-height:40px" data-ret-back>${S.lang === "ar" ? "رجوع" : "Back"}</button>` : ""}`}</div></div>`;
  };

  /* ---- Wallet ---- */
  R.wallet = () => `<div class="screen">${statusbar()}<div class="topbar"><button class="icon-btn ghost" data-go="account" aria-label="back">${ic("chevS")}</button><h1>${t("walletT")}</h1></div>
    <div class="scroll pad pb-nav">
      <div class="wallet-card">${wave()}<div class="muted" style="color:rgba(249,242,231,.8)">${t("balance")}</div><div class="wbal num">${T.wallet.balance}<small> ${t("egp")}</small></div><div class="row" style="gap:8px;margin-top:14px"><button class="btn sm" style="background:var(--cream);color:var(--aubergine)" data-toast="soon">${ic("plus", "icon sm")} ${t("addMoney")}</button><span class="pill" style="background:rgba(255,255,255,.15);color:#fff">${ic("lock", "icon xs")} ${t("secureBadge")}</span></div></div>
      <div class="card earn-card"><span class="ico" style="background:var(--mandarin-100);color:var(--mandarin-600)">${ic("percent", "icon sm")}</span><div><b>${t("walletPromo")}</b><div class="muted">${S.lang === "ar" ? "الكاش باك بيتضاف تلقائي بعد التوصيل" : "Cashback is added automatically after delivery"}</div></div></div>
      <div class="card"><h3>${t("walletHistory")}</h3>${T.wallet.ledger.map((l) => `<div class="ledger"><span class="li ${l.type}">${ic(l.type === "refund" ? "undo" : l.type === "cashback" ? "percent" : l.type === "pay" ? "cart" : "gift", "icon sm")}</span><div style="flex:1"><div style="font-weight:700;font-size:14px">${esc(S.lang === "ar" ? l.ar : l.en)}</div><div class="muted">${esc(S.lang === "ar" ? l.date : l.dateEn)}</div></div><b class="num" style="color:${l.amount > 0 ? "var(--success)" : l.amount < 0 ? "var(--ink)" : "var(--mandarin-600)"}">${l.amount > 0 ? "+" : ""}${l.amount ? money(l.amount) : `+${l.pts} ${t("ptsPl")}`}</b></div>`).join("")}</div>
    </div>${bottomNav("account")}${toastEl()}</div>`;

  /* ---- Loyalty: Twaa Points + Twaa+ ---- */
  R.loyalty = () => {
    const L = T.loyalty; const tiers = L.tiers; const ti = tiers.findIndex(([k]) => k === L.tier); const next = tiers[ti + 1]; const cur = tiers[ti][1];
    const prog = next ? Math.round(((L.points - cur) / (next[1] - cur)) * 100) : 100;
    return `<div class="screen">${statusbar()}<div class="topbar"><button class="icon-btn ghost" data-go="account" aria-label="back">${ic("chevS")}</button><h1>${t("loyaltyT")}</h1><button class="btn ghost sm" data-toast="soon">${t("history")}</button></div>
      <div class="scroll pad pb-nav">
        <div class="points-card"><div class="row between"><div><div style="opacity:.8;font-size:13px">${t("tier")} · <b>${t("tier" + L.tier[0].toUpperCase() + L.tier.slice(1))}</b></div><div class="wbal num">${L.points}<small> ${t("ptsPl")}</small></div></div><span class="tier-badge ${L.tier}">${ic("crown")}</span></div>
          <div class="progress" style="background:rgba(255,255,255,.2);margin-top:14px"><i style="width:${prog}%;background:var(--mandarin)"></i></div><div class="row between" style="font-size:12px;margin-top:6px;opacity:.9"><span>${t("tier" + tiers[ti][0][0].toUpperCase() + tiers[ti][0].slice(1))}</span>${next ? `<span>${t("toNext", { n: next[1] - L.points, t: t("tier" + next[0][0].toUpperCase() + next[0].slice(1)) })}</span>` : ""}</div><div style="font-size:12px;opacity:.8;margin-top:8px">${t("earnRule")}</div></div>
        <div class="section"><div class="section-head" style="padding:0"><h2>${ic("gift", "icon sm")} ${t("rewardsT")}</h2></div><div class="rewards">${L.rewards.map(([k, cost, i]) => `<div class="reward ${L.points >= cost ? "" : "locked"}"><span class="ico">${ic(i, "icon sm")}</span><b>${t(k)}</b><span class="muted num">${cost} ${t("ptsPl")}</span><button class="btn sm ${L.points >= cost ? "dark" : "soft"}" data-redeem="${k}" ${L.points >= cost ? "" : "disabled"}>${t("redeem")}</button></div>`).join("")}</div></div>
        <div class="card"><h3>${ic("bolt", "icon sm")} ${t("challengesT")}</h3>${L.challenges.map(([k, r, done, total]) => `<div class="chal"><div style="flex:1"><div class="row between"><b>${t(k)}</b><span class="pill accent">${t(r)}</span></div><div class="progress" style="margin-top:8px"><i style="width:${(done / total) * 100}%"></i></div><div class="muted num" style="margin-top:4px">${done}/${total}</div></div></div>`).join("")}</div>
        <div class="card refer-card"><div class="row"><span class="ico" style="background:var(--aubergine-100);color:var(--aubergine)">${ic("users", "icon sm")}</span><div style="flex:1"><b>${t("referT")}</b><div class="muted">${t("referS")}</div></div></div><div class="row" style="gap:8px;margin-top:12px"><div class="input" style="flex:1;height:46px;justify-content:center;font-family:var(--font-display);font-weight:800;letter-spacing:.12em" dir="ltr">${L.referral}</div><button class="btn dark sm" style="min-height:46px" data-toast="share">${ic("share", "icon sm")} ${t("share")}</button></div></div>
        <div class="plus-card">${wave()}<div class="row between"><div><div style="font-family:var(--font-display);font-weight:800;font-size:24px">${t("plusT")} <span class="pill" style="background:var(--mandarin);color:#fff;vertical-align:middle">${t("plusSoon")}</span></div><div style="opacity:.9;font-size:13px;margin-top:4px">${t("plusS")}</div><div style="font-family:var(--font-display);font-weight:800;margin-top:8px">${t("plusPrice")}</div></div>${ic("crown", "icon")}</div><button class="btn sm" style="background:var(--cream);color:var(--aubergine);margin-top:12px" data-toast="soon">${t("plusCta")}</button></div>
      </div>${bottomNav("account")}${toastEl()}</div>`;
  };

  /* ---- Support ---- */
  R.support = () => `<div class="screen">${statusbar()}<div class="topbar"><button class="icon-btn ghost" data-go="account" aria-label="back">${ic("chevS")}</button><h1>${t("supportT")}</h1></div>
    <div class="scroll pad pb-nav">
      ${activeOrder() ? `<div class="card"><div class="row between"><div><div class="muted">${t("activeOrder")}</div><b class="num" dir="ltr">#${activeOrder().id}</b></div><button class="btn soft sm" data-go="tracking">${t("trackT")}</button></div></div>` : ""}
      <div class="row" style="gap:8px">${[["chat", "chatNow", "help", "var(--aubergine)", "var(--cream)"], ["phone", "callUs", "call", "var(--surface)", "var(--aubergine)"], ["chat", "whatsapp", "help", "#DFF3E6", "#1E7C4A"]].map(([i, l, tt, bg, fg]) => `<button class="support-tile" style="background:${bg};color:${fg}" data-toast="${tt}">${ic(i)}<span>${t(l)}</span></button>`).join("")}</div>
      <div class="muted" style="margin:16px 0 8px;font-weight:700">${t("faqT")}</div>
      <div class="card" style="padding:4px 16px">${t("faq").map(([q, an]) => `<details class="faq"><summary>${esc(q)}${ic("chevD", "icon sm")}</summary><p>${esc(an)}</p></details>`).join("")}</div>
      <div class="card" style="text-align:center"><div class="muted">${S.lang === "ar" ? "متاحين من 8 ص لـ 12 م · الرد خلال دقيقة" : "Available 8 am to midnight · reply within a minute"}</div></div>
    </div>${bottomNav("account")}${toastEl()}</div>`;

  /* ---- Notifications ---- */
  R.notifications = () => `<div class="screen">${statusbar()}<div class="topbar"><button class="icon-btn ghost" data-go="home" aria-label="back">${ic("chevS")}</button><h1>${t("notifT")}</h1></div>
    <div class="scroll pad pb-nav"><div class="card" style="padding:4px 16px">${t("notifs").map(([k, ttl, s, tm], i) => `<button class="notif ${i === 0 ? "unread" : ""}" data-go="${k === "out" ? "tracking" : k === "refund" ? "wallet" : k === "pts" ? "loyalty" : "deals"}"><span class="ico ${k}">${ic(k === "out" ? "bike" : k === "refund" ? "undo" : k === "pts" ? "coins" : k === "promo" ? "truck" : "percent", "icon sm")}</span><div style="flex:1"><div class="row between"><b>${esc(ttl)}</b><span class="muted" style="font-size:11px">${esc(tm)}</span></div><div class="muted">${esc(s)}</div></div></button>`).join("")}</div></div>${bottomNav("home")}${toastEl()}</div>`;

  /* PDP renders as a sheet over the current base screen */
  function pdpSheet() {
    const p = prod(S.pdp); if (!p) return ""; const c = cat(p.cat); const d = pct(p);
    const rel = (T.related[p.id] || T.products.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4).map((x) => x.id)).map(prod);
    return `<div class="sheet-scrim" data-close-pdp></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(name(p))}"><div class="grab"></div>
      <button class="icon-btn ghost" data-close-pdp aria-label="close" style="position:absolute;top:14px;inset-inline-start:14px;z-index:2">${ic("x")}</button>
      <button class="icon-btn ghost ${S.favs.has(p.id) ? "on" : ""}" data-fav="${p.id}" aria-label="${t("myFavs")}" style="position:absolute;top:14px;inset-inline-end:14px;z-index:2;color:${S.favs.has(p.id) ? "var(--mandarin)" : ""}"><svg class="icon" viewBox="0 0 24 24" style="${S.favs.has(p.id) ? "fill:var(--mandarin)" : ""}">${I.heart}</svg></button>
      <div class="scroll" style="padding-bottom:110px"><div class="pdp-img" style="background:${c.bg};color:${c.fg}">${ic(c.icon)}${d ? `<span class="discount num">${d}% ${t("off")}</span>` : ""}</div>
        <div class="pdp-thumbs">${[0, 1, 2].map((i) => `<span class="${i === 0 ? "on" : ""}" style="background:${c.bg};color:${c.fg}">${ic(c.icon)}</span>`).join("")}</div>
        <div class="pad" style="margin-top:16px"><div class="muted">${esc(p.brand || catName(c))}</div><h2 class="pdp-title">${esc(name(p))}</h2><div class="muted" style="margin-top:2px">${esc(unit(p))}</div>
          <div class="row" style="margin-top:12px;gap:10px"><span class="price num" style="font-size:28px">${p.price}<small>${t("egp")}</small></span>${p.oldPrice ? `<span class="price-old num" style="font-size:14px">${p.oldPrice} ${t("egp")}</span><span class="pill accent num">${t("off")} ${d}%</span>` : ""}<span style="margin-inline-start:auto" class="pill ${p.stock === 0 ? "danger" : p.stock <= 5 ? "warn" : "success"}">${p.stock === 0 ? t("outStock") : p.stock <= 5 ? t("lowStock", { n: p.stock }) : t("inStock")}</span></div>
          <div style="margin-top:12px">${trustRow(true)}</div>
          <div class="kv" style="margin-top:12px"><div><div class="k">${t("size")}</div><div class="v">${esc(unit(p))}</div></div><div><div class="k">${t("origin")}</div><div class="v">${S.lang === "ar" ? "مصر" : "Egypt"}</div></div><div><div class="k">${t("storage")}</div><div class="v">${p.cat === "dairy" || p.cat === "frozen" ? (S.lang === "ar" ? "يحفظ مبرداً" : "Keep refrigerated") : S.lang === "ar" ? "مكان جاف وبارد" : "Cool dry place"}</div></div><div><div class="k">${t("maxQty", { n: 10 })}</div><div class="v">${S.lang === "ar" ? "لكل طلب" : "per order"}</div></div></div>
          <div class="card" style="margin-top:12px"><h3>${t("desc")}</h3><p class="muted" style="line-height:1.8">${p.descAr ? esc(S.lang === "ar" ? p.descAr : p.descEn) : S.lang === "ar" ? "منتج أصلي بضمان الجودة والصلاحية. يتم اختياره وتغليفه بعناية من متجر توّا القريب منك ويوصلك في أسرع وقت." : "Genuine product with quality and expiry guaranteed. Carefully picked and packed at your nearest Twaa store and delivered fast."}</p></div>
          <div class="card"><h3>${t("ingredients")} · ${t("nutrition")}</h3><p class="muted" style="line-height:1.8">${S.lang === "ar" ? "راجع العبوة للمكونات الكاملة والقيمة الغذائية لكل 100 جم." : "See pack for full ingredients and nutrition per 100 g."}</p></div>
        </div>
        <div class="section">${sectionHead(t("alsoBought"), null, false)}${carousel(rel)}</div></div>
      <div class="cta-bar" style="flex-direction:row;align-items:center;gap:12px"><div style="flex:none">${quickAdd(p, true)}</div>${S.cart[p.id] ? `<button class="btn dark" data-go="cart" style="flex:1"><span>${t("viewCart")}</span><span class="split num">${money(subtotal())}</span></button>` : `<button class="btn primary" data-add="${p.id}" style="flex:1" ${p.stock === 0 ? "disabled" : ""}>${ic("cart", "icon sm")} ${t("add")} · <span class="num">${money(p.price)}</span></button>`}</div></div>`;
  }

  /* ---------------- Render & events ---------------- */
  const host = $("#screen-host");
  let scrollMemo = {};
  function render() {
    const prevScroll = host.querySelector(".scroll"); if (prevScroll) scrollMemo[S.screen] = prevScroll.scrollTop;
    const base = S.screen === "pdp" ? (S.tab || "home") : S.screen;
    host.innerHTML = (R[base] || R.home)() + (S.pdp ? pdpSheet() : "");
    if (host.firstElementChild) host.firstElementChild.dataset.screen = base;
    const vt = host.querySelector(".vtile.on"); if (vt) requestAnimationFrame(() => vt.scrollIntoView({ block: "nearest", inline: "center" }));
    document.documentElement.lang = S.lang; document.documentElement.dir = T.i18n[S.lang].dir;
    const sc = host.querySelector(".scroll"); if (sc && scrollMemo[S.screen] != null && !S.pdp) sc.scrollTop = scrollMemo[S.screen];
    document.querySelectorAll("[data-wb-screen]").forEach((b) => b.classList.toggle("active", b.dataset.wbScreen === (S.pdp ? "pdp" : S.screen)));
    document.querySelectorAll("[data-wb-lang]").forEach((b) => b.classList.toggle("active", b.dataset.wbLang === S.lang));
    const q = host.querySelector("[data-q]"); if (q && S.screen === "search") { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    if (S.screen === "location" && !S.pdp) { LM.leaflet = null; LM.fallback = null; requestAnimationFrame(mountLiveMap); }
    const ht = host.querySelector("[data-hero]"); if (ht) ht.addEventListener("scroll", () => { const i = Math.round(ht.scrollLeft / (ht.firstElementChild.offsetWidth + 12)); const idx = Math.abs(i); if (idx !== S.heroIdx) { S.heroIdx = idx; host.querySelectorAll(".dots span").forEach((d, k) => d.classList.toggle("on", k === idx)); } }, { passive: true });
  }
  function go(screen) { S.pdp = null; S.screen = screen; if (["home", "categories", "search", "orders", "account", "deals", "food", "pharmacy"].includes(screen)) S.tab = screen; render(); }
  let toastTimer;
  function toast(msg) { S.toast = msg; render(); clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = null; render(); }, 1800); }
  function patchProduct(id) { /* re-render only affected product cards + bars (keeps scroll position) */
    host.querySelectorAll(`[data-pid="${id}"]`).forEach((el) => { const p = prod(id); const n = h(el.classList.contains("meal") ? mealCard(p, el.classList.contains("wide")) : el.classList.contains("fcard") ? foodImgCard(p) : productCard(p)); el.replaceWith(n); });
    const bar = host.querySelector(".cartbar"); const nb = cartBar();
    if (bar && nb) bar.outerHTML = nb; else if (bar && !nb) bar.remove(); else if (!bar && nb) { const nav = host.querySelector(".bottomnav"); if (nav) nav.insertAdjacentHTML("beforebegin", nb); }
    if (S.pdp || S.screen === "cart" || S.screen === "checkout") render();
  }
  const TOASTS = { share: () => (S.lang === "ar" ? "تم نسخ الرابط" : "Link copied"), photo: () => (S.lang === "ar" ? "افتح الكاميرا (في التطبيق الحقيقي)" : "Opens the camera in the real app"), soon: () => (S.lang === "ar" ? "رفع الروشتة هيتوفر قريباً" : "Prescription upload is coming soon"), notif: () => (S.lang === "ar" ? "مفيش إشعارات جديدة" : "No new notifications"), gps: () => (S.lang === "ar" ? "تم تحديد موقعك" : "Location detected"), notify: () => (S.lang === "ar" ? "هنبلّغك أول ما نوصل 🧡" : "We'll let you know when we arrive 🧡"), help: () => (S.lang === "ar" ? "فريق الدعم هيرد عليك خلال دقيقة" : "Support will reply within a minute"), call: () => (S.lang === "ar" ? "جاري الاتصال بالمندوب…" : "Calling the rider…"), thanks: () => (S.lang === "ar" ? "شكراً لتقييمك!" : "Thanks for your feedback!") };

  host.addEventListener("click", (e) => {
    const b = (sel) => e.target.closest(sel);
    let el;
    if ((el = b("[data-add]"))) { const id = +el.dataset.add; S.cart[id] = (S.cart[id] || 0) + 1; patchProduct(id); return; }
    if ((el = b("[data-inc]"))) { const id = +el.dataset.inc; S.cart[id] = Math.min(10, (S.cart[id] || 0) + 1); patchProduct(id); return; }
    if ((el = b("[data-dec]"))) { const id = +el.dataset.dec; S.cart[id] = (S.cart[id] || 0) - 1; if (S.cart[id] <= 0) delete S.cart[id]; patchProduct(id); return; }
    if ((el = b("[data-fav]"))) { const id = +el.dataset.fav; S.favs.has(id) ? S.favs.delete(id) : S.favs.add(id); if (S.favs.has(id)) toast(t("toastFav")); else render(); return; }
    if ((el = b("[data-open]"))) { S.pdp = +el.dataset.open; render(); return; }
    if ((el = b("[data-close-pdp]"))) { S.pdp = null; render(); return; }
    if ((el = b("[data-hometab]"))) { S.homeTab = el.dataset.hometab; if (S.homeTab === "deals") return go("deals"); if (S.homeTab === "food") return go("food"); if (S.homeTab !== "all") { S.cat = S.homeTab; S.subcat = 0; return go("plp"); } render(); return; }
    if ((el = b("[data-cat-switch]"))) { S.cat = el.dataset.catSwitch; S.subcat = 0; render(); return; }
    if ((el = b("[data-subcat]"))) { S.subcat = +el.dataset.subcat; render(); return; }
    if ((el = b("[data-foodsub]")) && !el.dataset.go) { S.foodSub = +el.dataset.foodsub; render(); return; }
    if ((el = b("[data-psub]")) && !el.dataset.go) { S.psub = +el.dataset.psub; render(); return; }
    if ((el = b("[data-seg]"))) { const [k, v] = el.dataset.seg.split(":"); S.seg[k] = +v; render(); return; }
    if ((el = b("[data-sort]"))) { S.sort = el.dataset.sort; render(); return; }
    if ((el = b("[data-q-set]"))) { S.query = el.dataset.qSet; render(); return; }
    if ((el = b("[data-clear-q]"))) { S.query = ""; render(); return; }
    if ((el = b("[data-promo-apply]"))) { const v = (host.querySelector("[data-promo]")?.value || "").trim().toUpperCase(); if (["TWAA30", "FREE"].includes(v)) { S.promo = v; toast(t("promoOk", { c: v })); } else { toast(S.lang === "ar" ? "الكود غير صحيح أو منتهي" : "Invalid or expired code"); } return; }
    if ((el = b("[data-promo-clear]"))) { S.promo = null; render(); return; }
    if ((el = b("[data-clear-cart]"))) { S.cart = {}; render(); return; }
    if ((el = b("[data-sub]"))) { S.sub = el.dataset.sub; render(); return; }
    if ((el = b("[data-slot]"))) { S.slot = el.dataset.slot; render(); return; }
    if ((el = b("[data-pay]"))) { S.pay = el.dataset.pay; render(); return; }
    if ((el = b("[data-place]"))) { el.disabled = true; el.innerHTML = `<span class="num">…</span>`; setTimeout(() => { S.orderId = "TW-" + (24818 + Math.floor(Math.random() * 90)); S.trackStep = 0; S.deliveryCode = String(1000 + Math.floor(Math.random() * 9000)); go("confirmed"); }, 700); return; }
    if ((el = b("[data-track-next]"))) { S.trackStep = Math.min(3, S.trackStep + 1); render(); return; }
    if ((el = b("[data-reorder]"))) { const o = T.orders.find((x) => x.id === el.dataset.reorder); o.items.forEach((id) => { if (prod(id).stock > 0) S.cart[id] = (S.cart[id] || 0) + 1; }); const oos = o.items.filter((id) => prod(id).stock === 0).length; go("cart"); toast(oos ? (S.lang === "ar" ? `${oos} منتج غير متوفر حالياً` : `${oos} item(s) currently unavailable`) : t("toastAdded")); return; }
    if ((el = b("[data-onb-next]"))) { if (S.onb >= 2) { S.onb = 0; go("location"); } else { S.onb++; render(); } return; }
    if ((el = b("[data-usewallet]"))) { S.useWallet = !S.useWallet; render(); return; }
    if ((el = b("[data-change]"))) { S.change = el.dataset.change; render(); return; }
    if ((el = b("[data-card]"))) { S.card = +el.dataset.card; render(); return; }
    if ((el = b("[data-handover]"))) { S.handover = el.dataset.handover; toast(S.lang === "ar" ? "تم إبلاغ المندوب" : "Rider notified"); return; }
    if ((el = b("[data-cancel-start]"))) { S.cancel = "pick"; render(); return; }
    if ((el = b("[data-cancel-reason]"))) { S.cancel = +el.dataset.cancelReason; render(); return; }
    if ((el = b("[data-cancel-confirm]"))) { S.cancel = "done"; render(); return; }
    if ((el = b("[data-order]"))) { S.viewOrder = el.dataset.order; go("orderDetail"); return; }
    if ((el = b("[data-ret-start]"))) { S.viewOrder = el.dataset.retStart; S.ret = { step: 0, items: new Set(), reason: null, method: "wallet", done: false }; go("returns"); return; }
    if ((el = b("[data-ret-item]"))) { const id = +el.dataset.retItem; S.ret.items.has(id) ? S.ret.items.delete(id) : S.ret.items.add(id); render(); return; }
    if ((el = b("[data-ret-reason]"))) { S.ret.reason = +el.dataset.retReason; render(); return; }
    if ((el = b("[data-ret-method]"))) { S.ret.method = el.dataset.retMethod; render(); return; }
    if ((el = b("[data-ret-next]"))) { if (S.ret.step >= 2) { S.ret.done = true; if (S.ret.method === "wallet") { const amt = [...S.ret.items].reduce((s, id) => s + prod(id).price, 0); T.wallet.balance += amt; T.wallet.ledger.unshift({ type: "refund", ar: `استرداد · #${S.viewOrder}`, en: `Refund · #${S.viewOrder}`, amount: amt, date: "دلوقتي", dateEn: "Now" }); } } else S.ret.step++; render(); return; }
    if ((el = b("[data-ret-back]"))) { S.ret.step = Math.max(0, S.ret.step - 1); render(); return; }
    if ((el = b("[data-redeem]"))) { toast(S.lang === "ar" ? "تم استبدال النقط.. الكوبون في كوبوناتك" : "Points redeemed, coupon added"); return; }
    if ((el = b("[data-star]"))) { S.stars = +el.dataset.star; render(); return; }
    if ((el = b("[data-fb]"))) { const i = +el.dataset.fb; S.fb.has(i) ? S.fb.delete(i) : S.fb.add(i); render(); return; }
    if ((el = b("[data-otp-fill]"))) { S.otp = 0; const tick = () => { S.otp++; render(); if (S.otp < 6) setTimeout(tick, 120); }; tick(); return; }
    if ((el = b("[data-verify]"))) { go(cartCount() ? "checkout" : "home"); return; }
    if ((el = b("[data-confirm-loc]"))) { if (S.loc.zone && S.loc.zone.ok) { S.zone = { area: S.loc.zone, label: "homeLbl" }; go("home"); } return; }
    if ((el = b("[data-gps]"))) { locateMe(); return; }
    if ((el = b("[data-lm-zoom]"))) { LM.zoom = Math.min(17, Math.max(11, LM.zoom + (+el.dataset.lmZoom))); if (LM.mode === "leaflet" && LM.leaflet) LM.leaflet.setZoom(LM.zoom); else if (LM.fallback) LM.fallback.draw(); return; }
    if ((el = b("[data-lang-toggle]"))) { S.lang = S.lang === "ar" ? "en" : "ar"; render(); return; }
    if ((el = b("[data-toast]"))) { toast(TOASTS[el.dataset.toast]()); return; }
    if ((el = b("[data-go]"))) { if (el.dataset.cat) { S.cat = el.dataset.cat; S.subcat = 0; } if (el.dataset.foodsub != null) S.foodSub = +el.dataset.foodsub; if (el.dataset.psub != null) S.psub = +el.dataset.psub; if (el.dataset.go === "checkout" && !S.loggedIn) { S.loggedIn = true; return go("login"); } go(el.dataset.go); return; }
  });
  host.addEventListener("input", (e) => {
    if (e.target.matches("[data-q]")) { S.query = e.target.value; const sc = host.querySelector(".scroll"); const html = R.search(); const tmp = h(html); host.querySelector(".screen").querySelector(".scroll").innerHTML = tmp.querySelector(".scroll").innerHTML; const cb = host.querySelector(".cartbar"); return; }
  });
  host.addEventListener("change", (e) => {
    if (e.target.matches("[data-zone-select]")) { const z = T.zones.find((x) => x.id === e.target.value); if (z) { resolveZone(z.lat, z.lng); setMapView(z.lat, z.lng); patchLocationCard(); } }
    if (e.target.matches("[data-zone-search]")) { const v = e.target.value.trim().toLowerCase(); const z = T.zones.find((x) => x.ar === v || x.en.toLowerCase() === v || x.ar.includes(v) || x.en.toLowerCase().includes(v)); if (z) { resolveZone(z.lat, z.lng); setMapView(z.lat, z.lng); patchLocationCard(); } }
  });

  /* ---------------- Workbench (sidebar) ---------------- */
  const side = $("#wb-screens");
  if (side) {
    side.innerHTML = SCREENS.map(([id, en, ar], i) => `<button data-wb-screen="${id}"><span>${String(i + 1).padStart(2, "0")} · ${en}</span><span class="k">${ar}</span></button>`).join("");
    side.addEventListener("click", (e) => { const b = e.target.closest("[data-wb-screen]"); if (!b) return; const id = b.dataset.wbScreen; if (id === "pdp") { S.screen = S.tab || "home"; S.pdp = 1; render(); } else go(id); });
    document.querySelectorAll("[data-wb-lang]").forEach((b) => b.addEventListener("click", () => { S.lang = b.dataset.wbLang; render(); }));
    $("#wb-seed")?.addEventListener("click", () => { S.cart = { 1: 2, 5: 1, 24: 1, 9: 1 }; S.loggedIn = true; go("cart"); });
    /* preview frame modes: fill window (responsive web), tablet, phone */
    const phone = $("#phone"), wb = $("#workbench");
    const setFrame = (m) => { phone.className = `phone frame-${m}`; wb.classList.toggle("fill", m === "fill"); document.querySelectorAll("[data-wb-frame]").forEach((b) => b.classList.toggle("active", b.dataset.wbFrame === m)); try { localStorage.setItem("twaa.frame", m); } catch (e) {} if (S.screen === "location") render(); };
    document.querySelectorAll("[data-wb-frame]").forEach((b) => b.addEventListener("click", () => setFrame(b.dataset.wbFrame)));
    let saved = "fill"; try { saved = localStorage.getItem("twaa.frame") || "fill"; } catch (e) {}
    setFrame(saved);
    /* small viewports: sidebar as a drawer */
    const sideEl = $(".wb-side"); let scrim = null;
    const openSide = (on) => { sideEl.classList.toggle("open", on); if (on && !scrim) { scrim = h('<div class="wb-scrim"></div>'); scrim.addEventListener("click", () => openSide(false)); document.body.appendChild(scrim); } if (!on && scrim) { scrim.remove(); scrim = null; } };
    $("#wb-fab")?.addEventListener("click", () => openSide(true)); $("#wb-close")?.addEventListener("click", () => openSide(false));
    side.addEventListener("click", () => { if (window.innerWidth <= 860) openSide(false); });
  }

  resolveZone(S.loc.lat, S.loc.lng);
  render();
  /* auto-advance splash */
  setTimeout(() => { if (S.screen === "splash") go("onboarding"); }, 2200);
  window.TWAA_APP = { S, go, render };
})();
