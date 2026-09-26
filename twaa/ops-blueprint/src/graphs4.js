const { parse } = require("./dsl");
const G = {};

/* ---------- P21 فشل التسليم: شجرة القرار ---------- */
G.p21 = parse("p21", `
s    | S | فشل التسليم أو استثناء عند الباب | DELIVERY_FAILED
cause| D | السبب المسجّل؟
c1   | P | العميل غير متاح
c2   | P | عنوان خاطئ
c3   | P | رفض الاستلام
c4   | P | لم يدفع الكاش
c5   | P | غيّر رأيه
c6   | P | تسليم غير آمن
c7   | P | طرد تالف
c8   | P | رفض بسبب التأخير
c9   | P | خطأ تاجر
c10  | P | خطأ توّا
fault| D | من المسؤول عن الفشل؟ (جدول المسؤولية المالية §25)
cust | X | العميل: يتحمل رسوم التوصيل/إعادة المحاولة حسب السياسة؛ لا إرجاع لرسوم التوصيل | LIABILITY_CUSTOMER
merc | X | التاجر: يتحمل قيمة البند + تكلفة التوصيل الفاشلة؛ تُخصم من تسويته | LIABILITY_MERCHANT
twaa | X | توّا: تتحمل التكلفة كاملة؛ تعويض العميل | LIABILITY_TWAA
rider| X | الرايدر (تلف بإهمال/سلوك): خصم من تسويته بعد التحقيق | LIABILITY_RIDER
act  | D | الإجراء؟
rea  | P | إعادة المحاولة (P18) بموافقة العميل ووقت متفق | REATTEMPT
rto  | P | إرجاع للأصل → P22 | RETURN_TO_ORIGIN
pr   | P | إرجاع جزئي (البنود غير المسلّمة) → P23 | PARTIAL_REFUND
fr   | P | إرجاع كامل → P23 | FULL_REFUND
nr   | P | بدون إرجاع (سبب من العميل + كاش لم يُحصّل) — يبقى الطلب فاشلاً مع رسوم محتملة | NO_REFUND
inv  | W | تحقيق خدمة العملاء (نزاع/تلف/صنف ناقص) خلال SLA | SUPPORT_INVESTIGATION
invr | D | نتيجة التحقيق؟
eR   | E | فشل تسليم ومرتجع | DELIVERY_FAILED_RETURNED | fail
eRf  | E | فشل تسليم ومسترد | DELIVERY_FAILED_REFUNDED | fail
eC   | E | رفض العميل ومرتجع | CUSTOMER_REJECTED_RETURNED | fail
eS   | E | مغلق بعد قرار الدعم | CLOSED_AFTER_SUPPORT_RESOLUTION | neutral

s -> cause
cause -> c1 : غير متاح
cause -> c2 : عنوان
cause -> c3 : رفض
cause -> c4 : كاش
cause -> c5 : غيّر رأيه
cause -> c6 : غير آمن
cause -> c7 : تالف
cause -> c8 : تأخير
cause -> c9 : خطأ تاجر
cause -> c10 : خطأ توّا
c1 -> fault
c2 -> fault
c3 -> fault
c4 -> fault
c5 -> fault
c6 -> fault
c7 -> fault
c8 -> fault
c9 -> fault
c10 -> fault
fault -> cust : العميل
fault -> merc : التاجر
fault -> twaa : توّا
fault -> rider : الرايدر
fault -> inv : غير واضح : wait
cust -> act
merc -> act
twaa -> act
rider -> act
inv -> invr
invr -> fault : تحددت المسؤولية
invr -> eS : تسوية بالتراضي
act -> rea : إعادة محاولة : wait
act -> rto : إرجاع للأصل : fail
act -> pr : إرجاع جزئي
act -> fr : إرجاع كامل
act -> nr : بدون إرجاع
rea -> s : فشلت مجدداً : fail
rto -> eR
rto -> eC : كان رفضاً من العميل
pr -> eRf
fr -> eRf
nr -> eR
`);

