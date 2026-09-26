const { parse } = require("./dsl");
const G = {};

/* ---------- P14 محرك تنسيق التوصيل ---------- */
G.p14 = parse("p14", `
s    | S | أمر تنفيذ أصبح جاهزاً (أو على وشك)
cnt  | D | عدد أوامر التنفيذ في طلب العميل؟
one  | P | مكوّن واحد: مهمة توصيل واحدة من نقطة واحدة | PLAN: ONE_RIDER_ONE_PICKUP
allr | D | كل المكوّنات جاهزة أو ستجهز خلال نافذة الدمج؟ (⚠ D-14 نافذة الدمج)
near | D | نقاط الاستلام قريبة من بعضها؟ (مسافة/زمن ≤ الحد)
food | D | يوجد مكوّن حساس للحرارة/الوقت (وجبة ساخنة، مجمّد)؟
promise| D | الدمج يحافظ على وعد ETA للعميل؟
cons | P | رايدر واحد، عدة نقاط استلام مرتبة بالمسار (الوجبة الساخنة آخر استلام) | PLAN: ONE_RIDER_MULTI_PICKUP
multi| P | عدة رايدرز: مهمة لكل مكوّن، والعميل يرى "هيوصل على مرتين" | PLAN: MULTI_RIDER
delay| D | تأخير مكوّن يضر بالوعد؟
hold | P | تسليم الجاهز الآن وتأجيل المكوّن المتأخر كمهمة ثانية + إبلاغ العميل | PLAN: SPLIT_DELIVERY
waitc| W | انتظار اكتمال المكوّنات ضمن النافذة (مؤقت) 
zone | D | منطقة التسليم؟
batch| D | توجد طلبات أخرى لنفس القرية/المسار خلال نافذة التجميع؟
sched| P | توصيل قروي مجدول: تجميع الطلبات على رحلة واحدة في الموعد المعلن للقرية | PLAN: SCHEDULED_VILLAGE
bat  | P | توصيل مجمّع: رايدر واحد لعدة عملاء على نفس المسار (حد أقصى للطلبات وللزمن) | PLAN: BATCHED
single| P | مهمة فردية
calc | X | لكل خطة: حساب ETA، المسافة، السعة المطلوبة، حساسية الحرارة، الوعد للعميل، التكلفة | PLAN_SCORING
pick | X | اختيار الخطة الأقل تكلفة التي تحقق وعد ETA + إنشاء مهام التوصيل | DELIVERY_TASKS_CREATED
go   | E | إلى تعيين الرايدر P15 | RIDER_ASSIGNMENT | ok

s -> cnt
cnt -> one : واحد
cnt -> allr : أكثر من واحد
allr -> near : نعم
allr -> delay : لا : wait
delay -> hold : نعم : fail
delay -> waitc : لا : wait
waitc -> allr
near -> food : نعم
near -> multi : لا
food -> promise : نعم
food -> cons : لا
promise -> cons : نعم
promise -> multi : لا
one -> zone
cons -> zone
multi -> zone
hold -> zone
zone -> batch : داخل المدينة
zone -> sched : قرية بجدول
batch -> bat : نعم
batch -> single : لا
sched -> calc
bat -> calc
single -> calc
calc -> pick : sys
pick -> go : ok
`);

/* ---------- P15 تعيين الرايدر ---------- */
G.p15 = parse("p15", `
s    | S | مهمة توصيل جديدة
find | X | ترشيح الرايدرز: متاح، المسافة لنقطة الاستلام، نوع المركبة (بارد/حجم)، السعة المتبقية، حد تعرّض الكاش، المسار الحالي | RIDER_CANDIDATES
any  | D | يوجد مرشح مناسب؟
mode | D | وضع التعيين؟
manual| W | الموزّع يختار الرايدر يدوياً من لوحة التوزيع | MANUAL_DISPATCH
autoa| X | تعيين تلقائي لأفضل مرشح (الأقرب ثم الأقل حملاً) وإرسال العرض | OFFER_SENT
resp | D | رد الرايدر خلال المهلة؟
acc  | X | قبول: تثبيت التعيين وإبلاغ العميل "تم تعيين المندوب" | RIDER_ASSIGNED
rej  | X | رفض أو انتهاء المهلة: تسجيل السبب + خفض ترتيب الرايدر مؤقتاً | OFFER_DECLINED
tries| D | عدد المحاولات < الحد الأقصى؟ (⚠ D-15)
unav | X | لا يوجد رايدر | RIDER_UNAVAILABLE
ct   | W | تدخل Control Tower: قرار خلال SLA
opt  | D | الخيار؟
ext  | P | تمديد ETA وإبلاغ العميل + إعادة المحاولة بعد X دقائق
alt  | P | رايدر بديل: من منطقة مجاورة / موتوسيكل بدل دراجة / رايدر احتياطي
reb  | P | إعادة التجميع مع مهمة أخرى على نفس المسار (P14)
canc | D | يستحيل التوصيل في وقت مقبول؟
ccl  | P | إلغاء المهمة/الطلب من توّا + إبلاغ العميل + إرجاع (P23) + إعادة المخزون للرف | TWAA_CANCELLED
go   | E | رايدر معيّن → الاستلام P16 | RIDER_ASSIGNED | ok
cE   | E | ملغى من توّا (لا رايدر) | TWAA_CANCELLED | fail

s -> find : sys
find -> any
any -> mode : نعم
any -> unav : لا : fail
mode -> autoa : تلقائي
mode -> manual : يدوي : wait
manual -> autoa
autoa -> resp
resp -> acc : قبول : ok
resp -> rej : رفض / مهلة : fail
acc -> go
rej -> tries
tries -> find : نعم
tries -> unav : لا : fail
unav -> ct : wait
ct -> opt
opt -> ext : تمديد
opt -> alt : بديل
opt -> reb : إعادة تجميع
opt -> canc : لا حل
ext -> find
alt -> find
reb -> find
canc -> ccl : نعم : fail
canc -> ext : لا
ccl -> cE
`);

