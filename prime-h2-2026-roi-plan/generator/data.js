// =====================================================================
// SINGLE SOURCE OF TRUTH - Prime H2 2026 ROI Plan
// ALL FIGURES BELOW ARE ILLUSTRATIVE PLACEHOLDERS.
// Replace with confirmed H1 2026 actuals and H2 2026 targets, then
// re-run: node make_deck.js && node make_doc.js
// Units: AED millions. ARR = annualised recurring revenue (MRC x 12).
// =====================================================================
const D = {
  asOf: "26 August 2026",
  dataStatus: "ILLUSTRATIVE PLACEHOLDER DATA - replace with confirmed H1 2026 actuals and H2 2026 targets",

  sales: [
    { line: "Mobile",                 h1: 18.4, h2: 24.0, basis: "ARR (MRC x 12)" },
    { line: "Fixed",                  h1: 12.1, h2: 16.0, basis: "ARR (MRC x 12)" },
    { line: "Digital & ES",           h1:  6.3, h2: 10.5, basis: "ARR (recurring only)" },
    { line: "Devices",                h1:  4.2, h2:  6.0, basis: "One-time value - NOT annualised" },
  ],
  protection: { h1: 15.5, h2: 22.0 },

  investment: [
    { item: "Recruitment, onboarding and ramp",        aed: 1.4 },
    { item: "Retention, incentive and career redesign", aed: 2.2 },
    { item: "CVM / digital campaign factory",           aed: 1.8 },
    { item: "Power Platform, data and dashboards",      aed: 0.6 },
    { item: "Enablement (incl. AI Opportunity Spotting)", aed: 0.5 },
  ],

  levers: [
    { id:"L1", name:"Sales engine & pipeline discipline", engine:"Sales",      aed:4.8, owner:"Directors (3)",        lead:"Coverage 3.0x; stale pipeline <15%" },
    { id:"L6", name:"Digital campaigns & CVM acceleration", engine:"Sales",    aed:4.9, owner:"Prime + CVM lead",     lead:"1,100 digital MQLs/month; 24h KAM SLA" },
    { id:"L3", name:"KAM productivity operating system",  engine:"Sales",      aed:3.3, owner:"Team Leaders (14)",    lead:"Selling time 55%; 4.5 opps/KAM/month" },
    { id:"L5", name:"Zero-vacancy portfolio coverage",    engine:"Sales",      aed:2.5, owner:"Prime Ops + HR",       lead:"Vacancy <2; time-to-fill 35 days" },
    { id:"L2", name:"Account management & save plays",    engine:"Protection", aed:5.2, owner:"Directors + TLs",      lead:"90% of Red-tier accounts touched in 10 days" },
    { id:"L4", name:"Talent retention & continuity", engine:"Protection", aed:1.3, owner:"Prime + HRBP", lead:"Regretted attrition <=7%; stay interviews 100%" },
  ],

  capacity: {
    approvedHeadcount: 120,
    filledJun: 104,
    vacantJun: 16,
    exposedBaseAED: 84,          // AED M annualised recurring base sitting in unmanaged portfolios
    months: ["Jul","Aug","Sep","Oct","Nov","Dec"],
    productiveFTE: [97, 100, 104, 108, 112, 114],
    requiredFTEAtH1Productivity: 132,
    h1AvgProductiveFTE: 96,
    vacancyRate:  [12.5, 10.8, 8.3, 5.8, 3.3, 1.7],
    attritionR12: [20.2, 19.0, 17.5, 16.0, 15.0, 14.0],
    h1AttritionR12: 21.0,
    h1RegrettedAttrition: 13.0,
    h2TargetAttrition: 14.0,
    h2TargetRegretted: 7.0,
  },

  efficiency: [
    { kpi:"Selling time as % of KAM working week", h1:"41%",  h2:"55%" },
    { kpi:"Qualified opportunities created / KAM / month", h1:"3.1", h2:"4.5" },
    { kpi:"Win rate (qualified to closed-won)", h1:"27%", h2:"33%" },
    { kpi:"Average sales cycle (days)", h1:"61", h2:"48" },
    { kpi:"Pipeline coverage vs remaining target", h1:"2.1x", h2:"3.0x" },
    { kpi:"Stale pipeline (>30 days no next action)", h1:"34%", h2:"<15%" },
    { kpi:"Opportunity records passing data-quality gate", h1:"62%", h2:">95%" },
  ],

  churn: {
    managedBaseAED: 640,        // AED M annualised recurring base under Prime management
    h1LossRatePerHalf: 5.8,     // % of base lost per half
    h2LossRatePerHalf: 4.4,
  },

  cvm: [
    { kpi:"Digital-sourced qualified leads / month", h1:"380", h2:"1,100" },
    { kpi:"Digital lead-to-opportunity conversion", h1:"9%", h2:"14%" },
    { kpi:"Always-on lifecycle journeys live", h1:"3", h2:"9" },
    { kpi:"Campaign concept-to-live cycle", h1:"6 weeks", h2:"2 weeks" },
    { kpi:"CVM-attributed ARR (subset of product lines)", h1:"4.1", h2:"9.0" },
  ],

  monthly: {
    months: ["Jul","Aug","Sep","Oct","Nov","Dec"],
    salesBuild:      [1.2, 1.8, 2.4, 3.0, 3.4, 3.7],
    protectionBuild: [0.6, 0.8, 1.0, 1.2, 1.4, 1.5],
  },
};