/* ---------- P22 الإرجاع للأصل ---------- */
G.p22 = parse("p22", `
s    | S | الرايدر يعود بالطرد | RETURN_TO_ORIGIN
where| D | أصل الطرد؟
hubs | P | مسح استلام المرتجع في الهب: نقل الحيازة من الرايدر للهب | RETURN_SCANNED
insp | P | فحص كل صنف: العبوة، الصلاحية، سلسلة التبريد، التلف
disp | D | قرار التصرف في الصنف؟
rest | X | إعادة للمخزون القابل للبيع + تحديث الكمية | RESTOCKED
quar | X | حجر للفحص/التصرف لاحقاً | QUARANTINE
waste| X | هالك: تسجيل الخسارة بالسبب والمسؤول | WRITE_OFF
foodq| D | طعام مطعم / صنف سريع التلف؟
merch| P | إرجاع لمقر التاجر: التاجر يمسح الاستلام أو يؤكد من تطبيقه | RETURNED_TO_MERCHANT
mrej | D | التاجر يقبل المرتجع؟
mliab| X | التاجر يرفض: تحديد المسؤولية من P21 → الخصم على المسؤول | MERCHANT_RETURN_DISPUTE
cod  | D | كان الطلب كاش وتم تحصيل جزء؟
codr | X | تسوية الكاش المحصّل مع الرايدر (إيداع/إرجاع للعميل) | COD_RETURN_SETTLEMENT
fin  | X | تحديث الالتزام المالي: من يتحمل قيمة البند وتكلفة التوصيل الفاشلة | LIABILITY_UPDATED
go   | E | مرتجع ومغلق تشغيلياً → التسوية P24 | RETURNED | fail

s -> where
where -> hubs : هب توّا
where -> merch : تاجر / مطعم
hubs -> insp
insp -> foodq
foodq -> waste : نعم (غير قابل للبيع) : fail
foodq -> disp : لا
disp -> rest : قابل للبيع : ok
disp -> quar : يحتاج فحص : wait
disp -> waste : تالف : fail
quar -> disp : بعد الفحص
merch -> mrej
mrej -> fin : نعم
mrej -> mliab : لا : fail
mliab -> fin
rest -> cod
waste -> cod
fin -> cod
cod -> codr : نعم
cod -> go : لا
codr -> go
`);

/* ---------- P23-A الإلغاء ---------- */
G.p23a = parse("p23a", `
s    | S | طلب إلغاء (من العميل / توّا / التاجر)
who  | D | من يطلب الإلغاء؟
st   | D | حالة الطلب الحالية؟
free | X | إلغاء مباشر مجاني (قبل بدء التجميع/التجهيز) | CUSTOMER_CANCELLED
appr | W | يتطلب موافقة (أثناء التجميع/التجهيز): خدمة العملاء تقيّم التكلفة (⚠ D-23)
apr  | D | قرار الدعم؟
fee  | P | إلغاء برسوم (قيمة الطعام المجهّز/رسوم الإلغاء) بموافقة العميل
noc  | P | رفض الإلغاء: الطلب يستمر
late | W | بعد خروج الرايدر: لا إلغاء ذاتي؛ يتحول إلى "رفض استلام" عبر P21 مع مسؤولية العميل
tw   | X | إلغاء من توّا (لا رايدر/لا مخزون/خطأ تشغيلي): إلغاء كامل أو للمكوّن مع تعويض | TWAA_CANCELLED
mc   | X | إلغاء من التاجر (رفض/مقفول/تأخير مفرط): إلغاء المكوّن + محاولة إعادة التوجيه أولاً (P08) | MERCHANT_CANCELLED
part | D | الإلغاء لمكوّن واحد أم للطلب كله؟
comp | P | إلغاء أمر التنفيذ فقط: باقي الأوامر تستمر، وإعادة حساب الإجمالي والرسوم | FO_CANCELLED
allc | P | إلغاء كل أوامر التنفيذ + إيقاف مهام التوصيل + تحرير الحجوزات | ALL_FO_CANCELLED
rel  | X | تحرير المخزون المحجوز / إبلاغ التاجر بالتوقف / إلغاء مهمة الرايدر | RESOURCES_RELEASED
paid | D | مدفوع مسبقاً؟
ref  | P | بدء الإرجاع (كامل أو جزئي) → P23-B
notif| X | إشعار العميل بنتيجة الإلغاء والمبلغ المسترد إن وجد | NOTIFY_CANCELLED
eC   | E | ملغى من العميل | CUSTOMER_CANCELLED | fail
eT   | E | ملغى من توّا | TWAA_CANCELLED | fail
eM   | E | ملغى من التاجر (مكوّن) | MERCHANT_CANCELLED | fail
eCont| E | الطلب يستمر | ORDER_CONTINUES | ok

s -> who
who -> st : العميل
who -> tw : توّا
who -> mc : التاجر
st -> free : قبل التجهيز : ok
st -> appr : أثناء التجهيز : wait
st -> late : بعد خروج الرايدر : fail
late -> eCont : يستمر للتسليم
appr -> apr
apr -> fee : موافقة برسوم
apr -> free : موافقة مجانية
apr -> noc : رفض
noc -> eCont
fee -> part
free -> part
tw -> part
mc -> part
part -> comp : مكوّن
part -> allc : الكل
comp -> rel : sys
allc -> rel : sys
rel -> paid
paid -> ref : نعم
paid -> notif : لا
ref -> notif
notif -> eC : طلب العميل
notif -> eT : طلب توّا
notif -> eM : طلب التاجر
`);

