const { parse } = require("./dsl");
const G = {};

/* ---------- P07 إنشاء الطلب وتقسيمه ---------- */
G.p07 = parse("p07", `
s    | S | الدفع مؤكد أو الكاش معتمد
gate | D | كل شروط الإنشاء متحققة؟ (تحقق P04 ما زال صالحاً + لا يوجد طلب مكرر بنفس المفتاح)
rej  | P | رفض الإنشاء وإرجاع العميل لشاشة الدفع مع السبب (وإرجاع المبلغ إن دُفع) | ORDER_CREATE_REJECTED
co   | X | إنشاء طلب العميل: TWA-10452 | CUSTOMER_ORDER: CREATED
snap | X | تثبيت لقطة الطلب: البنود، الأسعار، الخصومات، من يموّل الخصم، الرسوم، العنوان، الموبايل، طريقة الدفع، المبلغ المتوقع كاش | ORDER_SNAPSHOT
grp  | X | تجميع البنود حسب نقطة التنفيذ (P08 التوجيه) | ITEM_GROUPING
n    | D | عدد نقاط التنفيذ؟
fo1  | X | إنشاء أمر تنفيذ واحد FO-001 | FULFILLMENT_ORDER x1
fon  | X | إنشاء أمر تنفيذ لكل نقطة: FO-001 هب توّا، FO-002 تاجر، FO-003 مطعم | FULFILLMENT_ORDER xN
attr | X | لكل أمر تنفيذ: حالة مستقلة، SLA تجهيز، بنود، قيمة، وقت تجهيز متوقع، نقطة استلام، حالة استثناء | FO_ATTRIBUTES
conf | X | تأكيد طلب العميل وبدء مؤقتات SLA | CUSTOMER_ORDER: CONFIRMED
notif| X | إشعار العميل: "تم تأكيد طلبك" (طلب واحد للعميل حتى لو تعددت الأوامر) | NOTIFY_ORDER_CONFIRMED
par  | P | تشغيل أوامر التنفيذ بالتوازي: هب → P09/P11، تاجر → P13 | PARALLEL_FULFILLMENT
view | N | العميل يرى دائماً طلباً واحداً بتقدم واحد: "بيتجهز" حتى تجهز كل المكوّنات، مع تفاصيل لكل مكوّن عند الطلب
go   | E | أوامر التنفيذ نشطة → P08 | ALLOCATED | ok
ecan | E | لم يُنشأ طلب | ORDER_NOT_CREATED | fail

s -> gate
gate -> co : نعم : sys
gate -> rej : لا : fail
rej -> ecan
co -> snap : sys
snap -> grp : sys
grp -> n
n -> fo1 : واحدة
n -> fon : أكثر من واحدة
fo1 -> attr
fon -> attr
attr -> conf : sys
conf -> notif : sys
notif -> par
par -> view
view -> go : ok
`);

/* ---------- P08 توجيه التنفيذ ---------- */
G.p08 = parse("p08", `
s    | S | لكل بند في الطلب
type | D | نوع البند؟
hub  | P | بند من مخزون توّا → هب توّا (المتجر المسؤول عن المنطقة) | ROUTE_HUB
dass | P | بند "توصيل فقط" (التاجر استقبل الطلب بنفسه) → أمر توصيل بدون تجهيز عندنا | ROUTE_DAAS
mopt | D | عدد التجار الذين يوفرون البند؟
one  | P | تاجر واحد → توجيه مباشر | ROUTE_MERCHANT
score| X | ترتيب المرشحين: التوافر، السعر، المسافة عن العميل، وقت التجهيز، موثوقية التاجر (قبول/تأخير/إلغاء)، أثر التوصيل (نفس المسار؟)، الهامش | ROUTING_SCORE
mvp  | N | MVP: قاعدة بسيطة = المتاح ثم الأقرب ثم الأرخص. الأوزان الكاملة مرحلة 2 (⚠ قرار مطلوب D-08)
pick | P | اختيار أفضل تاجر وتثبيت البديل التالي في حال الرفض | PRIMARY + FALLBACK
lock | D | التاجر المختار مفتوح ولديه سعة الآن؟
next | D | يوجد تاجر بديل؟
fb   | P | التوجيه للبديل التالي
none | P | وسم البند "لا مصدر متاح الآن" → عملية الاستبدال P10 | NO_SOURCE_AVAILABLE
fo   | X | إلحاق البند بأمر التنفيذ الخاص بنقطة التنفيذ (إنشاء FO جديد إن لم يوجد) | ATTACH_TO_FO
go   | E | البند موجّه | ROUTED | ok
sub  | E | البند إلى عملية الاستبدال → P10 | TO_SUBSTITUTION | neutral

s -> type
type -> hub : مخزون توّا
type -> mopt : تاجر/ماركت بليس
type -> dass : توصيل فقط
hub -> fo
dass -> fo
mopt -> one : واحد
mopt -> score : أكثر من واحد : sys
score -> mvp
mvp -> pick
one -> lock
pick -> lock
lock -> fo : نعم : ok
lock -> next : لا : fail
next -> fb : نعم
fb -> lock
next -> none : لا : fail
none -> sub
fo -> go : ok
`);

