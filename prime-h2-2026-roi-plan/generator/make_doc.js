const {
  dx, P, H1, H2, H3, BULLETS, NUMS, TABLE, CALLOUT, SPACER, FONT, CONTENT_W, C, D,
} = require("./doc_helpers.js");
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak, Header, Footer,
  PageNumber, LevelFormat, TableOfContents, BorderStyle, convertInchesToTwip,
} = dx;
const fs = require("fs");

const f1 = (n) => n.toFixed(1);
const kids = [];
const add = (...x) => x.flat().forEach(k => kids.push(k));

// =====================================================================
// COVER
// =====================================================================
add(
  new Paragraph({ spacing: { before: 900, after: 0 }, children: [
    new TextRun({ text: "INTERNAL  ·  PRIME  ·  SMB, e& UAE", bold: true, size: 18, color: C.red, font: FONT, characterSpacing: 60 }),
  ]}),
  new Paragraph({ spacing: { before: 240, after: 0 }, children: [
    new TextRun({ text: "Prime H2 2026", bold: true, size: 56, color: C.ink, font: FONT }),
  ]}),
  new Paragraph({ spacing: { before: 0, after: 200 }, children: [
    new TextRun({ text: "ROI Delivery Plan", bold: true, size: 56, color: C.red, font: FONT }),
  ]}),
  new Paragraph({
    spacing: { before: 0, after: 260 },
    border: { top: { style: BorderStyle.SINGLE, size: 12, color: C.red, space: 8 } },
    children: [new TextRun({ text: "", font: FONT })],
  }),
  P([{ text: "How Prime grows incremental annualised sales, protects the installed revenue base, and builds the KAM capacity to deliver both — with owners, milestones, leading indicators and a measurable return.", size: 24, color: "3A4046" }], { after: 320 }),
  TABLE([
    ["Purpose", "Set the H2 2026 delivery plan for the two components of the Prime ROI KPI and the enabling capacity agenda"],
    ["Audience", "CBO / CXO, HOD, Prime Directors, Team Leaders, HR Business Partner, CVM, Product and Finance"],
    ["Owner", "Senior Director — Prime, SMB (e& UAE)"],
    ["Period covered", "1 July 2026 – 31 December 2026, with a 30 / 60 / 90-day mobilisation"],
    ["As of", D.asOf],
    ["Data status", D.dataStatus],
    ["Classification", "Internal — not for external distribution"],
  ], [22, 78], { noHeader: true, boldCol0: true, size: 18 }),
  SPACER(240),
  CALLOUT("Before this document is circulated", [
    "Every figure in this plan is an illustrative placeholder used to demonstrate the method, the arithmetic and the governance. Replace the values in Section 2.2 (Baseline and target) and Appendix K (Assumptions register) with the confirmed H1 2026 actuals and H2 2026 targets; every downstream table, gap, contribution and ROI figure is derived from them and must be recalculated.",
    "Headcount, portfolio and organisation figures quoted as background (approximately 120 approved KAM positions, three Directors, 14 Team Leaders) are dated August 2026 and must be reconfirmed with HR and Prime Operations before this plan is presented.",
    "The e&-inspired colour treatment used in the companion slide pack is derived from accents in the supplied Prime material. Substitute the official e& brand palette, logo and typeface before any presentation outside the team.",
  ], C.red),
  new Paragraph({ children: [new PageBreak()] }),
);

// =====================================================================
// TOC
// =====================================================================
add(
  H1("Contents"),
  P([{ text: "Right-click the table below and choose “Update Field” to populate page numbers after opening in Word.", italics: true, size: 17, color: "6B7280" }]),
  new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] }),
);

// =====================================================================
// 1. EXECUTIVE SUMMARY
// =====================================================================
add(
  H1("1. Executive summary"),
  H2("1.1 The recommendation"),
  P([{ text: "Recommendation. ", bold: true },
     { text: `Run H2 2026 as two revenue engines and one capacity programme. The ROI KPI requires AED ${f1(D.gap)}M of incremental value over the H1 2026 result — AED ${f1(D.salesDelta)}M from incremental annualised sales and AED ${f1(D.protDelta)}M from validated revenue protection, a ${D.growthPct}% step-up in six months. Six levers, each with a single accountable owner, deliver that number. Hiring, retention, productivity and CVM are not additional revenue lines: they are the capacity that makes the two engines achievable, and counting them separately would double count the same dirham.` }]),
  P([{ text: "Confidence. ", bold: true },
     { text: "Medium-high on the sales engine, medium on the protection engine. The sales number is supportable if — and only if — the vacancy position is closed early in the half and digital lead flow reaches the KAM within 24 hours. The protection number is the more fragile of the two, because it depends on a measurement methodology that is not yet agreed with Finance." }]),
  SPACER(80),
  TABLE([
    ["ROI component", "H1 2026 actual", "H2 2026 target", "Increment", "Basis"],
    ["Incremental sales — annualised", `AED ${f1(D.salesH1)}M`, `AED ${f1(D.salesH2)}M`, `+AED ${f1(D.salesDelta)}M`, "Mobile, Fixed, Digital & ES (ARR) plus device value (one-time, not annualised)"],
    ["Revenue protection", `AED ${f1(D.protection.h1)}M`, `AED ${f1(D.protection.h2)}M`, `+AED ${f1(D.protDelta)}M`, "Validated retained ARR on accounts with a defined churn-risk trigger"],
    ["Total ROI revenue", `AED ${f1(D.totalH1)}M`, `AED ${f1(D.totalH2)}M`, `+AED ${f1(D.gap)}M`, `${D.growthPct}% step-up over one half`],
    ["Enabling investment", "—", `AED ${f1(D.investTotal)}M`, "—", "Hiring, retention, CVM, tooling and enablement"],
    ["Net benefit / return", "—", `AED ${f1(D.netBenefit)}M`, `${D.netRoiMultiple}x`, "Net benefit divided by enabling investment; payback in month 4"],
  ], [26, 15, 15, 13, 31], { align: ["l", "r", "r", "r", "l"], boldCol0: true, size: 16 }),
  SPACER(160),

  H2("1.2 What must be true"),
  P("Four conditions carry the plan. If any one fails, the H2 number fails with it, and the mitigation must start in the first 30 days rather than at the half-year review:"),
  ...NUMS([
    [{ text: "Capacity arrives early, not late. ", bold: true },
     { text: `The ${D.capacity.vacantJun} vacant KAM positions must be substantially filled by the end of September. A hire landing in November contributes roughly one month of productive output after ramp, not five.` }],
    [{ text: "Productivity rises by around a quarter. ", bold: true },
     { text: `At H1 productivity the target would require ${D.capacity.requiredFTEAtH1Productivity} productive KAMs. Even fully staffed, the half averages approximately ${D.avgProductiveFTE_H2}. The residual must come from selling time, lead flow and solution attach — not from optimism.` }],
    [{ text: "Protection is recognised on evidence. ", bold: true },
     { text: "Retained revenue must be tied to a recorded risk trigger, a documented intervention and a post-intervention observation window. Without that, the protection line will be challenged at year end and written back." }],
    [{ text: "Digital and CVM close the loop. ", bold: true },
     { text: "Additional lead volume creates value only if it reaches a named KAM within 24 hours and is worked to a governed stage. Volume without a service level converts at today's rate and the CVM lever under-delivers by roughly half." }],
  ]),
  SPACER(120),

  H2("1.3 The three decisions required now"),
  TABLE([
    ["#", "Decision required", "From", "Needed by", "Consequence if delayed"],
    ["1", `Release the ${D.capacity.vacantJun} vacant KAM requisitions with a 35-day time-to-fill service level, and approve a standing three-person bridge coverage pool.`, "HOD / HR", "Within 14 days", `Each month of delay removes roughly AED 0.4M of achievable incremental ARR and leaves AED ${D.capacity.exposedBaseAED}M of recurring base unmanaged.`],
    ["2", `Approve AED ${f1(D.investTotal)}M of enabling investment against AED ${f1(D.gap)}M of incremental benefit.`, "CBO", "Within 21 days", "Campaign factory, tooling and retention actions slip a quarter; the back-loaded build becomes unachievable."],
    ["3", "Sign off the revenue-protection measurement methodology with Finance, including the risk trigger, baseline, observation window and evidence standard.", "Finance / HOD", "Within 30 days", `The AED ${f1(D.protection.h2)}M protection line becomes contestable and the ROI KPI cannot be closed with confidence.`],
  ], [4, 38, 12, 13, 33], { size: 16 }),
  SPACER(160),

  H2("1.4 The weakest link"),
  ...[CALLOUT("Where this plan is most likely to fail", [
    "It is not the sales target. It is the protection line and the capacity assumption behind it.",
    `Revenue protection is being asked to grow by AED ${f1(D.protDelta)}M (${Math.round(D.protDelta / D.protection.h1 * 100)}%) at the same time as the account-management population is being rebuilt through hiring. New joiners carry relationship risk in their first two quarters, not relationship strength — the accounts most likely to churn are precisely those that changed hands. Portfolio reassignment must therefore be exposure-weighted: the highest-revenue and highest-risk accounts stay with tenured KAMs, and new joiners inherit the stable tail.`,
    "Second-order risk: gross protected revenue and the net reduction in churn are two different measures. Claiming the larger of the two without reconciliation is the single most common way an ROI KPI is disallowed at year end. Section 2.4 sets the reconciliation rule.",
  ], C.red)],
  new Paragraph({ children: [new PageBreak()] }),
);