/* ---------- P23-B الإرجاع المالي ---------- */
G.p23b = parse("p23b", `
s    | S | طلب إرجاع مالي (إلغاء / فشل تسليم / استبدال / شكوى)
type | D | نوع الإرجاع؟
full | P | إرجاع كامل
partr| P | إرجاع جزئي (بند / كمية / فرق استبدال)
item | P | إرجاع بند بعد التسليم (تالف/ناقص/غلط) — يتطلب حالة دعم
dfee | P | إرجاع رسوم التوصيل فقط (تأخير مفرط)
promo| P | استعادة الكوبون/العرض المستخدم إن كان الإلغاء من جهتنا | PROMO_RESTORED
resp | X | تحديد المسؤول (عميل/تاجر/توّا/رايدر) والمبلغ والسبب | REFUND_CASE
lvl  | D | مستوى الموافقة حسب المبلغ؟ (⚠ D-23b الحدود)
autoA| X | موافقة تلقائية (≤ الحد الأول) | AUTO_APPROVED
sup  | W | موافقة مشرف الدعم (≤ الحد الثاني)
fin  | W | موافقة المالية (فوق الحد الثاني)
dec  | D | القرار؟
den  | P | رفض الإرجاع مع تبليغ العميل بالسبب وحق التصعيد
meth | D | طريقة الإرجاع؟
codm | P | كان كاش: تحويل للمحفظة الإلكترونية للعميل / إنستاباي بعد التحقق من الرقم (⚠ D-23c) أو خصم من الطلب القادم
gw   | X | كان أونلاين: أمر إرجاع عبر البوابة على نفس البطاقة (3–5 أيام عمل) | GATEWAY_REFUND
wal  | X | رصيد محفظة توّا (فوري) — مرحلة لاحقة | WALLET_CREDIT
track| X | تسجيل: السبب، المسؤول، مستوى الموافقة، طريقة الدفع، مرجع الإرجاع، SLA | REFUND_TRACKED
done | D | تأكيد وصول المبلغ؟ (Callback من البوابة / تأكيد التحويل)
pend | W | متابعة: إعادة الاستعلام حتى SLA ثم تصعيد للمالية | REFUND_PENDING
notif| X | إشعار العميل: "تم رد X ج.م على [الطريقة]" | NOTIFY_REFUNDED
eF   | E | مسترد بالكامل | FULLY_REFUNDED | neutral
eP   | E | مسترد جزئياً ومغلق | PARTIALLY_REFUNDED_AND_CLOSED | neutral
eD   | E | مرفوض ومغلق بعد قرار الدعم | CLOSED_AFTER_SUPPORT_RESOLUTION | neutral

s -> type
type -> full : كامل
type -> partr : جزئي
type -> item : بند بعد التسليم
type -> dfee : رسوم توصيل
full -> promo
partr -> resp
item -> resp
dfee -> resp
promo -> resp
resp -> lvl
lvl -> autoA : تلقائي
lvl -> sup : مشرف : wait
lvl -> fin : مالية : wait
autoA -> meth
sup -> dec
fin -> dec
dec -> meth : موافقة
dec -> den : رفض : fail
den -> eD
meth -> codm : كاش
meth -> gw : أونلاين
meth -> wal : محفظة
codm -> track
gw -> track
wal -> track
track -> done
done -> notif : نعم : ok
done -> pend : لا : wait
pend -> done
notif -> eF : كان كاملاً
notif -> eP : كان جزئياً
`);