/* ---------- P09 تأكيد التوافر ---------- */
G.p09 = parse("p09", `
s    | S | أمر التنفيذ نشط
where| D | نقطة التنفيذ؟
sys  | D | المخزون في النظام يقول متاح؟ (المتاح = الفعلي − المحجوز)
res  | X | حجز الكمية للطلب | INVENTORY_RESERVED
task | X | إنشاء مهمة تجميع (P11) | PICK_TASK_CREATED
phys | D | الصنف موجود فعلياً عند التجميع؟
mm   | X | تسجيل عدم تطابق مخزون: النظام يقول موجود والرف فاضي | INVENTORY_MISMATCH
rec  | W | إعادة العد + البحث في موقع بديل (خلال SLA)
found| D | اتلقى؟
corr | X | تصحيح المخزون + فتح سجل تدقيق بالسبب | INVENTORY_CORRECTED
nos  | P | الصنف غير متاح في الهب → P10 الاستبدال
send | X | إرسال أمر التنفيذ للتاجر (تطبيق التاجر + واتساب/مكالمة كبديل) وبدء مؤقت القبول | MERCHANT_ORDER_SENT
resp | D | التاجر ردّ خلال المهلة؟
ans  | D | رد التاجر؟
acc  | X | قبول كامل → بدء التجهيز P13 | MERCHANT_ACCEPTED
part | X | قبول جزئي: تحديد البنود غير المتاحة → P10 | PARTIALLY_AVAILABLE
rejm | X | رفض كامل: تسجيل السبب (مقفول/لا توافر/فوق الطاقة) | MERCHANT_REJECTED
to   | X | انتهاء المهلة بدون رد | MERCHANT_TIMEOUT
call | W | خدمة العملاء تتصل بالتاجر (محاولة واحدة خلال SLA)
callr| D | التاجر أكّد؟
reroute| D | يوجد تاجر بديل (P08)؟
rr   | P | إعادة توجيه أمر التنفيذ للبديل وإبلاغ العميل بتغيير المصدر إن اختلف السعر/الوقت | FO_REROUTED
cancelfo| P | إلغاء أمر التنفيذ وإبلاغ العميل + إرجاع قيمته إن كان مدفوعاً (P23) | FO_CANCELLED
rest | D | باقي الطلب ما زال قابلاً للتنفيذ ومستوفياً للحد الأدنى؟
ok   | E | التوافر مؤكد للأمر | AVAILABILITY_CONFIRMED | ok
subE | E | إلى عملية الاستبدال → P10 | TO_SUBSTITUTION | neutral
cont | E | متابعة باقي الأوامر (إلغاء جزئي) | PARTIAL_ORDER_CONTINUES | neutral
oosc | E | إلغاء الطلب لعدم التوافر | OUT_OF_STOCK_CANCELLED | fail

s -> where
where -> sys : هب توّا
where -> send : تاجر / مطعم : sys
sys -> res : نعم : sys
sys -> nos : لا : fail
res -> task
task -> phys
phys -> ok : نعم : ok
phys -> mm : لا : fail
mm -> rec : wait
rec -> found
found -> corr : نعم
corr -> ok : ok
found -> nos : لا : fail
nos -> subE
send -> resp
resp -> ans : نعم
resp -> to : لا : fail
ans -> acc : قبول كامل : ok
ans -> part : قبول جزئي : wait
ans -> rejm : رفض : fail
acc -> ok
part -> subE
to -> call : wait
call -> callr
callr -> ans : نعم
callr -> reroute : لا : fail
rejm -> reroute
reroute -> rr : نعم
rr -> send : sys
reroute -> cancelfo : لا : fail
cancelfo -> rest
rest -> cont : نعم
rest -> oosc : لا : fail
`);

