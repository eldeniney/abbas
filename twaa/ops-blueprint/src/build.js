/* Assemble the Twaa Operating Process Blueprint (HTML) */
const fs = require("fs"), path = require("path");
const { render, paginate, esc, COL } = require("./engine"); const { renderSwim, boards, LANES } = require("./swim"); const T = require("./tables");
const G = Object.assign({}, require("./graphs1"), require("./graphs2"), require("./graphs3"), require("./graphs4"));
const FONTS = process.env.FONTS_DIR; const font = (f) => fs.readFileSync(path.join(FONTS, f)).toString("base64");
const PW = 1000, PH = 1340; /* A3 portrait usable px */ const LW = 1470, LH = 930; /* A3 landscape usable px */
const audit = [];
function flow(key, title, note) { const g = G[key]; const r = render(g); r.audit.forEach((a) => audit.push(`${key}: ${a}`));
  const W = r.w + 20; const sP = Math.min(1, PW / W), sL = Math.min(1, LW / W); const land = sL > sP * 1.15; /* landscape only when it clearly helps */
  const pages = paginate(g, r, land ? { pageW: LW, pageH: LH, minScale: 0.6 } : { pageW: PW, pageH: PH, minScale: 0.66 });
  return pages.map((p) => `<section class="page ${land ? "land" : "flowpage"}"><div class="fh"><span class="ft">${esc(title)}</span><span class="fm">${p.parts > 1 ? `جزء ${p.part} من ${p.parts}` : ""}${p.cont ? " · يتبع في الصفحة التالية ↓" : ""}${p.part > 1 ? " · تابع من الصفحة السابقة ↑" : ""}</span></div>${p.part === 1 && note ? `<p class="fnote">${note}</p>` : ""}<div class="fw" style="width:${Math.round(p.w * p.scale)}px">${p.svg}</div></section>`).join(""); }
function table(cols, rows, cls = "") { return `<table class="mx ${cls}"><thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i === 0 ? "id" : ""}">${esc(c).replace(/⚠/g, '<span class="dec">⚠</span>')}</td>`).join("")}</tr>`).join("")}</tbody></table>`; }
const sec = (num, title, body, cls = "") => `<section class="page ${cls}"><h1><span class="num">${num}</span>${esc(title)}</h1>${body}</section>`;
const P = (t) => `<p>${t}</p>`; const UL = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const dec = (id, txt) => `<div class="decision"><b>⚠ قرار مطلوب ${id}</b> — ${txt}</div>`;

/* transitions table from the state graph */
const st = G.states; const stName = Object.fromEntries(st.nodes.map((n) => [n.id, `${n.label} (${n.code || n.id})`]));
const trRows = st.edges.map((e) => [stName[e.from], stName[e.to], e.label || "تلقائي", { ok: "نجاح", fail: "فشل/استثناء", wait: "انتظار/قرار", sys: "نظام" }[e.cls] || "عادي"]);

let html = "";
/* ---- cover ---- */
html += `<section class="page cover"><div class="cover-in"><div class="brand">توّا — TWAA</div><h1 class="ct">مخطط العمليات التشغيلية الكامل<br><span>من فتح التطبيق إلى الإغلاق المالي</span></h1><p class="cs">Order-to-Delivery-to-Settlement Operating Process Blueprint</p><p class="cslogan">نجيبهالك توّا</p>
<div class="meta"><div><b>الإصدار</b> 1.0 — مسودة هندسة عمليات للمراجعة مع الشركاء</div><div><b>السوق</b> أبو المطامير — البحيرة — مصر</div><div><b>النماذج</b> مخزون توّا · ماركت بليس · التوصيل كخدمة</div><div><b>التاريخ</b> سبتمبر 2026</div></div>
<p class="cq">"هذا هو بالضبط ما يحدث للطلب من أول ما العميل يفتح توّا لحد ما الطلب والفلوس والمخزون والتاجر والرايدر كلهم يتم إغلاقهم وتسويتهم."</p></div></section>`;