/* ---------- P24 التسوية المالية ---------- */
G.p24 = parse("p24", `
s    | S | الطلب وصل حالة إغلاق تشغيلي (مسلَّم / مرتجع / ملغى)
gate | D | كل أوامر التنفيذ ومهام التوصيل مغلقة ولا توجد حالة دعم مفتوحة؟
hold | W | انتظار إغلاق الحالات المفتوحة (مؤقت SLA + تنبيه) | SETTLEMENT_PENDING
calc | X | احتساب: ما دفعه العميل، إيراد المنتجات، مستحق التاجر، عمولة توّا، رسوم التوصيل، أجر الرايدر، الخصم ومن موّله، الإرجاعات، رسوم بوابة الدفع، الضرائب إن انطبقت، مبلغ الكاش، التعديلات (استبدال/تلف/مسؤولية) | ORDER_LEDGER
cod  | D | كان كاش؟
codr | D | الكاش المحصّل مطابق للمتوقع ومودَع من الرايدر؟
codv | W | فرق تحصيل / لم يودَع: فتح حالة فرق كاش على الرايدر (SLA إيداع) | COD_DISCREPANCY
codres| D | تمت التسوية؟
codded| X | خصم الفرق من تسوية الرايدر بعد التحقيق / تسجيل خسارة | COD_VARIANCE_SETTLED
recon| X | مطابقة: المدفوعات (بوابة/كاش) مقابل دفتر الطلب مقابل الإرجاعات | RECONCILED
ok   | D | المطابقة ناجحة؟
var  | W | تحقيق فرق مالي من المالية (SLA) | FINANCE_INVESTIGATION
ms   | X | تحديث كشف تسوية التاجر: مستحقاته − العمولة − الخصومات المموّلة منه − خصومات المسؤولية | MERCHANT_SETTLEMENT_LINE
rs   | X | تحديث كشف تسوية الرايدر: أجر المهمة + حوافز − فروق كاش − خصومات مسؤولية | RIDER_SETTLEMENT_LINE
ts   | X | تحديث دفتر توّا: الإيراد، الهامش الإجمالي، تكلفة التوصيل، تكلفة العروض، الهالك، هامش المساهمة | TWAA_PNL_LINE
cycle| P | إدراج السطور في دورة الصرف (أسبوعية للتاجر / يومية-أسبوعية للرايدر ⚠ D-24)
pay  | D | تم صرف التاجر والرايدر وتأكيد الاستلام؟
disp | W | نزاع تسوية من التاجر/الرايدر: مراجعة كشف الحساب خلال SLA | SETTLEMENT_DISPUTE
close| X | إغلاق مالي نهائي | FINANCIALLY_CLOSED
eOK  | E | مسلّم ومغلق مالياً | DELIVERED_AND_FINANCIALLY_CLOSED | ok
ePart| E | مسلّم جزئياً ومسوّى | PARTIALLY_DELIVERED_AND_SETTLED | neutral
eRet | E | مرتجع/ملغى ومسوّى | RETURNED_OR_CANCELLED_SETTLED | neutral

s -> gate
gate -> calc : نعم : sys
gate -> hold : لا : wait
hold -> gate
calc -> cod
cod -> codr : نعم
cod -> recon : لا : sys
codr -> recon : نعم : sys
codr -> codv : لا : fail
codv -> codres
codres -> recon : نعم
codres -> codded : لا (تجاوز SLA) : fail
codded -> recon
recon -> ok
ok -> ms : نعم : ok
ok -> var : لا : fail
var -> recon : بعد التصحيح
ms -> rs : sys
rs -> ts : sys
ts -> cycle
cycle -> pay
pay -> close : نعم : ok
pay -> disp : لا (نزاع) : wait
disp -> cycle : بعد الحل
close -> eOK : مسلّم كاملاً
close -> ePart : مسلّم جزئياً
close -> eRet : مرتجع/ملغى
`);

