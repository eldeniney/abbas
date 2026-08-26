const pptxgen = require("pptxgenjs");
const D = require("./data.js");
const C = D.C;
const F = "Segoe UI";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";           // 13.33 x 7.5
pres.author = "Prime - SMB, e& UAE";
pres.title  = "Prime H2 2026 ROI Plan";

const W = 13.33, H = 7.5;
const M = 0.55;                         // page margin

// ---------- shared furniture ----------
function chrome(s, opts) {
  const dark = !!opts.dark;
  s.background = { color: dark ? C.ink : C.paper };

  // motif: red rounded tile carrying the ampersand mark
  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 0.40, w: 0.44, h: 0.44, rectRadius: 0.10,
    fill: { color: C.red }, line: { color: C.red },
  });
  s.addText("&", {
    x: M, y: 0.40, w: 0.44, h: 0.44, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 19, bold: true, color: C.white,
    align: "center", valign: "middle",
  });
  s.addText(opts.kicker, {
    x: M + 0.60, y: 0.40, w: 7.0, h: 0.44, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 9.5, bold: true, charSpacing: 2.2,
    color: dark ? C.grey : C.slate, valign: "middle",
  });

  // slide number pill
  s.addText(String(opts.num).padStart(2, "0"), {
    x: W - M - 0.55, y: 0.40, w: 0.55, h: 0.44, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 11, bold: true,
    color: dark ? C.slate : C.grey, align: "right", valign: "middle",
  });

  s.addText(opts.title, {
    x: M, y: 0.98, w: W - 2 * M - 0.2, h: 0.78, isTextBox: true, margin: 0,
    fontFace: F, fontSize: opts.titleSize || 21, bold: true,
    color: dark ? C.white : C.ink, valign: "top", lineSpacingMultiple: 0.95,
  });
  if (opts.sub) {
    s.addText(opts.sub, {
      x: M, y: 1.76, w: W - 2 * M - 0.2, h: 0.42, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 11, color: dark ? C.grey : C.slate, valign: "top",
      lineSpacingMultiple: 0.95,
    });
  }
  s.addText(
    `${D.dataStatus}.  As of ${D.asOf}.  AED millions.  ARR = MRC x 12; device value is one-time and is not annualised.`,
    { x: M, y: H - 0.46, w: W - 2 * M, h: 0.30, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 7.8, italic: true, color: dark ? C.slate : C.grey, valign: "middle" }
  );
}

const axisBase = (dark) => ({
  showLegend: false,
  catAxisLabelColor: dark ? C.grey : C.slate,
  valAxisLabelColor: dark ? C.grey : C.slate,
  catAxisLabelFontFace: F, valAxisLabelFontFace: F,
  catAxisLabelFontSize: 10, valAxisLabelFontSize: 9,
  catAxisLineShow: false, valAxisLineShow: false,
  catGridLine: { style: "none" },
  valGridLine: { color: dark ? "2E3338" : C.line, size: 1 },
  dataLabelFontFace: F,
  showTitle: false,
  chartArea: { fill: { color: dark ? C.ink : C.paper } },
  plotArea: { fill: { color: dark ? C.ink : C.paper } },
});