// ---- derived ----
D.salesH1 = +D.sales.reduce((a,b)=>a+b.h1,0).toFixed(1);
D.salesH2 = +D.sales.reduce((a,b)=>a+b.h2,0).toFixed(1);
D.salesDelta = +(D.salesH2 - D.salesH1).toFixed(1);
D.protDelta = +(D.protection.h2 - D.protection.h1).toFixed(1);
D.totalH1 = +(D.salesH1 + D.protection.h1).toFixed(1);
D.totalH2 = +(D.salesH2 + D.protection.h2).toFixed(1);
D.gap = +(D.totalH2 - D.totalH1).toFixed(1);
D.growthPct = Math.round((D.gap / D.totalH1) * 100);
D.investTotal = +D.investment.reduce((a,b)=>a+b.aed,0).toFixed(1);
D.netBenefit = +(D.gap - D.investTotal).toFixed(1);
D.roiMultiple = +(D.gap / D.investTotal).toFixed(1);
D.netRoiMultiple = +(D.netBenefit / D.investTotal).toFixed(1);
D.avgProductiveFTE_H2 = +(D.capacity.productiveFTE.reduce((a,b)=>a+b,0)/6).toFixed(1);
D.arrPerKamH1 = +(D.salesH1 / D.capacity.h1AvgProductiveFTE * 1000).toFixed(0);      // AED k per KAM per half
D.arrPerKamH2 = +(D.salesH2 / D.avgProductiveFTE_H2 * 1000).toFixed(0);
D.productivityUpliftPct = Math.round((D.arrPerKamH2 / D.arrPerKamH1 - 1) * 100);
D.churnLossH1 = +(D.churn.managedBaseAED * D.churn.h1LossRatePerHalf / 100).toFixed(1);
D.churnLossH2 = +(D.churn.managedBaseAED * D.churn.h2LossRatePerHalf / 100).toFixed(1);
D.churnNetReduction = +(D.churnLossH1 - D.churnLossH2).toFixed(1);

// ---- e&-inspired palette (derived from the supplied Prime manuscript accents).
// Replace with the official e& brand deck values before external use.
D.C = {
  red:      "C51230",
  redBright:"E8112D",
  ink:      "1A1D21",
  ink2:     "23272B",
  slate:    "4A5259",
  grey:     "8A9299",
  line:     "E3E6E9",
  paper:    "F7F8FA",
  white:    "FFFFFF",
  amber:    "F2730A",
  teal:     "177F8C",
  sand:     "D8C3A5",
};
module.exports = D;