/* ---------- P25 ما بعد التوصيل والدعم ---------- */
G.p25 = parse("p25", `
s    | S | الطلب مسلَّم (كلياً أو جزئياً)
rate | X | إشعار التقييم بعد X دقيقة: الطلب، المنتجات، التاجر، الرايدر، تجربة التوصيل | RATING_REQUEST
resp | D | العميل قيّم؟
low  | D | تقييم منخفض (≤ 2) أو شكوى نصية؟
case | X | فتح حالة دعم تلقائياً بأولوية + ربطها بالطلب | SUPPORT_CASE_OPENED
kind | D | نوع الطلب من العميل؟
comp | P | شكوى (تأخير/سلوك/جودة): تصنيف + تحقيق + رد خلال SLA
ret  | P | إرجاع بند: التحقق (صورة/سبب) → P23-B + استرداد الصنف إن لزم (P22)
ref  | P | طلب استرداد: → P23-B
reo  | P | إعادة الطلب: إعادة التحقق (P02) وإنشاء طلب جديد
refr | P | إحالة صديق: توليد كود + قواعد الاستحقاق (بعد أول توصيل ناجح للمُحال)
promo| P | عرض مخصص: كوبون اعتذار/ولاء حسب سياسة CRM
sup  | P | تواصل مع الدعم: شات/اتصال/واتساب مع سياق الطلب
crm  | X | تحديث ملف العميل: الترتيب، التفضيلات، حالة دورة الحياة، النقاط | CRM_UPDATED
ok   | D | الحالة أُغلقت خلال SLA؟
esc  | W | تصعيد لمشرف الدعم ثم مدير العمليات
eC   | E | مسلَّم ومغلق | DELIVERED_AND_CLOSED | ok
eS   | E | مغلق بعد قرار الدعم | CLOSED_AFTER_SUPPORT_RESOLUTION | neutral

s -> rate : sys
rate -> resp
resp -> low : نعم
resp -> crm : لا (بعد انتهاء مهلة التقييم)
low -> case : نعم : fail
low -> crm : لا
case -> kind
kind -> comp : شكوى
kind -> ret : إرجاع
kind -> ref : استرداد
kind -> sup : تواصل
comp -> ok
ret -> ok
ref -> ok
sup -> ok
ok -> crm : نعم
ok -> esc : لا : wait
esc -> ok
crm -> reo : إعادة طلب
crm -> refr : إحالة
crm -> promo : عرض
crm -> eC : ok
reo -> eC
refr -> eC
promo -> eC
case -> eS : بعد الإغلاق
`);

/* ---------- Master lifecycle map ---------- */
G.master = parse("master", `
s    | S | العميل يفتح توّا
p01  | P | P01 الدخول ونطاق الخدمة
svc  | D | داخل النطاق؟
eOut | E | خارج نطاق الخدمة | OUTSIDE_SERVICE_AREA | fail
p02  | P | P02–P03 الاكتشاف والسلة
p04  | P | P04 التحقق قبل الدفع
v    | D | السلة صالحة؟
eAb  | E | ترك الدفع | CHECKOUT_ABANDONED | fail
p05  | P | P05 شاشة الدفع
pay  | D | طريقة الدفع؟
p06a | P | P06-A دفع أونلاين
p06b | P | P06-B كاش
pr   | D | نتيجة الدفع؟
eRec | E | تسوية دفع ومغلق | PAYMENT_RECONCILED_AND_CLOSED | neutral
ePF  | E | فشل الدفع | PAYMENT_FAILED | fail
p07  | X | P07 إنشاء الطلب وتقسيمه إلى أوامر تنفيذ | CREATED → CONFIRMED
p08  | X | P08 توجيه كل بند لنقطة التنفيذ | ALLOCATED
fo   | D | لكل أمر تنفيذ: نقطة التنفيذ؟
p09h | P | P09 تأكيد مخزون الهب
p09m | P | P09 إرسال للتاجر وقبوله
av   | D | التوافر؟
p10  | P | P10 الاستبدال / الحذف / التنازل عن الحد الأدنى
eOOS | E | ملغى لعدم التوافر | OUT_OF_STOCK_CANCELLED | fail
p11  | P | P11 التجميع
p12  | P | P12 التغليف | READY_FOR_DISPATCH
p13  | P | P13 تجهيز التاجر | READY_FOR_PICKUP
eMC  | E | مكوّن ملغى من التاجر | MERCHANT_CANCELLED | fail
p14  | X | P14 محرك تنسيق التوصيل: رايدر واحد / متعدد / مجمّع / مجدول
p15  | P | P15 تعيين الرايدر
ra   | D | رايدر متاح؟
eTC  | E | ملغى من توّا | TWAA_CANCELLED | fail
p16  | P | P16 الاستلام ونقل الحيازة | PICKED_UP
p17  | P | P17 في الطريق | IN_TRANSIT
p18  | P | P18 الوصول والتواصل | ARRIVED
p19  | P | P19 تحصيل الكاش
p20  | P | P20 إثبات التسليم
dr   | D | نتيجة التسليم؟
p21  | P | P21 فشل التسليم: المسؤولية والإجراء
p22  | P | P22 الإرجاع للأصل | RETURNED
p23  | P | P23 الإلغاء والإرجاع المالي
p24  | X | P24 التسوية المالية | SETTLEMENT_PENDING
p25  | P | P25 التقييم والدعم
canc | N | الإلغاء (P23-A) ممكن من أي مرحلة قبل خروج الرايدر؛ بعدها يُعالج كفشل تسليم
eD   | E | مسلّم ومغلق مالياً | DELIVERED_AND_FINANCIALLY_CLOSED | ok
eP   | E | مسلّم جزئياً ومسوّى | PARTIALLY_DELIVERED_AND_SETTLED | neutral
eDF  | E | فشل تسليم: مرتجع / مسترد | DELIVERY_FAILED_RETURNED / REFUNDED | fail
eRF  | E | مسترد كلياً أو جزئياً | FULLY / PARTIALLY_REFUNDED | neutral

s -> p01
p01 -> svc
svc -> p02 : نعم : ok
svc -> eOut : لا : fail
p02 -> p04
p04 -> v
v -> p05 : نعم
v -> eAb : لا : fail
p05 -> pay
pay -> p06a : أونلاين
pay -> p06b : كاش
p06a -> pr
p06b -> p07 : معتمد
pr -> p07 : نجح : ok
pr -> ePF : فشل : fail
pr -> eRec : معلّق ثم تسوية : wait
p07 -> p08 : sys
p08 -> fo
fo -> p09h : هب توّا
fo -> p09m : تاجر / مطعم
p09h -> av
p09m -> av
av -> p11 : متاح (هب)
av -> p13 : متاح (تاجر)
av -> p10 : جزئي / غير متاح : wait
p10 -> p11 : تم الحل (هب)
p10 -> p13 : تم الحل (تاجر)
p10 -> eOOS : لا حل : fail
p11 -> p12
p12 -> p14
p13 -> p14 : جاهز
p13 -> eMC : إلغاء : fail
p14 -> p15
p15 -> ra
ra -> p16 : نعم
ra -> eTC : لا : fail
p16 -> p17
p17 -> p18
p18 -> p19 : العميل موجود
p18 -> p21 : غير متاح : fail
p19 -> p20 : تم الدفع
p19 -> p21 : لم يدفع : fail
p20 -> dr
dr -> p24 : كامل : ok
dr -> p23 : جزئي : wait
dr -> p21 : رفض / تالف : fail
p21 -> p22 : إرجاع للأصل
p21 -> p23 : إرجاع مالي
p22 -> p24
p23 -> p24
p24 -> p25 : مسلّم
p25 -> eD : ok
p24 -> eP : جزئي
p24 -> eDF : فشل تسليم
p24 -> eRF : مسترد
canc -> p23 : sys
`);