/* ---------- P10 النفاد والاستبدال ---------- */
G.p10 = parse("p10", `
s    | S | نتيجة التوافر لأمر التنفيذ
lvl  | D | مستوى التوافر؟
full | E | متاح بالكامل → متابعة التجهيز | FULLY_AVAILABLE | ok
none | P | الأمر كله غير متاح
pref | D | تفضيل العميل للاستبدال؟ (محدد في السلة)
auto | X | اختيار أقرب بديل معتمد: نفس الفئة والحجم، ضمن حد فرق السعر المسموح (BR-SUB-001) | AUTO_SUBSTITUTE
exists| D | يوجد بديل معتمد؟
rem  | P | حذف البند غير المتاح من الأمر | ITEM_REMOVED
price| D | سعر البديل مقارنة بالأصلي؟
same | P | تطبيق البديل بنفس السعر
lower| X | تطبيق البديل وتخفيض إجمالي العميل بالفرق (إرجاع الفرق إن كان مدفوعاً) | TOTAL_REDUCED
abs  | D | الفرق ≤ حد التحمّل الذي تتحمله توّا؟ (⚠ قرار مطلوب D-10)
absorb| X | توّا تتحمل الفرق: يبقى إجمالي العميل ثابتاً ويُسجل كتكلفة استبدال | TWAA_ABSORBS_DIFF
ask  | X | إشعار العميل: "المنتج X مش متوفر، تحب نبدله بـ Y بسعر Z؟" + مؤقت رد | AWAITING_CUSTOMER_DECISION
wait | W | انتظار رد العميل خلال SLA الاستبدال (والتجهيز مستمر لباقي البنود)
resp | D | العميل ردّ خلال المهلة؟
choice| D | اختيار العميل؟
apply| X | تطبيق اختيار العميل وتحديث الإجمالي | SUBSTITUTION_APPLIED
fbk  | D | يوجد تفضيل احتياطي محدد مسبقاً؟
fbapply| P | تطبيق التفضيل الاحتياطي (بديل تلقائي أو حذف)
min  | D | باقي السلة يحقق الحد الأدنى للطلب؟
minopt| D | التعامل مع الحد الأدنى؟ (سياسة)
waive| X | توّا تتنازل عن الحد الأدنى لهذا الطلب (سبب: نفاد من جهتنا) | MINIMUM_WAIVED
addi | W | العميل يضيف منتجاً ليستوفي الحد (إشعار + مهلة)
addr | D | العميل أضاف؟
ccl  | P | إلغاء أمر التنفيذ / الطلب لعدم التوافر
paid | D | الطلب مدفوع مسبقاً؟
refund| X | بدء الإرجاع الكامل أو الجزئي (P23) | REFUND_INITIATED
fin  | X | تسجيل فرق السعر/الحذف في التسوية المالية للطلب (P24) | SUBSTITUTION_RECONCILED
cont | E | الأمر جاهز للتجهيز بالبنود المحدثة | READY_TO_PREPARE | ok
canc | E | إلغاء لعدم التوافر | OUT_OF_STOCK_CANCELLED | fail

s -> lvl
lvl -> full : متاح
lvl -> pref : جزئي : wait
lvl -> none : غير متاح : fail
none -> ccl
pref -> auto : بديل تلقائي
pref -> exists : اسألني الأول
pref -> rem : احذف البند
auto -> exists
exists -> price : نعم
exists -> rem : لا : fail
price -> same : نفس السعر
price -> lower : أقل
price -> abs : أعلى
abs -> absorb : نعم
abs -> ask : لا : wait
same -> apply
lower -> apply
absorb -> apply
ask -> wait
wait -> resp
resp -> choice : نعم
resp -> fbk : لا (انتهت المهلة) : fail
choice -> apply : يوافق على البديل
choice -> rem : يرفض البديل
fbk -> fbapply : نعم
fbk -> rem : لا
fbapply -> apply
apply -> fin : sys
rem -> min
fin -> min
min -> cont : نعم : ok
min -> minopt : لا : wait
minopt -> waive : توّا تتنازل
minopt -> addi : العميل يضيف
minopt -> ccl : إلغاء
waive -> cont : ok
addi -> addr
addr -> cont : نعم : ok
addr -> ccl : لا : fail
ccl -> paid
paid -> refund : نعم
paid -> canc : لا
refund -> canc
`);