// =====================================================================
// SLIDE 1 - the gap
// =====================================================================
{
  const s = pres.addSlide();
  chrome(s, {
    dark: true, num: 1, kicker: "PRIME  |  H2 2026 ROI PLAN  |  INTERNAL",
    title: `H2 must add AED ${D.gap.toFixed(1)}M — a ${D.growthPct}% ROI step-up in six months`,
    sub: "Two engines carry the number: incremental annualised sales and validated revenue protection. Hiring, retention, productivity and CVM are the capacity that delivers them — not additional revenue lines.",
  });

  // ---- waterfall (shapes, fully editable in PowerPoint) ----
  const px = 0.78, pitch = 2.04, bw = 1.54, baseY = 6.34, topRoom = 3.58;
  const scale = topRoom / 85;
  const seg = [
    { label: "H1 2026 actual",      val: D.totalH1,     from: 0,          color: C.slate },
    { label: "Incremental sales",   val: D.salesDelta,  from: D.totalH1,  color: C.redBright },
    { label: "Revenue protection",  val: D.protDelta,   from: D.totalH1 + D.salesDelta, color: C.amber },
    { label: "H2 2026 target",      val: D.totalH2,     from: 0,          color: C.red },
  ];
  s.addShape(pres.ShapeType.line, {
    x: px - 0.35, y: baseY, w: 4 * pitch - 0.2, h: 0,
    line: { color: "343A40", width: 1 },
  });
  seg.forEach((g, i) => {
    const h = Math.max(g.val * scale, 0.12);
    const y = baseY - (g.from + g.val) * scale;
    const x = px + i * pitch;
    s.addShape(pres.ShapeType.rect, { x, y, w: bw, h, fill: { color: g.color }, line: { color: g.color } });
    s.addText((i === 1 || i === 2 ? "+" : "") + g.val.toFixed(1), {
      x: x - 0.15, y: y - 0.36, w: bw + 0.3, h: 0.32, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 15, bold: true, color: C.white, align: "center", valign: "bottom",
    });
    s.addText(g.label, {
      x: x - 0.30, y: baseY + 0.10, w: bw + 0.6, h: 0.46, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 10, color: C.grey, align: "center", valign: "top",
    });
    if (i < 3) {
      const yTop = baseY - (g.from + g.val) * scale;
      s.addShape(pres.ShapeType.line, {
        x: x + bw, y: yTop, w: pitch - bw, h: 0,
        line: { color: "3D444B", width: 1, dashType: "dash" },
      });
    }
  });
  s.addText("Bridge from H1 2026 actual to H2 2026 target  ·  AED millions", {
    x: px - 0.30, y: 2.22, w: 7.6, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 9.5, bold: true, charSpacing: 1.4, color: C.slate, valign: "middle",
  });

  // ---- stat rail ----
  const tiles = [
    { big: `AED ${D.gap.toFixed(1)}M`, small: "Incremental ROI revenue required in H2 2026", accent: C.redBright },
    { big: `+${D.growthPct}%`,          small: `Step-up on the H1 base of AED ${D.totalH1.toFixed(1)}M`, accent: C.amber },
    { big: `+${D.productivityUpliftPct}%`, small: "Required output per productive KAM per half", accent: C.teal },
    { big: `AED ${D.capacity.exposedBaseAED}M`, small: `Recurring base sitting in ${D.capacity.vacantJun} unmanaged portfolios`, accent: C.sand },
  ];
  tiles.forEach((t, i) => {
    const y = 2.52 + i * 1.02;
    s.addShape(pres.ShapeType.roundRect, {
      x: 9.05, y, w: 3.73, h: 0.90, rectRadius: 0.06,
      fill: { color: "22262B" }, line: { color: "2E3338", width: 1 },
    });
    s.addShape(pres.ShapeType.rect, { x: 9.05, y, w: 0.055, h: 0.90, fill: { color: t.accent }, line: { color: t.accent } });
    s.addText(t.big, {
      x: 9.26, y: y + 0.06, w: 1.95, h: 0.78, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 17, bold: true, color: C.white, valign: "middle",
    });
    s.addText(t.small, {
      x: 11.18, y: y + 0.06, w: 1.55, h: 0.78, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 8, color: C.grey, valign: "middle", lineSpacingMultiple: 0.95,
    });
  });

  s.addNotes(
`Opening message: the number is a 39% step-up in six months, and it splits into exactly two ROI engines.

Engine 1 - incremental annualised sales: AED ${D.salesH1.toFixed(1)}M in H1 to AED ${D.salesH2.toFixed(1)}M in H2 across Mobile, Fixed, Digital & ES and Devices. Device value is one-time and is NOT annualised; it is reported separately so the ARR line stays clean.

Engine 2 - revenue protection: AED ${D.protection.h1.toFixed(1)}M to AED ${D.protection.h2.toFixed(1)}M of validated retained ARR from accounts that hit a defined churn-risk trigger.

The discipline point for leadership: hiring, retention, productivity and CVM are NOT a third revenue line. They are the capacity that makes the first two achievable. Counting them separately would double count the same dirham.

Rounding: bar values are rounded to one decimal; the bridge reconciles exactly to AED ${D.gap.toFixed(1)}M.`);
}

