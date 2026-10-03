# TWAA — CLAUDE DESIGN MASTER PROMPT
## Complete Business Ecosystem, Applications, Control Center & Commercial Operating System
### Based on the Twaa Operating Process Blueprint

> **Purpose:** Use this prompt in Claude Design / Claude Code to create a complete, high-fidelity, clickable demo of the entire Twaa business ecosystem.  
> This is **not** only a UI exercise. It must demonstrate how the business operates, grows, controls cost, protects cash, serves customers, manages traders and riders, and gives the founders complete visibility and control.

---

# 1. YOUR ROLE

Act simultaneously as:

- Senior product strategist
- Marketplace / quick-commerce business architect
- Business development director
- Commercial & sales strategist
- Growth marketing strategist
- Customer experience architect
- Merchant experience architect
- Last-mile logistics architect
- Rider operations specialist
- Quick-commerce category manager
- Retail merchandising specialist
- Unit economics and profitability analyst
- Fraud and loss-prevention specialist
- Financial controls architect
- Inventory and fulfillment specialist
- CRM and loyalty strategist
- UX/UI lead
- Arabic-first product designer
- Data architect
- Operations Control Tower designer
- Founder / executive dashboard designer

Think like a team building a local version of the operating sophistication behind **Noon / Noon Minutes / nownow**, but designed specifically for Twaa's local Egyptian operating reality.

Do not blindly copy Noon visually.

Borrow only the useful product and operating principles:
- location-first commerce,
- very easy discovery,
- strong catalogue taxonomy,
- broad daily-needs assortment,
- fast reorder,
- personalized merchandising,
- multiple merchant/supply sources,
- clear delivery promise,
- controlled fulfillment,
- operations visibility,
- financial reconciliation,
- merchant/rider performance management,
- and extreme convenience.

---

# 2. SOURCE OF TRUTH

The attached **Twaa Operating Process Blueprint** is the source of truth for the operating logic.

The prototype MUST preserve its core architecture:

1. **Twaa-owned inventory / Hub**
2. **Marketplace merchant fulfillment**
3. **Delivery-as-a-Service for merchants**

All three models use:
- one Order Management System,
- one delivery orchestration layer,
- one financial control framework,
- one exception framework,
- and one control center.

Important architectural rule:

> **Customer Order ≠ Fulfillment Order**

A single customer order may contain items fulfilled by:
- Twaa Hub,
- grocery trader,
- pharmacy,
- restaurant,
- bakery,
- butcher,
- or another merchant.

Internally these become separate fulfillment orders, but the customer should still experience **one clear order journey**.

Also preserve:
- operational status separate from financial status,
- inventory reservation,
- substitutions,
- payment idempotency,
- proof of delivery,
- rider cash exposure,
- merchant settlement,
- rider settlement,
- refunds,
- returns,
- exception ownership,
- SLA timers,
- full audit trail,
- support cases,
- and final financial closure.

Do NOT simplify the business by deleting these mechanisms.

---

# 3. PRIMARY BUSINESS OBJECTIVE

Create an ecosystem that is:

### Easy for the 3 external actors
1. **Customer**
2. **Trader / Merchant**
3. **Rider**

### Powerful for Twaa internally
4. **Twaa Admin / Operations / Finance / Commercial Control Center**

External users should see only what is necessary to complete their jobs.

Twaa internal users should have deep control, monitoring and intervention.

The objective is:

> **Make the front simple and the engine sophisticated.**

---

# 4. LOCAL MARKET CONTEXT — NEVER IGNORE THIS

The initial operating context is:

- Abu Al Matamir / Abu el Matamer
- Beheira
- Egypt
- expansion later to surrounding villages and centers

The product must feel designed for the local market, not translated from a Gulf or Western delivery app.

Consider these user clusters:

## A. Town-center households
Characteristics:
- familiar with apps and WhatsApp
- convenience-focused
- frequent grocery / pharmacy / food orders
- price sensitive
- expect relatively fast delivery

UX implications:
- quick reorder
- deals
- saved address
- multiple payment choices
- ETA visibility

## B. Village / outer-area households
Characteristics:
- landmark-based addressing may be more reliable than street naming
- travel distance is higher
- scheduled/grouped delivery may be more economical
- stronger cash preference
- lower tolerance for complicated maps/forms

UX implications:
- village selector
- landmark
- optional map pin
- simple delivery windows
- clear delivery fee
- WhatsApp/contact support
- scheduled routes where required

## C. Family purchasing users
Characteristics:
- basket may be large
- repeat staples frequently
- buy mixed categories
- value bundles and predictable cost

UX implications:
- "Buy again"
- saved baskets
- weekly essentials
- household bundles
- favorites
- bulk quantity shortcuts

## D. Young / fast-convenience users
Characteristics:
- snacks
- meals
- beverages
- beauty
- mobile accessories
- urgent needs

UX implications:
- search-first
- fast categories
- recommendations
- trending
- ETA-forward product cards

## E. Elderly / low-digital-confidence customers
Characteristics:
- need larger controls
- fewer steps
- clearer Arabic
- may prefer COD
- may need phone/WhatsApp support

UX implications:
- avoid excessive UI
- strong Arabic labels
- clear confirmation screens
- easy reorder
- customer service access

## F. Small local traders
Characteristics:
- may not maintain digital product databases
- may not know SKU concepts
- may update stock irregularly
- owner often also operator

UX implication:
- NEVER require them to manually create full product records.
- Use the Twaa Master Catalogue.
- Trader mainly selects what they sell and updates price / stock / preparation availability.

## G. Restaurants / prepared-food merchants
Characteristics:
- preparation time matters more than inventory count
- modifiers/add-ons
- opening hours
- temporary item disablement

## H. Riders
Characteristics:
- need very fast interaction
- mobile-first
- outdoor use
- network may be unstable
- COD exposure matters
- must know exact pickup/drop instructions

Design for:
- one-hand use
- big action buttons
- Arabic-first
- extremely low cognitive load
- offline/retry-safe actions

---

# 5. ECOSYSTEM MAP

Build the prototype as one connected ecosystem with the following products:

## APP 1 — TWAA CUSTOMER
Mobile-first consumer commerce application.

