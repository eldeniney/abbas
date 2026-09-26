const { parse } = require("./dsl");
const G = {};

/* ---------- P01 دخول العميل ونطاق الخدمة ---------- */
G.p01 = parse("p01", `
s    | S | العميل يفتح توّا
auth | D | مسجّل دخول؟
guest| P | متابعة كضيف (تصفح فقط، الطلب يتطلب OTP) | GUEST_SESSION
logged| P | تحميل عناوين العميل المحفوظة | LOAD_ADDRESSES
saved| D | عنوان محفوظ افتراضي موجود؟
perm | D | إذن الموقع متاح؟
gps  | X | اكتشاف الموقع من GPS | GEO_DETECT
manual| W | العميل يحدد الموقع يدوياً: بحث / دبوس على الخريطة / اختيار قرية | MANUAL_PIN
valid| D | الموقع صالح؟ (إحداثيات داخل مصر + دقة مقبولة)
retry| P | إظهار رسالة: "مش قادرين نحدد موقعك، حرّك الدبوس أو اختار القرية"
svc  | X | فحص نطاق الخدمة: مطابقة الإحداثيات مع مضلعات المناطق | SERVICEABILITY_CHECK
zone | D | النتيجة؟
soon | P | إظهار: "لسه موصلناش عندك، بس جايين توّا" + عرض الانضمام لقائمة الانتظار
wl   | D | العميل يوافق يسيب بياناته؟
wlrec| X | تسجيل طلب انتظار: الموقع + رقم الموبايل + القرية | WAITLIST_CAPTURED
eout | E | خارج نطاق الخدمة | OUTSIDE_SERVICE_AREA | fail
eout2| E | خارج نطاق الخدمة (بدون بيانات) | OUTSIDE_SERVICE_AREA | fail
cov  | P | تحميل إعدادات المنطقة: المتجر المسؤول، ETA، رسوم التوصيل، الحد الأدنى، ساعات العمل | ZONE_CONTEXT
open | D | المنطقة شغّالة الآن؟ (داخل ساعات العمل والسعة)
closed| P | إظهار: "التوصيل هيرجع الساعة X" + السماح بالتصفح والجدولة إن كانت متاحة | ZONE_CLOSED
addr | D | العنوان المكتوب يطابق الدبوس؟ (المسافة ≤ حد التسامح)
fix  | W | تنبيه العميل: "الدبوس بعيد عن العنوان المكتوب" واختيار أيهما الصحيح | ADDRESS_MISMATCH
comp | D | العنوان مكتمل؟ (شارع/علامة مميزة/موبايل)
fill | W | طلب استكمال الحقول الناقصة قبل الطلب
chg  | N | في أي وقت: العميل يغيّر الموقع ← إعادة فحص النطاق وإعادة تسعير السلة (BR-LOC-003)
ok   | E | جاهز للتصفح داخل نطاق الخدمة | SERVICEABLE | ok

s -> auth
auth -> logged : نعم
auth -> guest : لا
guest -> perm
logged -> saved
saved -> svc : نعم (يُعاد فحص العنوان المحفوظ)
saved -> perm : لا
perm -> gps : نعم
perm -> manual : لا : wait
gps -> valid : sys
manual -> valid
valid -> svc : صالح
valid -> retry : غير صالح : fail
retry -> manual : wait
svc -> zone : sys
zone -> cov : متاح : ok
zone -> soon : غير متاح : fail
soon -> wl
wl -> wlrec : نعم
wl -> eout2 : لا : fail
wlrec -> eout : fail
cov -> open
open -> addr : نعم
open -> closed : لا : wait
closed -> addr
addr -> comp : نعم
addr -> fix : لا : wait
fix -> svc : تم التصحيح
comp -> ok : نعم : ok
comp -> fill : لا : wait
fill -> comp
ok -> chg
chg -> svc : عند تغيير الموقع : sys
`);