// =====================================================================
// 2. OBJECTIVE, SCOPE, BASELINE, TARGET
// =====================================================================
add(
  H1("2. Objective, scope, baseline and target"),
  H2("2.1 Objective and scope"),
  P("Objective: deliver the H2 2026 Prime ROI KPI in full, on evidence that Finance can validate, while leaving the department structurally stronger than it was at the start of the half — better staffed, more productive, and measuring the right things."),
  P("In scope:"),
  ...BULLETS([
    "Incremental annualised sales across Mobile, Fixed, Digital & Enterprise Solutions, and device sales.",
    "Account management and revenue protection across the Prime managed recurring base.",
    "KAM productivity, portfolio coverage, vacancy closure and employee retention.",
    "Digital campaign and CVM acceleration as a lead-generation and retention channel for Prime.",
    "Pipeline governance, forecast discipline, data quality and the ROI measurement ledger.",
  ]),
  P("Out of scope (dependencies managed, not owned):"),
  ...BULLETS([
    "Product roadmap, pricing approval, and solution design — owned by Product and Solution Architecture.",
    "Provisioning, activation and billing operations — Prime manages the escalation path, not the process.",
    "Group-level compensation policy — Prime proposes, HR and Reward approve.",
  ]),

  H2("2.2 Baseline and target — the input table to replace"),
  ...[CALLOUT("Replace this table first", [
    "This is the only table that needs manual updating. Every figure elsewhere in this plan, and every chart in the companion slide pack, is derived from it. Enter the confirmed H1 2026 actuals and H2 2026 targets, then recalculate the gap, the lever contributions in Section 4, the capacity bridge in Section 3.1 and the ROI in Section 7.",
  ], C.amber, "FEF6EE")],
  SPACER(120),
  TABLE([
    ["Revenue line", "H1 2026 actual (AED M)", "H2 2026 target (AED M)", "Increment", "Growth", "Measurement basis"],
    ...D.sales.map(s => [s.line, f1(s.h1), f1(s.h2), `+${f1(s.h2 - s.h1)}`, `${Math.round((s.h2 / s.h1 - 1) * 100)}%`, s.basis]),
    ["Sub-total — incremental sales", f1(D.salesH1), f1(D.salesH2), `+${f1(D.salesDelta)}`, `${Math.round((D.salesH2 / D.salesH1 - 1) * 100)}%`, "Sum of the four lines above"],
    ["Revenue protection", f1(D.protection.h1), f1(D.protection.h2), `+${f1(D.protDelta)}`, `${Math.round((D.protection.h2 / D.protection.h1 - 1) * 100)}%`, "Validated retained ARR (see 2.4)"],
    ["Total ROI revenue", f1(D.totalH1), f1(D.totalH2), `+${f1(D.gap)}`, `${D.growthPct}%`, "The KPI"],
  ], [24, 13, 13, 10, 8, 32], { align: ["l", "r", "r", "r", "r", "l"], boldCol0: true, size: 16 }),
  SPACER(140),
  P([{ text: "Note on devices. ", bold: true },
     { text: "Device revenue is one-time value and must not be annualised. It is shown inside the sales total because it forms part of the KPI as currently constructed, but it is reported on a separate line so that the annualised recurring revenue figure stays clean and comparable across halves. If Finance requires ARR-only reporting, the device line moves to a memorandum item and the target reduces accordingly — confirm this before the plan is locked." }]),

  H2("2.3 What the Prime ROI KPI is — and what it is not"),
  TABLE([
    ["Component", "Definition used in this plan", "Recognition rule"],
    ["Incremental annualised sales", "New recurring monthly charge won in the period, multiplied by twelve, for Mobile, Fixed and Digital & ES; plus device value at one-time contract value.", "Recognised at closed-won validated against order and activation status. Signed, ordered, activated and billed are reported as separate milestones."],
    ["Revenue protection", "Recurring revenue credibly retained from customers at genuine, evidenced risk of churn or downgrade, expressed as annualised value.", "Recognised only where a risk trigger was recorded before the intervention, the intervention is documented, and the account remains active through the observation window."],
    ["Productivity benefit", "Incremental capacity created through process, tooling, portfolio or staffing improvement.", "Never recognised as revenue. Reported as a capacity metric that explains how the two revenue lines were achieved."],
    ["Enabling investment", "People, campaign, incentive, tooling, delivery and enablement cost attributable to this plan.", "Recognised at commitment, reported against benefit monthly in the ROI Ledger."],
  ], [20, 42, 38], { boldCol0: true, size: 16 }),
  SPACER(160),

  H2("2.4 Anti-double-count rules"),
  P("Five rules govern what may be claimed. They exist because the fastest way to lose an ROI KPI is to win the argument on delivery and lose it on measurement."),
  ...NUMS([
    [{ text: "New revenue and retained revenue are never the same dirham. ", bold: true }, { text: "An upsell to a saved customer counts as incremental sales; the retained base counts as protection. The two are recorded against different fields on the same account and reconciled monthly." }],
    [{ text: "CVM is a source, not a product line. ", bold: true }, { text: "CVM-attributed revenue sits inside Mobile, Fixed, Digital or Devices. It is credited to the CVM lever for management attribution only and is never added to the revenue total a second time." }],
    [{ text: "Gross protection reconciles to net churn. ", bold: true }, { text: `Gross validated protection (AED ${f1(D.protection.h2)}M target) must be reconciled to the net reduction in revenue churn (${D.churn.h1LossRatePerHalf}% to ${D.churn.h2LossRatePerHalf}% of an AED ${D.churn.managedBaseAED}M managed base, or AED ${f1(D.churnNetReduction)}M). Where the two diverge, the ROI Ledger recognises the lower figure and the variance is explained.` }],
    [{ text: "Productivity is not revenue. ", bold: true }, { text: "Hours released, faster cycle times and higher opportunity creation are leading indicators. They are reported in the capacity view, never in the ROI numerator." }],
    [{ text: "One opportunity, one owner, one credit. ", bold: true }, { text: "Multi-product opportunities are recorded at opportunity-product-line grain with a stable parent identifier, so product performance is visible without the parent value being counted more than once." }],
  ]),
  new Paragraph({ children: [new PageBreak()] }),
);