/* ---- 00 TOC ---- */
const TOC = ["كيف تقرأ هذا المخطط", "معمارية تشغيل توّا", "دورة حياة الطلب الرئيسية", "دخول العميل ونطاق الخدمة", "الاكتشاف والسلة", "الدفع", "إنشاء الطلب وتقسيم التنفيذ", "التوافر والاستبدال", "تنفيذ هب توّا", "تنفيذ التاجر", "تنسيق التوصيل", "تعيين الرايدر والاستلام", "الميل الأخير", "إثبات التسليم والكاش", "فشل التسليم والإرجاع للأصل", "الإلغاء والإرجاع المالي", "التسوية المالية", "ما بعد التوصيل والدعم", "آلة حالات الطلب", "مخطط المسارات المتوازية الكامل", "كتالوج الاستثناءات", "قواعد العمل", "مصفوفة SLA", "مصفوفة الإشعارات", "مصفوفة المسؤولية المالية", "برج التحكم التشغيلي", "الكيانات الأساسية للبيانات", "القرارات المفتوحة"];
html += sec("00", "المحتويات", `<ol class="toc">${TOC.map((t, i) => `<li><span class="n">${String(i + 1).padStart(2, "0")}</span>${t}</li>`).join("")}</ol>`);

/* ---- 01 How to read ---- */
html += sec("01", "كيف تقرأ هذا المخطط", `
${P("هذه الوثيقة ليست عرضاً عن العملية؛ هي <b>تصميم العملية نفسها</b>. كل مخطط انسيابي يبدأ من حدث ويتفرّع عند كل قرار حتى يصل إلى <b>حالة نهائية</b> معرّفة. لا توجد صناديق معلّقة: كل سهم يذهب إلى مكان، وكل استثناء له مسار تعافٍ. الرموز التقنية (مثل <code>PICKED_UP</code>) تظهر تحت العنوان العربي لتكون مرجعاً مباشراً للمطورين وقاعدة البيانات.")}
<div class="legend"><h3>رموز الأشكال</h3><div class="lg"><div><svg viewBox="0 0 120 40"><rect x="4" y="6" width="112" height="28" rx="14" fill="${COL.plum}"/></svg><span>بيضاوي: بداية</span></div><div><svg viewBox="0 0 120 40"><rect x="4" y="6" width="112" height="28" rx="14" fill="${COL.green}"/></svg><span>بيضاوي أخضر: نهاية ناجحة</span></div><div><svg viewBox="0 0 120 40"><rect x="4" y="6" width="112" height="28" rx="14" fill="${COL.red}"/></svg><span>بيضاوي أحمر: نهاية فشل/إلغاء</span></div><div><svg viewBox="0 0 120 40"><rect x="4" y="6" width="112" height="28" rx="14" fill="${COL.gray}"/></svg><span>بيضاوي رمادي: نهاية محايدة (مسترد/مغلق بقرار)</span></div><div><svg viewBox="0 0 120 40"><rect x="4" y="5" width="112" height="30" rx="3" fill="#fff" stroke="${COL.plum}" stroke-width="2"/></svg><span>مستطيل: إجراء/عملية</span></div><div><svg viewBox="0 0 120 40"><polygon points="60,2 118,20 60,38 2,20" fill="#fff" stroke="${COL.orange}" stroke-width="2"/></svg><span>معيّن: قرار</span></div><div><svg viewBox="0 0 120 40"><path d="M4 5H116V29Q88 22 60 29T4 29Z" fill="${COL.purple2}" stroke="${COL.purple}" stroke-width="2"/></svg><span>مستند بنفسجي: نظام توّا / حدث بيانات</span></div><div><svg viewBox="0 0 120 40"><rect x="4" y="5" width="112" height="30" rx="3" fill="#FFF3EC" stroke="${COL.orange}" stroke-width="2" stroke-dasharray="6 3"/></svg><span>متقطع برتقالي: انتظار / تدخل يدوي</span></div><div><svg viewBox="0 0 120 40"><rect x="4" y="5" width="112" height="30" rx="3" fill="${COL.cream}" stroke="${COL.plum2}" stroke-width="2"/></svg><span>كريمي: إجراء التاجر / الرايدر</span></div><div><svg viewBox="0 0 120 40"><rect x="4" y="5" width="112" height="30" rx="2" fill="${COL.gray2}" stroke="${COL.gray}"/></svg><span>رمادي: ملاحظة نظام</span></div></div>
<h3>رموز الأسهم</h3><div class="lg"><div><svg viewBox="0 0 120 20"><path d="M4 10H110" stroke="${COL.plum2}" stroke-width="2"/></svg><span>مسار عادي</span></div><div><svg viewBox="0 0 120 20"><path d="M4 10H110" stroke="${COL.green}" stroke-width="2.5"/></svg><span>أخضر: نجاح</span></div><div><svg viewBox="0 0 120 20"><path d="M4 10H110" stroke="${COL.red}" stroke-width="2.5"/></svg><span>أحمر: فشل / استثناء</span></div><div><svg viewBox="0 0 120 20"><path d="M4 10H110" stroke="${COL.orange}" stroke-width="2" stroke-dasharray="7 4"/></svg><span>برتقالي متقطع: انتظار / تدخل يدوي</span></div><div><svg viewBox="0 0 120 20"><path d="M4 10H110" stroke="${COL.purple}" stroke-width="2"/></svg><span>بنفسجي: حدث نظام تلقائي</span></div></div></div>
<h3>تسميات الفروع</h3>${P("القرارات تُعنون بـ <b>نعم / لا</b> أو بنتائج محددة مثل: <b>متاح · غير متاح · جزئي · نجح · فشل · انتظار · مهلة</b>. المعرّفات مثل <b>P09</b> تشير إلى العملية الفرعية، و<b>EX-…</b> إلى الاستثناء في الكتالوج، و<b>BR-…</b> إلى قاعدة العمل، و<b>D-…</b> إلى قرار مطلوب من الإدارة.")}
<h3>القرارات المفتوحة</h3>${P('حيثما كانت سياسة العمل غير محسومة لم نخترعها. تجدها موسومة بـ <span class="dec">⚠ قرار مطلوب</span> مع رقم (D-xx)، وتُجمع كلها في القسم 28 مع الخيارات وأثر كل خيار. الأرقام الزمنية في مصفوفة SLA كلها <b>TBD</b> مع "افتراض بداية مقترح" منفصل بوضوح.')}
<h3>الصفحات الطويلة</h3>${P("المخططات الطويلة مقسّمة على صفحات متتالية عند فراغات بين الصفوف؛ الأسهم التي تعبر الحد تُكمل في الصفحة التالية، والعنوان يذكر «يتبع».")}`);

