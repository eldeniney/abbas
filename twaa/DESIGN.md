# توّا — Twaa · Customer App Design Guideline

**Version:** 1.0 · **Based on:** BRD v1.1 · **Reference pattern:** quick-commerce apps such as noon Minutes
**Files:** `index.html` (interactive prototype) · `design-system.html` (foundations & components) · `styles.css` · `data.js` · `app.js`

Open `index.html` in a browser (no build step). The left panel jumps between screens and toggles Arabic/English; the phone on the right is fully interactive (quick add, cart, promo codes, checkout, tracking).

---

## 1. Design principles

1. **Arabic first, RTL native.** Egyptian colloquial copy, logical CSS properties, English is a `dir` flip — never a separate layout.
2. **Speed is the product.** ETA is visible on every browsing screen. Quick add never leaves the list. A returning customer can reorder in under a minute (Orders → اطلب تاني → checkout).
3. **One primary action per screen**, always Mandarin, always in the sticky bottom bar with the total beside it.
4. **Local and warm.** Cream backgrounds, rounded corners, the brand wave; local products get their own home section and category.
5. **Honest availability.** Stock, low-stock, out-of-stock, min-basket and serviceability are stated in words, never colour alone.
6. **Built for cheap Android.** Reserved image sizes, no heavy motion, ≥ 44px targets, ≤ 16px system-like type.

## 2. Brand application

| Element | Spec |
|---|---|
| Primary | Aubergine `#3A1F3D` — app bar, prices, active nav, dark buttons |
| Background | Cream `#F9F2E7` — page ground; white cards float on it |
| Accent | Mandarin `#F9732F` — primary CTA, discount badge, ETA chip, active indicator, favourite |
| Display type | Baloo Bhaijaan 2 (rounded, echoes the logo): headings, prices, buttons |
| Body type | Cairo 400–800 |
| Motif | Cream wave ribbon at ~15–22 % opacity on hero banners, splash, deal banner |
| Logo | Wordmark with Mandarin shadda; app icon = Aubergine rounded square, cream wordmark. Prototype renders the mark in the display font — swap in the official SVG before production. |

## 3. Information architecture

```
Splash → Location & serviceability → Home
Bottom nav: الرئيسية · الأقسام · البحث · طلباتي · حسابي   (cart bar floats above nav when cart > 0)
Home ─ hero banners ─ category tabs ─ category grid ─ merchandising sections ─ deal banner
Categories → Category listing (rail + sub-chips + grid) → Product sheet
Search → recent / trending / popular → results grid → Product sheet
Cart → (Login via OTP if guest) → Checkout → Tracking → Rating
Orders → Tracking / Reorder / Rate
Account → addresses, wallet, favourites, coupons, notifications, support, language, privacy, terms, logout
```

## 4. Screen-by-screen specification

### 4.1 Splash
Aubergine full-bleed, wordmark, tagline **من هنا لك.. توّا**, wave motif. Auto-advances after ~2 s to Location (first run) or Home (returning).

### 4.2 Location & serviceability (BRD §7–8)
- Map with draggable pin, "استخدم موقعي الحالي", area search, City → Village selects, optional landmark.
- **Serviceable:** green pill "بنوصّل عندك" + ETA chip + delivery fee + minimum order. CTA: أكّد الموقع.
- **Not serviceable:** Mandarin-tinted card **"لسه موصلناش عندك، بس جايين توّا."**, phone field, CTA "بلّغني أول ما توصلوا" (demand capture). Confirm is disabled.
- Zone data (ETA, fee, minimum) comes from the zone configuration, not hard-coded (see `TWAA.zones`).

### 4.3 Login / OTP (BRD §10)
Mobile number with +20 prefix, `inputmode="tel"`. OTP: 6 boxes (LTR), countdown, resend, terms acknowledgement. Guest browsing is allowed; login is requested at checkout.

### 4.4 Home (BRD §11)
Order of blocks, top to bottom:
1. **App bar** (Aubergine): address label + value ▾ · ETA chip (Mandarin, bolt icon) · notifications with badge. Search field **"بتدور على إيه؟"**.
2. **Hero banners** — swipeable, 150px, with promo code pill (first-order discount, free delivery threshold, local products). Dots indicator.
3. **Category tabs** — الكل · عروض (Mandarin-tinted) · سوبر ماركت · مشروبات · سناكس · العناية · الأطفال · البيت · إلكترونيات. Tapping a tab opens the category listing; عروض opens Deal Zone.
4. **Category grid** — 4 × 2 icon tiles ("اطلب حسب القسم").
5. **Merchandising carousels** (admin-configurable): عروض توّا (with countdown) → الأكثر طلباً → deal banner → أقل من 50 جنيه → منتجات محلية → اشترِ تاني → وصل جديد. مخصوص ليك is added once personalisation data exists.
6. Sticky cart bar + bottom nav.

### 4.5 Categories (BRD §13)
3-column grid of all categories with tinted tiles. Category → listing.

### 4.6 Category listing (BRD §15)
Sort chips (المقترح, الأكثر طلباً, الأقل سعراً, الأعلى سعراً, أكبر خصم, الأحدث) · start-side rail of categories · sub-category chips · 2-column product grid with result count. Filters (brand, price, discount, availability, size) open in a sheet (Phase 1.1).