// =====================================================================
// SLIDE 2 - levers
// =====================================================================
{
  const s = pres.addSlide();
  chrome(s, {
    dark: false, num: 2, kicker: "WHERE THE GROWTH COMES FROM",
    title: `Six levers close the AED ${D.gap.toFixed(1)}M gap, each with one owner`,
    sub: `Sales engine AED ${D.salesDelta.toFixed(1)}M  ·  Protection engine AED ${D.protDelta.toFixed(1)}M  ·  the contributions reconcile to the gap, with no lever counted twice.`,
  });

  // bar charts plot bottom-up: reverse so the chart reads in the same order as the list
  const rev = D.levers.slice().reverse();
  const cats = rev.map(l => l.name.replace(" (relationship continuity)", ""));
  const salesSeries = rev.map(l => (l.engine === "Sales" ? l.aed : 0));
  const protSeries  = rev.map(l => (l.engine === "Protection" ? l.aed : 0));

  s.addChart(pres.ChartType.bar, [
    { name: "Incremental sales", labels: cats, values: salesSeries },
    { name: "Revenue protection", labels: cats, values: protSeries },
  ], Object.assign({}, axisBase(false), {
    x: M, y: 2.20, w: 6.15, h: 4.43,
    barDir: "bar", barGrouping: "stacked", barGapWidthPct: 45,
    chartColors: [C.redBright, C.amber],
    showValue: true, dataLabelPosition: "ctr", dataLabelColor: C.white,
    dataLabelFontSize: 11, dataLabelFontBold: true, dataLabelFormatCode: "0.0;;",
    showLegend: true, legendPos: "t", legendFontFace: F, legendFontSize: 9.5, legendColor: C.slate,
    catAxisLabelFontSize: 9.5, valAxisMaxVal: 6, valAxisMajorUnit: 2,
    valAxisLabelFormatCode: '0.0"M"',
  }));

  D.levers.forEach((l, i) => {
    const y = 2.22 + i * 0.752;
    const accent = l.engine === "Sales" ? C.redBright : C.amber;
    s.addShape(pres.ShapeType.rect, {
      x: 7.05, y, w: 5.73, h: 0.68,
      fill: { color: C.white }, line: { color: C.line, width: 1 },
    });
    s.addShape(pres.ShapeType.rect, { x: 7.05, y, w: 0.05, h: 0.68, fill: { color: accent }, line: { color: accent } });
    s.addText(l.id, {
      x: 7.18, y: y + 0.03, w: 0.42, h: 0.60, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 10, bold: true, color: accent, valign: "middle",
    });
    s.addText(l.name, {
      x: 7.62, y: y + 0.05, w: 3.55, h: 0.28, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 10.5, bold: true, color: C.ink, valign: "middle",
    });
    s.addText(`${l.owner}  ·  ${l.lead}`, {
      x: 7.62, y: y + 0.32, w: 3.62, h: 0.28, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 8.2, color: C.grey, valign: "middle",
    });
    s.addText(`+${l.aed.toFixed(1)}`, {
      x: 11.30, y: y + 0.03, w: 1.40, h: 0.60, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 16, bold: true, color: accent, align: "right", valign: "middle",
    });
  });

  s.addNotes(
`Read the chart left, the accountability right. Two rules keep this honest:

1. No double counting. CVM-attributed revenue is a SOURCE attribution inside Mobile, Fixed, Digital and Devices - it is not a seventh product line. L6 is credited only with the incremental ARR that would not have been created without the campaign engine.
2. Protection is not sales. L2 and L4 recognise retained ARR on accounts with a validated risk trigger; L1, L3, L5 and L6 recognise new ARR. The same dirham never appears in both.

Weakest link to call out: L6 at AED ${D.levers.find(l=>l.id==='L6').aed.toFixed(1)}M assumes CVM lead volume roughly triples AND that KAMs act on digital leads within 24 hours. Without the closed loop, the leads convert at today's 9% and this lever under-delivers by roughly half.`);
}