/* ---------- P02 اكتشاف المنتجات ---------- */
G.p02 = parse("p02", `
s   | S | العميل داخل نطاق الخدمة
how | D | طريقة الاكتشاف؟
cat | K | تصفح قسم
srch| K | بحث بالاسم / الماركة / بالعامية
rep | K | إعادة طلب سابق
mer | K | فتح صفحة تاجر / مطعم
promo| K | فتح عرض / بانر
rec | K | منتجات مقترحة (مخصوص ليك)
q   | X | استعلام التوافر حسب المنطقة والمصدر (هب توّا + التجار المفعّلين) | AVAILABILITY_QUERY
res | D | نتيجة التوافر؟
hub | P | عرض المنتج من هب توّا (السعر، ETA، أضف)
one | P | عرض المنتج من تاجر واحد مع اسم التاجر ووقت التجهيز
multi| P | عرض خيارات المصادر مرتبة (BR-RTE-001) مع الفرق في السعر والوقت
temp| P | عرض "غير متوفر حالياً" + زر "نبّهني لما يتوفر" | TEMP_UNAVAILABLE
unk | P | عرض المنتج بحالة "نتأكد لك من التوافر" (يتطلب تأكيداً قبل الدفع) | AVAILABILITY_UNKNOWN
sub | D | يوجد بديل مناسب؟
alts| P | عرض البدائل المعتمدة (نفس الفئة/الحجم ± حد السعر)
ask | P | عرض "دوّرولي عليه" + "نبّهني لما يتوفر"
dem | X | تسجيل الطلب كإشارة طلب غير ملبّى (Demand Intelligence) | DEMAND_SIGNAL
repv| X | إعادة التحقق من كل بند في الطلب السابق: السعر والتوافر | REORDER_REVALIDATE
repd| D | كل البنود متاحة؟
repp| P | عرض البنود غير المتاحة بوضوح وإضافة المتاح فقط
add | E | إضافة للسلة → P03 | ADD_TO_CART | ok
cont| E | العميل يكمل التصفح | BROWSING | neutral

s -> how
how -> cat : قسم
how -> srch : بحث
how -> rep : إعادة طلب
how -> mer : تاجر
how -> promo : عرض
how -> rec : مقترح
cat -> q
srch -> q
mer -> q
promo -> q
rec -> q
rep -> repv : sys
repv -> repd
repd -> add : نعم : ok
repd -> repp : جزئي/لا : wait
repp -> add
q -> res : sys
res -> hub : متاح (هب)
res -> one : تاجر واحد
res -> multi : أكثر من تاجر
res -> temp : مؤقتاً غير متاح : wait
res -> sub : غير متاح : fail
res -> unk : غير معروف : wait
hub -> add : ok
one -> add : ok
multi -> add : ok
unk -> add
temp -> dem : sys
sub -> alts : نعم
sub -> ask : لا : fail
alts -> add : ok
ask -> dem : sys
dem -> cont
`);