// =====================================================================
// 3. DIAGNOSIS
// =====================================================================
add(
  H1("3. Diagnosis: where the gap really is"),
  H2("3.1 The capacity bridge — the arithmetic that decides the half"),
  P("The most useful question is not “can we sell more?” but “does the arithmetic close?”. It does not close on headcount alone."),
  TABLE([
    ["Step", "Calculation", "Result"],
    ["H1 incremental sales delivered", "—", `AED ${f1(D.salesH1)}M`],
    ["H1 average productive KAM FTE", "Headcount adjusted for vacancy, notice, leave and ramp", `${D.capacity.h1AvgProductiveFTE}`],
    ["H1 output per productive KAM", `AED ${f1(D.salesH1)}M ÷ ${D.capacity.h1AvgProductiveFTE}`, `AED ${D.arrPerKamH1}k per half`],
    ["H2 target incremental sales", "—", `AED ${f1(D.salesH2)}M`],
    ["Productive FTE required at H1 productivity", `AED ${f1(D.salesH2)}M ÷ AED ${D.arrPerKamH1}k`, `${D.capacity.requiredFTEAtH1Productivity} FTE`],
    ["Approved headcount", "—", `${D.capacity.approvedHeadcount}`],
    ["Realistic H2 average productive FTE", "Assumes vacancies closed by end-September and a four-month ramp curve", `${D.avgProductiveFTE_H2}`],
    ["Required output per productive KAM", `AED ${f1(D.salesH2)}M ÷ ${D.avgProductiveFTE_H2}`, `AED ${D.arrPerKamH2}k per half`],
    ["Productivity uplift required", `AED ${D.arrPerKamH2}k ÷ AED ${D.arrPerKamH1}k − 1`, `+${D.productivityUpliftPct}%`],
  ], [34, 44, 22], { align: ["l", "l", "r"], boldCol0: true, size: 16 }),
  SPACER(140),
  P([{ text: "Conclusion. ", bold: true },
     { text: `The target cannot be delivered by hiring alone — approved headcount is ${D.capacity.approvedHeadcount} and the requirement at unchanged productivity is ${D.capacity.requiredFTEAtH1Productivity}. Roughly ${D.productivityUpliftPct}% more output per productive KAM is therefore not an aspiration in this plan; it is a structural requirement. Section 4 allocates that uplift to three specific sources so it can be tracked rather than assumed.` }]),
  SPACER(80),
  TABLE([
    ["Source of the productivity uplift", "Mechanism", "Contribution to the uplift"],
    ["Selling time recovered", "Administrative elimination, next-best-action prompts, pre-filled opportunity records, fewer manual reports", "+12 points"],
    ["Digital and CVM lead flow", "Propensity-scored leads delivered to a named KAM within 24 hours, with the discovery already partly done", "+7 points"],
    ["Solution and AI attach", "Structured discovery on the existing portfolio, converting operational pain into qualified Digital & ES opportunities", "+6 points"],
    ["Total", "—", `≈ +${D.productivityUpliftPct}%`],
  ], [30, 50, 20], { align: ["l", "l", "r"], boldCol0: true, size: 16 }),
  SPACER(160),

  H2("3.2 Churn diagnosis"),
  P(`Revenue churn on the Prime managed base is running at approximately ${D.churn.h1LossRatePerHalf}% of an AED ${D.churn.managedBaseAED}M annualised recurring base per half — AED ${f1(D.churnLossH1)}M of lost recurring revenue. The H2 objective is ${D.churn.h2LossRatePerHalf}%, or AED ${f1(D.churnLossH2)}M, a net reduction of AED ${f1(D.churnNetReduction)}M. Three patterns account for the majority of avoidable loss:`),
  ...BULLETS([
    [{ text: "Unmanaged and recently reassigned portfolios. ", bold: true }, { text: `Accounts in vacant portfolios churn at materially higher rates than actively managed ones. With ${D.capacity.vacantJun} portfolios unmanaged, roughly AED ${D.capacity.exposedBaseAED}M of recurring base carries no relationship owner.` }],
    [{ text: "Late detection. ", bold: true }, { text: "Risk is currently identified when the customer announces it — at contract expiry, at a port-out request, or after a service failure. By then the commercial options are limited to price." }],
    [{ text: "Undifferentiated response. ", bold: true }, { text: "Where risk is detected, the default response is a discount. Discounting protects the logo and erodes the value, which shows up as revenue churn in the following half." }],
  ]),
  P("The response is structural, not tactical: an early-warning index that scores risk before the customer raises it (Appendix B), and a small set of governed save plays that lead with value rather than price (Appendix C)."),

  H2("3.3 Pipeline and execution quality"),
  P("Even at current capacity, a meaningful share of the gap is recoverable from execution quality alone. The table below is the H1 position against the H2 operating standard."),
  TABLE([
    ["Execution metric", "H1 2026", "H2 standard", "Why it matters"],
    ...D.efficiency.map(e => [e.kpi, e.h1, e.h2, ""]).map((r, i) => {
      const why = [
        "Selling time is the single largest controllable input to output per KAM.",
        "Opportunity creation is the earliest reliable predictor of closures two months out.",
        "A six-point win-rate improvement is worth more than six additional headcount at current volumes.",
        "Cycle time compression pulls revenue into the half rather than across the year end.",
        "Below 3.0x coverage the forecast is arithmetic hope rather than a plan.",
        "Stale pipeline inflates coverage and destroys forecast credibility.",
        "Poor data quality makes every management view — and the ROI Ledger — contestable.",
      ][i];
      return [r[0], r[1], r[2], why];
    }),
  ], [30, 10, 12, 48], { align: ["l", "c", "c", "l"], boldCol0: true, size: 16 }),
  SPACER(160),

  H2("3.4 The three failure modes"),
  TABLE([
    ["Failure mode", "Early signal", "Mitigation", "Trigger point"],
    ["Hiring slips and the productivity requirement becomes impossible", "Offers out below plan at day 30; time-to-fill above 45 days", "Bridge coverage pool activated; exposure-weighted portfolio reassignment; escalate requisitions to HOD weekly", "Fewer than 10 offers accepted by 30 September"],
    ["Protection is claimed without evidence and is written back", "Protected value recorded without a preceding risk trigger; gross protection diverging from net churn reduction", "Evidence status mandatory on every ROI Ledger line; monthly reconciliation with Finance; recognise the lower measure", "Any month where unevidenced protection exceeds 15% of the claim"],
    ["Digital lead volume arrives but conversion does not", "Digital leads ageing beyond 24 hours; conversion flat at 9%", "Enforce the 24-hour service level at Team Leader level; route unworked leads to the bridge pool after 48 hours", "Two consecutive weeks below 80% service-level compliance"],
  ], [24, 26, 34, 16], { boldCol0: true, size: 16 }),
  new Paragraph({ children: [new PageBreak()] }),
);

// =====================================================================
// 4. LEVERS
// =====================================================================
const leverDetail = {
  L1: {
    title: "Sales engine and pipeline discipline",
    what: "Rebuild the commercial operating standard so that pipeline reflects reality, stages mean something, and closures are pulled into the half rather than drifting past it.",
    how: [
      "Stage entry and exit criteria published and enforced; probability governed by stage with justified overrides only.",
      "Mandatory next action and next-action date on every open opportunity; expected closure dates in the past are flagged and cleared weekly.",
      "Stale thresholds by stage, with automatic escalation to the Team Leader at threshold and to the Director at twice the threshold.",
      "Top-20 opportunity review per Director each week: next action, blocker, support required, confidence band.",
      "Forecast reported in evidence bands — commit, best case, upside — rather than as a single number.",
      "Closed-won validated against order and activation status before it enters the ROI Ledger.",
    ],
    kpi: "Incremental ARR closed and activated",
    lead: "Pipeline coverage 3.0x; stale pipeline below 15%; data-quality gate above 95%",
    dep: "Power Apps / Dataverse opportunity screens; agreed stage model with Sales Operations",
    risk: "Discipline is applied to reporting but not to behaviour. Mitigation: Team Leader compliance is a scorecard line, reviewed weekly, not a request.",
  },
  L2: {
    title: "Account management and save plays",
    what: "Move revenue protection from reactive discounting to a scored, early, value-led intervention model with evidence attached to every claim.",
    how: [
      "Churn Early-Warning Index (Appendix B) scores 100% of the managed base weekly into Red, Amber and Green tiers.",
      "Every Red-tier account is contacted within 10 working days of the trigger, by a named owner, with a recorded intervention.",
      "Five governed save plays (Appendix C) — renewal-ahead, value re-anchor, bundle consolidation, device refresh lock-in, digital anchor — replace the open-ended discount conversation.",
      "Discount authority tiered: value-led plays first; price concession requires Director approval and a documented reason.",
      "Quarterly business reviews mandated for the top decile of the base by recurring revenue.",
      "Protected value recorded with trigger, intervention, observation window and evidence status.",
    ],
    kpi: "Validated retained ARR; revenue churn rate on the managed base",
    lead: "90% of Red-tier accounts touched within 10 days; save-play usage rate; discount incidence falling",
    dep: "Churn signal data (usage, billing, complaints, contract expiry, port-out attempts); Finance sign-off on methodology",
    risk: "The index produces more alerts than the team can work. Mitigation: cap Red-tier volume at a serviceable level and tier by revenue exposure, not by score alone.",
  },
  L3: {
    title: "KAM productivity operating system",
    what: "Increase output per productive KAM by removing non-selling work and standardising the weekly commercial rhythm, rather than by asking for more effort.",
    how: [
      "Time study across a representative KAM sample to establish where the working week actually goes; publish the result.",
      "Administrative elimination backlog with a target of six hours per KAM per week removed by day 60 — pre-filled opportunity records, automated reporting, single-entry data capture, self-service quote status.",
      "The 10-4-2-1 weekly rhythm (Appendix D): 10 accounts touched, 4 discovery conversations, 2 qualified opportunities created, 1 closure.",
      "Next-best-action prompts in the opportunity app: renewal windows, white-space products, usage anomalies, unworked digital leads.",
      "Weekly KAM scorecard visible to the KAM, the Team Leader and the Director — activity, quality, conversion and realised revenue on one page.",
      "Coaching hours protected in the Team Leader diary and measured; coaching is an obligation, not a residual.",
    ],
    kpi: "Incremental ARR per productive KAM per half",
    lead: "Selling time share 41% to 55%; 4.5 qualified opportunities per KAM per month; cycle time 61 to 48 days",
    dep: "Power Platform build capacity; reporting automation; Team Leader capacity for coaching",
    risk: "The scorecard drives activity theatre. Mitigation: weight the scorecard toward conversion and realised revenue, not toward volume of touches.",
  },
  L4: {
    title: "Talent retention and relationship continuity",
    what: "Protect revenue by protecting relationships. Every regretted KAM exit costs roughly four months of portfolio momentum and raises churn risk on the accounts that change hands.",
    how: [
      "Separate regretted from non-regretted attrition and report them differently; the target is a lower regretted rate, not simply lower turnover.",
      "Flight-risk review each month for the top performance quartile, combining tenure, performance trend, portfolio change, promotion history and manager assessment (Appendix F).",
      "Structured stay interviews for the top quartile each quarter, with a documented action per person and a named owner.",
      "Career lattice published: KAM to Senior KAM, to specialist tracks (Digital & ES, Data & AI, Public Sector) and to Team Leader — with the criteria for each step visible.",
      "Recognition rhythm that is monthly and specific, not annual and generic.",
      "Exit interview themes reviewed quarterly by the Director group with one systemic action per quarter.",
    ],
    kpi: "Revenue protection attributable to continuity; regretted attrition rate",
    lead: `Regretted attrition ${D.capacity.h1RegrettedAttrition}% to ${D.capacity.h2TargetRegretted}%; 100% stay-interview completion in the top quartile; internal fill rate for Senior KAM and TL roles`,
    dep: "HR Business Partner; Reward for incentive changes; budget approval for the retention component",
    risk: "Retention is treated as an HR programme rather than a commercial one. Mitigation: the KPI is revenue continuity, owned by Prime, with HR as the delivery partner.",
  },
  L5: {
    title: "Zero-vacancy portfolio coverage",
    what: "Ensure no portfolio is unmanaged at any point in the half, and that reassignment protects the revenue most at risk rather than distributing accounts evenly.",
    how: [
      `Zero-vacancy sprint: all ${D.capacity.vacantJun} requisitions live, an evergreen candidate pipeline, and a 35-day time-to-fill service level from requisition to offer.`,
      "Standing three-person bridge coverage pool that assumes any orphan portfolio within five working days of it becoming vacant.",
      "Exposure-weighted reassignment: portfolios are ranked by recurring revenue and churn risk; the highest-exposure accounts stay with tenured KAMs and new joiners inherit the stable tail.",
      "Structured 30-60-90 onboarding with a defined ramp curve (30% of full productivity in month one, 60%, 85%, then 100% in month four) and productivity-adjusted target allocation for new joiners.",
      "A named buddy and a Team Leader check-in cadence for every joiner through the first 90 days.",
      "Weekly coverage report: vacant portfolios, days vacant, revenue exposed, bridge owner.",
    ],
    kpi: "Incremental ARR recovered from previously unmanaged portfolios",
    lead: `Vacancy count below 2; time-to-fill 74 to 35 days; zero portfolios uncovered beyond 5 working days`,
    dep: "HR requisition release and recruitment capacity; approval of the bridge pool",
    risk: "Speed of hiring is prioritised over quality of hire. Mitigation: hold the assessment bar, use the bridge pool to absorb the timing pressure instead.",
  },
  L6: {
    title: "Digital campaigns and CVM acceleration",
    what: "Turn CVM from a periodic campaign function into an always-on lead and retention engine that feeds named KAMs with scored, timely opportunities.",
    how: [
      "Nine always-on lifecycle journeys replacing three periodic campaigns: onboarding, first-90-days adoption, usage-growth, white-space cross-sell, renewal-ahead, dormancy reactivation, at-risk save, device refresh, and digital-solution attach.",
      "Propensity and next-best-offer scoring on the managed base, refreshed monthly.",
      "Closed loop with a 24-hour service level: every digital lead is routed to a named KAM, accepted or rejected with a reason, and worked to a governed stage.",
      "Campaign cycle time reduced from six weeks to two through a reusable content and offer library.",
      "Test-and-learn discipline: every journey carries a control group so that incremental effect can be measured rather than asserted.",
      "Attribution rule published so CVM-sourced revenue is credited for management purposes without being added twice.",
    ],
    kpi: "Incremental ARR from digitally sourced opportunities (attributed, not additive)",
    lead: "1,100 qualified digital leads per month; lead-to-opportunity conversion 9% to 14%; 24-hour routing compliance above 90%",
    dep: "CVM team capacity; campaign platform and data access; content and offer approvals",
    risk: "Volume grows and conversion falls. Mitigation: pay attention to the control group and hold the routing service level; volume without conversion is cost, not revenue.",
  },
};