// =====================================================================
// SLIDE 3 - capacity
// =====================================================================
{
  const s = pres.addSlide();
  chrome(s, {
    dark: false, num: 3, kicker: "THE BINDING CONSTRAINT",
    title: `Capacity is the constraint: +${D.productivityUpliftPct}% output per KAM is required`,
    sub: `At H1 productivity the target would need ${D.capacity.requiredFTEAtH1Productivity} productive KAMs. Even fully staffed we average ${D.avgProductiveFTE_H2} — so the gap must be closed by productivity, coverage and lead flow.`,
  });

  s.addText("KAM capacity vs. requirement (productive FTE)", {
    x: M, y: 2.20, w: 6.0, h: 0.28, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 10, bold: true, charSpacing: 1.2, color: C.slate, valign: "middle",
  });
  s.addChart([
    { type: pres.ChartType.bar, data: [{ name: "Productive KAM FTE (plan)", labels: D.capacity.months, values: D.capacity.productiveFTE }],
      options: { chartColors: [C.red], barGrouping: "clustered", barGapWidthPct: 55,
                 showValue: true, dataLabelPosition: "outEnd", dataLabelColor: C.slate, dataLabelFontSize: 9.5, dataLabelFontBold: true } },
    { type: pres.ChartType.line, data: [{ name: `Required at H1 productivity (${D.capacity.requiredFTEAtH1Productivity})`, labels: D.capacity.months, values: D.capacity.months.map(() => D.capacity.requiredFTEAtH1Productivity) }],
      options: { chartColors: [C.ink], lineSize: 2, lineDash: "dash", lineDataSymbol: "none" } },
  ], Object.assign({}, axisBase(false), {
    x: M - 0.05, y: 2.48, w: 6.25, h: 3.02,
    valAxisMinVal: 80, valAxisMaxVal: 140, valAxisMajorUnit: 20,
    showLegend: true, legendPos: "b", legendFontFace: F, legendFontSize: 9, legendColor: C.slate,
  }));

  s.addText("Vacancy and attrition trajectory (%)", {
    x: 6.95, y: 2.20, w: 5.9, h: 0.28, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 10, bold: true, charSpacing: 1.2, color: C.slate, valign: "middle",
  });
  s.addChart(pres.ChartType.line, [
    { name: "KAM vacancy rate", labels: D.capacity.months, values: D.capacity.vacancyRate },
    { name: "Rolling 12-month attrition", labels: D.capacity.months, values: D.capacity.attritionR12 },
  ], Object.assign({}, axisBase(false), {
    x: 6.90, y: 2.48, w: 5.95, h: 3.02,
    chartColors: [C.teal, C.amber], lineSize: 2.5, lineDataSymbolSize: 6,
    showValue: true, dataLabelPosition: "t", dataLabelColor: C.slate, dataLabelFontSize: 8.5,
    dataLabelFormatCode: '0.0"%"',
    valAxisMinVal: 0, valAxisMaxVal: 24, valAxisMajorUnit: 6, valAxisLabelFormatCode: '0"%"',
    showLegend: true, legendPos: "b", legendFontFace: F, legendFontSize: 9, legendColor: C.slate,
  }));

  const stats = [
    { big: `${D.capacity.filledJun} of ${D.capacity.approvedHeadcount}`, lab: "KAM positions filled today",
      note: `${D.capacity.vacantJun} vacant portfolios hold AED ${D.capacity.exposedBaseAED}M of recurring base`, accent: C.red },
    { big: `AED ${D.arrPerKamH1}k → ${D.arrPerKamH2}k`, lab: "Incremental ARR per productive KAM, per half",
      note: `+${D.productivityUpliftPct}% — delivered by selling time, next-best-action and lead flow`, accent: C.teal },
    { big: `${D.capacity.h1AttritionR12}% → ${D.capacity.h2TargetAttrition}%`, lab: "Rolling KAM attrition",
      note: `Regretted attrition ${D.capacity.h1RegrettedAttrition}% → ${D.capacity.h2TargetRegretted}%; every exit costs ~4 months of portfolio momentum`, accent: C.amber },
  ];
  stats.forEach((t, i) => {
    const x = M + i * 4.10;
    s.addShape(pres.ShapeType.rect, { x, y: 5.66, w: 3.90, h: 1.20, fill: { color: C.white }, line: { color: C.line, width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y: 5.66, w: 3.90, h: 0.045, fill: { color: t.accent }, line: { color: t.accent } });
    s.addText(t.big, { x: x + 0.18, y: 5.78, w: 3.55, h: 0.34, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 15, bold: true, color: C.ink, valign: "middle" });
    s.addText(t.lab, { x: x + 0.18, y: 6.10, w: 3.55, h: 0.24, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 9, bold: true, color: t.accent, valign: "middle" });
    s.addText(t.note, { x: x + 0.18, y: 6.32, w: 3.58, h: 0.44, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 8, color: C.grey, valign: "top", lineSpacingMultiple: 0.95 });
  });

  s.addNotes(
`This is the slide that decides whether the plan is credible.

The arithmetic: H1 delivered AED ${D.salesH1.toFixed(1)}M of incremental ARR on an average ${D.capacity.h1AvgProductiveFTE} productive FTE, i.e. AED ${D.arrPerKamH1}k per KAM per half. The H2 target of AED ${D.salesH2.toFixed(1)}M against an average ${D.avgProductiveFTE_H2} productive FTE requires AED ${D.arrPerKamH2}k - a ${D.productivityUpliftPct}% uplift. At unchanged productivity we would need ${D.capacity.requiredFTEAtH1Productivity} productive KAMs, which the approved headcount of ${D.capacity.approvedHeadcount} cannot supply.

So the uplift must come from three sources, not wishful thinking: selling time 41% to 55% (+12%), digital lead flow through CVM (+7%), and solution/AI attach on existing accounts (+6%).

Productive FTE is defined as headcount adjusted for vacancy, notice period, leave and new-joiner ramp (month 1 30%, month 2 60%, month 3 85%, month 4 100%). Ask HR to confirm the vacancy and attrition baselines before this goes to CBO.`);
}

// =====================================================================
// SLIDE 4 - execution
// =====================================================================
{
  const s = pres.addSlide();
  chrome(s, {
    dark: true, num: 4, kicker: "EXECUTION, GOVERNANCE AND DECISIONS",
    title: "Three waves, one weekly rhythm, three decisions needed now",
    sub: "Every initiative has an owner, a leading indicator and a stop/scale review. The build is back-loaded, so the first 30 days decide the half.",
  });

  const waves = [
    { tag: "DAYS 0–30", head: "Stabilise the base", accent: C.redBright, items: [
      "Zero-vacancy sprint: 16 offers out, bridge coverage on every orphan portfolio within 5 working days",
      "Churn Early-Warning Index live in Power Apps; Red/Amber tiering on 100% of the managed base",
      "Pipeline hygiene reset: stage gates, mandatory next action, ECD clean-up to >95% data quality",
      "Baseline lock with Finance: ARR, protection and churn definitions signed off",
    ]},
    { tag: "DAYS 31–60", head: "Lift the engine", accent: C.amber, items: [
      "Save-play playbook deployed; 90% of Red accounts touched within 10 days of trigger",
      "Admin-elimination backlog: remove 6 hours/KAM/week of non-selling work",
      "Always-on CVM journeys 3 → 9; digital lead-to-KAM SLA of 24 hours enforced",
      "AI Opportunity Spotting rollout: every KAM certified, 2 VALUE-scored leads each",
    ]},
    { tag: "DAYS 61–90", head: "Scale what works", accent: C.teal, items: [
      "Reallocate portfolios on exposure-weighted coverage; retire the bridge pool",
      "Stop/scale review: fund the top three plays, kill anything below 1.5x return",
      "Retention: stay interviews for the top quartile, career lattice and earn-back incentive live",
      "Forecast moves to evidence bands (commit / best / upside) at Director level",
    ]},
  ];
  waves.forEach((w, i) => {
    const x = M + i * 4.17;
    s.addShape(pres.ShapeType.rect, { x, y: 2.18, w: 3.98, h: 2.12, fill: { color: "22262B" }, line: { color: "2E3338", width: 1 } });
    s.addShape(pres.ShapeType.rect, { x, y: 2.18, w: 3.98, h: 0.05, fill: { color: w.accent }, line: { color: w.accent } });
    s.addText(w.tag, { x: x + 0.20, y: 2.30, w: 2.0, h: 0.24, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 8.5, bold: true, charSpacing: 1.6, color: w.accent, valign: "middle" });
    s.addText(w.head, { x: x + 0.20, y: 2.52, w: 3.6, h: 0.28, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 13, bold: true, color: C.white, valign: "middle" });
    s.addText(w.items.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k !== w.items.length - 1 } })), {
      x: x + 0.20, y: 2.84, w: 3.62, h: 1.40, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 8.6, color: "C9CFD5", paraSpaceAfter: 5, lineSpacingMultiple: 0.95,
    });
  });

  s.addText("Monthly build to target (AED M, incremental vs H1 run-rate)", {
    x: M, y: 4.44, w: 7.4, h: 0.26, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 9.5, bold: true, charSpacing: 1.2, color: C.grey, valign: "middle",
  });
  s.addChart(pres.ChartType.bar, [
    { name: "Incremental sales", labels: D.monthly.months, values: D.monthly.salesBuild },
    { name: "Revenue protection", labels: D.monthly.months, values: D.monthly.protectionBuild },
  ], Object.assign({}, axisBase(true), {
    x: M - 0.05, y: 4.68, w: 7.45, h: 2.16,
    barDir: "col", barGrouping: "stacked", barGapWidthPct: 55,
    chartColors: [C.redBright, C.amber],
    showValue: true, dataLabelPosition: "ctr", dataLabelColor: C.white,
    dataLabelFontSize: 8.5, dataLabelFontBold: true, dataLabelFormatCode: "0.0;;",
    valAxisMinVal: 0, valAxisMaxVal: 6, valAxisMajorUnit: 2,
    showLegend: true, legendPos: "b", legendFontFace: F, legendFontSize: 8.5, legendColor: C.grey,
  }));

  s.addShape(pres.ShapeType.rect, { x: 8.28, y: 4.44, w: 4.50, h: 2.40, fill: { color: "22262B" }, line: { color: C.red, width: 1 } });
  s.addText("DECISIONS REQUIRED", { x: 8.48, y: 4.56, w: 4.1, h: 0.26, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 9, bold: true, charSpacing: 1.8, color: C.red, valign: "middle" });
  const asks = [
    "Release the 16 vacant KAM requisitions with a 35-day time-to-fill SLA and a standing 3-person bridge pool.",
    `Approve AED ${D.investTotal.toFixed(1)}M of enabling spend against AED ${D.gap.toFixed(1)}M of benefit — ${D.netRoiMultiple.toFixed(1)}x net return, payback in month 4.`,
    "Sign off the protection methodology with Finance so retained ARR is recognised on evidence, not on claim.",
  ];
  asks.forEach((a, i) => {
    const y = 4.90 + i * 0.64;
    s.addText(String(i + 1), { x: 8.48, y, w: 0.30, h: 0.30, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 13, bold: true, color: C.red, valign: "top" });
    s.addText(a, { x: 8.82, y, w: 3.82, h: 0.60, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 8.6, color: "C9CFD5", valign: "top", lineSpacingMultiple: 0.95 });
  });

  s.addNotes(
`Operating rhythm behind the waves:
- Weekly (Mon, 45 min): Director war room - coverage, Red-tier churn saves, top 20 opportunities, blockers with named owners.
- Weekly (Wed): TL 1:1s on the 10-4-2-1 KAM rhythm (10 accounts touched, 4 discovery conversations, 2 qualified opportunities, 1 closure).
- Monthly: ROI Ledger review with Finance - every claimed dirham carries an evidence status.
- Monthly: people review - vacancy, ramp, flight risk, regretted attrition.
- Quarterly: stop/scale on initiatives and portfolio rebalancing.

The three asks are the ones I cannot resolve inside Prime. Number 3 matters most: without an agreed protection methodology, the AED ${D.protection.h2.toFixed(1)}M protection line will be challenged at year end and the whole ROI number becomes contestable.

Top failure modes: (1) hiring slips and the productivity ask becomes impossible; (2) CVM lead flow arrives but the 24-hour KAM SLA is not enforced; (3) protection is claimed without evidence and is written back.`);
}

pres.writeFile({ fileName: process.argv[2] || "Prime_H2_2026_ROI_Plan.pptx" })
  .then(f => console.log("WROTE", f));
