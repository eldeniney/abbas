# Prime H2 2026 ROI Plan — deliverables

**All figures are illustrative placeholders.** Replace them with confirmed H1 2026
actuals and H2 2026 targets before circulating.

| File | What it is |
| --- | --- |
| `Prime_H2_2026_ROI_Delivery_Plan.docx` | Detailed Word delivery plan (31 pages): executive summary, baseline/target, capacity bridge, six levers, 30-60-90 initiative plan, governance, investment & ROI, risks, and appendices A–K (definitions, churn early-warning index, save plays, KAM operating system, coverage model, retention model, CVM journeys, AI Opportunity Spotting linkage, ROI ledger, KPI dictionary, assumptions register). |
| `Prime_H2_2026_ROI_Plan.pptx` | 4-slide executive deck, e&-inspired theme, native editable charts, full speaker notes on every slide. |
| `generator/` | Scripts that produced both files. `data.js` is the single source of truth — edit the H1/H2 numbers there and re-run to regenerate everything consistently. |

## Regenerating after updating the numbers

```bash
cd generator
npm install pptxgenjs docx
node make_deck.js   # rebuilds the PPTX
node make_doc.js    # rebuilds the DOCX
```

Every derived figure (gap, lever contributions, productivity uplift, ROI multiple,
payback) recalculates automatically from `data.js`.

## Before external use

- Swap the e&-inspired palette for the official e& brand palette, logo and typeface.
- Reconfirm headcount/organisation background (120 KAMs, 3 Directors, 14 TLs — dated Aug 2026).
- Sign off the revenue-protection methodology with Finance (see plan §2.4 and Decision 3).