/* ---------- P03 إنشاء السلة ---------- */
G.p03 = parse("p03", `
s    | S | العميل يضيف منتجاً للسلة
src  | X | تحديد مصدر البند: هب توّا / تاجر A / تاجر B / مطعم / شريك | ITEM_SOURCE
first| D | السلة فيها بنود من مصدر آخر؟
single| P | سلة مصدر واحد: حد أدنى واحد ورسوم توصيل واحدة | SINGLE_SOURCE_CART
comb | D | يمكن دمج المصادر في طلب واحد؟ (نفس المنطقة + سياسة الدمج مفعّلة)
noc  | W | إبلاغ العميل: "المنتج ده من تاجر مختلف، هيتطلب طلب منفصل" | SPLIT_REQUIRED
noc2 | D | العميل يوافق على طلب منفصل؟
sep  | P | إنشاء سلة ثانية مستقلة (طلب عميل ثانٍ) | SECOND_CART
drop | P | إلغاء الإضافة
multi| P | سلة متعددة المصادر: تجميع البنود حسب المصدر | MULTI_SOURCE_CART
mins | X | حساب الحد الأدنى لكل مصدر ورسوم التوصيل المدمجة (BR-CART-002) | PER_SOURCE_MINIMUM
cond | D | شروط تجهيز غير متوافقة؟ (مجمّدات + وجبة ساخنة + بقالة)
handle| P | وسم البنود بشروط المناولة: بارد / ساخن / هش → تُنقل لمحرك التوصيل | HANDLING_FLAGS
qty  | D | الكمية ضمن الحد الأقصى وتوافر المصدر؟
capq | W | تقليل الكمية تلقائياً وإبلاغ العميل بالحد
show | P | عرض السلة: مجموعة لكل مصدر + ETA لكل مجموعة + الإجمالي + رسالة "ضيف X وخد التوصيل مجاناً" | CART_VIEW
upd  | D | العميل يعدّل السلة؟
persist| X | حفظ السلة للجلسات القادمة | CART_PERSISTED
go   | E | الانتقال للتحقق قبل الدفع → P04 | CART_READY | ok
aband| E | سلة محفوظة بدون إتمام (تذكير مهجورة لاحقاً) | CART_SAVED | neutral

s -> src : sys
src -> first
first -> single : لا
first -> comb : نعم
comb -> multi : نعم
comb -> noc : لا : wait
noc -> noc2
noc2 -> sep : نعم
noc2 -> drop : لا : fail
sep -> show
drop -> show
single -> qty
multi -> mins : sys
mins -> cond
cond -> handle : نعم
cond -> qty : لا
handle -> qty
qty -> show : نعم
qty -> capq : لا : wait
capq -> show
show -> upd
upd -> src : نعم (إضافة/حذف)
upd -> persist : لا : sys
persist -> go : متابعة للدفع : ok
persist -> aband : ترك التطبيق
`);

/* ---------- P04 التحقق قبل الدفع ---------- */
G.p04 = parse("p04", `
s    | S | العميل ضغط "إتمام الطلب"
rv   | X | إعادة التحقق الشاملة: الموقع، النطاق، التوافر، الكميات، الأسعار، العروض، الكوبون، الحد الأدنى، حالة التاجر، سعة التاجر، سعة التوصيل، ETA، أهلية الدفع، الأصناف المقيّدة | PRE_CHECKOUT_VALIDATION
chg  | D | فيه أي تغيير عن السلة المعروضة؟
kind | D | نوع التغيير؟
c1   | P | منتج أصبح غير متاح → عرضه بوضوح مع بديل إن وجد
c2   | P | السعر اتغير → عرض السعر القديم والجديد
c3   | P | التاجر مقفول/فوق طاقته → عرض وقت الفتح أو تاجر بديل
c4   | P | وقت التوصيل اتغير → عرض ETA الجديد
c5   | P | الكوبون انتهى/غير صالح → إزالته وعرض السبب
c6   | P | الحد الأدنى لم يعد مستوفى → عرض المبلغ الناقص
c7   | P | صنف مقيّد (عمر/كمية/منطقة) → إزالته مع الشرح | RESTRICTED_ITEM
c8   | P | لا توجد سعة توصيل الآن → عرض أقرب وقت أو جدولة | NO_DELIVERY_CAPACITY
fix  | D | العميل يقدر يصحّح السلة؟
edit | K | العميل يعدّل السلة (حذف/بديل/إضافة)
ab   | E | ترك عملية الدفع | CHECKOUT_ABANDONED | fail
lock | X | تثبيت الأسعار والعروض لمدة نافذة الدفع (مثلاً 10 دقائق) + حجز مؤقت للسعة | PRICE_LOCK
go   | E | الانتقال لشاشة الدفع → P05 | CHECKOUT_VALID | ok

s -> rv : sys
rv -> chg
chg -> lock : لا
chg -> kind : نعم : fail
kind -> c1 : توافر
kind -> c2 : سعر
kind -> c3 : تاجر
kind -> c4 : ETA
kind -> c5 : كوبون
kind -> c6 : حد أدنى
kind -> c7 : مقيّد
kind -> c8 : سعة
c1 -> fix
c2 -> fix
c3 -> fix
c4 -> fix
c5 -> fix
c6 -> fix
c7 -> fix
c8 -> fix
fix -> edit : نعم
fix -> ab : لا : fail
edit -> rv : إعادة التحقق : sys
lock -> go : ok
`);