/* ---------- P16 الاستلام (نقل الحيازة) ---------- */
G.p16 = parse("p16", `
s    | S | الرايدر وصل نقطة الاستلام (هب / تاجر)
idv  | D | هوية الرايدر مطابقة للتعيين؟ (كود/صورة في تطبيق نقطة الاستلام)
blk  | P | منع التسليم + تنبيه الموزّع | IDENTITY_MISMATCH
scan | P | مسح باركود كل طرد
match| D | الطرد يخص هذه المهمة؟
wrong| P | حجب المسح: "طرد غلط" + إعادته لمكانه | WRONG_PACKAGE_BLOCKED
cnt  | D | عدد الطرود مكتمل؟
miss | W | طرد ناقص: البحث في منطقة التسليم / إعادة التغليف — ممنوع المغادرة | PACKAGE_MISSING
found| D | اتلقى خلال SLA؟
cond | D | حالة الطرد سليمة؟ (تسريب/تلف/فتح)
dmg  | P | إعادة الطرد للتغليف/للتاجر لإعادة التجهيز | RETURN_TO_PACKING
cod  | P | عرض مبلغ الكاش المطلوب تحصيله للرايدر وتأكيد اطلاعه
hand | X | مسح التسليم: نقل الحيازة — من سلّم، من استلم، الوقت، الموقع GPS | CUSTODY_TRANSFERRED
merch| N | عند التاجر: التاجر يؤكد التسليم من تطبيقه (أو رمز OTP للرايدر) لتثبيت المسؤولية
more | D | نقاط استلام أخرى في نفس المهمة؟
next | P | التوجه لنقطة الاستلام التالية
go   | E | تم الاستلام → في الطريق P17 | PICKED_UP | ok
esc  | E | تصعيد للـ Control Tower: المهمة محجوبة | PICKUP_BLOCKED | fail

s -> idv
idv -> scan : نعم
idv -> blk : لا : fail
blk -> esc
scan -> match
match -> cnt : نعم
match -> wrong : لا : fail
wrong -> scan
cnt -> cond : نعم
cnt -> miss : لا : wait
miss -> found
found -> scan : نعم
found -> esc : لا : fail
cond -> cod : سليم
cond -> dmg : تالف : fail
dmg -> miss
cod -> hand : sys
hand -> merch
merch -> more
more -> next : نعم
next -> s
more -> go : لا : ok
`);