/* ---------- P11 التجميع في هب توّا ---------- */
G.p11 = parse("p11", `
s    | S | مهمة تجميع جديدة
gen  | X | توليد قائمة التجميع: الطلب، الموقع/الرف، SKU، الكمية، مرتبة حسب مسار الرفوف | PICK_LIST
asg  | D | يوجد مجمّع متاح؟
q    | W | الانتظار في طابور التجميع (مؤقت SLA) → تنبيه Control Tower عند الاقتراب من الحد
take | P | المجمّع يستلم المهمة على الجهاز | PICKING
scan | P | مسح باركود الصنف في الموقع
sku  | D | الباركود صحيح؟
warn | P | تحذير: "صنف غلط" + منع المتابعة حتى المسح الصحيح
qty  | D | الكمية المطلوبة متوفرة على الرف؟
exc  | X | استثناء مخزون → P09 (إعادة عد/موقع بديل/عدم تطابق) | STOCK_EXCEPTION
qc   | D | فحص الجودة: الصلاحية، التلف، سلامة العبوة، درجة الحرارة إن لزم
bad  | P | استبعاد الوحدة ووسمها (تالف/منتهي) وتسجيلها في سجل الهالك | UNIT_REJECTED
rep  | D | توجد وحدة بديلة سليمة؟
sub  | P | إلى عملية الاستبدال P10
pick | P | وضع الصنف في حاوية الطلب (مع فصل البارد/الهش) وتأكيد الكمية
more | D | بنود متبقية؟
done | X | اكتمال التجميع + وقت التجميع + نسبة الدقة للمجمّع | PICKED
go   | E | إلى التغليف P12 | PICKED | ok

s -> gen : sys
gen -> asg
asg -> take : نعم
asg -> q : لا : wait
q -> take
take -> scan
scan -> sku
sku -> qty : نعم
sku -> warn : لا : fail
warn -> scan
qty -> qc : نعم
qty -> exc : لا : fail
exc -> more
qc -> pick : ناجح : ok
qc -> bad : فشل : fail
bad -> rep
rep -> scan : نعم
rep -> sub : لا : fail
sub -> more
pick -> more
more -> scan : نعم
more -> done : لا : sys
done -> go : ok
`);