/* ---------- P05 الدفع (شاشة الدفع) ---------- */
G.p05 = parse("p05", `
s    | S | شاشة إتمام الطلب
conf | K | العميل يراجع: العنوان، رقم الموبايل، تعليمات التوصيل، مكوّنات الطلب حسب المصدر، الرسوم، الخصومات، الإجمالي، وقت التوصيل المتوقع
addr | D | العنوان والموبايل مؤكدان؟
fixa | W | تعديل العنوان أو الرقم → إعادة فحص النطاق (P01)
slot | D | وقت التوصيل؟
now  | P | توصيل الآن: ETA حسب المنطقة والمصادر
sch  | P | توصيل مجدول: اختيار نافذة زمنية متاحة (سعة الجدولة) | SCHEDULED_SLOT
pm   | D | طريقة الدفع؟
cod  | P | كاش عند الاستلام → P06-B
onl  | P | بطاقة / محفظة إلكترونية عبر بوابة الدفع → P06-A
wal  | P | محفظة توّا (مرحلة لاحقة) — استخدام الرصيد ثم تكملة بطريقة أخرى | WALLET_FUTURE
idem | X | توليد مفتاح Idempotency للطلب ومنع الضغط المزدوج (تعطيل الزر + مفتاح لكل جلسة دفع) | IDEMPOTENCY_KEY
place| K | العميل يضغط "أكّد الطلب"
go   | E | الانتقال لتنفيذ الدفع → P06 | PLACE_ORDER_REQUESTED | ok
back | E | العميل رجع للسلة | CHECKOUT_ABANDONED | fail

s -> conf
conf -> addr
addr -> slot : نعم
addr -> fixa : لا : wait
fixa -> conf
slot -> now : الآن
slot -> sch : مجدول
now -> pm
sch -> pm
pm -> cod : كاش
pm -> onl : أونلاين
pm -> wal : محفظة
wal -> idem
cod -> idem : sys
onl -> idem : sys
idem -> place
place -> go : ok
conf -> back : رجوع : fail
`);