## APP 2 — TWAA MERCHANT
Mobile/tablet-first merchant operating application.

## APP 3 — TWAA RIDER
Mobile-first driver/rider execution application.

## SYSTEM 4 — TWAA CONTROL CENTER
Desktop-first internal operating system covering:
- Executive
- Operations
- Dispatch
- Hub
- Inventory
- Merchants
- Riders
- Customer support
- Finance
- Growth
- CRM
- Promotions
- Category management
- Procurement
- Catalog
- Pricing
- Risk
- Settlements
- Analytics
- Configuration

Optional:
## APP 5 — HUB / PICKER MODE
Can be a role inside Control Center or simplified tablet experience for:
- receiving,
- put-away,
- picking,
- packing,
- returns,
- cycle counting.

---

# 6. MASTER DATA STRATEGY — CRITICAL

The entire ecosystem must be driven from central master data.

Do NOT let each trader independently create arbitrary product names.

Build a **Twaa Master Catalogue**.

Hierarchy:

**Department → Category → Subcategory → Product Family → SKU / Variant**

Example:

Groceries  
→ Dairy & Eggs  
→ Milk  
→ Full Cream Milk  
→ Juhayna Full Cream Milk  
→ 1L

Every SKU should support:

- SKU ID
- Arabic name
- English name
- local/search aliases
- common Egyptian colloquial terms
- brand
- department
- category
- subcategory
- product family
- size
- unit
- pack count
- barcode
- image
- short description
- dietary flags
- storage type
- handling type
- age restriction if relevant
- regulated/restricted flag
- shelf-life expectation
- substitution group
- price reference
- tax if applicable
- weight / estimated weight
- dimensions if needed
- temperature:
  - ambient
  - chilled
  - frozen
  - hot
- fragile flag
- active / inactive

### Merchant relationship

Merchant does NOT create the SKU.

Merchant:
1. searches master catalogue,
2. selects products sold,
3. sets price,
4. marks available/unavailable,
5. optionally enters quantity,
6. sets merchant-specific preparation time if applicable.

If product is missing:
- button: **"مش لاقي المنتج؟ اطلب إضافته"**
- submit:
  - product name
  - barcode/photo optional
  - category guess
- goes into Catalog Approval Queue
- Twaa creates canonical SKU
- trader is notified

This prevents:
- duplicate products,
- wrong categories,
- spelling variants,
- fake products,
- poor customer search,
- broken analytics,
- and merchant manipulation.

---

# 7. COMPLETE CUSTOMER-FACING CATEGORY TAXONOMY

The catalogue should be broad enough that Twaa feels like the place for **daily life needs**, not just groceries.

Create at minimum these top departments.

## 1. Grocery & Pantry — بقالة ومؤن
Subcategories:
- Rice
- Pasta
- Pulses
- Flour
- Sugar
- Salt
- Oils & Ghee
- Spices & Seasoning
- Sauces
- Canned Food
- Instant Food
- Breakfast
- Cereals
- Honey & Jam
- Tahini
- Pickles
- Nuts
- Dried Fruit
- Baking
- Tea
- Coffee
- Cocoa
- Milk powder
- Bulk staples

## 2. Fresh Produce — خضار وفاكهة
- Vegetables
- Fruits
- Leafy greens
- Herbs
- Local seasonal products
- Premium fruit
- Cut / prepared produce where available
- bundles:
  - سلطة اليوم
  - طبخة اليوم
  - خضار الأسبوع

For variable-weight items support:
- per kg
- 500 g
- piece
- approximate final-price adjustment

## 3. Dairy & Eggs — ألبان وبيض
- Milk
- Yogurt
- Cheese
- Labneh
- Butter
- Margarine
- Cream
- Eggs
- Desserts
- chilled drinks

## 4. Meat, Poultry & Seafood — لحوم وفراخ وأسماك
- Beef
- Minced meat
- Liver
- Poultry
- Chicken cuts
- Frozen poultry
- Seafood
- Processed meat
- Marinades
- butcher packs
- family packs

Support:
- weight selection
- cut instructions
- preparation notes

## 5. Bakery — مخبوزات
- Baladi bread
- fino
- toast
- pastries
- cakes
- biscuits
- oriental bakery
- breakfast bakery

## 6. Restaurants & Ready Food — مطاعم وأكل جاهز
Groups:
- Breakfast
- Egyptian
- Grill
- Koshary
- Pizza
- Sandwiches
- Fried chicken
- Desserts
- Cafes
- Juice
- Bakeries
- Fast food
- Family meals

Merchant menu structure:
Restaurant → Menu category → Item → modifiers → extras.

## 7. Water & Beverages — مياه ومشروبات
- Water
- Soft drinks
- Juice
- Energy drinks
- Malt drinks
- powdered drinks
- tea/coffee beverages
- ice where locally relevant

## 8. Snacks & Sweets — سناكس وحلويات
- Chips
- Biscuits
- Chocolate
- Candy
- Gum
- Nuts
- Ice cream
- Cakes
- Traditional sweets
- Kids snacks

## 9. Frozen Food — مجمدات
- Vegetables
- Fries
- Chicken
- Meat
- Seafood
- Pizza
- Ready meals
- Ice cream

## 10. Household Cleaning — منظفات واحتياجات البيت
- Laundry
- Dishwashing
- Surface cleaning
- Bathroom
- Floor cleaning
- Disinfectants
- Air freshener
- Insect control
- garbage bags
- tissues
- paper products
- sponges
- gloves

## 11. Personal Care — عناية شخصية
- Bath & body
- Soap
- Shampoo
- Conditioner
- Hair styling
- Deodorant
- Oral care
- Shaving
- Feminine care
- Men's grooming
- hand care

## 12. Beauty — جمال
- Skin care
- Makeup
- Fragrance
- Hair care
- Beauty accessories
- Nail care
- Sun care

## 13. Pharmacy & Health — صيدلية وصحة
Prototype can show:
- OTC / permitted retail items
- first aid
- vitamins
- baby care
- personal health
- oral care
- medical supplies

For any regulated product, show an operational flag:
**"Requires regulatory workflow / prescription validation where legally required."**

Never design the system to bypass healthcare regulation.