add(H1("4. The six levers and their contribution logic"),
    P(`The six levers reconcile exactly to the AED ${f1(D.gap)}M gap: AED ${f1(D.salesDelta)}M against the sales engine and AED ${f1(D.protDelta)}M against the protection engine. No lever is credited in both.`),
    TABLE([
      ["Lever", "Engine", "Contribution (AED M)", "Owner", "Lagging KPI"],
      ...D.levers.map(l => [`${l.id} — ${l.name}`, l.engine, `+${f1(l.aed)}`, l.owner, leverDetail[l.id].kpi]),
      ["Total", "—", `+${f1(D.gap)}`, "Senior Director — Prime", "Prime ROI KPI"],
    ], [30, 12, 13, 17, 28], { align: ["l", "l", "r", "l", "l"], boldCol0: true, size: 16 }),
    SPACER(160));

D.levers.slice().sort((a, b) => a.id.localeCompare(b.id)).forEach(l => {
  const d = leverDetail[l.id];
  add(
    H2(`${l.id} — ${d.title}`),
    P([{ text: "Intent. ", bold: true }, { text: d.what }]),
    P([{ text: "Contribution. ", bold: true }, { text: `+AED ${f1(l.aed)}M to the ${l.engine.toLowerCase()} engine.` }]),
    H3("How it is delivered"),
    ...BULLETS(d.how),
    SPACER(60),
    TABLE([
      ["Owner", l.owner],
      ["Lagging KPI", d.kpi],
      ["Leading indicators", d.lead],
      ["Dependencies", d.dep],
      ["Principal risk", d.risk],
    ], [18, 82], { noHeader: true, boldCol0: true, size: 16 }),
    SPACER(180),
  );
});
add(new Paragraph({ children: [new PageBreak()] }));

// =====================================================================
// 5. INITIATIVE PLAN
// =====================================================================
const wave = (rows) => TABLE(
  [["Initiative", "Owner", "Milestone / completion", "Leading indicator"], ...rows],
  [40, 16, 22, 22], { size: 16 });

add(
  H1("5. Initiative plan"),
  P("The build is back-loaded: roughly two-thirds of the incremental value lands in the final three months. That makes the first 30 days decisive, because everything scheduled for October onwards depends on capacity and infrastructure put in place in July."),
  H2("5.1 Days 0–30: stabilise the base"),
  wave([
    [`Zero-vacancy sprint — release and run all ${D.capacity.vacantJun} requisitions; stand up the three-person bridge pool`, "Prime Ops + HR", "Bridge cover on every orphan portfolio within 5 working days; 10+ offers out by day 30", "Offers out per week; days-vacant per portfolio"],
    ["Baseline lock with Finance — agree ARR, protection, churn and closure definitions in writing", "Prime + Finance", "Signed definition note by day 21", "Definition note circulated and acknowledged"],
    ["Churn Early-Warning Index live in Power Apps; Red/Amber/Green tiering on 100% of the managed base", "Prime Ops", "Index live by day 25", "Percentage of base scored; alert volume within serviceable cap"],
    ["Pipeline hygiene reset — stage gates, mandatory next action, ECD clean-up, duplicate and stale purge", "Directors (3)", "Data-quality gate above 95% by day 30", "Records failing the gate, weekly"],
    ["Publish the H2 operating standard and the weekly rhythm to all Team Leaders and KAMs", "Senior Director", "Day 10", "Attendance and acknowledgement"],
    ["Exposure-weighted portfolio ranking completed for reassignment decisions", "Prime Ops", "Day 20", "Ranking published; top-decile accounts assigned to tenured KAMs"],
  ]),
  SPACER(160),
  H2("5.2 Days 31–60: lift the engine"),
  wave([
    ["Save-play playbook deployed with Director-level discount authority", "Directors + TLs", "90% of Red-tier accounts touched within 10 days of trigger", "Red-tier touch rate; save-play usage; discount incidence"],
    ["Administrative elimination — remove six hours per KAM per week of non-selling work", "Prime Ops", "Backlog delivered by day 60", "Selling-time share; hours removed per KAM"],
    ["Always-on CVM journeys from three to nine; 24-hour lead-routing service level enforced", "Prime + CVM", "Nine journeys live by day 60", "Qualified digital leads per month; routing compliance"],
    ["AI Opportunity Spotting rollout — every KAM certified; two VALUE-scored leads each", "Senior Director + Product", "Certification complete by day 55", "Certification rate; qualified Digital & ES leads created"],
    ["Next-best-action prompts live in the opportunity app", "Prime Ops", "Day 50", "Prompt acceptance rate; opportunities created from prompts"],
    ["Stay interviews scheduled for the entire top performance quartile", "Prime + HRBP", "Scheduled by day 45", "Completion rate; documented actions per person"],
  ]),
  SPACER(160),
  H2("5.3 Days 61–90: scale what works"),
  wave([
    ["Exposure-weighted portfolio reallocation completed; bridge pool retired", "Prime Ops", "Day 75", "Portfolios uncovered (target zero); reassignment churn rate"],
    ["Stop / scale review — fund the top three plays, discontinue anything below a 1.5x return", "Senior Director", "Day 85", "Return per initiative in the ROI Ledger"],
    ["Career lattice and earn-back incentive live", "Prime + HRBP + Reward", "Day 80", "Internal fill rate; regretted attrition trend"],
    ["Forecast moves to evidence bands (commit / best case / upside) at Director level", "Directors (3)", "Day 70", "Forecast accuracy versus actual, by band"],
    ["Quarterly business reviews completed for the top decile of the base", "Directors + TLs", "Day 90", "QBR completion rate; opportunities created per QBR"],
  ]),
  SPACER(160),
  H2("5.4 Months 4–6: convert and close"),
  wave([
    ["Peak-quarter closure push with weekly commit reconciliation", "Directors (3)", "Rolling to 31 December", "Commit-band accuracy; activation lag"],
    ["Renewal-ahead campaign on all contracts expiring in Q1 2027", "Prime + CVM", "Complete by 15 December", "Renewals closed ahead of expiry; retained ARR"],
    ["Year-end ROI Ledger close with Finance, including protection reconciliation", "Prime + Finance", "Complete by 10 January 2027", "Percentage of claimed value with full evidence status"],
    ["H1 2027 capacity plan submitted on the basis of validated H2 productivity", "Senior Director", "15 December", "Plan submitted with evidenced productivity baseline"],
  ]),
  new Paragraph({ children: [new PageBreak()] }),
);