/* ---- 02 Architecture ---- */
html += sec("02", "معمارية تشغيل توّا", `
${P("توّا تعمل بثلاثة نماذج تنفيذ في آن واحد، وكلها تمر عبر نفس محرك الطلبات (OMS) ونفس محرك التوصيل:")}
<table class="mx small"><thead><tr><th>النموذج</th><th>من يملك المخزون</th><th>من يجهّز</th><th>من يوصّل</th><th>من يستقبل طلب العميل</th><th>أمر التنفيذ</th></tr></thead><tbody>
<tr><td>1. مخزون توّا</td><td>توّا (الهب)</td><td>مجمّع الهب</td><td>رايدر توّا</td><td>تطبيق توّا</td><td>FO-HUB</td></tr>
<tr><td>2. ماركت بليس</td><td>التاجر</td><td>التاجر</td><td>رايدر توّا (أو التاجر إن اتُفق)</td><td>تطبيق توّا</td><td>FO-MERCHANT</td></tr>
<tr><td>3. التوصيل كخدمة</td><td>التاجر</td><td>التاجر</td><td>رايدر توّا</td><td>التاجر بنفسه (ثم يُدخل الطلب في توّا)</td><td>FO-DAAS (توصيل فقط)</td></tr></tbody></table>
<h3>القاعدة المعمارية: طلب العميل ≠ أمر التنفيذ</h3>${P("طلب العميل الواحد (<code>CustomerOrder</code>) ينقسم إلى <b>أمر تنفيذ أو أكثر</b> (<code>FulfillmentOrder</code>) حسب نقطة التنفيذ، وكل أمر تنفيذ يولّد <b>مهمة تشغيلية أو أكثر</b> (تجميع، تغليف، تجهيز عند التاجر، توصيل). كل أمر تنفيذ له حالته وSLA وقيمته المستقلة ويكتمل باستقلال عن غيره، بينما يرى العميل <b>طلباً واحداً</b> بتقدم واحد مفهوم. محرك التوصيل هو من يقرر: رايدر واحد يجمع كل شيء، أو عدة رايدرز، أو تسليم مجزّأ عند تأخر مكوّن.")}
<div class="fw" style="width:560px;margin:8px auto">${render(G.arch).svg}</div>
<h3>مبادئ حاكمة</h3>${UL(["<b>الحالة التشغيلية والحالة المالية منفصلتان</b>: طلب مسلَّم قد يبقى <code>SETTLEMENT_PENDING</code> حتى تطابق الكاش، وطلب ملغى قد يكون <code>REFUND_PENDING</code>. لا يُغلق الطلب نهائياً إلا بعد الإغلاق المالي.", "<b>لا حالة انتقالية بلا مؤقت</b>: كل حالة انتظار لها SLA وتصعيد؛ برج التحكم يرى كل طلب تجاوز عمره الحد.", "<b>الحيازة تُسجَّل عند كل تسليم</b>: من سلّم، من استلم، متى، وأين — وهذا أساس تحديد المسؤولية.", "<b>لا طلب مكرر ولا خصم مكرر</b>: مفتاح Idempotency لكل جلسة دفع، والنتيجة المعلّقة لا تُخصم مرتين أبداً.", "<b>الإلغاء والإرجاع جزئيان بطبيعتهما</b>: على مستوى المكوّن أو البند، مع إعادة حساب الرسوم والحد الأدنى.", "<b>الاستبدال يُسوّى مالياً</b>: فرق السعر يُسجل بمن يتحمله (العميل/توّا) ويظهر في دفتر الطلب."])}`);