## 14. Baby & Mother — الأم والطفل
- Diapers
- Wipes
- Baby food
- Formula / feeding
- Bottles
- Skin care
- Baby bath
- Mother care
- baby accessories

## 15. Home & Kitchen — البيت والمطبخ
- Cookware
- Food storage
- Dinnerware
- Drinkware
- Kitchen tools
- Cleaning tools
- small household items
- foil / wrap
- disposable tableware

## 16. Mobile & Electronics — موبايلات وإلكترونيات
Focus initially on high-frequency small items:
- Chargers
- Cables
- Earphones
- Power banks
- Batteries
- Phone accessories
- adapters
- memory cards
- basic electronics

## 17. Stationery & School — مكتبة ومدرسة
- Pens
- Pencils
- Notebooks
- Paper
- School tools
- Art supplies
- Printing needs
- Office supplies

## 18. Pet Supplies — مستلزمات الحيوانات
- Cat food
- Dog food
- litter
- pet hygiene
- accessories

## 19. Flowers & Gifts — ورد وهدايا
- Flowers
- Gift bags
- cards
- chocolates
- simple gift bundles

## 20. Automotive Essentials — احتياجات العربية
- Car cleaning
- tissues
- phone holders
- basic accessories
- oils/fluids only if operationally/legalistically supported

## 21. Local Specialties — منتجات بلدنا
Important differentiator.

Create a special local section for:
- local bakeries
- local dairy
- local sweets
- local farms where applicable
- local specialties
- featured Abu Al Matamir merchants

## 22. Deals & Bundles — عروض وباقات
- Weekly basket
- Family basket
- Breakfast bundle
- Cleaning bundle
- School bundle
- Ramadan / Eid / seasonal
- "Under X EGP"
- clearance
- merchant-funded deals
- Twaa-funded campaigns

---

# 8. CUSTOMER APP INFORMATION ARCHITECTURE

Bottom navigation:

1. **الرئيسية**
2. **الأقسام**
3. **البحث**
4. **طلباتي**
5. **حسابي**

Persistent:
- delivery location
- ETA
- cart

## Home screen structure

### Header
- Twaa logo
- current delivery area
- exact/approximate ETA
- change location

### Search
Prominent:
**"عايز إيه؟ دور على المنتج أو المحل"**

Search should understand:
- Arabic
- English brand names
- spelling mistakes
- colloquial names
- product type
- merchant name

### Main commerce entrances
Use 3 primary customer shopping modes:

#### A. احتياجات البيت
Grocery + daily needs.

#### B. أكل ومطاعم
Prepared food.

#### C. محلات حواليك
Shop by trader:
- pharmacy
- bakery
- butcher
- grocery
- sweets
- electronics
- etc.

This gives the user both product-first and merchant-first discovery.

### Personalized strips
- اشتريتهم قبل كده
- محتاجهم تاني؟
- الأكثر طلباً حواليك
- عروض قريبة منك
- وصل جديد
- توّا أرخص
- جاهز بسرعة
- عروض آخر الأسبوع
- منتجات من بلدنا

### Smart location merchandising
Do not show unavailable products.

The catalogue should respond to:
- service zone
- hub stock
- merchant availability
- merchant hours
- delivery capacity
- route constraints

---

# 9. CUSTOMER PRODUCT EXPERIENCE

Product card should show only important information:

- image
- name
- size/unit
- current price
- old price if promotion
- discount %
- ETA indicator where relevant
- source label when useful:
  - توّا
  - من محل X
- quick + button

Do NOT overload cards.

## Product page

Show:
- gallery
- product name
- brand
- unit/size
- price
- stock status
- estimated delivery
- fulfillment source
- quantity
- approved substitutes
- merchant options when same product exists from multiple sources

If several merchants sell the same SKU:
show one canonical product page and merchant offers below it.

Sort source recommendation intelligently based on:
- availability
- ETA
- price
- merchant reliability
- Twaa margin
- delivery consolidation opportunity

But customer-facing ranking must still be clear and fair.

---

# 10. CUSTOMER CART & CHECKOUT

The customer should feel one cart even when internally multi-source.

Cart groups products by fulfillment source when necessary.

Show:
- each group
- ETA
- subtotal
- delivery fee
- discount
- promotion
- total

Before payment run full pre-checkout validation:
- location
- serviceability
- price
- availability
- quantity
- merchant status
- merchant capacity
- delivery capacity
- ETA
- promo validity
- minimum basket
- restricted products

Any changed value must be transparently shown.

Payment:
- COD
- online payment
- digital wallet where integrated later

Also show:
- delivery now
- scheduled delivery

Substitution preference:
1. Call/ask me
2. Replace with closest option within X price difference
3. Remove unavailable item

Save default preference in account.

---

# 11. CUSTOMER ORDER TRACKING

Customer sees a clean simplified journey:

1. اتأكدنا من طلبك
2. بيتجهز
3. المندوب في الطريق للاستلام
4. طلبك خرج
5. قربنا منك
6. وصلنا

Do not expose internal fulfillment complexity unless necessary.

If split delivery:
show:
**"طلبك هيوصل على مرتين عشان منأخركش."**

Map tracking:
- rider
- ETA
- call/chat
- safe masked communication if implemented

Delivery confirmation:
- OTP where required
- delivered status
- receipt
- rating:
  - order
  - merchant
  - rider

---

# 12. CUSTOMER RETENTION & CRM

Build customer profile with:

- orders
- reorder
- favorites
- saved baskets
- addresses
- wallet/refund credit
- coupons
- support
- preferences

CRM segmentation examples:
- New
- Activated
- Repeat
- High frequency
- High value
- Lapsed
- COD-heavy
- Promo-dependent
- Grocery-heavy
- Restaurant-heavy
- Village route customer

Lifecycle automations:
- abandoned cart
- first-order conversion
- second-order activation
- reorder reminder
- replenishment prediction
- lapsed customer
- location launch
- back-in-stock
- merchant launch near user
- basket threshold offer

Avoid spam.

---

# 13. MERCHANT APP — DESIGN PHILOSOPHY

The trader should NOT feel he is managing ERP software.

The trader's core jobs are:

1. Receive order
2. Accept/reject
3. Prepare
4. Mark ready
5. Hand over
6. Keep products available
7. Maintain price
8. See money

Main navigation:

- الرئيسية
- الطلبات
- المنتجات
- الأرباح
- الحساب

---

# 14. MERCHANT ONBOARDING

Steps:

1. Mobile OTP
2. Business name
3. merchant type
4. location
5. contact
6. working hours
7. bank/payment settlement details
8. commercial/identity documents where required
9. agreement/commission
10. category mapping
11. approved

Merchant type selector:
- Grocery
- Supermarket
- Restaurant
- Pharmacy
- Bakery
- Butcher
- Fruits & vegetables
- Sweets
- Electronics
- Stationery
- Beauty
- Home goods
- Pet supplies
- Other controlled type

Twaa admin approves activation.

Merchant cannot change commercial commission or settlement terms.

---

# 15. MERCHANT HOME

Top:

### اليوم
- طلبات جديدة
- بيتجهز
- جاهز
- مبيعات اليوم
- مستحق لك
- تقييمك

Prominent switch:
**المحل مفتوح / مقفول**

If closing while active order exists:
warn first.

Merchant can set:
- Busy
- Normal
- Closed

Busy mode increases prep time or throttles new demand instead of automatically destroying service.

---

# 16. MERCHANT ORDER FLOW

Incoming order should create strong alert.

Card:
- order number
- timer to accept
- item count
- value
- preparation SLA
- delivery mode
- notes

Actions:
- قبول
- غير قادر على التنفيذ

If reject:
mandatory reason:
- item unavailable
- shop busy
- closing
- wrong inventory
- operational issue
- other

Merchant reliability score updates.

Once accepted:

### Preparing screen
Checklist of items.

For each item:
- quantity
- variant
- notes
- substitution if needed

Actions:
- موجود
- غير موجود
- بديل

When all complete:
**جاهز للاستلام**

Show rider:
- name
- image
- vehicle
- OTP/pickup code if used

Handover should scan/confirm package.

---

# 17. MERCHANT PRODUCT MANAGEMENT — MUST BE ULTRA EASY

Never show a blank "Create Product" screen by default.

Products screen:

### Tab 1 — منتجاتي
Existing selected products.

Each row:
- image
- name
- selling price
- available toggle
- optional stock
- reference price warning

Quick bulk controls:
- فتح الكل
- إيقاف أصناف
- تحديث أسعار

### Tab 2 — ضيف منتجات
Browse Twaa Master Catalogue.

Trader filters:
- category
- brand
- search
- barcode

Select multiple products → **إضافة لمحلي**

Then only enter:
- price
- availability
- stock optional

### Recommended products
"أصناف محلات زيك بتبيعها وانت لسه مضفتهاش"

### Missing SKU
"مش لاقي المنتج؟"
Submit catalog request.

---

# 18. MERCHANT PRICING CONTROLS

Protect both customer trust and Twaa economics.

Admin defines:
- recommended market price
- floor/ceiling tolerance where appropriate
- maximum promotion
- merchant commission
- category margin requirements

Flag:
- abnormal price
- huge sudden increase
- price much higher than local median
- merchant promo abuse

Possible workflow:
- normal price changes → instant
- outlier → review
- suspicious repeated pattern → merchant risk flag

Never allow silent admin edits without audit history.

---

# 19. MERCHANT FINANCE

Merchant sees:

- sales
- commission
- refunds
- merchant responsibility deductions
- promotions funded by merchant
- penalties if configured
- settlement due
- settlement paid
- downloadable statement

Every deduction must be explainable.

Merchant should be able to click:
**"ليه اتخصم المبلغ ده؟"**

Show:
- order
- event
- evidence
- policy
- support/dispute

This reduces disputes and partner distrust.

---

# 20. RIDER APP — CORE PHILOSOPHY

Rider should never have to understand the entire order architecture.

His job is:
1. become available,
2. receive mission,
3. accept,
4. navigate to pickup,
5. verify package,
6. navigate to customer,
7. collect COD if necessary,
8. prove delivery,
9. reconcile cash.

Bottom navigation:
- الرئيسية
- مهامي
- الأرباح
- الكاش
- حسابي

---

# 21. RIDER HOME

Top:
- Online / Offline
- current zone
- today earnings
- completed jobs
- COD cash held

Very important:
### Cash Exposure Meter
Example:
**معاك 730 من حد 1,000 جنيه**

At threshold:
- stop new COD jobs
- prompt deposit/reconciliation

This protects the business.

---

# 22. RIDER JOB OFFER

Mission card:

- estimated earning
- pickup count
- delivery zone
- estimated distance
- estimated duration
- package handling:
  - normal
  - chilled
  - frozen
  - hot
  - fragile
- COD amount
- accept countdown

Do not expose customer private details before acceptance if avoidable.

Actions:
- قبول
- رفض

Record:
- offer
- response
- response time
- rejection reason optionally

---

# 23. RIDER PICKUP

After acceptance:

Route:
- navigate
- pickup merchant/hub
- package count
- package codes

At pickup:
scan barcode or enter pickup code.

Verify:
- number of packages
- visible damage
- handling requirements

If package missing/damaged:
rider cannot leave without recording exception.

Chain of custody is mandatory.

---

# 24. RIDER DELIVERY

Screen:
- customer
- map
- landmark
- delivery note
- masked call
- WhatsApp/system contact if configured
- COD amount
- change request info if captured

Actions:
1. وصلت
2. customer contacted
3. collect cash if needed
4. OTP/proof
5. تم التسليم

Failure flow:
- customer not answering
- wrong address
- refuses order
- cannot access
- unsafe location
- COD problem
- other

Each has controlled workflow.

Rider must not freely cancel an order.

---

# 25. RIDER EARNINGS & SETTLEMENT

Show:
- completed missions
- mission fee
- incentives
- waiting compensation if applicable
- deductions
- COD difference
- amount due from/to Twaa

Separate:
### Earnings
from
### Cash held

This avoids rider confusion.

---

# 26. TWAA CONTROL CENTER — THE HEART OF THE COMPANY

This is where complexity belongs.

Use desktop web design.

Left navigation:

## Command
- Executive Overview
- Live Operations
- Control Tower
- Dispatch Map

## Commerce
- Orders
- Customers
- Merchants
- Catalogue
- Categories
- Pricing
- Promotions
- CRM

## Supply
- Hub
- Inventory
- Purchasing
- Receiving
- Picking & Packing
- Returns

## Delivery
- Riders
- Fleet
- Zones
- Dispatch
- Route Planning

## Finance
- Payments
- COD
- Refunds
- Merchant Settlements
- Rider Settlements
- Reconciliation
- Profitability

## Customer Care
- Support Cases
- Complaints
- Compensation
- Call/WhatsApp Queue

## Growth
- Campaigns
- Segments
- Offers
- Referral
- Merchant Acquisition
- Location Expansion

## Intelligence
- Business Analytics
- Unit Economics
- Demand Intelligence
- Merchant Performance
- Rider Performance
- Customer Cohorts
- Heatmaps

## Governance
- Users & Roles
- Approval Center
- Audit Log
- Business Rules
- SLA
- Configuration

---

# 27. EXECUTIVE HOME — BUILT FOR THE THREE PARTNERS

The founders should understand the company in less than 60 seconds.

Top cards:

- GMV today
- Net Revenue
- Contribution Margin
- Orders
- Average Order Value
- Delivered %
- On-time %
- Cancellation %
- Active customers
- Active merchants
- Active riders
- COD exposure
- Refund pending
- Cash discrepancy

Then:

### Live business pulse
- orders per hour
- revenue
- contribution

### Funnel
- sessions
- add to cart
- checkout
- paid/confirmed
- delivered
- repeated

### Unit economics
Per order:
- basket
- merchant commission / merchandise margin
- delivery revenue
- promo cost
- payment fee
- rider cost
- picking/packing cost
- refund/compensation
- variable ops cost
- contribution margin

### Red Flags
Only items requiring partner attention:
- abnormal loss
- high refund
- merchant dispute
- COD exposure
- rider cash discrepancy
- category margin collapse
- inventory shrinkage
- fraud spike
- SLA failure
- low delivery capacity

---

# 28. CONTROL TOWER — MUST FEEL OPERATIONALLY REAL

Create one live screen listing only orders needing action.

Each alert row:
- severity
- order
- problem
- time in state
- SLA countdown
- owner
- location
- money at risk
- next best action

Examples:
- merchant did not accept
- merchant late
- hub inventory mismatch
- ready without rider
- rider assignment failed
- rider pickup delay
- customer unreachable
- delivery failure
- refund pending
- payment reconciliation
- COD discrepancy
- rider over cash limit
- order stuck in status

Use:
- Critical
- High
- Medium

Sort:
1. severity
2. closest SLA breach
3. financial exposure

Actions can be taken from the row.

---

# 29. DISPATCH CENTER

Map view:
- riders
- pickups
- active routes
- merchants
- hub
- delivery zones
- village clusters

Side panel:
- unassigned
- late
- at risk
- available riders
- capacity

Dispatch engine considers:
- rider location
- capacity
- vehicle
- handling requirements
- merchant prep ETA
- promised customer ETA
- cash exposure
- route consolidation
- village scheduled route

Admin can manually override but reason is mandatory.

---

# 30. SERVICE ZONES & LOCATION CLUSTERS

Location must be part of the operating engine, not only a customer address.

Build hierarchical geography:

Governorate  
→ Markaz / center  
→ City / town  
→ Village  
→ Service zone  
→ route cluster

Each Service Zone supports:
- polygon
- hub
- delivery fee
- minimum basket
- delivery SLA
- hours
- max capacity
- scheduled windows
- rider type
- route strategy
- active/inactive

### Cluster strategies

#### Town core
- bicycle / motorcycle
- fast delivery
- flexible dispatch

#### Nearby villages
- motorcycle
- route batching possible

#### Outer villages
- scheduled windows
- minimum basket potentially higher
- cluster orders
- route departure cut-off

Do not promise 15-minute delivery universally.

Promise should be realistic by zone.

---

# 31. HUB / INVENTORY CONTROL

Hub screen:
- on-hand
- reserved
- available
- incoming
- damaged
- expired
- quarantine

Use barcode-based movement.

Processes:
1. purchase order
2. receiving
3. discrepancy
4. put-away
5. stock available
6. reservation
7. picking
8. packing
9. dispatch
10. return
11. inspection
12. restock / quarantine / waste

No invisible stock adjustment.

Every stock adjustment:
- reason
- user
- time
- previous
- new
- evidence when needed

---

# 32. PROCUREMENT & DEMAND INTELLIGENCE

Create Procurement dashboard.

Signals:
- sales velocity
- search with no result
- out-of-stock searches
- "notify me"
- abandoned product
- customer substitution
- seasonal demand
- merchant prices
- local demand by village
- repeat purchase interval

Purchasing suggestions:
- SKU
- forecast
- on hand
- days of cover
- reorder point
- recommended quantity
- expected purchase cost
- sell price
- expected margin

Approval required before purchase order.

Prevent overstock by monitoring:
- expiry
- slow movers
- days of inventory
- dead stock

---

# 33. COMMERCIAL MODEL & PROFITABILITY ENGINE

Every order must have a financial ledger.

Revenue components:
- product margin on Twaa inventory
- merchant commission
- delivery fee
- service fee if used
- merchant delivery-as-a-service fee
- promotion contribution
- advertising / sponsored placement later

Costs:
- cost of goods
- payment gateway
- rider pay
- pickup/packing
- delivery subsidy
- promotion cost
- refund
- compensation
- wastage
- merchant adjustment
- rider adjustment

Calculate:

**Order Contribution = Net Revenue – Variable Cost**

Display contribution:
- per order
- per customer
- per merchant
- per category
- per zone
- per rider route
- per campaign

---

# 34. COST CONTROL GUARDRAILS

This section is mandatory.

## A. Minimum contribution guard
If a promotion or delivery subsidy causes contribution below threshold:
- block,
- request approval,
- or limit campaign audience.

## B. Delivery economics guard
Calculate:
- cost/km
- cost/order
- orders/trip
- route density
- waiting time
- deadhead km