/* ---------- P17 في الطريق ---------- */
G.p17 = parse("p17", `
s    | S | الرايدر غادر نقطة الاستلام | IN_TRANSIT
trk  | X | تتبع حي: الموقع كل X ثانية، ETA متجدد، الانحراف عن المسار | LIVE_TRACKING
near | X | عند الاقتراب (≤ 500 م): إشعار العميل "المندوب قرّب" | NOTIFY_APPROACHING
exc  | D | حدث استثناء أثناء الطريق؟
type | D | نوع الاستثناء؟
traf | P | زحمة/طقس: تحديث ETA + إبلاغ العميل إن تجاوز الحد | DELIVERY_DELAYED
brk  | W | عطل/حادث: بلاغ من التطبيق → رايدر إنقاذ + مسح حيازة جديد | RIDER_RESCUE
ridr | W | انقطاع تواصل الرايدر > X د: اتصال ثم إنقاذ | RIDER_UNRESPONSIVE
addr | D | العميل طلب تغيير العنوان؟
addrok| D | العنوان الجديد داخل نفس المنطقة وضمن حد المسافة؟
upd  | P | تحديث المهمة وETA (ورسوم إضافية إن كانت السياسة تسمح ⚠ D-17)
addrn| P | رفض التغيير: التسليم على العنوان الأصلي أو إعادة الجدولة كتوصيل جديد
dly  | P | طلب تأخير: قبول حتى X د (ليس للطعام الساخن) | CUSTOMER_REQUESTED_DELAY
dmg  | P | تلف الطرد: بلاغ بصورة → قرار Control Tower | PACKAGE_DAMAGED_IN_TRANSIT
multi| P | عدة توصيلات: الترتيب حسب الوعد والحرارة
nav  | P | طريق مقطوع: إعادة توجيه + ETA
arr  | E | الرايدر وصل → P18 | ARRIVED | ok
rto  | E | إرجاع للأصل → P22 | RETURN_TO_ORIGIN | fail

s -> trk : sys
trk -> exc
exc -> near : لا
near -> arr : ok
exc -> type : نعم : fail
type -> traf : زحمة/طقس
type -> brk : عطل/حادث
type -> ridr : مشكلة رايدر
type -> addr : طلب العميل
type -> dmg : تلف طرد
type -> multi : تعدد توصيلات
type -> nav : ملاحة
traf -> trk
brk -> trk : بعد نقل الحيازة
ridr -> trk : بعد نقل الحيازة
addr -> addrok : تغيير عنوان
addr -> dly : تأخير
addrok -> upd : نعم
addrok -> addrn : لا : fail
upd -> trk
addrn -> trk
dly -> trk : مقبول
dly -> rto : غير مقبول : fail
dmg -> trk : استبدال في الطريق
dmg -> rto : غير قابل للتسليم : fail
multi -> trk
nav -> trk
`);

/* ---------- P18 الوصول والتواصل مع العميل ---------- */
G.p18 = parse("p18", `
s    | S | الرايدر وصل عنوان العميل | ARRIVED
notif| X | إشعار العميل "المندوب عند بابك" + بدء مؤقت الانتظار | NOTIFY_ARRIVED
av   | D | العميل موجود ويستلم؟
call1| P | الرايدر يتصل بالعميل (محاولة 1)
ans1 | D | ردّ؟
wait | W | الانتظار X دقيقة عند الباب (مؤقت مرئي للعميل) ⚠ D-18
call2| P | محاولة اتصال 2 + رسالة واتساب "المندوب مستني عند الباب"
ans2 | D | ردّ؟
sup  | W | الرايدر يبلغ خدمة العملاء: تتصل بالعميل والرقم البديل إن وجد | CUSTOMER_UNREACHABLE
ans3 | D | تم الوصول للعميل خلال SLA؟
loc  | D | العميل يوجّه لمكان/شخص؟
auth | D | شخص مفوّض موجود ومسموح بالسياسة؟ (⚠ D-18b)
give | P | التسليم للشخص المفوّض مع تسجيل اسمه وOTP/تأكيد من العميل
comeb| D | العميل يطلب إعادة المحاولة لاحقاً؟
re   | D | إعادة المحاولة مسموحة؟ (النوع ليس طعاماً ساخناً + ضمن الحد + موافقة Control Tower)
rea  | P | جدولة إعادة محاولة (رسوم إعادة محاولة إن كانت السياسة تسمح) | REATTEMPT_SCHEDULED
never| N | ممنوع ترك الطلب بدون استلام إلا بسياسة صريحة مكتوبة مع إثبات (⚠ D-18c)
go   | E | متابعة التسليم → P19/P20 | HANDOVER | ok
fail | E | فشل التسليم → P21 | DELIVERY_FAILED | fail

s -> notif : sys
notif -> av
av -> go : نعم : ok
av -> call1 : لا
call1 -> ans1
ans1 -> loc : نعم
ans1 -> wait : لا : wait
wait -> call2
call2 -> ans2
ans2 -> loc : نعم
ans2 -> sup : لا : fail
sup -> ans3
ans3 -> loc : نعم
ans3 -> re : لا : fail
loc -> go : العميل بنفسه : ok
loc -> auth : شخص آخر
loc -> comeb : طلب تأجيل
auth -> give : نعم
auth -> comeb : لا
give -> go : ok
comeb -> re : نعم
comeb -> fail : لا (العميل يلغي) : fail
re -> rea : نعم : wait
re -> never : لا
rea -> fail
never -> fail : fail
`);