/* ---------- Order state machine ---------- */
G.states = parse("states", `
CART | K | سلة | CART
CHECKOUT | K | شاشة الدفع | CHECKOUT
PAYMENT_PENDING | W | انتظار الدفع | PAYMENT_PENDING
PAYMENT_FAILED | W | فشل الدفع | PAYMENT_FAILED
PAYMENT_RECON | W | تسوية دفع مطلوبة | PAYMENT_RECONCILIATION_REQUIRED
CREATED | X | تم إنشاء الطلب | CREATED
CONFIRMED | X | مؤكد | CONFIRMED
ALLOCATED | X | موزّع على أوامر تنفيذ | ALLOCATED
AVAIL | X | فحص التوافر | AVAILABILITY_CHECK
PARTIAL | W | متاح جزئياً | PARTIALLY_AVAILABLE
AWAIT | W | انتظار قرار العميل | AWAITING_CUSTOMER_DECISION
INVMM | W | عدم تطابق مخزون | INVENTORY_MISMATCH
MTO | W | مهلة التاجر انتهت | MERCHANT_TIMEOUT
MREJ | W | رفض التاجر | MERCHANT_REJECTED
PICKING | P | تجميع | PICKING
PREPARING | P | تجهيز التاجر | PREPARING
PDELAY | W | تأخر التجهيز | PREPARATION_DELAYED
READY | P | جاهز | READY
RASSIGN | P | تعيين رايدر | RIDER_ASSIGNMENT
RUNAV | W | لا رايدر | RIDER_UNAVAILABLE
RASSIGNED | P | رايدر معيّن | RIDER_ASSIGNED
PICKED | P | تم الاستلام | PICKED_UP
TRANSIT | P | في الطريق | IN_TRANSIT
DDELAY | W | تأخر التوصيل | DELIVERY_DELAYED
ARRIVED | P | وصل | ARRIVED
UNREACH | W | العميل غير متاح | CUSTOMER_UNREACHABLE
DELIVERED | P | تم التوصيل | DELIVERED
DFAIL | W | فشل التوصيل | DELIVERY_FAILED
RTO | W | إرجاع للأصل | RETURN_TO_ORIGIN
RETURNED | W | مرتجع | RETURNED
REFPEND | W | إرجاع مالي معلّق | REFUND_PENDING
PREF | W | مسترد جزئياً | PARTIALLY_REFUNDED
REF | W | مسترد | REFUNDED
CANCELLED | W | ملغى | CANCELLED
SETTLE | X | تسوية معلّقة | SETTLEMENT_PENDING
CLOSED | E | مغلق | CLOSED | ok

CART -> CHECKOUT : إتمام الطلب
CHECKOUT -> CART : رجوع/فشل التحقق
CHECKOUT -> PAYMENT_PENDING : دفع أونلاين
CHECKOUT -> CREATED : كاش معتمد
PAYMENT_PENDING -> CREATED : نجح : ok
PAYMENT_PENDING -> PAYMENT_FAILED : فشل : fail
PAYMENT_PENDING -> PAYMENT_RECON : مهلة/معلّق : wait
PAYMENT_FAILED -> CHECKOUT : إعادة محاولة
PAYMENT_FAILED -> CLOSED : ترك
PAYMENT_RECON -> CREATED : الدفع مؤكد : ok
PAYMENT_RECON -> REF : إرجاع تلقائي : fail
CREATED -> CONFIRMED : sys
CONFIRMED -> ALLOCATED : sys
ALLOCATED -> AVAIL : sys
AVAIL -> PICKING : هب متاح
AVAIL -> PREPARING : تاجر قبل
AVAIL -> PARTIAL : جزئي : wait
AVAIL -> INVMM : رف فاضي : fail
AVAIL -> MTO : لا رد : fail
AVAIL -> MREJ : رفض : fail
INVMM -> PICKING : اتلقى
INVMM -> PARTIAL : لم يُلقَ
MTO -> PREPARING : أكّد بعد الاتصال
MTO -> AVAIL : إعادة توجيه
MTO -> CANCELLED : لا بديل
MREJ -> AVAIL : إعادة توجيه
MREJ -> CANCELLED : لا بديل
PARTIAL -> AWAIT : اسألني الأول : wait
PARTIAL -> PICKING : بديل تلقائي/حذف
PARTIAL -> PREPARING : بديل تلقائي/حذف
PARTIAL -> CANCELLED : تحت الحد الأدنى
AWAIT -> PICKING : رد/احتياطي
AWAIT -> PREPARING : رد/احتياطي
AWAIT -> CANCELLED : حذف الكل
PICKING -> READY : تغليف مكتمل
PICKING -> INVMM : استثناء مخزون
PREPARING -> READY : جاهز
PREPARING -> PDELAY : تجاوز SLA : fail
PDELAY -> READY : جهز
PDELAY -> AVAIL : إعادة توجيه
PDELAY -> CANCELLED : إلغاء المكوّن
READY -> RASSIGN : sys
RASSIGN -> RASSIGNED : قبول : ok
RASSIGN -> RUNAV : تجاوز المحاولات : fail
RUNAV -> RASSIGN : تمديد/بديل
RUNAV -> CANCELLED : لا حل
RASSIGNED -> PICKED : مسح الاستلام
RASSIGNED -> RASSIGN : إلغاء الرايدر
PICKED -> TRANSIT : sys
TRANSIT -> ARRIVED : وصل
TRANSIT -> DDELAY : تأخير : fail
TRANSIT -> RTO : تلف/تعذّر
DDELAY -> ARRIVED : وصل
DDELAY -> RTO : تعذّر
ARRIVED -> DELIVERED : إثبات تسليم : ok
ARRIVED -> UNREACH : لا رد : fail
ARRIVED -> DFAIL : رفض/كاش/تالف : fail
UNREACH -> DELIVERED : تم الوصول
UNREACH -> DFAIL : انتهت المهلة
DFAIL -> ARRIVED : إعادة محاولة
DFAIL -> RTO : إرجاع
DFAIL -> REFPEND : قرار إرجاع مالي
RTO -> RETURNED : مسح المرتجع
RETURNED -> REFPEND : مدفوع
RETURNED -> SETTLE : كاش لم يُحصّل
DELIVERED -> SETTLE : sys
DELIVERED -> REFPEND : شكوى مقبولة
CANCELLED -> REFPEND : مدفوع
CANCELLED -> SETTLE : غير مدفوع
REFPEND -> REF : كامل
REFPEND -> PREF : جزئي
REF -> SETTLE
PREF -> SETTLE
SETTLE -> CLOSED : مغلق مالياً : ok
`, { nodesep: 14, ranksep: 34, tight: true });