/* ---------- P12 التغليف ---------- */
G.p12 = parse("p12", `
s    | S | حاوية الطلب وصلت محطة التغليف
scan | P | مسح الطلب على المحطة | PACKING
val  | X | التحقق: الأصناف والكميات مطابقة لأمر التنفيذ بعد الاستبدال، لا تالف، لا منتهي، شروط المناولة الخاصة | PACK_VALIDATION
ok   | D | التحقق ناجح؟
diff | D | نوع الفرق؟
miss | P | صنف ناقص → رجوع للتجميع لإكماله
extra| P | صنف زائد/غلط → إزالته وإعادته للرف
dmg  | P | تالف/منتهي → استبداله (P11) أو استبعاده (P10)
sep  | D | يحتاج فصل حسب الفئة؟ (بارد / ساخن / منظفات مع طعام)
bags | P | تغليف في عبوات منفصلة موسومة (بارد/جاف/هش)
one  | P | تغليف في عبوة واحدة
id   | X | توليد رقم/باركود للطرد لكل عبوة | PACKAGE_ID
seal | P | ختم العبوة ولصق الملصق: رقم الطلب، العميل، عدد الطرود، المبلغ كاش إن وجد
rec  | X | تسجيل: عدد الطرود، الوزن إن لزم، مبلغ الكاش، رقم العميل، رقم الطلب | PACKAGE_MANIFEST
stage| P | وضع الطرود في منطقة التسليم للرايدر (رف حسب المنطقة)
go   | E | جاهز للتسليم → محرك التوصيل P14 | READY_FOR_DISPATCH | ok

s -> scan
scan -> val : sys
val -> ok
ok -> sep : نعم
ok -> diff : لا : fail
diff -> miss : ناقص
diff -> extra : زائد/غلط
diff -> dmg : تالف
miss -> val
extra -> val
dmg -> val
sep -> bags : نعم
sep -> one : لا
bags -> id
one -> id
id -> seal : sys
seal -> rec : sys
rec -> stage
stage -> go : ok
`);

/* ---------- P13 تجهيز التاجر ---------- */
G.p13 = parse("p13", `
s    | S | التاجر قبل أمر التنفيذ (من P09)
sla  | X | بدء مؤقت SLA التجهيز حسب نوع التاجر (مطعم/بقالة) ووقت التجهيز المعلن | PREP_SLA_STARTED
prep | M | التاجر يجهّز الطلب (تطبيق التاجر يعرض البنود والملاحظات) | PREPARING
chk  | D | التجهيز جاهز خلال SLA؟
ready| M | التاجر يضغط "جاهز" + يطبع/يكتب رقم الطلب على الكيس | READY_FOR_PICKUP
warn | X | اقتراب من حد SLA: تنبيه التاجر تلقائياً + إظهار في Control Tower | PREP_WARNING
delay| X | تجاوز SLA: تسجيل تأخير التاجر | PREPARATION_DELAYED
eta  | X | إعادة حساب ETA للعميل وإبلاغه: "طلبك اتأخر شوية، الوقت الجديد X" | ETA_UPDATED
accpt| D | التأخير ضمن الحد المقبول؟ (⚠ قرار مطلوب D-13)
call | W | خدمة العملاء تتصل بالتاجر لمعرفة الوقت الفعلي
know | D | التاجر أعطى وقتاً جديداً مقبولاً؟
rr   | D | يمكن إعادة التوجيه لتاجر بديل بنفس البنود؟
rer  | P | إعادة توجيه أمر التنفيذ (P08) وإلغاؤه عند التاجر الأول بدون تعويض له | FO_REROUTED
ccl  | P | إلغاء هذا المكوّن فقط + إبلاغ العميل + إرجاع قيمته إن مدفوع (P23) | COMPONENT_CANCELLED
custc| D | العميل يقبل الانتظار؟ (إشعار مع خيار "استمر" أو "ألغِ المكوّن")
rid  | N | الرايدر لا يُرسل للتاجر إلا عند "جاهز" أو قبلها بوقت التنقل فقط (BR-DSP-004)
go   | E | جاهز للاستلام → محرك التوصيل P14 | READY_FOR_PICKUP | ok
cancE| E | مكوّن ملغى من التاجر | MERCHANT_CANCELLED | fail

s -> sla : sys
sla -> prep
prep -> chk
chk -> ready : نعم : ok
chk -> warn : اقترب الحد : wait
warn -> chk
chk -> delay : تجاوز : fail
delay -> eta : sys
eta -> accpt
accpt -> custc : نعم
accpt -> call : لا : wait
call -> know
know -> custc : نعم
know -> rr : لا : fail
custc -> prep : نعم (استمر)
custc -> ccl : لا (ألغِ) : fail
rr -> rer : نعم
rer -> go
rr -> ccl : لا : fail
ccl -> cancE
ready -> rid
rid -> go : ok
`);

module.exports = G;