// =====================================================================
// 6. GOVERNANCE
// =====================================================================
add(
  H1("6. Governance and operating cadence"),
  P("The plan is delivered through a fixed rhythm. Each forum has a defined input, a defined decision, and a named chair. Anything that does not change a decision is removed from the agenda."),
  TABLE([
    ["Forum", "Frequency", "Chair", "Input", "Decision made"],
    ["Prime war room", "Weekly, Monday, 45 min", "Senior Director", "Coverage, Red-tier saves, top 20 opportunities, blockers", "Resource reallocation; escalation; support commitments"],
    ["Team Leader 1:1s", "Weekly, Wednesday", "Team Leaders", "KAM scorecards against the 10-4-2-1 rhythm", "Coaching actions; pipeline interventions"],
    ["ROI Ledger review", "Monthly", "Senior Director + Finance", "Every claimed dirham with evidence status", "What is recognised, what is held, what is written back"],
    ["People review", "Monthly", "Senior Director + HRBP", "Vacancy, ramp, flight risk, regretted attrition", "Requisition escalation; retention actions"],
    ["CVM closed-loop review", "Fortnightly", "Prime + CVM", "Lead volume, routing compliance, conversion, control-group effect", "Journey scale-up or shutdown"],
    ["Stop / scale review", "Quarterly", "Senior Director", "Return per initiative", "Fund, hold or discontinue"],
    ["Executive review", "Monthly", "HOD / CBO", "One-page performance summary and decisions required", "Investment, headcount and priority decisions"],
  ], [17, 15, 17, 26, 25], { boldCol0: true, size: 15 }),
  SPACER(160),
  H2("6.1 Accountability map"),
  TABLE([
    ["Workstream", "Accountable", "Responsible", "Consulted", "Informed"],
    ["Incremental sales", "Senior Director", "Directors (3), Team Leaders, KAMs", "Product, Solution Architecture", "HOD, Finance"],
    ["Revenue protection", "Senior Director", "Directors, Team Leaders, KAMs", "Finance, CVM, Customer Care", "HOD"],
    ["KAM productivity", "Senior Director", "Prime Operations, Team Leaders", "Sales Operations, IT", "Directors"],
    ["Hiring and coverage", "Senior Director", "Prime Operations, HR Business Partner", "Talent Acquisition, Reward", "HOD"],
    ["Retention", "Senior Director", "Directors, HR Business Partner", "Reward, Learning", "HOD"],
    ["Digital and CVM", "Senior Director", "CVM lead, Prime Operations", "Marketing, Product, Data", "Directors"],
    ["Measurement and ROI Ledger", "Senior Director", "Prime Operations", "Finance", "HOD, CBO"],
  ], [22, 16, 26, 20, 16], { boldCol0: true, size: 15 }),
  SPACER(160),
  H2("6.2 The management views that matter"),
  P("Reporting is deliberately narrow. Every view below answers a management question; anything that does not change a decision is not built."),
  ...BULLETS([
    "Actual, target, variance and forecast by month and quarter, split by the two ROI engines.",
    "Pipeline coverage against remaining target, with stage conversion and leakage.",
    "Closures and realised revenue by product, KAM, Team Leader and Director, showing signed, ordered, activated and billed separately.",
    "At-risk value and overdue next actions, ranked by revenue exposure.",
    "Churn risk and protected revenue with evidence status per line.",
    "Vacant or unmanaged portfolios, days vacant and revenue exposed.",
    "Stale and low-quality pipeline, with the data-quality exception list.",
    "Capacity view: productive FTE, ramp position, selling-time share and output per productive KAM.",
  ]),
  new Paragraph({ children: [new PageBreak()] }),
);

// =====================================================================
// 7. INVESTMENT AND ROI
// =====================================================================
add(
  H1("7. Investment, return and payback"),
  TABLE([
    ["Investment line", "H2 2026 (AED M)", "What it buys"],
    ...D.investment.map(i => [i.item, f1(i.aed), ""]).map((r, idx) => {
      const buys = [
        "Recruitment fees, assessment, onboarding programme and the bridge coverage pool",
        "Career lattice design, earn-back incentive component, recognition and stay-interview programme",
        "Always-on journey build, propensity scoring, content and offer library, control-group measurement",
        "Power Apps and Dataverse build capacity, next-best-action logic, ROI Ledger and management views",
        "AI Opportunity Spotting certification, save-play training, discovery and qualification coaching",
      ][idx];
      return [r[0], r[1], buys];
    }),
    ["Total enabling investment", f1(D.investTotal), "—"],
  ], [32, 14, 54], { align: ["l", "r", "l"], boldCol0: true, size: 16 }),
  SPACER(160),
  H2("7.1 The return calculation"),
  TABLE([
    ["Line", "Formula", "Value"],
    ["Gross incremental benefit", `H2 total ROI revenue − H1 total ROI revenue = ${f1(D.totalH2)} − ${f1(D.totalH1)}`, `AED ${f1(D.gap)}M`],
    ["Enabling investment", "Sum of the investment lines above", `AED ${f1(D.investTotal)}M`],
    ["Net benefit", `${f1(D.gap)} − ${f1(D.investTotal)}`, `AED ${f1(D.netBenefit)}M`],
    ["Gross return on investment", `${f1(D.gap)} ÷ ${f1(D.investTotal)}`, `${D.roiMultiple}x`],
    ["Net return on investment", `${f1(D.netBenefit)} ÷ ${f1(D.investTotal)}`, `${D.netRoiMultiple}x`],
    ["Payback", "Cumulative benefit exceeds cumulative investment", "Month 4 of the half"],
  ], [26, 48, 26], { align: ["l", "l", "r"], boldCol0: true, size: 16 }),
  SPACER(140),
  ...[CALLOUT("Three honesty caveats on this calculation", [
    "Annualised is not in-period. Incremental ARR is a run-rate measure. The revenue actually realised inside H2 is materially lower than the annualised figure, because value won in November bills for two months, not twelve. Report annualised ARR for the KPI and in-period realised revenue for the P&L, and never present one as the other.",
    "Margin is not modelled. This plan measures revenue, not contribution. Where product margin differs materially across Mobile, Fixed, Digital & ES and Devices, the mix shift changes the economics even when the revenue target is met. Confirm whether the KPI is revenue-based or margin-based before locking the product-line split.",
    "Cost of churn avoided is excluded. The plan does not claim the acquisition cost avoided by retaining a customer, although it is real. This is deliberate conservatism: it keeps the protection line defensible.",
  ], C.teal, "EEF5F6")],
  SPACER(160),
  H2("7.2 Scenario range"),
  P("A single number is a false precision. The plan should be reported in three cases, with the trigger for moving between them defined in advance."),
  TABLE([
    ["Case", "Total ROI revenue", "What it assumes", "Trigger"],
    ["Downside", `AED ${f1(D.totalH1 + D.gap * 0.6)}M`, "Hiring slips to November; CVM routing compliance stays below 70%; productivity uplift reaches half the requirement", "Fewer than 10 offers accepted by 30 September"],
    ["Base", `AED ${f1(D.totalH2)}M`, "Vacancies closed by end-September; productivity uplift delivered from the three named sources; protection methodology agreed", "Plan as written"],
    ["Upside", `AED ${f1(D.totalH2 + D.gap * 0.25)}M`, "Hiring completes by end-August; digital conversion exceeds 14%; solution and AI attach outperforms on the existing base", "Routing compliance above 90% for six consecutive weeks"],
  ], [12, 18, 46, 24], { align: ["l", "r", "l", "l"], boldCol0: true, size: 16 }),
  new Paragraph({ children: [new PageBreak()] }),
);