## C. Promotion funding
Every promotion has:
- Twaa funded
- Merchant funded
- Shared

Never store only "discount".
Store who pays.

## D. Compensation approval tiers
Example:
- small amount: support agent
- medium: supervisor
- large: finance/admin

All configurable.

## E. Rider cash exposure
Enforce maximum cash balance.

## F. Merchant credit/settlement exposure
Do not let unsettled disputes grow invisibly.

## G. Price anomaly detection
Flag abnormal prices.

## H. Refund leakage control
No refund without:
- order
- item
- reason
- responsible party
- evidence/policy
- approval level

## I. Inventory shrinkage
Track:
- damaged
- expired
- missing
- adjustment
- return loss

## J. Abuse detection
Flag:
- repeated COD refusal
- repeated customer refund claims
- suspicious merchant cancellations
- rider delivery anomalies
- repeated promo use patterns

Do not auto-penalize without review for high-impact cases.

---

# 35. APPROVAL CENTER

Create a unified approval inbox.

Approval types:
- merchant activation
- new SKU
- abnormal merchant price
- large promo
- promo below margin threshold
- refund over limit
- compensation
- inventory write-off
- rider adjustment
- merchant settlement adjustment
- manual financial close
- business rule override

For every approval:
- requester
- reason
- amount/exposure
- evidence
- impact
- approver
- timestamp
- decision

---

# 36. MERCHANT PERFORMANCE

Merchant scorecard:

- GMV
- orders
- acceptance rate
- acceptance time
- prep SLA
- cancellation after accept
- item availability accuracy
- substitution rate
- complaint rate
- refund responsibility
- customer rating
- revenue contribution
- Twaa contribution
- settlement status

Classification:
- New
- Healthy
- Watch
- Restricted
- Suspended

Avoid simplistic punishment.

Use coaching prompts:
**"آخر 7 أيام 18% من طلباتك اتأخرت بسبب تجهيز الأصناف."**

---

# 37. RIDER PERFORMANCE

Rider scorecard:

- missions
- acceptance
- on-time pickup
- delivery time
- customer rating
- delivery failure
- COD accuracy
- cash deposit timeliness
- distance
- orders/hour
- earnings/hour
- incidents
- rescue events

Do not optimize only speed.
Also protect:
- safety
- accuracy
- customer experience
- cash discipline

---

# 38. CUSTOMER SERVICE CENTER

Support agent sees one 360-degree page.

Customer:
- profile
- current order
- full timeline
- payment
- fulfillment groups
- merchant
- rider
- package
- proof of delivery
- communication
- refund
- previous complaints
- risk flags

Suggested guided issue flows:
- item missing
- wrong item
- damaged
- late delivery
- rider complaint
- merchant complaint
- COD difference
- refund
- cancellation
- cannot contact rider
- other

System recommends:
- responsible party
- eligible resolution
- maximum compensation
- approval needed

Agent should not invent arbitrary discounts.

---

# 39. GROWTH & MARKETING CENTER

Marketing is not only campaign banners.

Create a proper Growth Center.

## Customer acquisition
- campaign source
- referral
- promo code
- channel
- CAC

## Activation
Track:
- registered
- serviceable
- first cart
- checkout
- first order
- delivered first order
- second order

## Retention
Cohorts:
- D7
- D30
- M2
- M3

## CRM segmentation
By:
- geography
- category affinity
- AOV
- frequency
- recency
- price sensitivity
- COD
- preferred merchant
- delivery time
- family / weekly-shopping behavior inferred from transactions

Do not use sensitive personal attributes.

## Campaign builder
Audience + Offer + Channel + Schedule + Budget + Margin Guard + Goal.

Goals:
- acquisition
- first order
- second order
- category adoption
- winback
- merchant launch
- zone launch
- basket increase

---

# 40. SALES / MERCHANT ACQUISITION CRM

Create pipeline:

1. Lead
2. Contacted
3. Qualified
4. Visit Scheduled
5. Commercial Agreement
6. Documents
7. Catalogue Setup
8. Training
9. Activated
10. First Order
11. Healthy Merchant

Merchant lead fields:
- name
- owner
- type
- location
- expected assortment
- demand opportunity
- competitors
- commission proposal
- onboarding status

Map merchant gaps by service zone:
**"This village has demand for pharmacy but no active pharmacy."**

This should generate sales opportunities.

---

# 41. LOCATION EXPANSION INTELLIGENCE

Build expansion dashboard:

For each village / cluster:
- waitlist users
- searches
- order attempts
- population proxy/manual field
- nearby merchants
- projected demand
- projected delivery cost
- possible route density
- estimated break-even orders/day
- acquisition pipeline

Classify:
- Not Ready
- Merchant Acquisition Needed
- Rider Capacity Needed
- Pilot Ready
- Live

---

# 42. PROMOTIONS ENGINE

Promotion types:
- %
- fixed amount
- free delivery
- bundle
- buy X get Y
- category
- merchant
- first order
- second order
- minimum basket
- zone-specific
- time window
- user segment

Controls:
- budget
- redemptions
- customer limit
- funding owner
- contribution impact
- fraud guard
- start/end
- approval

Always display:
**Expected Incremental Contribution**, not only GMV.

---

# 43. CATEGORY MANAGEMENT

Category manager dashboard:
- category GMV
- margin
- fill rate
- availability
- top SKUs
- search demand
- no-result terms
- OOS
- substitution
- price index
- merchant coverage
- inventory turns
- waste

Actions:
- add merchant
- source product
- adjust assortment
- launch promo
- increase hub inventory
- retire SKU

---

# 44. FINANCIAL CONTROL CENTER

Build separate views:

## Payments
- pending
- success
- failed
- reconciliation required

## COD
- expected
- collected
- deposited
- variance
- by rider

## Refunds
- requested
- approved
- submitted
- completed
- failed

## Merchant Settlement
- sales
- commission
- promo funding
- refunds
- responsibility deductions
- adjustments
- net payable

## Rider Settlement
- mission fees
- incentives
- COD variance
- deductions
- adjustments
- net

## Daily Reconciliation
Business day cannot fully close until:
- online payment reconciled
- COD reconciled
- merchant liabilities posted
- rider liabilities posted
- material exceptions accounted for

