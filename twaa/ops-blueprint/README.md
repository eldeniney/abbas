# توّا — مخطط العمليات التشغيلية الكامل (Operating Process Blueprint)

`Twaa-Operating-Process-Blueprint.pdf` (A3، 83 صفحة) و`.html` هما المخرج. المصدر في `src/`:

- `engine.js` — محرك رسم المخططات الانسيابية (dagre → SVG، أشكال BPMN، مسارات ملوّنة، تدقيق آلي: لا نهايات معلّقة، كل قرار يتفرع، لا عقد غير متصلة، تقسيم الصفحات).
- `dsl.js` — صيغة نصية مختصرة لتعريف المخططات (`id | TYPE | label | CODE`, `a -> b : label : cls`).
- `graphs1..4.js` — العمليات P01–P25 + الخريطة الكبرى + آلة الحالات + معمارية الطلب + الكيانات.
- `swim.js` — مخطط المسارات المتوازية (8 مسارات، 4 لوحات متصلة).
- `tables.js` — كتالوج الاستثناءات (66)، قواعد العمل (73)، SLA، الإشعارات، المسؤولية المالية، برج التحكم، الكيانات، القرارات المفتوحة (25).
- `build.js` — تجميع الوثيقة HTML (الخطوط مضمّنة) وتشغيل التدقيق.

إعادة البناء:

```bash
npm i dagre @fontsource/cairo playwright   # مرة واحدة
FONTS_DIR=node_modules/@fontsource/cairo/files node src/build.js
node -e "require('playwright').chromium.launch().then(async b=>{const p=await b.newPage();await p.goto('file://'+process.cwd()+'/Twaa-Operating-Process-Blueprint.html');await p.pdf({path:'Twaa-Operating-Process-Blueprint.pdf',format:'A3',landscape:true,printBackground:true,preferCSSPageSize:true});await b.close()})"
```