/* ---------- Order architecture: CO → FO → Tasks ---------- */
G.arch = parse("arch", `
co   | X | طلب العميل TWA-10452 | CUSTOMER_ORDER
i1   | K | أرز 5 كجم
i2   | K | مسحوق غسيل
i3   | K | وجبة من مطعم
fo1  | P | FO-001 هب توّا: أرز + مسحوق | FULFILLMENT_ORDER
fo2  | M | FO-002 المطعم: الوجبة | FULFILLMENT_ORDER
t1   | P | مهمة تجميع | PICK_TASK
t2   | P | مهمة تغليف | PACK_TASK
t3   | M | مهمة تجهيز عند التاجر | MERCHANT_PREP_TASK
eng  | D | محرك التوصيل: خطة التسليم؟
d1   | P | مهمة توصيل واحدة: رايدر يمر بالهب ثم المطعم | DELIVERY_TASK x1
d2   | P | مهمتان: رايدر للبقالة ورايدر للوجبة | DELIVERY_TASK x2
d3   | W | تسليم البقالة الآن وتأجيل الوجبة (تأخر المطعم) | DELIVERY_TASK x2 (SPLIT)
cust | E | العميل يرى طلباً واحداً: "بيتجهز → خرج للتوصيل → وصلك" مع تفاصيل كل مكوّن | ONE_CUSTOMER_EXPERIENCE | ok

co -> i1
co -> i2
co -> i3
i1 -> fo1
i2 -> fo1
i3 -> fo2
fo1 -> t1 : sys
t1 -> t2 : sys
fo2 -> t3 : sys
t2 -> eng
t3 -> eng
eng -> d1 : دمج
eng -> d2 : منفصل
eng -> d3 : تأجيل مكوّن : wait
d1 -> cust : ok
d2 -> cust : ok
d3 -> cust : ok
`, { noAudit: true });