Show:
**Open Financial Exposure**

---

# 45. AUDITABILITY — NON-NEGOTIABLE

Every material action creates an event.

Audit:
- who
- when
- object
- action
- old value
- new value
- reason
- device/source where appropriate

Critical actions cannot be deleted from audit log.

Examples:
- price override
- refund
- stock adjustment
- manual rider assignment
- settlement adjustment
- merchant commission change
- permission change
- manual order closure

---

# 46. ROLE-BASED ACCESS

Create roles:

- Founder / Super Admin
- General Manager
- Operations Manager
- Dispatcher
- Hub Manager
- Picker
- Finance
- Customer Support
- Support Supervisor
- Merchant Operations
- Commercial / Sales
- Category Manager
- Marketing
- Procurement
- Analyst

Follow least privilege.

Example:
Support cannot edit merchant commission.
Merchant sales cannot execute refunds.
Picker cannot edit product selling price.
Rider cannot alter COD expected amount.

---

# 47. DESIGN SYSTEM

## Brand
Use Twaa prominently.

Arabic-first.
RTL by default.

Tone:
- Egyptian
- simple
- warm
- trustworthy
- fast
- not childish

Avoid:
- excessive gradients
- neon AI styling
- dark cyber interfaces
- too many cards
- huge unused spaces
- fake futuristic dashboards
- random charts

### Customer
Bright, warm, friendly and commerce-first.

### Merchant
Practical and clear.

### Rider
High contrast and action-first.

### Admin
Professional, dense enough for operations, but clean.

Use consistent status colors, icons and components.

---

# 48. MICROCOPY

Use natural Egyptian Arabic, not literal corporate Arabic.

Examples:

Instead of:
"Select fulfillment location"

Use:
**"هنوصل الطلب فين؟"**

Instead of:
"Inventory unavailable"

Use:
**"المنتج خلص حالياً"**

Instead of:
"Rider assignment"

Customer:
**"بندورلك على أقرب مندوب"**

Merchant:
**"المندوب جاي يستلم"**

Admin can use technical terms.

---

# 49. DEMO DATA REQUIREMENTS

Populate prototype with realistic demo data.

Include:
- 20+ merchants
- several villages / zones
- 10+ riders
- 150+ visible product examples across categories
- Twaa hub products
- merchant products
- restaurant menus
- active orders
- delayed orders
- failed orders
- refunds
- settlements
- promotions
- customer cohorts

Names and prices should look locally realistic.

Do not use lorem ipsum.

---

# 50. DEMO SCENARIOS — MAKE THEM CLICKABLE

The clickable prototype must support at least these end-to-end stories.

## Scenario 1 — Simple hub order
Customer:
- selects address
- orders milk, eggs, bread
- pays COD
- hub picks
- rider assigned
- delivery
- COD settled

## Scenario 2 — Multi-source order
Customer orders:
- grocery from Twaa hub
- meal from restaurant

Internally:
- 2 fulfillment orders
- one customer order
- delivery orchestration decides combined/split.

## Scenario 3 — Out-of-stock substitution
Product unavailable.
Customer chooses alternative.
Difference in price is recorded.

## Scenario 4 — Merchant order
Merchant receives, accepts, prepares, ready, rider pickup.

## Scenario 5 — Merchant timeout
Merchant fails to accept.
Control Tower alerts operator.
Operator reroutes/cancels according to rules.

## Scenario 6 — Rider COD limit
Rider reaches cash threshold.
New COD orders are blocked.
Deposit/reconciliation required.

## Scenario 7 — Failed delivery
Customer unreachable.
Rider records attempt.
Support decides retry/RTO.

## Scenario 8 — Refund
Item missing.
Support investigates chain of custody.
Responsible party assigned.
Refund approved and recorded.

## Scenario 9 — New merchant onboarding
Sales lead → contract → documents → catalogue → activation.

## Scenario 10 — Trader adds products
Trader selects 20 products from Twaa master catalogue without typing product names.

## Scenario 11 — Product missing from catalogue
Merchant submits new-product request.
Catalog manager approves canonical SKU.

## Scenario 12 — Village expansion
Waitlist and demand signals show opportunity.
Admin creates service zone and merchant acquisition task.

## Scenario 13 — Promotion economics
Marketing builds campaign.
System shows margin impact.
Campaign below threshold requires approval.

## Scenario 14 — End-of-day finance
COD + online payment + merchant/rider settlements reconcile.

---

# 51. KEY KPIs

## Customer
- MAU
- conversion
- first-order conversion
- repeat rate
- frequency
- AOV
- retention
- NPS/rating
- refund rate

## Commerce
- GMV
- net revenue
- contribution
- take rate
- discount rate

## Fulfillment
- fill rate
- substitution
- picking time
- prep time
- availability accuracy

## Delivery
- assignment time
- pickup time
- delivery time
- on-time %
- delivery success
- cost/order
- orders/rider/hour

## Merchant
- acceptance
- prep SLA
- cancellation
- availability accuracy
- rating
- contribution

## Finance
- COD variance
- refund leakage
- unsettled amount
- payment reconciliation
- merchant payable
- rider payable

## Inventory
- turns
- stockout
- shrink
- expiry
- waste
- days cover

## Growth
- CAC
- activation
- second-order rate
- retention
- promo ROI
- incremental contribution

---

# 52. WHAT MUST NEVER BE MANUAL IF IT CAN BE SYSTEM-CONTROLLED

Avoid free text for:

- product category
- product name when master SKU exists
- refund reasons
- rejection reasons
- cancellation reasons
- stock adjustment reason
- support issue type
- financial adjustment type
- delivery failure reason
- merchant type
- vehicle type
- handling requirement

Use controlled lists.

Free text can be an additional note.

---

# 53. WHAT MUST REQUIRE A REASON

Mandatory reason for:
- order cancellation
- manual rider reassignment
- refund
- compensation
- price override
- stock adjustment
- merchant suspension
- rider suspension
- settlement adjustment
- manual financial closure
- manual SLA override
- catalogue deletion

---

# 54. PROFIT PROTECTION RULE

Before any feature is called complete, ask:

1. Can this cause hidden cost?
2. Can this cause cash leakage?
3. Can a merchant game it?
4. Can a rider game it?
5. Can a customer abuse it?
6. Does it have a financial owner?
7. Is there an audit trail?
8. Does it have an SLA?
9. Does it have exception handling?
10. Can the founders see its impact?

If any answer is missing, fix the design.

---

# 55. CUSTOMER EXPERIENCE RULE

Before any customer screen is complete, ask:

1. Does location matter here?
2. Is the product actually available in this zone?
3. Does user understand price?
4. Does user understand ETA?
5. Are there unnecessary choices?
6. Can a low-digital-confidence user complete it?
7. Can repeat purchase be faster?
8. Are we exposing internal complexity unnecessarily?

---

# 56. MERCHANT EXPERIENCE RULE

Before any merchant screen is complete:

1. Can trader act in under 5 seconds?
2. Are we asking trader to type data Twaa already knows?
3. Can catalogue selection replace manual product creation?
4. Is order SLA obvious?
5. Is money clear?
6. Is every deduction explainable?
7. Can merchant accidentally break customer experience?
8. Are risky changes controlled?

---

# 57. RIDER EXPERIENCE RULE

Before any rider screen is complete:

1. Is next action obvious?
2. Can it work one-handed?
3. Is pickup/drop clear?
4. Is COD amount impossible to confuse?
5. Is chain of custody recorded?
6. Can rider cancel improperly?
7. Is weak-network retry considered?
8. Is cash exposure controlled?

---

# 58. ADMIN EXPERIENCE RULE

Admin may be sophisticated.

But do not make it chaotic.

Every screen should answer:

- What is happening?
- What needs attention?
- Why?
- Who owns it?
- What is at risk?
- What action can I take?
- What happens financially?
- Where is the audit trail?

---

# 59. PROTOTYPE STRUCTURE

Create a polished opening ecosystem page:

# Twaa Business OS

Four clickable cards:

### Customer App
"اطلب كل احتياجاتك"

### Merchant App
"بيع أكتر وإدارتك أبسط"

### Rider App
"استلم، وصل، واتحاسب"

### Twaa Control Center
"شوف الشركة كلها من مكان واحد"

Below:
interactive system diagram showing:

Customer  
→ Commerce  
→ OMS  
→ Fulfillment  
→ Merchant/Hub  
→ Delivery  
→ Rider  
→ Customer  
→ Settlement

And data flows into:
- CRM
- Finance
- Analytics
- Control Tower

---

# 60. OUTPUT EXPECTATION FROM CLAUDE

Create the demo itself, not a report describing it.

Deliver:

1. a fully navigable prototype,
2. realistic mobile customer app,
3. realistic merchant app,
4. realistic rider app,
5. desktop admin/control center,
6. connected shared demo data,
7. clickable journeys,
8. filters,
9. modal interactions,
10. charts,
11. tables,
12. realistic statuses,
13. Arabic-first RTL,
14. responsive screens,
15. no dead buttons where a demonstration action can exist.

Use mock backend/state so actions visibly affect the ecosystem.

Example:
- Merchant marks order ready →
- Control Center status updates →
- Rider job appears →
- Customer tracking updates.

The demo should make it obvious that this is **one operating platform**, not four disconnected mockups.

---

# 61. TECHNICAL DEMO BEHAVIOR

If building with HTML/React:

- use reusable components,
- central demo state,
- centralized status model,
- realistic data objects,
- responsive layout,
- local persistence if useful,
- routes for each application,
- no dependency on paid APIs for the prototype,
- use mock map if real map is unavailable,
- simulate timers/SLA,
- simulate order-state transitions,
- simulate notifications.

Suggested routes:

/  
/customer  
/customer/categories  
/customer/search  
/customer/cart  
/customer/order/:id  

/merchant  
/merchant/orders  
/merchant/catalog  
/merchant/finance  

/rider  
/rider/jobs  
/rider/cash  
/rider/earnings  

/admin  
/admin/control-tower  
/admin/orders  
/admin/dispatch  
/admin/customers  
/admin/merchants  
/admin/riders  
/admin/catalog  
/admin/categories  
/admin/inventory  
/admin/procurement  
/admin/payments  
/admin/refunds  
/admin/settlements  
/admin/growth  
/admin/crm  
/admin/analytics  
/admin/zones  
/admin/approvals  
/admin/audit

---

# 62. DATA OBJECTS TO SIMULATE

Use realistic linked objects:

- Customer
- Address
- ServiceZone
- Merchant
- MerchantOutlet
- Hub
- Product
- SKU
- MerchantSKU
- Inventory
- InventoryReservation
- CustomerOrder
- OrderItem
- FulfillmentOrder
- FulfillmentItem
- Package
- DeliveryTask
- Rider
- Vehicle
- DeliveryAttempt
- ProofOfDelivery
- CODCollection
- Payment
- Refund
- Return
- SupportCase
- Promotion
- MerchantSettlement
- RiderSettlement
- OrderEvent
- Notification
- Approval
- Campaign
- Segment
- PurchaseOrder

---

# 63. FINAL DESIGN STANDARD

The final demo should make a potential investor, partner, merchant or operator think:

> "This company understands not only how to build a delivery app, but how to operate, control and profitably scale the entire local commerce network."

It should also make a customer, trader and rider think:

> "This is easy."

And make the founders think:

> "Nothing important can happen in the business without us being able to see it, measure it, control it and understand its financial impact."

---

# 64. FINAL INSTRUCTION TO CLAUDE

Do not stop after creating dashboards or a few landing pages.

Build the ecosystem deeply enough that a stakeholder can navigate through a complete business demonstration.

If there is a conflict between:
- beautiful UI
- and operational clarity

choose operational clarity.

If there is a conflict between:
- adding more merchant flexibility
- and protecting catalogue / financial / customer integrity

protect integrity.

If there is a conflict between:
- higher GMV
- and negative unit economics

surface the conflict and require a controlled business decision.

Always preserve:
- location awareness,
- local user mindset,
- service-zone logic,
- financial responsibility,
- operational ownership,
- profitability,
- auditability,
- and ease of use.

**Build the demo now.**