/* ---------- P19 تحصيل الكاش ---------- */
G.p19 = parse("p19", `
s    | S | بدء التسليم عند العميل
pre  | D | الطلب مدفوع مسبقاً؟
show | P | عرض المبلغ المطلوب للرايدر والعميل (شامل أي تعديل استبدال) | EXPECTED_COD_AMOUNT
exact| D | العميل معه المبلغ؟
chg  | D | الرايدر يقدر يفكّ؟ (رصيد فكة الرايدر)
dig  | D | العميل يقدر يدفع رقمياً الآن؟ (بطاقة عبر رابط / محفظة إلكترونية / QR)
link | X | توليد رابط دفع أو QR مرتبط بالطلب + انتظار التأكيد من البوابة | PAYMENT_LINK
linkr| D | تم الدفع خلال المهلة؟
partc| D | دفع جزئي مقبول بالسياسة؟ (⚠ D-19)
esc  | W | تصعيد لخدمة العملاء: قرار (تحويل لاحق / خصم بموافقة / رفض التسليم) | COD_ESCALATION
escr | D | قرار الدعم؟
coll | X | تحصيل: تسجيل المبلغ المتوقع، المحصّل، نوع الدفع (كاش/رقمي)، وإضافته لرصيد الرايدر | COD_COLLECTED
diff | D | المحصّل = المتوقع؟
var  | X | تسجيل فرق تحصيل مع السبب والموافقة | COD_VARIANCE
go   | E | شرط الدفع مستوفى → إثبات التسليم P20 | PAYMENT_SETTLED_AT_DOOR | ok
rej  | E | لا يمكن التسليم لعدم الدفع → P21 | DELIVERY_FAILED_COD | fail
skip | E | مدفوع مسبقاً → إثبات التسليم P20 | PREPAID | ok

s -> pre
pre -> skip : نعم : ok
pre -> show : لا
show -> exact
exact -> coll : نعم : ok
exact -> chg : لا
chg -> coll : نعم : ok
chg -> dig : لا
dig -> link : نعم
dig -> partc : لا
link -> linkr
linkr -> coll : نعم : ok
linkr -> partc : لا : fail
partc -> esc : لا : wait
partc -> coll : نعم (بموافقة)
esc -> escr
escr -> coll : تسليم بموافقة
escr -> rej : رفض التسليم : fail
coll -> diff : sys
diff -> go : نعم : ok
diff -> var : لا : wait
var -> go
`);

/* ---------- P20 إثبات التسليم ---------- */
G.p20 = parse("p20", `
s    | S | شرط الدفع مستوفى
proof| D | طريقة الإثبات المطلوبة لهذا الطلب؟ (حسب القيمة والسياسة)
otp  | P | العميل يقول كود الاستلام (OTP) للرايدر ويدخله في التطبيق
otpk | D | الكود صحيح؟
otpf | W | محاولة أخرى / إعادة إرسال الكود / تأكيد من خدمة العملاء بعد التحقق من الهوية
cust | P | تأكيد العميل من تطبيقه "استلمت"
sig  | P | توقيع على شاشة الرايدر (للقيم العالية)
photo| P | صورة الطرد عند التسليم (فقط عند سماح السياسة، مثل التسليم لشخص مفوّض)
sysc | X | تأكيد النظام: الموقع GPS ضمن نطاق العنوان + الوقت | SYSTEM_CONFIRMATION
res  | D | نتيجة التسليم؟
full | X | تسليم كامل | DELIVERED
part | X | تسليم جزئي: تحديد البنود غير المسلّمة والسبب | PARTIALLY_DELIVERED
rejc | X | العميل رفض الاستلام: تسجيل السبب | DELIVERY_REJECTED
dmg  | X | طرد تالف عند التسليم: صورة + قرار قبول جزئي أو رفض | DELIVERY_EXCEPTION
miss | X | صنف ناقص عند الفتح: فتح حالة صنف ناقص | MISSING_ITEM_CASE
close| X | إغلاق مهمة التوصيل + إشعار العميل "وصلك" + طلب التقييم (P25) | TASK_CLOSED
eD   | E | تم التوصيل → التسوية P24 | DELIVERED | ok
eP   | E | تسليم جزئي → إرجاع جزئي P23 + التسوية | PARTIALLY_DELIVERED | neutral
eF   | E | فشل/استثناء تسليم → P21 | DELIVERY_FAILED | fail

s -> proof
proof -> otp : OTP
proof -> cust : تأكيد من التطبيق
proof -> sig : توقيع
proof -> photo : صورة
otp -> otpk
otpk -> sysc : نعم
otpk -> otpf : لا : wait
otpf -> otpk
cust -> sysc
sig -> sysc
photo -> sysc
sysc -> res : sys
res -> full : كامل : ok
res -> part : جزئي : wait
res -> rejc : رفض : fail
res -> dmg : تالف : fail
res -> miss : صنف ناقص : fail
full -> close
close -> eD : ok
part -> close
close -> eP
rejc -> eF
dmg -> eF
miss -> eP
`);

module.exports = G;