// =====================================================================
// 8. RISKS
// =====================================================================
add(
  H1("8. Risks, mitigations and decisions required"),
  TABLE([
    ["Risk", "Impact", "Likelihood", "Mitigation", "Owner"],
    ["Vacancies are not filled in time", "High", "Medium", "Evergreen pipeline, 35-day time-to-fill service level, bridge coverage pool, weekly escalation to HOD", "Prime Ops + HR"],
    ["Protection methodology is not agreed with Finance", "High", "Medium", "Definition note signed by day 21; monthly reconciliation; recognise the lower of gross protection and net churn reduction", "Senior Director"],
    ["Digital lead volume rises but conversion does not", "Medium", "Medium-high", "24-hour routing service level enforced at Team Leader level; control groups on every journey; reallocate unworked leads after 48 hours", "Prime + CVM"],
    ["Regretted attrition rises during portfolio reassignment", "High", "Medium", "Exposure-weighted reassignment, stay interviews, career lattice, recognition rhythm", "Senior Director + HRBP"],
    ["Product or Solution Architecture capacity constrains Digital & ES closure", "Medium", "Medium", "Agreed support service level with Product; joint discovery workshop route; early qualification to protect specialist time", "Senior Director"],
    ["Data quality undermines the ROI Ledger", "High", "Low-medium", "Data-quality gate above 95%; duplicate, stale and impossible-date checks; exception list reviewed weekly", "Prime Ops"],
    ["Discounting is used as the default save play", "Medium", "High", "Tiered discount authority; value-led plays first; discount incidence reported weekly", "Directors (3)"],
    ["Device mix inflates the sales line without recurring value", "Medium", "Medium", "Device value reported on a separate line and never annualised; ARR reported independently", "Prime Ops + Finance"],
  ], [26, 9, 12, 40, 13], { boldCol0: true, size: 15 }),
  SPACER(160),
  H2("8.1 Decisions required"),
  ...[CALLOUT("What I need from leadership", [
    `1. Release the ${D.capacity.vacantJun} vacant KAM requisitions with a 35-day time-to-fill service level, and approve a standing three-person bridge coverage pool. Needed within 14 days.`,
    `2. Approve AED ${f1(D.investTotal)}M of enabling investment against AED ${f1(D.gap)}M of incremental benefit — a ${D.netRoiMultiple}x net return with payback in month 4. Needed within 21 days.`,
    "3. Sign off the revenue-protection measurement methodology with Finance, including the risk trigger, baseline, observation window and evidence standard. Needed within 30 days.",
  ], C.red)],
  new Paragraph({ children: [new PageBreak()] }),
);