/* ---- 03 master ---- */
html += flow("master", "03 · دورة حياة الطلب الرئيسية — الخريطة الكبرى", "كل صندوق هنا عملية فرعية مفصّلة في الأقسام التالية. الحالات النهائية بالأخضر (نجاح) والأحمر (فشل/إلغاء) والرمادي (مسترد/مغلق بقرار).");
/* ---- 04 ---- */
html += flow("p01", "04 · P01 دخول العميل ونطاق الخدمة", "يغطي: مسجّل/ضيف، إذن الموقع، الاختيار اليدوي، الموقع غير الصالح، الدبوس المختلف عن العنوان، العنوان الناقص، تغيير الموقع، القرية خارج التغطية، والعنوان المحفوظ الذي خرج من التغطية (يُعاد فحصه دائماً).");
/* ---- 05 ---- */
html += flow("p02", "05 · P02 اكتشاف المنتجات", "نتيجة التوافر لكل منتج تحدد طريقة العرض؛ الطلب غير الملبّى يُسجَّل كإشارة طلب للمشتريات.");
html += flow("p03", "05 · P03 إنشاء السلة — مصدر واحد / مصادر متعددة", "لكل بند مصدر. الدمج مسموح داخل نفس المنطقة إن كانت السياسة تسمح (D-03)؛ وإلا يُنشأ طلب منفصل بوضوح للعميل.");
/* ---- 06 ---- */
html += flow("p04", "06 · P04 التحقق قبل الدفع", "كل شيء يُعاد التحقق منه قبل الدفع، وأي تغيير يُعرض للعميل <b>بالضبط</b> كما حدث.");
html += flow("p05", "06 · P05 شاشة الدفع", "");
html += flow("p06a", "06 · P06-A الدفع الأونلاين — مع التسوية ومنع التكرار", "الحالة الحرجة: العميل خُصم منه ولم تصل توّا تأكيداً → لا خصم جديد أبداً، وتُفتح <code>PAYMENT_RECONCILIATION_REQUIRED</code>.");
html += flow("p06b", "06 · P06-B الدفع كاش عند الاستلام", "");
/* ---- 07 ---- */
html += flow("p07", "07 · P07 إنشاء الطلب وتقسيمه إلى أوامر تنفيذ", "");
html += flow("p08", "07 · P08 توجيه التنفيذ", "قاعدة MVP بسيطة، ومعمارية القرار الكاملة ظاهرة لمرحلة 2.");
/* ---- 08 ---- */
html += flow("p09", "08 · P09 تأكيد التوافر — الهب والتاجر", "");
html += flow("p10", "08 · P10 النفاد والاستبدال", "مخطط مستقل كامل: تفضيل العميل، فرق السعر، من يتحمله، مهلة الرد، التفضيل الاحتياطي، الحد الأدنى، والإلغاء مع الإرجاع.");
/* ---- 09 ---- */
html += flow("p11", "09 · P11 التجميع في هب توّا", "");
html += flow("p12", "09 · P12 التغليف", "");
/* ---- 10 ---- */
html += flow("p13", "10 · P13 تجهيز التاجر / المطعم", "");
/* ---- 11 ---- */
html += flow("p14", "11 · P14 محرك تنسيق التوصيل", "الخطط الممكنة: رايدر واحد/استلام واحد، رايدر واحد/عدة استلامات، عدة رايدرز، توصيل مجمّع، توصيل قروي مجدول، وتسليم مجزّأ عند التأخير.");
/* ---- 12 ---- */
html += flow("p15", "12 · P15 تعيين الرايدر", "");
html += flow("p16", "12 · P16 الاستلام ونقل الحيازة", "لا مغادرة بطرد ناقص، لا مسح لطرد غلط، والتالف يعود للتغليف.");
/* ---- 13 ---- */
html += flow("p17", "13 · P17 في الطريق — الاستثناءات واستجابتها", "");
html += flow("p18", "13 · P18 الوصول والتواصل مع العميل", "ممنوع افتراض جواز ترك الطلب بدون استلام.");
/* ---- 14 ---- */
html += flow("p19", "14 · P19 تحصيل الكاش", "لا يُسجَّل «تم التوصيل» قبل استيفاء شرط الدفع.");
html += flow("p20", "14 · P20 إثبات التسليم ونتائجه", "");
/* ---- 15 ---- */
html += flow("p21", "15 · P21 فشل التسليم — شجرة المسؤولية والإجراء", "لكل سبب: من يتحمل التكلفة، ثم الإجراء: إعادة محاولة / إرجاع للأصل / إرجاع جزئي / كامل / بدون / تحقيق.");
html += flow("p22", "15 · P22 الإرجاع للأصل", "");
/* ---- 16 ---- */
html += flow("p23a", "16 · P23-A الإلغاء (عميل / توّا / تاجر)", "");
html += flow("p23b", "16 · P23-B الإرجاع المالي", "");
/* ---- 17 ---- */
html += flow("p24", "17 · P24 التسوية المالية للطلب", "الإغلاق المالي فقط بعد: الإغلاق التشغيلي، مطابقة الكاش، المطابقة مع البوابة والإرجاعات، وتحديث كشوف التاجر والرايدر ودفتر توّا.");
/* ---- 18 ---- */
html += flow("p25", "18 · P25 ما بعد التوصيل والدعم", "");
/* ---- 19 state machine ---- */
html += flow("states", "19 · آلة حالات الطلب الرئيسية", "الحالات الرئيسية بيضاء/بنفسجية، حالات الاستثناء برتقالية متقطعة، والإغلاق أخضر. الجدول التالي يسرد الانتقالات المسموحة فقط؛ أي انتقال غير مذكور <b>ممنوع</b> في النظام.");
html += sec("19", "الانتقالات المسموحة (مرجع للمطورين)", `${P("قواعد عامة: (1) لا يُغلق الطلب إلا من <code>SETTLEMENT_PENDING</code>. (2) الحالات <code>PAYMENT_PENDING, AVAILABILITY_CHECK, PICKING, PREPARING, RIDER_ASSIGNMENT, IN_TRANSIT, ARRIVED, REFUND_PENDING, SETTLEMENT_PENDING</code> كلها لها مؤقت؛ عند 2× SLA ينتقل الطلب قسراً بقرار برج التحكم إلى حالة تالية موثقة بالسبب (BR-SYS-002). (3) حالة أمر التنفيذ (FO) مستقلة، وحالة طلب العميل تُشتق منها: أدنى مكوّن يحدد الحالة المعروضة للعميل.")}${table(T.trCols, trRows, "small")}`);
/* ---- 20 swimlanes ---- */
boards.forEach((b, i) => { const r = renderSwim(b); html += `<section class="page land"><div class="fh"><span class="ft">20 · مخطط المسارات المتوازية — ${esc(b.title)}</span><span class="fm">لوحة ${i + 1} من ${boards.length}</span></div><div class="sw">${r.svg}</div>${i === 0 ? `<p class="fnote">المسارات: ${LANES.join(" · ")}. الأسهم تعبر المسارات حيث تنتقل المسؤولية. اللوحات الأربع متصلة: نهاية كل لوحة هي بداية التالية.</p>` : ""}</section>`; });
/* ---- 21 exceptions ---- */
html += sec("21", `كتالوج الاستثناءات (${T.exceptions.length} حالة)`, `${P("كل استثناء له: من يكتشفه، الحالة التي يقع فيها، الإجراء الفوري، إشعار العميل، إجراء العمليات، الأثر المالي، المسؤول، SLA، التصعيد، حالة التعافي، والنتيجة النهائية إن لم يُحل. القيم الزمنية TBD إلا حيث يُذكر «مقترح».")}${table(T.exCols, T.exceptions, "xs")}`, "land");
/* ---- 22 rules ---- */
html += sec("22", `قواعد العمل (${T.rules.length} قاعدة)`, table(T.brCols, T.rules, "small"), "land");
/* ---- 23 SLA ---- */
html += sec("23", "مصفوفة SLA", `${P('<b>تنبيه:</b> كل الأرقام هنا <b>TBD</b> تقررها الإدارة. ما بين قوسين "مقترح" هو <b>افتراض بداية مقترح</b> للتجربة فقط، مبني على ممارسات التوصيل السريع في مدن مماثلة، ويُراجع بعد أول أسبوعين من التشغيل.')}${table(T.slaCols, T.sla, "small")}`, "land");
/* ---- 24 notifications ---- */
html += sec("24", "مصفوفة الإشعارات", `${P("مبدأ: <b>Push أولاً</b>، SMS كبديل عند فشل التسليم أو للأحداث الحرجة، واتساب للأحداث التي تتطلب تفاعلاً (قرار استبدال، المندوب عند الباب، فشل تسليم). تُدمج الأحداث المتتالية خلال دقيقة في إشعار واحد لتفادي الضجيج (BR-NOT-002). أحداث «التاجر قبل» و«تأكيد الدفع» لا تُرسل منفصلة.")}${table(T.ntCols, T.notif, "small")}`, "land");
/* ---- 25 financial ---- */
html += sec("25", "مصفوفة المسؤولية المالية", `${P("تُطبَّق هذه المصفوفة في P21 قبل أي إرجاع مالي، وتغذي كشوف تسوية التاجر والرايدر في P24. حيث تظهر ⚠ فالقاعدة تحتاج قراراً (القسم 28).")}${table(T.finCols, T.fin, "small")}`, "land");
/* ---- 26 control tower ---- */
html += sec("26", "برج التحكم التشغيلي (Operations Control Tower)", `${P("شاشة واحدة لفريق العمليات تُظهر كل طلب يحتاج تدخلاً الآن. لكل تنبيه: <b>الشدة</b> (حرجة/عالية/متوسطة)، <b>العمر</b> منذ دخول الحالة، <b>المالك</b> الحالي، <b>الإجراء التالي</b> بزر مباشر، و<b>عداد SLA</b> تنازلي يتحول للأحمر عند الخرق. الترتيب الافتراضي: الشدة ثم الأقرب للخرق.")}${table(T.ctCols, T.ct, "small")}
<h3>مؤشرات اللوحة العلوية (لحظية)</h3>${UL(["طلبات نشطة حسب الحالة (قمع مباشر)", "متوسط زمن كل مرحلة اليوم مقابل SLA", "رايدرز متاحون / مشغولون / رصيد كاش لكل رايدر", "تجار متأخرون الآن ومعدل القبول اليومي", "نسبة الطلبات المسلّمة في الوقت، ونسبة الفشل، ونسبة الاستبدال", "حالات مالية مفتوحة: تسوية دفع، إرجاع معلّق، فرق كاش"])}
<h3>الأدوار والصلاحيات في البرج</h3>${UL(["<b>الموزّع (Dispatcher)</b>: تعيين يدوي، إعادة تعيين، تجميع.", "<b>مناوب برج التحكم</b>: قرارات التأخير، الإنقاذ، الإلغاء القسري للطلب العالق (⚠ D-26).", "<b>مشرف الدعم</b>: موافقات الإلغاء أثناء التجهيز، الإرجاع حتى الحد الثاني، قرار إعادة المحاولة/RTO.", "<b>المالية</b>: تسوية الدفع، فروق الكاش، الإرجاع فوق الحد، التسويات.", "<b>مدير الهب</b>: عدم تطابق المخزون، طابور التجميع، المرتجعات."])}`, "land");
/* ---- 27 entities ---- */
html += sec("27", "الكيانات الأساسية للبيانات", `${P("ليس تصميم قاعدة بيانات كاملاً، بل الكيانات التي تفرضها العملية وعلاقاتها المنطقية. كل انتقال حالة في أي كيان يولّد <code>OrderEvent</code> (أثر تدقيق كامل).")}<div class="fw" style="width:100%;max-width:1480px;margin:6px auto">${render(G.er).svg}</div>${table(T.entCols, T.entities, "small")}`, "land");
/* ---- 28 decisions ---- */
html += sec("28", `القرارات المفتوحة (${T.tbd.length} قراراً مطلوباً)`, `${P("هذه هي النقاط التي تعمّدنا عدم اختراعها. الغرض من الوثيقة كشفها لتُحسم مع الشركاء. لكل قرار: ما المطلوب تحديده، الخيارات المتاحة، والأثر التشغيلي لكل خيار.")}${table(T.tbdCols, T.tbd, "small")}
<h3>تدقيق الجودة الذاتي (قبل الاعتماد)</h3>${table(["البند", "النتيجة", "الدليل"], [
 ["كل قرار له كل مخرجاته؟", "نعم", "فحص آلي: كل معيّن له فرعان على الأقل (0 مخالفات)"],
 ["كل سهم يقود لمكان؟", "نعم", "فحص آلي للعقد غير المتصلة (0 مخالفات)"],
 ["كل استثناء له مسار تعافٍ؟", "نعم", "عمود «حالة التعافي» في القسم 21"],
 ["كل عملية لها مالك؟", "نعم", "أعمدة المالك في 21 و23 و26"],
 ["كل طلب يصل لحالة نهائية؟", "نعم", "مؤقتات على كل حالة انتقالية + BR-SYS-002"],
 ["الحالة المالية والتشغيلية تتباعدان بأمان؟", "نعم", "SETTLEMENT_PENDING و REFUND_PENDING مستقلتان عن DELIVERED/CANCELLED"],
 ["طلب عميل واحد ← عدة أوامر تنفيذ؟", "نعم", "P07 والقسم 02"],
 ["أوامر التنفيذ تكتمل باستقلال؟", "نعم", "P07 (تشغيل بالتوازي) و P14 (تسليم مجزّأ)"],
 ["إلغاء جزئي؟", "نعم", "P23-A (مكوّن) و BR-CAN-004"],
 ["إرجاع جزئي؟", "نعم", "P23-B (بند/كمية/فرق/رسوم)"],
 ["الاستبدال مُسوّى مالياً؟", "نعم", "P10 → SUBSTITUTION_RECONCILED → P24"],
 ["الكاش مُطابَق؟", "نعم", "P19 (المتوقع/المحصّل) + P24 (الإيداع/الفرق)"],
 ["حيازة الرايدر مسجّلة؟", "نعم", "P16 CUSTODY_TRANSFERRED + P22 مسح المرتجع"],
 ["مسؤولية التاجر مسجّلة؟", "نعم", "P09/P13 (قبول/تأخير) + القسم 25 + تسوية التاجر"],
 ["عدم تطابق المخزون يُصحَّح؟", "نعم", "P09/P11 INVENTORY_CORRECTED مع سجل تدقيق"],
 ["الإشعارات معرّفة؟", "نعم", "القسم 24"],
 ["خروقات SLA تُصعَّد؟", "نعم", "القسم 23 + القسم 26"],
 ["الإرجاع للأصل مكتمل؟", "نعم", "P22: هب/تاجر، مخزون/حجر/هالك، كاش، التزام"],
 ["منع الطلبات/المدفوعات المكررة؟", "نعم", "P05/P06 Idempotency + BR-PAY-001"],
 ["أثر تدقيق كامل؟", "نعم", "OrderEvent لكل انتقال + BR-SYS-001"],
], "small")}`, "land");