/* ---------- P06-A الدفع الأونلاين ---------- */
G.p06a = parse("p06a", `
s    | S | بدء الدفع الأونلاين
pre  | X | إنشاء طلب مبدئي بحالة انتظار الدفع مرتبط بمفتاح Idempotency | ORDER_PENDING_PAYMENT
dup  | D | يوجد طلب بنفس المفتاح خلال آخر X دقيقة؟
dupr | P | إرجاع نفس الطلب/نفس نتيجة الدفع بدون تنفيذ جديد | DUPLICATE_SUPPRESSED
gw   | X | إرسال طلب الدفع لبوابة الدفع (مبلغ + مرجع الطلب) | PAYMENT_INITIATED
res  | D | نتيجة الدفع؟
ok   | X | تسجيل الدفع مؤكداً + مرجع البوابة | PAYMENT_CONFIRMED
why  | D | سبب الفشل؟
dec  | P | مرفوض من البنك: إبلاغ العميل + اقتراح طريقة أخرى أو كاش
to   | P | انتهاء مهلة البوابة: عدم إعادة الخصم تلقائياً
can  | P | العميل ألغى: الرجوع لشاشة الدفع مع الاحتفاظ بالسلة
tech | P | خطأ تقني: تسجيل الخطأ + إبلاغ العميل "حصلت مشكلة بسيطة. جرّب تاني."
pend | P | غير معروف/معلّق: عدم إنشاء طلب نهائي | PAYMENT_PENDING
recon| X | فتح حالة تسوية دفع: التحقق من البوابة (استعلام بالمرجع) | PAYMENT_RECONCILIATION_REQUIRED
rq   | D | نتيجة الاستعلام من البوابة؟
rok  | P | الدفع وصل فعلاً → تأكيد الطلب بأثر رجعي (إن كانت السلة ما زالت صالحة)
still| D | السلة ما زالت صالحة (سعر/توافر/سعة)؟
rref | X | إرجاع تلقائي للمبلغ + إبلاغ العميل | AUTO_REFUND
man  | W | تحقيق يدوي من المالية خلال SLA (مبلغ مخصوم بدون تأكيد) | MANUAL_INVESTIGATION
mres | D | قرار المالية؟
retry| D | العميل يحاول طريقة أخرى؟
efail| E | فشل الدفع | PAYMENT_FAILED | fail
ecan | E | ترك الدفع | CHECKOUT_ABANDONED | fail
erec | E | تمت التسوية وإغلاق الحالة (مسترد) | PAYMENT_RECONCILED_AND_CLOSED | neutral
go   | E | الدفع مؤكد → إنشاء الطلب P07 | PAID | ok

s -> pre : sys
pre -> dup
dup -> dupr : نعم : fail
dupr -> go : ok
dup -> gw : لا : sys
gw -> res
res -> ok : نجح : ok
ok -> go : ok
res -> why : فشل : fail
res -> pend : معلّق : wait
why -> dec : مرفوض
why -> to : مهلة
why -> can : إلغاء
why -> tech : خطأ تقني
dec -> retry
tech -> retry
can -> retry
to -> recon : sys
pend -> recon : sys
recon -> rq
rq -> rok : الدفع مؤكد : ok
rq -> retry : لم يُخصم : fail
rq -> man : غير محسوم : wait
rok -> still
still -> go : نعم : ok
still -> rref : لا : fail
rref -> erec
man -> mres
mres -> rok : الدفع وصل
mres -> rref : إرجاع
mres -> retry : لم يُخصم
retry -> gw : نعم (طريقة أخرى)
retry -> efail : لا : fail
efail -> ecan
`);

/* ---------- P06-B الدفع كاش ---------- */
G.p06b = parse("p06b", `
s    | S | العميل اختار كاش عند الاستلام
rules| X | فحص أهلية الكاش: قيمة الطلب ≤ حد الكاش، سجل العميل، المنطقة، الفئة، عدد طلبات الكاش الفاشلة السابقة | COD_ELIGIBILITY
elig | D | الكاش مسموح؟
why  | D | السبب؟
amt  | P | المبلغ فوق حد الكاش: اقتراح تقسيم الطلب أو الدفع أونلاين
hist | P | سجل فشل كاش سابق: طلب دفع أونلاين أو تأكيد عبر OTP إضافي | COD_RISK_FLAG
zone | P | المنطقة/الفئة لا تسمح بالكاش: عرض الطرق المتاحة فقط
alt  | D | العميل يختار طريقة أخرى؟
rec  | X | تسجيل المبلغ المتوقع تحصيله + فكة العميل المطلوبة | EXPECTED_COD_AMOUNT
otp  | D | يتطلب تأكيد OTP للطلب؟ (عميل جديد / قيمة عالية)
send | W | إرسال OTP وانتظار الإدخال
otpr | D | تم التأكيد خلال المهلة؟
go   | E | الكاش معتمد → إنشاء الطلب P07 | COD_APPROVED | ok
ab   | E | ترك الدفع | CHECKOUT_ABANDONED | fail

s -> rules : sys
rules -> elig
elig -> rec : نعم
elig -> why : لا : fail
why -> amt : المبلغ
why -> hist : السجل
why -> zone : المنطقة/الفئة
amt -> alt
hist -> alt
zone -> alt
alt -> ab : لا : fail
alt -> go : نعم (أونلاين) → P06-A
rec -> otp
otp -> go : لا : ok
otp -> send : نعم : wait
send -> otpr
otpr -> go : نعم : ok
otpr -> ab : لا (انتهت المهلة) : fail
`);

module.exports = G;