### 4.7 Search (BRD §14)
Auto-focused field, clear button. Empty state: recent searches, trending chips, popular carousel. Results grid updates on each keystroke. Zero results: **مفيش نتايج لـ "…"** + link to categories (zero-result terms are logged for merchandising).

### 4.8 Product detail sheet (BRD §16)
Bottom sheet over the current screen: image gallery with thumbnails, discount badge, favourite, brand, name, size, price/old price/percent, stock pill, attribute grid (size, origin, storage, max qty), description, ingredients/nutrition, "بيتشتروا مع بعض". Sticky footer: stepper + **أضف · price** (turns into **شوف السلة · subtotal** once in cart).

### 4.9 Quick add (BRD §17)
`أضف` → in place `− 1 +`. At 1 the minus becomes a trash icon. Max quantity disables +. Available on home, listing, search, deals, PDP, cart and related carousels. State is patched without re-rendering the screen so scroll position is preserved.

### 4.10 Cart (BRD §18–19, §32)
Free-delivery progress: **"ضيف {n} جنيه وخد التوصيل مجاناً."** (threshold configurable, 150 EGP in demo). Line items with steppers, "ممكن تحتاج معاهم" carousel, promo code (TWAA30 = 30 % up to 60; FREE = free delivery), substitution preference (متبدلش / بدّل بمنتج مشابه / كلمني الأول), price summary (subtotal, discount, delivery, service fee, total). Minimum-basket warning disables checkout. Empty state with CTA.

### 4.11 Checkout (BRD §20–22)
Step chips: العنوان → التوصيل → الدفع → الملخص in one scroll. Address card with change link · delivery time (توصيل توّا with ETA / حدد وقت with slots) · payment (كاش عند الاستلام, بطاقة بنكية, محفظة إلكترونية, محفظة توّا with balance) · rider notes · summary with item thumbnails and quantities. **أكّد الطلب** locks on tap (duplicate-order protection, BRD §87.11).

### 4.12 Order tracking (BRD §28–29)
Map with rider marker and route once dispatched. Order number, **هيوصلك خلال X دقيقة**, ETA chip. Timeline **اتأكد → بيتجهز → خرج للتوصيل → وصلك** with timestamps. Rider card (name, rating, plate) with call and chat. Items list with payment method. Help card; cancel is visible only before picking (BRD §31). "قيّم الطلب" appears on delivery.

### 4.13 My orders (BRD §27)
Cards with order id (LTR), date, item count, status pill (في الطريق / تم التوصيل / ملغي), item thumbnails, total; actions: تتبع الطلب / اطلب تاني / قيّم الطلب. Reorder re-validates stock and reports unavailable items in a toast.

### 4.14 Rating (BRD §35)
5 stars, feedback chips (وصل بسرعة · التعامل ممتاز · الطلب كامل · الطلب اتأخر · منتج ناقص · منتج غلط · جودة المنتج مش كويسة), rider rating, free-text notes. Submit disabled until a star is chosen.

### 4.15 Account (BRD §79)
Aubergine header with name, phone, quick stats (orders, wallet, favourites). Menu: عناويني · محفظة توّا · المفضلة · كوبونات وعروض · الإشعارات · خدمة العملاء · اللغة (toggles AR/EN) · الخصوصية · الشروط والأحكام · تسجيل الخروج (separated, red).

### 4.16 Deal Zone (BRD §25)
Mandarin countdown banner, category chips, grid sorted by biggest discount.

## 5. Component library
See `design-system.html`: colour tokens, type scale, spacing/radius/elevation, buttons, quick add, chips & pills, ETA chip, product card anatomy, category tile palette, sticky cart bar, bottom nav, timeline, option rows, inputs/OTP, toast, empty states.

## 6. Copy deck (Arabic, key strings)
Search placeholder **بتدور على إيه؟** · Deliver-to **التوصيل إلى** · ETA **توصيل في 30 دقيقة** · Add **أضف** · View cart **شوف السلة** · Checkout **إتمام الطلب** · Place order **أكّد الطلب** · Upsell **ضيف 30 جنيه وخد التوصيل مجاناً.** · Not serviceable **لسه موصلناش عندك، بس جايين توّا.** · Error **حصلت مشكلة بسيطة. جرّب تاني.** · Timeline **اتأكد → بيتجهز → خرج للتوصيل → وصلك**. Full AR/EN dictionary: `TWAA.i18n` in `data.js`.

## 7. Analytics hooks (BRD §52)
Every interactive element carries a `data-*` attribute that maps 1:1 to an event: `data-add` → add_to_cart, `data-dec` → remove_from_cart, `data-open` → product_view, `data-fav` → favorite, `data-q` → search, `data-go="checkout"` → checkout_started, `data-promo-apply` → promo_applied, `data-place` → order_placed, `data-reorder` → reordered, `data-toast="help"` → support_opened.

## 8. Handoff notes for engineering
- Tokens live in `:root` of `styles.css`; port them to the mobile design tokens (Flutter/React Native theme) unchanged.
- All merchandising sections, banners, tabs, category order and zone rules must be served by the admin CMS (BRD §51) — the prototype hard-codes them in `data.js` only for demonstration.
- Product images: WebP, square, on the category tint; keep the tinted placeholder for loading/no-image states.
- Replace the font-rendered wordmark with the official SVG logo and app icon.
- Out of scope in this prototype: filters sheet, scheduled-slot picker detail, wallet ledger, notifications centre, address form, support chat — all follow the same tokens and components.