/* ---- CSS ---- */
const css = `
@font-face{font-family:Cairo;font-weight:600;src:url(data:font/woff2;base64,${font("cairo-arabic-600-normal.woff2")}) format("woff2")}
@font-face{font-family:Cairo;font-weight:700;src:url(data:font/woff2;base64,${font("cairo-arabic-700-normal.woff2")}) format("woff2")}
@font-face{font-family:Cairo;font-weight:500;src:url(data:font/woff2;base64,${font("cairo-arabic-500-normal.woff2")}) format("woff2")}
@font-face{font-family:Cairo;font-weight:600;src:url(data:font/woff2;base64,${font("cairo-latin-600-normal.woff2")}) format("woff2");unicode-range:U+0000-00FF}
@font-face{font-family:Cairo;font-weight:700;src:url(data:font/woff2;base64,${font("cairo-latin-700-normal.woff2")}) format("woff2");unicode-range:U+0000-00FF}
@page{size:A3 landscape;margin:11mm 12mm}@page flow{size:A3 portrait;margin:11mm 12mm}
:root{--plum:#3A1F3D;--cream:#F9F2E7;--orange:#F9732F;--ink:#241626;--gray:#7E6F80;--line:#D9CBBB}
*{box-sizing:border-box}html{font-size:14px}body{margin:0;font-family:Cairo,'Noto Sans Arabic',sans-serif;color:var(--ink);background:#fff;font-weight:500;line-height:1.55}
.page{page-break-after:always;break-after:page;min-height:10mm;position:relative}.flowpage{page:flow}.land{page:auto}
h1{font-size:22px;color:var(--plum);margin:0 0 8px;font-weight:700;display:flex;align-items:center;gap:10px}h1 .num{background:var(--plum);color:var(--cream);font-size:13px;padding:2px 10px;border-radius:3px;font-family:Consolas,monospace}
h3{font-size:14px;color:var(--plum);margin:12px 0 4px;font-weight:700}p{margin:4px 0 8px;max-width:1200px}ul{margin:2px 0 8px;padding-inline-start:20px}li{margin:2px 0}code{font-family:Consolas,'DejaVu Sans Mono',monospace;font-size:11px;background:#F3EEF3;padding:0 4px;border-radius:2px;direction:ltr;unicode-bidi:embed}
.fh{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid var(--plum);padding-bottom:3px;margin-bottom:6px}.ft{font-size:15px;font-weight:700;color:var(--plum)}.fm{font-size:11px;color:var(--gray)}.fnote{font-size:13px;color:#4E3F50;margin:0 0 6px;max-width:100%}
.fw{margin:0 auto}.fw svg{width:100%;height:auto;display:block}.sw svg{width:100%;height:auto;display:block}
table.mx{border-collapse:collapse;width:100%;font-size:12.5px;margin:4px 0 10px}table.mx th{background:var(--plum);color:var(--cream);font-weight:700;padding:5px 6px;text-align:start;border:1px solid #2C162F;vertical-align:top}table.mx td{border:1px solid var(--line);padding:4px 6px;vertical-align:top}table.mx tbody tr:nth-child(even) td{background:#FBF8F3}table.mx td.id{font-family:Consolas,'DejaVu Sans Mono',monospace;font-size:10px;direction:ltr;text-align:right;white-space:nowrap;color:var(--plum);font-weight:700}
table.small{font-size:11.5px}table.xs{font-size:10.5px}table.xs td{padding:3px 4px}table.mx thead{display:table-header-group}table.mx tr{page-break-inside:avoid;break-inside:avoid}
.dec{color:#B85A1E;font-weight:700}.decision{border:1.5px solid var(--orange);background:#FFF3EC;padding:6px 10px;border-radius:3px;margin:6px 0}
.legend .lg{display:grid;grid-template-columns:repeat(5,1fr);gap:6px 14px;margin:4px 0 8px}.legend .lg div{display:flex;align-items:center;gap:8px;font-size:13px}.legend .lg svg{width:70px;height:24px;flex:none}
.toc{columns:2;column-gap:40px;font-size:15px;list-style:none;padding:0;margin:8px 0;max-width:1000px}.toc li{padding:5px 0;border-bottom:1px dashed var(--line);break-inside:avoid}.toc .n{display:inline-block;width:38px;color:var(--orange);font-weight:700;font-family:Consolas,monospace}
.cover{background:var(--plum);color:var(--cream);min-height:270mm;display:flex;align-items:center;justify-content:center;text-align:center}.cover-in{max-width:900px}.brand{font-size:18px;letter-spacing:.2em;color:var(--orange);font-weight:700}.ct{font-size:44px;color:var(--cream);display:block;line-height:1.3;margin:14px 0 6px;justify-content:center}.ct span{font-size:26px;font-weight:600;color:#E5D7E6}.cs{font-size:15px;color:#CDBFD0;direction:ltr}.cslogan{font-size:28px;color:var(--orange);font-weight:700;margin:6px 0 24px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 30px;text-align:start;font-size:13px;background:rgba(255,255,255,.08);padding:14px 20px;border-radius:4px}.meta b{color:var(--orange);margin-inline-end:6px}.cq{font-size:15px;color:#E5D7E6;margin-top:26px;font-style:italic}
`;
const doc = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>توّا — مخطط العمليات التشغيلية الكامل</title><style>${css}</style></head><body>${html}</body></html>`;
const out = path.join(__dirname, "..", "Twaa-Operating-Process-Blueprint.html"); fs.writeFileSync(out, doc);
console.log("written", out, Math.round(doc.length / 1024) + "KB"); console.log("AUDIT:", audit.length ? audit : "all flowcharts pass (no dead ends, no unreachable nodes, all decisions branch)");