// =====================================================================
// APPENDICES
// =====================================================================
add(H1("Appendix A — Definitions and measurement rules"),
  TABLE([
    ["Term", "Definition used in this plan"],
    ["ARR", "Annualised recurring revenue: recurring monthly charge multiplied by twelve. One-time and device value are never annualised."],
    ["Incremental sales", "New ARR won in the period, plus device value at one-time contract value, reported separately."],
    ["Revenue protection", "Recurring revenue credibly retained from a customer with an evidenced churn or downgrade risk, expressed as annualised value."],
    ["Risk trigger", "A recorded, dated event that places an account into the Red or Amber tier of the Churn Early-Warning Index."],
    ["Observation window", "The period after an intervention during which the account must remain active for the protection to be recognised. Default: 90 days."],
    ["Closure", "Reported at four separate milestones — signed, ordered, activated, billed. Closed-won for the ROI Ledger means activated."],
    ["Pipeline value", "Unweighted value of qualified open opportunities under a defined commercial measure."],
    ["Weighted pipeline", "Pipeline value multiplied by a governed stage probability. Never presented as a commitment."],
    ["Forecast", "Evidence-based expected result for the period, reported in commit, best-case and upside bands. Kept separate from weighted pipeline."],
    ["Pipeline coverage", "Qualified open pipeline divided by remaining target under the same value and time definition."],
    ["Productive FTE", "Headcount adjusted for vacancy, notice period, leave, non-selling duties and new-joiner ramp."],
    ["Ramp curve", "New-joiner productivity assumption: 30% in month one, 60% in month two, 85% in month three, 100% from month four."],
    ["Regretted attrition", "Departure of an employee the business intended to retain, distinguished from performance-related and structural exits."],
    ["Revenue churn", "Recurring revenue lost from the managed base in the period, expressed as a percentage of opening annualised base. Not to be mixed with customer, PID or line churn."],
  ], [20, 80], { boldCol0: true, size: 16 }),
  SPACER(180),

  H1("Appendix B — Churn Early-Warning Index (CEWI)"),
  P("A composite weekly score applied to 100% of the managed base. The purpose is to detect risk before the customer raises it, and to rank intervention by revenue exposure rather than by score alone."),
  TABLE([
    ["Signal", "Weight", "Trigger definition", "Data source"],
    ["Recurring revenue decline", "20", "Billed MRC down more than 10% versus the three-month average", "Billing"],
    ["Usage decline", "15", "Core service usage down more than 25% month on month", "Network / platform usage"],
    ["Contract expiry window", "15", "Contract expiring within 120 days without a renewal conversation logged", "Contract register"],
    ["Port-out or cancellation attempt", "15", "Any MNP enquiry, port-out attempt or cancellation request", "MNP / care systems"],
    ["Service and complaint pattern", "10", "Two or more escalated complaints, or an unresolved case older than 14 days", "Care / ticketing"],
    ["Payment behaviour", "8", "Two or more late payments, or a dispute raised in the last 90 days", "Collections"],
    ["Relationship discontinuity", "7", "Portfolio reassigned in the last 90 days, or no contact recorded in 60 days", "Opportunity app / CRM"],
    ["Decision-maker change", "5", "Change of authorised contact, ownership or trade licence status", "Account records"],
    ["Competitive signal", "5", "Competitor presence recorded by the KAM, or a benchmarking request", "KAM-entered field"],
  ], [21, 11, 44, 24], { align: ["l", "c", "l", "l"], boldCol0: true, size: 16 }),
  SPACER(140),
  TABLE([
    ["Tier", "Score", "Required action", "Service level"],
    ["Red", "60 and above", "Named owner contacts the customer, runs a save play, records intervention and evidence", "Contact within 10 working days; Director visibility"],
    ["Amber", "35 to 59", "Proactive value conversation at the next scheduled touch; add to the monthly review", "Within the month"],
    ["Green", "Below 35", "Standard account-management rhythm", "Normal cadence"],
  ], [10, 16, 48, 26], { boldCol0: true, size: 16 }),
  SPACER(140),
  ...[CALLOUT("Two design rules that keep the index useful", [
    "Cap the Red tier at a volume the team can genuinely work in ten days. An index that produces 400 red alerts a week produces none, because nobody works any of them. Tune the threshold to serviceable volume and rank by revenue exposure within the tier.",
    "Score weights must be validated against actual churn outcomes after one quarter and re-weighted. Until they are, the index is a hypothesis — a useful one, but not yet evidence.",
  ], C.amber, "FEF6EE")],
  SPACER(180),

  H1("Appendix C — The save-play playbook"),
  P("Five governed plays replace the open-ended discount conversation. Each has a defined trigger, a value-led opening, and a rule for what may be recognised as protected revenue."),
  TABLE([
    ["Play", "Trigger", "The move", "Protection recognised as"],
    ["Renewal-ahead", "Contract expiring within 120 days", "Open the renewal early with a value review and a forward-looking commitment, before the customer starts shopping", "Retained ARR on the renewed contract"],
    ["Value re-anchor", "Usage or revenue decline with no service fault", "Present a usage and outcome review: what the customer is actually getting, what is unused, what would improve the result", "Retained ARR where the decline is arrested within the observation window"],
    ["Bundle consolidation", "Fragmented services across multiple accounts or providers", "Consolidate onto a single managed arrangement with better terms and one relationship owner", "Retained ARR on the consolidated base; any uplift counts as incremental sales"],
    ["Device refresh lock-in", "Ageing device estate or a competitive handset offer", "Refresh the estate against a renewed commitment period", "Retained ARR on the mobile base; device value is one-time and is not annualised"],
    ["Digital anchor", "Operational pain surfaced in discovery", "Attach a digital or enterprise solution that embeds e& in the customer's workflow, raising switching cost through value rather than contract", "Retained ARR on the underlying base; the new solution counts as incremental sales"],
  ], [17, 20, 39, 24], { boldCol0: true, size: 15 }),
  SPACER(140),
  P([{ text: "Discount authority. ", bold: true }, { text: "Value-led plays are attempted first and the attempt is recorded. Price concession requires Director approval with a documented reason and an expiry date. Discount incidence is reported weekly, because a save rate achieved entirely through price is a churn problem deferred by one contract term, not solved." }]),
  SPACER(180),

  H1("Appendix D — KAM productivity operating system"),
  H2("The 10-4-2-1 weekly rhythm"),
  TABLE([
    ["Element", "Weekly standard", "Why"],
    ["10 accounts touched", "Meaningful contact — not a broadcast email", "Coverage is the precondition for both engines"],
    ["4 discovery conversations", "Structured, using the discovery question bank", "Discovery is where qualified opportunity comes from"],
    ["2 qualified opportunities created", "Passing the qualification gate, with a quantified customer problem", "Earliest reliable predictor of closures two months out"],
    ["1 closure", "Signed and progressing to activation", "Converts activity into the KPI"],
  ], [24, 40, 36], { boldCol0: true, size: 16 }),
  SPACER(140),
  H2("Weekly KAM scorecard"),
  TABLE([
    ["Dimension", "Metric", "Weight"],
    ["Realised outcome", "Incremental ARR activated; validated protected ARR", "40%"],
    ["Conversion quality", "Qualified-to-won rate; average cycle time", "25%"],
    ["Pipeline health", "Coverage; stale percentage; data-quality gate pass rate", "20%"],
    ["Activity", "10-4-2-1 compliance; Red-tier touch rate; digital-lead response within 24 hours", "15%"],
  ], [22, 58, 20], { align: ["l", "l", "c"], boldCol0: true, size: 16 }),
  SPACER(140),
  P([{ text: "Design note. ", bold: true }, { text: "Activity is deliberately the smallest weight. A scorecard weighted toward touches produces touches; a scorecard weighted toward realised revenue and conversion produces revenue, and uses activity only to explain why the outcome moved." }]),
  SPACER(140),
  H2("Administrative elimination backlog — target six hours per KAM per week"),
  TABLE([
    ["Candidate", "Estimated hours returned per KAM per week", "Owner"],
    ["Pre-filled opportunity records from account and billing data", "1.5", "Prime Ops"],
    ["Automated weekly pipeline and closure reporting replacing manual decks", "1.5", "Prime Ops"],
    ["Single-entry data capture across the opportunity app (no re-keying)", "1.0", "Prime Ops / IT"],
    ["Self-service quote and order status for KAM and customer", "1.0", "Sales Operations"],
    ["Standard proposal and quotation templates with approved content", "0.5", "Product / Marketing"],
    ["Consolidated internal request routing for support and escalation", "0.5", "Prime Ops"],
    ["Total", "6.0", "—"],
  ], [50, 30, 20], { align: ["l", "c", "l"], boldCol0: true, size: 16 }),
  SPACER(180),

  H1("Appendix E — Zero-vacancy coverage model"),
  TABLE([
    ["Rule", "Standard"],
    ["No portfolio uncovered", "Any portfolio that becomes vacant is assigned to the bridge coverage pool within five working days"],
    ["Time-to-fill", "35 days from requisition release to accepted offer; evergreen candidate pipeline maintained at all times"],
    ["Exposure-weighted reassignment", "Portfolios ranked by recurring revenue and CEWI exposure; the top decile stays with tenured KAMs, new joiners inherit the stable tail"],
    ["Ramp curve", "30% of full productivity in month one, 60% in month two, 85% in month three, 100% from month four"],
    ["Target allocation for new joiners", "Productivity-adjusted using the ramp curve — a joiner starting in October carries roughly 40% of a half-year target, not 100%"],
    ["Onboarding guarantee", "Named buddy, Team Leader check-in at days 7, 30, 60 and 90, and a first-90-days capability checklist"],
    ["Coverage reporting", "Weekly: vacant portfolios, days vacant, recurring revenue exposed, bridge owner, expected fill date"],
  ], [26, 74], { noHeader: true, boldCol0: true, size: 16 }),
  SPACER(140),
  TABLE([
    ["Month", ...D.capacity.months],
    ["Planned productive KAM FTE", ...D.capacity.productiveFTE.map(String)],
    ["Vacancy rate (%)", ...D.capacity.vacancyRate.map(v => v.toFixed(1))],
    ["Rolling 12-month attrition (%)", ...D.capacity.attritionR12.map(v => v.toFixed(1))],
  ], [28, 12, 12, 12, 12, 12, 12], { align: ["l", "c", "c", "c", "c", "c", "c"], boldCol0: true, size: 16 }),
  SPACER(180),

  H1("Appendix F — Retention and flight-risk model"),
  P("Turnover is reported as two different numbers, because they require two different responses. Non-regretted attrition can be healthy; regretted attrition is a direct threat to the protection engine."),
  TABLE([
    ["Factor", "Weight", "What raises the score"],
    ["Performance trend", "25", "Sustained top-quartile performer whose recent trend has flattened or declined"],
    ["Tenure position", "20", "18 to 36 months — historically the highest-risk window in a KAM population"],
    ["Portfolio disruption", "20", "Portfolio reassigned, reduced or materially changed in the last two quarters"],
    ["Progression history", "15", "No role or grade movement in more than 24 months despite meeting the criteria"],
    ["Manager assessment", "10", "Team Leader flags engagement, workload or recognition concern"],
    ["Reward position", "10", "Total compensation materially below the internal band midpoint for equivalent performance"],
  ], [26, 10, 64], { align: ["l", "c", "l"], boldCol0: true, size: 16 }),
  SPACER(140),
  H3("Retention actions"),
  ...BULLETS([
    "Quarterly stay interviews for the entire top performance quartile, with a documented action and a named owner per person — not a conversation, a commitment.",
    "Published career lattice: KAM to Senior KAM, to specialist tracks (Digital & ES, Data & AI, Public Sector) and to Team Leader, with visible criteria for each step.",
    "Earn-back incentive component so that a strong second half can recover a weak first half — this materially reduces mid-year departures.",
    "Monthly, specific recognition rather than an annual generic award.",
    "Workload equity review: portfolio size, revenue and complexity balanced across the team, because the most common quiet driver of exit is an unfair portfolio, not pay.",
    "Quarterly review of exit-interview themes by the Director group, with one systemic action committed per quarter.",
  ]),
  SPACER(180),

  H1("Appendix G — Digital and CVM always-on journey portfolio"),
  TABLE([
    ["Journey", "Audience trigger", "Objective", "Primary measure"],
    ["Onboarding", "New account activated", "Time to first value", "Activation-to-usage days"],
    ["First 90 days adoption", "Account 0–90 days old", "Embed usage before the first renewal decision", "Feature and service adoption rate"],
    ["Usage growth", "Usage approaching plan limits", "Upgrade or add capacity", "Incremental ARR from upgrades"],
    ["White-space cross-sell", "Product gap versus segment norm", "Attach the missing product family", "Products per account"],
    ["Renewal-ahead", "Contract expiring within 120 days", "Renew before the customer shops", "Renewal ahead of expiry rate"],
    ["Dormancy reactivation", "Usage decline beyond threshold", "Re-establish value", "Reactivated revenue"],
    ["At-risk save", "CEWI Red or Amber tier", "Support the save play with digital reinforcement", "Retained ARR"],
    ["Device refresh", "Device estate ageing beyond threshold", "Refresh against a renewed commitment", "Device revenue and retained mobile ARR"],
    ["Digital-solution attach", "Industry and operational-pain signals", "Create qualified Digital & ES opportunity", "Qualified leads and won ARR"],
  ], [22, 25, 29, 24], { boldCol0: true, size: 15 }),
  SPACER(140),
  H3("Closed-loop rules"),
  ...NUMS([
    "Every digital lead is routed to a named KAM within 24 hours, and is accepted or rejected with a recorded reason.",
    "A lead unworked after 48 hours is reassigned to the bridge pool; routing compliance is reported weekly by Team Leader.",
    "Every journey carries a control group, so that the incremental effect is measured rather than asserted.",
    "CVM-sourced revenue is attributed for management purposes inside the existing product lines and is never added to the revenue total a second time.",
  ]),
  SPACER(140),
  TABLE([
    ["Digital and CVM measure", "H1 2026", "H2 2026 target"],
    ...D.cvm.map(c => [c.kpi, c.h1, c.h2]),
  ], [56, 22, 22], { align: ["l", "c", "c"], boldCol0: true, size: 16 }),
  SPACER(180),

  H1("Appendix H — AI Opportunity Spotting: linking enablement to the ROI KPI"),
  P("The AI Opportunity Spotting training manuscript prepared for Prime KAMs is not a standalone learning initiative. It is the primary mechanism behind two of the three sources of the productivity uplift in Section 3.1 — solution and AI attach on the existing base, and higher-quality discovery that raises win rate. To make it commercially accountable, it is measured as a pipeline programme rather than as a training event."),
  TABLE([
    ["From the manuscript", "How it is converted into ROI contribution", "Measure"],
    ["Five capabilities every KAM should leave with", "Certification gate before a KAM may log a Digital & AI opportunity without Solution Architecture review", "Certification rate; opportunities passing the qualification gate first time"],
    ["Business-friction framing (grow, serve, save, control, scale)", "Standard opening in every discovery conversation on the existing portfolio", "Discovery conversations per KAM per month"],
    ["The VALUE-scored lead and the minimum information before handoff", "Mandatory fields on the opportunity record; incomplete leads are not routed to Product or Solution Architecture", "Percentage of leads accepted by Product at first pass"],
    ["Sixteen industry and horizontal use cases", "Mapped to the Prime portfolio by industry so each KAM has a named target list, not a generic idea", "Accounts mapped per KAM; qualified opportunities per use case"],
    ["The 30-day field challenge", "Converted into a target: 10 priority accounts mapped, 5 discovery conversations, 2 VALUE-scored leads, 1 joint workshop or scoped pilot", "Completion rate per KAM, reported on the weekly scorecard"],
    ["Responsible-AI guardrails and red flags", "Early Product and Solution Architecture involvement rules, protecting specialist capacity and avoiding unsellable commitments", "Rework rate on handed-over leads"],
  ], [26, 46, 28], { boldCol0: true, size: 15 }),
  SPACER(140),
  ...[CALLOUT("Validation still outstanding on the training content", [
    "Appendix E of the training manuscript lists the content that must be confirmed before the material is used with customers: official product names and availability, pricing inclusions and the approval route, award and analyst-position wording and logo rights, permitted customer references, and the performance claims quoted from the product-team deck. None of those claims should be repeated in a customer meeting until Product has confirmed them in writing.",
    "The commercial ask on Product is narrow and specific: confirm the claims, agree the lead-acceptance service level, and name the demonstration and pilot route. Without the service level, better discovery simply creates a queue.",
  ], C.amber, "FEF6EE")],
  SPACER(180),

  H1("Appendix I — ROI Ledger: data model and evidence standard"),
  P("The ROI Ledger is the single source of truth for the KPI. It is built at opportunity-product-line grain in Power Apps and Dataverse, and every line carries an evidence status that Finance can audit. A claim without evidence is reported as claimed, not as recognised."),
  TABLE([
    ["Domain", "Fields"],
    ["Customer", "Account name, PID / account identifier, industry, segment, region, portfolio"],
    ["Ownership", "KAM, Team Leader, Director, support owner, Solution Architect"],
    ["Opportunity", "Opportunity ID, parent opportunity ID, source (including CVM journey), created date, product, subproduct, use case, quantity"],
    ["Commercial", "MRC, OTC, device value, annualised recurring revenue, total contract value, margin where available"],
    ["Pipeline", "Stage, governed probability, weighted value, forecast band, expected closure date, next action, next-action date"],
    ["Execution", "Last update, age, stale days, risk, blocker, support required, competitor, closure or loss reason"],
    ["Outcome", "Closed-won date, order date, activation date, billing date, realised revenue status"],
    ["Protection", "CEWI score and tier, trigger type, trigger date, save play used, intervention date, observation window end, protected ARR, evidence status"],
    ["Governance", "Evidence status (evidenced / partial / claimed), Finance review flag, reconciliation note"],
  ], [18, 82], { boldCol0: true, size: 16 }),
  SPACER(140),
  H3("Data-quality gate — checked weekly, exceptions worked before the war room"),
  ...BULLETS([
    "Duplicate opportunity identifiers and duplicate customer-product combinations.",
    "Expected closure dates in the past that are not explicitly flagged.",
    "Stage inconsistent with governed probability, or an unjustified probability override.",
    "Missing next action, next-action date, or owner.",
    "Closed-won without a corresponding order or activation record.",
    "Protected revenue recorded without a preceding, dated risk trigger.",
    "Unit and currency mismatches; monthly values recorded in annualised fields or the reverse.",
    "Reconciliation of the ledger total to the source system total, with the variance explained.",
  ]),
  SPACER(180),

  H1("Appendix J — KPI dictionary"),
  TABLE([
    ["KPI", "Type", "Definition", "Frequency", "Owner"],
    ["Incremental ARR activated", "Lagging", "New recurring monthly charge multiplied by twelve, validated against activation", "Weekly", "Directors"],
    ["Device revenue (one-time)", "Lagging", "One-time contract value on device sales; never annualised", "Weekly", "Directors"],
    ["Validated retained ARR", "Lagging", "Protected recurring revenue with trigger, intervention and observation evidence", "Monthly", "Directors"],
    ["Revenue churn rate", "Lagging", "Recurring revenue lost as a percentage of opening annualised managed base", "Monthly", "Prime Ops"],
    ["Output per productive KAM", "Lagging", "Incremental ARR divided by average productive FTE", "Monthly", "Senior Director"],
    ["Pipeline coverage", "Leading", "Qualified open pipeline divided by remaining target", "Weekly", "Directors"],
    ["Qualified opportunities per KAM", "Leading", "Opportunities passing the qualification gate, per KAM per month", "Weekly", "Team Leaders"],
    ["Selling-time share", "Leading", "Selling activity as a percentage of the KAM working week", "Monthly", "Prime Ops"],
    ["Red-tier touch rate", "Leading", "Red CEWI accounts contacted within 10 working days", "Weekly", "Team Leaders"],
    ["Digital lead routing compliance", "Leading", "Digital leads routed and accepted within 24 hours", "Weekly", "Prime + CVM"],
    ["Vacancy count and days vacant", "Leading", "Portfolios without a permanent owner and the elapsed time", "Weekly", "Prime Ops"],
    ["Regretted attrition", "Leading", "Rolling 12-month departures the business intended to retain", "Monthly", "Senior Director + HRBP"],
    ["Data-quality gate pass rate", "Leading", "Opportunity records passing all gate checks", "Weekly", "Prime Ops"],
  ], [24, 10, 38, 12, 16], { boldCol0: true, size: 15 }),
  SPACER(180),

  H1("Appendix K — Assumptions register"),
  P("Every assumption below is either a placeholder to replace or a background fact to reconfirm. Each is labelled with the effect of it being wrong, so the ones that matter can be verified first."),
  TABLE([
    ["#", "Assumption", "Status", "Impact if wrong"],
    ["1", `H1 2026 incremental sales of AED ${f1(D.salesH1)}M, split across the four lines in Section 2.2`, "PLACEHOLDER — replace with actuals", "High — changes the gap, every lever contribution and the ROI"],
    ["2", `H2 2026 sales target of AED ${f1(D.salesH2)}M`, "PLACEHOLDER — replace with the confirmed target", "High — changes the gap and the capacity requirement"],
    ["3", `H1 revenue protection of AED ${f1(D.protection.h1)}M and an H2 target of AED ${f1(D.protection.h2)}M`, "PLACEHOLDER — replace and agree the methodology", "High — the most contestable line in the KPI"],
    ["4", `Approved KAM headcount of ${D.capacity.approvedHeadcount}, ${D.capacity.filledJun} filled, ${D.capacity.vacantJun} vacant`, "BACKGROUND (August 2026) — reconfirm with HR", "High — the whole capacity bridge depends on it"],
    ["5", `H1 average productive FTE of ${D.capacity.h1AvgProductiveFTE}`, "ESTIMATE — derive from HR and leave records", "High — sets the productivity baseline"],
    ["6", "Ramp curve of 30 / 60 / 85 / 100 per cent over four months", "ESTIMATE — validate against the last two joiner cohorts", "Medium — changes phasing, not the total"],
    ["7", `Managed recurring base of AED ${D.churn.managedBaseAED}M and churn of ${D.churn.h1LossRatePerHalf}% per half`, "PLACEHOLDER — replace with the Finance figure", "High — sets the reconciliation ceiling on protection"],
    ["8", `Enabling investment of AED ${f1(D.investTotal)}M`, "ESTIMATE — refine with HR, CVM and IT", "Medium — changes the ROI multiple, not the revenue plan"],
    ["9", "Three Directors and 14 Team Leaders", "BACKGROUND (August 2026) — reconfirm", "Medium — changes span of control and the governance load"],
    ["10", "Product and Solution Architecture capacity is available to support Digital & ES growth", "UNCONFIRMED — needs a service-level agreement", "High — constrains the fastest-growing revenue line"],
    ["11", "The KPI is revenue-based rather than margin-based", "UNCONFIRMED — confirm with Finance", "High — a margin-based KPI changes the product mix strategy"],
    ["12", "Power BI licensing is available for the management views", "UNCONFIRMED — do not assume", "Medium — a fallback to Power Apps and Excel views is workable"],
  ], [4, 40, 22, 34], { boldCol0: true, size: 15 }),
  SPACER(160),
  ...[CALLOUT("How to update this plan", [
    "Replace the values in Section 2.2 and Appendix K, then recalculate: the gap in Section 1.1, the lever contributions in Section 4 (which must continue to sum exactly to the gap), the capacity bridge in Section 3.1, the ROI in Section 7 and the monthly build in the companion slide pack.",
    "The lever contributions are the one place where judgement is required. Keep them reconciling to the gap: if a target rises, the additional value must be assigned to a named lever with a named owner, not spread evenly across all six.",
  ], C.teal, "EEF5F6")],
);