/* ---------- Core data entities (ER, high level) ---------- */
G.er = parse("er", `
cust | P | العميل | Customer
addr | P | العنوان | Address
zone | P | منطقة الخدمة | ServiceZone
co   | X | طلب العميل | CustomerOrder
oi   | P | بند الطلب | OrderItem
fo   | X | أمر التنفيذ | FulfillmentOrder
fi   | P | بند التنفيذ | FulfillmentItem
mer  | M | التاجر | Merchant
hub  | M | الهب | Hub
inv  | P | المخزون | Inventory
res  | P | حجز المخزون | InventoryReservation
sub  | P | الاستبدال | Substitution
pay  | P | الدفع | Payment
ref  | P | الإرجاع المالي | Refund
promo| P | العرض / الكوبون | Promotion
pkg  | P | الطرد | Package
dt   | X | مهمة التوصيل | DeliveryTask
rider| M | الرايدر | Rider
veh  | P | المركبة | Vehicle
da   | P | محاولة التسليم | DeliveryAttempt
pod  | P | إثبات التسليم | ProofOfDelivery
cod  | P | تحصيل الكاش | CODCollection
ret  | P | المرتجع | Return
sc   | P | حالة الدعم | SupportCase
ms   | P | تسوية التاجر | MerchantSettlement
rs   | P | تسوية الرايدر | RiderSettlement
ev   | N | سجل أحداث الطلب | OrderEvent
nt   | N | الإشعار | Notification

cust -> addr : 1..n
addr -> zone : ينتمي
cust -> co : 1..n
co -> oi : 1..n
co -> fo : 1..n
fo -> fi : 1..n
oi -> fi : 1..n
fo -> mer : نقطة تنفيذ
fo -> hub : نقطة تنفيذ
hub -> inv : 1..n
inv -> res : 1..n
fi -> res : 0..1
fi -> sub : 0..1
co -> pay : 1..n
pay -> ref : 0..n
co -> promo : 0..n
fo -> pkg : 1..n
pkg -> dt : n..1
dt -> rider : 0..1
rider -> veh : 1..n
dt -> da : 1..n
da -> pod : 0..1
da -> cod : 0..1
cod -> rs : يُسوّى في
da -> ret : 0..1
co -> sc : 0..n
fo -> ms : يُسوّى في
dt -> rs : يُسوّى في
co -> ev : 1..n
ev -> nt : 0..n
`, { nodesep: 22, ranksep: 40, noAudit: true });

module.exports = G;
