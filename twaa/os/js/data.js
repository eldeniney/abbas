/* Twaa Business OS — master data and demo seed.
   Everything here is reference/master data. Live state (orders, tasks, cash, approvals…) is built by TW.seed() in store.js
   from these definitions, so "Reset demo" always returns to the same believable morning in Abu El Matamir. */
(function () {
const TW = window.TW;
const D = (TW.D = {});

/* ------------------------------------------------------------------ geography -------------------------------------------- */
/* Governorate → Markaz → Town/Village → Service zone → Route cluster. lat/lng are approximate; the mock map projects them. */
D.geo = { governorate: { id: "beheira", ar: "البحيرة", en: "Beheira" }, markaz: { id: "matamir", ar: "مركز أبو المطامير", en: "Abu El Matamir markaz" }, town: { ar: "مدينة أبو المطامير" } };
/* type: core = town core (bike/motorbike, on-demand) · near = nearby villages (motorbike, batching) · outer = outer villages (scheduled windows) */
D.zones = [
  { id: "center", ar: "وسط المدينة", en: "City Center", village: "مدينة أبو المطامير", type: "core", lat: 30.9106, lng: 30.1755, r: 2.5, fee: 10, min: 60, sla: [20, 35], hours: "8 ص – 12 م", cap: 60, windows: [], riderType: ["bicycle", "motorbike"], route: "on-demand", active: true, cluster: "CL-1", pop: 64000 },
  { id: "gaish", ar: "شارع الجيش والمحطة", en: "El Gaish St. & Station", village: "مدينة أبو المطامير", type: "core", lat: 30.9030, lng: 30.1700, r: 1.8, fee: 10, min: 60, sla: [25, 40], hours: "8 ص – 12 م", cap: 40, windows: [], riderType: ["bicycle", "motorbike"], route: "on-demand", active: true, cluster: "CL-1", pop: 28000 },
  { id: "shokaf", ar: "أبو الشقاف", en: "Abu El Shoqaf", village: "أبو الشقاف", type: "near", lat: 30.8790, lng: 30.2210, r: 2.0, fee: 15, min: 80, sla: [35, 50], hours: "9 ص – 11 م", cap: 20, windows: [], riderType: ["motorbike"], route: "batched", active: true, cluster: "CL-2", pop: 21000 },
  { id: "zawya", ar: "زاوية صقر", en: "Zawyet Saqr", village: "زاوية صقر", type: "near", lat: 30.8720, lng: 30.1230, r: 2.0, fee: 20, min: 90, sla: [40, 55], hours: "9 ص – 11 م", cap: 18, windows: [], riderType: ["motorbike"], route: "batched", active: true, cluster: "CL-3", pop: 18500 },
  { id: "tayreya", ar: "الطيرية", en: "El Tayreya", village: "الطيرية", type: "near", lat: 30.9430, lng: 30.2380, r: 2.0, fee: 20, min: 90, sla: [40, 55], hours: "9 ص – 11 م", cap: 16, windows: [], riderType: ["motorbike"], route: "batched", active: true, cluster: "CL-2", pop: 16000 },
  { id: "hadeen", ar: "الحدين", en: "El Hadeen", village: "الحدين", type: "outer", lat: 30.8330, lng: 30.2010, r: 2.2, fee: 25, min: 100, sla: [60, 90], hours: "رحلات مجدولة", cap: 30, windows: ["11:00 – 12:00", "15:00 – 16:00", "19:00 – 20:00"], riderType: ["motorbike", "tricycle"], route: "scheduled", active: true, cluster: "CL-4", pop: 14000 },
  { id: "boulin", ar: "بولين", en: "Boulin", village: "بولين", type: "outer", lat: 30.9560, lng: 30.1300, r: 2.2, fee: 25, min: 100, sla: [60, 90], hours: "رحلات مجدولة", cap: 30, windows: ["12:00 – 13:00", "18:00 – 19:00"], riderType: ["motorbike", "tricycle"], route: "scheduled", active: true, cluster: "CL-5", pop: 15500 },
  { id: "wafaeya", ar: "الوفائية", en: "El Wafaeya", village: "الوفائية", type: "outer", lat: 30.9220, lng: 30.3010, r: 2.0, fee: 30, min: 120, sla: [70, 100], hours: "غير مفعّلة", cap: 0, windows: ["13:00 – 14:00", "19:00 – 20:00"], riderType: ["motorbike", "tricycle"], route: "scheduled", active: false, cluster: "CL-6", pop: 12500 },
  { id: "kombaraka", ar: "كوم البركة", en: "Kom El Baraka", village: "كوم البركة", type: "outer", lat: 30.8020, lng: 30.1000, r: 2.5, fee: 30, min: 120, sla: [75, 105], hours: "غير مفعّلة", cap: 0, windows: ["12:00 – 13:00"], riderType: ["motorbike", "tricycle"], route: "scheduled", active: false, cluster: "CL-7", pop: 9800 },
];
D.zoneType = { core: "قلب المدينة", near: "قرى قريبة", outer: "قرى بعيدة" };
/* project lat/lng to a 1000×640 mock map */
D.proj = (lat, lng) => ({ x: Math.round(((lng - 30.07) / 0.25) * 1000), y: Math.round(((30.985 - lat) / 0.2) * 640) });
D.zones.forEach((z) => Object.assign(z, D.proj(z.lat, z.lng), { pr: Math.round(z.r * 30) }));
D.hubs = [
  { id: "h1", ar: "هب توّا — وسط المدينة", en: "Twaa Hub 1 — City Center", zoneId: "center", lat: 30.9112, lng: 30.1742, active: true, bins: "A–F", hours: "7 ص – 1 ص", pickers: 4 },
  { id: "h2", ar: "هب قرية أبو الشقاف (مخطط)", en: "Village micro-hub 2 (planned)", zoneId: "shokaf", lat: 30.8800, lng: 30.2190, active: false, bins: "—", hours: "—", pickers: 0 },
];
D.hubs.forEach((h) => Object.assign(h, D.proj(h.lat, h.lng)));

/* ------------------------------------------------------------------ taxonomy -------------------------------------------- */
/* tone = tile palette slot 1–8 (theme-aware tokens in CSS) */
D.depts = [
  { id: "grocery", ar: "بقالة ومؤن", en: "Grocery & Pantry", icon: "bag", tone: 1 },
  { id: "produce", ar: "خضار وفاكهة", en: "Fresh Produce", icon: "carrot", tone: 2 },
  { id: "dairy", ar: "ألبان وبيض", en: "Dairy & Eggs", icon: "milk", tone: 3 },
  { id: "meat", ar: "لحوم وفراخ وأسماك", en: "Meat, Poultry & Seafood", icon: "meat", tone: 4 },
  { id: "bakery", ar: "مخبوزات", en: "Bakery", icon: "bread", tone: 5 },
  { id: "food", ar: "مطاعم وأكل جاهز", en: "Restaurants & Ready Food", icon: "food", tone: 4 },
  { id: "water", ar: "مياه ومشروبات", en: "Water & Beverages", icon: "drop", tone: 3 },
  { id: "snacks", ar: "سناكس وحلويات", en: "Snacks & Sweets", icon: "candy", tone: 5 },
  { id: "frozen", ar: "مجمدات", en: "Frozen Food", icon: "snow", tone: 3 },
  { id: "cleaning", ar: "منظفات واحتياجات البيت", en: "Household Cleaning", icon: "spray", tone: 6 },
  { id: "care", ar: "عناية شخصية", en: "Personal Care", icon: "soap", tone: 7 },
  { id: "beauty", ar: "جمال", en: "Beauty", icon: "beauty", tone: 7 },
  { id: "pharmacy", ar: "صيدلية وصحة", en: "Pharmacy & Health", icon: "pill", tone: 6 },
  { id: "baby", ar: "الأم والطفل", en: "Baby & Mother", icon: "baby", tone: 8 },
  { id: "home", ar: "البيت والمطبخ", en: "Home & Kitchen", icon: "kitchen", tone: 1 },
  { id: "electronics", ar: "موبايلات وإلكترونيات", en: "Mobile & Electronics", icon: "plug", tone: 1 },
  { id: "stationery", ar: "مكتبة ومدرسة", en: "Stationery & School", icon: "book", tone: 2 },
  { id: "pets", ar: "مستلزمات الحيوانات", en: "Pet Supplies", icon: "paw", tone: 5 },
  { id: "gifts", ar: "ورد وهدايا", en: "Flowers & Gifts", icon: "flower", tone: 8 },
  { id: "auto", ar: "احتياجات العربية", en: "Automotive Essentials", icon: "car", tone: 6 },
  { id: "local", ar: "منتجات بلدنا", en: "Local Specialties", icon: "home", tone: 2 },
  { id: "deals", ar: "عروض وباقات", en: "Deals & Bundles", icon: "tag", tone: 4 },
];
/* categories per department (customer-facing level 2) */
D.cats = {
  grocery: [["rice", "أرز", "Rice"], ["pasta", "مكرونة", "Pasta"], ["pulses", "بقوليات", "Pulses"], ["flour", "دقيق وسكر وملح", "Flour, sugar & salt"], ["oil", "زيوت وسمن", "Oils & ghee"], ["spices", "توابل وصلصات", "Spices & sauces"], ["canned", "معلبات", "Canned food"], ["breakfast", "فطار", "Breakfast"], ["tea", "شاي وقهوة", "Tea & coffee"], ["nuts", "مكسرات وعطارة", "Nuts & dried fruit"]],
  produce: [["veg", "خضار", "Vegetables"], ["fruit", "فاكهة", "Fruits"], ["herbs", "ورقيات وأعشاب", "Leafy greens & herbs"], ["bundles", "باقات اليوم", "Daily bundles"]],
  dairy: [["milk", "لبن", "Milk"], ["yogurt", "زبادي", "Yogurt"], ["cheese", "جبن", "Cheese"], ["butter", "زبدة وقشطة", "Butter & cream"], ["eggs", "بيض", "Eggs"]],
  meat: [["beef", "لحم بقري", "Beef"], ["poultry", "فراخ", "Poultry"], ["seafood", "أسماك", "Seafood"], ["processed", "لحوم مصنعة", "Processed meat"]],
  bakery: [["bread", "عيش", "Bread"], ["toast", "توست", "Toast"], ["pastry", "معجنات وكيك", "Pastries & cakes"], ["biscuits", "بسكويت وكعك", "Biscuits"]],
  food: [["breakfast", "فطار", "Breakfast"], ["egyptian", "أكل مصري", "Egyptian"], ["grill", "مشويات", "Grill"], ["koshary", "كشري", "Koshary"], ["pizza", "بيتزا وفطير", "Pizza & feteer"], ["chicken", "فراخ مقلية", "Fried chicken"], ["seafood", "أسماك", "Seafood"], ["cafe", "كافيهات وعصاير", "Cafes & juice"], ["desserts", "حلويات", "Desserts"]],
  water: [["water", "مياه", "Water"], ["soft", "مشروبات غازية", "Soft drinks"], ["juice", "عصائر", "Juice"], ["energy", "مشروبات طاقة", "Energy drinks"], ["malt", "مشروبات شعير", "Malt drinks"]],
  snacks: [["chips", "شيبسي", "Chips"], ["biscuits", "بسكويت", "Biscuits"], ["chocolate", "شوكولاتة", "Chocolate"], ["candy", "حلويات ولبان", "Candy & gum"], ["icecream", "آيس كريم", "Ice cream"], ["traditional", "حلويات شرقية", "Traditional sweets"]],
  frozen: [["veg", "خضار مجمدة", "Frozen vegetables"], ["chicken", "فراخ مجمدة", "Frozen chicken"], ["ready", "وجبات جاهزة", "Ready meals"]],
  cleaning: [["laundry", "غسيل", "Laundry"], ["dish", "أطباق", "Dishwashing"], ["surface", "أرضيات وأسطح", "Floor & surface"], ["paper", "مناديل وورقيات", "Tissues & paper"], ["insect", "مبيدات", "Insect control"]],
  care: [["hair", "شعر", "Hair"], ["bath", "صابون واستحمام", "Bath & soap"], ["oral", "عناية بالفم", "Oral care"], ["shaving", "حلاقة", "Shaving"], ["deo", "مزيل عرق", "Deodorant"], ["fem", "عناية نسائية", "Feminine care"]],
  beauty: [["skin", "عناية بالبشرة", "Skin care"], ["makeup", "مكياج", "Makeup"], ["fragrance", "عطور", "Fragrance"]],
  pharmacy: [["pain", "مسكنات وبرد", "Pain & cold"], ["vitamins", "فيتامينات", "Vitamins"], ["firstaid", "إسعافات أولية", "First aid"], ["devices", "أجهزة ومستلزمات", "Medical supplies"], ["rx", "أدوية بروشتة", "Prescription"]],
  baby: [["diapers", "حفاضات ومناديل", "Diapers & wipes"], ["feeding", "أكل ورضاعة", "Baby food & feeding"], ["babycare", "عناية بالطفل", "Baby care"]],
  home: [["cookware", "أدوات طبخ", "Cookware"], ["storage", "حفظ الأكل", "Food storage"], ["disposable", "أطباق وأكواب للاستخدام مرة", "Disposable tableware"]],
  electronics: [["chargers", "شواحن وكابلات", "Chargers & cables"], ["audio", "سماعات", "Earphones"], ["power", "باور بانك وبطاريات", "Power banks & batteries"]],
  stationery: [["writing", "أقلام", "Pens & pencils"], ["notebooks", "كشاكيل وورق", "Notebooks & paper"], ["school", "أدوات مدرسية", "School tools"]],
  pets: [["cat", "قطط", "Cats"], ["dog", "كلاب", "Dogs"], ["birds", "طيور", "Birds"]],
  gifts: [["flowers", "ورد", "Flowers"], ["giftset", "هدايا", "Gift bundles"]],
  auto: [["carclean", "تنظيف العربية", "Car cleaning"], ["caracc", "إكسسوارات", "Accessories"]],
  local: [["ldairy", "ألبان بلدي", "Local dairy"], ["lbakery", "مخبوزات بلدي", "Local bakery"], ["lfarm", "من المزرعة", "From the farm"]],
  deals: [["weekly", "سلة الأسبوع", "Weekly basket"], ["family", "باقات العيلة", "Family bundles"], ["under", "أقل من 50 ج.م", "Under EGP 50"]],
};

/* ------------------------------------------------------------------ master catalogue -------------------------------------------- */
/* row: [dept, cat, sub, family/ar name, en, brand, size, unit, price, opts]
   opts: al aliases (comma) · t temp a|c|f|h · fr fragile · rg regulated · age · sl shelf-life days · v variable weight · sg substitution group · old promo-was price · hub sold at Twaa hub (default true for core grocery) */
const C = [
 ["grocery","rice","أرز مصري","أرز الضحى مصري","Al Doha Egyptian Rice","الضحى","1 كجم","كجم",42,{al:"رز,ارز,الضحي",sg:"rice-1kg",old:46}],
 ["grocery","rice","أرز مصري","أرز الساعة مصري","El Saa Egyptian Rice","الساعة","1 كجم","كجم",40,{al:"رز,ساعه",sg:"rice-1kg"}],
 ["grocery","rice","أرز بسمتي","أرز بسمتي هندي","Indian Basmati Rice","الضحى","1 كجم","كجم",95,{al:"بسمتى,رز بسمتي"}],
 ["grocery","pasta","مكرونة","مكرونة الملكة مرمرية","El Malika Pasta","الملكة","400 جم","جم",17,{al:"مكرونه,ملكه,شعرية",sg:"pasta-400"}],
 ["grocery","pasta","مكرونة","مكرونة ريجينا قلم","Regina Penne","ريجينا","400 جم","جم",19,{al:"مكرونه,ريجينا,قلم",sg:"pasta-400"}],
 ["grocery","pasta","شعرية","شعرية الملكة","El Malika Vermicelli","الملكة","350 جم","جم",15,{al:"شعريه"}],
 ["grocery","pulses","عدس","عدس أصفر مجروش","Split Yellow Lentils","الضحى","500 جم","جم",38,{al:"عدس,شوربه"}],
 ["grocery","pulses","فول","فول مدمس معلب الأمريكانا","Americana Foul Medames","أمريكانا","400 جم","جم",21,{al:"فول,فول معلب,مدمس",sg:"foul-can"}],
 ["grocery","pulses","فاصوليا","فاصوليا بيضاء","White Beans","الضحى","500 جم","جم",45,{}],
 ["grocery","flour","سكر","سكر الأسرة","El Osra Sugar","الأسرة","1 كجم","كجم",36,{al:"سكر,سكّر",sg:"sugar-1kg"}],
 ["grocery","flour","دقيق","دقيق الضحى فاخر","Al Doha Flour","الضحى","1 كجم","كجم",30,{al:"دقيق,طحين"}],
 ["grocery","flour","ملح","ملح إيموتا","Emisal Salt","إيموتا","1 كجم","كجم",8,{al:"ملح"}],
 ["grocery","oil","زيت","زيت عافية عباد الشمس","Afia Sunflower Oil","عافية","800 مل","مل",82,{al:"زيت,عافيه,زيت طبخ",sg:"oil-800",old:89}],
 ["grocery","oil","زيت","زيت كريستال خليط","Crystal Mixed Oil","كريستال","1 لتر","لتر",76,{al:"زيت,كريستال",sg:"oil-800"}],
 ["grocery","oil","سمن","سمن بلدي الهانم","El Hanem Ghee","الهانم","700 جم","جم",165,{al:"سمنه,سمن بلدي"}],
 ["grocery","spices","صلصة","صلصة هاينز","Heinz Tomato Paste","هاينز","360 جم","جم",26,{al:"صلصه,معجون طماطم",sg:"paste"}],
 ["grocery","spices","كمون","كمون مطحون","Ground Cumin","العطار","100 جم","جم",22,{al:"كمون"}],
 ["grocery","spices","بهارات","بهارات كاملة للمحشي","Mahshi Spice Mix","العطار","100 جم","جم",25,{}],
 ["grocery","canned","تونة","تونة صن شاين قطع","Sunshine Tuna Chunks","صن شاين","185 جم","جم",58,{al:"تونه,تونا",sg:"tuna"}],
 ["grocery","canned","تونة","تونة دولفين","Dolphin Tuna","دولفين","160 جم","جم",49,{al:"تونه",sg:"tuna"}],
 ["grocery","canned","ذرة","ذرة حلوة كاليفورنيا جاردن","California Garden Sweet Corn","كاليفورنيا جاردن","340 جم","جم",35,{al:"دره,ذره"}],
 ["grocery","breakfast","حلاوة","حلاوة طحينية الرشيدي الميزان","El Rashidi Halawa","الرشيدي الميزان","500 جم","جم",68,{al:"حلاوه,طحينيه"}],
 ["grocery","breakfast","مربى","مربى فراولة فيتراك","Vitrac Strawberry Jam","فيتراك","430 جم","جم",45,{al:"مربي,مربة"}],
 ["grocery","breakfast","عسل","عسل نحل إيمتنان","Imtenan Bee Honey","إيمتنان","500 جم","جم",120,{al:"عسل"}],
 ["grocery","breakfast","حبوب","كورن فليكس كيلوجز","Kellogg's Corn Flakes","كيلوجز","375 جم","جم",95,{al:"كورن فليكس,سيريال"}],
 ["grocery","tea","شاي","شاي العروسة","El Arosa Tea","العروسة","250 جم","جم",48,{al:"شاي,عروسه",sg:"tea-250",old:52}],
 ["grocery","tea","شاي","شاي ليبتون فتلة","Lipton Tea Bags","ليبتون","100 فتلة","عبوة",95,{al:"شاي,ليبتون",sg:"tea-250"}],
 ["grocery","tea","قهوة","قهوة بن البرازيلي محوج","Brazilian Coffee with Cardamom","البرازيلي","200 جم","جم",115,{al:"قهوه,بن"}],
 ["grocery","tea","نسكافيه","نسكافيه كلاسيك","Nescafé Classic","نسكافيه","95 جم","جم",130,{al:"نسكافيه,قهوة سريعة"}],
 ["grocery","nuts","مكسرات","سوداني محمص","Roasted Peanuts","العطار","250 جم","جم",40,{al:"سوداني,فول سوداني"}],
 ["grocery","nuts","بلح","بلح سيوي","Siwa Dates","سيوة","1 كجم","كجم",85,{al:"تمر,بلح"}],
 ["produce","veg","طماطم","طماطم","Tomatoes","مزارع البحيرة","1 كجم","كجم",18,{al:"قوطه,طماطم,اوطه",v:1,t:"a",sl:5,sg:"tomato",hub:1}],
 ["produce","veg","خيار","خيار بلدي","Local Cucumbers","مزارع البحيرة","1 كجم","كجم",22,{al:"خيار",v:1,sl:5,hub:1}],
 ["produce","veg","بطاطس","بطاطس","Potatoes","مزارع البحيرة","1 كجم","كجم",20,{al:"بطاطس,بطاطا",v:1,sl:14,hub:1}],
 ["produce","veg","بصل","بصل أحمر","Red Onions","مزارع البحيرة","1 كجم","كجم",16,{al:"بصل",v:1,sl:20,hub:1}],
 ["produce","veg","فلفل","فلفل رومي ألوان","Mixed Bell Peppers","مزارع البحيرة","500 جم","جم",30,{al:"فلفل,رومي",v:1,sl:6}],
 ["produce","veg","كوسة","كوسة","Zucchini","مزارع البحيرة","1 كجم","كجم",24,{al:"كوسه",v:1,sl:5}],
 ["produce","veg","باذنجان","باذنجان رومي","Eggplant","مزارع البحيرة","1 كجم","كجم",20,{al:"بتنجان,باذنجان",v:1,sl:6}],
 ["produce","fruit","موز","موز بلدي","Local Bananas","مزارع البحيرة","1 كجم","كجم",35,{al:"موز",v:1,sl:5,hub:1}],
 ["produce","fruit","برتقال","برتقال بلدي","Local Oranges","مزارع البحيرة","1 كجم","كجم",25,{al:"برتقان,برتقال",v:1,sl:12}],
 ["produce","fruit","تفاح","تفاح أحمر مستورد","Imported Red Apples","مستورد","1 كجم","كجم",95,{al:"تفاح",v:1,sl:20}],
 ["produce","fruit","جوافة","جوافة","Guava","مزارع البحيرة","1 كجم","كجم",30,{al:"جوافه",v:1,sl:5}],
 ["produce","fruit","عنب","عنب بناتي","Seedless Grapes","مزارع البحيرة","1 كجم","كجم",45,{al:"عنب",v:1,sl:5}],
 ["produce","herbs","جرجير","جرجير","Rocket","مزارع البحيرة","حزمة","حزمة",5,{al:"جرجير",sl:2}],
 ["produce","herbs","بقدونس","بقدونس","Parsley","مزارع البحيرة","حزمة","حزمة",4,{al:"بقدونس,بقدونسى",sl:3}],
 ["produce","herbs","ليمون","ليمون بلدي","Local Limes","مزارع البحيرة","500 جم","جم",20,{al:"لمون,ليمون",v:1,sl:10}],
 ["produce","bundles","سلطة اليوم","سلطة اليوم (طماطم، خيار، جرجير، ليمون)","Salad of the day bundle","توّا","باقة","باقة",49,{al:"سلطه",sl:2}],
 ["produce","bundles","طبخة اليوم","طبخة اليوم: محشي كوسة وباذنجان","Today's cook: mahshi bundle","توّا","باقة","باقة",95,{al:"محشي",sl:2}],
 ["produce","bundles","خضار الأسبوع","خضار الأسبوع للعيلة (5 كجم)","Weekly family veg box","توّا","5 كجم","باقة",115,{al:"خضار الاسبوع",sl:4}],
 ["dairy","milk","لبن كامل الدسم","لبن جهينة كامل الدسم","Juhayna Full Cream Milk","جهينة","1 لتر","لتر",44,{al:"لبن,حليب,جهينه",t:"c",sl:7,sg:"milk-1l",old:52}],
 ["dairy","milk","لبن كامل الدسم","لبن المراعي كامل الدسم","Almarai Full Fat Milk","المراعي","1 لتر","لتر",45,{al:"لبن,حليب,مراعي",t:"c",sl:7,sg:"milk-1l"}],
 ["dairy","milk","لبن خالي الدسم","لبن جهينة خالي الدسم","Juhayna Skimmed Milk","جهينة","1 لتر","لتر",46,{al:"لبن لايت,خالى",t:"c",sl:7}],
 ["dairy","yogurt","زبادي","زبادي جهينة","Juhayna Yogurt","جهينة","105 جم","جم",8,{al:"زبادى,روب",t:"c",sl:14,sg:"yogurt"}],
 ["dairy","yogurt","زبادي","زبادي المراعي","Almarai Yogurt","المراعي","170 جم","جم",12,{al:"زبادى",t:"c",sl:14,sg:"yogurt"}],
 ["dairy","yogurt","رايب","لبن رايب بخيره","Bekhero Rayeb","بخيره","850 مل","مل",30,{al:"رايب",t:"c",sl:7}],
 ["dairy","cheese","جبنة بيضاء","جبنة دومتي فيتا","Domty Feta","دومتي","500 جم","جم",62,{al:"جبنه بيضا,دومتى",t:"c",sl:30,sg:"white-cheese",old:70}],
 ["dairy","cheese","جبنة بيضاء","جبنة بريزيدنت فيتا","Président Feta","بريزيدنت","500 جم","جم",68,{al:"جبنه",t:"c",sl:30,sg:"white-cheese"}],
 ["dairy","cheese","جبنة رومي","جبنة رومي قديمة","Aged Roumy Cheese","الأمل","250 جم","جم",75,{al:"رومى,جبنه رومي",t:"c",sl:60}],
 ["dairy","cheese","جبنة مثلثات","جبنة لافاش كيري","La Vache qui rit Triangles","لافاش كيري","8 قطع","عبوة",55,{al:"بقرة ضاحكة,مثلثات",t:"c",sl:90}],
 ["dairy","butter","زبدة","زبدة لورباك","Lurpak Butter","لورباك","200 جم","جم",110,{al:"زبده",t:"c",sl:60}],
 ["dairy","butter","قشطة","قشطة بخيره","Bekhero Cream","بخيره","200 جم","جم",30,{al:"قشطه",t:"c",sl:10}],
 ["dairy","eggs","بيض","بيض أبيض","White Eggs","مزارع الوادي","30 بيضة","طبق",165,{al:"بيض,كرتونة بيض",t:"a",fr:1,sl:21,sg:"eggs"}],
 ["dairy","eggs","بيض","بيض بلدي","Baladi Eggs","مزارع الطيرية","12 بيضة","عبوة",78,{al:"بيض بلدى",fr:1,sl:21,sg:"eggs"}],
 ["meat","beef","لحم","لحم بقري كندوز","Beef (kandouz)","جزارة الحاج سعيد","1 كجم","كجم",420,{al:"لحمه,لحم",t:"c",v:1,sl:3,hub:0}],
 ["meat","beef","لحم مفروم","لحم مفروم بلدي","Minced beef","جزارة الحاج سعيد","500 جم","جم",215,{al:"مفروم,لحمه مفرومه",t:"c",v:1,sl:2,hub:0}],
 ["meat","beef","كبدة","كبدة بقري","Beef liver","جزارة الحاج سعيد","500 جم","جم",190,{al:"كبده",t:"c",v:1,sl:2,hub:0}],
 ["meat","poultry","فراخ","فرخة بلدي كاملة","Whole baladi chicken","مزارع الطيرية","حوالي 1.5 كجم","كجم",165,{al:"فرخه,دجاج",t:"c",v:1,sl:2,hub:0}],
 ["meat","poultry","صدور","صدور فراخ","Chicken breasts","الوطنية","1 كجم","كجم",230,{al:"صدور,فيليه",t:"c",sl:3,hub:0}],
 ["meat","poultry","أوراك","أوراك فراخ","Chicken thighs","الوطنية","1 كجم","كجم",150,{al:"اوراك",t:"c",sl:3,hub:0}],
 ["meat","seafood","سمك","سمك بلطي","Tilapia","سمك الصياد","1 كجم","كجم",95,{al:"بلطى,سمك",t:"c",v:1,sl:1,hub:0}],
 ["meat","seafood","جمبري","جمبري وسط","Medium shrimp","سمك الصياد","500 جم","جم",260,{al:"جمبرى",t:"f",sl:1,hub:0}],
 ["meat","processed","لانشون","لانشون حلواني","Halwani Luncheon","حلواني","250 جم","جم",48,{al:"لانشون",t:"c",sl:30}],
 ["meat","processed","سوسيس","سوسيس كوكي","Koki Sausage","كوكي","400 جم","جم",85,{al:"سوسيس",t:"f",sl:90}],
 ["bakery","bread","عيش بلدي","عيش بلدي طازة","Fresh baladi bread","مخبز الأمانة","10 أرغفة","عبوة",15,{al:"عيش,خبز,بلدي",sl:1,sg:"bread",hub:0}],
 ["bakery","bread","عيش فينو","عيش فينو","Fino bread","مخبز الأمانة","10 قطع","عبوة",25,{al:"فينو,عيش فينو",sl:2,sg:"bread"}],
 ["bakery","toast","توست","توست ريتش بيك أبيض","Rich Bake White Toast","ريتش بيك","600 جم","جم",38,{al:"توست,عيش توست",sl:7,sg:"toast",old:45}],
 ["bakery","toast","توست","توست ريتش بيك بر","Rich Bake Brown Toast","ريتش بيك","600 جم","جم",42,{al:"توست بر,توست اسمر",sl:7,sg:"toast"}],
 ["bakery","pastry","كرواسون","كرواسون مولتو","Molto Croissant","مولتو","6 قطع","عبوة",30,{al:"مولتو,كرواسون",sl:30}],
 ["bakery","pastry","كيك","كيك تودو","Todo Cake","تودو","12 قطعة","عبوة",40,{al:"كيك,تودو",sl:45}],
 ["bakery","biscuits","كعك","كعك بالسمسم","Sesame kaak","مخبز الأمانة","500 جم","جم",45,{al:"كعك,قرص",sl:20,hub:0}],
 ["water","water","مياه","مياه نستله","Nestlé Pure Life Water","نستله","1.5 لتر","لتر",9,{al:"مايه,مياه,ميه",sg:"water-1.5"}],
 ["water","water","مياه","مياه أكوافينا","Aquafina Water","أكوافينا","1.5 لتر","لتر",9,{al:"مايه,اكوافينا",sg:"water-1.5"}],
 ["water","water","مياه","كرتونة مياه نستله","Nestlé Water carton","نستله","12 × 600 مل","كرتونة",72,{al:"كرتونه مايه"}],
 ["water","soft","كولا","بيبسي","Pepsi","بيبسي","1 لتر","لتر",20,{al:"بيبسى,كولا,حاجه ساقعه",sg:"cola-1l"}],
 ["water","soft","كولا","كوكاكولا","Coca-Cola","كوكاكولا","1 لتر","لتر",20,{al:"كوكا,كولا",sg:"cola-1l"}],
 ["water","soft","مشروب غازي","سبرايت","Sprite","سبرايت","1 لتر","لتر",20,{al:"سبرايت,سفن"}],
 ["water","juice","عصير","عصير جهينة مانجو","Juhayna Mango Juice","جهينة","1 لتر","لتر",42,{al:"عصير,مانجه",t:"a",sg:"juice-1l"}],
 ["water","juice","عصير","عصير بيتي جوافة","Beyti Guava Juice","بيتي","1 لتر","لتر",40,{al:"عصير جوافه",sg:"juice-1l"}],
 ["water","energy","مشروب طاقة","ريد بول","Red Bull","ريد بول","250 مل","مل",45,{al:"ريدبول,طاقه",age:16}],
 ["water","malt","شعير","بيريل تفاح","Birell Apple","بيريل","330 مل","مل",18,{al:"بيريل,شعير"}],
 ["snacks","chips","شيبسي","شيبسي ملح","Chipsy Salted","شيبسي","عائلي","عبوة",15,{al:"شبسي,شيبسى,شيبس",sg:"chips"}],
 ["snacks","chips","شيبسي","شيبسي طماطم","Chipsy Tomato","شيبسي","عائلي","عبوة",15,{al:"شبسي",sg:"chips"}],
 ["snacks","chips","دوريتوس","دوريتوس جبنة","Doritos Cheese","دوريتوس","عائلي","عبوة",20,{al:"دوريتس",sg:"chips"}],
 ["snacks","biscuits","بسكويت","بسكويت أولكر","Ülker Biscuits","أولكر","6 قطع","عبوة",15,{al:"بسكوت,اولكر"}],
 ["snacks","biscuits","بسكويت","بيمبو شوكولاتة","Bimbo Chocolate","بيمبو","عبوة","عبوة",10,{al:"بيمبو"}],
 ["snacks","chocolate","شوكولاتة","كادبوري ديري ميلك","Cadbury Dairy Milk","كادبوري","90 جم","جم",50,{al:"شوكولاته,كادبورى",sg:"choc-bar"}],
 ["snacks","chocolate","شوكولاتة","جالاكسي","Galaxy","جالاكسي","80 جم","جم",45,{al:"جلاكسي",sg:"choc-bar"}],
 ["snacks","chocolate","شوكولاتة","كيت كات","KitKat","نستله","4 أصابع","عبوة",25,{al:"كتكات"}],
 ["snacks","candy","لبان","لبان تريدنت","Trident Gum","تريدنت","عبوة","عبوة",15,{al:"لبان,علكه"}],
 ["snacks","icecream","آيس كريم","آيس كريم نستله كورنيتو","Nestlé Cornetto","نستله","قطعة","قطعة",25,{al:"ايس كريم,جيلاتي",t:"f"}],
 ["snacks","icecream","آيس كريم","آيس كريم إيجلو عائلي","Igloo Family Tub","إيجلو","1 لتر","لتر",95,{al:"ايس كريم",t:"f"}],
 ["snacks","traditional","بسبوسة","بسبوسة بالقشطة","Basbousa with cream","حلواني الشامي","1 كجم","كجم",140,{al:"بسبوسه",sl:3,hub:0}],
 ["snacks","traditional","كنافة","كنافة بالمكسرات","Kunafa with nuts","حلواني الشامي","1 كجم","كجم",180,{al:"كنافه",sl:3,hub:0}],
 ["frozen","veg","بسلة","بسلة مجمدة","Frozen peas","إيجيبت فودز","400 جم","جم",30,{al:"بسله",t:"f"}],
 ["frozen","veg","ملوخية","ملوخية مجمدة","Frozen molokhia","إيجيبت فودز","400 جم","جم",28,{al:"ملوخيه",t:"f"}],
 ["frozen","veg","بطاطس","بطاطس فارم فريتس","Farm Frites fries","فارم فريتس","1 كجم","كجم",85,{al:"بطاطس محمرة,فرايز",t:"f"}],
 ["frozen","chicken","بانيه","بانيه الوطنية","El Watania Pané","الوطنية","400 جم","جم",115,{al:"بانيه",t:"f"}],
 ["frozen","chicken","ناجتس","ناجتس كوكي","Koki Nuggets","كوكي","400 جم","جم",110,{al:"ناجتس",t:"f"}],
 ["frozen","ready","بيتزا","بيتزا مجمدة هالواني","Frozen pizza","حلواني","2 قطعة","عبوة",95,{al:"بيتزا",t:"f"}],
 ["cleaning","laundry","مسحوق غسيل","برسيل أوتوماتيك","Persil Automatic","برسيل","2.5 كجم","كجم",210,{al:"برسيل,مسحوق,صابون غسيل",sg:"laundry",fr:0,old:230}],
 ["cleaning","laundry","مسحوق غسيل","أريال أوتوماتيك","Ariel Automatic","أريال","2.5 كجم","كجم",205,{al:"اريال",sg:"laundry"}],
 ["cleaning","laundry","منعم","داوني منعم","Downy Softener","داوني","1 لتر","لتر",95,{al:"داونى,منعم"}],
 ["cleaning","dish","سائل أطباق","فيري ليمون","Fairy Lemon","فيري","650 مل","مل",48,{al:"فيرى,صابون مواعين",sg:"dish"}],
 ["cleaning","dish","سائل أطباق","بريل","Pril","بريل","650 مل","مل",45,{al:"بريل",sg:"dish"}],
 ["cleaning","surface","كلور","كلوركس","Clorox Bleach","كلوركس","1 لتر","لتر",38,{al:"كلور,كلوركس"}],
 ["cleaning","surface","منظف أرضيات","ديتول منظف أرضيات","Dettol Floor Cleaner","ديتول","1 لتر","لتر",85,{al:"ديتول"}],
 ["cleaning","paper","مناديل","مناديل فاين","Fine Tissues","فاين","5 علب","عبوة",95,{al:"مناديل,كلينكس",sg:"tissue"}],
 ["cleaning","paper","مناديل","مناديل زينة","Zeina Tissues","زينة","5 علب","عبوة",82,{al:"مناديل",sg:"tissue"}],
 ["cleaning","paper","أكياس","أكياس قمامة","Garbage bags","سنو","30 كيس","عبوة",35,{al:"اكياس زباله"}],
 ["cleaning","insect","مبيد","ريد مبيد حشرات","Raid Insect Spray","ريد","300 مل","مل",95,{al:"ريد,مبيد,بف باف"}],
 ["care","hair","شامبو","شامبو بانتين","Pantene Shampoo","بانتين","400 مل","مل",115,{al:"شامبو,بانتين",sg:"shampoo"}],
 ["care","hair","شامبو","شامبو هيد آند شولدرز","Head & Shoulders","هيد آند شولدرز","400 مل","مل",125,{al:"هيد اند شولدرز",sg:"shampoo"}],
 ["care","bath","صابون","صابون لوكس","Lux Soap","لوكس","4 قطع","عبوة",55,{al:"صابون,لوكس",sg:"soap"}],
 ["care","bath","صابون","صابون ديتول","Dettol Soap","ديتول","4 قطع","عبوة",65,{al:"صابون ديتول",sg:"soap"}],
 ["care","oral","معجون أسنان","سيجنال معجون","Signal Toothpaste","سيجنال","100 مل","مل",45,{al:"معجون,سيجنال",sg:"paste-tooth"}],
 ["care","oral","فرشاة أسنان","فرشاة أورال بي","Oral-B Toothbrush","أورال بي","قطعة","قطعة",40,{al:"فرشاه"}],
 ["care","shaving","أمواس","جيليت بلو 3","Gillette Blue 3","جيليت","4 أمواس","عبوة",95,{al:"امواس,جيليت"}],
 ["care","deo","مزيل عرق","ريكسونا رول","Rexona Roll-on","ريكسونا","50 مل","مل",75,{al:"مزيل,ريكسونا"}],
 ["care","fem","فوط صحية","أولويز","Always","أولويز","16 قطعة","عبوة",70,{al:"فوط,اولويز"}],
 ["beauty","skin","كريم","كريم نيفيا","Nivea Crème","نيفيا","150 مل","مل",95,{al:"نيفيا,كريم"}],
 ["beauty","skin","واقي شمس","واقي شمس سيبامد","Sebamed Sunscreen","سيبامد","75 مل","مل",320,{al:"صن بلوك"}],
 ["beauty","makeup","روج","روج ميبلين","Maybelline Lipstick","ميبلين","قطعة","قطعة",210,{al:"روج,احمر شفايف"}],
 ["beauty","fragrance","برفان","برفان ليدي","Eau de toilette (women)","أوريفليم","50 مل","مل",350,{al:"برفان,عطر"}],
 ["pharmacy","pain","مسكن","بانادول إكسترا","Panadol Extra","بانادول","24 قرص","علبة",48,{al:"بانادول,مسكن,صداع",hub:0,sg:"painkiller"}],
 ["pharmacy","pain","مسكن","كونجستال","Congestal","سيجما","20 قرص","علبة",38,{al:"كونجستال,برد",hub:0}],
 ["pharmacy","pain","مسكن","بروفين 400","Brufen 400","أبوت","30 قرص","علبة",55,{al:"بروفين",hub:0,sg:"painkiller"}],
 ["pharmacy","vitamins","فيتامين","فيتامين سي 1000 فوار","Vitamin C 1000 effervescent","سيدكو","20 قرص","علبة",65,{al:"فيتامين سي,فوار",hub:0}],
 ["pharmacy","vitamins","فيتامين","أوميجا 3","Omega 3","سيدكو","30 كبسولة","علبة",180,{al:"اوميجا",hub:0}],
 ["pharmacy","firstaid","بلاستر","بلاستر يونيبلاست","Uniplast Plasters","يونيبلاست","20 قطعة","علبة",25,{al:"بلاستر,لزق",hub:0}],
 ["pharmacy","firstaid","مطهر","بيتادين محلول","Betadine Solution","بيتادين","120 مل","مل",45,{al:"بيتادين,مطهر",hub:0}],
 ["pharmacy","devices","جهاز ضغط","جهاز قياس ضغط ديجيتال","Digital BP monitor","أومرون","قطعة","قطعة",1650,{al:"جهاز ضغط",hub:0,fr:1}],
 ["pharmacy","devices","ترمومتر","ترمومتر ديجيتال","Digital thermometer","مايكرولايف","قطعة","قطعة",120,{al:"ترمومتر,مقياس حرارة",hub:0}],
 ["pharmacy","rx","مضاد حيوي","أوجمنتين 1 جم (بروشتة)","Augmentin 1g (prescription)","جلاكسو","14 قرص","علبة",140,{al:"اوجمنتين,مضاد حيوي",hub:0,rg:1}],
 ["baby","diapers","حفاضات","بامبرز مقاس 4","Pampers Size 4","بامبرز","44 قطعة","عبوة",420,{al:"بامبرز,حفاض,بمبرز",sg:"diaper-4",old:460}],
 ["baby","diapers","حفاضات","مولفكس مقاس 4","Molfix Size 4","مولفكس","48 قطعة","عبوة",360,{al:"مولفيكس,حفاض",sg:"diaper-4"}],
 ["baby","diapers","مناديل مبللة","مناديل بامبرز مبللة","Pampers Wipes","بامبرز","64 قطعة","عبوة",85,{al:"مناديل مبلوله"}],
 ["baby","feeding","لبن أطفال","بيبيلاك 1","Bebelac 1","بيبيلاك","400 جم","جم",290,{al:"لبن اطفال,بيبلاك",hub:0}],
 ["baby","feeding","سيريلاك","سيريلاك قمح باللبن","Cerelac Wheat","نستله","250 جم","جم",95,{al:"سيرلاك"}],
 ["baby","babycare","شامبو أطفال","شامبو جونسون أطفال","Johnson's Baby Shampoo","جونسون","300 مل","مل",95,{al:"جونسون"}],
 ["home","cookware","حلة","حلة ألومنيوم 24 سم","Aluminium pot 24 cm","أدوات البركة","قطعة","قطعة",280,{al:"حله,طاسة",fr:0,hub:0}],
 ["home","storage","ورق ألومنيوم","ورق ألومنيوم فاين","Aluminium foil","فاين","10 متر","عبوة",45,{al:"ورق فويل,سلوفان"}],
 ["home","storage","علب حفظ","علب حفظ بلاستيك 3 قطع","Food storage boxes ×3","أدوات البركة","3 قطع","عبوة",85,{al:"علب",hub:0}],
 ["home","disposable","أطباق فوم","أطباق فوم","Foam plates","سنو","25 طبق","عبوة",30,{al:"اطباق فوم"}],
 ["home","disposable","أكواب ورق","أكواب ورقية","Paper cups","سنو","50 كوب","عبوة",35,{al:"اكواب ورق"}],
 ["electronics","chargers","شاحن","شاحن سريع تايب سي 20 وات","20W USB-C fast charger","أنكر","قطعة","قطعة",450,{al:"شاحن,تايب سي",sg:"charger"}],
 ["electronics","chargers","كابل","كابل تايب سي","USB-C cable","أنكر","1 متر","قطعة",180,{al:"كابل,وصلة"}],
 ["electronics","chargers","كابل","كابل لايتننج","Lightning cable","ميكسيت","1 متر","قطعة",220,{al:"كابل ايفون"}],
 ["electronics","audio","سماعة","سماعة سلك","Wired earphones","سامسونج","قطعة","قطعة",150,{al:"سماعه,هاندفري"}],
 ["electronics","audio","سماعة","سماعة بلوتوث","Bluetooth earbuds","أوراكس","قطعة","قطعة",650,{al:"سماعه بلوتوث,ايربودز",hub:0}],
 ["electronics","power","باور بانك","باور بانك 10000","Power bank 10,000 mAh","أنكر","قطعة","قطعة",750,{al:"باور بانك,شاحن متنقل",hub:0}],
 ["electronics","power","بطاريات","بطاريات دوراسيل AA","Duracell AA","دوراسيل","4 قطع","عبوة",85,{al:"بطاريات,حجارة"}],
 ["stationery","writing","قلم","أقلام بيك جاف أزرق","BIC blue pens","بيك","10 أقلام","عبوة",50,{al:"قلم,اقلام جاف"}],
 ["stationery","writing","قلم رصاص","أقلام رصاص فابر كاستل","Faber-Castell pencils","فابر كاستل","12 قلم","عبوة",60,{al:"رصاص"}],
 ["stationery","notebooks","كشكول","كشكول 60 ورقة","Notebook 60 sheets","سلوان","قطعة","قطعة",18,{al:"كشكول,كراسه"}],
 ["stationery","notebooks","ورق تصوير","ورق تصوير A4","A4 copy paper","دبل إيه","500 ورقة","رزمة",320,{al:"ورق a4,رزمه",hub:0}],
 ["stationery","school","أدوات","مسطرة وبراية وأستيكة","Ruler, sharpener & eraser set","فابر كاستل","طقم","طقم",35,{al:"استيكه,براية"}],
 ["pets","cat","أكل قطط","أكل قطط ويسكاس","Whiskas cat food","ويسكاس","1.2 كجم","كجم",320,{al:"ويسكاس,اكل قطط"}],
 ["pets","cat","رمل قطط","رمل قطط","Cat litter","كات ستار","5 لتر","عبوة",140,{al:"رمل",hub:0}],
 ["pets","dog","أكل كلاب","أكل كلاب بيديجري","Pedigree dog food","بيديجري","1.5 كجم","كجم",380,{al:"بيديجري",hub:0}],
 ["pets","birds","أكل طيور","حبوب عصافير","Bird seed mix","بيت الحيوانات","1 كجم","كجم",60,{al:"عصافير",hub:0}],
 ["gifts","flowers","بوكيه","بوكيه ورد بلدي","Local rose bouquet","ورد ياسمين","بوكيه","قطعة",250,{al:"ورد,بوكيه",fr:1,sl:3,hub:0}],
 ["gifts","giftset","هدية","علبة شوكولاتة هدية","Chocolate gift box","ورد ياسمين","علبة","قطعة",320,{al:"هديه",hub:0}],
 ["auto","carclean","منظف","شامبو سيارات","Car shampoo","ترتل واكس","500 مل","مل",120,{al:"شامبو عربية",hub:0}],
 ["auto","caracc","حامل موبايل","حامل موبايل للعربية","Car phone holder","أوراكس","قطعة","قطعة",160,{al:"حامل,ستاند"}],
 ["local","ldairy","جبنة قريش","جبنة قريش فلاحي","Farm cottage cheese (areesh)","ألبان مزرعة الطيرية","500 جم","جم",45,{al:"قريش,جبنه قريش",t:"c",sl:4,loc:1,hub:0}],
 ["local","ldairy","لبن جاموسي","لبن جاموسي طازة","Fresh buffalo milk","ألبان مزرعة الطيرية","1 لتر","لتر",40,{al:"لبن جاموسي,لبن فلاحي",t:"c",sl:2,loc:1,hub:0,sg:"milk-1l"}],
 ["local","ldairy","زبدة فلاحي","زبدة فلاحي","Farm butter","ألبان مزرعة الطيرية","500 جم","جم",150,{al:"زبده بلدي",t:"c",sl:10,loc:1,hub:0}],
 ["local","lbakery","فطير","فطير مشلتت","Feteer meshaltet","فطاطري الريس","قطعة كبيرة","قطعة",120,{al:"مشلتت,فطير",sl:4,loc:1,hub:0}],
 ["local","lbakery","عيش","عيش شمسي بلدي","Sun-baked bread","مخبز الأمانة","5 أرغفة","عبوة",20,{al:"عيش شمسي",sl:2,loc:1,hub:0}],
 ["local","lfarm","عسل","عسل برسيم من المناحل","Clover honey (local apiary)","مناحل البحيرة","1 كجم","كجم",220,{al:"عسل نحل بلدي",loc:1,hub:0}],
 ["local","lfarm","بيض","بيض بلدي من المزرعة","Farm eggs","مزارع الطيرية","30 بيضة","طبق",190,{al:"بيض بلدي",fr:1,sl:21,loc:1,hub:0,sg:"eggs"}],
 ["deals","weekly","سلة الأسبوع","سلة الأسبوع (أرز، سكر، زيت، مكرونة، شاي)","Weekly staples basket","توّا","باقة","باقة",235,{al:"سله,باقة",old:262}],
 ["deals","family","فطار العيلة","باقة فطار العيلة (فول، بيض، جبنة، عيش)","Family breakfast bundle","توّا","باقة","باقة",185,{al:"فطار",old:205}],
 ["deals","family","باقة التنظيف","باقة التنظيف الشهرية","Monthly cleaning bundle","توّا","باقة","باقة",390,{al:"منظفات",old:438}],
 ["deals","under","توفير","باقة الطوارئ (مياه، شيبسي، بسكويت)","Emergency snack pack","توّا","باقة","باقة",45,{al:"سناكس"}],
];
/* stable keys for scenarios and docs (ids follow catalogue order) */
D.K = { rice: "SKU-10001", sugar: "SKU-10010", oil: "SKU-10013", tea: "SKU-10026", tomato: "SKU-10032", milk: "SKU-10050", milkAlmarai: "SKU-10051", feta: "SKU-10056", cream: "SKU-10061", eggs: "SKU-10063", baladiBread: "SKU-10074", fino: "SKU-10075", water: "SKU-10081", cola: "SKU-10085", chips: "SKU-10091", persil: "SKU-10110", panadol: "SKU-10134", vitc: "SKU-10137", augmentin: "SKU-10143", pampers: "SKU-10144", charger: "SKU-10155" };
const DEFAULT_HUB_DEPTS = new Set(["grocery", "dairy", "water", "snacks", "frozen", "cleaning", "care", "baby", "home", "electronics", "stationery", "pets", "bakery", "produce", "deals", "beauty", "auto"]);
D.skus = C.map((r, i) => {
  const [dept, cat, family, ar, en, brand, size, unit, price, o] = r;
  const id = `SKU-${10001 + i}`;
  return {
    id, ar, en, brand, dept, cat, sub: family, family: `${family} ${brand}`.trim(), size, unit, pack: /(\d+) (قطع|قطعة|أرغفة|بيضة|فتلة|أمواس|قلم|أقلام|كيس|طبق|كوب|علب)/.test(size) ? Number(size.match(/\d+/)[0]) : 1,
    barcode: `622${String(1000000000 + i * 7919).slice(-10)}`, aliases: (o.al || "").split(",").filter(Boolean),
    temp: o.t || "a", fragile: !!o.fr, regulated: !!o.rg, ageR: o.age || 0, shelfLife: o.sl || 180, subGroup: o.sg || null,
    refPrice: price, price, oldPrice: o.old || null, weightVar: !!o.v, local: !!o.loc,
    hub: o.hub === undefined ? DEFAULT_HUB_DEPTS.has(dept) : !!o.hub, handling: o.t === "f" ? "frozen" : o.t === "c" ? "chilled" : o.t === "h" ? "hot" : o.fr ? "fragile" : dept === "cleaning" ? "separate" : "normal",
    diet: dept === "produce" ? ["نباتي"] : [], tax: dept === "pharmacy" ? 0 : 0.14, weightKg: o.v ? 1 : 0.5, active: true,
    desc: `${ar} — ${size}. ${o.loc ? "منتج محلي من البحيرة." : ""}`.trim(),
  };
});

/* ------------------------------------------------------------------ merchants -------------------------------------------- */
D.merchantTypes = { grocery: "بقالة", supermarket: "سوبر ماركت", restaurant: "مطعم", pharmacy: "صيدلية", bakery: "مخبز", butcher: "جزارة", produce: "خضار وفاكهة", sweets: "حلويات", electronics: "إلكترونيات", stationery: "مكتبة", beauty: "تجميل", home: "أدوات منزلية", pets: "مستلزمات حيوانات", dairy: "ألبان", flowers: "ورد وهدايا", seafood: "أسماك" };
/* depts a merchant type may list from the master catalogue */
D.typeDepts = { supermarket: ["grocery", "dairy", "water", "snacks", "frozen", "cleaning", "care", "baby", "home", "bakery", "deals"], grocery: ["grocery", "dairy", "water", "snacks", "cleaning"], pharmacy: ["pharmacy", "baby", "care", "beauty"], bakery: ["bakery", "local"], butcher: ["meat"], produce: ["produce"], sweets: ["snacks"], electronics: ["electronics", "auto"], stationery: ["stationery"], beauty: ["beauty", "care"], home: ["home", "cleaning"], pets: ["pets"], dairy: ["dairy", "local"], flowers: ["gifts"], seafood: ["meat"] };
D.merchants = [
  { id: "m1", ar: "سوبر ماركت الحمد", type: "supermarket", zoneId: "center", owner: "الحاج عبد الحميد السيد", phone: "0100 214 7781", commission: 0.11, prep: 12, rating: 4.6, health: "healthy", since: "2027-02-03", demo: true, x: 0, y: 0, lat: 30.9118, lng: 30.1771, landmark: "أمام مسجد الرحمن" },
  { id: "m2", ar: "مطعم أبو حيدر للمشويات", type: "restaurant", cuisine: "grill", zoneId: "center", owner: "حيدر محمود", phone: "0111 330 4410", commission: 0.18, prep: 22, rating: 4.7, health: "healthy", since: "2027-02-01", demo: true, lat: 30.9097, lng: 30.1780, landmark: "شارع الجمهورية" },
  { id: "m3", ar: "صيدلية د. منى الشربيني", type: "pharmacy", zoneId: "gaish", owner: "د. منى الشربيني", phone: "0122 908 5512", commission: 0.10, prep: 8, rating: 4.8, health: "watch", since: "2027-02-10", lat: 30.9036, lng: 30.1712, landmark: "بجوار محطة القطار", license: "ترخيص صيدلية رقم 4471 / البحيرة" },
  { id: "m4", ar: "مخبز الأمانة البلدي", type: "bakery", zoneId: "center", owner: "سعد الأمانة", phone: "0100 771 2093", commission: 0.10, prep: 6, rating: 4.5, health: "healthy", since: "2027-02-05", lat: 30.9120, lng: 30.1735, landmark: "خلف السوق" },
  { id: "m5", ar: "جزارة الحاج سعيد", type: "butcher", zoneId: "center", owner: "سعيد عبد الله", phone: "0114 556 0012", commission: 0.09, prep: 15, rating: 4.4, health: "healthy", since: "2027-02-12", lat: 30.9090, lng: 30.1748, landmark: "سوق اللحوم" },
  { id: "m6", ar: "خضري أولاد عطية", type: "produce", zoneId: "gaish", owner: "رمضان عطية", phone: "0127 610 4433", commission: 0.12, prep: 10, rating: 4.3, health: "watch", since: "2027-02-14", lat: 30.9025, lng: 30.1690, landmark: "سوق الخضار" },
  { id: "m7", ar: "حلواني الشامي", type: "sweets", zoneId: "center", owner: "محمد الشامي", phone: "0100 902 1188", commission: 0.12, prep: 8, rating: 4.7, health: "healthy", since: "2027-03-01", lat: 30.9110, lng: 30.1765, landmark: "ميدان المحطة" },
  { id: "m8", ar: "كشري التحرير", type: "restaurant", cuisine: "koshary", zoneId: "center", owner: "أشرف عيد", phone: "0101 445 9921", commission: 0.17, prep: 12, rating: 4.5, health: "healthy", since: "2027-02-01", lat: 30.9102, lng: 30.1760, landmark: "شارع التحرير" },
  { id: "m9", ar: "بيتزا كينج أبو المطامير", type: "restaurant", cuisine: "pizza", zoneId: "gaish", owner: "تامر الشريف", phone: "0128 773 0045", commission: 0.18, prep: 20, rating: 4.2, health: "watch", since: "2027-02-20", lat: 30.9040, lng: 30.1722, landmark: "أمام البنك الأهلي" },
  { id: "m10", ar: "فول وفلافل أم حسن", type: "restaurant", cuisine: "breakfast", zoneId: "center", owner: "أم حسن", phone: "0109 311 6620", commission: 0.15, prep: 10, rating: 4.8, health: "healthy", since: "2027-02-01", lat: 30.9115, lng: 30.1752, landmark: "جنب مدرسة الشهيد" },
  { id: "m11", ar: "كافيه ليالي وعصائر", type: "restaurant", cuisine: "cafe", zoneId: "center", owner: "إسلام نبيل", phone: "0112 900 7764", commission: 0.16, prep: 8, rating: 4.4, health: "healthy", since: "2027-03-05", lat: 30.9101, lng: 30.1741, landmark: "الكورنيش" },
  { id: "m12", ar: "بقالة الأمل", type: "grocery", zoneId: "shokaf", owner: "عادل فرج", phone: "0106 448 2201", commission: 0.10, prep: 10, rating: 4.1, health: "healthy", since: "2027-07-11", lat: 30.8788, lng: 30.2230, landmark: "مدخل القرية" },
  { id: "m13", ar: "صيدلية الشفاء", type: "pharmacy", zoneId: "zawya", owner: "د. أحمد خطاب", phone: "0122 554 7710", commission: 0.10, prep: 8, rating: 4.6, health: "healthy", since: "2027-07-20", lat: 30.8722, lng: 30.1245, landmark: "بجوار الوحدة الصحية", license: "ترخيص صيدلية رقم 5120 / البحيرة" },
  { id: "m14", ar: "موبايلات النجم", type: "electronics", zoneId: "center", owner: "كريم النجم", phone: "0155 220 9011", commission: 0.08, prep: 6, rating: 4.3, health: "healthy", since: "2027-04-02", lat: 30.9108, lng: 30.1769, landmark: "برج النجم" },
  { id: "m15", ar: "مكتبة الفجر", type: "stationery", zoneId: "center", owner: "هاني فوزي", phone: "0100 677 1209", commission: 0.10, prep: 6, rating: 4.5, health: "healthy", since: "2027-08-25", lat: 30.9114, lng: 30.1783, landmark: "أمام المدرسة الثانوية" },
  { id: "m16", ar: "مستحضرات تجميل لمسة", type: "beauty", zoneId: "gaish", owner: "رانيا سمير", phone: "0127 431 8890", commission: 0.12, prep: 8, rating: 4.4, health: "healthy", since: "2027-05-14", lat: 30.9032, lng: 30.1705, landmark: "شارع الجيش" },
  { id: "m17", ar: "أدوات منزلية البركة", type: "home", zoneId: "center", owner: "محمود البركة", phone: "0101 553 2210", commission: 0.10, prep: 8, rating: 4.2, health: "healthy", since: "2027-05-02", lat: 30.9099, lng: 30.1730, landmark: "سوق الثلاثاء" },
  { id: "m18", ar: "بيت الحيوانات الأليفة", type: "pets", zoneId: "gaish", owner: "نادر حبيب", phone: "0114 228 0091", commission: 0.12, prep: 8, rating: 4.6, health: "healthy", since: "2027-06-10", lat: 30.9028, lng: 30.1719, landmark: "خلف الموقف" },
  { id: "m19", ar: "ألبان مزرعة الطيرية", type: "dairy", zoneId: "tayreya", owner: "الحاج فتحي أبو زيد", phone: "0109 557 3302", commission: 0.10, prep: 12, rating: 4.9, health: "healthy", since: "2027-04-18", local: true, lat: 30.9425, lng: 30.2370, landmark: "طريق المزارع" },
  { id: "m20", ar: "فطاطري الريس", type: "restaurant", cuisine: "pizza", zoneId: "center", owner: "الريس جمال", phone: "0111 845 2290", commission: 0.15, prep: 18, rating: 4.6, health: "healthy", since: "2027-03-12", local: true, lat: 30.9104, lng: 30.1757, landmark: "شارع سعد زغلول" },
  { id: "m21", ar: "فراخ كرسبي البلد", type: "restaurant", cuisine: "chicken", zoneId: "gaish", owner: "وائل حمدي", phone: "0128 990 6611", commission: 0.18, prep: 15, rating: 4.1, health: "restricted", since: "2027-04-01", lat: 30.9038, lng: 30.1696, landmark: "ميدان الجيش" },
  { id: "m22", ar: "سمك الصياد", type: "seafood", zoneId: "gaish", owner: "عبده الصياد", phone: "0100 128 5543", commission: 0.10, prep: 20, rating: 4.5, health: "healthy", since: "2027-06-01", lat: 30.9021, lng: 30.1709, landmark: "سوق السمك" },
  { id: "m23", ar: "ورد وهدايا ياسمين", type: "flowers", zoneId: "center", owner: "ياسمين عادل", phone: "0155 811 6602", commission: 0.15, prep: 15, rating: 4.8, health: "new", since: "2027-09-01", lat: 30.9116, lng: 30.1776, landmark: "شارع البحر" },
  { id: "m24", ar: "مطعم بيت العيلة", type: "restaurant", cuisine: "egyptian", zoneId: "center", owner: "سامية منصور", phone: "0106 330 9921", commission: 0.16, prep: 25, rating: 4.7, health: "healthy", since: "2027-03-20", local: true, lat: 30.9093, lng: 30.1763, landmark: "شارع المدارس" },
  { id: "m26", ar: "صيدلية الحياة", type: "pharmacy", zoneId: "center", owner: "د. هاني الحياة", phone: "0100 909 4471", commission: 0.10, prep: 7, rating: 4.7, health: "healthy", since: "2027-03-15", lat: 30.9119, lng: 30.1760, landmark: "تحت عمارة الأطباء، شارع الجمهورية", license: "ترخيص صيدلية رقم 4890 / البحيرة" },
  { id: "m25", ar: "صيدلية النور", type: "pharmacy", zoneId: "shokaf", owner: "د. سامح النور", phone: "0122 777 1290", commission: 0.10, prep: 8, rating: 0, health: "new", status: "pending", since: null, lat: 30.8795, lng: 30.2201, landmark: "شارع المدرسة", license: "ترخيص صيدلية رقم 6033 / البحيرة" },
];
D.merchants.forEach((m) => Object.assign(m, D.proj(m.lat, m.lng), { status: m.status || "active" }));

/* restaurant menus: category → items with modifiers (prices EGP) */
const mod = (name, opts, req = false, max = 1) => ({ name, req, max, opts: opts.map(([n, p]) => ({ n, p })) });
D.menus = {
  m2: [["مشويات", [["كفتة مشوي ربع كيلو", 145, "كفتة بلدي على الفحم مع عيش وسلطة وطحينة", [mod("الحجم", [["ربع كيلو", 0], ["نص كيلو", 130]], true), mod("إضافات", [["طحينة زيادة", 10], ["بابا غنوج", 20], ["عيش زيادة", 5]], false, 3)]], ["طرب لحم", 175, "طرب بلدي مشوي", [mod("الحجم", [["ربع كيلو", 0], ["نص كيلو", 160]], true)]], ["نص فرخة مشوية", 135, "نص فرخة على الفحم مع أرز وسلطة", [mod("الأرز", [["أرز أبيض", 0], ["أرز بالشعرية", 5]], true)]], ["مشكل مشويات للعيلة", 520, "كفتة وطرب وفراخ تكفي 4 أفراد", []]]], ["سلطات ومقبلات", [["طحينة", 20, "", []], ["سلطة بلدي", 18, "", []]]]],
  m8: [["كشري", [["كشري وسط", 35, "أرز وعدس ومكرونة وصلصة ودقة", [mod("الحجم", [["وسط", 0], ["كبير", 15], ["عائلي", 50]], true), mod("إضافات", [["عدس زيادة", 5], ["بصل زيادة", 5], ["صلصة حارة", 0]], false, 3)]], ["طاجن مكرونة باللحمة", 75, "", []]]], ["حلويات", [["أرز بلبن", 25, "", []], ["مهلبية", 22, "", []]]]],
  m9: [["بيتزا", [["بيتزا مارجريتا", 120, "", [mod("الحجم", [["وسط", 0], ["كبير", 45]], true), mod("إضافات", [["جبنة زيادة", 25], ["زيتون", 10]], false, 2)]], ["بيتزا سوبر سوبريم", 165, "", [mod("الحجم", [["وسط", 0], ["كبير", 55]], true)]], ["بيتزا فراخ رانش", 155, "", [mod("الحجم", [["وسط", 0], ["كبير", 50]], true)]]]]],
  m10: [["فطار", [["ساندوتش فول", 8, "عيش بلدي", [mod("الإضافة", [["سادة", 0], ["بالزيت الحار", 0], ["بالبيض", 6]], true)]], ["ساندوتش طعمية", 8, "", []], ["طبق فول بالزيت الحار", 25, "", []], ["فطار العيلة", 140, "فول وطعمية وبيض وبطاطس وعيش لـ 4 أفراد", []]]], ["مشروبات", [["شاي بلبن", 12, "", []]]]],
  m11: [["مشروبات", [["قهوة تركي", 30, "", [mod("السكر", [["سادة", 0], ["مظبوط", 0], ["زيادة", 0]], true)]], ["عصير مانجو فريش", 45, "", [mod("الحجم", [["وسط", 0], ["كبير", 15]], true)]], ["عصير قصب", 20, "", []], ["سموذي فراولة", 55, "", []]]], ["حلو", [["وافل نوتيلا", 70, "", []]]]],
  m20: [["فطير", [["فطير مشلتت بالعسل والقشطة", 120, "", [mod("الحجم", [["وسط", 0], ["كبير", 50]], true)]], ["فطيرة لحمة مفرومة", 110, "", []], ["فطيرة جبنة رومي", 95, "", []], ["فطيرة حلوة سوبر", 105, "", []]]]],
  m21: [["فراخ", [["وجبة 3 قطع فراخ كرسبي", 135, "مع بطاطس وكول سلو", [mod("النوع", [["عادي", 0], ["سبايسي", 0]], true), mod("المشروب", [["بدون", 0], ["بيبسي", 20]], false)]], ["ساندوتش زنجر", 85, "", []], ["بوكس العيلة 9 قطع", 360, "", []]]]],
  m22: [["أسماك", [["بلطي مشوي بالردة", 110, "سمكة حوالي نص كيلو مع أرز صيادية", []], ["جمبري مقلي ربع كيلو", 185, "", []], ["شوربة سي فود", 70, "", []]]]],
  m24: [["أكل بيتي", [["ملوخية بالفراخ", 120, "ملوخية وربع فرخة وأرز", []], ["محشي مشكل كيلو", 140, "كوسة وباذنجان وفلفل وورق عنب", []], ["مكرونة بشاميل", 95, "", []], ["طاجن بامية باللحمة", 130, "", []]]], ["حلو", [["أم علي", 45, "", []]]]],
};
D.cuisine = { grill: "مشويات", koshary: "كشري", pizza: "بيتزا وفطير", breakfast: "فطار", cafe: "كافيهات وعصاير", chicken: "فراخ مقلية", egyptian: "أكل مصري", seafood: "أسماك" };

/* ------------------------------------------------------------------ riders -------------------------------------------- */
D.vehicles = { bicycle: "عجلة", motorbike: "موتوسيكل", tricycle: "تروسيكل" };
D.riders = [
  { id: "r1", ar: "محمود سعيد", phone: "0101 233 4455", vehicle: "motorbike", plate: "ب ح ر 4417", zoneId: "center", status: "online", cash: 420, limit: 1000, rating: 4.8, demo: true, at: [30.9106, 30.1750] },
  { id: "r2", ar: "أحمد فتحي", phone: "0102 887 1203", vehicle: "motorbike", plate: "ب ح ر 1290", zoneId: "center", status: "online", cash: 260, limit: 1000, rating: 4.6, at: [30.9080, 30.1790] },
  { id: "r3", ar: "كريم عبد الله", phone: "0111 456 2210", vehicle: "bicycle", plate: "—", zoneId: "center", status: "online", cash: 110, limit: 600, rating: 4.7, at: [30.9125, 30.1730] },
  { id: "r4", ar: "مصطفى إبراهيم", phone: "0127 003 9981", vehicle: "motorbike", plate: "ب ح ر 7720", zoneId: "gaish", status: "online", cash: 1065, limit: 1000, rating: 4.4, at: [30.9035, 30.1705] },
  { id: "r5", ar: "عمرو حسن", phone: "0109 551 7720", vehicle: "motorbike", plate: "ب ح ر 3305", zoneId: "shokaf", status: "busy", cash: 540, limit: 1000, rating: 4.5, at: [30.8900, 30.2050] },
  { id: "r6", ar: "إسلام رجب", phone: "0100 661 2290", vehicle: "motorbike", plate: "ب ح ر 6618", zoneId: "zawya", status: "busy", cash: 380, limit: 1000, rating: 4.3, at: [30.8820, 30.1400] },
  { id: "r7", ar: "يوسف شعبان", phone: "0155 902 3381", vehicle: "bicycle", plate: "—", zoneId: "center", status: "online", cash: 90, limit: 600, rating: 4.9, at: [30.9100, 30.1770] },
  { id: "r8", ar: "حسام الدين علي", phone: "0128 441 0076", vehicle: "motorbike", plate: "ب ح ر 9031", zoneId: "tayreya", status: "online", cash: 610, limit: 1000, rating: 4.6, at: [30.9300, 30.2200] },
  { id: "r9", ar: "سيد عبد الرحمن", phone: "0106 778 9012", vehicle: "tricycle", plate: "ب ح ر 2264", zoneId: "hadeen", status: "online", cash: 150, limit: 1500, rating: 4.5, at: [30.8600, 30.1900] },
  { id: "r10", ar: "محمد عادل", phone: "0114 902 6612", vehicle: "motorbike", plate: "ب ح ر 5520", zoneId: "gaish", status: "busy", cash: 720, limit: 1000, rating: 4.2, at: [30.8980, 30.1650] },
  { id: "r11", ar: "خالد منصور", phone: "0101 339 8812", vehicle: "motorbike", plate: "ب ح ر 4093", zoneId: "boulin", status: "offline", cash: 0, limit: 1000, rating: 4.4, at: [30.9500, 30.1350] },
  { id: "r12", ar: "علي جمال", phone: "0122 510 7783", vehicle: "bicycle", plate: "—", zoneId: "center", status: "offline", cash: 0, limit: 600, rating: 4.7, at: [30.9110, 30.1760] },
];
D.riders.forEach((r) => Object.assign(r, D.proj(r.at[0], r.at[1])));

/* ------------------------------------------------------------------ customers -------------------------------------------- */
D.customers = [
  { id: "c1", ar: "منى عبد الحميد", phone: "0100 552 8817", zoneId: "center", landmark: "عمارة الأطباء، الدور التالت، فوق صيدلية الحياة", street: "شارع الجمهورية", cluster: "family", orders: 23, ltv: 6120, wallet: 44, points: 340, tier: "فضي", cod: 0.7, demo: true, since: 220, last: 2 },
  { id: "c2", ar: "أحمد الشناوي", phone: "0111 902 4413", zoneId: "gaish", landmark: "بجوار مدرسة الثانوية بنات", street: "شارع الجيش", cluster: "young", orders: 41, ltv: 7380, wallet: 0, points: 520, tier: "ذهبي", cod: 0.2, since: 260, last: 0 },
  { id: "c3", ar: "الحاجة فاطمة السيد", phone: "0106 331 7720", zoneId: "shokaf", landmark: "بيت العمدة القديم، أمام الجامع الكبير", street: "", cluster: "elderly", orders: 9, ltv: 1890, wallet: 0, points: 60, tier: "برونزي", cod: 1, since: 120, last: 6 },
  { id: "c4", ar: "إيمان حسانين", phone: "0128 113 5590", zoneId: "tayreya", landmark: "جنب الوحدة الزراعية", street: "", cluster: "village", orders: 14, ltv: 2950, wallet: 15, points: 140, tier: "برونزي", cod: 0.9, since: 140, last: 4 },
  { id: "c5", ar: "محمد ربيع", phone: "0155 772 0912", zoneId: "center", landmark: "برج الصفا، شقة 12", street: "شارع البحر", cluster: "young", orders: 2, ltv: 260, wallet: 0, points: 20, tier: "برونزي", cod: 1, since: 9, last: 9 },
  { id: "c6", ar: "هبة الله فوزي", phone: "0109 220 6631", zoneId: "center", landmark: "عمارة 7 مساكن الشباب", street: "مساكن الشباب", cluster: "family", orders: 57, ltv: 15200, wallet: 120, points: 1210, tier: "ذهبي", cod: 0.3, since: 300, last: 1 },
  { id: "c7", ar: "سامي عبد الفتاح", phone: "0114 330 9917", zoneId: "zawya", landmark: "مدخل القرية من ناحية الترعة", street: "", cluster: "village", orders: 6, ltv: 1240, wallet: 0, points: 40, tier: "برونزي", cod: 1, codFails: 2, since: 80, last: 21 },
  { id: "c8", ar: "رحاب منصور", phone: "0100 908 1123", zoneId: "gaish", landmark: "فوق بنك مصر", street: "شارع المحطة", cluster: "family", orders: 33, ltv: 8700, wallet: 0, points: 610, tier: "ذهبي", cod: 0.5, since: 240, last: 3 },
  { id: "c9", ar: "عبد الله حمدي", phone: "0127 554 3398", zoneId: "hadeen", landmark: "بجوار مضرب الأرز", street: "", cluster: "village", orders: 4, ltv: 980, wallet: 0, points: 30, tier: "برونزي", cod: 1, since: 50, last: 12 },
  { id: "c10", ar: "نورهان صلاح", phone: "0101 667 2209", zoneId: "center", landmark: "عمارة النيل، الدور الخامس", street: "شارع سعد زغلول", cluster: "young", orders: 18, ltv: 3100, wallet: 0, points: 210, tier: "فضي", cod: 0.1, promoHeavy: true, since: 90, last: 35 },
  { id: "c11", ar: "جمال الدين يوسف", phone: "0122 341 7782", zoneId: "boulin", landmark: "شارع المستوصف", street: "", cluster: "elderly", orders: 3, ltv: 690, wallet: 0, points: 20, tier: "برونزي", cod: 1, since: 40, last: 18 },
  { id: "c12", ar: "شيماء العربي", phone: "0111 448 9902", zoneId: "center", landmark: "برج الأمل", street: "شارع التحرير", cluster: "family", orders: 0, ltv: 0, wallet: 0, points: 0, tier: "برونزي", cod: 1, since: 1, last: null },
];

/* ------------------------------------------------------------------ internal users & roles -------------------------------------------- */
D.roles = [
  ["founder", "شريك مؤسس / مدير النظام", "Founder / Super Admin"], ["gm", "المدير العام", "General Manager"], ["ops", "مدير العمليات", "Operations Manager"], ["dispatcher", "موزّع", "Dispatcher"], ["hub", "مدير الهب", "Hub Manager"], ["picker", "مجمّع طلبات", "Picker"], ["finance", "المالية", "Finance"], ["support", "خدمة العملاء", "Customer Support"], ["supsup", "مشرف خدمة العملاء", "Support Supervisor"], ["merchops", "عمليات التجار", "Merchant Operations"], ["sales", "المبيعات / التطوير التجاري", "Commercial / Sales"], ["category", "مدير الأقسام", "Category Manager"], ["marketing", "التسويق", "Marketing"], ["procurement", "المشتريات", "Procurement"], ["analyst", "محلل بيانات", "Analyst"],
].map(([id, ar, en]) => ({ id, ar, en }));
D.users = [
  { id: "u1", ar: "عباس الدنيني", role: "founder" }, { id: "u2", ar: "طارق حلمي", role: "founder" }, { id: "u3", ar: "مروان سليم", role: "founder" },
  { id: "u4", ar: "هشام بدوي", role: "gm" }, { id: "u5", ar: "سارة مختار", role: "ops" }, { id: "u6", ar: "عمر ناجي", role: "dispatcher" }, { id: "u7", ar: "حمدي رزق", role: "hub" }, { id: "u8", ar: "وليد فتحي", role: "picker" },
  { id: "u9", ar: "نهى عبد الرازق", role: "finance" }, { id: "u10", ar: "دينا كمال", role: "support" }, { id: "u11", ar: "أيمن الشريف", role: "supsup" }, { id: "u12", ar: "باسم فاروق", role: "merchops" }, { id: "u13", ar: "رامي عزت", role: "sales" }, { id: "u14", ar: "ليلى حسن", role: "category" }, { id: "u15", ar: "منة الله يسري", role: "marketing" }, { id: "u16", ar: "كمال عيسى", role: "procurement" }, { id: "u17", ar: "يارا وجدي", role: "analyst" },
];
/* permission keys used across the Control Center; least privilege per role */
D.perms = {
  "orders.view": "عرض الطلبات", "orders.cancel": "إلغاء طلب", "dispatch.assign": "إسناد يدوي للمندوب", "refund.create": "طلب استرداد", "refund.approve.medium": "اعتماد استرداد متوسط", "refund.approve.large": "اعتماد استرداد كبير",
  "comp.issue": "صرف تعويض", "merchant.commission": "تعديل عمولة التاجر", "merchant.activate": "تفعيل/إيقاف تاجر", "catalog.edit": "تعديل الكتالوج", "catalog.approve": "اعتماد SKU جديد", "price.override": "تعديل سعر", "inventory.adjust": "تسوية مخزون",
  "po.approve": "اعتماد أمر شراء", "promo.create": "إنشاء عرض", "promo.approve": "اعتماد عرض تحت حد الهامش", "settlement.adjust": "تسوية مالية تاجر/مندوب", "finance.close": "إقفال اليوم المالي", "rules.edit": "تعديل قواعد العمل", "users.manage": "إدارة المستخدمين والصلاحيات", "zones.edit": "تعديل مناطق الخدمة", "rider.manage": "إدارة المناديب", "analytics.view": "التحليلات",
};
const ALL = Object.keys(D.perms);
D.rolePerms = {
  founder: ALL, gm: ALL.filter((p) => p !== "users.manage"),
  ops: ["orders.view", "orders.cancel", "dispatch.assign", "refund.create", "comp.issue", "inventory.adjust", "zones.edit", "rider.manage", "analytics.view"],
  dispatcher: ["orders.view", "dispatch.assign"], hub: ["orders.view", "inventory.adjust"], picker: ["orders.view"],
  finance: ["orders.view", "refund.create", "refund.approve.medium", "refund.approve.large", "settlement.adjust", "finance.close", "po.approve", "analytics.view"],
  support: ["orders.view", "refund.create", "comp.issue"], supsup: ["orders.view", "orders.cancel", "refund.create", "refund.approve.medium", "comp.issue"],
  merchops: ["orders.view", "merchant.activate", "catalog.edit"], sales: ["orders.view"], category: ["orders.view", "catalog.edit", "catalog.approve", "price.override", "analytics.view"],
  marketing: ["orders.view", "promo.create", "analytics.view"], procurement: ["orders.view", "po.approve", "inventory.adjust"], analyst: ["orders.view", "analytics.view"],
};

/* ------------------------------------------------------------------ business rules (configurable) -------------------------------------------- */
D.rules = [
  { key: "merchantAcceptSec", ar: "مهلة قبول التاجر للطلب", unit: "ثانية", value: 120, src: "BR-MER-001" },
  { key: "riderOfferSec", ar: "مهلة رد المندوب على العرض", unit: "ثانية", value: 45, src: "EX-RID-001" },
  { key: "riderOfferRetries", ar: "عدد محاولات العرض قبل تدخل الكنترول", unit: "محاولة", value: 3, src: "BR-RID-003" },
  { key: "codOrderMax", ar: "أقصى قيمة طلب بالكاش", unit: "ج.م", value: 1500, src: "BR-COD-001" },
  { key: "codFailBlock", ar: "عدد رفض الكاش السابق قبل التقييد", unit: "طلب", value: 2, src: "BR-COD-002" },
  { key: "riderCashLimitDefault", ar: "حد الكاش الافتراضي مع المندوب", unit: "ج.م", value: 1000, src: "BR-RID-002" },
  { key: "subWaitSec", ar: "مهلة رد العميل على البديل", unit: "ثانية", value: 300, src: "BR-SUB-002" },
  { key: "subPriceTolerance", ar: "أقصى فرق سعر للبديل التلقائي", unit: "%", value: 10, src: "BR-SUB-001" },
  { key: "unreachableWaitSec", ar: "انتظار المندوب عند عدم رد العميل", unit: "ثانية", value: 600, src: "BR-ARR-001" },
  { key: "minContribution", ar: "أقل مساهمة مقبولة للطلب بعد العرض", unit: "ج.م", value: 5, src: "Guardrail A" },
  { key: "compAgent", ar: "حد التعويض لموظف خدمة العملاء", unit: "ج.م", value: 50, src: "Guardrail D" },
  { key: "compSupervisor", ar: "حد التعويض للمشرف", unit: "ج.م", value: 200, src: "Guardrail D" },
  { key: "priceTolerance", ar: "سماحية سعر التاجر عن السعر المرجعي", unit: "%", value: 15, src: "Guardrail G" },
  { key: "stuckMin", ar: "طلب عالق في نفس الحالة أكثر من", unit: "دقيقة", value: 25, src: "EX-SYS-001" },
  { key: "pickSlaMin", ar: "SLA التجميع والتغليف في الهب", unit: "دقيقة", value: 8, src: "P11" },
  { key: "splitDelayMin", ar: "أقصى تأخير مسموح قبل التسليم المجزّأ", unit: "دقيقة", value: 12, src: "BR-DSP-002" },
];
D.slas = [
  ["قبول التاجر", "merchantAcceptSec", "التاجر", "اتصال من الدعم ثم إعادة توجيه"], ["تجهيز التاجر", "prep", "التاجر", "تحديث ETA وإبلاغ العميل"], ["تجميع الهب", "pickSlaMin", "مدير الهب", "إعادة توزيع الطاقم"], ["رد المندوب على العرض", "riderOfferSec", "المندوب", "إعادة العرض لمندوب تالي"], ["وصول المندوب للاستلام", "pickupMin", "الموزّع", "إعادة إسناد"], ["التوصيل في الموعد", "zoneSla", "العمليات", "تعويض حسب السياسة ⚠D-21"], ["رد العميل على البديل", "subWaitSec", "العميل", "تطبيق التفضيل الاحتياطي"], ["حل حالة الدعم", "caseH", "الدعم", "تصعيد للمشرف"], ["إيداع الكاش", "codDepositH", "المندوب", "إيقاف مهام الكاش"],
];

/* ------------------------------------------------------------------ growth, CRM, expansion -------------------------------------------- */
D.segments = [
  { id: "sg-new", ar: "جديد", rule: "سجّل خلال 14 يوم ولم يطلب", size: 412 }, { id: "sg-act", ar: "اتفعّل", rule: "طلب أول مرة خلال 30 يوم", size: 286 }, { id: "sg-rep", ar: "متكرر", rule: "≥ 2 طلبات خلال 30 يوم", size: 1820 }, { id: "sg-hf", ar: "تكرار عالي", rule: "≥ 8 طلبات في الشهر", size: 344 },
  { id: "sg-hv", ar: "قيمة عالية", rule: "متوسط سلة ≥ 350 ج.م", size: 510 }, { id: "sg-lapsed", ar: "متوقف", rule: "لم يطلب خلال 30 يوم", size: 930 }, { id: "sg-cod", ar: "كاش غالباً", rule: "≥ 80% من الطلبات كاش", size: 2410 }, { id: "sg-promo", ar: "معتمد على العروض", rule: "≥ 70% من الطلبات بكوبون", size: 365 },
  { id: "sg-groc", ar: "بقالة غالباً", rule: "≥ 70% من القيمة بقالة", size: 1650 }, { id: "sg-rest", ar: "مطاعم غالباً", rule: "≥ 60% من الطلبات أكل جاهز", size: 720 }, { id: "sg-village", ar: "عميل رحلات القرى", rule: "عنوان في منطقة مجدولة", size: 480 },
];
D.waitlist = { wafaeya: { users: 186, searches: 940, attempts: 211, merchants: 4, pharmacy: 0, demandDay: 62, costPerOrder: 31, beOrders: 45, pipeline: 2 }, kombaraka: { users: 74, searches: 310, attempts: 66, merchants: 2, pharmacy: 0, demandDay: 24, costPerOrder: 38, beOrders: 48, pipeline: 0 }, hadeen: { users: 0, searches: 0, attempts: 0, merchants: 3, pharmacy: 1, demandDay: 41, costPerOrder: 29, beOrders: 40, pipeline: 1 }, boulin: { users: 0, searches: 0, attempts: 0, merchants: 3, pharmacy: 0, demandDay: 38, costPerOrder: 30, beOrders: 40, pipeline: 1 } };
D.noResult = [["بامبرز مقاس 6", 64, "baby"], ["عيش سن", 51, "bakery"], ["لبن نيدو", 47, "dairy"], ["فول مدمس معلب كبير", 33, "grocery"], ["شاحن ايفون اصلي", 29, "electronics"], ["كبدة فراخ", 26, "meat"], ["قطايف", 22, "snacks"], ["زيت زيتون", 19, "grocery"], ["حفاضات كبار", 15, "pharmacy"], ["سجاير", 41, null]];

D.leadStages = ["عميل محتمل", "تم التواصل", "مؤهل", "زيارة مجدولة", "اتفاق تجاري", "مستندات", "تجهيز الكتالوج", "تدريب", "تم التفعيل", "أول طلب", "تاجر سليم"];
D.leads = [
  { id: "L-301", ar: "صيدلية النور", owner: "د. سامح النور", type: "pharmacy", zoneId: "shokaf", stage: 5, assortment: "650 صنف OTC وعناية", opportunity: "أبو الشقاف بلا صيدلية مفعّلة", competitors: "لا يوجد", commission: 0.10, merchantId: "m25" },
  { id: "L-302", ar: "صيدلية الرحمة", owner: "د. نادية فوزي", type: "pharmacy", zoneId: "wafaeya", stage: 1, assortment: "400 صنف", opportunity: "طلب صيدلية في الوفائية بدون تاجر", competitors: "توصيل واتساب محلي", commission: 0.10 },
  { id: "L-303", ar: "سوبر ماركت الوفاء", owner: "إبراهيم الوفاء", type: "supermarket", zoneId: "wafaeya", stage: 3, assortment: "1,200 صنف", opportunity: "أعلى قائمة انتظار", competitors: "لا يوجد", commission: 0.11 },
  { id: "L-304", ar: "جزارة أولاد مرعي", owner: "مرعي حسن", type: "butcher", zoneId: "shokaf", stage: 2, assortment: "لحوم وفراخ", opportunity: "طلبات لحوم من القرى", competitors: "—", commission: 0.09 },
  { id: "L-305", ar: "مطعم الشيف حمادة", owner: "حمادة سالم", type: "restaurant", zoneId: "center", stage: 4, assortment: "منيو 38 صنف", opportunity: "مشويات ومحاشي بالليل", competitors: "مطعم أبو حيدر", commission: 0.17 },
  { id: "L-306", ar: "مخبز الفلاح", owner: "عوض عبد الدايم", type: "bakery", zoneId: "tayreya", stage: 6, assortment: "عيش وفطير", opportunity: "عيش بلدي للقرية", competitors: "—", commission: 0.10 },
  { id: "L-307", ar: "أدوات مدرسية النجاح", owner: "صبري حسين", type: "stationery", zoneId: "gaish", stage: 0, assortment: "—", opportunity: "موسم المدارس", competitors: "مكتبة الفجر", commission: 0.10 },
  { id: "L-308", ar: "بقالة الحاج رجب", owner: "رجب عبد الحي", type: "grocery", zoneId: "kombaraka", stage: 0, assortment: "300 صنف", opportunity: "كوم البركة بدون تاجر", competitors: "—", commission: 0.10 },
  { id: "L-309", ar: "حلواني العمدة", owner: "شريف العمدة", type: "sweets", zoneId: "boulin", stage: 7, assortment: "حلويات شرقية", opportunity: "حلويات المواسم", competitors: "—", commission: 0.12 },
  { id: "L-310", ar: "خضري الأمانة", owner: "مسعود فرج", type: "produce", zoneId: "hadeen", stage: 8, assortment: "خضار وفاكهة", opportunity: "رحلة الحدين المجدولة", competitors: "—", commission: 0.12 },
];
})();