// =====================================================================
// ASSEMBLE
// =====================================================================
const doc = new Document({
  creator: "Prime — SMB, e& UAE",
  title: "Prime H2 2026 ROI Delivery Plan",
  description: "H2 2026 plan for incremental sales, revenue protection, KAM capacity and CVM acceleration",
  styles: {
    default: {
      document: { run: { font: FONT, size: 20, color: "20242A" } },
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 30, bold: true, color: C.ink } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 24, bold: true, color: C.red } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 21, bold: true, color: C.ink } },
    ],
  },
  numbering: {
    config: [
      { reference: "bulletList", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 200 } }, run: { color: C.red } } },
        { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 200 } }, run: { color: C.red } } },
      ]},
      { reference: "numList", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 400, hanging: 240 } }, run: { bold: true, color: C.red } } },
      ]},
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1180, right: 1080, bottom: 1080, left: 1080, header: 600, footer: 560 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "DDE1E5", space: 6 } },
        children: [new TextRun({ text: "Prime H2 2026 ROI Delivery Plan  ·  INTERNAL", size: 15, color: "8A9299", font: FONT })],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: `${D.dataStatus}   ·   Page `, size: 14, color: "9AA3AB", font: FONT }),
          new TextRun({ children: [PageNumber.CURRENT], size: 14, color: "9AA3AB", font: FONT }),
          new TextRun({ text: " of ", size: 14, color: "9AA3AB", font: FONT }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: "9AA3AB", font: FONT }),
        ],
      })] }),
    },
    children: kids,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = process.argv[2] || "Prime_H2_2026_ROI_Delivery_Plan.docx";
  fs.writeFileSync(out, buf);
  console.log("WROTE", out, buf.length, "bytes");
});
